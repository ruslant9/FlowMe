// frontend/src/components/music/ArtistAvatar.jsx

import React from 'react';
import { motion } from 'framer-motion';
import Avatar from '../Avatar';
import { Link } from 'react-router-dom';

// --- ИСПРАВЛЕНИЕ: Компонент теперь принимает весь объект артиста ---
const ArtistAvatar = ({ artist }) => {
    // Проверка на случай, если данные еще не загрузились
    if (!artist) return null;
    
    // Функция для очистки имени артиста от приписки "- Topic"
    const formatArtistName = (name) => {
        if (!name) return '';
        if (name.endsWith(' - Topic')) {
            return name.substring(0, name.length - ' - Topic'.length).trim();
        }
        return name;
    };

    return (
        // Вся карточка является ссылкой на страницу артиста
        <Link to={`/artist/${artist._id}`}>
            <motion.div
                className="flex flex-col items-center space-y-2 cursor-pointer group"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                <Avatar
                    username={artist.name} // Для fallback-аватара и alt-текста
                    avatarUrl={artist.avatarUrl}
                    size="xl"
                />
                <p className="text-sm font-semibold text-center truncate w-24 group-hover:text-blue-400 transition-colors">
                    {/* КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ: Мы используем artist.name (строку), а не весь объект artist */}
                    {formatArtistName(artist.name)}
                </p>
            </motion.div>
        </Link>
    );
};

export default ArtistAvatar;