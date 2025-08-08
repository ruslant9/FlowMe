// frontend/src/pages/MusicPage.jsx --- ПОЛНЫЙ ИСПРАВЛЕННЫЙ ФАЙЛ ---

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import useTitle from '../hooks/useTitle';
import axios from 'axios';
import { Loader2, Music, Search, Clock, Disc, MicVocal, ListMusic, ChevronRight, Waves, PlusCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useMusicPlayer } from '../context/MusicPlayerContext';

import PageWrapper from '../components/PageWrapper';
import PlaylistTrackItem from '../components/music/PlaylistTrackItem';
import MusicWave from '../components/music/MusicWave';
import RecommendationCard from '../components/music/RecommendationCard';
import ArtistAvatar from '../components/music/ArtistAvatar';
import AlbumCard from '../components/music/AlbumCard';
import PlaylistCard from '../components/music/PlaylistCard';
import ResponsiveNav from '../components/ResponsiveNav';
import CreatePlaylistModal from '../components/modals/CreatePlaylistModal';
import UploadContentModal from '../components/modals/UploadContentModal';

const API_URL = import.meta.env.VITE_API_URL;

const SectionHeader = ({ title, icon: Icon, onSeeAll }) => (
    <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
            {Icon && <Icon className="w-7 h-7 text-blue-500" />}
            <h2 className="text-2xl font-bold">{title}</h2>
        </div>
        {onSeeAll && (
            <button onClick={onSeeAll} className="flex items-center space-x-1 text-sm font-semibold text-blue-500 hover:underline">
                <span>См. все</span>
                <ChevronRight size={16} />
            </button>
        )}
    </div>
);

const TabButton = ({ active, onClick, children, icon: Icon }) => (
    <button
        onClick={onClick}
        className={`relative flex items-center space-x-2 px-4 py-3 text-sm font-semibold transition-colors ${
            active 
            ? 'text-slate-800 dark:text-white' 
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
        }`}
    >
        <Icon size={18} />
        <span>{children}</span>
        {active && (
            <motion.div
                layoutId="musicTabIndicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
        )}
    </button>
);

const RecommendationsView = ({ recommendations, loading, onPlayWave }) => {
    const { playTrack, currentTrack, isPlaying, loadingTrackId, togglePlayPause } = useMusicPlayer();
    
    if (loading) return <div className="flex justify-center p-20"><Loader2 className="w-10 h-10 animate-spin" /></div>;
    if (!recommendations) return <div className="text-center p-20 text-slate-500">Не удалось загрузить рекомендации.</div>;

    return (
        <div className="space-y-12">
            <MusicWave onPlay={onPlayWave} />

            {recommendations.newReleases?.length > 0 && (
                <section>
                    <SectionHeader title="Новинки" icon={Disc} />
                    <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-3">
                        {recommendations.newReleases.slice(0, 10).map(track => (
                            <RecommendationCard 
                                key={track._id}
                                track={track}
                                onSelectTrack={() => playTrack(track, recommendations.newReleases)}
                                isCurrent={track._id === currentTrack?._id}
                                isPlaying={isPlaying && track._id === currentTrack?._id}
                                isLoading={loadingTrackId === track._id}
                                onPlayPause={togglePlayPause}
                            />
                        ))}
                    </div>
                </section>
            )}

            {recommendations.popularHits?.length > 0 && (
                <section>
                    <SectionHeader title="Популярные хиты" icon={Music} />
                    <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-3">
                        {recommendations.popularHits.slice(0, 10).map((track, index) => (
                            <RecommendationCard 
                                key={track._id}
                                track={track}
                                onSelectTrack={() => playTrack(track, recommendations.popularHits)}
                                isCurrent={track._id === currentTrack?._id}
                                isPlaying={isPlaying && track._id === currentTrack?._id}
                                isLoading={loadingTrackId === track._id}
                                onPlayPause={togglePlayPause}
                                isHit={index === 0}
                            />
                        ))}
                    </div>
                </section>
            )}

            {recommendations.popularArtists?.length > 0 && (
                 <section>
                    <SectionHeader title="Популярные исполнители" icon={MicVocal} />
                    <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-y-4 gap-x-2">
                         {recommendations.popularArtists.slice(0, 10).map(artist => (
                             <ArtistAvatar key={artist._id} artist={artist} size="xl" />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
};

const MusicListView = ({ tracks, loading, onPlayTrack, onToggleSave, myMusicTrackIds, title, emptyMessage }) => {
    const { currentTrack, isPlaying } = useMusicPlayer();
    if (loading) return <div className="flex justify-center p-20"><Loader2 className="w-10 h-10 animate-spin" /></div>;
    if (!tracks || tracks.length === 0) return <div className="text-center p-20 text-slate-500">{emptyMessage}</div>;
    
    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold">{title} ({tracks.length})</h2>
            <div className="space-y-1">
                {tracks.map((track, index) => (
                    <PlaylistTrackItem 
                        key={track._id}
                        track={track}
                        index={index + 1}
                        onPlay={() => onPlayTrack(track)}
                        isCurrent={track._id === currentTrack?._id}
                        isPlaying={isPlaying}
                        onToggleSave={onToggleSave}
                        isSaved={myMusicTrackIds.has(track.sourceId || track._id)}
                    />
                ))}
            </div>
        </div>
    );
};

const PlaylistsView = ({ playlists, loading, onCreate, onPlaylistUpdated, onPlaylistDeleted }) => {
    const navigate = useNavigate();
    
    if (loading) return <div className="flex justify-center p-20"><Loader2 className="w-10 h-10 animate-spin" /></div>;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Плейлисты ({playlists.length})</h2>
                <button onClick={onCreate} className="flex items-center space-x-2 text-sm bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors">
                    <PlusCircle size={18} />
                    <span>Создать</span>
                </button>
            </div>
            {playlists.length === 0 ? (
                <div className="text-center p-20 text-slate-500">У вас еще нет плейлистов.</div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {playlists.map(playlist => (
                        <PlaylistCard
                            key={playlist._id}
                            playlist={playlist}
                            onClick={() => navigate(`/music/playlist/${playlist._id}`)}
                            onDelete={() => onPlaylistDeleted(playlist._id)}
                            onEdit={() => onPlaylistUpdated(playlist)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const SearchView = ({ query, setQuery, results, loading, onSearchMore, hasMore, onPlayTrack, loadingMore, onToggleSave, myMusicTrackIds }) => {
    const navigate = useNavigate();
    const { currentTrack, isPlaying } = useMusicPlayer();
    const { tracks, artists, albums, playlists } = results;
    const hasResults = tracks?.length > 0 || artists?.length > 0 || albums?.length > 0 || playlists?.length > 0;
    
    return (
        <div className="space-y-8">
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Что будем слушать?"
                    className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>
            
            {loading && query && <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin" /></div>}
            
            {!loading && query && !hasResults && <div className="text-center p-20 text-slate-500">Ничего не найдено. Попробуйте другой запрос.</div>}
            
            {!query && !loading && (
                 <div className="text-center p-20 text-slate-500">
                    <Music size={48} className="mx-auto mb-4" />
                    <p>Найдите любимые треки, альбомы, артистов и плейлисты.</p>
                </div>
            )}

            {hasResults && (
                <div className="space-y-12">
                    {artists?.length > 0 && (
                        <section>
                            <SectionHeader title="Артисты" icon={MicVocal} />
                            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-8 gap-4">
                                {artists.map(artist => <ArtistAvatar key={artist._id} artist={artist} />)}
                            </div>
                        </section>
                    )}
                    {albums?.length > 0 && (
                        <section>
                            <SectionHeader title="Альбомы" icon={Disc} />
                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                                {albums.map(album => <AlbumCard key={album._id} album={album} />)}
                            </div>
                        </section>
                    )}
                     {playlists?.length > 0 && (
                        <section>
                            <SectionHeader title="Плейлисты" icon={ListMusic} />
                             <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                                {playlists.map(playlist => <PlaylistCard key={playlist._id} playlist={playlist} onClick={() => navigate(`/music/playlist/${playlist._id}`)} />)}
                            </div>
                        </section>
                    )}
                    {tracks?.length > 0 && (
                        <section>
                            <SectionHeader title="Треки" icon={Music} />
                            <div className="space-y-1">
                                {tracks.map((track, index) => (
                                    <PlaylistTrackItem 
                                        key={track._id} 
                                        track={track} 
                                        index={index + 1} 
                                        onPlay={() => onPlayTrack(track, tracks)}
                                        isCurrent={track._id === currentTrack?._id}
                                        isPlaying={isPlaying}
                                        onToggleSave={onToggleSave}
                                        isSaved={myMusicTrackIds.has(track.sourceId || track._id)}
                                    />
                                ))}
                            </div>
                            {hasMore && (
                                <div className="mt-6 text-center">
                                     <button 
                                        onClick={onSearchMore} 
                                        disabled={loadingMore}
                                        className="px-6 py-2 bg-slate-200 dark:bg-white/10 text-sm font-semibold rounded-full hover:bg-slate-300 dark:hover:bg-white/20 flex items-center justify-center mx-auto disabled:opacity-70"
                                    >
                                        {loadingMore ? (
                                            <><Loader2 className="animate-spin mr-2" size={16} /> <span>Загрузка...</span></>
                                        ) : (
                                            'Загрузить еще'
                                        )}
                                    </button>
                                </div>
                            )}
                        </section>
                    )}
                </div>
            )}
        </div>
    );
};

const MusicPage = () => {
    useTitle('Музыка');
    const location = useLocation();
    const navigate = useNavigate();
    const { playTrack, myMusicTrackIds, onToggleLike } = useMusicPlayer();
    
    const [activeTab, setActiveTab] = useState(location.state?.defaultTab || 'recommendations');
    
    const [recommendations, setRecommendations] = useState(null);
    const [myMusic, setMyMusic] = useState([]);
    const [history, setHistory] = useState([]);
    const [playlists, setPlaylists] = useState([]);
    const [isCreatePlaylistModalOpen, setIsCreatePlaylistModalOpen] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState({});
    const [searchPage, setSearchPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    const [loading, setLoading] = useState({
        recommendations: true, myMusic: true, history: true, playlists: true, search: false, wave: false
    });

    // --- НАЧАЛО ИСПРАВЛЕНИЯ: Убираем useCallback и определяем fetchData внутри useEffect ---
    useEffect(() => {
        const fetchData = async (tab) => {
            if (tab === 'search') return; // Поиск обрабатывается отдельно
            
            setLoading(prev => ({ ...prev, [tab]: true }));
            try {
                const token = localStorage.getItem('token');
                const headers = { headers: { Authorization: `Bearer ${token}` } };
                let endpoint = '';
                let setStateFunc = () => {};

                switch(tab) {
                    case 'recommendations':
                        endpoint = `${API_URL}/api/music/recommendations`;
                        setStateFunc = setRecommendations;
                        break;
                    case 'my-music':
                        endpoint = `${API_URL}/api/music/saved`;
                        setStateFunc = setMyMusic;
                        break;
                    case 'history':
                        endpoint = `${API_URL}/api/music/history`;
                        setStateFunc = setHistory;
                        break;
                    case 'playlists':
                        endpoint = `${API_URL}/api/playlists`;
                        setStateFunc = setPlaylists;
                        break;
                    default: return;
                }
                const res = await axios.get(endpoint, headers);
                setStateFunc(res.data);
            } catch (error) {
                toast.error(`Не удалось загрузить раздел "${tab}"`);
            } finally {
                setLoading(prev => ({ ...prev, [tab]: false }));
            }
        };
        
        fetchData(activeTab);
    }, [activeTab]);
    // --- КОНЕЦ ИСПРАВЛЕНИЯ ---
    
    const fetchSearch = useCallback(async (query, page) => {
        if (!query.trim()) {
            setSearchResults({});
            setHasMore(false);
            return;
        }
        if (page > 1) {
            setLoadingMore(true);
        } else {
            setLoading(prev => ({ ...prev, search: true }));
        }
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/api/music/search-all?q=${query}&page=${page}`, { headers: { Authorization: `Bearer ${token}` } });
            setSearchResults(prev => ({
                tracks: page === 1 ? res.data.tracks : [...(prev.tracks || []), ...res.data.tracks],
                artists: page === 1 ? res.data.artists : prev.artists,
                albums: page === 1 ? res.data.albums : prev.albums,
                playlists: page === 1 ? res.data.playlists : prev.playlists,
            }));
            setHasMore(res.data.hasMore);
            setSearchPage(page);
        } catch (error) {
            toast.error("Ошибка поиска.");
        } finally {
            if (page > 1) {
                setLoadingMore(false);
            } else {
                setLoading(prev => ({ ...prev, search: false }));
            }
        }
    }, []);

    const handlePlayWave = useCallback(async () => {
        setLoading(prev => ({ ...prev, wave: true }));
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/api/music/wave`, { headers: { Authorization: `Bearer ${token}` } });
            if (res.data.length > 0) {
                playTrack(res.data[0], res.data, { startShuffled: true });
            } else {
                toast.error("Не удалось сгенерировать волну.");
            }
        } catch (error) {
            toast.error("Ошибка при запуске волны.");
        } finally {
            setLoading(prev => ({ ...prev, wave: false }));
        }
    }, [playTrack]);

    useEffect(() => {
        const debounce = setTimeout(() => {
            fetchSearch(searchQuery, 1);
        }, 300);
        return () => clearTimeout(debounce);
    }, [searchQuery, fetchSearch]);

    const handleSearchMore = () => {
        fetchSearch(searchQuery, searchPage + 1);
    };

    const handleTabClick = (tabName) => {
        setActiveTab(tabName);
        navigate('/music', { state: { defaultTab: tabName }, replace: true });
    };

    const navItems = [
        { key: 'recommendations', label: 'Рекомендации', icon: Waves, onClick: () => handleTabClick('recommendations') },
        { key: 'my-music', label: 'Моя музыка', icon: Music, onClick: () => handleTabClick('my-music') },
        { key: 'playlists', label: 'Плейлисты', icon: ListMusic, onClick: () => handleTabClick('playlists') },
        { key: 'history', label: 'История', icon: Clock, onClick: () => handleTabClick('history') },
        { key: 'search', label: 'Поиск', icon: Search, onClick: () => handleTabClick('search') },
        { key: 'upload', label: 'Загрузить', icon: PlusCircle, onClick: () => setIsUploadModalOpen(true) },
    ];
    
    return (
        <PageWrapper>
            <CreatePlaylistModal 
                isOpen={isCreatePlaylistModalOpen}
                onClose={() => setIsCreatePlaylistModalOpen(false)}
                onPlaylistCreated={() => { // --- ИЗМЕНЕНИЕ: Используем новый способ для обновления ---
                    const event = new CustomEvent('refetchMusicData', { detail: 'playlists' });
                    window.dispatchEvent(event);
                }}
            />
            <UploadContentModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
            />
            <main className="flex-1 p-4 md:p-8">
                <div className="max-w-7xl mx-auto">
                    <div className="flex justify-between items-center mb-8">
                        <h1 className="text-4xl font-bold">Музыка</h1>
                        <button onClick={() => setIsUploadModalOpen(true)} className="hidden md:flex items-center space-x-2 text-sm bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors">
                            <PlusCircle size={18} />
                            <span>Загрузить трек</span>
                        </button>
                    </div>

                    <div className="hidden md:flex border-b border-slate-200 dark:border-slate-700/50 -mx-4 px-4 mb-8 overflow-x-auto no-scrollbar">
                        {/* --- ИЗМЕНЕНИЕ: Убираем дублирующую кнопку "Загрузить" из табов --- */}
                        {navItems.filter(item => item.key !== 'upload').map(item => (
                            <TabButton key={item.key} active={activeTab === item.key} onClick={item.onClick} icon={item.icon}>
                                {item.label}
                            </TabButton>
                        ))}
                    </div>

                    <div className="md:hidden mb-6">
                        <ResponsiveNav 
                            items={navItems}
                            visibleCount={4} 
                            activeKey={activeTab}
                        />
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            {activeTab === 'recommendations' && <RecommendationsView recommendations={recommendations} loading={loading.recommendations} onPlayWave={handlePlayWave} onSeeAll={(q) => { setActiveTab('search'); setSearchQuery(q); }} />}
                            {activeTab === 'my-music' && <MusicListView tracks={myMusic} loading={loading.myMusic} title="Моя музыка" emptyMessage="Вы еще не добавили ни одного трека." onPlayTrack={(track) => playTrack(track, myMusic)} onToggleSave={onToggleLike} myMusicTrackIds={myMusicTrackIds} />}
                            {activeTab === 'history' && <MusicListView tracks={history} loading={loading.history} title="Недавно прослушанные" emptyMessage="Ваша история прослушиваний пуста." onPlayTrack={(track) => playTrack(track, history)} onToggleSave={onToggleLike} myMusicTrackIds={myMusicTrackIds} />}
                            {activeTab === 'playlists' && <PlaylistsView playlists={playlists} loading={loading.playlists} onCreate={() => setIsCreatePlaylistModalOpen(false)} />}
                            {activeTab === 'search' && 
                                <SearchView 
                                    query={searchQuery} 
                                    setQuery={setSearchQuery} 
                                    results={searchResults} 
                                    loading={loading.search} 
                                    onSearchMore={handleSearchMore} 
                                    hasMore={hasMore} 
                                    onPlayTrack={(track, tracklist) => playTrack(track, tracklist)} 
                                    loadingMore={loadingMore}
                                    onToggleSave={onToggleLike}
                                    myMusicTrackIds={myMusicTrackIds}
                                />
                            }
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>
        </PageWrapper>
    );
};

export default MusicPage;