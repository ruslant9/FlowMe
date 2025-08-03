// frontend/src/components/music/ArtistAvatar.jsx
import React from 'react';
import { motion } from 'framer-motion';
import Avatar from '../Avatar';
import { Link } from 'react-router-dom';

// --- НАЧАЛО ИСПРАВЛЕНИЯ: Компонент теперь принимает весь объект артиста ---
const ArtistAvatar = ({ artist }) => {
    if (!artist) return null;
    
    const formatArtistName = (name) => {
        if (!name) return '';
        if (name.endsWith(' - Topic')) {
            return name.substring(0, name.length - ' - Topic'.length).trim();
        }
        return name;
    };
    // --- КОНЕЦ ИСПРАВЛЕНИЯ ---

    return (
        // --- ИСПРАВЛЕНИЕ: Оборачиваем все в Link ---
        <Link to={`/artist/${artist._id}`}>
            <motion.div
                className="flex flex-col items-center space-y-2 cursor-pointer group"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                <Avatar
                    username={artist.name}
                    avatarUrl={artist.avatarUrl}
                    size="xl"
                />
                <p className="text-sm font-semibold text-center truncate w-24 group-hover:text-blue-400 transition-colors">
                    {formatArtistName(artist.name)}
                </p>
            </motion.div>
        </Link>
    );
};

export default ArtistAvatar;