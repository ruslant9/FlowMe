// frontend/src/components/music/MusicPlayerBar.jsx

import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Heart, Shuffle, Repeat, Volume2, VolumeX, X } from 'lucide-react';
import Slider from 'rc-slider';
import { motion, AnimatePresence } from 'framer-motion';

const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds < 0) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
};

// --- НАЧАЛО ИЗМЕНЕНИЯ 1: Создаем компонент для всплывающего уведомления ---
const NotificationToast = ({ message }) => (
    <AnimatePresence>
        {message && (
            <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-slate-800 text-white text-sm font-semibold rounded-lg shadow-lg whitespace-nowrap z-10"
            >
                {message}
            </motion.div>
        )}
    </AnimatePresence>
);
// --- КОНЕЦ ИЗМЕНЕНИЯ 1 ---

const MusicPlayerBar = ({
    track,
    isPlaying,
    progress,
    duration,
    volume,
    isShuffle,
    isRepeat,
    onPlayPauseToggle,
    onSeek,
    onSetVolume,
    onPrev,
    onNext,
    onToggleShuffle,
    onToggleRepeat,
    onToggleLike,
    isLiked,
    buffered,
    stopAndClearPlayer,
    playerNotification,
}) => {

    if (!track) {
        return null;
    }

    // --- НАЧАЛО ИЗМЕНЕНИЯ ---
    const cleanTitle = (title) => {
        if (!title) return '';
        return title.replace(
            /\s*[\(\[](?:\s*(?:official\s*)?(?:video|music\s*video|lyric\s*video|audio|live|performance|visualizer|explicit|single|edit|remix|radio\s*edit|clean|dirty|HD|HQ|full|album\s*version|version|clip|demo|teaser|cover|karaoke|instrumental|extended|rework|reedit|re-cut|reissue|bonus\s*track|unplugged|mood\s*video|concert|show|feat\.?|ft\.?|featuring|\d{4}|(?:\d{2,3}\s?kbps))\s*)[^)\]]*[\)\]]\s*$/i,
            ''
        ).trim();
    };
    const cleanArtist = (artist) => {
        if (!artist) return '';
        if (artist.endsWith(' - Topic')) {
            return artist.substring(0, artist.length - ' - Topic'.length).trim();
        }
        return artist;
    };
    // --- КОНЕЦ ИЗМЕНЕНИЯ ---

    const currentProgress = progress || 0;
    const totalDuration = duration || 1;

    return (
        <div className="w-full p-4 flex items-center space-x-4">
            <div className="flex items-center space-x-4 w-1/4 flex-shrink-0">
                <img src={track.albumArtUrl} alt={track.title} className="w-16 h-16 rounded-md object-cover shadow-md"/>
                <div className="flex flex-col min-w-0 flex-grow">
                    {/* --- ИЗМЕНЕНИЕ --- */}
                    <p className="font-bold truncate text-lg text-slate-900 dark:text-white">{cleanTitle(track.title)}</p>
                    <p className="text-sm text-slate-700 dark:text-white/60 truncate">{Array.isArray(track.artist) ? track.artist.map(a => cleanArtist(a.name)).join(', ') : cleanArtist(track.artist)}</p>
                    {/* --- КОНЕЦ ИЗМЕНЕНИЯ --- */}
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center min-w-0">
                <div className="flex items-center justify-center space-x-4 mb-2">
                    <motion.button
                        onClick={onToggleLike}
                        className={`p-2 transition-colors ${isLiked ? 'text-red-500' : 'text-slate-700 dark:text-white/60 hover:text-red-400'}`}
                        title="Нравится"
                        whileTap={{ scale: 1.3, transition: { type: 'spring', stiffness: 400, damping: 10 } }}
                    >
                        <Heart size={20} fill={isLiked ? 'currentColor' : 'none'}/>
                    </motion.button>
                    
                    {/* --- НАЧАЛО ИЗМЕНЕНИЯ 2: Оборачиваем кнопку Shuffle --- */}
                    <div className="relative">
                        <NotificationToast message={playerNotification?.target === 'shuffle' ? playerNotification.message : null} />
                        <button onClick={onToggleShuffle} className={`p-2 transition-colors ${isShuffle ? 'text-blue-500' : 'text-slate-700 dark:text-white/60 hover:text-blue-400'}`} title="Перемешать">
                            <Shuffle size={20}/>
                        </button>
                    </div>
                    {/* --- КОНЕЦ ИЗМЕНЕНИЯ 2 --- */}

                    <button onClick={onPrev} className="p-2 text-slate-800 dark:text-white hover:text-blue-500 dark:hover:text-blue-400" title="Предыдущий">
                        <SkipBack size={24}/>
                    </button>
                    
                    {/* --- НАЧАЛО ИЗМЕНЕНИЯ 3: Убираем NotificationToast отсюда --- */}
                    <div className="relative">
                        <button onClick={onPlayPauseToggle} className="w-12 h-12 flex items-center justify-center rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-colors" title={isPlaying ? "Пауза" : "Воспроизвести"}>
                            {isPlaying ? <Pause size={28}/> : <Play size={28}/>}
                        </button>
                    </div>
                    {/* --- КОНЕЦ ИЗМЕНЕНИЯ 3 --- */}
                    
                    <button onClick={onNext} className="p-2 text-slate-800 dark:text-white hover:text-blue-500 dark:hover:text-blue-400" title="Следующий">
                        <SkipForward size={24}/>
                    </button>
                    
                    {/* --- НАЧАЛО ИЗМЕНЕНИЯ 4: Оборачиваем кнопку Repeat --- */}
                    <div className="relative">
                        <NotificationToast message={playerNotification?.target === 'repeat' ? playerNotification.message : null} />
                        <button onClick={onToggleRepeat} className={`p-2 transition-colors ${isRepeat ? 'text-blue-500' : 'text-slate-700 dark:text-white/60 hover:text-blue-400'}`} title="Повторить">
                            <Repeat size={20}/>
                        </button>
                    </div>
                    {/* --- КОНЕЦ ИЗМЕНЕНИЯ 4 --- */}
                </div>

                <div className="w-full flex items-center space-x-2">
                    <span className="text-xs text-slate-700 dark:text-white/60 w-10 text-center">{formatTime(currentProgress)}</span>
                    <div className="relative flex-grow flex items-center">
                        <div className="absolute h-[4px] w-full bg-slate-200 dark:bg-white/10 rounded-full"></div>
                        <div 
                            className="absolute h-[4px] bg-slate-300 dark:bg-slate-600 rounded-full"
                            style={{ width: `${buffered * 100}%`}}
                        />
                        <Slider
                            min={0}
                            max={totalDuration}
                            value={currentProgress}
                            onChange={onSeek}
                            step={0.1}
                        />
                    </div>
                    <span className="text-xs text-slate-700 dark:text-white/60 w-10 text-center">{formatTime(totalDuration)}</span>
                </div>
            </div>

            <div className="flex items-center space-x-2 w-48 justify-end">
                <button onClick={() => onSetVolume(volume > 0 ? 0 : 0.5)} className="p-2 text-slate-800 dark:text-white/60 hover:text-blue-500 dark:hover:text-blue-400" title={volume > 0 ? "Выключить звук" : "Включить звук"}>
                    {volume > 0 ? <Volume2 size={20} /> : <VolumeX size={20} />}
                </button>
                <Slider
                    min={0}
                    max={1}
                    step={0.01}
                    value={volume}
                    onChange={onSetVolume}
                    className="flex-grow w-24"
                />
                <button onClick={stopAndClearPlayer} className="p-2 text-slate-800 dark:text-white/60 hover:text-red-500 dark:hover:text-red-400" title="Закрыть плеер">
                    <X size={24} />
                </button>
            </div>
        </div>
    );
};

export default MusicPlayerBar;