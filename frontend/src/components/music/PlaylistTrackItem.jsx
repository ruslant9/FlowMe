// frontend/src/components/music/PlaylistTrackItem.jsx
import React from 'react';
import { Play, Pause, Heart, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

// --- НАЧАЛО ИСПРАВЛЕНИЯ: Добавляем `accentColor` в пропсы ---
const PlaylistTrackItem = ({ track, index, onPlay, isCurrent, isPlaying, isSaved, onToggleSave, onRemoveFromPlaylist, accentColor = '#facc15' }) => {
    
    const cleanTitle = (title) => {
        if (!title) return '';
        return title.replace(
            /\s*[\(\[](?:\s*(?:official\s*)?(?:video|music\s*video|lyric\s*video|audio|live|performance|visualizer|explicit|single|edit|remix|radio\s*edit|clean|dirty|HD|HQ|full|album\s*version|version|clip|demo|teaser|cover|karaoke|instrumental|extended|rework|reedit|re-cut|reissue|bonus\s*track|unplugged|mood\s*video|concert|show|feat\.?|ft\.?|featuring|\d{4}|(?:\d{2,3}\s?kbps))\s*)[^)\]]*[\)\]]\s*$/i,
            ''
        ).trim();
    };

    const renderArtistLinks = (artistData) => {
        if (!artistData) return null;
        const artists = Array.isArray(artistData) ? artistData : [artistData];
        return (
            <>
                {artists.map((artist, idx) => {
                    if (!artist || !artist._id || !artist.name) {
                        return <span key={idx}>{artist.name || artist}</span>;
                    }
                    return (
                        <React.Fragment key={artist._id}>
                            <Link 
                                to={`/artist/${artist._id}`}
                                className="hover:underline hover:text-slate-700 dark:hover:text-white"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {artist.name.replace(' - Topic', '').trim()}
                            </Link>
                            {idx < artists.length - 1 && ', '}
                        </React.Fragment>
                    );
                })}
            </>
        );
    };
    
    const cleanedTitle = cleanTitle(track.title);

    const formatDuration = (ms) => {
        if (!ms) return '?:??';
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    return (
        <div 
            onDoubleClick={onPlay} 
            className={`grid grid-cols-[auto_1fr_auto] items-center gap-x-4 px-4 py-2 rounded-lg group hover:bg-slate-200/50 dark:hover:bg-white/10 ${isCurrent ? 'bg-slate-200/50 dark:bg-white/10' : ''}`}
        >
            <div className="flex items-center justify-center w-8 text-slate-600 dark:text-slate-400">
                {isCurrent ? (
                    // --- ИСПРАВЛЕНИЕ: Применяем accentColor к иконке ---
                    <button onClick={onPlay} style={{ color: accentColor }}>
                        {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                    </button>
                ) : (
                    <>
                        <span className="group-hover:hidden">{index}</span>
                        <button onClick={onPlay} className="hidden group-hover:block text-slate-800 dark:text-white">
                            <Play size={18} />
                        </button>
                    </>
                )}
            </div>
            <div className="flex items-center space-x-4 min-w-0">
                <img src={track.albumArtUrl} alt={cleanedTitle} className="w-10 h-10 rounded object-cover"/>
                <div className="min-w-0">
                    {/* --- ИСПРАВЛЕНИЕ: Применяем accentColor к названию трека --- */}
                    <p 
                        className="font-semibold truncate" 
                        style={isCurrent ? { color: accentColor } : {}}
                    >
                        {cleanedTitle}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                        {renderArtistLinks(track.artist)}
                    </p>
                </div>
            </div>
            <div className="flex items-center space-x-4 text-slate-600 dark:text-slate-400">
                {onRemoveFromPlaylist ? (
                     <button onClick={() => onRemoveFromPlaylist(track._id)} className="transition-colors text-slate-500 dark:text-slate-500 opacity-0 group-hover:opacity-100 hover:text-red-500">
                        <Trash2 size={18} />
                    </button>
                ) : (
                    <button onClick={() => onToggleSave(track)} className={`transition-colors ${isSaved ? 'text-red-500' : 'text-slate-500 dark:text-slate-500 opacity-0 group-hover:opacity-100 hover:text-slate-800 dark:hover:text-white'}`}>
                        <Heart size={18} fill={isSaved ? 'currentColor' : 'none'}/>
                    </button>
                )}
                <span className="text-sm w-10 text-right">{formatDuration(track.durationMs)}</span>
            </div>
        </div>
    );
};

export default PlaylistTrackItem;