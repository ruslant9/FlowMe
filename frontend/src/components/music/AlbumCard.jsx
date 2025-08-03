// frontend/src/components/music/AlbumCard.jsx

import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Music } from 'lucide-react';

const AlbumCard = ({ album }) => {
    // --- ИСПРАВЛЕНИЕ: Динамически определяем URL в зависимости от того, сингл это или альбом ---
    const linkTo = album.isSingle ? `/single/${album._id}` : `/album/${album._id}`;
    
    return (
        <Link to={linkTo}>
            <motion.div
                className="flex-shrink-0 w-full group cursor-pointer"
                whileHover={{ y: -5 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            >
                <div className="relative aspect-square rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-800">
                    {album.coverArtUrl ? (
                        <img src={album.coverArtUrl} alt={album.title} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <Music size={48} />
                        </div>
                    )}
                </div>
                <div className="mt-2">
                    <p className="font-semibold text-sm truncate group-hover:text-blue-400 transition-colors">{album.title}</p>
                    <p className="text-xs text-slate-500 truncate">
                        {album.artist.name}{album.releaseYear && ` • ${album.releaseYear}`}
                    </p>
                </div>
            </motion.div>
        </Link>
    );
};

export default AlbumCard;