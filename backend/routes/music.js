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
const User = require('../models/User'); 
const { isAllowedByPrivacy } = require('../utils/privacy');
const { generateSearchQueries } = require('../utils/searchUtils');

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
        const trackDataFromClient = req.body;
        const userId = req.user.userId;

        let libraryTrack;

        if (trackDataFromClient.type === 'library_track') {
            libraryTrack = await Track.findById(trackDataFromClient._id);
        } else if (trackDataFromClient.sourceId) {
            libraryTrack = await Track.findById(trackDataFromClient.sourceId);
        }

        if (!libraryTrack || libraryTrack.type !== 'library_track') {
            return res.status(404).json({ message: 'Трек не найден в библиотеке.' });
        }

        const existingSavedTrack = await Track.findOne({
            user: userId,
            sourceId: libraryTrack._id,
            type: 'saved'
        });

        if (existingSavedTrack) {
            await Playlist.updateMany(
                { user: userId },
                { $pull: { tracks: existingSavedTrack._id } }
            );
            await Track.deleteOne({ _id: existingSavedTrack._id });
            res.status(200).json({ message: 'Трек удален из Моей музыки.', saved: false });
        } else {
            const newSavedTrack = new Track({
                ...libraryTrack.toObject(),
                _id: new mongoose.Types.ObjectId(),
                user: userId,
                type: 'saved',
                sourceId: libraryTrack._id,
                savedAt: new Date(),
            });
            await newSavedTrack.save();
            logMusicAction(req, libraryTrack, 'like');
            res.status(201).json({ message: 'Трек добавлен в Мою музыку.', saved: true });
        }
        
        broadcastToUsers(req, [userId], { type: 'MUSIC_UPDATED' });
        
    } catch (error) {
        console.error("Ошибка при обновлении трека в медиатеке:", error);
        res.status(500).json({ message: 'Ошибка сервера при обновлении трека.' });
    }
});


router.get('/saved', authMiddleware, async (req, res) => {
    try {
        const savedTracks = await Track.find({ user: req.user.userId, type: 'saved' })
            .sort({ savedAt: -1 })
            .populate('artist', 'name')
            .populate('album', 'title coverArtUrl')
            .select('-__v') 
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
                select: 'title artist durationMs isExplicit playCount',
                populate: { path: 'artist', select: 'name _id' }
            })
            .lean();

        if (!album || album.status !== 'approved') {
            return res.status(404).json({ message: 'Альбом не найден.' });
        }
        
        const totalPlayCount = album.tracks.reduce((sum, track) => sum + (track.playCount || 0), 0);

        const processedTracks = album.tracks.map(track => ({
            ...track,
            albumArtUrl: track.albumArtUrl || album.coverArtUrl 
        }));

        const finalAlbumData = { ...album, tracks: processedTracks, totalPlayCount };
        
        res.json(finalAlbumData);
        
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера при загрузке альбома.' });
    }
});

router.get('/album/:albumId/recommendations', authMiddleware, async (req, res) => {
    try {
        const { albumId } = req.params;
        const album = await Album.findById(albumId).populate('tracks').lean();

        if (!album) {
            return res.json([]);
        }

        const primaryArtistId = album.artist;
        const allArtistIds = new Set([primaryArtistId.toString()]);
        const allGenres = new Set(album.genre ? [album.genre] : []);
        
        const populatedTracks = await Track.find({ _id: { $in: album.tracks.map(t => t._id) } }).lean();

        populatedTracks.forEach(track => {
            if (track.artist) {
                track.artist.forEach(a => allArtistIds.add(a.toString()));
            }
            if (track.genres) {
                track.genres.forEach(g => allGenres.add(g));
            }
        });

        const trackIdsInAlbum = populatedTracks.map(t => t._id);

        const recommendations = await Track.find({
            _id: { $nin: trackIdsInAlbum },
            status: 'approved',
            type: 'library_track',
            $or: [
                { artist: { $in: Array.from(allArtistIds).map(id => new mongoose.Types.ObjectId(id)) } },
                { genres: { $in: Array.from(allGenres) } }
            ]
        })
        .sort({ playCount: -1 })
        .limit(11)
        .populate('artist', 'name _id')
        .populate('album', 'title coverArtUrl')
        .lean();

        const processedRecs = recommendations.map(track => {
            if (track.album && track.album.coverArtUrl && !track.albumArtUrl) {
                return { ...track, albumArtUrl: track.album.coverArtUrl };
            }
            return track;
        });

        res.json(processedRecs);
    } catch (error) {
        console.error("Ошибка при генерации рекомендаций к альбому:", error);
        res.status(500).json({ message: "Ошибка сервера" });
    }
});


router.get('/artist/:artistId', authMiddleware, async (req, res) => {
    try {
        const artistId = new mongoose.Types.ObjectId(req.params.artistId);
        const requesterId = new mongoose.Types.ObjectId(req.user.userId);
        
        const topTracksPipeline = [
            { $match: { artist: artistId, status: 'approved' } },
            { $group: { _id: "$_id", doc: { $first: "$$ROOT" }, totalPlayCount: { $sum: "$playCount" } } },
            { $replaceRoot: { newRoot: "$doc" } },
            { $sort: { playCount: -1 } },
            { $limit: 5 }
        ];

        const totalPlaysPipeline = [
            { $match: { artist: artistId, status: 'approved' } },
            { $group: { _id: null, totalPlayCount: { $sum: '$playCount' } } }
        ];

        const [artist, topTracksAggregation, albums, featuredTracks, singles, totalPlaysResult] = await Promise.all([
            Artist.findById(artistId).lean(),
            Track.aggregate(topTracksPipeline),
            Album.find({ artist: artistId, status: 'approved' }).populate('artist', 'name').sort({ releaseDate: -1, createdAt: -1 }).lean(),
            Track.find({ artist: artistId, status: 'approved', album: { $ne: null } }).populate({ path: 'album', populate: { path: 'artist', select: 'name _id' } }).lean(),
            Track.find({ artist: artistId, status: 'approved', album: null }).populate('artist', 'name _id').sort({ releaseDate: -1, createdAt: -1 }).lean(),
            Track.aggregate(totalPlaysPipeline)
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

        const totalPlayCount = totalPlaysResult.length > 0 ? totalPlaysResult[0].totalPlayCount : 0;
        const subscriberCount = artist.subscribers?.length || 0;
        const isSubscribed = artist.subscribers?.some(id => id.equals(requesterId)) || false;
        
        res.json({ artist, topTracks: processedTopTracks, albums, featuredOn: featuredOnAlbums, singles, totalPlayCount, subscriberCount, isSubscribed });

    } catch (error) {
        console.error("Ошибка загрузки данных артиста:", error);
        res.status(500).json({ message: 'Ошибка сервера при загрузке данных артиста.' });
    }
});

router.post('/artist/:artistId/subscribe', authMiddleware, async (req, res) => {
    try {
        const { artistId } = req.params;
        const userId = req.user.userId;

        await User.findByIdAndUpdate(userId, { $addToSet: { subscribedArtists: artistId } });
        await Artist.findByIdAndUpdate(artistId, { $addToSet: { subscribers: userId } });

        res.json({ message: 'Вы подписались на артиста.' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при подписке.' });
    }
});

router.post('/artist/:artistId/unsubscribe', authMiddleware, async (req, res) => {
    try {
        const { artistId } = req.params;
        const userId = req.user.userId;

        await User.findByIdAndUpdate(userId, { $pull: { subscribedArtists: artistId } });
        await Artist.findByIdAndUpdate(artistId, { $pull: { subscribers: userId } });

        res.json({ message: 'Вы отписались от артиста.' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при отписке.' });
    }
});

router.get('/search-all', authMiddleware, async (req, res) => {
    try {
        const { q, page = 1 } = req.query;
        const limit = 20;
        const skip = (parseInt(page) - 1) * limit;

        if (!q || q.trim() === '') {
            return res.json({ tracks: [], playlists: [], artists: [], albums: [], hasMore: false });
        }

        const searchPatterns = generateSearchQueries(q);
        if (searchPatterns.length === 0) {
            return res.json({ tracks: [], playlists: [], artists: [], albums: [], hasMore: false });
        }
        const searchOrCondition = (field) => ({
            $or: searchPatterns.map(pattern => ({ [field]: { $regex: pattern } }))
        });

        const [matchingArtists, matchingAlbums] = await Promise.all([
            Artist.find({ ...searchOrCondition('name'), status: 'approved' }).select('_id').lean(),
            Album.find({ ...searchOrCondition('title'), status: 'approved' }).select('_id').lean()
        ]);
        const artistIds = matchingArtists.map(a => a._id);
        const albumIds = matchingAlbums.map(a => a._id);

        const trackQuery = {
            status: 'approved',
            type: 'library_track',
            $or: [
                searchOrCondition('title'),
                { artist: { $in: artistIds } },
                { album: { $in: albumIds } }
            ]
        };
        
        const [artists, albums, playlists, tracks, totalTracks] = await Promise.all([
            page == 1 ? Artist.find({ ...searchOrCondition('name'), status: 'approved' }).limit(6).lean() : Promise.resolve([]),
            page == 1 ? Album.find({ status: 'approved', $or: [searchOrCondition('title'), { artist: { $in: artistIds } }]}).populate('artist', 'name').limit(6).lean() : Promise.resolve([]),
            page == 1 ? Playlist.find({ ...searchOrCondition('name'), visibility: 'public' }).populate('user', 'username').limit(6).lean() : Promise.resolve([]),
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

// --- НАЧАЛО ИСПРАВЛЕНИЯ ---
router.post('/track/:id/log-play', authMiddleware, async (req, res) => {
    try {
        const trackId = req.params.id;
        const userId = req.user.userId;

        // 1. Асинхронно увеличиваем счетчик прослушиваний, не ждем завершения
        Track.updateOne({ _id: trackId }, { $inc: { playCount: 1 } }).exec();

        // 2. Получаем данные библиотечного трека для создания/обновления истории
        const libraryTrack = await Track.findById(trackId).lean();
        if (libraryTrack) {
            // 3. Записываем действие для системы рекомендаций
            logMusicAction(req, libraryTrack, 'listen');

            // 4. Создаем или обновляем запись в истории прослушиваний (upsert)
            const historyEntry = {
                ...libraryTrack,
                _id: undefined, // Удаляем старый _id, чтобы MongoDB сгенерировал новый при создании
                user: userId,
                type: 'recent',
                sourceId: libraryTrack._id, // Ссылка на оригинальный трек
                playedAt: new Date(),
            };
            
            await Track.findOneAndUpdate(
                { user: userId, sourceId: libraryTrack._id, type: 'recent' },
                { $set: historyEntry },
                { upsert: true }
            );
        }
        
        // Отвечаем немедленно, не дожидаясь всех операций с БД
        res.sendStatus(202); 
    } catch (error) {
        // Логируем ошибку, но не отправляем клиенту, чтобы не прерывать воспроизведение
        console.error("Ошибка при логировании прослушивания:", error);
        res.sendStatus(202); // Все равно отправляем успешный статус
    }
});
// --- КОНЕЦ ИСПРАВЛЕНИЯ ---
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

router.get('/track/:trackId/recommendations', authMiddleware, async (req, res) => {
    try {
        const { trackId } = req.params;
        const track = await Track.findById(trackId).lean();

        if (!track) {
            return res.json([]);
        }

        const allArtistIds = (track.artist || []).map(a => new mongoose.Types.ObjectId(a));
        const allGenres = track.genres || [];

        const recommendations = await Track.find({
            _id: { $ne: track._id },
            status: 'approved',
            type: 'library_track',
            $or: [
                { artist: { $in: allArtistIds } },
                { genres: { $in: allGenres } }
            ]
        })
        .sort({ playCount: -1 })
        .limit(11)
        .populate('artist', 'name _id')
        .populate('album', 'title coverArtUrl')
        .lean();

        const processedRecs = recommendations.map(rec => {
            if (rec.album && rec.album.coverArtUrl && !rec.albumArtUrl) {
                return { ...rec, albumArtUrl: rec.album.coverArtUrl };
            }
            return rec;
        });

        res.json(processedRecs);
    } catch (error) {
        console.error("Ошибка при генерации рекомендаций к треку:", error);
        res.status(500).json({ message: "Ошибка сервера" });
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
                releaseDate: { $gte: new Date(`${currentYear}-01-01`) },
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
            const generalNew = await processAndPopulateTracks({ status: 'approved', releaseDate: { $gte: new Date(`${currentYear}-01-01`) } }, 10 - newReleases.length);
            newReleases.push(...generalNew);
        }
        if (popularHits.length < 10) {
            const generalPopular = await processAndPopulateTracks({ status: 'approved' }, 10 - popularHits.length);
            popularHits.push(...generalPopular);
        }
        
        const popularArtists = await Track.aggregate([
            { $match: { status: 'approved', type: 'library_track' } },
            { $unwind: "$artist" },
            {
                $group: {
                    _id: "$artist",
                    totalPlayCount: { $sum: "$playCount" }
                }
            },
            { $sort: { totalPlayCount: -1 } },
            { $limit: 11 },
            {
                $lookup: {
                    from: "artists",
                    localField: "_id",
                    foreignField: "_id",
                    as: "artistDetails"
                }
            },
            { $unwind: "$artistDetails" },
            {
                $replaceRoot: { newRoot: "$artistDetails" }
            }
        ]);

        const uniqueNewReleasesMap = new Map();
        newReleases.forEach(track => uniqueNewReleasesMap.set(track._id.toString(), track));
        const uniqueNewReleases = Array.from(uniqueNewReleasesMap.values());

        const uniquePopularHitsMap = new Map();
        popularHits.forEach(track => uniquePopularHitsMap.set(track._id.toString(), track));
        const uniquePopularHits = Array.from(uniquePopularHitsMap.values());

        res.json({ 
            newReleases: uniqueNewReleases, 
            popularHits: uniquePopularHits, 
            popularArtists 
        });

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