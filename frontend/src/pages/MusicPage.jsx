// frontend/src/pages/MusicPage.jsx

import React, { useState, useEffect, useCallback, useRef } from 'react';
import useTitle from '../hooks/useTitle';
import axios from 'axios';
import toast from 'react-hot-toast';
import TrackList from '../components/music/TrackList';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2, Search, Music, History, Star, ListMusic, PlusCircle, UploadCloud } from 'lucide-react';
import { useUser } from '../context/UserContext';
import RecommendationCard from '../components/music/RecommendationCard';
import ArtistAvatar from '../components/music/ArtistAvatar';
import MusicWave from '../components/music/MusicWave';
import CreatePlaylistModal from '../components/modals/CreatePlaylistModal';
import PlaylistCard from '../components/music/PlaylistCard';
import EditPlaylistModal from '../components/modals/EditPlaylistModal';
import UploadContentModal from '../components/modals/UploadContentModal';
import ArtistCard from '../components/music/ArtistCard';
import AlbumCard from '../components/music/AlbumCard';
import { useModal } from '../hooks/useModal';

const API_URL = import.meta.env.VITE_API_URL;

const TabButton = ({ children, active, onClick }) => (
    <button
        onClick={onClick}
        className={`flex-shrink-0 flex items-center space-x-2 px-4 py-3 text-sm font-semibold transition-colors border-b-2 ${
            active
                ? 'border-blue-500 text-blue-500' 
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
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
        if (location.state?.defaultTab) return location.state.defaultTab;
        const savedTab = localStorage.getItem('musicActiveTab');
        return ['search', 'recommendations', 'my-music', 'recently-played', 'playlists'].includes(savedTab) ? savedTab : 'recommendations';
    };

    const [activeTab, setActiveTab] = useState(getInitialTab);
    const [mainPageData, setMainPageData] = useState({ newReleases: [], popularHits: [], popularArtists: [] });
    const [loadingRecommendations, setLoadingRecommendations] = useState(true);
    const [myMusicTracks, setMyMusicTracks] = useState([]);
    const [recentlyPlayed, setRecentlyPlayed] = useState([]);
    const [playlists, setPlaylists] = useState([]);
    const [loadingTabData, setLoadingTabData] = useState(false);
    
    const { 
        playTrack, currentTrack, isPlaying, onToggleLike, myMusicTrackIds,
        progress, duration, onSeek, loadingTrackId, buffered, togglePlayPause 
    } = useMusicPlayer(); 
    
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState({ tracks: [], playlists: [], artists: [], albums: [] });
    const [loadingSearch, setLoadingSearch] = useState(false);
    const [searchPage, setSearchPage] = useState(1);
    const [hasMoreSearchResults, setHasMoreSearchResults] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    
    const [isUploadModalOpen, setUploadModalOpen] = useState(false);
    const [isCreatePlaylistModalOpen, setCreatePlaylistModalOpen] = useState(false);
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [playlistToEdit, setPlaylistToEdit] = useState(null);
    const { showConfirmation } = useModal();

    const fetchDataForTab = useCallback(async (tab, query = '', page = 1) => {
        const token = localStorage.getItem('token');
        const headers = { headers: { Authorization: `Bearer ${token}` } };

        const resetSearchState = () => {
            setSearchPage(1);
            setSearchResults({ tracks: [], playlists: [], artists: [], albums: [] });
            setHasMoreSearchResults(true);
        };
        
        switch (tab) {
            case 'recommendations':
                setLoadingRecommendations(true);
                resetSearchState();
                try {
                    const res = await axios.get(`${API_URL}/api/music/recommendations`, headers);
                    setMainPageData(res.data);
                } catch (e) { toast.error("Не удалось загрузить рекомендации."); }
                setLoadingRecommendations(false);
                break;

            case 'my-music':
                setLoadingTabData(true);
                resetSearchState();
                try {
                    const res = await axios.get(`${API_URL}/api/music/saved`, headers);
                    setMyMusicTracks(res.data);
                } catch (e) { toast.error('Не удалось загрузить Мою музыку.'); }
                setLoadingTabData(false);
                break;

            case 'playlists':
                setLoadingTabData(true);
                resetSearchState();
                try {
                    const res = await axios.get(`${API_URL}/api/playlists`, headers);
                    setPlaylists(res.data);
                } catch (e) { toast.error('Не удалось загрузить плейлисты.'); }
                setLoadingTabData(false);
                break;

            case 'recently-played':
                setLoadingTabData(true);
                resetSearchState();
                try {
                    const res = await axios.get(`${API_URL}/api/music/history`, headers);
                    setRecentlyPlayed(res.data);
                } catch (e) { toast.error('Не удалось загрузить историю.'); }
                setLoadingTabData(false);
                break;
            
            case 'search':
                if (!query.trim()) {
                    setSearchResults({ tracks: [], playlists: [], artists: [], albums: [] });
                    setHasMoreSearchResults(false);
                    return;
                }
                
                if (page === 1) setLoadingSearch(true);
                else setLoadingMore(true);

                try {
                    const res = await axios.get(`${API_URL}/api/music/search-all?q=${encodeURIComponent(query)}&page=${page}`, headers);
                    setSearchResults(prev => {
                        if (page === 1) {
                            return res.data;
                        }
                        return {
                            ...prev,
                            tracks: [...prev.tracks, ...res.data.tracks]
                        };
                    });
                    setHasMoreSearchResults(res.data.hasMore);
                    setSearchPage(page);
                } catch (error) { toast.error("Ошибка при поиске."); }
                
                setLoadingSearch(false);
                setLoadingMore(false);
                break;
        }
    }, []);

    useEffect(() => {
        if (location.state?.defaultTab) {
            navigate(location.pathname, { replace: true });
        }
        localStorage.setItem('musicActiveTab', activeTab);
    }, [activeTab, location, navigate]);
    
    useEffect(() => {
        fetchDataForTab(activeTab);
    }, [activeTab, fetchDataForTab]);

    useEffect(() => {
        const debounce = setTimeout(() => {
            if (activeTab === 'search') {
                setSearchPage(1);
                fetchDataForTab('search', searchQuery, 1);
            }
        }, 300);
        return () => clearTimeout(debounce);
    }, [searchQuery, activeTab, fetchDataForTab]);
    
    useEffect(() => {
        const handleMyMusicUpdate = () => {
            if (activeTab === 'my-music') {
                fetchDataForTab('my-music');
            }
        };
        window.addEventListener('myMusicUpdated', handleMyMusicUpdate);
        return () => {
            window.removeEventListener('myMusicUpdated', handleMyMusicUpdate);
        };
    }, [activeTab, fetchDataForTab]);

    const handleSelectTrack = useCallback((track) => {
        let currentPlaylist = [];
        if (activeTab === 'my-music') currentPlaylist = myMusicTracks;
        else if (activeTab === 'recently-played') currentPlaylist = recentlyPlayed;
        else if (activeTab === 'recommendations') currentPlaylist = mainPageData.newReleases.concat(mainPageData.popularHits);
        else currentPlaylist = searchResults.tracks;
        playTrack(track, currentPlaylist); 
    }, [myMusicTracks, recentlyPlayed, mainPageData, searchResults, activeTab, playTrack]);
    
    const handlePlayWave = useCallback(async () => {
        const toastId = toast.loading("Настраиваем вашу волну...");
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/api/music/wave`, { headers: { Authorization: `Bearer ${token}` } });
            if (res.data?.length > 0) {
                playTrack(res.data[0], res.data);
                toast.success("Ваша волна запущена!", { id: toastId });
            } else {
                toast.error("Не удалось найти треки для вашей волны.", { id: toastId });
            }
        } catch (error) { toast.error("Ошибка при запуске волны.", { id: toastId }); }
    }, [playTrack]);

    const handleEditPlaylist = (playlist) => {
        setPlaylistToEdit(playlist);
        setEditModalOpen(true);
    };

    const handleDeletePlaylist = (playlistId) => {
        showConfirmation({
            title: "Удалить плейлист?",
            message: "Это действие необратимо. Плейлист будет удален навсегда.",
            onConfirm: async () => {
                const toastId = toast.loading('Удаление...');
                try {
                    const token = localStorage.getItem('token');
                    await axios.delete(`${API_URL}/api/playlists/${playlistId}`, { 
                        headers: { Authorization: `Bearer ${token}` } 
                    });
                    toast.success('Плейлист удален', { id: toastId });
                    fetchDataForTab('playlists');
                } catch (error) {
                    toast.error('Ошибка при удалении плейлиста.', { id: toastId });
                }
            }
        });
    };
    
    // --- НАЧАЛО ИЗМЕНЕНИЙ ---
    return (
        <main className="flex-1 overflow-y-auto bg-slate-100 dark:bg-slate-900">
            <CreatePlaylistModal isOpen={isCreatePlaylistModalOpen} onClose={() => setCreatePlaylistModalOpen(false)} onPlaylistCreated={() => fetchDataForTab('playlists')} />
            <EditPlaylistModal isOpen={isEditModalOpen} onClose={() => setEditModalOpen(false)} playlist={playlistToEdit} onPlaylistUpdated={() => fetchDataForTab('playlists')} />
            <UploadContentModal isOpen={isUploadModalOpen} onClose={() => setUploadModalOpen(false)} />

            <div className="max-w-7xl mx-auto">
                {/* Новая, чистая шапка страницы */}
                <div className="flex items-center justify-between px-6 md:px-8 pt-8 pb-6">
                    <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white">
                        Музыка
                    </h1>
                    <button onClick={() => setUploadModalOpen(true)} className="flex items-center space-x-2 text-sm bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors">
                        <UploadCloud size={18} /> <span>Загрузить аудио</span>
                    </button>
                </div>
                
                {/* Панель с вкладками */}
                <div className="px-6 md:px-8 border-b border-slate-300 dark:border-slate-700">
                    <div className="flex items-center space-x-2 -mb-px">
                        <TabButton active={activeTab === 'recommendations'} onClick={() => setActiveTab('recommendations')}><Star size={16}/><span>Главная</span></TabButton>
                        <TabButton active={activeTab === 'search'} onClick={() => setActiveTab('search')}><Search size={16}/><span>Поиск</span></TabButton>
                        <TabButton active={activeTab === 'my-music'} onClick={() => setActiveTab('my-music')}><Music size={16}/><span>Моя музыка</span></TabButton>
                        <TabButton active={activeTab === 'playlists'} onClick={() => setActiveTab('playlists')}><ListMusic size={16}/><span>Мои плейлисты</span></TabButton>
                        <TabButton active={activeTab === 'recently-played'} onClick={() => setActiveTab('recently-played')}><History size={16}/><span>Вы слушали</span></TabButton>
                    </div>
                </div>
                
                {/* Контент активной вкладки */}
                <div className="p-6 md:p-8">
                    {activeTab === 'recommendations' && (
                        loadingRecommendations ? <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin"/></div> : (
                            <div className="space-y-10">
                                <div><MusicWave onPlay={handlePlayWave} /></div>
                                {mainPageData.popularHits.length > 0 && (
                                    <div>
                                        <h2 className="text-2xl font-bold mb-4">Хиты платформы</h2>
                                         <div className="flex space-x-4 overflow-x-auto pb-4 -mx-6 px-6">
                                            {mainPageData.popularHits.map(track => (
                                                <div key={track._id} className="w-36 flex-shrink-0">
                                                    <RecommendationCard track={track} onSelectTrack={() => playTrack(track, mainPageData.popularHits)} isCurrent={track._id === currentTrack?._id} isPlaying={isPlaying && track._id === currentTrack?._id} isLoading={loadingTrackId === track._id} onPlayPause={togglePlayPause} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {mainPageData.newReleases.length > 0 && (
                                    <div>
                                        <h2 className="text-2xl font-bold mb-4">Новинки для вас</h2>
                                         <div className="flex space-x-4 overflow-x-auto pb-4 -mx-6 px-6">
                                            {mainPageData.newReleases.map(track => (
                                                 <div key={track._id} className="w-36 flex-shrink-0">
                                                    <RecommendationCard track={track} onSelectTrack={() => playTrack(track, mainPageData.newReleases)} isCurrent={track._id === currentTrack?._id} isPlaying={isPlaying && track._id === currentTrack?._id} isLoading={loadingTrackId === track._id} onPlayPause={togglePlayPause} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                 {mainPageData.popularArtists.length > 0 && (
                                    <div>
                                        <h2 className="text-2xl font-bold mb-4">Популярные артисты</h2>
                                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-4">
                                            {mainPageData.popularArtists.map(artist => <ArtistAvatar key={artist._id} artist={artist} />)}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    )}

                    {activeTab === 'search' && (
                        <div>
                            <div className="relative mb-4">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/40" size={20} />
                                <input type="text" placeholder="Артист, альбом или трек..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} autoFocus
                                    className="w-full pl-12 pr-4 py-3 bg-slate-200/70 dark:bg-black/30 text-slate-800 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 border-none focus:outline-none focus:ring-2 focus:focus:ring-blue-500 rounded-lg" />
                            </div>
                            {loadingSearch ? <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin"/></div> : (
                                !searchQuery.trim() ? <div className="text-center py-10 text-slate-500">Начните вводить что-нибудь для поиска.</div> :
                                (searchResults.artists.length === 0 && searchResults.albums.length === 0 && searchResults.tracks.length === 0 && searchResults.playlists.length === 0) ? 
                                <p className="text-center py-10 text-slate-500">Ничего не найдено.</p> :
                                <div className="space-y-8">
                                    {searchResults.tracks.length > 0 && (
                                        <div>
                                            <h3 className="text-xl font-bold mb-3">Треки</h3>
                                            <TrackList
                                                tracks={searchResults.tracks}
                                                onSelectTrack={handleSelectTrack}
                                                currentTrack={currentTrack}
                                                isPlaying={isPlaying}
                                                onToggleSave={onToggleLike}
                                                myMusicTrackIds={myMusicTrackIds}
                                                progress={progress}
                                                duration={duration}
                                                onSeek={onSeek}
                                                loadingTrackId={loadingTrackId}
                                                buffered={buffered}
                                                onPlayPauseToggle={togglePlayPause}
                                            />
                                        </div>
                                    )}
                                    {hasMoreSearchResults && (
                                        <div className="text-center">
                                            <button
                                                onClick={() => fetchDataForTab('search', searchQuery, searchPage + 1)}
                                                disabled={loadingMore}
                                                className="px-6 py-2 bg-slate-200 dark:bg-white/10 text-sm font-semibold rounded-full hover:bg-slate-300 dark:hover:bg-white/20 transition-colors"
                                            >
                                                {loadingMore ? <Loader2 className="animate-spin" /> : 'Показать еще'}
                                            </button>
                                        </div>
                                    )}
                                    {searchResults.artists.length > 0 && (
                                        <div>
                                            <h3 className="text-xl font-bold mb-3">Артисты</h3>
                                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-4">
                                                {searchResults.artists.map(artist => <ArtistCard key={artist._id} artist={artist} />)}
                                            </div>
                                        </div>
                                    )}
                                    {searchResults.albums.length > 0 && (
                                        <div>
                                            <h3 className="text-xl font-bold mb-3">Альбомы</h3>
                                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-4">
                                                {searchResults.albums.map(album => <AlbumCard key={album._id} album={album} />)}
                                            </div>
                                        </div>
                                    )}
                                    {searchResults.playlists.length > 0 && (
                                        <div>
                                            <h3 className="text-xl font-bold mb-3">Открытые плейлисты</h3>
                                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-4">
                                                {searchResults.playlists.map(p => <PlaylistCard key={p._id} playlist={p} onClick={() => navigate(`/music/playlist/${p._id}`)} />)}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                    
                    {['my-music', 'recently-played', 'playlists'].includes(activeTab) && (
                        loadingTabData ? <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin"/></div> : (
                            <div>
                                {activeTab === 'my-music' && (myMusicTracks.length > 0 ? <TrackList tracks={myMusicTracks} onSelectTrack={(track) => playTrack(track, myMusicTracks)} onToggleSave={onToggleLike} {...{currentTrack, isPlaying, onToggleLike, myMusicTrackIds, progress, duration, onSeek, loadingTrackId, buffered, togglePlayPause}}/> : <p className="text-center py-10 text-slate-500">Ваша музыка пуста.</p>)}
                                {activeTab === 'recently-played' && (recentlyPlayed.length > 0 ? <TrackList tracks={recentlyPlayed} onSelectTrack={(track) => playTrack(track, recentlyPlayed)} onToggleSave={onToggleLike} {...{currentTrack, isPlaying, onToggleLike, myMusicTrackIds, progress, duration, onSeek, loadingTrackId, buffered, togglePlayPause}}/> : <p className="text-center py-10 text-slate-500">Вы еще ничего не слушали.</p>)}
                                {activeTab === 'playlists' && (
                                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                                        <div className="relative group aspect-square">
                                            <button onClick={() => setCreatePlaylistModalOpen(true)} className="w-full h-full flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-blue-500 hover:text-blue-500 transition-colors">
                                                <PlusCircle size={40} />
                                                <span className="mt-2 font-semibold text-center">Создать плейлист</span>
                                            </button>
                                        </div>
                                        {playlists.map(p => 
                                            <PlaylistCard 
                                                key={p._id} 
                                                playlist={p} 
                                                onClick={() => navigate(`/music/playlist/${p._id}`)} 
                                                onEdit={handleEditPlaylist} 
                                                onDelete={handleDeletePlaylist} />
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    )}
                </div>
            </div>
        </main>
    );
    // --- КОНЕЦ ИЗМЕНЕНИЙ ---
};

export default MusicPage;