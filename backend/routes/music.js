// backend/routes/music.js

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const authMiddleware = require('../middleware/auth.middleware');
const Track = require('../models/Track');
const Playlist = require('../models/Playlist');
const Artist = require('../models/Artist');
const Album = require('../models/Album');
const UserMusicProfile = require('../models/UserMusicProfile');

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---

const broadcastToUsers = (req, userIds, message) => {
    userIds.forEach(userId => {
        const userSocket = req.clients.get(userId.toString());
        if (userSocket && userSocket.readyState === 1) { 
            userSocket.send(JSON.stringify(message));
        }
    });
};

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

        const artists = Array.isArray(track.artist) ? track.artist.map(a => a._id || a) : [];
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
        logMusicAction(req, existingLibraryTrack, 'like');
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера при обновлении трека.' });
    }
});

router.get('/saved', authMiddleware, async (req, res) => {
    try {
        const savedTracks = await Track.find({ user: req.user.userId, type: 'saved' })
            .sort({ savedAt: -1 })
            .populate('artist', 'name')
            .populate('album', 'title coverArtUrl')
            .lean();

        const processedTracks = savedTracks.map(track => {
            if (track.album && track.album.coverArtUrl && !track.albumArtUrl) {
                return { ...track, albumArtUrl: track.album.coverArtUrl };
            }
            return track;
        });

        res.status(200).json(processedTracks);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера при получении треков.' });
    }
});

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

router.get('/album/:albumId', authMiddleware, async (req, res) => {
    try {
        const album = await Album.findById(req.params.albumId)
            .populate('artist', 'name avatarUrl')
            .populate({
                path: 'tracks',
                populate: { path: 'artist', select: 'name _id' }
            })
            .lean();

        if (!album || album.status !== 'approved') {
            return res.status(404).json({ message: 'Альбом не найден.' });
        }
        const processedTracks = album.tracks.map(track => ({
            ...track,
            albumArtUrl: track.albumArtUrl || album.coverArtUrl 
        }));

        const finalAlbumData = { ...album, tracks: processedTracks };
        
        res.json(finalAlbumData);
        
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера при загрузке альбома.' });
    }
});


router.get('/artist/:artistId', authMiddleware, async (req, res) => {
    try {
        const artistId = new mongoose.Types.ObjectId(req.params.artistId);
        const topTracksPipeline = [
            { $match: { artist: artistId, status: 'approved' } },
            {
                $group: {
                    _id: { $toLower: "$title" },
                    totalPlayCount: { $sum: "$playCount" },
                    doc: { $first: "$$ROOT" } 
                }
            },
            { $sort: { totalPlayCount: -1 } },
            { $limit: 5 },
            { $replaceRoot: { newRoot: "$doc" } }
        ];

        const [artist, topTracksAggregation, albums, featuredTracks, singles] = await Promise.all([
            Artist.findById(artistId).lean(),
            Track.aggregate(topTracksPipeline), // Выполняем агрегацию
            Album.find({ artist: artistId, status: 'approved' })
                .populate('artist', 'name')
                .sort({ releaseYear: -1, createdAt: -1 })
                .lean(),
            Track.find({ artist: artistId, status: 'approved', album: { $ne: null } })
                 .populate({
                     path: 'album',
                     populate: { path: 'artist', select: 'name _id' }
                 })
                 .lean(),
            Track.find({ artist: artistId, status: 'approved', album: null })
                 .populate('artist', 'name _id')
                 .sort({ releaseYear: -1, createdAt: -1 })
                 .lean()
        ]);

        await Artist.populate(topTracksAggregation, { path: 'artist', select: 'name _id' });
        await Album.populate(topTracksAggregation, { path: 'album', select: 'title coverArtUrl' });
        if (!artist || artist.status !== 'approved') {
            return res.status(404).json({ message: 'Артист не найден.' });
        }
        
        const processedTopTracks = topTracksAggregation.map(track => {
            if (track.album && track.album.coverArtUrl && !track.albumArtUrl) {
                return { ...track, albumArtUrl: track.album.coverArtUrl };
            }
            return track;
        });

        const actualFeaturedTracks = featuredTracks.filter(track => 
            track.album && track.album.artist && track.album.artist._id.toString() !== artistId.toString()
        );

        const featuredOnAlbums = actualFeaturedTracks.reduce((acc, track) => {
            if (track.album && !acc.some(a => a._id.toString() === track.album._id.toString())) {
                acc.push(track.album);
            }
            return acc;
        }, []);


        res.json({ artist, topTracks: processedTopTracks, albums, featuredOn: featuredOnAlbums, singles });

    } catch (error) {
        console.error("Ошибка загрузки данных артиста:", error);
        res.status(500).json({ message: 'Ошибка сервера при загрузке данных артиста.' });
    }
});

// --- ПОЛНОСТЬЮ ПЕРЕРАБОТАННЫЙ МАРШРУТ ПОИСКА ---

router.get('/search-all', authMiddleware, async (req, res) => {
    try {
        const { q, page = 1 } = req.query;
        const limit = 20;
        const skip = (parseInt(page) - 1) * limit;

        if (!q || q.trim() === '') {
            return res.json({ tracks: [], playlists: [], artists: [], albums: [], hasMore: false });
        }

        const searchQuery = { $regex: q, $options: 'i' };

        const [matchingArtists, matchingAlbums] = await Promise.all([
            Artist.find({ name: searchQuery, status: 'approved' }).select('_id').lean(),
            Album.find({ title: searchQuery, status: 'approved' }).select('_id').lean()
        ]);
        const artistIds = matchingArtists.map(a => a._id);
        const albumIds = matchingAlbums.map(a => a._id);

        const trackQuery = {
            status: 'approved',
            $or: [
                { title: searchQuery },
                { artist: { $in: artistIds } },
                { album: { $in: albumIds } }
            ]
        };
        
        const [artists, albums, playlists, tracks, totalTracks] = await Promise.all([
            page == 1 ? Artist.find({ name: searchQuery, status: 'approved' }).limit(6).lean() : Promise.resolve([]),
            page == 1 ? Album.find({ status: 'approved', $or: [{ title: searchQuery }, { artist: { $in: artistIds } }]}).populate('artist', 'name').limit(6).lean() : Promise.resolve([]),
            page == 1 ? Playlist.find({ name: searchQuery, visibility: 'public' }).populate('user', 'username').limit(6).lean() : Promise.resolve([]),
            Track.find(trackQuery)
                .populate('artist', 'name _id')
                .populate('album', 'title coverArtUrl')
                .sort({ playCount: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Track.countDocuments(trackQuery)
        ]);
        
        const processedTracks = tracks.map(track => {
            if (track.album && track.album.coverArtUrl) {
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

router.get('/artists/all', authMiddleware, async (req, res) => {
    try {
        const artists = await Artist.find({ status: 'approved' }).select('name avatarUrl').sort({ name: 1 });
        res.json(artists);
    } catch (error) {
        res.status(500).json({ message: "Ошибка загрузки артистов" });
    }
});

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

router.post('/track/:id/log-play', authMiddleware, async (req, res) => {
    try {
        Track.updateOne({ _id: req.params.id }, { $inc: { playCount: 1 } }).exec();
        const track = await Track.findById(req.params.id).populate('artist').lean();
        if (track) {
            logMusicAction(req, track, 'listen');
        }
        res.sendStatus(202);
    } catch (error) {
        res.sendStatus(500);
    }
});
router.get('/track/:trackId', authMiddleware, async (req, res) => {
    try {
        const track = await Track.findById(req.params.trackId)
            .populate('artist', 'name _id avatarUrl')
            .lean();

        if (!track || track.status !== 'approved') {
            return res.status(404).json({ message: 'Трек не найден.' });
        }
        res.json(track);
    } catch(error) {
        res.status(500).json({ message: 'Ошибка сервера при загрузке трека.' });
    }
});


router.post('/log-action', authMiddleware, async (req, res) => {
    try {
        const { track, action } = req.body;
        await logMusicAction(req, track, action);
        res.sendStatus(202);
    } catch (error) {
        console.error("Ошибка логирования действия:", error);
        res.sendStatus(500);
    }
});

router.get('/track/:id/stream-url', authMiddleware, async (req, res) => {
    try {
        const track = await Track.findById(req.params.id).select('storageKey');
        if (!track) {
            return res.status(404).json({ message: 'Трек не найден.' });
        }
        res.json({ url: track.storageKey });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка получения URL для стриминга.' });
    }
});


// --- НАЧАЛО ИСПРАВЛЕНИЯ: Новый маршрут для "Моей волны" и исправленный для рекомендаций ---

const processAndPopulateTracks = async (trackQuery, limit) => {
    const tracks = await Track.find(trackQuery)
        .sort({ playCount: -1, createdAt: -1 })
        .limit(limit)
        .populate('artist', 'name _id')
        .populate('album', 'title coverArtUrl')
        .lean();

    return tracks.map(track => {
        if (track.album && track.album.coverArtUrl && !track.albumArtUrl) {
            return { ...track, albumArtUrl: track.album.coverArtUrl };
        }
        return track;
    });
};

router.get('/wave', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const profile = await UserMusicProfile.findOne({ user: userId });

        if (!profile || (profile.topArtists.length === 0 && profile.topGenres.length === 0)) {
            const popularTracks = await processAndPopulateTracks({ status: 'approved' }, 50);
            popularTracks.sort(() => Math.random() - 0.5);
            return res.json(popularTracks);
        }

        const topArtistIds = profile.topArtists
            .slice(0, 10)
            .map(a => a.name)
            .filter(id => mongoose.Types.ObjectId.isValid(id))
            .map(id => new mongoose.Types.ObjectId(id));
        const topGenres = profile.topGenres.slice(0, 5).map(g => g.name);

        const listenedTracks = await Track.find({ user: userId, type: 'recent' }).sort({ playedAt: -1 }).limit(100).distinct('_id');

        const waveQuery = {
            status: 'approved',
            _id: { $nin: listenedTracks },
            $or: [
                { artist: { $in: topArtistIds } },
                { genres: { $in: topGenres } }
            ]
        };
        
        const waveTracks = await processAndPopulateTracks(waveQuery, 50);

        if (waveTracks.length < 50) {
            const needed = 50 - waveTracks.length;
            const existingIds = waveTracks.map(t => t._id);
            const popularTracks = await processAndPopulateTracks({ 
                status: 'approved', 
                _id: { $nin: [...listenedTracks, ...existingIds] } 
            }, needed);
            waveTracks.push(...popularTracks);
        }

        waveTracks.sort(() => Math.random() - 0.5);

        res.json(waveTracks);

    } catch (error) {
        console.error("Ошибка при генерации волны:", error);
        res.status(500).json({ message: 'Не удалось сгенерировать вашу волну.' });
    }
});

router.get('/recommendations', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const profile = await UserMusicProfile.findOne({ user: userId });
        const currentYear = new Date().getFullYear();

        let newReleases = [];
        let popularHits = [];
        
        if (profile && (profile.topArtists.length > 0 || profile.topGenres.length > 0)) {
            const topArtistIds = profile.topArtists
                .slice(0, 10)
                .map(a => a.name)
                .filter(id => mongoose.Types.ObjectId.isValid(id))
                .map(id => new mongoose.Types.ObjectId(id));
            const topGenres = profile.topGenres.slice(0, 5).map(g => g.name);

            const listenedTracks = await Track.find({ user: userId, type: { $in: ['saved', 'recent'] } }).distinct('_id');

            const newReleasesQuery = {
                status: 'approved',
                releaseYear: currentYear,
                _id: { $nin: listenedTracks },
                $or: [
                    { artist: { $in: topArtistIds } },
                    { genres: { $in: topGenres } }
                ]
            };
            newReleases = await processAndPopulateTracks(newReleasesQuery, 10);

            const popularHitsQuery = {
                status: 'approved',
                _id: { $nin: listenedTracks },
                 $or: [
                    { artist: { $in: topArtistIds } },
                    { genres: { $in: topGenres } }
                ]
            };
            popularHits = await processAndPopulateTracks(popularHitsQuery, 10);
        }
        
        if (newReleases.length < 10) {
            const generalNew = await processAndPopulateTracks({ status: 'approved', releaseYear: currentYear }, 10 - newReleases.length);
            newReleases.push(...generalNew);
        }
        if (popularHits.length < 10) {
            const generalPopular = await processAndPopulateTracks({ status: 'approved' }, 10 - popularHits.length);
            popularHits.push(...generalPopular);
        }

        // --- НАЧАЛО ИСПРАВЛЕНИЯ ---
        // Заменяем статический запрос на динамическую агрегацию для определения популярных артистов
        const popularArtists = await Track.aggregate([
            // 1. Выбираем только одобренные треки из основной библиотеки
            { $match: { status: 'approved', type: 'library_track' } },
            // 2. "Разворачиваем" массив артистов, чтобы работать с каждым отдельно
            { $unwind: "$artist" },
            // 3. Группируем по ID артиста и суммируем все прослушивания их треков
            {
                $group: {
                    _id: "$artist",
                    totalPlayCount: { $sum: "$playCount" }
                }
            },
            // 4. Сортируем по убыванию общего числа прослушиваний
            { $sort: { totalPlayCount: -1 } },
            // 5. Оставляем только топ-6
            { $limit: 6 },
            // 6. "Подтягиваем" полную информацию об артистах (имя, аватар и т.д.)
            {
                $lookup: {
                    from: "artists", // Название коллекции в MongoDB
                    localField: "_id",
                    foreignField: "_id",
                    as: "artistDetails"
                }
            },
            // 7. "Разворачиваем" массив с деталями артиста (в нем всегда будет 1 элемент)
            { $unwind: "$artistDetails" },
            // 8. Заменяем корневой документ на детали артиста, чтобы получить чистый объект артиста
            {
                $replaceRoot: { newRoot: "$artistDetails" }
            }
        ]);
        // --- КОНЕЦ ИСПРАВЛЕНИЯ ---

        res.json({ newReleases, popularHits, popularArtists });

    } catch (error) {
        console.error("Ошибка при загрузке рекомендаций:", error);
        res.status(500).json({ message: 'Не удалось загрузить рекомендации.' });
    }
});

router.get('/user/:userId/saved', authMiddleware, async (req, res) => {
    try {
        const { userId: targetUserId } = req.params;
        const requesterId = req.user.userId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const targetUser = await User.findById(targetUserId).select('privacySettings friends blacklist');
        if (!targetUser) {
            return res.status(404).json({ message: "Пользователь не найден." });
        }

        if (targetUser.blacklist.includes(requesterId)) {
            return res.status(403).json({ message: "Вы не можете просматривать музыку этого пользователя." });
        }
        
        // Импортируем утилиту для проверки приватности
        const { isAllowedByPrivacy } = require('../utils/privacy');
        if (!isAllowedByPrivacy(targetUser.privacySettings?.viewMusic, requesterId, targetUser)) {
            return res.status(403).json({ message: "Пользователь скрыл свою музыку." });
        }

        const query = { user: targetUserId, type: 'saved' };
        
        const totalCount = await Track.countDocuments(query);
        const savedTracks = await Track.find(query)
            .sort({ savedAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('artist', 'name')
            .populate('album', 'title coverArtUrl')
            .lean();

        const processedTracks = savedTracks.map(track => {
            if (track.album && track.album.coverArtUrl && !track.albumArtUrl) {
                return { ...track, albumArtUrl: track.album.coverArtUrl };
            }
            return track;
        });
        
        res.json({
            tracks: processedTracks,
            totalCount,
            hasMore: (skip + savedTracks.length) < totalCount
        });

    } catch (error) {
        console.error("Ошибка при получении музыки пользователя:", error);
        res.status(500).json({ message: "Ошибка сервера при получении музыки пользователя." });
    }
});

module.exports = router;