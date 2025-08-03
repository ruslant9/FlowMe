// frontend/components/admin/AlbumSelector.jsx

import React, { useState, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, ChevronDown, Music } from 'lucide-react';

// --- Модальное окно вынесено в отдельный компонент ---
const AlbumSelectorModal = ({ isOpen, onClose, albums, onSelect }) => {
    const [query, setQuery] = useState('');

    const filteredAlbums = useMemo(() => 
        query === ''
            ? albums
            : albums.filter((album) =>
                album.title.toLowerCase().includes(query.toLowerCase()) ||
                album.artist.name.toLowerCase().includes(query.toLowerCase())
            )
    , [albums, query]);

    return (
        <AnimatePresence>
            {isOpen && ReactDOM.createPortal(
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
                >
                    <motion.div
                        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="ios-glass-final w-full max-w-lg p-6 rounded-3xl flex flex-col text-slate-900 dark:text-white max-h-[80vh]"
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Выбрать альбом</h2>
                            <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10"><X /></button>
                        </div>
                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input
                                type="text"
                                placeholder="Поиск по названию или артисту..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                autoFocus
                            />
                        </div>
                        <div className="flex-1 overflow-y-auto -mr-2 pr-2 space-y-2">
                            <div
                                onClick={() => onSelect(null)}
                                className="flex items-center space-x-4 p-2 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                                <div className="w-12 h-12 flex-shrink-0 bg-slate-200 dark:bg-slate-700 rounded-md flex items-center justify-center">
                                    <Music/>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold">-- Сольный трек (сингл) --</p>
                                </div>
                            </div>
                            {filteredAlbums.map(album => (
                                <div
                                    key={album._id}
                                    onClick={() => onSelect(album)}
                                    className="flex items-center space-x-4 p-2 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                    <div className="relative w-12 h-12 flex-shrink-0">
                                        <img src={album.coverArtUrl} alt={album.title} className="w-full h-full rounded-md object-cover"/>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold truncate">{album.title}</p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{album.artist.name}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </motion.div>,
                document.getElementById('modal-root')
            )}
        </AnimatePresence>
    );
};


const AlbumSelector = ({ albums, value, onChange, disabled = false }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const selectedAlbum = useMemo(() =>
        albums.find(a => a._id === value) || null
    , [albums, value]);

    const handleSelect = (album) => {
        onChange(album ? album._id : '');
        setIsModalOpen(false);
    };

    return (
        <>
            <button
                type="button"
                onClick={(e) => {
        e.stopPropagation(); // <-- ДОБАВИТЬ ЭТУ СТРОКУ
        if (!disabled) setIsModalOpen(true);
    }}
                disabled={disabled}
                className="w-full h-[44px] px-3 py-2 rounded-lg bg-white dark:bg-slate-700 text-left flex items-center justify-between shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50"
            >
                <span className="truncate">{selectedAlbum?.title || '-- Сольный трек (сингл) --'}</span>
                <ChevronDown className="h-5 w-5 text-gray-400" />
            </button>
            <AlbumSelectorModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                albums={albums}
                onSelect={handleSelect}
            />
        </>
    );
};

export default AlbumSelector;