// backend/routes/playlists.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const Playlist = require('../models/Playlist');
const Track = require('../models/Track');
const User = require('../models/User');

// Получить все плейлисты пользователя
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
// Создать новый плейлист
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { name, description, visibility } = req.body;
        if (!name) {
            return res.status(400).json({ message: 'Название плейлиста обязательно.' });
        }
        const newPlaylist = new Playlist({
            name,
            description,
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

// Получить конкретный плейлист с его треками
router.get('/:playlistId', authMiddleware, async (req, res) => {
    try {
        const playlist = await Playlist.findById(req.params.playlistId)
            .populate('tracks')
            .populate('user', 'username fullName avatar'); 

        if (!playlist) {
            return res.status(404).json({ message: 'Плейлист не найден.' });
        }
        
        const isOwner = playlist.user._id.toString() === req.user.userId;
        if (playlist.visibility === 'private' && !isOwner) {
            return res.status(403).json({ message: 'Это приватный плейлист.' });
        }

        res.json(playlist);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при загрузке плейлиста.' });
    }
});

// --- НОВЫЙ РОУТ: Увеличить счетчик прослушиваний ---
router.post('/:playlistId/play', authMiddleware, async (req, res) => {
    try {
        await Playlist.updateOne({ _id: req.params.playlistId }, { $inc: { playCount: 1 } });
        res.status(200).send();
    } catch (error) {
        console.error('Ошибка увеличения счетчика прослушиваний:', error);
        res.status(200).send();
    }
});

// Обновить информацию о плейлисте
router.put('/:playlistId', authMiddleware, async (req, res) => {
    try {
        const { name, description, visibility } = req.body;
        if (!name) {
            return res.status(400).json({ message: 'Название плейлиста обязательно.' });
        }

        const playlist = await Playlist.findOne({
            _id: req.params.playlistId,
            user: req.user.userId
        });
        
        if (!playlist) {
            return res.status(404).json({ message: 'Плейлист не найден или у вас нет прав на его редактирование.' });
        }

        playlist.name = name;
        playlist.description = description;
        playlist.visibility = visibility;
        
        await playlist.save();
        const updatedPlaylist = await Playlist.findById(playlist._id).populate('tracks').populate('user', 'username fullName avatar');
        res.json(updatedPlaylist);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при обновлении плейлиста.' });
    }
});

// Удалить плейлист
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

// Добавить треки в плейлист
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
        const tracksToAdd = trackIds.filter(id => !playlist.tracks.some(trackId => trackId.equals(id)));
        playlist.tracks.push(...tracksToAdd);
        await playlist.save();
        const updatedPlaylist = await Playlist.findById(playlist._id).populate('tracks').populate('user', 'username fullName avatar');
        res.json(updatedPlaylist);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при добавлении треков в плейлист.' });
    }
});

// Удалить трек из плейлиста
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
        await playlist.save();
        
        const updatedPlaylist = await Playlist.findById(playlist._id).populate('tracks').populate('user', 'username fullName avatar');
        res.json(updatedPlaylist);

    } catch (error) {
        res.status(500).json({ message: 'Ошибка при удалении трека из плейлиста.' });
    }
});

// Получить публичные и "не в поиске" плейлисты другого пользователя
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