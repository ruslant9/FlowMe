// backend/routes/spotify.js (новый файл)

const axios = require('axios');
const Track = require('../models/Track');

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

let spotifyToken = {
    value: null,
    expiresAt: 0,
};

// Получение токена доступа для Spotify API
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
            expiresAt: Date.now() + (tokenData.expires_in - 300) * 1000, // Обновляем за 5 минут до истечения
        };
        return spotifyToken.value;
    } catch (error) {
        console.error("Ошибка получения токена Spotify:", error.response?.data || error.message);
        throw new Error("Не удалось получить доступ к сервису Spotify.");
    }
}

// Поиск видео на YouTube для трека из Spotify
async function findYouTubeVideoForTrack(trackName, artistName) {
    if (!YOUTUBE_API_KEY) return null;
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
        console.error(`Ошибка поиска на YouTube для "${query}":`, error.message);
        return null;
    }
}

// Основная функция: ищет треки на Spotify и находит для них видео на YouTube
async function searchSpotifyAndFindYouTube({ q, daily = false }) {
    if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
        throw new Error('Сервис музыки не настроен на сервере.');
    }
    
    const token = await getSpotifyToken();
    let spotifyTracks = [];

    if (daily) {
        // Логика для "Новинок и хитов"
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
        // Стандартный поиск
        const searchResponse = await axios.get('https://api.spotify.com/v1/search', {
            params: { q, type: 'track', market: 'RU', limit: 20 },
            headers: { 'Authorization': `Bearer ${token}` },
        });
        spotifyTracks = searchResponse.data.tracks.items;
    }

    const trackPromises = spotifyTracks.map(async (track) => {
        if (!track || !track.name || !track.artists.length > 0) return null;

        const artistName = track.artists.map(a => a.name).join(', ');
        const youtubeVideo = await findYouTubeVideoForTrack(track.name, artistName);
        if (!youtubeVideo) return null;

        return {
            spotifyId: track.id,
            youtubeId: youtubeVideo.id.videoId,
            title: youtubeVideo.snippet.title, // Берем заголовок из YouTube, т.к. он будет виден при переходе
            artist: youtubeVideo.snippet.channelTitle, // Аналогично с каналом
            album: track.album.name,
            albumArtUrl: track.album.images[0]?.url || youtubeVideo.snippet.thumbnails.high.url,
            durationMs: track.duration_ms,
            previewUrl: track.preview_url,
        };
    });

    const finalTracks = (await Promise.all(trackPromises)).filter(Boolean);
    
    // Кеширование результатов поиска
    if (finalTracks.length > 0 && !daily) {
        const tracksToCache = finalTracks.map(track => ({ ...track, type: 'search_cache' }));
        Track.insertMany(tracksToCache, { ordered: false }).catch(err => {
            if (err.code !== 11000) console.error("Ошибка кеширования:", err.message);
        });
    }

    return { tracks: finalTracks, nextPageToken: null };
}

module.exports = { searchSpotifyAndFindYouTube };