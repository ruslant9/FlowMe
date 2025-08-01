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
    const notificationTimeoutRef = useRef(null);

    const audioRef = useRef(new Audio());
    const playlistRef = useRef([]);
    const currentTrackIndexRef = useRef(-1);

    // Логирование действий для системы рекомендаций
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

    // Получение списка ID сохраненных треков
    const fetchMyMusicIds = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setMyMusicTrackIds(new Set());
                return;
            }
            const res = await axios.get(`${API_URL}/api/music/saved`, { headers: { Authorization: `Bearer ${token}` } });
            // Теперь используем ID трека из вашей БД как уникальный идентификатор
            setMyMusicTrackIds(new Set(res.data.map(track => track._id)));
        } catch (error) {
            console.error("Не удалось обновить список сохраненной музыки");
        }
    }, []);

    useEffect(() => {
        fetchMyMusicIds();
        window.addEventListener('myMusicUpdated', fetchMyMusicIds);
        return () => window.removeEventListener('myMusicUpdated', fetchMyMusicIds);
    }, [fetchMyMusicIds]);

    // Синхронизация статуса "лайка" при смене трека
    useEffect(() => {
        if (currentTrack) {
            setIsLiked(myMusicTrackIds.has(currentTrack._id));
        } else {
            setIsLiked(false);
        }
    }, [currentTrack, myMusicTrackIds]);

    // Основная функция воспроизведения трека
    const playTrack = useCallback(async (trackData, playlistData = [], options = {}) => {
        if (!trackData?._id) return;

        const { playlistId = null, startShuffled = false, startRepeat = false } = options;

        logMusicAction(trackData, 'listen');
        
        setIsLoading(true);
        setLoadingTrackId(trackData._id);
        setCurrentTrack(trackData);
        setIsPlaying(false); // Сначала ставим на паузу, пока грузится URL

        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/api/music/track/${trackData._id}/stream-url`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const streamUrl = res.data.url;
            const audio = audioRef.current;
            audio.src = streamUrl;
            audio.volume = volume;
            await audio.play();
            
            axios.post(`${API_URL}/api/music/track/${trackData._id}/log-play`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            }).catch(e => console.error("Не удалось залогировать прослушивание", e));
            
            setIsPlaying(true);
            
            let finalPlaylist = playlistData.length > 0 ? [...playlistData] : [trackData];
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
            toast.error("Не удалось воспроизвести трек. Возможно, он недоступен.");
            setCurrentTrack(null);
        } finally {
            setIsLoading(false);
            setLoadingTrackId(null);
        }
    }, [volume, logMusicAction]);

    // Обработчик следующего трека
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

    // Управление событиями элемента <audio>
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
        if (progress > 3) { // Если прошло больше 3 секунд, начинаем трек заново
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
        if (!trackData?._id) return;
        
        const wasLiked = myMusicTrackIds.has(trackData._id);
        
        const newSet = new Set(myMusicTrackIds);
        if (wasLiked) {
            newSet.delete(trackData._id);
        } else {
            newSet.add(trackData._id);
        }
        setMyMusicTrackIds(newSet);
        
        if (currentTrack?._id === trackData._id) {
            setIsLiked(!wasLiked);
        }

        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/api/music/toggle-save`, trackData, { headers: { Authorization: `Bearer ${token}` } });
            if (!wasLiked) logMusicAction(trackData, 'like');
            window.dispatchEvent(new CustomEvent('myMusicUpdated'));
        } catch (error) {
            fetchMyMusicIds(); // Восстанавливаем актуальное состояние в случае ошибки
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
    };

    return (
        <MusicPlayerContext.Provider value={contextValue}>
            {children}
        </MusicPlayerContext.Provider>
    );
};