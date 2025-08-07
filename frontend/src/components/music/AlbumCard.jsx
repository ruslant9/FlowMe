// frontend/src/components/music/AlbumCard.jsx --- ИСПРАВЛЕННЫЙ ФАЙЛ ---

import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Music } from 'lucide-react';
import { useCachedImage } from '../../hooks/useCachedImage'; 

const CachedImage = ({ src, alt }) => {
    const { finalSrc, loading } = useCachedImage(src);
    if (loading) {
        return <div className="w-full h-full bg-slate-200 dark:bg-slate-800 animate-pulse"></div>;
    }
    return <img src={finalSrc} alt={alt} className="w-full h-full object-cover" />;
};

const AlbumCard = ({ album }) => {
    const linkTo = album.isSingle ? `/single/${album._id}` : `/album/${album._id}`;
    
    // --- НАЧАЛО ИСПРАВЛЕНИЯ: Функция сделана более надежной ---
    const getArtistDisplay = (artistData) => {
        if (!artistData) return '';
        if (Array.isArray(artistData)) {
            // Безопасно обрабатываем каждый элемент массива
            return artistData.map(a => (a?.name || '')).filter(Boolean).join(', ');
        }
        if (typeof artistData === 'object' && artistData !== null && artistData.name) {
            return artistData.name;
        }
        // Если это строка (например, только ID), не рендерим ничего
        if (typeof artistData === 'string') {
             return ''; // или можно вернуть artistData, если это имя
        }
        // Возвращаем пустую строку в любом другом случае, чтобы избежать ошибки
        return '';
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
                        {getArtistDisplay(album.artist)}{album.releaseDate && ` • ${new Date(album.releaseDate).getFullYear()}`}
                    </p>
                </div>
            </motion.div>
        </Link>
    );
};

export default AlbumCard;