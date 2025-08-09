// frontend/src/context/MusicPlayerContext.jsx --- ФИНАЛЬНЫЙ ИСПРАВЛЕННЫЙ ФАЙЛ ---

import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL;

const MusicPlayerContext = createContext(null);

export const useMusicPlayer = () => {
    const context = useContext(MusicPlayerContext);
    if (!context) {
        throw new Error('useMusicPlayer must be used within a MusicPlayerProvider');
    }
    return context;
};

export const MusicPlayerProvider = ({ children }) => {
    const [currentTrack, setCurrentTrack] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(() => {
        const savedVolume = localStorage.getItem('playerVolume');
        return savedVolume ? parseFloat(savedVolume) : 0.5;
    });
    const [isShuffle, setIsShuffle] = useState(false);
    const [isRepeat, setIsRepeat] = useState(false);
    const [isLiked, setIsLiked] = useState(false);
    const [myMusicTrackIds, setMyMusicTrackIds] = useState(new Set());
    const [loadingTrackId, setLoadingTrackId] = useState(null);
    const [buffered, setBuffered] = useState(0);
    const [playerNotification, setPlayerNotification] = useState(null);
    const [likeActionStatus, setLikeActionStatus] = useState(null);
    const [isFullScreenPlayerOpen, setIsFullScreenPlayerOpen] = useState(false);
    
    const audioRef = useRef(new Audio());
    const abortControllerRef = useRef(null); 
    const playlistRef = useRef([]);
    const currentTrackIndexRef = useRef(-1);
    const notificationTimeoutRef = useRef(null);
    const likeStatusTimeoutRef = useRef(null);
    
    const cleanTitle = (title) => {
        if (!title) return '';
        return title.replace(/\s*[\(\[](?:\s*(?:official\s*)?(?:video|music\s*video|lyric\s*video|audio|live|performance|visualizer|explicit|single|edit|remix|radio\s*edit|clean|dirty|HD|HQ|full|album\s*version|version|clip|demo|teaser|cover|karaoke|instrumental|extended|rework|reedit|re-cut|reissue|bonus\s*track|unplugged|mood\s*video|concert|show|feat\.?|ft\.?|featuring|\d{4}|(?:\d{2,3}\s?kbps))\s*)[^)\]]*[\)\]]\s*$/i, '').trim();
    };

    const formatArtistNameString = (artistData) => {
        if (!artistData) return '';
        if (Array.isArray(artistData)) {
            return artistData.map(a => (a.name || '').replace(' - Topic', '').trim()).join(', ');
        }
        if (typeof artistData === 'object' && artistData.name) {
            return artistData.name.replace(' - Topic', '').trim();
        }
        return artistData.toString();
    };

    const logMusicAction = useCallback(async (track, action) => {
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/api/music/log-action`, { track, action }, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (error) {
            console.warn(`Не удалось залогировать действие ${action}`, error);
        }
    }, []);

    const fetchMyMusicIds = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setMyMusicTrackIds(new Set());
                return;
            }
            const res = await axios.get(`${API_URL}/api/music/saved`, { headers: { Authorization: `Bearer ${token}` } });
            const sourceIds = res.data.map(track => track.sourceId).filter(Boolean);
            setMyMusicTrackIds(new Set(sourceIds));
        } catch (error) {
            console.error("Не удалось обновить список сохраненной музыки");
        }
    }, []);

    useEffect(() => {
        fetchMyMusicIds();
        window.addEventListener('myMusicUpdated', fetchMyMusicIds);
        return () => window.removeEventListener('myMusicUpdated', fetchMyMusicIds);
    }, [fetchMyMusicIds]);

    useEffect(() => {
        if (currentTrack) {
            setIsLiked(myMusicTrackIds.has(currentTrack._id));
        } else {
            setIsLiked(false);
        }
    }, [currentTrack, myMusicTrackIds]);
    
    const playTrack = useCallback(async (trackData, playlistData, options = {}) => {
        if (!trackData?._id) return;
        
        if (abortControllerRef.current) {
            abortControllerRef.current.abort('New track selected');
        }
        abortControllerRef.current = new AbortController();

        setLoadingTrackId(trackData._id);
        setCurrentTrack(trackData);
        setIsPlaying(false);
        
        audioRef.current.src = '';

        try {
            const { startShuffled = false, startRepeat = false } = options;
            logMusicAction(trackData, 'listen');
            
            const token = localStorage.getItem('token');
            const audio = audioRef.current;
            
            const res = await axios.get(`${API_URL}/api/music/track/${trackData._id}/stream-url`, {
                headers: { Authorization: `Bearer ${token}` },
                signal: abortControllerRef.current.signal
            });

            const streamUrl = res.data.url;
            if (!streamUrl) throw new Error("Stream URL not found.");

            audio.src = streamUrl;
            
            audio.volume = volume;
            await audio.play();
            setIsPlaying(true);
            
            axios.post(`${API_URL}/api/music/track/${trackData._id}/log-play`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            }).catch(e => console.error("Не удалось залогировать прослушивание", e));

            const safePlaylistData = Array.isArray(playlistData) ? playlistData : [];
            let finalPlaylist = safePlaylistData.length > 0 ? [...safePlaylistData] : [trackData];
            let trackIndex = finalPlaylist.findIndex(t => t._id === trackData._id);
            if (trackIndex === -1) trackIndex = 0;
            
            if (startShuffled) {
                const firstTrack = finalPlaylist[trackIndex];
                let rest = finalPlaylist.filter((_, i) => i !== trackIndex);
                for (let i = rest.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [rest[i], rest[j]] = [rest[j], rest[i]];
                }
                finalPlaylist = [firstTrack, ...rest];
                trackIndex = 0;
            }
            playlistRef.current = finalPlaylist;
            currentTrackIndexRef.current = trackIndex;
            setIsShuffle(startShuffled);
            setIsRepeat(startRepeat);
        } catch (error) {
            if (axios.isCancel(error)) {
                console.log("Загрузка предыдущего трека отменена.");
            } else {
                toast.error("Не удалось воспроизвести трек. Возможно, он недоступен.");
                setCurrentTrack(null);
            }
        } finally {
            setLoadingTrackId(null);
            abortControllerRef.current = null;
        }
    }, [volume, logMusicAction]);

    const handleNextTrack = useCallback(() => {
        if (currentTrack && progress > 0 && duration > 0 && progress < duration * 0.9) {
            logMusicAction(currentTrack, 'skip');
        }
        if (playlistRef.current.length === 0) return;

        let nextIndex;
        if (isShuffle) {
            nextIndex = Math.floor(Math.random() * playlistRef.current.length);
        } else {
            nextIndex = (currentTrackIndexRef.current + 1) % playlistRef.current.length;
        }
        
        const nextTrackData = playlistRef.current[nextIndex];
        if (nextTrackData) {
            playTrack(nextTrackData, playlistRef.current);
        }
    }, [isShuffle, playTrack, currentTrack, progress, duration, logMusicAction]);

    const togglePlayPause = useCallback(() => {
        if (!currentTrack) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    }, [currentTrack, isPlaying]);

    const seekTo = useCallback((time) => {
        audioRef.current.currentTime = time;
        setProgress(time);
    }, []);

    const prevTrack = useCallback(() => {
        if (progress > 3) {
            seekTo(0);
        } else {
            if (playlistRef.current.length === 0) return;
            const prevIndex = (currentTrackIndexRef.current - 1 + playlistRef.current.length) % playlistRef.current.length;
            playTrack(playlistRef.current[prevIndex], playlistRef.current);
        }
    }, [progress, seekTo, playTrack]);

    useEffect(() => {
        let progressInterval;
        
        if (isPlaying) {
            progressInterval = setInterval(() => {
                setProgress(audioRef.current.currentTime);
                const audio = audioRef.current;
                if (audio.buffered.length > 0 && audio.duration > 0) {
                    setBuffered(audio.buffered.end(audio.buffered.length - 1) / audio.duration);
                }
            }, 250);
        }
        
        return () => {
            if (progressInterval) {
                clearInterval(progressInterval);
            }
        };
    }, [isPlaying]);

    useEffect(() => {
        const audio = audioRef.current;

        const handleDurationChange = () => setDuration(audio.duration || 0);
        const handleEnded = () => {
            if (isRepeat) {
                audio.currentTime = 0;
                audio.play();
                logMusicAction(currentTrack, 'listen');
            } else {
                handleNextTrack();
            }
        };
        
        audio.addEventListener('durationchange', handleDurationChange);
        audio.addEventListener('ended', handleEnded);

        return () => {
            audio.removeEventListener('durationchange', handleDurationChange);
            audio.removeEventListener('ended', handleEnded);
        };
    }, [isRepeat, handleNextTrack, currentTrack, logMusicAction]);

    useEffect(() => {
        const link = document.querySelector("link[rel~='icon']") || document.createElement('link');
        if (!link.parentElement) {
            link.rel = 'icon';
            document.head.appendChild(link);
        }

        if (currentTrack && currentTrack.albumArtUrl) {
            link.href = currentTrack.albumArtUrl;
        } else {
            link.href = '/favicon.svg';
        }
    }, [currentTrack]);

    useEffect(() => {
        if (currentTrack && 'mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: cleanTitle(currentTrack.title),
                artist: formatArtistNameString(currentTrack.artist),
                album: currentTrack.album?.title || '',
                // --- НАЧАЛО ИСПРАВЛЕНИЯ ---
                artwork: [{ 
                    src: currentTrack.albumArtUrl || currentTrack.album?.coverArtUrl, 
                    sizes: '512x512', 
                    type: 'image/png' 
                }]
                // --- КОНЕЦ ИСПРАВЛЕНИЯ ---
            });
            navigator.mediaSession.setActionHandler('play', togglePlayPause);
            navigator.mediaSession.setActionHandler('pause', togglePlayPause);
            navigator.mediaSession.setActionHandler('previoustrack', prevTrack);
            navigator.mediaSession.setActionHandler('nexttrack', handleNextTrack);
            navigator.mediaSession.setActionHandler('seekto', (details) => seekTo(details.seekTime));
        }
    }, [currentTrack, togglePlayPause, prevTrack, handleNextTrack, seekTo]);

    useEffect(() => {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
        }
    }, [isPlaying]);
    
    // --- НАЧАЛО ИСПРАВЛЕНИЯ: Добавляем проверку, чтобы избежать ошибки ---
    useEffect(() => {
        if ('mediaSession' in navigator && navigator.mediaSession.metadata) {
            navigator.mediaSession.setPositionState({
                duration: duration || 0,
                playbackRate: audioRef.current.playbackRate,
                position: Math.min(progress || 0, duration || 0), // Гарантируем, что position не больше duration
            });
        }
    }, [progress, duration]);
    // --- КОНЕЦ ИСПРАВЛЕНИЯ ---

    const setVolumeAndSave = useCallback((vol) => {
        audioRef.current.volume = vol;
        setVolume(vol);
        localStorage.setItem('playerVolume', vol.toString());
    }, []);
    
    const stopAndClearPlayer = useCallback(() => {
        audioRef.current.pause();
        audioRef.current.src = '';
        setIsPlaying(false);
        setCurrentTrack(null);
        setProgress(0);
        setDuration(0);
        setBuffered(0);
        playlistRef.current = [];
        currentTrackIndexRef.current = -1;
    }, []);

    const showPlayerNotification = (notification) => {
        if (notificationTimeoutRef.current) clearTimeout(notificationTimeoutRef.current);
        setPlayerNotification(notification);
        notificationTimeoutRef.current = setTimeout(() => setPlayerNotification(null), 2500);
    };

    const toggleShuffle = useCallback(() => {
        setIsShuffle(prev => {
            const newState = !prev;
            if (newState) {
                setIsRepeat(false);
                showPlayerNotification({ message: 'Перемешивание включено', target: 'shuffle' });
            } else {
                showPlayerNotification({ message: 'Перемешивание выключено', target: 'shuffle' });
            }
            return newState;
        });
    }, []);
    
    const toggleRepeat = useCallback(() => {
        setIsRepeat(prev => {
            const newState = !prev;
            if (newState) {
                setIsShuffle(false);
                showPlayerNotification({ message: 'Повтор трека включен', target: 'repeat' });
            } else {
                showPlayerNotification({ message: 'Повтор трека выключен', target: 'repeat' });
            }
            return newState;
        });
    }, []);

    const onToggleLike = useCallback(async (trackData) => {
        if (!trackData) return;
        
        const libraryTrackId = trackData._id;
        if (!libraryTrackId) return;

        const wasLiked = myMusicTrackIds.has(libraryTrackId);
        
        const newSet = new Set(myMusicTrackIds);
        if (wasLiked) {
            newSet.delete(libraryTrackId);
        } else {
            newSet.add(libraryTrackId);
        }
        setMyMusicTrackIds(newSet);
        
        if (currentTrack?._id === trackData._id) {
            setIsLiked(!wasLiked);
        }

        if (likeStatusTimeoutRef.current) {
            clearTimeout(likeStatusTimeoutRef.current);
        }
        setLikeActionStatus(wasLiked ? 'unliked' : 'liked');
        likeStatusTimeoutRef.current = setTimeout(() => {
            setLikeActionStatus(null);
        }, 2500);

        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/api/music/toggle-save`, trackData, { headers: { Authorization: `Bearer ${token}` } });
            if (!wasLiked) logMusicAction(trackData, 'like');
            window.dispatchEvent(new CustomEvent('myMusicUpdated'));
        } catch (error) {
            fetchMyMusicIds();
            toast.error('Ошибка при изменении статуса трека.');
        }
    }, [myMusicTrackIds, currentTrack, logMusicAction, fetchMyMusicIds]);

    const contextValue = {
        currentTrack,
        isPlaying,
        progress,
        duration,
        volume,
        isShuffle,
        isRepeat,
        isLiked,
        myMusicTrackIds,
        loadingTrackId,
        buffered,
        playerNotification,
        likeActionStatus,
        playTrack,
        togglePlayPause,
        seekTo,
        setVolume: setVolumeAndSave,
        toggleShuffle,
        toggleRepeat,
        nextTrack: handleNextTrack,
        prevTrack,
        onToggleLike,
        stopAndClearPlayer,
        isFullScreenPlayerOpen,
        openFullScreenPlayer: () => setIsFullScreenPlayerOpen(true),
        closeFullScreenPlayer: () => setIsFullScreenPlayerOpen(false),
    };

    return (
        <MusicPlayerContext.Provider value={contextValue}>
            {children}
        </MusicPlayerContext.Provider>
    );
};