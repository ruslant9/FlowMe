// frontend/src/components/music/AttachedTrack.jsx

import React from 'react';
import { Music } from 'lucide-react';
import { useCachedImage } from '../../hooks/useCachedImage';

const API_URL = import.meta.env.VITE_API_URL;

const CachedImage = ({ src, alt }) => {
    const { finalSrc, loading } = useCachedImage(src);
    if (loading) {
        return <div className="w-full h-full object-cover bg-slate-200 dark:bg-slate-700 animate-pulse"></div>;
    }
    return <img src={finalSrc} alt={alt} className="w-full h-full object-cover"/>;
};

const AttachedTrack = ({ track }) => {
    
    const cleanTitle = (title) => {
        if (!title) return '';
        return title.replace(/\s*[\(\[](?:\s*(?:official\s*)?(?:video|music\s*video|lyric\s*video|audio|live|performance|visualizer|explicit|single|edit|remix|radio\s*edit|clean|dirty|HD|HQ|full|album\s*version|version|clip|demo|teaser|cover|karaoke|instrumental|extended|rework|reedit|re-cut|reissue|bonus\s*track|unplugged|mood\s*video|concert|show|feat\.?|ft\.?|featuring|\d{4}|(?:\d{2,3}\s?kbps))\s*)[^)\]]*[\)\]]\s*$/i, '').trim();
    };

    const formatArtistName = (artistData) => {
        if (!artistData) return '';
        if (Array.isArray(artistData)) return artistData.map(a => (a.name || '').replace(' - Topic', '').trim()).join(', ');
        if (typeof artistData === 'object' && artistData.name) return artistData.name.replace(' - Topic', '').trim();
        if (typeof artistData === 'string') return artistData.replace(' - Topic', '').trim();
        return '';
    }; 
    
    if (!track) return null;

    return (
        // --- ИСПРАВЛЕНИЕ: Добавлен фон, отступы и скругление для самодостаточности компонента ---
        <div className="flex flex-col space-y-2 w-64 md:w-72 p-2 rounded-lg bg-slate-100 dark:bg-slate-700/50">
            <div className="flex items-start space-x-3">
                <div className="relative w-14 h-14 rounded-md overflow-hidden flex-shrink-0">
                    {track.albumArtUrl ? <CachedImage src={track.albumArtUrl} alt={track.title} /> : <div className="w-full h-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center"><Music size={24} className="text-slate-400"/></div>}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{cleanTitle(track.title)}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{formatArtistName(track.artist)}</p>
                </div>
            </div>
            {/* --- ИСПРАВЛЕНИЕ: Кастомный плеер заменен на стандартный HTML5 элемент --- */}
            <div className="w-full">
                <audio src={track.storageKey} controls className="w-full h-10" />
            </div>
        </div>
    );
};

export default AttachedTrack;