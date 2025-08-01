import React from 'react';
import { Play, Pause, Music, Loader2 } from 'lucide-react';
import { useMusicPlayer } from '../../context/MusicPlayerContext';
import Slider from 'rc-slider';

const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds < 0) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
};

const AttachedTrack = ({ track }) => {
    const {
        playTrack,
        currentTrack,
        isPlaying,
        loadingTrackId,
        togglePlayPause,
        progress,
        duration,
        seekTo,
        buffered
    } = useMusicPlayer();

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
    
    if (!track) return null;

    const isCurrent = currentTrack?.youtubeId === track.youtubeId;
    const isLoading = loadingTrackId === track.youtubeId;

    const handlePlayClick = (e) => {
        e.stopPropagation();
        if (isCurrent) {
            togglePlayPause();
        } else {
            playTrack(track, [track]); // Play this single track as a playlist of one
        }
    };

    return (
        <div className="flex flex-col space-y-2">
            <div className="flex items-start space-x-3">
                <div className="relative w-14 h-14 rounded-md overflow-hidden flex-shrink-0">
                    {track.albumArtUrl ? (
                        <img src={track.albumArtUrl} alt={track.title} className="w-full h-full object-cover"/>
                    ) : (
                        <div className="w-full h-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                            <Music size={24} className="text-slate-400"/>
                        </div>
                    )}
                    <button
                        onClick={handlePlayClick}
                        className={`absolute inset-0 bg-black/50 flex items-center justify-center text-white 
                            ${isCurrent || isLoading ? 'opacity-100' : 'opacity-0 hover:opacity-100'} 
                            transition-opacity`}
                    >
                        {isLoading ? (
                            <Loader2 className="animate-spin" />
                        ) : isCurrent && isPlaying ? (
                            <Pause size={28} />
                        ) : (
                            <Play size={28} />
                        )}
                    </button>
                </div>
                <div className="flex-1 min-w-0">
                    {/* --- ИЗМЕНЕНИЕ --- */}
                    <p className="font-bold truncate">{cleanTitle(track.title)}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{Array.isArray(track.artist) ? track.artist.map(a => cleanArtist(a.name)).join(', ') : cleanArtist(track.artist)}</p>
                    {/* --- КОНЕЦ ИЗМЕНЕНИЯ --- */}
                </div>
            </div>
            {isCurrent && (
                <div className="flex items-center w-full space-x-2 mb-1">
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
                            onChange={seekTo}
                            step={0.1}
                        />
                    </div>
                    <span className="text-xs text-slate-500 dark:text-white/60 w-10 text-center">{formatTime(duration)}</span>
                </div>
            )}
        </div>
    );
};

export default AttachedTrack;