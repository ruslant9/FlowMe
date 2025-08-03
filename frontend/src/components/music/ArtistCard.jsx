// frontend/src/components/music/ArtistCard.jsx

import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Avatar from '../Avatar';

const ArtistCard = ({ artist }) => {
    // В будущем здесь можно добавить ссылку на страницу артиста
    // <Link to={`/artist/${artist._id}`}>
    return (
        <motion.div
            className="flex-shrink-0 w-full flex flex-col items-center text-center group cursor-pointer"
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
        >
            <Avatar username={artist.name} avatarUrl={artist.avatarUrl} size="xl" />
            <p className="mt-2 font-semibold text-sm truncate w-full group-hover:text-blue-400 transition-colors">
                {artist.name}
            </p>
        </motion.div>
    );
};

export default ArtistCard;