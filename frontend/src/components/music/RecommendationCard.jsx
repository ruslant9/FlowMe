// frontend/src/components/music/RecommendationCard.jsx

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Loader2 } from 'lucide-react';
import { useCachedImage } from '../../hooks/useCachedImage'; // ИМПОРТ

const RecommendationCard = ({ track, isCurrent, isPlaying, isLoading, onPlayPause, onSelectTrack, isHit }) => {
    
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
        const release = new Date(releaseDate);
        
        // Проверяем, валидна ли дата релиза
        if (isNaN(release.getTime())) return null;

        // Нормализуем даты до полуночи по UTC, чтобы игнорировать время и часовые пояса
        const utcNow = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        release.setHours(0, 0, 0, 0);

        const diffDays = (today.getTime() - release.getTime()) / (1000 * 60 * 60 * 24);

        if (diffDays >= 0 && diffDays <= 14) {
            return { text: 'Новое', color: 'bg-lime-400 text-lime-900' };
        }

        if (diffDays > 14 && diffDays <= 60) {
            return { text: 'Недавнее', color: 'bg-orange-400 text-orange-900' };
        }
        
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

    const dateBadge = getReleaseBadge(track.releaseDate);
    const finalBadge = isHit ? { text: 'Хит', color: 'bg-red-500 text-white' } : dateBadge;

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
                {finalBadge && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-bold z-10 ${finalBadge.color}`}
                    >
                        {finalBadge.text}
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