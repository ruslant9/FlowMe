// frontend/src/components/modals/MusicListModal.jsx

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Music, ListMusic, Search, Clock } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import PlaylistCard from '../music/PlaylistCard';
import { useMusicPlayer } from '../../context/MusicPlayerContext';
import { useUser } from '../../context/UserContext';
import { useNavigate } from 'react-router-dom';
import ColorThief from 'colorthief';
import Avatar from '../Avatar';
import PlaylistTrackItem from '../music/PlaylistTrackItem';

const API_URL = import.meta.env.VITE_API_URL;
const TRACKS_PER_PAGE = 20;

const TabButton = ({ active, onClick, children, count }) => (
    <button
        onClick={onClick}
        className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors flex items-center justify-center space-x-2 ${
            active 
            ? 'bg-slate-200 dark:bg-white/10' 
            : 'text-slate-500 dark:text-white/60 hover:bg-slate-100/50 dark:hover:bg-white/5'
        }`}
    >
        {children} <span>({count})</span>
    </button>
);

const getImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) {
        return url;
    }
    return `${API_URL}/${url}`;
};

const MusicListModal = ({ isOpen, onClose, user }) => {
    const { currentUser } = useUser();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('music');
    const [tracks, setTracks] = useState([]);
    const [playlists, setPlaylists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const observer = useRef();

    const { playTrack, currentTrack, isPlaying, onToggleLike, myMusicTrackIds } = useMusicPlayer();
    
    const imageRef = useRef(null);
    const [accentColors, setAccentColors] = useState(['#222222', '#444444']);

    const isOwnProfile = useMemo(() => user?._id === currentUser?._id, [user, currentUser]);

    const extractColorsFromImage = () => {
        const img = imageRef.current;
        if (img && img.complete && img.src) {
            try {
                const colorThief = new ColorThief();
                const palette = colorThief.getPalette(img, 2);
                if (palette && palette.length >= 2) {
                    const colors = palette.map(rgb => `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`);
                    setAccentColors(colors);
                }
            } catch (e) {
                console.error('Error extracting colors from avatar', e);
            }
        }
    };

    const fetchMusicData = useCallback(async (pageNum) => {
        if (!user?._id || (loadingMore && pageNum > 1)) return;
        
        if (pageNum === 1) setLoading(true);
        else setLoadingMore(true);

        try {
            const token = localStorage.getItem('token');
            const endpoint = isOwnProfile 
                ? `${API_URL}/api/music/saved` 
                : `${API_URL}/api/music/user/${user._id}/saved?page=${pageNum}&limit=${TRACKS_PER_PAGE}`;
            
            const res = await axios.get(endpoint, { headers: { Authorization: `Bearer ${token}` } });
            const data = isOwnProfile ? res.data : res.data.tracks;
            
            setTracks(prev => pageNum === 1 ? data : [...prev, ...data]);
            setHasMore(isOwnProfile ? false : res.data.hasMore);
            setPage(pageNum);

        } catch (err) {
            setError(err.response?.data?.message || "Не удалось загрузить музыку.");
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [user, isOwnProfile, loadingMore]);

    const fetchPlaylistsData = useCallback(async () => {
        if (!user?._id) return;
        try {
            const token = localStorage.getItem('token');
            const playlistsEndpoint = isOwnProfile ? `${API_URL}/api/playlists` : `${API_URL}/api/playlists/user/${user._id}`;
            const res = await axios.get(playlistsEndpoint, { headers: { Authorization: `Bearer ${token}` } });
            setPlaylists(res.data);
        } catch (err) {
            setError(err.response?.data?.message || "Не удалось загрузить плейлисты.");
        }
    }, [user, isOwnProfile]);

    useEffect(() => {
        if (isOpen) {
            setPage(1);
            setTracks([]);
            setPlaylists([]);
            setHasMore(true);
            setAccentColors(['#222222', '#444444']);
            
            fetchMusicData(1);
            fetchPlaylistsData();
        }
        return () => { if (!isOpen) { setActiveTab('music'); setSearchQuery(''); }};
    }, [isOpen, user, fetchMusicData, fetchPlaylistsData]);

    const lastTrackElementRef = useCallback(node => {
        if (loadingMore) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                fetchMusicData(page + 1);
            }
        });
        if (node) observer.current.observe(node);
    }, [loadingMore, hasMore, page, fetchMusicData]);

    const handleSelectTrack = (track) => {
        if (track) {
            playTrack(track, tracks);
        }
    };

    const handleSelectPlaylist = (playlist) => {
        onClose();
        navigate(`/music/playlist/${playlist._id}`);
    };

    const filteredTracks = useMemo(() => {
        if (!searchQuery) return tracks;
        return tracks.filter(t => 
            t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
            t.artist.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [tracks, searchQuery]);

    const filteredPlaylists = useMemo(() => {
        if (!searchQuery) return playlists;
        return playlists.filter(p => 
            p.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [playlists, searchQuery]);

    const handleClose = (e) => {
        e.stopPropagation();
        onClose();
    };

    const totalDurationMs = tracks.reduce((acc, track) => acc + (track.durationMs || 0), 0);
    const totalMinutes = Math.floor(totalDurationMs / 60000);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleClose}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="ios-glass-final w-full max-w-4xl rounded-3xl flex flex-col text-slate-900 dark:text-white max-h-[85vh] overflow-hidden dynamic-gradient"
                        style={{
                            '--color1': accentColors[0],
                            '--color2': accentColors[1]
                        }}
                    >
                        {/* --- ИЗМЕНЕНИЕ 1: Используем getImageUrl для скрытого img --- */}
                        {user?.avatar && <img ref={imageRef} src={getImageUrl(user.avatar)} crossOrigin="anonymous" className="hidden" onLoad={extractColorsFromImage} />}
                        
                         <div className="p-6 flex flex-col items-center space-y-4 relative">
                             <button onClick={handleClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/10 text-white/70 hover:text-white"><X /></button>
                             <div className="w-42 h-42 rounded-full shadow-2xl flex-shrink-0">
                                {/* --- ИЗМЕНЕНИЕ 2: Используем getImageUrl для компонента Avatar --- */}
                                <Avatar size="xl" username={user.username} avatarUrl={getImageUrl(user.avatar)} />
                             </div>
                             <div className="flex flex-col items-center text-center">
                                 <h1 className="text-6xl font-extrabold break-words">{user.username}</h1>
                                 <p className="text-slate-400 mt-2">{tracks.length} треков, {totalMinutes} мин.</p>
                             </div>
                        </div>

                        <div className="px-6 flex-1 flex flex-col min-h-0">
                            <div className="flex items-center space-x-2 p-1 mb-4 bg-black/10 rounded-lg">
                                <TabButton active={activeTab === 'music'} onClick={() => setActiveTab('music')} count={(tracks || []).length}>
                                    <Music size={16}/><span>Музыка</span>
                                </TabButton>
                                <TabButton active={activeTab === 'playlists'} onClick={() => setActiveTab('playlists')} count={(playlists || []).length}>
                                    <ListMusic size={16}/><span>Плейлисты</span>
                                </TabButton>
                            </div>
                            
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                <input type="text" placeholder="Поиск..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-black/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            
                            <div className="flex-1 overflow-y-auto -mr-2 pr-2">
                                {loading ? <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin"/></div>
                                : error ? <div className="text-center py-10 text-red-500">{error}</div>
                                : activeTab === 'music' ? (
                                    filteredTracks.length > 0 ? (
                                        <>
                                            <div className="grid grid-cols-[auto_1fr_auto] gap-x-4 px-4 text-sm text-slate-400 border-b border-white/10 pb-2">
                                                <div className="text-center">#</div>
                                                <div>Название</div>
                                                <div className="flex justify-end"><Clock size={16} /></div>
                                            </div>
                                            <div className="space-y-1 mt-2">
                                            {filteredTracks.map((track, index) => (
                                                <PlaylistTrackItem
                                                    key={track._id || track.youtubeId}
                                                    track={track}
                                                    index={index + 1}
                                                    onPlay={() => handleSelectTrack(track)}
                                                    isCurrent={track.youtubeId === currentTrack?.youtubeId}
                                                    isPlaying={isPlaying}
                                                    isSaved={myMusicTrackIds?.has(track.youtubeId)}
                                                    onToggleSave={onToggleLike}
                                                />
                                            ))}
                                            </div>
                                            <div ref={lastTrackElementRef} className="h-10 flex justify-center items-center">
                                                {loadingMore && <Loader2 className="animate-spin text-slate-400" />}
                                            </div>
                                        </>
                                    ) : <div className="text-center py-10 text-slate-500">У пользователя нет сохраненной музыки.</div>
                                ) : ( // activeTab === 'playlists'
                                    filteredPlaylists.length > 0 ? (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                            {filteredPlaylists.map(p => <PlaylistCard key={p._id} playlist={p} onClick={() => handleSelectPlaylist(p)} />)}
                                        </div>
                                    ) : <div className="text-center py-10 text-slate-500">У пользователя нет плейлистов.</div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default MusicListModal;