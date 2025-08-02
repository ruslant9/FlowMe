import React, { useState, useEffect, useCallback, useRef } from 'react';
import useTitle from '../hooks/useTitle';
import axios from 'axios';
import toast from 'react-hot-toast';
import TrackList from '../components/music/TrackList';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2, Search, Music, History, Star, ListMusic, PlusCircle, UploadCloud } from 'lucide-react';
import RecommendationCard from '../components/music/RecommendationCard';
import ArtistAvatar from '../components/music/ArtistAvatar';
import MusicWave from '../components/music/MusicWave';
import CreatePlaylistModal from '../components/modals/CreatePlaylistModal';
import PlaylistCard from '../components/music/PlaylistCard';
import EditPlaylistModal from '../components/modals/EditPlaylistModal';
import UploadContentModal from '../components/modals/UploadContentModal';

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
        if (location.state?.defaultTab) return location.state.defaultTab;
        const savedTab = localStorage.getItem('musicActiveTab');
        return ['search', 'recommendations', 'my-music', 'recently-played', 'playlists'].includes(savedTab) ? savedTab : 'recommendations';
    };

    const [activeTab, setActiveTab] = useState(getInitialTab);
    
    // Состояние для главной страницы
    const [mainPageData, setMainPageData] = useState({ newReleases: [], popularHits: [], similarArtists: [] });
    const [loadingRecommendations, setLoadingRecommendations] = useState(true);

    // Состояния для других вкладок
    const [myMusicTracks, setMyMusicTracks] = useState([]);
    const [recentlyPlayed, setRecentlyPlayed] = useState([]);
    const [playlists, setPlaylists] = useState([]);
    const [loadingTabData, setLoadingTabData] = useState(false);
    
    const { playTrack, currentTrack, isPlaying, onToggleLike, myMusicTrackIds } = useMusicPlayer(); 
    
    // Состояния для поиска
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState({ tracks: [], playlists: [], artists: [], albums: [] });
    const [loadingSearch, setLoadingSearch] = useState(false);
    const [searchPage, setSearchPage] = useState(1);
    const [hasMoreSearchResults, setHasMoreSearchResults] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const observer = useRef();
    
    // Модальные окна
    const [isUploadModalOpen, setUploadModalOpen] = useState(false);
    const [isCreatePlaylistModalOpen, setCreatePlaylistModalOpen] = useState(false);
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [playlistToEdit, setPlaylistToEdit] = useState(null);

    // --- ЕДИНАЯ ФУНКЦИЯ ЗАГРУЗКИ ДАННЫХ ---
    const fetchDataForTab = useCallback(async (tab, query = '', page = 1) => {
        const token = localStorage.getItem('token');
        const headers = { headers: { Authorization: `Bearer ${token}` } };

        const resetSearch = () => {
            setSearchQuery('');
            setSearchResults({ tracks: [], playlists: [], artists: [], albums: [] });
        };
        
        switch (tab) {
            case 'recommendations':
                setLoadingRecommendations(true);
                resetSearch();
                try {
                    const res = await axios.get(`${API_URL}/api/music/main-page-data`, headers);
                    setMainPageData(res.data);
                } catch (e) { toast.error("Не удалось загрузить рекомендации."); }
                setLoadingRecommendations(false);
                break;

            case 'my-music':
                setLoadingTabData(true);
                resetSearch();
                try {
                    const res = await axios.get(`${API_URL}/api/music/saved`, headers);
                    setMyMusicTracks(res.data);
                } catch (e) { toast.error('Не удалось загрузить Мою музыку.'); }
                setLoadingTabData(false);
                break;

            case 'playlists':
                setLoadingTabData(true);
                resetSearch();
                try {
                    const res = await axios.get(`${API_URL}/api/playlists`, headers);
                    setPlaylists(res.data);
                } catch (e) { toast.error('Не удалось загрузить плейлисты.'); }
                setLoadingTabData(false);
                break;

            case 'recently-played':
                setLoadingTabData(true);
                resetSearch();
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
                    setSearchResults(prev => page === 1 ? res.data : { ...prev, tracks: [...prev.tracks, ...res.data.tracks] });
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
        const debounce = setTimeout(() => {
             setSearchPage(1);
             fetchDataForTab(activeTab, searchQuery, 1);
        }, 300);
        return () => clearTimeout(debounce);
    }, [activeTab, searchQuery, fetchDataForTab]);

    const lastTrackElementRef = useCallback(node => {
        if (loadingMore) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMoreSearchResults) {
                fetchDataForTab('search', searchQuery, searchPage + 1);
            }
        });
        if (node) observer.current.observe(node);
    }, [loadingMore, hasMoreSearchResults, fetchDataForTab, searchQuery, searchPage]);
    
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

    const handleArtistClick = (artistName) => {
        setActiveTab('search');
        setSearchQuery(artistName);
    };

    return (
        <div className="flex-1 p-4 md:p-8">
            <UploadContentModal isOpen={isUploadModalOpen} onClose={() => setUploadModalOpen(false)} />
            <CreatePlaylistModal isOpen={isCreatePlaylistModalOpen} onClose={() => setCreatePlaylistModalOpen(false)} onPlaylistCreated={() => fetchDataForTab('playlists')} />
            <EditPlaylistModal isOpen={isEditModalOpen} onClose={() => setEditModalOpen(false)} playlist={playlistToEdit} onPlaylistUpdated={() => fetchDataForTab('playlists')} />
            
            <div className="ios-glass-final rounded-3xl p-6 w-full max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-3xl font-bold">Музыка</h1>
                    <button onClick={() => setUploadModalOpen(true)} className="flex items-center space-x-2 text-sm bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors">
                        <UploadCloud size={18} /> <span>Загрузить аудио</span>
                    </button>
                </div>

                <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-white/10 pb-4 mb-4 overflow-x-auto">
                    <TabButton active={activeTab === 'recommendations'} onClick={() => setActiveTab('recommendations')}><Star size={16}/><span>Главная</span></TabButton>
                    <TabButton active={activeTab === 'search'} onClick={() => setActiveTab('search')}><Search size={16}/><span>Поиск</span></TabButton>
                    <TabButton active={activeTab === 'my-music'} onClick={() => setActiveTab('my-music')}><Music size={16}/><span>Моя музыка</span></TabButton>
                    <TabButton active={activeTab === 'playlists'} onClick={() => setActiveTab('playlists')}><ListMusic size={16}/><span>Мои плейлисты</span></TabButton>
                    <TabButton active={activeTab === 'recently-played'} onClick={() => setActiveTab('recently-played')}><History size={16}/><span>Вы слушали</span></TabButton>
                </div>
                
                {activeTab === 'recommendations' && (
                    loadingRecommendations ? <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin"/></div> : (
                        <div className="space-y-10">
                            <div><MusicWave onPlay={handlePlayWave} /></div>
                            {mainPageData.popularHits.length > 0 && (
                                <div>
                                    <h2 className="text-2xl font-bold mb-4">Хиты платформы</h2>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                        {mainPageData.popularHits.map(track => <RecommendationCard key={track._id} track={track} onSelectTrack={() => playTrack(track, mainPageData.popularHits)} />)}
                                    </div>
                                </div>
                            )}
                            {mainPageData.newReleases.length > 0 && (
                                <div>
                                    <h2 className="text-2xl font-bold mb-4">Новинки</h2>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                         {mainPageData.newReleases.map(track => <RecommendationCard key={track._id} track={track} onSelectTrack={() => playTrack(track, mainPageData.newReleases)} />)}
                                    </div>
                                </div>
                            )}
                             {mainPageData.similarArtists.length > 0 && (
                                <div>
                                    <h2 className="text-2xl font-bold mb-4">В стиле ваших любимых артистов</h2>
                                    <div className="flex justify-around items-start">
                                        {mainPageData.similarArtists.map(artist => <ArtistAvatar key={artist._id} artistName={artist.name} onClick={() => handleArtistClick(artist.name)} avatarUrl={artist.avatarUrl} />)}
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                )}

                {activeTab === 'search' && (
                    <div>
                        <div className="relative mb-4">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input type="text" placeholder="Артист, альбом или трек..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-slate-200/70 dark:bg-black/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        {loadingSearch ? <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin"/></div> : (
                            searchResults.artists.length === 0 && searchResults.albums.length === 0 && searchResults.tracks.length === 0 && searchQuery ? 
                            <p className="text-center py-10 text-slate-500">Ничего не найдено.</p> :
                            <div className="space-y-6">
                                {/* Здесь будет рендеринг результатов поиска: артисты, альбомы, треки */}
                            </div>
                        )}
                    </div>
                )}
                
                {['my-music', 'recently-played', 'playlists'].includes(activeTab) && (
                    loadingTabData ? <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin"/></div> : (
                        <div>
                            {activeTab === 'my-music' && (myMusicTracks.length > 0 ? <TrackList tracks={myMusicTracks} onSelectTrack={(track) => playTrack(track, myMusicTracks)} {...{currentTrack, isPlaying, onToggleLike, myMusicTrackIds}}/> : <p className="text-center py-10 text-slate-500">Ваша музыка пуста.</p>)}
                            {activeTab === 'recently-played' && (recentlyPlayed.length > 0 ? <TrackList tracks={recentlyPlayed} onSelectTrack={(track) => playTrack(track, recentlyPlayed)} {...{currentTrack, isPlaying, onToggleLike, myMusicTrackIds}}/> : <p className="text-center py-10 text-slate-500">Вы еще ничего не слушали.</p>)}
                            {activeTab === 'playlists' && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    <div className="relative group aspect-square">
                                        <button onClick={() => setCreatePlaylistModalOpen(true)} className="w-full h-full flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-blue-500 hover:text-blue-500 transition-colors">
                                            <PlusCircle size={40} />
                                            <span className="mt-2 font-semibold">Создать плейлист</span>
                                        </button>
                                    </div>
                                    {playlists.map(p => <PlaylistCard key={p._id} playlist={p} onClick={() => navigate(`/music/playlist/${p._id}`)} onEdit={() => {}} onDelete={() => {}} />)}
                                </div>
                            )}
                        </div>
                    )
                )}
            </div>
        </div>
    );
};

export default MusicPage;