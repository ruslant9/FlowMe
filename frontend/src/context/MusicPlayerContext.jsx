// frontend/src/context/MusicPlayerContext.jsx

import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { AudioCache } from '../utils/AudioCacheService';

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
    const [isFullScreenPlayerOpen, setIsFullScreenPlayerOpen] = useState(false);

    // --- НАЧАЛО ИЗМЕНЕНИЙ: Убираем isLoadingPlayback и добавляем AbortController ---
    const abortControllerRef = useRef(null); 
    // --- КОНЕЦ ИЗМЕНЕНИЙ ---

    const audioRef = useRef(new Audio());
    const playlistRef = useRef([]);
    const currentTrackIndexRef = useRef(-1);
    const notificationTimeoutRef = useRef(null);
    const currentObjectUrlRef = useRef(null);

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
        
        // --- НАЧАЛО ИЗМЕНЕНИЙ: Отменяем предыдущий запрос, если он есть ---
        if (abortControllerRef.current) {
            abortControllerRef.current.abort('New track selected');
        }
        abortControllerRef.current = new AbortController();
        // --- КОНЕЦ ИЗМЕНЕНИЙ ---

        setLoadingTrackId(trackData._id);
        setCurrentTrack(trackData);
        setIsPlaying(false);
        
        if (currentObjectUrlRef.current) {
            URL.revokeObjectURL(currentObjectUrlRef.current);
            currentObjectUrlRef.current = null;
        }

        try {
            const { startShuffled = false, startRepeat = false } = options;
            logMusicAction(trackData, 'listen');
            
            const token = localStorage.getItem('token');
            const audio = audioRef.current;
            
            const cachedBlob = await AudioCache.getAudio(trackData._id);

            if (cachedBlob) {
                const audioUrl = URL.createObjectURL(cachedBlob);
                currentObjectUrlRef.current = audioUrl;
                audio.src = audioUrl;
            } else {
                const res = await axios.get(`${API_URL}/api/music/track/${trackData._id}/stream-url`, {
                    headers: { Authorization: `Bearer ${token}` },
                    // --- НАЧАЛО ИЗМЕНЕНИЙ: Передаем сигнал контроллера в запрос ---
                    signal: abortControllerRef.current.signal
                    // --- КОНЕЦ ИЗМЕНЕНИЙ ---
                });

                const streamUrl = res.data.url;
                if (!streamUrl) throw new Error("Stream URL not found.");

                audio.src = streamUrl;

                (async () => {
                    try {
                        const audioResponse = await fetch(streamUrl);
                        if (!audioResponse.ok) throw new Error('Failed to fetch audio for caching');
                        const audioBlob = await audioResponse.blob();
                        await AudioCache.setAudio(trackData._id, audioBlob);
                    } catch (cacheError) {
                        console.error(`Failed to cache track ${trackData._id}:`, cacheError);
                    }
                })();
            }
            
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
            // --- НАЧАЛО ИЗМЕНЕНИЙ: Обрабатываем ошибку отмены, чтобы не показывать ее пользователю ---
            if (axios.isCancel(error)) {
                console.log("Загрузка предыдущего трека отменена.");
            } else {
                toast.error("Не удалось воспроизвести трек. Возможно, он недоступен.");
                setCurrentTrack(null);
            }
            // --- КОНЕЦ ИЗМЕНЕНИЙ ---
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

    useEffect(() => {
        const audio = audioRef.current;
        
        const handleTimeUpdate = () => setProgress(audio.currentTime);
        const handleDurationChange = () => setDuration(audio.duration);
        const handleEnded = () => {
            if (isRepeat) {
                audio.currentTime = 0;
                audio.play();
                logMusicAction(currentTrack, 'listen');
            } else {
                handleNextTrack();
            }
        };
        const handleProgress = () => {
            if (audio.buffered.length > 0 && audio.duration > 0) {
                setBuffered(audio.buffered.end(audio.buffered.length - 1) / audio.duration);
            }
        };
        
        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('durationchange', handleDurationChange);
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('progress', handleProgress);

        return () => {
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('durationchange', handleDurationChange);
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('progress', handleProgress);
        };
    }, [isRepeat, handleNextTrack, currentTrack, logMusicAction]);

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

    const setVolumeAndSave = useCallback((vol) => {
        audioRef.current.volume = vol;
        setVolume(vol);
        localStorage.setItem('playerVolume', vol.toString());
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
    
    const stopAndClearPlayer = useCallback(() => {
        audioRef.current.pause();
        audioRef.current.src = '';
        if (currentObjectUrlRef.current) {
            URL.revokeObjectURL(currentObjectUrlRef.current);
            currentObjectUrlRef.current = null;
        }
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

        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_URL}/api/music/toggle-save`, trackData, { headers: { Authorization: `Bearer ${token}` } });
            toast.success(res.data.message);
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