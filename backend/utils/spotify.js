// backend/utils/spotify.js

const axios = require('axios');
const Track = require('../models/Track');

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

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
    if (!YOUTUBE_API_KEY) {
        console.error("YOUTUBE_API_KEY не установлен. Поиск на YouTube невозможен.");
        return null;
    }
    const query = `${trackName} ${artistName} official audio`;
    try {
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
            return response.data.items[0];
        }
        return null;
    } catch (error) {
        console.error(`Ошибка поиска на YouTube для "${query}":`, error.response?.data?.error?.message || error.message);
        if (error.response && error.response.status === 403) {
            console.error("КВОТА YOUTUBE API СКОРЕЕ ВСЕГО ИСЧЕРПАНА!");
        }
        return null;
    }
}

// --- НАЧАЛО ИЗМЕНЕНИЯ: Полная переработка функции с внедрением кэширования ---
async function searchSpotifyAndFindYouTube({ q, daily = false }) {
    if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
        throw new Error('Сервис музыки не настроен на сервере.');
    }
    
    const token = await getSpotifyToken();
    let spotifyTracks = [];

    // 1. Получаем треки из Spotify
    try {
        if (daily) {
            const playlistsResponse = await axios.get('https://api.spotify.com/v1/browse/categories/toplists/playlists', {
                params: { country: 'RU', limit: 5 },
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const playlistId = playlistsResponse.data.playlists.items[Math.floor(Math.random() * playlistsResponse.data.playlists.items.length)].id;
            const tracksResponse = await axios.get(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
                params: { limit: 50 },
                headers: { 'Authorization': `Bearer ${token}` }
            });
            spotifyTracks = tracksResponse.data.items.map(item => item.track).filter(Boolean);
        } else {
            const searchResponse = await axios.get('https://api.spotify.com/v1/search', {
                params: { q, type: 'track', market: 'RU', limit: 20 },
                headers: { 'Authorization': `Bearer ${token}` },
            });
            spotifyTracks = searchResponse.data.tracks.items;
        }
    } catch (error) {
        console.error("Ошибка при запросе к Spotify API:", error.response?.data || error.message);
        throw new Error("Ошибка при поиске треков в Spotify.");
    }
    
    if (spotifyTracks.length === 0) {
        return { tracks: [], nextPageToken: null };
    }

    const spotifyIds = spotifyTracks.map(track => track.id).filter(Boolean);

    // 2. Проверяем наш кэш в базе данных
    const cachedTracks = await Track.find({ spotifyId: { $in: spotifyIds }, type: 'search_cache' });
    const cachedTracksMap = new Map(cachedTracks.map(track => [track.spotifyId, track]));

    // 3. Определяем, для каких треков нужно искать видео на YouTube
    const tracksToSearchOnYouTube = spotifyTracks.filter(track => !cachedTracksMap.has(track.id));

    // 4. Ищем на YouTube только недостающие треки
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

    // 5. Кэшируем новые найденные треки в базу данных
    if (newlyFoundTracks.length > 0) {
        const tracksToCache = newlyFoundTracks.map(track => ({ ...track, type: 'search_cache' }));
        Track.insertMany(tracksToCache, { ordered: false }).catch(err => {
            // Игнорируем ошибки дубликатов (код 11000), остальные выводим в консоль
            if (err.code !== 11000) console.error("Ошибка кеширования:", err.message);
        });
    }

    // 6. Собираем финальный результат, сохраняя порядок из Spotify
    const finalTracks = spotifyTracks.map(track => {
        if (cachedTracksMap.has(track.id)) {
            return cachedTracksMap.get(track.id);
        }
        return newlyFoundTracks.find(t => t.spotifyId === track.id);
    }).filter(Boolean); // Убираем те, для которых так и не нашлось видео

    return { tracks: finalTracks, nextPageToken: null };
}
// --- КОНЕЦ ИЗМЕНЕНИЯ ---

module.exports = { searchSpotifyAndFindYouTube };