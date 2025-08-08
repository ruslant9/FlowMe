// frontend/src/components/music/ArtistAvatar.jsx --- ИСПРАВЛЕННЫЙ ФАЙЛ ---

import React from 'react';
import { motion } from 'framer-motion';
import Avatar from '../Avatar';
import { Link } from 'react-router-dom';

const ArtistAvatar = ({ artist, size = 'xl' }) => {
    // Проверка на случай, если данные еще не загрузились или некорректны
    if (!artist || !artist._id) return null;
    
    const formatArtistName = (name) => {
        if (!name || typeof name !== 'string') return '';
        if (name.endsWith(' - Topic')) {
            return name.substring(0, name.length - ' - Topic'.length).trim();
        }
        return name;
    };

    const artistName = formatArtistName(artist.name);

    return (
        <Link to={`/artist/${artist._id}`}>
            <motion.div
                className="flex flex-col items-center space-y-2 cursor-pointer group"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                <Avatar
                    username={artistName}
                    avatarUrl={artist.avatarUrl}
                    size={size}
                />
                <p className="text-sm font-semibold text-center truncate w-full group-hover:text-blue-400 transition-colors">
                    {artistName}
                </p>
            </motion.div>
        </Link>
    );
};

export default ArtistAvatar;