// frontend/src/pages/MusicPage.jsx --- УПРОЩЕННЫЙ ФАЙЛ (ТОЛЬКО ПОИСК) ---

import React, { useState, useEffect, useCallback } from 'react';
import useTitle from '../hooks/useTitle';
import axios from 'axios';
import toast from 'react-hot-toast';
import TrackList from '../components/music/TrackList';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import { useNavigate } from 'react-router-dom';
import { Loader2, Search, UploadCloud } from 'lucide-react';
import UploadContentModal from '../components/modals/UploadContentModal';
import ArtistCard from '../components/music/ArtistCard';
import AlbumCard from '../components/music/AlbumCard';
import PlaylistCard from '../components/music/PlaylistCard';
import PageWrapper from '../components/PageWrapper';

const API_URL = import.meta.env.VITE_API_URL;

const MusicPage = () => {
    useTitle('Музыка');
    const navigate = useNavigate();

    // --- УДАЛЕНО ВСЕ, ЧТО СВЯЗАНО С ДРУГИМИ ВКЛАДКАМИ ---
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

    // --- УПРОЩЕННАЯ ФУНКЦИЯ ЗАГРУЗКИ ДАННЫХ (ТОЛЬКО ДЛЯ ПОИСКА) ---
    const fetchDataForSearch = useCallback(async (query = '', page = 1) => {
        const token = localStorage.getItem('token');
        const headers = { headers: { Authorization: `Bearer ${token}` } };

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
                if (page === 1) return res.data;
                return { ...prev, tracks: [...prev.tracks, ...res.data.tracks] };
            });
            setHasMoreSearchResults(res.data.hasMore);
            setSearchPage(page);
        } catch (error) { toast.error("Ошибка при поиске."); }
        
        setLoadingSearch(false);
        setLoadingMore(false);
    }, []);

    // --- УПРОЩЕННЫЙ useEffect ДЛЯ ПОИСКА ---
    useEffect(() => {
        const debounce = setTimeout(() => {
            setSearchPage(1);
            fetchDataForSearch(searchQuery, 1);
        }, 300);
        return () => clearTimeout(debounce);
    }, [searchQuery, fetchDataForSearch]);
    
    // --- УПРОЩЕННЫЙ ОБРАБОТЧИК ВЫБОРА ТРЕКА ---
    const handleSelectTrack = useCallback((track) => {
        playTrack(track, searchResults.tracks); 
    }, [searchResults.tracks, playTrack]);
    
    return (
        <PageWrapper>
            <main className="flex-1 overflow-y-auto bg-slate-100 dark:bg-slate-900">
                <UploadContentModal isOpen={isUploadModalOpen} onClose={() => setUploadModalOpen(false)} />

                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-between px-6 md:px-8 pt-8 pb-6">
                        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white">
                            Музыка
                        </h1>
                        <button onClick={() => setUploadModalOpen(true)} className="flex items-center space-x-2 text-sm bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors">
                            <UploadCloud size={18} /> <span>Загрузить аудио</span>
                        </button>
                    </div>
                    
                    {/* --- БЛОК НАВИГАЦИИ ПОЛНОСТЬЮ УДАЛЕН --- */}
                    
                    <div className="p-6 md:p-8">
                        {/* --- ОСТАВЛЕН ТОЛЬКО БЛОК ДЛЯ ПОИСКА --- */}
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
                                            <button onClick={() => fetchDataForSearch(searchQuery, searchPage + 1)} disabled={loadingMore} className="px-6 py-2 bg-slate-200 dark:bg-white/10 text-sm font-semibold rounded-full hover:bg-slate-300 dark:hover:bg-white/20 transition-colors">
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
                    </div>
                </div>
            </main>
        </PageWrapper>
    );
};

export default MusicPage;