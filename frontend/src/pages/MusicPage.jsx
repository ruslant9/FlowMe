// frontend/src/pages/MusicPage.jsx

import React, { useState, useEffect, useCallback, useRef } from 'react';
import useTitle from '../hooks/useTitle';
import axios from 'axios';
import toast from 'react-hot-toast';
import TrackList from '../components/music/TrackList';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2, Search, Music, History, Star, ListMusic, PlusCircle } from 'lucide-react';
import RecommendationCard from '../components/music/RecommendationCard';
import ArtistAvatar from '../components/music/ArtistAvatar';
import MusicWave from '../components/music/MusicWave';
import CreatePlaylistModal from '../components/modals/CreatePlaylistModal';
import PlaylistCard from '../components/music/PlaylistCard';
import EditPlaylistModal from '../components/modals/EditPlaylistModal';

const API_URL = import.meta.env.VITE_API_URL;

const TabButton = ({ children, active, onClick }) => (
    <button
        onClick={onClick}
        className={`flex-shrink-0 flex items-center space-x-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
            active
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 dark:text-white/70 hover:bg-slate-200 dark:hover:bg-white/10'
        }`}
    >
        {children}
    </button>
);

const MusicPage = () => {
    useTitle('Музыка');
    const location = useLocation();
    const navigate = useNavigate();
    
    const getInitialTab = () => {
        if (location.state?.defaultTab) {
            return location.state.defaultTab;
        }
        const savedTab = localStorage.getItem('musicActiveTab');
        if (savedTab && ['search', 'recommendations', 'my-music', 'recently-played', 'playlists'].includes(savedTab)) {
            return savedTab;
        }
        return 'recommendations';
    };

    const [activeTab, setActiveTab] = useState(getInitialTab);
    const [dailyRecommendations, setDailyRecommendations] = useState([]);
    const [popularArtists, setPopularArtists] = useState([]);
    const [loadingRecommendations, setLoadingRecommendations] = useState(true);
    
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [myMusicTracks, setMyMusicTracks] = useState([]);
    
    const [playlists, setPlaylists] = useState([]);
    const [loadingPlaylists, setLoadingPlaylists] = useState(false);
    const [isCreatePlaylistModalOpen, setCreatePlaylistModalOpen] = useState(false);
    
    // --- НАЧАЛО ИЗМЕНЕНИЯ: Убираем setLikedStatus ---
    const { playTrack, currentTrack, isPlaying, onToggleLike, progress, duration, seekTo, loadingTrackId, buffered, togglePlayPause } = useMusicPlayer(); 
    // --- КОНЕЦ ИЗМЕНЕНИЯ ---
    
    const [searchFilter, setSearchFilter] = useState('all');
    const [searchResults, setSearchResults] = useState({ tracks: [], playlists: [] });
    
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [playlistToEdit, setPlaylistToEdit] = useState(null);

    const handleEditPlaylist = (playlist) => {
        setPlaylistToEdit(playlist);
        setEditModalOpen(true);
    };

    useEffect(() => {
        if (location.state?.defaultTab) {
            navigate(location.pathname, { replace: true });
        }
    }, [location, navigate]);

    useEffect(() => {
        localStorage.setItem('musicActiveTab', activeTab);
    }, [activeTab]);

    const handleSelectTrack = useCallback((youtubeId) => {
        let currentPlaylist = [];
        if (activeTab === 'my-music') {
            currentPlaylist = myMusicTracks;
        } else if (activeTab === 'recently-played') {
            currentPlaylist = data;
        } else if (activeTab === 'recommendations') {
            currentPlaylist = dailyRecommendations;
        } else { // search
            currentPlaylist = searchResults.tracks;
        }
        
        const allAvailableTracks = [...myMusicTracks, ...data, ...dailyRecommendations, ...searchResults.tracks];
        const trackToPlay = allAvailableTracks.find(t => t.youtubeId === youtubeId);

        if (trackToPlay) {
            playTrack(trackToPlay, currentPlaylist); 
        }
    }, [data, myMusicTracks, dailyRecommendations, searchResults, activeTab, playTrack]);
    
    const fetchMyMusic = useCallback(async (showLoader = true) => {
        if (showLoader) setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/api/music/saved`, { headers: { Authorization: `Bearer ${token}` } });
            setMyMusicTracks(res.data);
        } catch (error) {
            toast.error('Не удалось загрузить Мою музыку.');
        } finally {
            if (showLoader) setLoading(false);
        }
    }, []);

    const fetchPlaylists = useCallback(async (showLoader = true) => {
        if (showLoader) setLoadingPlaylists(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/api/playlists`, { headers: { Authorization: `Bearer ${token}` } });
            setPlaylists(res.data);
        } catch (error) {
            toast.error('Не удалось загрузить плейлисты.');
        } finally {
            if (showLoader) setLoadingPlaylists(false);
        }
    }, []);

    const handleSelectPlaylist = (playlist) => {
        navigate(`/music/playlist/${playlist._id}`);
    };
    
    const handleDeletePlaylist = async (playlistId) => {
        const toastId = toast.loading('Удаление плейлиста...');
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}/api/playlists/${playlistId}`, { headers: { Authorization: `Bearer ${token}` } });
            toast.success('Плейлист удален.', { id: toastId });
            fetchPlaylists(false);
        } catch (error) {
            toast.error('Ошибка при удалении плейлиста.', { id: toastId });
        }
    };

    useEffect(() => {
        const handleMusicUpdate = () => { fetchMyMusic(false); };
        window.addEventListener('myMusicUpdated', handleMusicUpdate);
        return () => window.removeEventListener('myMusicUpdated', handleMusicUpdate);
    }, [fetchMyMusic]);

    const handleToggleSave = useCallback(async (trackData) => {
        const isCurrentlySaved = myMusicTracks.some(t => t.youtubeId === trackData.youtubeId);
        setMyMusicTracks(prev => isCurrentlySaved ? prev.filter(t => t.youtubeId !== trackData.youtubeId) : [trackData, ...prev]);
        await onToggleLike(trackData);
    }, [onToggleLike, myMusicTracks]);

    const fetchRecommendationsData = useCallback(async () => {
        setLoadingRecommendations(true);
        try {
            const token = localStorage.getItem('token');
            const [recsRes, artistsRes, playlistsRes] = await Promise.all([
                axios.get(`${API_URL}/api/music/personalized-recommendations`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${API_URL}/api/music/popular-artists`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${API_URL}/api/playlists`, { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setDailyRecommendations(recsRes.data);
            setPopularArtists(artistsRes.data);
            setPlaylists(playlistsRes.data);
        } catch (error) {
            toast.error("Не удалось загрузить рекомендации.");
        } finally {
            setLoadingRecommendations(false);
        }
    }, []);

    const fetchDataForTab = useCallback(async (tab, query = '') => {
        if (tab === 'playlists') { await fetchPlaylists(); return; }
        if (tab === 'recommendations') { await fetchRecommendationsData(); setData([]); setSearchQuery(''); return; }
        if (tab === 'my-music') { await fetchMyMusic(); return; }

        if (tab === 'search') {
            if (!query) {
                setLoading(false);
                setSearchResults({ tracks: [], playlists: [] });
                return;
            }
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get(`${API_URL}/api/music/search-all?q=${encodeURIComponent(query)}&type=${searchFilter}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setSearchResults(res.data);
            } catch (error) {
                toast.error("Ошибка при поиске.");
            } finally {
                setLoading(false);
            }
            return;
        }

        if (tab === 'recently-played') {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get(`${API_URL}/api/music/history`, { headers: { Authorization: `Bearer ${token}` } });
                setData(res.data || []);
            } catch (error) {
                toast.error(error.response?.data?.message || `Не удалось загрузить данные.`);
            } finally {
                setLoading(false);
            }
        }
    }, [fetchMyMusic, fetchRecommendationsData, fetchPlaylists, searchFilter]);

    const handleDeleteFromHistory = useCallback(async (trackId) => {
        const originalTracks = [...data];
        setData(prev => prev.filter(t => t._id !== trackId));
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}/api/music/history/${trackId}`, { headers: { Authorization: `Bearer ${token}` } });
            toast.success("Трек удален из истории");
        } catch (error) {
            toast.error("Не удалось удалить трек");
            setData(originalTracks);
        }
    }, [data]);

    // --- НАЧАЛО ИЗМЕНЕНИЯ: Удаляем этот useEffect ---
    // useEffect(() => {
    //     if (currentTrack) {
    //         const liked = myMusicTracks.some(t => t.youtubeId === currentTrack.youtubeId);
    //         setLikedStatus(liked);
    //     }
    // }, [currentTrack, myMusicTracks, setLikedStatus]);
    // --- КОНЕЦ ИЗМЕНЕНИЯ ---

    useEffect(() => {
        const debounce = setTimeout(() => {
             fetchDataForTab(activeTab, searchQuery);
        }, 300);
        return () => clearTimeout(debounce);
    }, [activeTab, searchQuery, fetchDataForTab]);
    
    const handleArtistClick = (artistName) => {
        setActiveTab('search');
        setSearchQuery(artistName);
    };
    
    const handlePlayWave = useCallback(async () => {
        const toastId = toast.loading("Настраиваем вашу волну...");
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/api/music/wave`, { headers: { Authorization: `Bearer ${token}` } });
            if (res.data && res.data.length > 0) {
                playTrack(res.data[0], res.data);
                toast.success("Ваша волна запущена!", { id: toastId });
            } else {
                toast.error("Не удалось найти треки для вашей волны.", { id: toastId });
            }
        } catch (error) {
            toast.error("Ошибка при запуске волны.", { id: toastId });
        }
    }, [playTrack]);

    return (
        <div className="flex-1 p-4 md:p-8">
            <CreatePlaylistModal 
                isOpen={isCreatePlaylistModalOpen}
                onClose={() => setCreatePlaylistModalOpen(false)}
                onPlaylistCreated={() => fetchPlaylists(false)}
            />
            <EditPlaylistModal
                isOpen={isEditModalOpen}
                onClose={() => setEditModalOpen(false)}
                playlist={playlistToEdit}
                onPlaylistUpdated={() => fetchPlaylists(false)}
            />
            
            <div className="ios-glass-final rounded-3xl p-6 w-full max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-3xl font-bold">Музыка</h1>
                </div>

                <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-white/10 pb-4 mb-4 overflow-x-auto">
                    <TabButton active={activeTab === 'recommendations'} onClick={() => setActiveTab('recommendations')}><Star size={16}/><span>Главная</span></TabButton>
                    <TabButton active={activeTab === 'search'} onClick={() => setActiveTab('search')}><Search size={16}/><span>Поиск</span></TabButton>
                    <TabButton active={activeTab === 'my-music'} onClick={() => setActiveTab('my-music')}><Music size={16}/><span>Моя музыка</span></TabButton>
                    <TabButton active={activeTab === 'playlists'} onClick={() => setActiveTab('playlists')}><ListMusic size={16}/><span>Мои плейлисты</span></TabButton>
                    <TabButton active={activeTab === 'recently-played'} onClick={() => setActiveTab('recently-played')}><History size={16}/><span>Вы слушали</span></TabButton>
                </div>
                
                {activeTab === 'recommendations' ? (
                    loadingRecommendations ? (
                        <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin"/></div>
                    ) : (
                        <div className="space-y-10">
                            <div><MusicWave onPlay={handlePlayWave} /></div>
                            {playlists.length > 0 && (
                                <div>
                                    <h2 className="text-2xl font-bold mb-4">Мои плейлисты</h2>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                        {playlists.slice(0, 5).map(playlist => (
                                            <PlaylistCard key={playlist._id} playlist={playlist} onClick={() => handleSelectPlaylist(playlist)} />
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div>
                                <h2 className="text-2xl font-bold mb-4">Новинки и хиты</h2>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    {dailyRecommendations.map(track => (
                                        <RecommendationCard key={track.youtubeId} track={track} isCurrent={track.youtubeId === currentTrack?.youtubeId} isPlaying={isPlaying} isLoading={track.youtubeId === loadingTrackId} onPlayPause={togglePlayPause} onSelectTrack={handleSelectTrack} />
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold mb-4">В стиле артистов</h2>
                                <div className="flex justify-around items-start">
                                    {popularArtists.map(artist => (
                                        <ArtistAvatar key={artist.name} artistName={artist.name} onClick={() => handleArtistClick(artist.name)} avatarUrl={artist.imageUrl} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )
                ) : activeTab === 'playlists' ? (
                    loadingPlaylists ? (
                        <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin"/></div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            <div className="relative group aspect-square">
                                <button 
                                    onClick={() => setCreatePlaylistModalOpen(true)} 
                                    className="w-full h-full flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 transition-colors duration-300 relative overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                    <div className="relative z-10 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 group-hover:text-white transition-colors duration-300">
                                        <PlusCircle size={40} />
                                        <span className="mt-2 font-semibold">Создать плейлист</span>
                                    </div>
                                </button>
                            </div>
                            {playlists.map(playlist => (
                                <PlaylistCard 
                                    key={playlist._id} 
                                    playlist={playlist} 
                                    onClick={() => handleSelectPlaylist(playlist)} 
                                    onDelete={() => handleDeletePlaylist(playlist._id)}
                                    onEdit={() => handleEditPlaylist(playlist)}
                                />
                            ))}
                        </div>
                    )
                ) : activeTab === 'search' ? (
                    <div>
                        <div className="relative mb-4">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input type="text" placeholder="Название трека, исполнитель или плейлист..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-slate-200/70 dark:bg-black/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div className="flex items-center space-x-2 mb-6">
                            <TabButton active={searchFilter === 'all'} onClick={() => setSearchFilter('all')}>Все</TabButton>
                            <TabButton active={searchFilter === 'tracks'} onClick={() => setSearchFilter('tracks')}>Треки</TabButton>
                            <TabButton active={searchFilter === 'playlists'} onClick={() => setSearchFilter('playlists')}>Плейлисты</TabButton>
                        </div>
                        {loading ? <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin"/></div> : (
                            <div className="space-y-6">
                                {searchResults.tracks.length > 0 && (
                                    <div>
                                        <h3 className="font-bold text-lg mb-2">Треки</h3>
                                        <TrackList tracks={searchResults.tracks} onSelectTrack={handleSelectTrack} currentPlayingTrackId={currentTrack?.youtubeId} isPlaying={isPlaying} onToggleSave={handleToggleSave} myMusicTrackIds={new Set(myMusicTracks.map(t => t.youtubeId))} progress={progress} duration={duration} onSeek={seekTo} loadingTrackId={loadingTrackId} buffered={buffered} onPlayPauseToggle={togglePlayPause} />
                                    </div>
                                )}
                                {searchResults.playlists.length > 0 && (
                                    <div>
                                        <h3 className="font-bold text-lg mb-2">Плейлисты</h3>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                            {searchResults.playlists.map(p => <PlaylistCard key={p._id} playlist={p} onClick={() => handleSelectPlaylist(p)} />)}
                                        </div>
                                    </div>
                                )}
                                {!loading && searchResults.tracks.length === 0 && searchResults.playlists.length === 0 && searchQuery && (
                                    <p className="text-center py-10 text-slate-500">Ничего не найдено.</p>
                                )}
                            </div>
                        )}
                    </div>
                ) : ( // my-music and recently-played
                    loading ? <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin"/></div>
                    : (activeTab === 'my-music' ? myMusicTracks : data).length > 0 ? ( 
                        <TrackList tracks={activeTab === 'my-music' ? myMusicTracks : data} onSelectTrack={handleSelectTrack}
                            currentPlayingTrackId={currentTrack?.youtubeId} isPlaying={isPlaying} onToggleSave={handleToggleSave} myMusicTrackIds={new Set(myMusicTracks.map(t => t.youtubeId))}
                            progress={progress} duration={duration} onSeek={seekTo} loadingTrackId={loadingTrackId} buffered={buffered} onPlayPauseToggle={togglePlayPause}
                            showDeleteButtons={activeTab === 'recently-played'} onDeleteFromHistory={handleDeleteFromHistory} />
                    ) : (
                        <div className="text-center py-10 text-slate-500 dark:text-white/60">
                            {activeTab === 'search' && searchQuery ? 'Ничего не найдено.' : 'Здесь пока пусто.'}
                        </div>
                    )
                )}
            </div>
        </div>
    );
};

export default MusicPage;