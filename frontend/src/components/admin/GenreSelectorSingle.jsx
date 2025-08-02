// frontend/components/admin/GenreSelectorSingle.jsx

import React from 'react';
import { motion } from 'framer-motion';
import { musicGenresRu } from '../../data/genres';

const GenreSelectorSingle = ({ selectedGenre, onGenreChange, label = "Жанр" }) => {

    const handleSelectGenre = (genre) => {
        // Если кликнули по уже выбранному, снимаем выбор
        if (selectedGenre === genre) {
            onGenreChange('');
        } else {
            onGenreChange(genre);
        }
    };

    return (
        <div>
            <label className="text-sm font-semibold block mb-2">{label} *</label>
            <div className="flex flex-wrap gap-2 p-3 bg-slate-200 dark:bg-slate-700/50 rounded-lg">
                {musicGenresRu.map(genre => {
                    const isSelected = selectedGenre === genre;
                    return (
                        <motion.button
                            key={genre}
                            type="button"
                            onClick={() => handleSelectGenre(genre)}
                            className={`px-3 py-2 text-xs font-semibold rounded-lg transition-all duration-200 text-center
                                ${isSelected 
                                    ? 'bg-blue-600 text-white ring-2 ring-blue-400' 
                                    : 'bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600'
                                }
                            `}
                            whileTap={{ scale: 0.95 }}
                        >
                            {genre}
                        </motion.button>
                    );
                })}
            </div>
        </div>
    );
};

export default GenreSelectorSingle;