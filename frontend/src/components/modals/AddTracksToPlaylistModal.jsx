// frontend/src/components/modals/AddTracksToPlaylistModal.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// --- ИЗМЕНЕНИЕ 1: Добавляем иконку CheckCircle ---
import { X, Loader2, Music, CheckCircle } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
const API_URL = import.meta.env.VITE_API_URL;
const AddTracksToPlaylistModal = ({ isOpen, onClose, onAddTracks, existingTrackIds }) => {
const [myMusic, setMyMusic] = useState([]);
const [loading, setLoading] = useState(true);
const [selectedTrackIds, setSelectedTrackIds] = useState([]);

// --- НАЧАЛО ИЗМЕНЕНИЯ ---
const cleanTitle = (title) => {
    if (!title) return '';
    return title.replace(
        /\s*[\(\[](?:\s*(?:official\s*)?(?:video|music\s*video|lyric\s*video|audio|live|performance|visualizer|explicit|single|edit|remix|radio\s*edit|clean|dirty|HD|HQ|full|album\s*version|version|clip|demo|teaser|cover|karaoke|instrumental|extended|rework|reedit|re-cut|reissue|bonus\s*track|unplugged|mood\s*video|concert|show|feat\.?|ft\.?|featuring|\d{4}|(?:\d{2,3}\s?kbps))\s*)[^)\]]*[\)\]]\s*$/i,
        ''
    ).trim();
};
const cleanArtist = (artist) => {
    if (!artist) return '';
    // Spotify предоставляет более чистые имена артистов, но YouTube может добавлять " - Topic"
    if (artist.endsWith(' - Topic')) {
        return artist.substring(0, artist.length - ' - Topic'.length).trim();
    }
    return artist;
};
// --- КОНЕЦ ИЗМЕНЕНИЯ ---

const fetchMyMusic = useCallback(async () => {
    if (!isOpen) return;
    setLoading(true);
    try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/api/music/saved`, { headers: { Authorization: `Bearer ${token}` } });
        setMyMusic(res.data.filter(track => !existingTrackIds.has(track._id)));
    } catch (error) {
        toast.error("Не удалось загрузить вашу музыку.");
    } finally {
        setLoading(false);
    }
}, [isOpen, existingTrackIds]);

useEffect(() => {
    fetchMyMusic();
    setSelectedTrackIds([]);
}, [fetchMyMusic]);

const handleToggleTrack = (trackId) => {
    setSelectedTrackIds(prev =>
        prev.includes(trackId)
            ? prev.filter(id => id !== trackId)
            : [...prev, trackId]
    );
};

const handleAddClick = () => {
    onAddTracks(selectedTrackIds);
    onClose();
};

return (
    <AnimatePresence>
        {isOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    className="ios-glass-final w-full max-w-lg p-6 rounded-3xl flex flex-col text-slate-900 dark:text-white max-h-[80vh]">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold">Добавить треки</h2>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10"><X /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto -mr-2 pr-2 space-y-2">
                        {loading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin"/></div>
                        : myMusic.length > 0 ? myMusic.map(track => {
                            const isSelected = selectedTrackIds.includes(track._id);
                            return (
                            <div key={track._id} onClick={() => handleToggleTrack(track._id)}
                                className={`flex items-center space-x-4 p-2 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-blue-500/20' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                                <div className="relative w-12 h-12 flex-shrink-0">
                                    <img src={track.albumArtUrl} alt={track.title} className="w-full h-full rounded-md object-cover"/>
                                    <AnimatePresence>
                                    {isSelected && (
                                        <motion.div 
                                            initial={{ scale: 0, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0, opacity: 0 }}
                                            className="absolute inset-0 bg-blue-500/60 rounded-md flex items-center justify-center"
                                        >
                                            <CheckCircle size={24} className="text-white"/>
                                        </motion.div>
                                    )}
                                    </AnimatePresence>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold truncate">{cleanTitle(track.title)}</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{Array.isArray(track.artist) ? track.artist.map(a => cleanArtist(a.name)).join(', ') : cleanArtist(track.artist)}</p>
                                </div>
                            </div>
                        )})
                        : <div className="text-center py-10 text-slate-500"><Music className="mx-auto mb-2"/>Ваша медиатека пуста или все треки уже добавлены.</div>}
                    </div>
                    <div className="mt-6 flex justify-end">
                        <button onClick={handleAddClick} disabled={selectedTrackIds.length === 0}
                            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50">
                            Добавить ({selectedTrackIds.length})
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        )}
    </AnimatePresence>
);

};
export default AddTracksToPlaylistModal;