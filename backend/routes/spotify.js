// backend/routes/youtube.js

const express = require('express');
const router = express.Router();
const axios = require('axios');
const authMiddleware = require('../middleware/auth.middleware');
const Track = require('../models/Track');

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_BASE_URL = 'https://www.googleapis.com/youtube/v3';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.88 Safari/537.36',
};

const parseDuration = (durationIso) => {
    let durationMs = 0;
    const matches = durationIso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (matches) {
        const hours = parseInt(matches[1] || 0, 10);
        const minutes = parseInt(matches[2] || 0, 10);
        const seconds = parseInt(matches[3] || 0, 10);
        durationMs = (hours * 3600 + minutes * 60 + seconds) * 1000;
    }
    return durationMs;
};

const mapYouTubeVideoToTrack = (item, durationMap) => {
    return {
        youtubeId: item.id.videoId,
        title: item.snippet.title,
        artist: item.snippet.channelTitle,
        albumArtUrl: item.snippet.thumbnails.high.url,
        durationMs: durationMap.get(item.id.videoId) || null,
        previewUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
    };
};

async function searchYouTubeTracks(queryParams) {
    const { q, pageToken, daily } = queryParams;
    const isDaily = daily === 'true';

    let searchQuery = q;
    if (isDaily) {
        searchQuery = ['Русские хиты 2024', 'Новинки русской музыки', 'Топ чарт Россия', 'Популярная музыка'][Math.floor(Math.random() * 4)];
    }

    if (!searchQuery) {
        throw new Error('Параметр "q" обязателен для поиска.');
    }

    let finalQuery = searchQuery;
    const searchParams = {
        part: 'snippet', type: 'video', maxResults: 20, key: YOUTUBE_API_KEY,
        videoEmbeddable: 'true', regionCode: 'RU',
    };
    
    if (isDaily) {
        const negativeKeywords = "-remix -speed up -slowed -nightcore -instrumental -karaoke -cover -mix -lyrics -live";
        finalQuery = `${searchQuery} official audio ${negativeKeywords}`;
        searchParams.maxResults = 50;
    }

    searchParams.q = finalQuery;
    if (pageToken) searchParams.pageToken = pageToken;

    try {
        const searchResponse = await axios.get(`${YOUTUBE_BASE_URL}/search`, { params: searchParams, headers: HEADERS });
        const videoItems = searchResponse.data.items.filter(item => item.id.kind === 'youtube#video');
        
        const responseData = { tracks: [], nextPageToken: searchResponse.data.nextPageToken || null };

        if (videoItems.length > 0) {
            const videoIds = videoItems.map(item => item.id.videoId).join(',');
            const detailsResponse = await axios.get(`${YOUTUBE_BASE_URL}/videos`, {
                params: { part: 'contentDetails', id: videoIds, key: YOUTUBE_API_KEY },
                headers: HEADERS,
            });

            const durationMap = new Map();
            detailsResponse.data.items.forEach(item => {
                durationMap.set(item.id, parseDuration(item.contentDetails.duration));
            });
            
            const MAX_DURATION_MS = 10 * 60 * 1000;
            const MIN_DURATION_MS = 60 * 1000;
            
            let mappedTracks = videoItems
                .map(item => mapYouTubeVideoToTrack(item, durationMap))
                .filter(track => track.durationMs && track.durationMs >= MIN_DURATION_MS);

            if (isDaily) {
                mappedTracks = mappedTracks.filter(track => track.durationMs < MAX_DURATION_MS);
            }
                
            responseData.tracks = isDaily ? mappedTracks.slice(0, 12) : mappedTracks;
        }
        
        return responseData;

    } catch (error) {
        // --- ИЗМЕНЕНИЕ: Улучшенная обработка ошибок ---
        if (error.response && error.response.status === 403) {
            console.error('[YouTube API Error] Доступ запрещен (403). Вероятнее всего, закончилась дневная квота.');
            console.error('[YouTube API Error] Details:', JSON.stringify(error.response.data.error, null, 2));
        } else {
            console.error("Неизвестная ошибка при запросе к YouTube API:", error.message);
        }
        // Возвращаем пустой результат, чтобы приложение не падало
        return { tracks: [], nextPageToken: null }; 
        // --- КОНЕЦ ИЗМЕНЕНИЯ ---
    }
}


router.get('/search', authMiddleware, async (req, res) => {
    try {
        if (!YOUTUBE_API_KEY) {
            console.error('YOUTUBE_API_KEY не установлен в переменных окружения.');
            return res.status(500).json({ message: 'Музыкальный сервис не настроен.' });
        }
        if (!req.query.q && !req.query.daily) {
            return res.status(400).json({ message: 'Параметр "q" или "daily" обязателен для поиска.' });
        }
        
        if (!req.query.pageToken && !req.query.daily && req.query.q) {
             const cachedTracks = await Track.find({ type: 'search_cache', $text: { $search: req.query.q } }).limit(20).lean();
             if (cachedTracks.length > 0) {
                 return res.json({ tracks: cachedTracks, nextPageToken: null });
             }
        }
        
        const responseData = await searchYouTubeTracks(req.query);
        
        if (responseData.tracks.length > 0 && !req.query.daily) {
             const tracksToCache = responseData.tracks.map(track => ({ ...track, type: 'search_cache' }));
             Track.insertMany(tracksToCache, { ordered: false }).catch(err => {
                 if (err.code !== 11000) console.error("Ошибка кеширования:", err.message);
             });
        }
        
        res.json(responseData);
    } catch (error) {
        // Этот catch теперь будет ловить только внутренние ошибки, а не ошибки API
        console.error("Критическая ошибка в роуте /search:", error);
        res.status(500).json({ message: 'Ошибка поиска YouTube треков.' });
    }
});


router.get('/videos', authMiddleware, async (req, res) => {
    const { ids } = req.query;
    if (!ids) return res.status(400).json({ message: 'Параметр "ids" обязателен.' });
    if (!YOUTUBE_API_KEY) return res.status(500).json({ message: 'Музыкальный сервис не настроен.' });

    try {
        const response = await axios.get(`${YOUTUBE_BASE_URL}/videos`, {
            params: { part: 'snippet,contentDetails', id: ids, key: YOUTUBE_API_KEY },
            headers: HEADERS,
        });

        const detailedVideos = response.data.items.map(item => ({
            youtubeId: item.id,
            title: item.snippet.title,
            artist: item.snippet.channelTitle,
            albumArtUrl: item.snippet.thumbnails.high.url,
            durationMs: parseDuration(item.contentDetails.duration),
            previewUrl: `https://www.youtube.com/watch?v=${item.id}`,
        }));

        res.json(detailedVideos);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка получения деталей YouTube видео.' });
    }
});

// --- ИЗМЕНЕНИЕ 3: Экспортируем не только роутер, но и нашу новую функцию ---
module.exports = { router, searchYouTubeTracks };