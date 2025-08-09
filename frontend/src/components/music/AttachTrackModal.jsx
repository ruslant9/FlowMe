// frontend/src/components/music/AttachTrackModal.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Loader2 } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useCachedImage } from '../../hooks/useCachedImage'; // ИМПОРТ
import ReactDOM from 'react-dom';

const API_URL = import.meta.env.VITE_API_URL;

// Компонент для кешированного изображения
const CachedImage = ({ src, alt }) => {
    const { finalSrc, loading } = useCachedImage(src);
    if (loading) {
        return <div className="w-12 h-12 rounded-md object-cover bg-slate-200 dark:bg-slate-700 animate-pulse"></div>;
    }
    return <img src={finalSrc} alt={alt} className="w-12 h-12 rounded-md object-cover"/>;
};

const AttachTrackModal = ({ isOpen, onClose, onSelectTrack }) => {
    const [myMusic, setMyMusic] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchMyMusic = useCallback(async () => {
        if (!isOpen) return;
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/api/music/saved`, { headers: { Authorization: `Bearer ${token}` } });
            setMyMusic(res.data);
        } catch (error) {
            toast.error("Не удалось загрузить вашу музыку.");
        } finally {
            setLoading(false);
        }
    }, [isOpen]);

    useEffect(() => {
        fetchMyMusic();
    }, [fetchMyMusic]);

    // --- НАЧАЛО ИСПРАВЛЕНИЯ ---
    const formatArtistName = (artistData) => {
        if (!artistData) return '';
        if (Array.isArray(artistData)) {
            return artistData.map(a => (a.name || '').replace(' - Topic', '').trim()).join(', ');
        }
        if (typeof artistData === 'object' && artistData.name) {
            return artistData.name.replace(' - Topic', '').trim();
        }
        if (typeof artistData === 'string') {
            return artistData.replace(' - Topic', '').trim();
        }
        return '';
    };
    // --- КОНЕЦ ИСПРАВЛЕНИЯ ---

    const handleSelect = (track) => {
        onSelectTrack(track);
        onClose();
    };

    const filteredMusic = myMusic.filter(track =>
        track.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        formatArtistName(track.artist).toLowerCase().includes(searchTerm.toLowerCase())
    );

    return ReactDOM.createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4"
                >
                    <motion.div
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.9, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="ios-glass-final w-full max-w-lg p-6 rounded-3xl flex flex-col text-slate-900 dark:text-white max-h-[80vh]"
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Прикрепить трек</h2>
                            <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10"><X /></button>
                        </div>

                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input
                                type="text"
                                placeholder="Поиск по моей музыке..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="flex-1 overflow-y-auto -mr-2 pr-2 space-y-2">
                            {loading ? (
                                <div className="text-center p-8"><Loader2 className="animate-spin mx-auto"/></div>
                            ) : filteredMusic.length > 0 ? (
                                filteredMusic.map(track => (
                                    <div 
                                        key={track._id} 
                                        onClick={() => handleSelect(track)} 
                                        className="flex items-center space-x-3 p-2 rounded-lg cursor-pointer transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                                    >
                                        <CachedImage src={track.albumArtUrl} alt={track.title} />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold truncate">{track.title}</p>
                                            {/* --- ИСПОЛЬЗОВАНИЕ ИСПРАВЛЕННОЙ ФУНКЦИИ --- */}
                                            <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{formatArtistName(track.artist)}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-slate-500 dark:text-slate-400 py-4">У вас нет сохраненной музыки.</p>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.getElementById('modal-root')
    );
};
export default AttachTrackModal;