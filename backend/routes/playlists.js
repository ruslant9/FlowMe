// backend/routes/playlists.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const Playlist = require('../models/Playlist');
const Track = require('../models/Track');
const User = require('../models/User');
const { sanitize } = require('../utils/sanitize');
const mongoose = require('mongoose');

async function updatePlaylistCover(playlist) {
    if (playlist.tracks.length > 0) {
        const trackIdsToScan = playlist.tracks.slice(0, 50);

        const potentialCoverTracks = await Track.find({ '_id': { $in: trackIdsToScan } })
            .populate('album', 'coverArtUrl')
            .select('albumArtUrl album')
            .lean();

        const tracksMap = new Map(potentialCoverTracks.map(t => [t._id.toString(), t]));

        const coverUrls = [];
        for (const trackId of trackIdsToScan) {
            if (coverUrls.length >= 4) break;

            const track = tracksMap.get(trackId.toString());
            if (track) {
                const coverUrl = track.albumArtUrl || track.album?.coverArtUrl;
                if (coverUrl) {
                    coverUrls.push(coverUrl);
                }
            }
        }
        playlist.coverImageUrls = coverUrls;
    } else {
        playlist.coverImageUrls = [];
    }
    return playlist;
}

// ... (маршруты GET '/', POST '/', GET '/:playlistId', POST '/:playlistId/play' остаются без изменений) ...

router.get('/', authMiddleware, async (req, res) => {
    try {
        const playlists = await Playlist.find({ user: req.user.userId })
            .populate('user', 'username fullName') 
            .sort({ createdAt: -1 })
            .lean();
        res.json(playlists);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при загрузке плейлистов.' });
    }
});

router.post('/', authMiddleware, async (req, res) => {
    try {
        const { name, description, visibility } = req.body;
        const sanitizedName = sanitize(name);
        const sanitizedDescription = sanitize(description);
        if (!sanitizedName) {
            return res.status(400).json({ message: 'Название плейлиста обязательно.' });
        }
        const newPlaylist = new Playlist({
            name: sanitizedName,
            description: sanitizedDescription,
            visibility: ['public', 'unlisted', 'private'].includes(visibility) ? visibility : 'public',
            user: req.user.userId,
            tracks: [],
            coverImageUrls: []
        });
        await newPlaylist.save();
        res.status(201).json(newPlaylist);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при создании плейлиста.' });
    }
});

router.get('/:playlistId', authMiddleware, async (req, res) => {
    try {
        const playlist = await Playlist.findById(req.params.playlistId)
            .populate({
                path: 'tracks',
                populate: [
                    { path: 'artist', select: 'name _id' },
                    { path: 'album', select: 'coverArtUrl' }
                ]
            })
            .populate('user', 'username fullName avatar')
            .lean();

        if (!playlist) {
            return res.status(404).json({ message: 'Плейлист не найден.' });
        }
        
        const isOwner = playlist.user._id.toString() === req.user.userId;
        if (playlist.visibility === 'private' && !isOwner) {
            return res.status(403).json({ message: 'Это приватный плейлист.' });
        }

        playlist.tracks = playlist.tracks.map(track => {
            if (track.album && track.album.coverArtUrl && !track.albumArtUrl) {
                return { ...track, albumArtUrl: track.album.coverArtUrl };
            }
            return track;
        });

        res.json(playlist);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при загрузке плейлиста.' });
    }
});

router.post('/:playlistId/play', authMiddleware, async (req, res) => {
    try {
        await Playlist.updateOne({ _id: req.params.playlistId }, { $inc: { playCount: 1 } });
        res.status(200).send();
    } catch (error) {
        console.error('Ошибка увеличения счетчика прослушиваний:', error);
        res.status(200).send();
    }
});

router.put('/:playlistId', authMiddleware, async (req, res) => {
    try {
        const { name, description, visibility } = req.body;
        const sanitizedName = sanitize(name);
        const sanitizedDescription = sanitize(description);
        if (!sanitizedName) {
            return res.status(400).json({ message: 'Название плейлиста обязательно.' });
        }

        const playlist = await Playlist.findOne({
            _id: req.params.playlistId,
            user: req.user.userId
        });
        
        if (!playlist) {
            return res.status(404).json({ message: 'Плейлист не найден или у вас нет прав на его редактирование.' });
        }

        playlist.name = sanitizedName;
        playlist.description = sanitizedDescription;
        playlist.visibility = visibility;
        
        await playlist.save();
        const updatedPlaylist = await Playlist.findById(playlist._id).populate('tracks').populate('user', 'username fullName avatar');
        res.json(updatedPlaylist);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при обновлении плейлиста.' });
    }
});

router.delete('/:playlistId', authMiddleware, async (req, res) => {
    try {
        const playlist = await Playlist.findOneAndDelete({
            _id: req.params.playlistId,
            user: req.user.userId
        });
        if (!playlist) {
            return res.status(404).json({ message: 'Плейлист не найден.' });
        }
        res.json({ message: 'Плейлист удален.' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при удалении плейлиста.' });
    }
});

router.post('/:playlistId/tracks', authMiddleware, async (req, res) => {
    try {
        const { trackIds } = req.body;
        if (!trackIds || !Array.isArray(trackIds)) {
            return res.status(400).json({ message: 'Необходимо предоставить ID треков.' });
        }
        const playlist = await Playlist.findOne({
            _id: req.params.playlistId,
            user: req.user.userId
        });
        if (!playlist) {
            return res.status(404).json({ message: 'Плейлист не найден.' });
        }
        
        const tracksFromClient = await Track.find({ '_id': { $in: trackIds } }).select('sourceId type').lean();
        const libraryTrackIds = tracksFromClient.map(track => track.sourceId ? track.sourceId : track._id);
        const tracksToAdd = libraryTrackIds.filter(id => !playlist.tracks.some(trackId => trackId.equals(id)));
        
        playlist.tracks.push(...tracksToAdd);

        await updatePlaylistCover(playlist);
        await playlist.save();

        // --- НАЧАЛО ИСПРАВЛЕНИЯ ---
        // После сохранения, получаем полностью населенный плейлист и обрабатываем его
        const updatedPlaylist = await Playlist.findById(playlist._id)
            .populate({
                path: 'tracks',
                populate: [
                    { path: 'artist', select: 'name _id' },
                    { path: 'album', select: 'coverArtUrl' }
                ]
            })
            .populate('user', 'username fullName avatar')
            .lean(); // Используем .lean() для получения простого объекта

        // Применяем ту же логику, что и в GET-запросе, чтобы данные были консистентными
        updatedPlaylist.tracks = updatedPlaylist.tracks.map(track => {
            if (track.album && track.album.coverArtUrl && !track.albumArtUrl) {
                return { ...track, albumArtUrl: track.album.coverArtUrl };
            }
            return track;
        });

        res.json(updatedPlaylist);
        // --- КОНЕЦ ИСПРАВЛЕНИЯ ---

    } catch (error) {
        console.error("Ошибка при добавлении треков в плейлист:", error);
        res.status(500).json({ message: 'Ошибка при добавлении треков в плейлист.' });
    }
});


router.delete('/:playlistId/tracks/:trackId', authMiddleware, async (req, res) => {
    try {
        const { playlistId, trackId } = req.params;

        const playlist = await Playlist.findOne({
            _id: playlistId,
            user: req.user.userId
        });

        if (!playlist) {
            return res.status(404).json({ message: 'Плейлист не найден или у вас нет прав.' });
        }

        playlist.tracks.pull(trackId);
        
        await updatePlaylistCover(playlist);
        await playlist.save();
        
        const updatedPlaylist = await Playlist.findById(playlist._id).populate({ path: 'tracks', populate: { path: 'artist album' } }).populate('user', 'username fullName avatar');
        res.json(updatedPlaylist);

    } catch (error) {
        res.status(500).json({ message: 'Ошибка при удалении трека из плейлиста.' });
    }
});

router.get('/user/:userId', authMiddleware, async (req, res) => {
    try {
        const { userId } = req.params;
        const requesterId = req.user.userId;

        const targetUser = await User.findById(userId).select('blacklist');
        if (!targetUser) {
            return res.status(404).json({ message: "Пользователь не найден." });
        }
        if (targetUser.blacklist.includes(requesterId)) {
            return res.status(403).json({ message: "Вы не можете просматривать плейлисты этого пользователя." });
        }
        
        const playlists = await Playlist.find({
            user: userId,
            visibility: { $in: ['public', 'unlisted'] }
        })
        .sort({ createdAt: -1 })
        .lean();
            
        res.json(playlists);

    } catch (error) {
        console.error("Ошибка при получении плейлистов пользователя:", error);
        res.status(500).json({ message: "Ошибка сервера" });
    }
});

module.exports = router;