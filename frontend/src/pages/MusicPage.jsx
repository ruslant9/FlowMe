// frontend/src/pages/MusicPage.jsx

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import useTitle from '../hooks/useTitle';
import axios from 'axios';
import { Loader2, Music, Search, Clock, Disc, MicVocal, ListMusic, ChevronRight, Waves } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useMusicPlayer } from '../context/MusicPlayerContext';

import PageWrapper from '../components/PageWrapper';
import TrackItem from '../components/music/TrackItem';
import MusicWave from '../components/music/MusicWave';
import RecommendationCard from '../components/music/RecommendationCard';
import ArtistAvatar from '../components/music/ArtistAvatar';
import AlbumCard from '../components/music/AlbumCard';
import PlaylistCard from '../components/music/PlaylistCard';

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
                    <div className="flex space-x-4 -mx-4 px-4 overflow-x-auto pb-4">
                        {recommendations.newReleases.map(track => (
                            <div key={track._id} className="w-1/2 sm:w-1/4 md:w-1/5 lg:w-[15%] flex-shrink-0">
                                <RecommendationCard 
                                    track={track}
                                    onSelectTrack={() => playTrack(track, recommendations.newReleases)}
                                    isCurrent={track._id === currentTrack?._id}
                                    isPlaying={isPlaying && track._id === currentTrack?._id}
                                    isLoading={loadingTrackId === track._id}
                                    onPlayPause={togglePlayPause}
                                />
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {recommendations.popularHits?.length > 0 && (
                <section>
                    <SectionHeader title="Популярные хиты" icon={Music} />
                    <div className="flex space-x-4 -mx-4 px-4 overflow-x-auto pb-4">
                        {recommendations.popularHits.map((track, index) => (
                             <div key={track._id} className="w-1/2 sm:w-1/4 md:w-1/5 lg:w-[15%] flex-shrink-0">
                                <RecommendationCard 
                                    track={track}
                                    onSelectTrack={() => playTrack(track, recommendations.popularHits)}
                                    isCurrent={track._id === currentTrack?._id}
                                    isPlaying={isPlaying && track._id === currentTrack?._id}
                                    isLoading={loadingTrackId === track._id}
                                    onPlayPause={togglePlayPause}
                                    isHit={index === 0}
                                />
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {recommendations.popularArtists?.length > 0 && (
                 <section>
                    <SectionHeader title="Популярные исполнители" icon={MicVocal} />
                    <div className="flex space-x-4 -mx-4 px-4 overflow-x-auto pb-4">
                         {recommendations.popularArtists.map(artist => (
                             <div key={artist._id} className="w-1/4 sm:w-1/6 md:w-1/8 lg:w-[10%] flex-shrink-0">
                                 <ArtistAvatar artist={artist} />
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
};

const MusicListView = ({ tracks, loading, onPlayTrack, onToggleSave, myMusicTrackIds, title, emptyMessage, showDeleteButton = false, onDeleteFromHistory }) => {
    if (loading) return <div className="flex justify-center p-20"><Loader2 className="w-10 h-10 animate-spin" /></div>;
    if (!tracks || tracks.length === 0) return <div className="text-center p-20 text-slate-500">{emptyMessage}</div>;
    
    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold">{title} ({tracks.length})</h2>
            <div className="space-y-2">
                {tracks.map(track => (
                    <TrackItem 
                        key={track._id}
                        track={track}
                        onSelectTrack={onPlayTrack}
                        onToggleSave={onToggleSave}
                        isSaved={myMusicTrackIds.has(track.sourceId || track._id)}
                        showDeleteButton={showDeleteButton}
                        onDeleteFromHistory={onDeleteFromHistory}
                    />
                ))}
            </div>
        </div>
    );
};

const SearchView = ({ query, setQuery, results, loading, onSearchMore, hasMore }) => {
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
                    className="w-full pl-12 pr-4 py-3 bg-slate-100 dark:bg-slate-800 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                            <div className="space-y-2">
                                {tracks.map(track => <TrackItem key={track._id} track={track} />)}
                            </div>
                            {hasMore && (
                                <div className="mt-6 text-center">
                                    <button onClick={onSearchMore} className="px-6 py-2 bg-slate-200 dark:bg-white/10 text-sm font-semibold rounded-full hover:bg-slate-300 dark:hover:bg-white/20">
                                        Загрузить еще
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
    const [wave, setWave] = useState([]);

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState({});
    const [searchPage, setSearchPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);

    const [loading, setLoading] = useState({
        recommendations: true, myMusic: true, history: true, search: false, wave: false
    });

    const fetchData = useCallback(async (tab) => {
        setLoading(prev => ({ ...prev, [tab]: true }));
        try {
            const token = localStorage.getItem('token');
            const headers = { headers: { Authorization: `Bearer ${token}` } };
            let res;
            switch(tab) {
                case 'recommendations':
                    res = await axios.get(`${API_URL}/api/music/recommendations`, headers);
                    setRecommendations(res.data);
                    break;
                case 'my-music':
                    res = await axios.get(`${API_URL}/api/music/saved`, headers);
                    setMyMusic(res.data);
                    break;
                case 'history':
                    res = await axios.get(`${API_URL}/api/music/history`, headers);
                    setHistory(res.data);
                    break;
                default: break;
            }
        } catch (error) {
            toast.error(`Не удалось загрузить раздел "${tab}"`);
        } finally {
            setLoading(prev => ({ ...prev, [tab]: false }));
        }
    }, []);
    
    const fetchSearch = useCallback(async (query, page) => {
        if (!query) {
            setSearchResults({});
            return;
        }
        setLoading(prev => ({ ...prev, search: true }));
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
            setLoading(prev => ({ ...prev, search: false }));
        }
    }, []);

    const handlePlayWave = useCallback(async () => {
        setLoading(prev => ({ ...prev, wave: true }));
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/api/music/wave`, { headers: { Authorization: `Bearer ${token}` } });
            setWave(res.data);
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
        if (activeTab !== 'search') {
            fetchData(activeTab);
        }
    }, [activeTab, fetchData]);

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

    return (
        <PageWrapper>
            <main className="flex-1 p-4 md:p-8">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-4xl font-bold mb-8">Музыка</h1>
                    <div className="border-b border-slate-200 dark:border-slate-700/50 -mx-4 px-4 mb-8 overflow-x-auto no-scrollbar flex">
                        <TabButton active={activeTab === 'recommendations'} onClick={() => handleTabClick('recommendations')} icon={Waves}>Рекомендации</TabButton>
                        <TabButton active={activeTab === 'my-music'} onClick={() => handleTabClick('my-music')} icon={Music}>Моя музыка</TabButton>
                        <TabButton active={activeTab === 'history'} onClick={() => handleTabClick('history')} icon={Clock}>История</TabButton>
                        <TabButton active={activeTab === 'search'} onClick={() => handleTabClick('search')} icon={Search}>Поиск</TabButton>
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            {activeTab === 'recommendations' && <RecommendationsView recommendations={recommendations} loading={loading.recommendations} onPlayWave={handlePlayWave} />}
                            {activeTab === 'my-music' && <MusicListView tracks={myMusic} loading={loading.myMusic} title="Моя музыка" emptyMessage="Вы еще не добавили ни одного трека." onPlayTrack={(track) => playTrack(track, myMusic)} onToggleSave={onToggleLike} myMusicTrackIds={myMusicTrackIds} />}
                            {activeTab === 'history' && <MusicListView tracks={history} loading={loading.history} title="Недавно прослушанные" emptyMessage="Ваша история прослушиваний пуста." onPlayTrack={(track) => playTrack(track, history)} onToggleSave={onToggleLike} myMusicTrackIds={myMusicTrackIds} />}
                            {activeTab === 'search' && <SearchView query={searchQuery} setQuery={setSearchQuery} results={searchResults} loading={loading.search} onSearchMore={handleSearchMore} hasMore={hasMore} />}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>
        </PageWrapper>
    );
};

export default MusicPage;