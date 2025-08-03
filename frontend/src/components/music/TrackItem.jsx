// frontend/src/components/music/TrackItem.jsx

import React from 'react';
import { Play, Pause, Heart, Loader2, Trash2 } from 'lucide-react';
import Slider from 'rc-slider';
import { motion } from 'framer-motion';
import { useModal } from '../../hooks/useModal';

const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds < 0) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
};

const TrackItem = ({ 
    track, 
    onSelectTrack, 
    currentPlayingTrackId, // <<<--- ИЗМЕНЕНИЕ: Принимаем ID, а не булево значение
    isPlaying, 
    onToggleSave, 
    isSaved, 
    progress, 
    duration, 
    onSeek, 
    loadingTrackId, 
    buffered, 
    onPlayPauseToggle,
    showDeleteButton = false,
    onDeleteFromHistory,
    showRemoveButton = false, 
    onRemoveFromPlaylist 
}) => {
    const { showConfirmation } = useModal();
    
    // <<<--- НАЧАЛО ИСПРАВЛЕНИЯ 1: Усиленная проверка isCurrent ---
    const isCurrent = currentPlayingTrackId && track.youtubeId === currentPlayingTrackId;
    // <<<--- КОНЕЦ ИСПРАВЛЕНИЯ 1 ---
    
    const duration_ms = track.durationMs;
    const minutes = duration_ms ? Math.floor(duration_ms / 60000) : 0;
    const seconds = duration_ms ? ((duration_ms % 60000) / 1000).toFixed(0) : 0;
    const formattedDuration = duration_ms ? `${minutes}:${seconds < 10 ? '0' : ''}${seconds}` : '?:??';

    const isLoading = track.youtubeId === loadingTrackId;
    
    const cleanTitle = (title) => {
        if (!title) return '';
        return title.replace(
            /\s*[\(\[](?:\s*(?:official\s*)?(?:video|music\s*video|lyric\s*video|audio|live|performance|visualizer|explicit|single|edit|remix|radio\s*edit|clean|dirty|HD|HQ|full|album\s*version|version|clip|demo|teaser|cover|karaoke|instrumental|extended|rework|reedit|re-cut|reissue|bonus\s*track|unplugged|mood\s*video|concert|show|feat\.?|ft\.?|featuring|\d{4}|(?:\d{2,3}\s?kbps))\s*)[^)\]]*[\)\]]\s*$/i,
            ''
        ).trim();
    };
    
    const formatArtistName = (artistData) => {
        if (!artistData) return '';
        if (Array.isArray(artistData)) {
            return artistData.map(a => (a.name || '').replace(' - Topic', '').trim()).join(', ');
        }
        if (typeof artistData === 'string') {
            return artistData.replace(' - Topic', '').trim();
        }
        if (typeof artistData === 'object' && artistData.name) {
            return artistData.name.replace(' - Topic', '').trim();
        }
        return '';
    };

    const cleanedTitle = cleanTitle(track.title);
    const cleanedArtist = formatArtistName(track.artist);

    const handlePlayButtonClick = (e) => {
        e.stopPropagation();
        if (isCurrent) {
            onPlayPauseToggle();
        } else {
            onSelectTrack(track);
        }
    };

    const handleRemoveClick = (e) => {
        e.stopPropagation();
        showConfirmation({
            title: "Удалить трек?",
            message: `Вы уверены, что хотите удалить трек "${track.title}" из этого плейлиста?`,
            onConfirm: () => onRemoveFromPlaylist(track._id)
        });
    };

    return (
        <div className={`flex flex-col p-2 rounded-lg hover:bg-slate-100/50 dark:hover:bg-white/5 group transition-colors
            ${isCurrent ? 'bg-blue-500/10 dark:bg-blue-500/20' : ''}
        `}>
            <div className="flex items-center w-full">
                <div className="w-12 h-12 rounded-md overflow-hidden relative mr-4 flex-shrink-0">
                    <img src={track.albumArtUrl} alt={track.title} className="w-full h-full object-cover"/>
                    <button
                        onClick={handlePlayButtonClick}
                        className={`absolute inset-0 bg-black/50 flex items-center justify-center text-white 
                            ${isCurrent || isLoading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} 
                            transition-opacity`}
                    >
                        {isLoading ? (
                            <Loader2 size={24} className="animate-spin" />
                        ) : isCurrent && isPlaying ? (
                            <Pause size={24} className="animate-pulse-play" />
                        ) : (
                            <Play size={24} />
                        )}
                    </button>
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{cleanedTitle}</p>
                    <p className="text-sm text-slate-500 dark:text-white/60 truncate">{cleanedArtist}</p>
                </div>
                <div className="flex items-center space-x-4 ml-4 text-slate-500 dark:text-white/60">
                    <span className="text-sm font-semibold w-10 text-right">
                        {!isCurrent && formattedDuration}
                    </span>
                    
                    {showRemoveButton ? (
                         <motion.button
                            onClick={handleRemoveClick}
                            className="p-1 rounded-full text-slate-500 dark:text-white/60 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-500/10"
                            title="Удалить из плейлиста" whileTap={{ scale: 1.3 }}>
                            <Trash2 size={20} />
                        </motion.button>
                    ) : showDeleteButton ? (
                        <motion.button
                            onClick={(e) => { e.stopPropagation(); onDeleteFromHistory(track.youtubeId); }}
                            className="p-1 rounded-full text-slate-500 dark:text-white/60 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-500/10"
                            title="Удалить из истории" whileTap={{ scale: 1.3 }}>
                            <Trash2 size={20} />
                        </motion.button>
                    ) : (
                        <motion.button
                            onClick={(e) => { e.stopPropagation(); onToggleSave(track); }}
                            className={`p-1 rounded-full transition-colors 
                                ${isSaved ? 'text-red-500 opacity-100' : 'text-slate-500 dark:text-white/60 opacity-0 group-hover:opacity-100'} 
                                hover:bg-red-500/10`}
                            title={isSaved ? 'Удалить из Моей музыки' : 'Добавить в Мою музыку'}
                            whileTap={{ scale: 1.3, transition: { type: 'spring', stiffness: 400, damping: 10 } }}
                        >
                            <Heart size={20} fill={isSaved ? 'currentColor' : 'none'}/>
                        </motion.button>
                    )}
                </div>
            </div>
            {isCurrent && (
                <div className="flex items-center w-full space-x-2 mt-2 px-2">
                    <span className="text-xs text-slate-500 dark:text-white/60 w-10 text-center">{formatTime(progress)}</span>
                    <div className="relative flex-grow flex items-center">
                        <div className="absolute h-[4px] w-full bg-slate-200 dark:bg-white/10 rounded-full"></div>
                        <div 
                            className="absolute h-[4px] bg-slate-300 dark:bg-slate-600 rounded-full"
                            style={{ width: `${buffered * 100}%`}}
                        />
                        <Slider
                            min={0}
                            max={duration}
                            value={progress}
                            onChange={onSeek}
                            step={0.1}
                        />
                    </div>
                    <span className="text-xs text-slate-500 dark:text-white/60 w-10 text-center">{formatTime(duration)}</span>
                </div>
            )}
        </div>
    );
};

export default TrackItem;