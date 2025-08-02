// backend/utils/spotify.js

const axios = require('axios');
const Track = require('../models/Track');
const ytsr = require('youtube-sr').default;

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

let spotifyToken = {
    value: null,
    expiresAt: 0,
};

async function getSpotifyToken() {
    if (spotifyToken.value && Date.now() < spotifyToken.expiresAt) {
        return spotifyToken.value;
    }
    try {
        const response = await axios.post('https://accounts.spotify.com/api/token',
            'grant_type=client_credentials', {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': 'Basic ' + Buffer.from(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET).toString('base64'),
                },
            }
        );
        const tokenData = response.data;
        spotifyToken = {
            value: tokenData.access_token,
            expiresAt: Date.now() + (tokenData.expires_in - 300) * 1000,
        };
        return spotifyToken.value;
    } catch (error) {
        console.error("Ошибка получения токена Spotify:", error.response?.data || error.message);
        throw new Error("Не удалось получить доступ к сервису Spotify.");
    }
}

async function findYouTubeVideoForTrack(trackName, artistName) {
    const query = `${trackName} ${artistName} official audio`;
    try {
        const searchResults = await ytsr.search(query, { limit: 1, type: 'video' });
        if (searchResults && searchResults.length > 0) {
            const video = searchResults[0];
            return {
                id: { videoId: video.id },
                snippet: {
                    title: video.title,
                    channelTitle: video.channel.name,
                    thumbnails: { high: { url: video.thumbnail.url } }
                }
            };
        }
        return null;
    } catch (error) {
        console.error(`Ошибка поиска на YouTube (без API) для "${query}":`, error.message);
        return null;
    }
}


async function searchSpotifyAndFindYouTube({ q, daily = false }) {
    if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
        throw new Error('Сервис музыки не настроен на сервере.');
    }
    
    const token = await getSpotifyToken();
    let spotifyResponse;

    // Шаг 1: Получаем треки из Spotify
    try {
        if (daily) {
            // --- ИСПРАВЛЕНИЕ ЗДЕСЬ ---
            const playlistsResponse = await axios.get('https://api.spotify.com/v1/browse/featured-playlists', {
                params: { limit: 20 }, // Берем больше плейлистов для разнообразия
                headers: { 'Authorization': `Bearer ${token}` }
            });
            // --- КОНЕЦ ИСПРАВЛЕНИЯ ---
            const playlistId = playlistsResponse.data.playlists.items[Math.floor(Math.random() * playlistsResponse.data.playlists.items.length)].id;
            const tracksResponse = await axios.get(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
                params: { limit: 50 },
                headers: { 'Authorization': `Bearer ${token}` }
            });
            spotifyTracks = tracksResponse.data.items.map(item => item.track).filter(Boolean);
        } else {
            const searchResponse = await axios.get('https://api.spotify.com/v1/search', {
                // ИЗМЕНЕНИЕ: Используем 'offset' и увеличиваем 'limit'
                params: { q, type: 'track', market: 'RU', limit: 25, offset },
                headers: { 'Authorization': `Bearer ${token}` },
            });
            spotifyResponse = searchResponse.data.tracks;
        }
    } catch (error) {
        console.error("Ошибка при запросе к Spotify API:", error.response?.data || error.message);
        throw new Error("Ошибка при поиске треков в Spotify.");
    }

    
    if (!spotifyResponse || spotifyResponse.items.length === 0) {
        // ИЗМЕНЕНИЕ: Возвращаем информацию о том, что больше треков нет
        return { tracks: [], hasMore: false };
    }

    const spotifyTracks = spotifyResponse.items;
    
    if (spotifyTracks.length === 0) {
        return { tracks: [], nextPageToken: null };
    }

    const spotifyIds = spotifyTracks.map(track => track.id).filter(Boolean);

    // Шаг 2: Проверяем наш кэш в базе данных
    const cachedTracks = await Track.find({ spotifyId: { $in: spotifyIds }, type: 'search_cache' });
    const cachedTracksMap = new Map(cachedTracks.map(track => [track.spotifyId, track]));

    // Шаг 3: Определяем, для каких треков нужно искать видео
    const tracksToSearchOnYouTube = spotifyTracks.filter(track => !cachedTracksMap.has(track.id));

    // Шаг 4: Ищем на YouTube только недостающие треки
    const youtubePromises = tracksToSearchOnYouTube.map(async (track) => {
        if (!track || !track.name || !track.artists.length > 0) return null;
        const artistName = track.artists.map(a => a.name).join(', ');
        const youtubeVideo = await findYouTubeVideoForTrack(track.name, artistName);
        if (!youtubeVideo) return null;

        return {
            spotifyId: track.id,
            youtubeId: youtubeVideo.id.videoId,
            title: youtubeVideo.snippet.title,
            artist: youtubeVideo.snippet.channelTitle,
            album: track.album.name,
            albumArtUrl: track.album.images[0]?.url || youtubeVideo.snippet.thumbnails.high.url,
            durationMs: track.duration_ms,
            previewUrl: track.preview_url,
        };
    });

    const newlyFoundTracks = (await Promise.all(youtubePromises)).filter(Boolean);

    // Шаг 5: Кэшируем новые найденные треки
    if (newlyFoundTracks.length > 0) {
        const tracksToCache = newlyFoundTracks.map(track => ({ ...track, type: 'search_cache' }));
        Track.insertMany(tracksToCache, { ordered: false }).catch(err => {
            if (err.code !== 11000) console.error("Ошибка кеширования:", err.message);
        });
    }

    // Шаг 6: Собираем финальный результат
    const finalTracks = spotifyTracks.map(track => {
        if (cachedTracksMap.has(track.id)) {
            return cachedTracksMap.get(track.id);
        }
        return newlyFoundTracks.find(t => t.spotifyId === track.id);
    }).filter(Boolean);

    const hasMore = (spotifyResponse.offset + spotifyResponse.items.length) < spotifyResponse.total;

    return { tracks: finalTracks, hasMore }; // Возвращаем треки и флаг hasMore
}

async function findAndCacheYouTubeVideos(spotifyTracks) {
    if (!spotifyTracks || spotifyTracks.length === 0) {
        return [];
    }
    
    const spotifyIds = spotifyTracks.map(track => track.id).filter(Boolean);
    const cachedTracks = await Track.find({ spotifyId: { $in: spotifyIds }, type: 'search_cache' });
    const cachedTracksMap = new Map(cachedTracks.map(track => [track.spotifyId, track]));

    const tracksToSearchOnYouTube = spotifyTracks.filter(track => track && !cachedTracksMap.has(track.id));

    // --- КЛЮЧЕВОЕ УЛУЧШЕНИЕ: ЗАПУСКАЕМ ПОИСК ПАРАЛЛЕЛЬНО ---
    const youtubePromises = tracksToSearchOnYouTube.map(async (track) => {
        if (!track || !track.name || !track.artists || track.artists.length === 0) return null;
        const artistName = track.artists.map(a => a.name).join(', ');
        const youtubeVideo = await findYouTubeVideoForTrack(track.name, artistName);
        if (!youtubeVideo) return null;

        return {
            spotifyId: track.id,
            youtubeId: youtubeVideo.id.videoId,
            // ... (остальные поля трека)
        };
    });

    const newlyFoundTracks = (await Promise.all(youtubePromises)).filter(Boolean);

    if (newlyFoundTracks.length > 0) {
        const tracksToCache = newlyFoundTracks.map(track => ({ ...track, type: 'search_cache' }));
        Track.insertMany(tracksToCache, { ordered: false }).catch(err => {
            if (err.code !== 11000) console.error("Ошибка кеширования:", err.message);
        });
    }

    const finalTracks = spotifyTracks.map(track => {
        if (!track) return null;
        if (cachedTracksMap.has(track.id)) {
            return cachedTracksMap.get(track.id);
        }
        return newlyFoundTracks.find(t => t.spotifyId === track.id);
    }).filter(Boolean);

    return finalTracks;
}

module.exports = { searchSpotifyAndFindYouTube, getSpotifyToken, findAndCacheYouTubeVideos };