// frontend/src/components/music/AttachedTrack.jsx --- НОВЫЙ ИСПРАВЛЕННЫЙ ФАЙЛ ---

import React from 'react';
import { Play, Pause, Music, Loader2 } from 'lucide-react';
import { useMusicPlayer } from '../../context/MusicPlayerContext';
import Slider from 'rc-slider';
import { useCachedImage } from '../../hooks/useCachedImage';

const CachedImage = ({ src, alt }) => {
    const { finalSrc, loading } = useCachedImage(src);
    if (loading) {
        return <div className="w-full h-full bg-slate-200 dark:bg-slate-700 animate-pulse"></div>;
    }
    return <img src={finalSrc} alt={alt} className="w-full h-full object-cover"/>;
};

const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds < 0) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
};

const AttachedTrack = ({ track }) => {
    const {
        playTrack, currentTrack, isPlaying, loadingTrackId, togglePlayPause,
        progress, duration, seekTo, buffered
    } = useMusicPlayer();
    
    // Функция для очистки заголовка от лишних слов (official video, audio, и т.д.)
    const cleanTitle = (title) => {
        if (!title) return '';
        return title.replace(/\s*[\(\[](?:\s*(?:official\s*)?(?:video|music\s*video|lyric\s*video|audio|live|performance|visualizer|explicit|single|edit|remix|radio\s*edit|clean|dirty|HD|HQ|full|album\s*version|version|clip|demo|teaser|cover|karaoke|instrumental|extended|rework|reedit|re-cut|reissue|bonus\s*track|unplugged|mood\s*video|concert|show|feat\.?|ft\.?|featuring|\d{4}|(?:\d{2,3}\s?kbps))\s*)[^)\]]*[\)\]]\s*$/i, '').trim();
    };

    // Функция для корректного отображения имен исполнителей
    const formatArtistName = (artistData) => {
        if (!artistData) return '';
        if (Array.isArray(artistData)) return artistData.map(a => (a.name || '').replace(' - Topic', '').trim()).join(', ');
        if (typeof artistData === 'object' && artistData.name) return artistData.name.replace(' - Topic', '').trim();
        if (typeof artistData === 'string') return artistData.replace(' - Topic', '').trim();
        return '';
    }; 
    
    if (!track) return null;

    const isCurrent = currentTrack?._id === track._id;
    const isLoading = loadingTrackId === track._id;

    const handlePlayClick = (e) => {
        e.stopPropagation();
        if (isCurrent) {
            togglePlayPause();
        } else {
            playTrack(track, [track]); // Воспроизводим трек как плейлист из одного элемента
        }
    };

    const trackDurationInSeconds = track.durationMs ? track.durationMs / 1000 : 0;

    return (
        <div className="flex flex-col space-y-2 w-full">
            <div className="flex items-center space-x-3">
                <div className="relative w-14 h-14 rounded-md overflow-hidden flex-shrink-0 group">
                    {track.albumArtUrl ? 
                        <CachedImage src={track.albumArtUrl} alt={track.title} /> : 
                        <div className="w-full h-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                            <Music size={24} className="text-slate-400"/>
                        </div>
                    }
                    <button 
                        onClick={handlePlayClick} 
                        className={`absolute inset-0 bg-black/50 flex items-center justify-center text-white transition-opacity 
                            ${isCurrent || isLoading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                    >
                        {isLoading ? <Loader2 className="animate-spin" /> : (isCurrent && isPlaying ? <Pause size={28} /> : <Play size={28} />)}
                    </button>
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{cleanTitle(track.title)}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{formatArtistName(track.artist)}</p>
                </div>
            </div>
            
            <div className="flex items-center w-full space-x-2">
                <span className="text-xs text-slate-500 dark:text-white/60 w-10 text-center">
                    {formatTime(isCurrent ? progress : 0)}
                </span>
                <div className="relative flex-grow flex items-center">
                    <div className="absolute h-[4px] w-full bg-slate-200 dark:bg-white/10 rounded-full"></div>
                    {isCurrent && (
                        <div 
                            className="absolute h-[4px] bg-slate-300 dark:bg-slate-600 rounded-full" 
                            style={{ width: `${buffered * 100}%`}}
                        />
                    )}
                    <Slider
                        min={0}
                        max={trackDurationInSeconds}
                        value={isCurrent ? progress : 0}
                        onChange={isCurrent ? seekTo : undefined}
                        disabled={!isCurrent}
                        step={0.1}
                    />
                </div>
                <span className="text-xs text-slate-500 dark:text-white/60 w-10 text-center">
                    {formatTime(trackDurationInSeconds)}
                </span>
            </div>
        </div>
    );
};

export default AttachedTrack;