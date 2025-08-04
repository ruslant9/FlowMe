// frontend/components/admin/GenreSelector.jsx

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { musicGenresRu } from '../../data/genres';
import { Search, X } from 'lucide-react';
import toast from 'react-hot-toast'; // <-- 1. ИМПОРТИРУЕМ TOAST

const GENRE_DISPLAY_LIMIT = 18;

const GenreSelector = ({ selectedGenres, onGenreChange, label = "Жанр" }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isExpanded, setIsExpanded] = useState(false);

    const filteredGenres = useMemo(() => {
        if (!searchQuery) {
            return musicGenresRu;
        }
        return musicGenresRu.filter(genre =>
            genre.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [searchQuery]);

    const displayedGenres = useMemo(() => {
        return isExpanded ? filteredGenres : filteredGenres.slice(0, GENRE_DISPLAY_LIMIT);
    }, [filteredGenres, isExpanded]);

    const handleSelectGenre = (genre) => {
        const isSelected = selectedGenres.includes(genre);
        if (isSelected) {
            onGenreChange(selectedGenres.filter(g => g !== genre));
        } else {
            // --- НАЧАЛО ИСПРАВЛЕНИЯ: Добавляем проверку на лимит ---
            if (selectedGenres.length >= 5) {
                toast.error('Можно выбрать не более 5 жанров.');
                return;
            }
            // --- КОНЕЦ ИСПРАВЛЕНИЯ ---
            onGenreChange([...selectedGenres, genre]);
        }
    };

    return (
        <div>
            <label className="text-sm font-semibold block mb-2">{label} *</label>

            {/* --- НАЧАЛО ИСПРАВЛЕНИЯ: Блок для отображения выбранных жанров --- */}
            {selectedGenres.length > 0 && (
                <div className="mb-3">
                    <label className="text-sm font-semibold block mb-1 text-slate-500">Выбранные жанры ({selectedGenres.length}/5)</label>
                    <div className="flex flex-wrap gap-2 p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                        {selectedGenres.map(genre => (
                            <div key={genre} className="flex items-center space-x-2 bg-blue-100 dark:bg-blue-900/50 rounded-full py-1 pl-3 pr-1">
                                <span className="text-sm font-medium text-blue-800 dark:text-blue-200">{genre}</span>
                                <button
                                    type="button"
                                    onClick={() => handleSelectGenre(genre)}
                                    className="p-0.5 rounded-full text-blue-800 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800/50"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {/* --- КОНЕЦ ИСПРАВЛЕНИЯ --- */}

            <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                    type="text"
                    placeholder="Поиск жанра..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm rounded-lg bg-slate-200 dark:bg-slate-700/50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
            </div>
            
            <div className="p-3 bg-slate-200 dark:bg-slate-700/50 rounded-lg">
                <div className="flex flex-wrap gap-2">
                    {displayedGenres.map(genre => {
                        const isSelected = selectedGenres.includes(genre);
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
                {filteredGenres.length > GENRE_DISPLAY_LIMIT && (
                    <div className="mt-3 text-center">
                        <button
                            type="button"
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="text-sm font-semibold text-blue-500 hover:underline"
                        >
                            {isExpanded ? 'Скрыть' : `Показать еще ${filteredGenres.length - GENRE_DISPLAY_LIMIT}`}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GenreSelector;