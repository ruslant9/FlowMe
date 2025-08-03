// backend/routes/music.js

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const authMiddleware = require('../middleware/auth.middleware');

// Модели
const Track = require('../models/Track');
const User = require('../models/User');
const Playlist = require('../models/Playlist');
const Artist = require('../models/Artist');
const Album = require('../models/Album');
const UserMusicProfile = require('../models/UserMusicProfile');

// Утилиты
const { isAllowedByPrivacy } = require('../utils/privacy');

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---

// Функция для отправки WebSocket-сообщений
const broadcastToUsers = (req, userIds, message) => {
    userIds.forEach(userId => {
        const userSocket = req.clients.get(userId.toString());
        if (userSocket && userSocket.readyState === 1) { // 1 === WebSocket.OPEN
            userSocket.send(JSON.stringify(message));
        }
    });
};

// Функция для форматирования имени артиста (для анализа жанров)
const formatArtistName = (artistData) => {
    if (!artistData) return '';
    if (Array.isArray(artistData)) {
        return artistData.map(a => a.name || '').join(', ');
    }
    if (typeof artistData === 'object' && artistData.name) {
        return artistData.name;
    }
    return artistData.toString();
};

// Функция для анализа жанров трека по ключевым словам
const analyzeTrackForGenres = (track) => {
    const GENRE_MOOD_KEYWORDS = {
        'Chill': ['chill', 'lofi', 'relax', 'acoustic', 'slowed', 'reverb'],
        'Energetic': ['dance', 'power', 'gym', 'workout', 'running', 'upbeat'],
        'Party': ['party', 'club', 'remix', 'bootleg', 'mix'],
        'Sad': ['sad', 'slow', 'emotional', 'heartbreak'],
        'Rock': ['rock', 'metal', 'punk', 'alternative', 'hard rock'],
        'Pop': ['pop', 'hits', 'charts', 'billboard'],
        'Hip-Hop': ['hip-hop', 'rap', 'trap', 'drill'],
        'Electronic': ['electronic', 'edm', 'techno', 'house', 'dnb', 'drum and bass'],
        'Phonk': ['phonk']
    };
    const foundGenres = new Set();
    const searchableText = `${(track.title || '').toLowerCase()} ${formatArtistName(track.artist).toLowerCase()}`;
    for (const genre in GENRE_MOOD_KEYWORDS) {
        for (const keyword of GENRE_MOOD_KEYWORDS[genre]) {
            if (searchableText.includes(keyword)) {
                foundGenres.add(genre);
            }
        }
    }
    return Array.from(foundGenres);
};

// Функция для логирования действий пользователя для системы рекомендаций
const logMusicAction = async (req, track, action) => {
    try {
        const userId = req.user.userId;
        if (!track || !action) return;
        
        let points = 0;
        switch(action) {
            case 'listen': points = 1; break;
            case 'like': points = 5; break;
            case 'skip': points = -2; break;
        }

        const artists = Array.isArray(track.artist) ? track.artist.map(a => a._id) : [];
        const genres = track.genres || [];

        if (artists.length === 0 && genres.length === 0) return;
        
        const profile = await UserMusicProfile.findOneAndUpdate(
            { user: userId },
            { $setOnInsert: { user: userId } },
            { upsert: true, new: true }
        );

        artists.forEach(artistId => profile.updateArtistScore(artistId, points));
        genres.forEach(genreName => profile.updateGenreScore(genreName, points));
        
        await profile.save();
    } catch (error) {
       console.warn(`Не удалось залогировать действие ${action}`, error);
    }
};


// --- МАРШРУТЫ ДЛЯ "МОЕЙ МУЗЫКИ" И ИСТОРИИ ---

// Добавить/удалить трек из "Моей музыки"
router.post('/toggle-save', authMiddleware, async (req, res) => {
    try {
        const { _id: trackId } = req.body;
        const userId = req.user.userId;

        const existingLibraryTrack = await Track.findById(trackId);
        if (!existingLibraryTrack || existingLibraryTrack.type !== 'library_track') {
            return res.status(404).json({ message: 'Трек не найден в библиотеке.' });
        }

        const existingSavedTrack = await Track.findOne({ user: userId, spotifyId: existingLibraryTrack.spotifyId, type: 'saved' });

        if (existingSavedTrack) {
            await Track.deleteOne({ _id: existingSavedTrack._id });
            res.status(200).json({ message: 'Трек удален из Моей музыки.', saved: false });
        } else {
            const newSavedTrack = new Track({
                ...existingLibraryTrack.toObject(),
                _id: new mongoose.Types.ObjectId(),
                user: userId,
                type: 'saved',
                savedAt: new Date(),
            });
            await newSavedTrack.save();
            res.status(201).json({ message: 'Трек добавлен в Мою музыку.', saved: true });
        }
        broadcastToUsers(req, [userId], { type: 'MUSIC_UPDATED' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера при обновлении трека.' });
    }
});

// Получить список сохраненных треков
router.get('/saved', authMiddleware, async (req, res) => {
    try {
        const savedTracks = await Track.find({ user: req.user.userId, type: 'saved' })
            .sort({ savedAt: -1 })
            .populate('artist', 'name')
            .populate('album', 'title');
        res.status(200).json(savedTracks);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера при получении треков.' });
    }
});

// Получить историю прослушиваний
router.get('/history', authMiddleware, async (req, res) => {
    try {
        const history = await Track.find({ user: req.user.userId, type: 'recent' })
            .sort({ playedAt: -1 })
            .limit(50)
            .populate('artist', 'name')
            .populate('album', 'title');
        res.json(history);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при получении истории.' });
    }
});

// --- МАРШРУТЫ ДЛЯ СТРАНИЦ АРТИСТОВ И АЛЬБОМОВ ---

// Получить данные для страницы альбома
router.get('/album/:albumId', authMiddleware, async (req, res) => {
    try {
        const album = await Album.findById(req.params.albumId)
            .populate('artist', 'name avatarUrl')
            .populate({
                path: 'tracks',
                populate: { path: 'artist', select: 'name' }
            })
            .lean();

        if (!album || album.status !== 'approved') {
            return res.status(404).json({ message: 'Альбом не найден.' });
        }
        res.json(album);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера при загрузке альбома.' });
    }
});

// Получить данные для страницы артиста
router.get('/artist/:artistId', authMiddleware, async (req, res) => {
    try {
        const artistId = req.params.artistId;

        const [artist, topTracks, albums] = await Promise.all([
            Artist.findById(artistId).lean(),
            Track.find({ artist: artistId, status: 'approved' })
                .sort({ playCount: -1 })
                .limit(10)
                .populate('artist', 'name')
                .populate('album', 'title coverArtUrl')
                .lean(),
            Album.find({ artist: artistId, status: 'approved' })
                .populate('artist', 'name')
                .sort({ releaseYear: -1 })
                .lean()
        ]);
        
        if (!artist || artist.status !== 'approved') {
            return res.status(404).json({ message: 'Артист не найден.' });
        }
        
        // Исправление обложек для популярных треков
        const processedTracks = topTracks.map(track => {
            if (track.album && track.album.coverArtUrl && !track.albumArtUrl) {
                return { ...track, albumArtUrl: track.album.coverArtUrl };
            }
            return track;
        });

        res.json({ artist, topTracks: processedTracks, albums });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера при загрузке данных артиста.' });
    }
});


// --- МАРШРУТЫ ДЛЯ ПОИСКА И РЕКОМЕНДАЦИЙ ---

// Поиск по всей музыкальной библиотеке (треки, артисты, альбомы, плейлисты)
router.get('/search-all', authMiddleware, async (req, res) => {
    try {
        const { q, page = 1 } = req.query;
        const limit = 20;
        const skip = (parseInt(page) - 1) * limit;

        if (!q || q.trim() === '') {
            return res.json({ tracks: [], playlists: [], artists: [], albums: [], hasMore: false });
        }

        const searchQuery = { $regex: q, $options: 'i' };
        const matchingArtists = await Artist.find({ name: searchQuery, status: 'approved' }).select('_id').lean();
        const artistIds = matchingArtists.map(a => a._id);

        const [artists, albums, playlists, tracks, totalTracks] = await Promise.all([
            page == 1 ? Artist.find({ name: searchQuery, status: 'approved' }).limit(6).lean() : Promise.resolve([]),
            page == 1 ? Album.find({ status: 'approved', $or: [{ title: searchQuery }, { artist: { $in: artistIds } }]}).populate('artist', 'name').limit(6).lean() : Promise.resolve([]),
            page == 1 ? Playlist.find({ name: searchQuery, visibility: 'public' }).populate('user', 'username').limit(6).lean() : Promise.resolve([]),
            Track.find({ status: 'approved', $or: [{ title: searchQuery }, { artist: { $in: artistIds } }]})
                .populate('artist', 'name')
                .populate('album', 'title coverArtUrl')
                .sort({ playCount: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Track.countDocuments({ status: 'approved', $or: [{ title: searchQuery }, { artist: { $in: artistIds } }]})
        ]);

        // **ИСПРАВЛЕНИЕ ОБЛОЖЕК**
        const processedTracks = tracks.map(track => {
            if (track.album && track.album.coverArtUrl && !track.albumArtUrl) {
                return { ...track, albumArtUrl: track.album.coverArtUrl };
            }
            return track;
        });

        const hasMore = (skip + processedTracks.length) < totalTracks;
        res.json({ tracks: processedTracks, playlists, artists, albums, hasMore });

    } catch (error) {
        console.error("Ошибка сервера при поиске:", error);
        res.status(500).json({ message: "Ошибка сервера при поиске." });
    }
});

// --- СЛУЖЕБНЫЕ МАРШРУТЫ ---

// Получить всех артистов (для форм)
router.get('/artists/all', authMiddleware, async (req, res) => {
    try {
        const artists = await Artist.find({ status: 'approved' }).select('name avatarUrl').sort({ name: 1 });
        res.json(artists);
    } catch (error) {
        res.status(500).json({ message: "Ошибка загрузки артистов" });
    }
});

// Получить все альбомы (для форм)
router.get('/albums/all', authMiddleware, async (req, res) => {
    try {
        const albums = await Album.find({ status: 'approved' })
            .populate('artist', 'name')
            .select('title artist coverArtUrl')
            .sort({ title: 1 });
        res.json(albums);
    } catch (error) {
        res.status(500).json({ message: "Ошибка загрузки альбомов" });
    }
});

// Залогировать прослушивание трека
router.post('/track/:id/log-play', authMiddleware, async (req, res) => {
    try {
        // Увеличиваем счетчик асинхронно, не дожидаясь ответа
        Track.updateOne({ _id: req.params.id }, { $inc: { playCount: 1 } }).exec();
        
        // Также асинхронно обновляем профиль рекомендаций
        const track = await Track.findById(req.params.id).populate('artist').lean();
        if (track) {
            logMusicAction(req, track, 'listen');
        }
        
        res.sendStatus(202); // Accepted
    } catch (error) {
        console.error("Ошибка при логировании прослушивания:", error);
        res.sendStatus(500);
    }
});

// Получить URL для стриминга
router.get('/track/:id/stream-url', authMiddleware, async (req, res) => {
    try {
        const track = await Track.findById(req.params.id).select('storageKey');
        if (!track) {
            return res.status(404).json({ message: 'Трек не найден.' });
        }
        // В нашем случае, storageKey уже является полным URL
        res.json({ url: track.storageKey });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка получения URL для стриминга.' });
    }
});

router.post('/log-action', authMiddleware, async (req, res) => {
    try {
        const { track, action } = req.body;
        // Передаем req, чтобы получить доступ к req.user.userId внутри функции
        await logMusicAction(req, track, action);
        res.sendStatus(202); // Accepted
    } catch (error) {
        console.error("Ошибка логирования действия:", error);
        res.sendStatus(500);
    }
});

module.exports = router;