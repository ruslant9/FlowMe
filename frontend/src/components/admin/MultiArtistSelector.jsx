// frontend/components/admin/MultiArtistSelector.jsx

import React, { useState, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, ChevronDown, Check } from 'lucide-react';
import Avatar from '../Avatar';

const MultiArtistSelectorModal = ({ isOpen, onClose, artists, excludeIds, onSave, initialSelection }) => {
    const [query, setQuery] = useState('');
    const [tempSelection, setTempSelection] = useState(initialSelection);
    const handleToggle = (artistId) => {
        setTempSelection(prev => 
            prev.includes(artistId) ? prev.filter(id => id !== artistId) : [...prev, artistId]
        );
    };
    const handleSaveClick = () => { onSave(tempSelection); onClose(); };
    const availableArtists = useMemo(() => artists.filter(a => !excludeIds.includes(a._id)), [artists, excludeIds]);
    const filteredArtists = useMemo(() => query === '' ? availableArtists : availableArtists.filter((artist) => artist.name.toLowerCase().includes(query.toLowerCase())), [availableArtists, query]);
    
    return (
        <AnimatePresence>
            {isOpen && ReactDOM.createPortal(
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} onClick={(e) => e.stopPropagation()} className="ios-glass-final w-full max-w-lg p-6 rounded-3xl flex flex-col text-slate-900 dark:text-white max-h-[80vh]">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Выбрать исполнителей</h2>
                            <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10"><X /></button>
                        </div>
                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input type="text" placeholder="Поиск..." value={query} onChange={e => setQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg" autoFocus />
                        </div>
                        <div className="flex-1 overflow-y-auto -mr-2 pr-2 space-y-2">
                            {filteredArtists.map(artist => {
                                const isSelected = tempSelection.includes(artist._id);
                                return (
                                    <div key={artist._id} onClick={() => handleToggle(artist._id)} className={`flex items-center justify-between p-2 rounded-lg cursor-pointer ${isSelected ? 'bg-blue-500/20' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                                        <div className="flex items-center space-x-3">
                                            <Avatar size="md" username={artist.name} avatarUrl={artist.avatarUrl} />
                                            <span className="font-semibold">{artist.name}</span>
                                        </div>
                                        {isSelected && <Check className="text-blue-500" />}
                                    </div>
                                )
                            })}
                        </div>
                        <div className="mt-6 flex justify-end">
                            <button onClick={handleSaveClick} className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700">Сохранить ({tempSelection.length})</button>
                        </div>
                    </motion.div>
                </motion.div>,
                document.getElementById('modal-root')
            )}
        </AnimatePresence>
    );
};

const MultiArtistSelector = ({ artists, value, onChange, required = true, excludeIds = [] }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const selectedArtists = useMemo(() => value.map(id => artists.find(a => a._id === id)).filter(Boolean), [artists, value]);
    const handleRemove = (artistId) => { onChange(value.filter(id => id !== artistId)); };

    return (
        <>
            <div
                onClick={(e) => {
                    e.stopPropagation();
                    setIsModalOpen(true);
                }}
                className="w-full border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 cursor-pointer"
            >
                <div className="flex flex-wrap gap-2 p-2 items-center min-h-[44px] relative">
                    {selectedArtists.map(artist => (
                        <div key={artist._id} className="flex items-center space-x-2 bg-blue-100 dark:bg-blue-900/50 rounded-full pl-1 pr-2 py-0.5">
                            <Avatar size="sm" username={artist.name} avatarUrl={artist.avatarUrl} />
                            <span className="text-sm font-medium">{artist.name}</span>
                            <button type="button" onClick={(e) => { e.stopPropagation(); handleRemove(artist._id); }} className="p-0.5 rounded-full hover:bg-red-200 dark:hover:bg-red-800/50">
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                    {value.length === 0 && <span className="text-sm text-slate-400 pl-2">Добавьте исполнителей...</span>}
                    <ChevronDown className="h-5 w-5 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2" aria-hidden="true" />
                </div>
            </div>
            <MultiArtistSelectorModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                artists={artists}
                excludeIds={excludeIds}
                initialSelection={value}
                onSave={onChange}
            />
        </>
    );
};

export default MultiArtistSelector;