// frontend/src/components/music/PlaylistTrackItem.jsx
import React from 'react';
import { Play, Pause, Heart, Trash2 } from 'lucide-react';

const PlaylistTrackItem = ({ track, index, onPlay, isCurrent, isPlaying, isSaved, onToggleSave, onRemoveFromPlaylist }) => {
    
    // --- НАЧАЛО ИЗМЕНЕНИЯ: Внедряем новую, улучшенную функцию очистки ---
    const cleanTitle = (title) => {
        if (!title) return '';
        // Эта версия удаляет текст как в круглых (), так и в квадратных [] скобках, а также множество других "мусорных" слов.
        return title.replace(
            /\s*[\(\[](?:\s*(?:official\s*)?(?:video|music\s*video|lyric\s*video|audio|live|performance|visualizer|explicit|single|edit|remix|radio\s*edit|clean|dirty|HD|HQ|full|album\s*version|version|clip|demo|teaser|cover|karaoke|instrumental|extended|rework|reedit|re-cut|reissue|bonus\s*track|unplugged|mood\s*video|concert|show|feat\.?|ft\.?|featuring|\d{4}|(?:\d{2,3}\s?kbps))\s*)[^)\]]*[\)\]]\s*$/i,
            ''
        ).trim();
    };

    const cleanArtist = (artist) => {
        if (!artist) return '';
        // Удаляет " - Topic" в конце строки
        if (artist.endsWith(' - Topic')) {
            return artist.substring(0, artist.length - ' - Topic'.length).trim();
        }
        return artist;
    };

    const cleanedTitle = cleanTitle(track.title);
    const cleanedArtist = Array.isArray(track.artist) ? track.artist.map(a => cleanArtist(a.name)).join(', ') : cleanArtist(track.artist?.name);
    // --- КОНЕЦ ИЗМЕНЕНИЯ ---

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
            className={`grid grid-cols-[auto_1fr_auto] items-center gap-x-4 px-4 py-2 rounded-lg group hover:bg-slate-200/50 dark:hover:bg-white/10 ${isCurrent ? 'bg-blue-500/10 dark:bg-blue-500/20' : ''}`}
        >
            <div className="flex items-center justify-center w-8 text-slate-600 dark:text-slate-400">
                {isCurrent ? (
                    <button onClick={onPlay} className="text-yellow-400">
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
                    <p className={`font-semibold truncate ${isCurrent ? 'text-yellow-400' : 'text-slate-800 dark:text-white'}`}>{cleanedTitle}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{cleanedArtist}</p>
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