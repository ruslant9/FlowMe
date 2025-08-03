// frontend/src/components/music/RecommendationCard.jsx

import React from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Loader2 } from 'lucide-react';

const RecommendationCard = ({ track, isCurrent, isPlaying, isLoading, onPlayPause, onSelectTrack }) => {
    
    // --- НАЧАЛО ИСПРАВЛЕНИЯ: Добавляем универсальные функции ---
    const cleanTitle = (title) => {
        if (!title) return '';
        // Эта функция убирает из названия трека лишние приписки (official audio, music video и т.д.)
        return title.replace(
            /\s*[\(\[](?:\s*(?:official\s*)?(?:video|music\s*video|lyric\s*video|audio|live|performance|visualizer|explicit|single|edit|remix|radio\s*edit|clean|dirty|HD|HQ|full|album\s*version|version|clip|demo|teaser|cover|karaoke|instrumental|extended|rework|reedit|re-cut|reissue|bonus\s*track|unplugged|mood\s*video|concert|show|feat\.?|ft\.?|featuring|\d{4}|(?:\d{2,3}\s?kbps))\s*)[^)\]]*[\)\]]\s*$/i,
            ''
        ).trim();
    };

    const formatArtistName = (artistData) => {
        if (!artistData) return '';
        // Если это массив объектов (новый формат из БД)
        if (Array.isArray(artistData)) {
            return artistData.map(a => (a.name || '').replace(' - Topic', '').trim()).join(', ');
        }
        // Если это объект (может прийти в некоторых случаях)
        if (typeof artistData === 'object' && artistData.name) {
            return artistData.name.replace(' - Topic', '').trim();
        }
        // Если это просто строка (старый формат)
        if (typeof artistData === 'string') {
            return artistData.replace(' - Topic', '').trim();
        }
        return '';
    };
    // --- КОНЕЦ ИСПРАВЛЕНИЯ ---
    
    const handlePlayClick = (e) => {
        e.stopPropagation();
        if (isCurrent) {
            onPlayPause();
        } else {
            onSelectTrack(); // Функция onSelectTrack уже знает, какой трек выбрать
        }
    };

    return (
        <motion.div
            className="flex-shrink-0 w-full rounded-2xl flex flex-col p-4 relative overflow-hidden group aspect-[4/5]"
            whileHover={{ scale: 1.02, y: -5 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            onClick={onSelectTrack}
        >
            <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110" style={{ backgroundImage: `url(${track.albumArtUrl})` }}></div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
            
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
                {/* Применяем новую универсальную функцию */}
                <p className="text-xs opacity-80 truncate">{formatArtistName(track.artist)}</p>
            </div>
        </motion.div>
    );
};

export default RecommendationCard;