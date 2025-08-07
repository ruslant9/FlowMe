// frontend/src/pages/MusicPage.jsx --- ФАЙЛ С ПОШАГОВЫМ ЛОГИРОВАНИЕМ ---

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
import ArtistCard from '../components/music/ArtistCard';
import AlbumCard from '../components/music/AlbumCard';
import { useModal } from '../hooks/useModal';
import PageWrapper from '../components/PageWrapper';
import ResponsiveNav from '../components/ResponsiveNav';

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
        return ['search', 'my-music', 'recently-played', 'playlists'].includes(savedTab) ? savedTab : 'my-music';
    };

    const [activeTab, setActiveTab] = useState(getInitialTab);
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
        const resetSearchState = () => { setSearchPage(1); setSearchResults({ tracks: [], playlists: [], artists: [], albums: [] }); setHasMoreSearchResults(true); };
        
        switch (tab) {
            case 'my-music':
                setLoadingTabData(true); resetSearchState();
                try { const res = await axios.get(`${API_URL}/api/music/saved`, headers); setMyMusicTracks(res.data); } catch (e) { toast.error('Не удалось загрузить Мою музыку.'); }
                setLoadingTabData(false); break;
            case 'playlists':
                setLoadingTabData(true); resetSearchState();
                try { const res = await axios.get(`${API_URL}/api/playlists`, headers); setPlaylists(res.data); } catch (e) { toast.error('Не удалось загрузить плейлисты.'); }
                setLoadingTabData(false); break;
            case 'recently-played':
                setLoadingTabData(true); resetSearchState();
                try { const res = await axios.get(`${API_URL}/api/music/history`, headers); setRecentlyPlayed(res.data); } catch (e) { toast.error('Не удалось загрузить историю.'); }
                setLoadingTabData(false); break;
            case 'search':
                if (!query.trim()) { setSearchResults({ tracks: [], playlists: [], artists: [], albums: [] }); setHasMoreSearchResults(false); return; }
                if (page === 1) setLoadingSearch(true); else setLoadingMore(true);
                try {
                    const res = await axios.get(`${API_URL}/api/music/search-all?q=${encodeURIComponent(query)}&page=${page}`, headers);
                    setSearchResults(prev => page === 1 ? res.data : { ...prev, tracks: [...prev.tracks, ...res.data.tracks] });
                    setHasMoreSearchResults(res.data.hasMore);
                    setSearchPage(page);
                } catch (error) { toast.error("Ошибка при поиске."); }
                setLoadingSearch(false); setLoadingMore(false); break;
        }
    }, []);

    useEffect(() => { if (location.state?.defaultTab) navigate(location.pathname, { replace: true, state: {} }); localStorage.setItem('musicActiveTab', activeTab); }, [activeTab, location, navigate]);
    useEffect(() => { fetchDataForTab(activeTab); }, [activeTab, fetchDataForTab]);
    useEffect(() => { const debounce = setTimeout(() => { if (activeTab === 'search') { setSearchPage(1); fetchDataForTab('search', searchQuery, 1); } }, 300); return () => clearTimeout(debounce); }, [searchQuery, activeTab, fetchDataForTab]);
    useEffect(() => { const handleMyMusicUpdate = () => { if (activeTab === 'my-music') fetchDataForTab('my-music'); }; window.addEventListener('myMusicUpdated', handleMyMusicUpdate); return () => window.removeEventListener('myMusicUpdated', handleMyMusicUpdate); }, [activeTab, fetchDataForTab]);
    const handleSelectTrack = useCallback((track) => { let p; if (activeTab === 'my-music') p = myMusicTracks; else if (activeTab === 'recently-played') p = recentlyPlayed; else p = searchResults.tracks; playTrack(track, p); }, [myMusicTracks, recentlyPlayed, searchResults, activeTab, playTrack]);
    const handlePlayWave = useCallback(async () => { const t = toast.loading("..."); try { const token = localStorage.getItem('token'); const res = await axios.get(`${API_URL}/api/music/wave`, { headers: { Authorization: `Bearer ${token}` } }); if (res.data?.length > 0) { playTrack(res.data[0], res.data); toast.success("Ваша волна запущена!", { id: t }); } else { toast.error("Не удалось найти треки.", { id: t }); } } catch (e) { toast.error("Ошибка при запуске волны.", { id: t }); } }, [playTrack]);
    const handleEditPlaylist = (p) => { setPlaylistToEdit(p); setEditModalOpen(true); };
    const handleDeletePlaylist = (id) => { showConfirmation({ title: "Удалить плейлист?", message: "Это действие необратимо.", onConfirm: async () => { const t = toast.loading('...'); try { const token = localStorage.getItem('token'); await axios.delete(`${API_URL}/api/playlists/${id}`, { headers: { Authorization: `Bearer ${token}` } }); toast.success('Плейлист удален', { id: t }); fetchDataForTab('playlists'); } catch (e) { toast.error('Ошибка при удалении.', { id: t }); } } }); };
    const navItems = [{ k: 'my-music', l: 'Моя музыка', i: Music }, { k: 'search', l: 'Поиск', i: Search }, { k: 'playlists', l: 'Плейлисты', i: ListMusic }, { k: 'recently-played', l: 'Вы слушали', i: History }].map(item => ({...item, key: item.k, label: item.l, icon: item.i, onClick: () => setActiveTab(item.k)}));
    
    return (
        <PageWrapper>
            {console.log('[БЛОК 1/11] Рендеринг PageWrapper и модальных окон.') || null}
            <main className="flex-1 overflow-y-auto bg-slate-100 dark:bg-slate-900">
                <CreatePlaylistModal isOpen={isCreatePlaylistModalOpen} onClose={() => setCreatePlaylistModalOpen(false)} onPlaylistCreated={() => fetchDataForTab('playlists')} />
                <EditPlaylistModal isOpen={isEditModalOpen} onClose={() => setEditModalOpen(false)} playlist={playlistToEdit} onPlaylistUpdated={() => fetchDataForTab('playlists')} />
                <UploadContentModal isOpen={isUploadModalOpen} onClose={() => setUploadModalOpen(false)} />

                <div className="max-w-7xl mx-auto">
                    {console.log('[БЛОК 2/11] Рендеринг заголовка страницы.') || null}
                    <div className="flex items-center justify-between px-6 md:px-8 pt-8 pb-6">
                        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white">Музыка</h1>
                        <button onClick={() => setUploadModalOpen(true)} className="flex items-center space-x-2 text-sm bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors"><UploadCloud size={18} /> <span>Загрузить аудио</span></button>
                    </div>
                    
                    <div className="px-6 md:px-8">
                        {console.log('[БЛОК 3/11] Рендеринг навигационных вкладок.') || null}
                        <div className="hidden md:flex border-b border-slate-300 dark:border-slate-700 overflow-x-auto no-scrollbar">
                            <div className="flex items-center gap-x-2 -mb-px">
                                {navItems.map(item => (<TabButton key={item.key} active={activeTab === item.key} onClick={item.onClick}><item.icon size={16}/><span>{item.label}</span></TabButton>))}
                            </div>
                        </div>
                        <div className="md:hidden mb-6">
                            {console.log('[БЛОК 3.1] Рендеринг ResponsiveNav.') || null}
                            <ResponsiveNav items={navItems} visibleCount={4} activeKey={activeTab} />
                        </div>
                    </div>
                    
                    <div className="p-6 md:p-8">
                        {console.log(`[БЛОК 4/11] Начало рендеринга контента для вкладки: ${activeTab}.`) || null}
                        {activeTab === 'search' && (
                            <div>
                                {console.log('[БЛОК 5/11] Вкладка "Поиск": Рендеринг поля ввода.') || null}
                                <div className="relative mb-4"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/40" size={20} /><input type="text" placeholder="Артист, альбом или трек..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} autoFocus className="w-full pl-12 pr-4 py-3 bg-slate-200/70 dark:bg-black/30 text-slate-800 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 border-none focus:outline-none focus:ring-2 focus:focus:ring-blue-500 rounded-lg" /></div>
                                
                                {console.log('[БЛОК 6/11] Вкладка "Поиск": Проверка состояния для отображения контента.') || null}
                                {loadingSearch ? <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin"/></div> : (
                                    !searchQuery.trim() ? <div className="text-center py-10 text-slate-500">Начните вводить что-нибудь для поиска.</div> :
                                    (searchResults.artists.length === 0 && searchResults.albums.length === 0 && searchResults.tracks.length === 0 && searchResults.playlists.length === 0) ? <p className="text-center py-10 text-slate-500">Ничего не найдено.</p> :
                                    <div className="space-y-8">
                                        {console.log('[БЛОК 6.1] Начало рендеринга результатов поиска.') || null}
                                        {searchResults.tracks.length > 0 && (<div><h3 className="text-xl font-bold mb-3">Треки</h3>{console.log('[БЛОК 6.2] Рендеринг TrackList.') || null}<TrackList tracks={searchResults.tracks} onSelectTrack={handleSelectTrack} currentTrack={currentTrack} isPlaying={isPlaying} onToggleSave={onToggleLike} myMusicTrackIds={myMusicTrackIds} progress={progress} duration={duration} onSeek={onSeek} loadingTrackId={loadingTrackId} buffered={buffered} onPlayPauseToggle={togglePlayPause}/></div>)}
                                        {console.log('[БЛОК 6.3] Рендеринг кнопки "Показать еще".') || null}
                                        {hasMoreSearchResults && (<div className="text-center"><button onClick={() => fetchDataForTab('search', searchQuery, searchPage + 1)} disabled={loadingMore} className="px-6 py-2 bg-slate-200 dark:bg-white/10 text-sm font-semibold rounded-full hover:bg-slate-300 dark:hover:bg-white/20 transition-colors">{loadingMore ? <Loader2 className="animate-spin" /> : 'Показать еще'}</button></div>)}
                                        {console.log('[БЛОК 6.4] Начало рендеринга списка артистов.') || null}
                                        {searchResults.artists.length > 0 && (<div><h3 className="text-xl font-bold mb-3">Артисты</h3><div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-4">{searchResults.artists.map((artist, i) => {console.log(`  - Рендеринг ArtistCard #${i} для: ${artist.name}`); return <ArtistCard key={artist._id} artist={artist} />})}</div></div>)}
                                        {console.log('[БЛОК 6.5] Начало рендеринга списка альбомов.') || null}
                                        {searchResults.albums.length > 0 && (<div><h3 className="text-xl font-bold mb-3">Альбомы</h3><div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-4">{searchResults.albums.map((album, i) => {console.log(`  - Рендеринг AlbumCard #${i} для: ${album.title}`); return <AlbumCard key={album._id} album={album} />})}</div></div>)}
                                        {console.log('[БЛОК 6.6] Начало рендеринга списка плейлистов.') || null}
                                        {searchResults.playlists.length > 0 && (<div><h3 className="text-xl font-bold mb-3">Открытые плейлисты</h3><div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-4">{searchResults.playlists.map((p, i) => {console.log(`  - Рендеринг PlaylistCard #${i} для: ${p.name}`); return <PlaylistCard key={p._id} playlist={p} onClick={() => navigate(`/music/playlist/${p._id}`)} />})}</div></div>)}
                                    </div>
                                )}
                            </div>
                        )}
                        
                        {['my-music', 'recently-played', 'playlists'].includes(activeTab) && (
                            loadingTabData ? <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin"/></div> : (
                                <div>
                                    {console.log(`[БЛОК 7/11] Рендеринг контента для вкладки ${activeTab}.`) || null}
                                    {activeTab === 'my-music' && (myMusicTracks.length > 0 ? (console.log('[БЛОК 7.1] Рендеринг TrackList для Моя музыка.') || null, <TrackList tracks={myMusicTracks} onSelectTrack={(track) => playTrack(track, myMusicTracks)} onToggleSave={onToggleLike} currentTrack={currentTrack} isPlaying={isPlaying} myMusicTrackIds={myMusicTrackIds} progress={progress} duration={duration} onSeek={onSeek} loadingTrackId={loadingTrackId} buffered={buffered} onPlayPauseToggle={togglePlayPause}/>) : <p className="text-center py-10 text-slate-500">Ваша музыка пуста.</p>)}
                                    {console.log('[БЛОК 8/11] Проверка вкладки "Вы слушали".') || null}
                                    {activeTab === 'recently-played' && (recentlyPlayed.length > 0 ? (console.log('[БЛОК 8.1] Рендеринг TrackList для Вы слушали.') || null, <TrackList tracks={recentlyPlayed} onSelectTrack={(track) => playTrack(track, recentlyPlayed)} onToggleSave={onToggleLike} currentTrack={currentTrack} isPlaying={isPlaying} myMusicTrackIds={myMusicTrackIds} progress={progress} duration={duration} onSeek={onSeek} loadingTrackId={loadingTrackId} buffered={buffered} onPlayPauseToggle={togglePlayPause}/>) : <p className="text-center py-10 text-slate-500">Вы еще ничего не слушали.</p>)}
                                    {console.log('[БЛОК 9/11] Проверка вкладки "Плейлисты".') || null}
                                    {activeTab === 'playlists' && (
                                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                                            {console.log('[БЛОК 9.1] Рендеринг кнопки "Создать плейлист".') || null}
                                            <div className="relative group aspect-square"><button onClick={() => setCreatePlaylistModalOpen(true)} className="w-full h-full flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-blue-500 hover:text-blue-500 transition-colors"><PlusCircle size={40} /><span className="mt-2 font-semibold text-center">Создать плейлист</span></button></div>
                                            {console.log('[БЛОК 9.2] Начало рендеринга списка плейлистов.') || null}
                                            {playlists.map((p, i) => {console.log(`  - Рендеринг PlaylistCard #${i} для: ${p.name}`); return <PlaylistCard key={p._id} playlist={p} onClick={() => navigate(`/music/playlist/${p._id}`)} onEdit={handleEditPlaylist} onDelete={handleDeletePlaylist} />})}
                                        </div>
                                    )}
                                </div>
                            )
                        )}
                        {console.log('[БЛОК 10/11] Завершение рендеринга контента вкладки.') || null}
                    </div>
                </div>
            </main>
            {console.log('[БЛОК 11/11] Рендеринг компонента завершен успешно.') || null}
        </PageWrapper>
    );
};

export default MusicPage;