// frontend/components/admin/GenreSelectorSingle.jsx

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { musicGenresRu } from '../../data/genres';
import { Search } from 'lucide-react';

const GENRE_DISPLAY_LIMIT = 18; // <-- КОЛИЧЕСТВО ЖАНРОВ ДЛЯ ОТОБРАЖЕНИЯ

const GenreSelectorSingle = ({ selectedGenre, onGenreChange, label = "Жанр" }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isExpanded, setIsExpanded] = useState(false); // <-- НОВОЕ СОСТОЯНИЕ

    const filteredGenres = useMemo(() => {
        if (!searchQuery) {
            return musicGenresRu;
        }
        return musicGenresRu.filter(genre =>
            genre.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [searchQuery]);

    // --- НАЧАЛО ИСПРАВЛЕНИЯ: Логика для отображения ограниченного списка ---
    const displayedGenres = useMemo(() => {
        return isExpanded ? filteredGenres : filteredGenres.slice(0, GENRE_DISPLAY_LIMIT);
    }, [filteredGenres, isExpanded]);
    // --- КОНЕЦ ИСПРАВЛЕНИЯ ---

    const handleSelectGenre = (genre) => {
        if (selectedGenre === genre) {
            onGenreChange('');
        } else {
            onGenreChange(genre);
        }
    };

    return (
        <div>
            <label className="text-sm font-semibold block mb-2">{label} *</label>
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
                    {/* --- ИСПРАВЛЕНИЕ: Используем displayedGenres вместо filteredGenres --- */}
                    {displayedGenres.map(genre => {
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
                 {/* --- НАЧАЛО ИСПРАВЛЕНИЯ: Кнопка для раскрытия списка --- */}
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
                {/* --- КОНЕЦ ИСПРАВЛЕНИЯ --- */}
            </div>
        </div>
    );
};

export default GenreSelectorSingle;