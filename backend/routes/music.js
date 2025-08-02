// backend/routes/music.js

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const Track = require('../models/Track');
const User = require('../models/User');
const Session = require('../models/Session');
const axios = require('axios');
const { isAllowedByPrivacy } = require('../utils/privacy');
const UserMusicProfile = require('../models/UserMusicProfile');
const Playlist = require('../models/Playlist');

// --- ИСПРАВЛЕНИЕ: Добавляем недостающие импорты ---
const Artist = require('../models/Artist');
const Album = require('../models/Album');
// --- КОНЕЦ ИСПРАВЛЕНИЯ ---

// Импортируем все необходимые утилиты из spotify.js
const { searchSpotifyAndFindYouTube, getSpotifyToken, findAndCacheYouTubeVideos } = require('../utils/spotify');

const broadcastToUsers = (req, userIds, message) => {
    userIds.forEach(userId => {
        const userSocket = req.clients.get(userId.toString());
        if (userSocket && userSocket.readyState === 1) {
            userSocket.send(JSON.stringify(message));
        }
    });
};

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

const analyzeTrackForGenres = (track) => {
    const foundGenres = new Set();
    const searchableText = `${(track.title || '').toLowerCase()} ${(track.artist || '').toLowerCase()}`;
    for (const genre in GENRE_MOOD_KEYWORDS) {
        for (const keyword of GENRE_MOOD_KEYWORDS[genre]) {
            if (searchableText.includes(keyword)) {
                foundGenres.add(genre);
            }
        }
    }
    return Array.from(foundGenres);
};

router.post('/toggle-save', authMiddleware, async (req, res) => {
    try {
        const { youtubeId, title, artist, album, albumArtUrl, previewUrl, durationMs, spotifyId } = req.body;
        const userId = req.user.userId;
        if (!spotifyId || !youtubeId || !title || !artist) {
            return res.status(400).json({ message: 'Необходимые поля для трека отсутствуют.' });
        }
        let track = await Track.findOne({ user: userId, spotifyId, type: 'saved' });
        if (track) {
            await Track.deleteOne({ _id: track._id });
            res.status(200).json({ message: 'Трек удален из Моей музыки.', saved: false });
        } else {
            track = new Track({
                user: userId, youtubeId, title, artist, album, albumArtUrl, previewUrl, durationMs, spotifyId,
                type: 'saved', savedAt: new Date(),
            });
            await track.save();
            res.status(201).json({ message: 'Трек добавлен в Мою музыку.', saved: true });
        }
        broadcastToUsers(req, [userId], { type: 'MUSIC_UPDATED', payload: { userId } });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера при обновлении трека.' });
    }
});

router.get('/saved', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const savedTracks = await Track.find({ user: userId, type: 'saved' }).sort({ savedAt: -1 });
        res.status(200).json(savedTracks);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера при получении треков.' });
    }
});

router.get('/user/:userId/saved', authMiddleware, async (req, res) => {
    try {
        const { userId } = req.params;
        const requesterId = req.user.userId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const targetUser = await User.findById(userId).select('privacySettings friends blacklist');
        if (!targetUser) {
            return res.status(404).json({ message: 'Пользователь не найден.' });
        }
        if (targetUser.blacklist.includes(requesterId)) {
            return res.status(403).json({ message: 'Доступ запрещен.' });
        }
        if (!isAllowedByPrivacy(targetUser.privacySettings.viewMusic, requesterId, targetUser)) {
            return res.status(403).json({ message: 'Пользователь скрыл свою музыку.' });
        }
        
        const query = { user: userId, type: 'saved' };
        const totalTracks = await Track.countDocuments(query);
        const savedTracks = await Track.find(query).sort({ savedAt: -1 }).skip(skip).limit(limit);

        res.status(200).json({
            tracks: savedTracks,
            hasMore: (skip + savedTracks.length) < totalTracks,
            totalCount: totalTracks
        });

    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера при получении треков.' });
    }
});

const countryMap = { RU: 'Russia', UA: 'Ukraine', BY: 'Belarus', KZ: 'Kazakhstan', US: 'United States', DE: 'Germany' };

router.get('/popular-artists', authMiddleware, async (req, res) => {
    try {
        let artistNames = new Set();
        const desiredArtistCount = 6;
        const profile = await UserMusicProfile.findOne({ user: req.user.userId }).lean();

        if (profile && profile.topArtists && profile.topArtists.length > 0) {
            profile.topArtists.slice(0, 10).forEach(a => artistNames.add(a.name));
        }

        if (artistNames.size < desiredArtistCount) {
            const session = await Session.findById(req.user.sessionId).select('countryCode');
            const countryCode = session?.countryCode?.toUpperCase();
            const countryName = countryMap[countryCode] || 'Russia';
            const topArtistsResponse = await axios.get('http://ws.audioscrobbler.com/2.0/', {
                params: { method: 'chart.gettopartists', country: countryName, api_key: process.env.LASTFM_API_KEY, format: 'json', limit: 15 }
            });
            topArtistsResponse.data.artists.artist.forEach(a => artistNames.add(a.name));
        }

        const uniqueArtistNames = [...artistNames].slice(0, 15);
        if (uniqueArtistNames.length === 0) return res.json([]);

        const token = await getSpotifyToken();
        const searchPromises = uniqueArtistNames.map(name =>
            axios.get('https://api.spotify.com/v1/search', {
                params: { q: `artist:"${name}"`, type: 'artist', limit: 1 },
                headers: { 'Authorization': `Bearer ${token}` }
            }).catch(() => null)
        );

        const searchResponses = await Promise.all(searchPromises);
        const result = searchResponses
            .filter(response => response && response.data.artists.items.length > 0)
            .map(response => {
                const artistData = response.data.artists.items[0];
                if (!artistData || !artistData.images || artistData.images.length === 0) return null;
                return {
                    name: artistData.name,
                    imageUrl: artistData.images[0].url
                };
            })
            .filter(Boolean);

        res.json(result.slice(0, desiredArtistCount));
    } catch (error) {
        res.status(500).json({ message: 'Не удалось получить список популярных исполнителей.' });
    }
});

router.get('/history', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const history = await Track.find({ user: userId, type: 'recent' }).sort({ playedAt: -1 }).limit(50);
        res.json(history);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при получении истории.' });
    }
});

router.post('/history', authMiddleware, async (req, res) => {
    try {
        const { youtubeId, title, artist, albumArtUrl, durationMs, spotifyId } = req.body;
        const userId = req.user.userId;
        if (!youtubeId || !title || !artist) return res.status(400).json({ message: 'Недостаточно данных о треке.' });
        
        await Track.findOneAndUpdate(
            { user: userId, spotifyId: spotifyId, type: 'recent' },
            { user: userId, youtubeId, title, artist, albumArtUrl, durationMs, spotifyId, type: 'recent', playedAt: new Date() },
            { upsert: true, new: true }
        );
        res.status(200).json({ message: 'История обновлена.' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при обновлении истории.' });
    }
});

router.delete('/history/:youtubeId', authMiddleware, async (req, res) => {
    try {
        const { youtubeId } = req.params;
        const userId = req.user.userId;
        const result = await Track.deleteOne({ youtubeId: youtubeId, user: userId, type: 'recent' });
        if (result.deletedCount === 0) return res.status(404).json({ message: 'Трек не найден в вашей истории.' });
        res.status(200).json({ message: 'Трек удален из истории.' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при удалении трека из истории.' });
    }
});

router.post('/log-action', authMiddleware, async (req, res) => {
    try {
        const { track, action } = req.body;
        const userId = req.user.userId;
        if (!track || !action) return res.status(400).json({ message: 'Недостаточно данных.' });
        
        let points = 0;
        switch(action) {
            case 'listen': points = 1; break;
            case 'like': points = 5; break;
            case 'skip': points = -2; break;
            case 'seek_skip': points = -1; break;
        }

        const artists = (track.artist && typeof track.artist === 'string') ? track.artist.split(',').map(a => a.trim()) : [];
        const genres = analyzeTrackForGenres(track);

        if (artists.length === 0 && genres.length === 0) return res.status(200).send('No data to log.');
        
        const profile = await UserMusicProfile.findOneAndUpdate(
            { user: userId },
            { $setOnInsert: { user: userId } },
            { upsert: true, new: true }
        );

        artists.forEach(artistName => profile.updateArtistScore(artistName, points));
        genres.forEach(genreName => profile.updateGenreScore(genreName, points));
        
        await profile.save();
        res.status(200).send();
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

router.get('/wave', authMiddleware, async (req, res) => {
    try {
        let searchQueries = new Set();
        const profile = await UserMusicProfile.findOne({ user: req.user.userId }).lean();
        
        if (profile) {
            profile.topArtists?.slice(0, 10).forEach(a => searchQueries.add(a.name));
            profile.topGenres?.slice(0, 5).forEach(g => searchQueries.add(g.name + ' music'));
        }
        
        const history = await Track.find({ user: req.user.userId, type: 'recent' }).sort({ playedAt: -1 }).limit(10);
        if (history.length > 0) {
            history.forEach(track => searchQueries.add(track.artist));
        }
        
        if (searchQueries.size === 0) {
            const fallbackResponse = await searchSpotifyAndFindYouTube({ daily: 'true' });
            return res.json(fallbackResponse.tracks.sort(() => 0.5 - Math.random()));
        }

        const shuffledQueries = Array.from(searchQueries).sort(() => 0.5 - Math.random()).slice(0, 20);
        
        const searchPromises = shuffledQueries.map(query => 
            searchSpotifyAndFindYouTube({ q: query }).catch(e => ({ tracks: [] }))
        );

        const youtubeResults = await Promise.all(searchPromises);
        const finalTracks = youtubeResults.flatMap(res => res.tracks.slice(0, 3));
        const uniqueTracks = Array.from(new Map(finalTracks.map(item => [item.youtubeId, item])).values());

        if (uniqueTracks.length < 10) { 
            const fallbackResponse = await searchSpotifyAndFindYouTube({ daily: 'true' });
            fallbackResponse.tracks.forEach(track => {
                if (uniqueTracks.length < 50 && !uniqueTracks.some(t => t.youtubeId === track.youtubeId)) {
                    uniqueTracks.push(track);
                }
            });
        }
        
        res.json(uniqueTracks.sort(() => 0.5 - Math.random()).slice(0, 50));
    } catch (error) {
        res.status(500).json({ message: 'Не удалось сгенерировать вашу волну.' });
    }
});

router.get('/personalized-recommendations', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const profile = await UserMusicProfile.findOne({ user: userId }).lean();

        if (!profile || !profile.topArtists || profile.topArtists.length === 0) {
            const dailyTracks = await searchSpotifyAndFindYouTube({ daily: 'true' });
            return res.json(dailyTracks.tracks);
        }

        const token = await getSpotifyToken();
        const topArtistNames = profile.topArtists.slice(0, 2).map(a => a.name);
        
        let seed_artists = [];
        if (topArtistNames.length > 0) {
            const artistSearchPromises = topArtistNames.map(name =>
                axios.get('https://api.spotify.com/v1/search', {
                    params: { q: `artist:"${name}"`, type: 'artist', limit: 1 },
                    headers: { 'Authorization': `Bearer ${token}` }
                }).catch(() => null)
            );
            const artistSearchResults = await Promise.all(artistSearchPromises);
            seed_artists = artistSearchResults
                .filter(r => r && r.data.artists.items.length > 0)
                .map(r => r.data.artists.items[0].id);
        }

        const seed_genres = profile.topGenres.slice(0, 2).map(g => g.name.toLowerCase().replace(/\s+/g, '-')).filter(Boolean);
        
        if (seed_artists.length === 0 && seed_genres.length === 0) {
            const dailyTracks = await searchSpotifyAndFindYouTube({ daily: 'true' });
            return res.json(dailyTracks.tracks);
        }
        
        const recommendationsResponse = await axios.get('https://api.spotify.com/v1/recommendations', {
            params: { limit: 20, market: 'RU', seed_artists: seed_artists.join(','), seed_genres: seed_genres.join(',') },
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const spotifyTracks = recommendationsResponse.data.tracks;
        const finalTracks = await findAndCacheYouTubeVideos(spotifyTracks);
        
        res.json(finalTracks.sort(() => 0.5 - Math.random()).slice(0, 12));
    } catch (error) {
        console.error('Ошибка генерации персональных рекомендаций:', error.response?.data || error.message);
        try {
            const fallbackResponse = await searchSpotifyAndFindYouTube({ daily: 'true' });
            res.json(fallbackResponse.tracks);
        } catch (fallbackError) {
            res.status(500).json({ message: 'Не удалось сгенерировать рекомендации.' });
        }
    }
});

router.get('/search-all', authMiddleware, async (req, res) => {
    try {
        const { q, type = 'all', page = 1 } = req.query;
        const limit = 25;
        const offset = (parseInt(page) - 1) * limit;

        if (!q) {
            return res.json({ tracks: [], playlists: [], hasMore: false });
        }

        let tracks = [];
        let playlists = [];
        let hasMoreTracks = false;

        if ((type === 'all' || type === 'playlists') && page == 1) {
            playlists = await Playlist.find({
                visibility: 'public',
                $text: { $search: q }
            }).populate('user', 'username').limit(10).lean();
        }

        if (type === 'all' || type === 'tracks') {
            const searchResult = await searchSpotifyAndFindYouTube({ q, offset });
            tracks = searchResult.tracks;
            hasMoreTracks = searchResult.hasMore;
        }

        res.json({ tracks, playlists, hasMore: hasMoreTracks });

    } catch (error) {
        res.status(500).json({ message: "Ошибка сервера при поиске." });
    }
});

// --- НОВЫЕ РОУТЫ ДЛЯ АДМИН-ПАНЕЛИ ---

// Получить всех одобренных артистов для выпадающего списка
router.get('/artists/all', authMiddleware, async (req, res) => {
    try {
        const artists = await Artist.find({ status: 'approved' }).select('name').sort({ name: 1 });
        res.json(artists);
    } catch (error) {
        res.status(500).json({ message: "Ошибка загрузки артистов" });
    }
});

// Получить все одобренные альбомы для выпадающего списка
router.get('/albums/all', authMiddleware, async (req, res) => {
    try {
        const albums = await Album.find({ status: 'approved' }).select('title artist').sort({ title: 1 });
        res.json(albums);
    } catch (error) {
        res.status(500).json({ message: "Ошибка загрузки альбомов" });
    }
});

module.exports = router;