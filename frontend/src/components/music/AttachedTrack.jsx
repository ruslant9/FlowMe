// frontend/src/components/music/AttachedTrack.jsx — НОВАЯ ВЕРСИЯ

import React from 'react';
import { Play, Pause, Music, Loader2 } from 'lucide-react';
import Slider from 'rc-slider';
import { useMusicPlayer } from '../../context/MusicPlayerContext';
import { useCachedImage } from '../../hooks/useCachedImage';
import 'rc-slider/assets/index.css';

const CachedImage = ({ src, alt }) => {
    const { finalSrc, loading } = useCachedImage(src);
    if (loading) {
        return <div className="w-full h-full bg-slate-300 dark:bg-slate-700 animate-pulse" />;
    }
    return <img src={finalSrc} alt={alt} className="w-full h-full object-cover" />;
};

const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds < 0) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
};

const cleanTitle = (title) => {
    if (!title) return '';
    return title.replace(/\s*[\(\[].*?[\)\]]\s*$/i, '').trim();
};

const formatArtistName = (artist) => {
    if (!artist) return '';
    if (Array.isArray(artist)) return artist.map(a => a.name || '').join(', ');
    if (typeof artist === 'object' && artist.name) return artist.name;
    return artist;
};

export default function AttachedTrack({ track }) {
    const {
        playTrack, currentTrack, isPlaying, loadingTrackId, togglePlayPause,
        progress, seekTo, buffered
    } = useMusicPlayer();

    if (!track) return null;

    const isCurrent = currentTrack?._id === track._id;
    const isLoading = loadingTrackId === track._id;
    const trackDuration = track.durationMs ? track.durationMs / 1000 : 0;

    const handlePlayClick = (e) => {
        e.stopPropagation();
        if (isCurrent) {
            togglePlayPause();
        } else {
            playTrack(track, [track]);
        }
    };

    return (
        <div className="w-72 p-3 rounded-xl bg-slate-100 dark:bg-slate-800 shadow-sm space-y-3">
            {/* Верхняя часть — обложка и инфо */}
            <div className="flex items-center space-x-3">
                <div className="relative w-14 h-14 rounded-lg overflow-hidden group">
                    {track.albumArtUrl
                        ? <CachedImage src={track.albumArtUrl} alt={track.title} />
                        : <div className="w-full h-full flex items-center justify-center bg-slate-300 dark:bg-slate-700">
                            <Music className="text-slate-500" size={24} />
                        </div>
                    }
                    <button
                        onClick={handlePlayClick}
                        className={`absolute inset-0 flex items-center justify-center bg-black/50 text-white transition-opacity 
                            ${isCurrent || isLoading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                    >
                        {isLoading ? <Loader2 className="animate-spin" /> :
                            (isCurrent && isPlaying ? <Pause size={26} /> : <Play size={26} />)}
                    </button>
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{cleanTitle(track.title)}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{formatArtistName(track.artist)}</p>
                </div>
            </div>

            <div className="flex items-center space-x-2">
    <span className="text-xs w-10 text-center text-slate-500 dark:text-slate-300">
        {formatTime(isCurrent ? progress : 0)}
    </span>
    <div className="flex-grow relative">
        {/* Постоянный фон длины трека */}
        <div
            className="absolute top-1/2 -translate-y-1/2 h-[4px] w-full rounded-full bg-slate-300 dark:bg-slate-600"
        />
        {/* Буфер */}
        {buffered > 0 && (
            <div
                className="absolute top-1/2 -translate-y-1/2 h-[4px] rounded-full bg-slate-400 dark:bg-slate-500"
                style={{ width: `${buffered * 100}%` }}
            />
        )}
        {/* Прогресс */}
        <Slider
            min={0}
            max={trackDuration}
            value={isCurrent ? progress : 0}
            onChange={isCurrent ? seekTo : undefined}
            step={0.1}
            trackStyle={{ backgroundColor: '#3b82f6', height: 4 }}
            handleStyle={{
                borderColor: '#3b82f6',
                height: 14,
                width: 14,
                marginTop: -5,
                backgroundColor: '#fff'
            }}
            railStyle={{ backgroundColor: 'transparent', height: 4 }}
        />
    </div>
    <span className="text-xs w-10 text-center text-slate-500 dark:text-slate-300">
        {formatTime(trackDuration)}
    </span>
</div>
        </div>
    );
}