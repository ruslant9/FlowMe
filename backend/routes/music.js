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
const { searchYouTubeTracks } = require('./youtube');

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
    'Electronic': ['electronic', 'edm', 'techno', 'house', 'dnb', 'drum and bass', 'phonk'],
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

// Роуты /toggle-save, /saved, /user/:userId/saved, /popular-artists, /history, /log-action
// остаются без изменений. Я их скрыл для краткости, чтобы показать только измененную часть.
// ... (весь код до роута /wave) ...
router.post('/toggle-save', authMiddleware, async (req, res) => {
    try {
        const { youtubeId, title, artist, album, albumArtUrl, previewUrl, durationMs } = req.body;
        const userId = req.user.userId;
        if (!youtubeId || !title || !artist) {
            return res.status(400).json({ message: 'Необходимые поля для трека отсутствуют.' });
        }
        let track = await Track.findOne({ user: userId, youtubeId, type: 'saved' });
        if (track) {
            await Track.deleteOne({ _id: track._id });
            res.status(200).json({ message: 'Трек удален из Моей музыки.', saved: false });
        } else {
            track = new Track({
                user: userId, youtubeId, title, artist, album, albumArtUrl, previewUrl, durationMs,
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

// --- ИЗМЕНЕНИЕ: Добавляем пагинацию в этот роут ---
router.get('/user/:userId/saved', authMiddleware, async (req, res) => {
    try {
        const { userId } = req.params;
        const requesterId = req.user.userId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20; // Устанавливаем лимит по умолчанию
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
        const savedTracks = await Track.find(query)
            .sort({ savedAt: -1 })
            .skip(skip)
            .limit(limit);

        res.status(200).json({
            tracks: savedTracks,
            hasMore: (skip + savedTracks.length) < totalTracks,
            totalCount: totalTracks
        });

    } catch (error) {
        console.error('Ошибка при получении сохраненных треков пользователя:', error);
        res.status(500).json({ message: 'Ошибка сервера при получении треков.' });
    }
});
// --- КОНЕЦ ИЗМЕНЕНИЯ ---

const countryMap = { RU: 'Russia', UA: 'Ukraine', BY: 'Belarus', KZ: 'Kazakhstan', US: 'United States', DE: 'Germany' };
router.get('/popular-artists', authMiddleware, async (req, res) => {
    if (!process.env.LASTFM_API_KEY) {
        return res.status(500).json({ message: 'Сервис рекомендаций не настроен на сервере.' });
    }
    try {
        let artistsToFetch = [];
        const desiredArtistCount = 6;
        const profile = await UserMusicProfile.findOne({ user: req.user.userId }).lean();
        if (profile && profile.topArtists && profile.topArtists.length > 0) {
            const userTopArtists = profile.topArtists.map(a => a.name);
            artistsToFetch = userTopArtists.slice(0, desiredArtistCount);
            if (artistsToFetch.length < desiredArtistCount) {
                const seedArtist = artistsToFetch[0];
                try {
                    const similarArtistsResponse = await axios.get('http://ws.audioscrobbler.com/2.0/', {
                        params: { method: 'artist.getSimilar', artist: seedArtist, api_key: process.env.LASTFM_API_KEY, format: 'json', limit: 15 }
                    });
                    if (similarArtistsResponse.data.similarartists) {
                        const similarArtists = similarArtistsResponse.data.similarartists.artist.map(a => a.name);
                        const uniqueSimilar = similarArtists.filter(name => !artistsToFetch.includes(name));
                        artistsToFetch.push(...uniqueSimilar);
                    }
                } catch (similarError) {}
            }
        }
        if (artistsToFetch.length === 0) {
            const session = await Session.findById(req.user.sessionId).select('countryCode');
            const countryCode = session?.countryCode?.toUpperCase();
            const countryName = countryMap[countryCode] || 'Russia';
            const topArtistsResponse = await axios.get('http://ws.audioscrobbler.com/2.0/', {
                params: { method: 'chart.gettopartists', country: countryName, api_key: process.env.LASTFM_API_KEY, format: 'json', limit: 10 }
            });
            artistsToFetch = topArtistsResponse.data.artists.artist.map(a => a.name);
        }
        const uniqueArtists = [...new Set(artistsToFetch)].slice(0, 15);
        const artistInfoPromises = uniqueArtists.map(artistName => 
            axios.get('http://ws.audioscrobbler.com/2.0/', {
                params: { method: 'artist.getinfo', artist: artistName, api_key: process.env.LASTFM_API_KEY, format: 'json', autocorrect: 1 }
            })
        );
        const artistInfoResponses = await Promise.allSettled(artistInfoPromises);
        const result = artistInfoResponses
            .filter(response => response.status === 'fulfilled' && response.value.data && !response.value.data.error)
            .map(response => {
                const artistData = response.value.data.artist;
                const image = artistData.image.find(img => img.size === 'extralarge') || artistData.image[artistData.image.length - 1];
                if (!image || !image['#text']) return null;
                return { name: artistData.name, imageUrl: image['#text'] };
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
        const { youtubeId, title, artist, albumArtUrl, durationMs } = req.body;
        const userId = req.user.userId;
        if (!youtubeId || !title || !artist) return res.status(400).json({ message: 'Недостаточно данных о треке.' });
        await Track.findOneAndUpdate(
            { user: userId, youtubeId: youtubeId, type: 'recent' },
            { user: userId, youtubeId, title, artist, albumArtUrl, durationMs, type: 'recent', playedAt: new Date() },
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

        if (!track || !action) {
            return res.status(400).json({ message: 'Недостаточно данных.' });
        }
        
        let points = 0;
        switch(action) {
            case 'listen': points = 1; break;
            case 'like': points = 5; break;
            case 'skip': points = -2; break;
            case 'seek_skip': points = -1; break;
        }

        const artists = (track.artist && typeof track.artist === 'string') ? track.artist.split(',').map(a => a.trim()) : [];
        const genres = analyzeTrackForGenres(track);

        if (artists.length === 0 && genres.length === 0) {
            return res.status(200).send('No data to log.');
        }

        // --- ИЗМЕНЕНИЕ: Использование атомарных операций для избежания VersionError ---
        const bulkOps = [];

        artists.forEach(artistName => {
            // Операция для инкремента очков существующего артиста
            bulkOps.push({
                updateOne: {
                    filter: { user: userId, 'topArtists.name': artistName },
                    update: { $inc: { 'topArtists.$.score': points } }
                }
            });
            // Операция для добавления нового артиста, если он не найден
            bulkOps.push({
                updateOne: {
                    filter: { user: userId, 'topArtists.name': { $ne: artistName } },
                    update: { $addToSet: { topArtists: { name: artistName, score: points } } }
                }
            });
        });

        genres.forEach(genreName => {
            bulkOps.push({
                updateOne: {
                    filter: { user: userId, 'topGenres.name': genreName },
                    update: { $inc: { 'topGenres.$.score': points } }
                }
            });
            bulkOps.push({
                updateOne: {
                    filter: { user: userId, 'topGenres.name': { $ne: genreName } },
                    update: { $addToSet: { topGenres: { name: genreName, score: points } } }
                }
            });
        });

        // Выполняем все операции одним атомарным запросом
        if (bulkOps.length > 0) {
            await UserMusicProfile.bulkWrite(bulkOps);
        }

        // Сортировка и обрезка массивов после обновления
        const profile = await UserMusicProfile.findOne({ user: userId });
        if (profile) {
            profile.topArtists.sort((a, b) => b.score - a.score);
            profile.topGenres.sort((a, b) => b.score - a.score);
            profile.topArtists = profile.topArtists.slice(0, 50);
            profile.topGenres = profile.topGenres.slice(0, 20);
            await profile.save();
        } else {
             // Если профиля не было, создаем его
            const newProfile = new UserMusicProfile({ user: userId });
            artists.forEach(name => newProfile.topArtists.push({ name, score: points }));
            genres.forEach(name => newProfile.topGenres.push({ name, score: points }));
            await newProfile.save();
        }
        
        res.status(200).send();
    } catch (error) {
        console.error('Ошибка логирования действия:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

router.get('/wave', authMiddleware, async (req, res) => {
    try {
        // ... (логика сбора searchQueries без изменений)
        let searchQueries = new Set();
        // ...
        
        if (searchQueries.size === 0) {
            const fallbackResponse = await searchYouTubeTracks({ daily: 'true' });
            return res.json(fallbackResponse.tracks.sort(() => 0.5 - Math.random()));
        }

        const shuffledQueries = Array.from(searchQueries).sort(() => 0.5 - Math.random()).slice(0, 20);
        
        // --- ИЗМЕНЕНИЕ: Добавляем try-catch для каждого вызова ---
        const searchPromises = shuffledQueries.map(query => 
            searchYouTubeTracks({ q: query, daily: false }).catch(e => {
                console.error(`Ошибка при поиске для "Волны" (запрос: ${query}):`, e.message);
                return { tracks: [] }; // Возвращаем пустой массив в случае ошибки
            })
        );
        // --- КОНЕЦ ИЗМЕНЕНИЯ ---

        const youtubeResults = await Promise.all(searchPromises);
        
        const finalTracks = youtubeResults.flatMap(res => res.tracks.slice(0, 2));
            
        const uniqueTracks = Array.from(new Map(finalTracks.map(item => [item.youtubeId, item])).values());

        if (uniqueTracks.length < 10) { 
            const fallbackResponse = await searchYouTubeTracks({ daily: 'true' });
            fallbackResponse.tracks.forEach(track => {
                if (!uniqueTracks.some(t => t.youtubeId === track.youtubeId)) {
                    uniqueTracks.push(track);
                }
            });
        }
        
        res.json(uniqueTracks.sort(() => 0.5 - Math.random()).slice(0, 50));

    } catch (error) {
        console.error('Ошибка генерации волны:', error.message);
        res.status(500).json({ message: 'Не удалось сгенерировать вашу волну.' });
    }
});

router.get('/personalized-recommendations', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const profile = await UserMusicProfile.findOne({ user: userId }).lean();

        if (!profile || !profile.topArtists || profile.topArtists.length === 0) {
            const dailyTracks = await searchYouTubeTracks({ daily: 'true' });
            return res.json(dailyTracks.tracks);
        }

        let searchQueries = new Set();
        const topArtists = profile.topArtists.slice(0, 5).map(a => a.name);
        const topGenres = profile.topGenres.slice(0, 4).map(g => g.name);

        topArtists.forEach(artist => searchQueries.add(`${artist} official`));
        topGenres.forEach(genre => searchQueries.add(`${genre} music new`));
        if (topArtists.length > 0) searchQueries.add(`${topArtists[0]} similar artists`);

        // --- ИЗМЕНЕНИЕ: Добавляем try-catch для каждого вызова ---
        const searchPromises = Array.from(searchQueries).map(q => 
            searchYouTubeTracks({ q }).catch(e => {
                console.error(`Ошибка при поиске для рекомендаций (запрос: ${q}):`, e.message);
                return { tracks: [] }; // Возвращаем пустой массив в случае ошибки
            })
        );
        // --- КОНЕЦ ИЗМЕНЕНИЯ ---

        const results = await Promise.all(searchPromises);

        let finalTracks = [];
        results.forEach(result => {
            if (result.tracks.length > 0) {
                finalTracks.push(...result.tracks.slice(0, 4));
            }
        });
        
        let uniqueTracks = Array.from(new Map(finalTracks.map(t => [t.youtubeId, t])).values());
        
        if(uniqueTracks.length < 6) {
            const daily = await searchYouTubeTracks({ daily: 'true' });
            daily.tracks.forEach(track => {
                if (!uniqueTracks.some(t => t.youtubeId === track.youtubeId)) {
                    uniqueTracks.push(track);
                }
            });
        }

        const shuffledTracks = uniqueTracks.sort(() => 0.5 - Math.random());
        res.json(shuffledTracks.slice(0, 12));
    } catch (error) {
        console.error('Ошибка генерации персональных рекомендаций:', error.message);
        const fallbackResponse = await searchYouTubeTracks({ daily: 'true' });
        res.json(fallbackResponse.tracks);
    }
});

// --- НОВЫЙ РОУТ ДЛЯ ПОИСКА ---
router.get('/search-all', authMiddleware, async (req, res) => {
    try {
        const { q, type = 'all' } = req.query;
        if (!q) {
            return res.json({ tracks: [], playlists: [] });
        }

        const token = req.cookies.token; // Используем cookie для внутреннего вызова
        let tracks = [];
        let playlists = [];

        if (type === 'all' || type === 'tracks') {
            const searchResult = await searchYouTubeTracks({ q }, token);
            tracks = searchResult.tracks;
        }

        if (type === 'all' || type === 'playlists') {
            playlists = await Playlist.find({
                visibility: 'public', // Искать только публичные плейлисты
                $text: { $search: q }
            })
            .populate('user', 'username')
            .limit(10)
            .lean();
        }

        res.json({ tracks, playlists });

    } catch (error) {
        console.error("Ошибка в универсальном поиске музыки:", error);
        res.status(500).json({ message: "Ошибка сервера при поиске." });
    }
});

module.exports = router;