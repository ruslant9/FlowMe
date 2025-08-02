// frontend/components/admin/GenreSelector.jsx

import React from 'react';
import { motion } from 'framer-motion';
import { musicGenresRu } from '../../data/genres'; // Используем наш централизованный список жанров
import toast from 'react-hot-toast';

const GenreSelector = ({ selectedGenres, onGenreChange }) => {
    const MAX_GENRES = 3;

    const handleToggleGenre = (genre) => {
        const isSelected = selectedGenres.includes(genre);

        if (isSelected) {
            // Удаляем жанр из списка
            onGenreChange(selectedGenres.filter(g => g !== genre));
        } else {
            // Добавляем жанр, если лимит не превышен
            if (selectedGenres.length >= MAX_GENRES) {
                toast.error(`Можно выбрать не более ${MAX_GENRES} жанров.`);
                return;
            }
            onGenreChange([...selectedGenres, genre]);
        }
    };

    return (
        <div>
            <label className="text-sm font-semibold block mb-2">Жанры (до {MAX_GENRES})</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 p-3 bg-slate-200 dark:bg-slate-700/50 rounded-lg max-h-48 overflow-y-auto">
                {musicGenresRu.map(genre => {
                    const isSelected = selectedGenres.includes(genre);
                    return (
                        <motion.button
                            key={genre}
                            type="button"
                            onClick={() => handleToggleGenre(genre)}
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

export default GenreSelector;