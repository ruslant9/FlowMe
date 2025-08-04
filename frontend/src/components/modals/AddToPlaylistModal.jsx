// frontend/src/components/modals/AddToPlaylistModal.jsx --- НОВЫЙ ФАЙЛ ---

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Music, CheckCircle } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useCachedImage } from '../../hooks/useCachedImage'; // ИМПОРТ

const API_URL = import.meta.env.VITE_API_URL;

// Компонент для кешированного изображения обложки
const CachedCoverImage = ({ src, alt }) => {
    const { finalSrc, loading } = useCachedImage(src);
    if (loading) {
        return <div className="w-full h-full bg-slate-200 dark:bg-slate-700 animate-pulse"></div>;
    }
    return <img src={finalSrc} alt={alt} className="w-full h-full object-cover" />;
};

const AddToPlaylistModal = ({ isOpen, onClose, trackToAdd }) => {
    const [playlists, setPlaylists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);

    const fetchPlaylists = useCallback(async () => {
        if (!isOpen) return;
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/api/playlists`, { headers: { Authorization: `Bearer ${token}` } });
            setPlaylists(res.data);
        } catch (error) {
            toast.error("Не удалось загрузить ваши плейлисты.");
        } finally {
            setLoading(false);
        }
    }, [isOpen]);

    useEffect(() => {
        fetchPlaylists();
    }, [fetchPlaylists]);

    const handleAddToPlaylist = async (playlist) => {
        if (!trackToAdd) return;
        setProcessingId(playlist._id);
        const toastId = toast.loading(`Добавление в "${playlist.name}"...`);
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/api/playlists/${playlist._id}/tracks`, 
                { trackIds: [trackToAdd._id] }, 
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success('Трек добавлен!', { id: toastId });
            onClose(); 
        } catch (error) {
            toast.error(error.response?.data?.message || 'Ошибка добавления.', { id: toastId });
        } finally {
            setProcessingId(null);
        }
    };

    const renderCover = (playlist) => {
        const images = playlist.coverImageUrls;
        if (!images || images.length === 0) {
            return <div className="w-full h-full flex items-center justify-center text-slate-400"><Music size={24} /></div>;
        }
        if (images.length === 1) {
            return <CachedCoverImage src={images[0]} alt={playlist.name} />;
        }
        return (
            <div className="grid grid-cols-2 grid-rows-2 w-full h-full">
                {images.slice(0, 4).map((url, i) => (
                    <CachedCoverImage key={i} src={url} alt="" />
                ))}
            </div>
        );
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
                    <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="ios-glass-final w-full max-w-lg p-6 rounded-3xl flex flex-col text-slate-900 dark:text-white max-h-[80vh]">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Добавить в плейлист</h2>
                            <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10"><X /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto -mr-2 pr-2 space-y-2">
                            {loading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin"/></div>
                            : playlists.length > 0 ? playlists.map(playlist => {
                                const isProcessing = processingId === playlist._id;
                                const isAlreadyAdded = playlist.tracks.includes(trackToAdd?._id);
                                return (
                                <button key={playlist._id} onClick={() => handleAddToPlaylist(playlist)} disabled={isProcessing || isAlreadyAdded}
                                    className="flex items-center w-full space-x-4 p-2 rounded-lg cursor-pointer transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed">
                                    <div className="relative w-12 h-12 flex-shrink-0 bg-slate-200 dark:bg-slate-700 rounded-md overflow-hidden">
                                        {renderCover(playlist)}
                                    </div>
                                    <div className="flex-1 min-w-0 text-left">
                                        <p className="font-semibold truncate">{playlist.name}</p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{playlist.tracks.length} треков</p>
                                    </div>
                                    <div className="w-6 h-6">
                                        {isProcessing ? <Loader2 className="animate-spin text-blue-500"/> 
                                                      : isAlreadyAdded ? <CheckCircle className="text-green-500"/> : null}
                                    </div>
                                </button>
                            )})
                            : <div className="text-center py-10 text-slate-500"><Music className="mx-auto mb-2"/>У вас еще нет плейлистов.</div>}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default AddToPlaylistModal;