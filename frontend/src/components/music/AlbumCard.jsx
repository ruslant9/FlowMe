// frontend/src/components/music/AlbumCard.jsx

import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Music } from 'lucide-react';
import { useCachedImage } from '../../hooks/useCachedImage'; // ИМПОРТ

// Компонент для кешированного изображения
const CachedImage = ({ src, alt }) => {
    const { finalSrc, loading } = useCachedImage(src);
    if (loading) {
        return <div className="w-full h-full bg-slate-200 dark:bg-slate-800 animate-pulse"></div>;
    }
    return <img src={finalSrc} alt={alt} className="w-full h-full object-cover" />;
};


const AlbumCard = ({ album }) => {
    const linkTo = album.isSingle ? `/single/${album._id}` : `/album/${album._id}`;
    
    // --- НАЧАЛО ИСПРАВЛЕНИЯ: Функция для форматирования имени(имен) артистов ---
    const getArtistDisplay = (artistData) => {
        if (!artistData) return '';
        if (Array.isArray(artistData)) {
            return artistData.map(a => a.name).join(', ');
        }
        return artistData.name;
    };
    // --- КОНЕЦ ИСПРАВЛЕНИЯ ---

    return (
        <Link to={linkTo}>
            <motion.div
                className="flex-shrink-0 w-full group cursor-pointer"
                whileHover={{ y: -5 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            >
                <div className="relative aspect-square rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-800">
                    {album.coverArtUrl ? (
                        <CachedImage src={album.coverArtUrl} alt={album.title} />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <Music size={48} />
                        </div>
                    )}
                </div>
                <div className="mt-2">
                    <p className="font-semibold text-sm truncate group-hover:text-blue-400 transition-colors">{album.title}</p>
                    <p className="text-xs text-slate-500 truncate">
                        {/* --- ИСПРАВЛЕНИЕ: Используем новую функцию --- */}
                        {getArtistDisplay(album.artist)}{album.releaseYear && ` • ${album.releaseYear}`}
                    </p>
                </div>
            </motion.div>
        </Link>
    );
};

export default AlbumCard;