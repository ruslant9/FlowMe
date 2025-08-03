// frontend/components/admin/ArtistSelector.jsx --- НОВЫЙ ФАЙЛ ---

import React, { useState, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, ChevronDown } from 'lucide-react';
import Avatar from '../Avatar';

const ArtistSelector = ({ artists, value, onChange, required = true }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [query, setQuery] = useState('');
    
    const selectedArtist = useMemo(() => 
        artists.find(a => a._id === value) || null
    , [artists, value]);

    const handleSelectAndClose = (artist) => {
        onChange(artist ? artist._id : '');
        setIsModalOpen(false);
    };

    const filteredArtists =
        query === ''
            ? artists
            : artists.filter((artist) =>
                artist.name.toLowerCase().includes(query.toLowerCase())
            );

    const ModalContent = () => (
        <AnimatePresence>
            {isModalOpen && ReactDOM.createPortal(
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={() => setIsModalOpen(false)}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
                >
                    <motion.div
                        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="ios-glass-final w-full max-w-lg p-6 rounded-3xl flex flex-col text-slate-900 dark:text-white max-h-[80vh]"
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Выбрать исполнителя</h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10"><X /></button>
                        </div>
                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input
                                type="text"
                                placeholder="Поиск по имени..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                autoFocus
                            />
                        </div>
                        <div className="flex-1 overflow-y-auto -mr-2 pr-2 space-y-2">
                            {filteredArtists.map(artist => (
                                <div
                                    key={artist._id}
                                    onClick={() => handleSelectAndClose(artist)}
                                    className="flex items-center space-x-4 p-2 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                    <Avatar size="md" username={artist.name} avatarUrl={artist.avatarUrl} />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold truncate">{artist.name}</p>
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

    return (
        <>
            <button
                type="button"
                // --- ИСПРАВЛЕНИЕ ЗДЕСЬ ---
                onClick={(e) => {
                    e.stopPropagation();
                    setIsModalOpen(true);
                }}
                // --- КОНЕЦ ИСПРАВЛЕНИЯ ---
                className="w-full h-[44px] px-3 py-2 rounded-lg bg-white dark:bg-slate-700 text-left flex items-center justify-between shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
                <span className="truncate">{selectedArtist?.name || 'Выберите исполнителя...'}</span>
                <ChevronDown className="h-5 w-5 text-gray-400" />
            </button>
            <ModalContent />
        </>
    );
};

export default ArtistSelector;