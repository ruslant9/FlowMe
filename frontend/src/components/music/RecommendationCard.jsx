// frontend/src/components/music/RecommendationCard.jsx

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Loader2 } from 'lucide-react';
import { useCachedImage } from '../../hooks/useCachedImage'; // ИМПОРТ

const RecommendationCard = ({ track, isCurrent, isPlaying, isLoading, onPlayPause, onSelectTrack }) => {
    
    // Используем хук для получения кешированного URL
    const { finalSrc, loading: imageLoading } = useCachedImage(track.albumArtUrl);

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
        if (typeof artistData === 'object' && artistData.name) {
            return artistData.name.replace(' - Topic', '').trim();
        }
        if (typeof artistData === 'string') {
            return artistData.replace(' - Topic', '').trim();
        }
        return '';
    };

    const getReleaseBadge = (releaseDate) => {
        if (!releaseDate) return null;

        const now = new Date();
        now.setHours(0, 0, 0, 0); // Сбрасываем время для корректного сравнения дат

        const release = new Date(releaseDate);
        release.setHours(0, 0, 0, 0);

        if (release.getFullYear() > now.getFullYear() || (release.getFullYear() === now.getFullYear() && release.getMonth() >= now.getMonth())) {
            return { text: 'Свежее', color: 'bg-lime-400 text-lime-900' };
        }

        // "Недавнее": если релиз был в прошлом месяце
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        if (release.getFullYear() === lastMonth.getFullYear() && release.getMonth() === lastMonth.getMonth()) {
            return { text: 'Недавнее', color: 'bg-orange-400 text-orange-900' };
        }
        // --- КОНЕЦ ИСПРАВЛЕНИЯ ---

        return null;
    };

    const handlePlayClick = (e) => {
        e.stopPropagation();
        if (isCurrent) {
            onPlayPause();
        } else {
            onSelectTrack();
        }
    };

    const badge = getReleaseBadge(track.releaseDate);

    return (
        <motion.div
            className="flex-shrink-0 w-full rounded-2xl flex flex-col p-4 relative overflow-hidden group aspect-[4/5] cursor-pointer"
            whileHover={{ scale: 1.02, y: -5 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            onClick={onSelectTrack}
        >
            <motion.div 
                className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110" 
                style={{ backgroundImage: `url(${finalSrc || ''})` }}
            >
                {imageLoading && <div className="w-full h-full bg-slate-800 animate-pulse"></div>}
            </motion.div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
            
            <AnimatePresence>
                {badge && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-bold z-10 ${badge.color}`}
                    >
                        {badge.text}
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="absolute top-4 right-4 z-20">
                 <button
                    onClick={handlePlayClick}
                    className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 hover:scale-110 transition-transform opacity-0 group-hover:opacity-100"
                >
                    {isLoading ? <Loader2 className="animate-spin" /> : (isCurrent && isPlaying ? <Pause size={20} /> : <Play size={20} />)}
                </button>
            </div>

            <div className="relative z-10 text-white mt-auto">
                <h3 className="text-base font-bold truncate">{cleanTitle(track.title)}</h3>
                <p className="text-xs opacity-80 truncate">{formatArtistName(track.artist)}</p>
            </div>
        </motion.div>
    );
};

export default RecommendationCard;