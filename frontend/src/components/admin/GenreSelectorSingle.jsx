// frontend/components/admin/GenreSelectorSingle.jsx

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { musicGenresRu } from '../../data/genres';
import { Search } from 'lucide-react';

const GenreSelectorSingle = ({ selectedGenre, onGenreChange, label = "Жанр" }) => {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredGenres = useMemo(() => {
        if (!searchQuery) {
            return musicGenresRu;
        }
        return musicGenresRu.filter(genre =>
            genre.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [searchQuery]);

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
            {/* --- ИЗМЕНЕНИЕ ЗДЕСЬ: убраны классы max-h-48 и overflow-y-auto --- */}
            <div className="flex flex-wrap gap-2 p-3 bg-slate-200 dark:bg-slate-700/50 rounded-lg">
                {filteredGenres.map(genre => {
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