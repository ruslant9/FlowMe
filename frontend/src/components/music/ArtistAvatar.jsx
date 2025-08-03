// frontend/src/components/music/ArtistAvatar.jsx
import React from 'react';
import { motion } from 'framer-motion';
import Avatar from '../Avatar';

const ArtistAvatar = ({ artistName, onClick, avatarUrl }) => {
    // --- НАЧАЛО ИСПРАВЛЕНИЯ ---
    const formatArtistName = (artist) => {
        if (!artist) return '';
        
        // Эта функция получает только строку, поэтому логика простая
        if (typeof artist === 'string') {
            if (artist.endsWith(' - Topic')) {
                return artist.substring(0, artist.length - ' - Topic'.length).trim();
            }
        }
        return artist;
    };
    // --- КОНЕЦ ИСПРАВЛЕНИЯ ---

    return (
        <motion.div
            onClick={onClick}
            className="flex flex-col items-center space-y-2 cursor-pointer group"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
        >
            <Avatar
                username={artistName}
                avatarUrl={avatarUrl}
                size="xl"
            />
            <p className="text-sm font-semibold text-center truncate w-24 group-hover:text-blue-400 transition-colors">
                {formatArtistName(artistName)}
            </p>
        </motion.div>
    );
};

export default ArtistAvatar;