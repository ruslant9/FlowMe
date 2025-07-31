// frontend/src/context/MusicPlayerContext.jsx

import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import YouTubePlayer from '../components/YouTubePlayer';
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
    const [volume, setVolume] = useState(0.5);
    const [isShuffle, setIsShuffle] = useState(false);
    const [isRepeat, setIsRepeat] = useState(false);
    const [isLiked, setIsLiked] = useState(false);
    const [myMusicTrackIds, setMyMusicTrackIds] = useState(new Set());
    const [loadingTrackId, setLoadingTrackId] = useState(null);
    const [buffered, setBuffered] = useState(0);

    const [playerNotification, setPlayerNotification] = useState(null);
    const notificationTimeoutRef = useRef(null);

    const youtubePlayerRef = useRef(null);
    const [currentPlaylistId, setCurrentPlaylistId] = useState(null);
    const playlistRef = useRef([]);
    const currentTrackIndexRef = useRef(-1);
    
    useEffect(() => {
        if (isPlaying) {
            setLoadingTrackId(null);
        }
    }, [isPlaying]);

    // --- НАЧАЛО ИЗМЕНЕНИЯ: Этот useEffect будет автоматически синхронизировать статус лайка ---
    useEffect(() => {
        if (currentTrack) {
            setIsLiked(myMusicTrackIds.has(currentTrack.youtubeId));
        } else {
            setIsLiked(false);
        }
    }, [currentTrack, myMusicTrackIds]);
    // --- КОНЕЦ ИЗМЕНЕНИЯ ---

    const stopAndClearPlayer = useCallback(() => {
        setIsPlaying(false);
        setCurrentTrack(null);
        setProgress(0);
        setDuration(0);
        setBuffered(0);
        playlistRef.current = [];
        currentTrackIndexRef.current = -1;
        if (youtubePlayerRef.current) {
            youtubePlayerRef.current.stopVideo();
        }
    }, []);

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
            // --- ИЗМЕНЕНИЕ ЗДЕСЬ: Предотвращаем запрос, если нет токена ---
            if (!token) {
                setMyMusicTrackIds(new Set()); // Убедимся, что список пуст, если пользователь не вошел
                return;
            }
            // --- КОНЕЦ ИЗМЕНЕНИЯ ---
            const res = await axios.get(`${API_URL}/api/music/saved`, { headers: { Authorization: `Bearer ${token}` } });
            setMyMusicTrackIds(new Set(res.data.map(track => track.youtubeId)));
        } catch (error) {
            console.error("Не удалось обновить список сохраненной музыки");
        }
    }, []);

    useEffect(() => {
        fetchMyMusicIds();
        window.addEventListener('myMusicUpdated', fetchMyMusicIds);
        return () => window.removeEventListener('myMusicUpdated', fetchMyMusicIds);
    }, [fetchMyMusicIds]);
    
    const handleToggleLike = useCallback(async (trackData) => {
        if (!trackData) return;
        
        const wasLiked = myMusicTrackIds.has(trackData.youtubeId);
        
        const newSet = new Set(myMusicTrackIds);
        if (wasLiked) {
            newSet.delete(trackData.youtubeId);
        } else {
            newSet.add(trackData.youtubeId);
        }
        setMyMusicTrackIds(newSet);

        if (currentTrack?.youtubeId === trackData.youtubeId) {
            setIsLiked(!wasLiked);
        }

        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_URL}/api/music/toggle-save`, trackData, { headers: { Authorization: `Bearer ${token}` } });
            
            if (res.data.saved) {
                logMusicAction(trackData, 'like');
            }
            window.dispatchEvent(new CustomEvent('myMusicUpdated'));
        } catch (error) {
            fetchMyMusicIds();
            toast.error(error.response?.data?.message || 'Ошибка при изменении статуса трека.');
        }
    }, [myMusicTrackIds, logMusicAction, currentTrack, fetchMyMusicIds]);

    const handlePlayPauseToggle = useCallback(() => {
        if (!currentTrack || !youtubePlayerRef.current) return;
        setIsPlaying(prev => !prev);
    }, [currentTrack]);
    
    const playTrack = useCallback((trackData, playlistData = [], options = {}) => {
        if (!trackData || !trackData.youtubeId) return;

        const { playlistId = null, startShuffled = false, startRepeat = false } = options;

        logMusicAction(trackData, 'listen');
        
        setIsShuffle(startShuffled);
        setIsRepeat(startRepeat);

        if (playlistId && (!currentPlaylistId || currentPlaylistId !== playlistId)) {
            setCurrentPlaylistId(playlistId);
            const token = localStorage.getItem('token');
            axios.post(`${API_URL}/api/playlists/${playlistId}/play`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            }).catch(e => console.error("Не удалось обновить счетчик прослушиваний плейлиста", e));
        } else if (!playlistId) {
            setCurrentPlaylistId(null);
        }

        setCurrentTrack(current => {
            if (current && current.youtubeId === trackData.youtubeId) {
                setIsPlaying(p => !p);
                return current;
            }
            
            setLoadingTrackId(trackData.youtubeId);
            setIsPlaying(true);
            setProgress(0);
            setBuffered(0);
            setIsLiked(myMusicTrackIds.has(trackData.youtubeId));
            
            if (youtubePlayerRef.current) {
                youtubePlayerRef.current.setVolume(volume);
            }

            let finalPlaylist = playlistData.length > 0 ? [...playlistData] : [trackData];
            
            if (startShuffled) {
                const firstTrack = finalPlaylist.find(t => t.youtubeId === trackData.youtubeId);
                let restOfPlaylist = finalPlaylist.filter(t => t.youtubeId !== trackData.youtubeId);
                
                for (let i = restOfPlaylist.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [restOfPlaylist[i], restOfPlaylist[j]] = [restOfPlaylist[j], restOfPlaylist[i]];
                }
                finalPlaylist = [firstTrack, ...restOfPlaylist];
            }

            playlistRef.current = finalPlaylist;
            currentTrackIndexRef.current = 0;

            return finalPlaylist[0];
        });
    }, [volume, logMusicAction, currentPlaylistId, myMusicTrackIds]);

    const handleSeek = useCallback((value) => {
        if (youtubePlayerRef.current) {
            const seekDifference = value - progress;
            if (
                currentTrack &&
                seekDifference > 30 &&
                progress < duration * 0.3
            ) {
                logMusicAction(currentTrack, 'seek_skip');
            }
            youtubePlayerRef.current.seekTo(value);
            setProgress(value);
        }
    }, [progress, duration, currentTrack, logMusicAction]);

    const handleSetVolume = useCallback((value) => {
        if (youtubePlayerRef.current) {
            youtubePlayerRef.current.setVolume(value);
            setVolume(value);
        }
    }, []);

    const showPlayerNotification = (notification) => {
        if (notificationTimeoutRef.current) {
            clearTimeout(notificationTimeoutRef.current);
        }
        setPlayerNotification(notification);
        notificationTimeoutRef.current = setTimeout(() => {
            setPlayerNotification(null);
        }, 2500);
    };

    const handleToggleShuffle = useCallback(() => {
        setIsShuffle(prevShuffle => {
            const newShuffleState = !prevShuffle;
            if (newShuffleState) {
                setIsRepeat(false);
                showPlayerNotification({ message: 'Перемешивание включено', target: 'shuffle' });
            } else {
                showPlayerNotification({ message: 'Перемешивание выключено', target: 'shuffle' });
            }
            return newShuffleState;
        });
    }, []);

    const handleToggleRepeat = useCallback(() => {
        setIsRepeat(prevRepeat => {
            const newRepeatState = !prevRepeat;
            if (newRepeatState) {
                setIsShuffle(false);
                showPlayerNotification({ message: 'Повтор трека включен', target: 'repeat' });
            } else {
                showPlayerNotification({ message: 'Повтор трека выключен', target: 'repeat' });
            }
            return newRepeatState;
        });
    }, []);

    const handleNextTrack = useCallback(() => {
        if (currentTrack && progress > 0 && duration > 0 && progress < duration * 0.9) {
            logMusicAction(currentTrack, 'skip');
        }

        if (!currentTrack || playlistRef.current.length === 0) return;

        let nextIndex;
        const currentTrackId = currentTrack.youtubeId;
        
        const currentIndexInPlaylist = playlistRef.current.findIndex(t => t.youtubeId === currentTrackId);
        currentTrackIndexRef.current = currentIndexInPlaylist;


        if (isShuffle) {
            const tempPlaylist = playlistRef.current.filter(t => t.youtubeId !== currentTrackId);
            if (tempPlaylist.length === 0) {
                if (isRepeat) {
                    playTrack(currentTrack, playlistRef.current, { startRepeat: true });
                } else {
                    setCurrentTrack(null);
                    setIsPlaying(false);
                }
                return;
            }
            const randomIndex = Math.floor(Math.random() * tempPlaylist.length);
            nextIndex = playlistRef.current.findIndex(t => t.youtubeId === tempPlaylist[randomIndex].youtubeId);
        } else {
            nextIndex = (currentIndexInPlaylist + 1) % playlistRef.current.length;
        }
        
        const nextTrackData = playlistRef.current[nextIndex];

        if (nextTrackData) {
            playTrack(nextTrackData, playlistRef.current, { startRepeat: isRepeat });
        } else if (isRepeat && playlistRef.current.length > 0) {
            playTrack(playlistRef.current[0], playlistRef.current, { startRepeat: true });
        } else {
            setCurrentTrack(null);
            setIsPlaying(false);
            if(youtubePlayerRef.current) youtubePlayerRef.current.pauseVideo();
        }
    }, [isShuffle, isRepeat, currentTrack, playTrack, progress, duration, logMusicAction]);

    const handlePrevTrack = useCallback(() => {
        if (!currentTrack || playlistRef.current.length === 0) return;

        const currentIndexInPlaylist = playlistRef.current.findIndex(t => t.youtubeId === currentTrack.youtubeId);
        let prevIndex = (currentIndexInPlaylist - 1 + playlistRef.current.length) % playlistRef.current.length;
        const prevTrackData = playlistRef.current[prevIndex];

        if (prevTrackData) {
            playTrack(prevTrackData, playlistRef.current, { startRepeat: isRepeat });
        } else if (isRepeat && playlistRef.current.length > 0) {
            playTrack(playlistRef.current[playlistRef.current.length - 1], playlistRef.current, { startRepeat: true });
        } else {
            setCurrentTrack(null);
            setIsPlaying(false);
            if(youtubePlayerRef.current) youtubePlayerRef.current.pauseVideo();
        }
    }, [isRepeat, currentTrack, playTrack]);

    const handleVideoEnd = useCallback(() => {
        if (isRepeat && currentTrack) {
            if (youtubePlayerRef.current) {
                youtubePlayerRef.current.seekTo(0);
                youtubePlayerRef.current.playVideo();
            }
        } else {
            handleNextTrack();
        }
    }, [isRepeat, currentTrack, handleNextTrack]);
    
    const handlePlaybackError = useCallback((failedVideoId) => {
        toast.error(`Не удалось воспроизвести трек (ошибка встраивания). Пропускаем...`);
        handleNextTrack();
    }, [handleNextTrack]);

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
        togglePlayPause: handlePlayPauseToggle,
        seekTo: handleSeek,
        setVolume: handleSetVolume,
        toggleShuffle: handleToggleShuffle,
        toggleRepeat: handleToggleRepeat,
        nextTrack: handleNextTrack,
        prevTrack: handlePrevTrack,
        onToggleLike: handleToggleLike,
        stopAndClearPlayer,
    };

    return (
        <MusicPlayerContext.Provider value={contextValue}>
            {children}
            <div className="fixed bottom-0 left-0" style={{ visibility: 'hidden', pointerEvents: 'none', width: '1px', height: '1px', opacity: 0, overflow: 'hidden' }}>
                <YouTubePlayer
                    ref={youtubePlayerRef}
                    videoId={currentTrack?.youtubeId}
                    autoPlay={isPlaying}
                    onVideoEnd={handleVideoEnd}
                    onPlayPauseChange={setIsPlaying}
                    onProgressChange={setProgress}
                    onDurationChange={setDuration}
                    onVolumeChange={setVolume}
                    onBufferChange={setBuffered}
                    onPlaybackError={handlePlaybackError}
                />
            </div>
        </MusicPlayerContext.Provider>
    );
};