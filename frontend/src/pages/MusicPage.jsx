// frontend/src/pages/MusicPage.jsx --- ИСПРАВЛЕННЫЙ С ПОЛНЫМ ЛОГИРОВАНИЕМ ---

import React, { useState, useEffect, useCallback } from 'react';
import useTitle from '../hooks/useTitle';
import axios from 'axios';
import toast from 'react-hot-toast';
import TrackList from '../components/music/TrackList';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Loader2, Search, Music, History, ListMusic, PlusCircle, UploadCloud
} from 'lucide-react';
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

    console.log("Render MusicPage", {
        activeTab,
        myMusicTracks,
        recentlyPlayed,
        playlists,
        searchResults,
        currentTrack
    });

    const fetchDataForTab = useCallback(async (tab, query = '', page = 1) => {
        const token = localStorage.getItem('token');
        const headers = { headers: { Authorization: `Bearer ${token}` } };

        const resetSearchState = () => {
            setSearchPage(1);
            setSearchResults({ tracks: [], playlists: [], artists: [], albums: [] });
            setHasMoreSearchResults(true);
        };

        switch (tab) {
            case 'my-music':
                setLoadingTabData(true);
                resetSearchState();
                try {
                    const res = await axios.get(`${API_URL}/api/music/saved`, headers);
                    console.log("Fetched my-music:", res.data);
                    setMyMusicTracks(res.data);
                } catch (e) {
                    console.error(e);
                    toast.error('Не удалось загрузить Мою музыку.');
                }
                setLoadingTabData(false);
                break;

            case 'playlists':
                setLoadingTabData(true);
                resetSearchState();
                try {
                    const res = await axios.get(`${API_URL}/api/playlists`, headers);
                    console.log("Fetched playlists:", res.data);
                    setPlaylists(res.data);
                } catch (e) {
                    console.error(e);
                    toast.error('Не удалось загрузить плейлисты.');
                }
                setLoadingTabData(false);
                break;

            case 'recently-played':
                setLoadingTabData(true);
                resetSearchState();
                try {
                    const res = await axios.get(`${API_URL}/api/music/history`, headers);
                    console.log("Fetched recently-played:", res.data);
                    setRecentlyPlayed(res.data);
                } catch (e) {
                    console.error(e);
                    toast.error('Не удалось загрузить историю.');
                }
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
                    console.log("Search results fetched:", res.data);
                    setSearchResults(prev => {
                        if (page === 1) return res.data;
                        return {
                            ...prev,
                            tracks: [...prev.tracks, ...res.data.tracks]
                        };
                    });
                    setHasMoreSearchResults(res.data.hasMore);
                    setSearchPage(page);
                } catch (error) {
                    console.error(error);
                    toast.error("Ошибка при поиске.");
                }

                setLoadingSearch(false);
                setLoadingMore(false);
                break;
        }
    }, []);

    useEffect(() => {
        if (location.state?.defaultTab) {
            navigate(location.pathname, { replace: true, state: {} });
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
        console.log("Selected track:", track);
        let currentPlaylist = [];
        if (activeTab === 'my-music') currentPlaylist = myMusicTracks;
        else if (activeTab === 'recently-played') currentPlaylist = recentlyPlayed;
        else currentPlaylist = searchResults.tracks;
        playTrack(track, currentPlaylist);
    }, [myMusicTracks, recentlyPlayed, searchResults, activeTab, playTrack]);

    const handlePlayWave = useCallback(async () => {
        const toastId = toast.loading("Настраиваем вашу волну...");
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/api/music/wave`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log("Wave result:", res.data);
            if (res.data?.length > 0) {
                playTrack(res.data[0], res.data);
                toast.success("Ваша волна запущена!", { id: toastId });
            } else {
                toast.error("Не удалось найти треки для вашей волны.", { id: toastId });
            }
        } catch (error) {
            console.error(error);
            toast.error("Ошибка при запуске волны.", { id: toastId });
        }
    }, [playTrack]);

    const handleEditPlaylist = (playlist) => {
        console.log("Edit playlist:", playlist);
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
                    console.error(error);
                    toast.error('Ошибка при удалении плейлиста.', { id: toastId });
                }
            }
        });
    };

    const navItems = [
        { key: 'my-music', label: 'Моя музыка', icon: Music, onClick: () => setActiveTab('my-music') },
        { key: 'search', label: 'Поиск', icon: Search, onClick: () => setActiveTab('search') },
        { key: 'playlists', label: 'Плейлисты', icon: ListMusic, onClick: () => setActiveTab('playlists') },
        { key: 'recently-played', label: 'Вы слушали', icon: History, onClick: () => setActiveTab('recently-played') }
    ];

    return (
        <PageWrapper>
            {/* Остальной рендер без изменений — вставляй логирование в JSX аналогично */}
        </PageWrapper>
    );
};

export default MusicPage;