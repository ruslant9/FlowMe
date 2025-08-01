// backend/routes/music.js

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const Track = require('../models/Track');
const User = require('../models/User');
const Playlist = require('../models/Playlist');
const UserMusicProfile = require('../models/UserMusicProfile');
const axios = require('axios');
const { isAllowedByPrivacy } = require('../utils/privacy');
const { searchSpotifyTracks, mapSpotifyTrack } = require('./spotify'); // Переименованный spotify.js

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

// Helper для поиска видео на YouTube по данным трека из Spotify
const findYouTubeVideoForTrack = async (track) => {
    try {
        // Проверяем, есть ли у нас уже youtubeId в кеше
        const cachedTrack = await Track.findOne({ spotifyId: track.spotifyId, type: 'search_cache' }).select('youtubeId');
        if (cachedTrack && cachedTrack.youtubeId) {
            return { ...track, youtubeId: cachedTrack.youtubeId };
        }

        const query = `${track.artist} - ${track.title} audio`;
        const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
            params: {
                part: 'snippet',
                q: query,
                type: 'video',
                maxResults: 1,
                key: YOUTUBE_API_KEY,
                videoEmbeddable: 'true',
            },
        });

        if (response.data.items && response.data.items.length > 0) {
            const youtubeId = response.data.items[0].id.videoId;
            return { ...track, youtubeId };
        }
        return { ...track, youtubeId: null }; // Если не нашли, возвращаем null
    } catch (error) {
        console.error(`Ошибка поиска на YouTube для трека ${track.title}:`, error.message);
        return { ...track, youtubeId: null };
    }
};

// Сохранить/удалить трек
router.post('/toggle-save', authMiddleware, async (req, res) => {
    try {
        const trackData = req.body;
        const userId = req.user.userId;

        if (!trackData.spotifyId || !trackData.title || !trackData.artist) {
            return res.status(400).json({ message: 'Необходимые поля для трека отсутствуют.' });
        }
        
        let track = await Track.findOne({ user: userId, spotifyId: trackData.spotifyId, type: 'saved' });

        if (track) {
            await Track.deleteOne({ _id: track._id });
            res.status(200).json({ message: 'Трек удален из Моей музыки.', saved: false });
        } else {
            // Если трека нет, убедимся, что у него есть youtubeId
            if (!trackData.youtubeId) {
                const updatedTrackData = await findYouTubeVideoForTrack(trackData);
                if (!updatedTrackData.youtubeId) {
                    return res.status(404).json({ message: 'Не удалось найти воспроизводимую версию трека.' });
                }
                trackData.youtubeId = updatedTrackData.youtubeId;
            }

            track = new Track({
                ...trackData,
                user: userId,
                type: 'saved',
                savedAt: new Date(),
            });
            await track.save();
            res.status(201).json({ message: 'Трек добавлен в Мою музыку.', saved: true });
        }
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера при обновлении трека.' });
    }
});

// Получить "Мою музыку"
router.get('/saved', authMiddleware, async (req, res) => {
    try {
        const savedTracks = await Track.find({ user: req.user.userId, type: 'saved' }).sort({ savedAt: -1 });
        res.status(200).json(savedTracks);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера при получении треков.' });
    }
});

// Получить музыку другого пользователя с пагинацией
router.get('/user/:userId/saved', authMiddleware, async (req, res) => {
    try {
        const { userId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const skip = (page - 1) * limit;

        const targetUser = await User.findById(userId).select('privacySettings friends blacklist');
        if (!targetUser) return res.status(404).json({ message: 'Пользователь не найден.' });
        if (targetUser.blacklist.includes(req.user.userId)) return res.status(403).json({ message: 'Доступ запрещен.' });
        if (!isAllowedByPrivacy(targetUser.privacySettings.viewMusic, req.user.userId, targetUser)) {
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

// История прослушиваний
router.get('/history', authMiddleware, async (req, res) => {
    try {
        const history = await Track.find({ user: req.user.userId, type: 'recent' }).sort({ playedAt: -1 }).limit(50);
        res.json(history);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при получении истории.' });
    }
});

router.post('/history', authMiddleware, async (req, res) => {
    try {
        const trackData = req.body;
        if (!trackData.spotifyId || !trackData.youtubeId) return res.status(400).json({ message: 'Недостаточно данных о треке.' });
        await Track.findOneAndUpdate(
            { user: req.user.userId, spotifyId: trackData.spotifyId, type: 'recent' },
            { ...trackData, user: req.user.userId, type: 'recent', playedAt: new Date() },
            { upsert: true, new: true }
        );
        res.status(200).json({ message: 'История обновлена.' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при обновлении истории.' });
    }
});

router.delete('/history/:spotifyId', authMiddleware, async (req, res) => {
    try {
        const { spotifyId } = req.params;
        await Track.deleteOne({ spotifyId: spotifyId, user: req.user.userId, type: 'recent' });
        res.status(200).json({ message: 'Трек удален из истории.' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при удалении трека из истории.' });
    }
});


// Поиск
router.get('/search-all', authMiddleware, async (req, res) => {
    try {
        const { q, type = 'all' } = req.query;
        if (!q) return res.json({ tracks: [], playlists: [] });

        let tracks = [];
        let playlists = [];

        if (type === 'all' || type === 'tracks') {
            const spotifyTracks = await searchSpotifyTracks(q);
            const tracksWithYoutube = await Promise.all(spotifyTracks.map(findYouTubeVideoForTrack));
            tracks = tracksWithYoutube.filter(t => t.youtubeId); // Отсеиваем треки без видео
        }

        if (type === 'all' || type === 'playlists') {
            playlists = await Playlist.find({
                visibility: 'public',
                $text: { $search: q }
            }).populate('user', 'username').limit(10).lean();
        }

        res.json({ tracks, playlists });

    } catch (error) {
        res.status(500).json({ message: "Ошибка сервера при поиске." });
    }
});

// Моя волна
router.get('/wave', authMiddleware, async (req, res) => {
    const token = await require('./spotify').getSpotifyToken();
    try {
        const profile = await UserMusicProfile.findOne({ user: req.user.userId }).lean();
        
        const recommendationParams = {
            limit: 50,
            market: 'RU',
        };

        if (profile && (profile.topArtists?.length > 0 || profile.topGenres?.length > 0)) {
            recommendationParams.seed_artists = profile.topArtists.slice(0, 2).map(a => a.artistId).join(',');
            recommendationParams.seed_genres = profile.topGenres.slice(0, 3).map(g => g.name.toLowerCase().replace(' ', '-')).join(',');
        } else {
            recommendationParams.seed_genres = 'pop,rock,hip-hop,dance,electronic';
        }

        const response = await axios.get('https://api.spotify.com/v1/recommendations', {
            headers: { 'Authorization': `Bearer ${token}` },
            params: recommendationParams,
        });

        const spotifyTracks = response.data.tracks.map(mapSpotifyTrack).filter(Boolean);
        const tracksWithYoutube = await Promise.all(spotifyTracks.map(findYouTubeVideoForTrack));
        
        res.json(tracksWithYoutube.filter(t => t.youtubeId));

    } catch (error) {
        console.error('Ошибка генерации волны:', error.response ? error.response.data : error.message);
        res.status(500).json({ message: 'Не удалось сгенерировать вашу волну.' });
    }
});

// Персональные рекомендации (Главная страница)
router.get('/personalized-recommendations', authMiddleware, async (req, res) => {
    const token = await require('./spotify').getSpotifyToken();
    try {
        const profile = await UserMusicProfile.findOne({ user: req.user.userId }).lean();
        let finalTracks = [];

        if (profile && profile.topArtists?.length > 0) {
            const topArtistId = profile.topArtists[0].artistId;
            const response = await axios.get(`https://api.spotify.com/v1/artists/${topArtistId}/related-artists`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const relatedArtists = response.data.artists.slice(0, 5);
            
            const artistTracksPromises = relatedArtists.map(artist => 
                axios.get(`https://api.spotify.com/v1/artists/${artist.id}/top-tracks`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                    params: { market: 'RU' }
                })
            );
            const artistTracksResponses = await Promise.all(artistTracksPromises);
            finalTracks = artistTracksResponses.flatMap(r => r.data.tracks.slice(0, 3).map(mapSpotifyTrack));
        } else {
            // Если нет данных, берем новые релизы
            const response = await axios.get('https://api.spotify.com/v1/browse/new-releases', {
                headers: { 'Authorization': `Bearer ${token}` },
                params: { country: 'RU', limit: 20 }
            });
            finalTracks = response.data.albums.items.flatMap(album => album.artists.map(artist => ({
                id: album.id + artist.id, // Fake unique ID
                name: album.name,
                artists: [{ name: artist.name }],
                album: { name: album.name, images: album.images },
                duration_ms: 0
            }))).map(mapSpotifyTrack);
        }
        
        const uniqueTracks = Array.from(new Map(finalTracks.map(t => [t.spotifyId, t])).values());
        const tracksWithYoutube = await Promise.all(uniqueTracks.map(findYouTubeVideoForTrack));

        res.json(tracksWithYoutube.filter(t => t.youtubeId).slice(0, 12));

    } catch (error) {
        console.error('Ошибка персональных рекомендаций:', error.response ? error.response.data : error.message);
        res.status(500).json({ message: 'Ошибка.' });
    }
});

module.exports = router;