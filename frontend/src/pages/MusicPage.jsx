// frontend/src/pages/MusicPage.jsx --- ФАЙЛ БЕЗ ПОИСКА ---

import React, { useState, useEffect, useCallback, useRef } from 'react';
import useTitle from '../hooks/useTitle';
import axios from 'axios';
import toast from 'react-hot-toast';
import TrackList from '../components/music/TrackList';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2, Music, History, ListMusic, PlusCircle, UploadCloud } from 'lucide-react';
import CreatePlaylistModal from '../components/modals/CreatePlaylistModal';
import PlaylistCard from '../components/music/PlaylistCard';
import EditPlaylistModal from '../components/modals/EditPlaylistModal';
import UploadContentModal from '../components/modals/UploadContentModal';
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
        // --- УДАЛЕН 'search' ИЗ СПИСКА ДОПУСТИМЫХ ВКЛАДОК ---
        return ['my-music', 'recently-played', 'playlists'].includes(savedTab) ? savedTab : 'my-music';
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
    
    const [isUploadModalOpen, setUploadModalOpen] = useState(false);
    const [isCreatePlaylistModalOpen, setCreatePlaylistModalOpen] = useState(false);
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [playlistToEdit, setPlaylistToEdit] = useState(null);
    const { showConfirmation } = useModal();

    const fetchDataForTab = useCallback(async (tab) => {
        const token = localStorage.getItem('token');
        const headers = { headers: { Authorization: `Bearer ${token}` } };
        
        setLoadingTabData(true);
        try {
            switch (tab) {
                case 'my-music':
                    const myMusicRes = await axios.get(`${API_URL}/api/music/saved`, headers);
                    setMyMusicTracks(myMusicRes.data);
                    break;
                case 'playlists':
                    const playlistsRes = await axios.get(`${API_URL}/api/playlists`, headers);
                    setPlaylists(playlistsRes.data);
                    break;
                case 'recently-played':
                    const historyRes = await axios.get(`${API_URL}/api/music/history`, headers);
                    setRecentlyPlayed(historyRes.data);
                    break;
                default:
                    break;
            }
        } catch (e) {
            toast.error(`Не удалось загрузить данные для вкладки.`);
        }
        setLoadingTabData(false);
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
        const handleMyMusicUpdate = () => {
            if (activeTab === 'my-music') {
                fetchDataForTab('my-music');
            }
        };
        window.addEventListener('myMusicUpdated', handleMyMusicUpdate);
        return () => window.removeEventListener('myMusicUpdated', handleMyMusicUpdate);
    }, [activeTab, fetchDataForTab]);

    const handleSelectTrack = useCallback((track) => {
        let currentPlaylist = [];
        if (activeTab === 'my-music') currentPlaylist = myMusicTracks;
        else if (activeTab === 'recently-played') currentPlaylist = recentlyPlayed;
        playTrack(track, currentPlaylist); 
    }, [myMusicTracks, recentlyPlayed, activeTab, playTrack]);
    
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
                    await axios.delete(`${API_URL}/api/playlists/${playlistId}`, { headers: { Authorization: `Bearer ${token}` } });
                    toast.success('Плейлист удален', { id: toastId });
                    fetchDataForTab('playlists');
                } catch (error) {
                    toast.error('Ошибка при удалении плейлиста.', { id: toastId });
                }
            }
        });
    };
    
    const navItems = [
        { key: 'my-music', label: 'Моя музыка', icon: Music, onClick: () => setActiveTab('my-music') },
        { key: 'playlists', label: 'Плейлисты', icon: ListMusic, onClick: () => setActiveTab('playlists') },
        { key: 'recently-played', label: 'Вы слушали', icon: History, onClick: () => setActiveTab('recently-played') }
    ];
    
    return (
        <PageWrapper>
            <main className="flex-1 overflow-y-auto bg-slate-100 dark:bg-slate-900">
                <CreatePlaylistModal isOpen={isCreatePlaylistModalOpen} onClose={() => setCreatePlaylistModalOpen(false)} onPlaylistCreated={() => fetchDataForTab('playlists')} />
                <EditPlaylistModal isOpen={isEditModalOpen} onClose={() => setEditModalOpen(false)} playlist={playlistToEdit} onPlaylistUpdated={() => fetchDataForTab('playlists')} />
                <UploadContentModal isOpen={isUploadModalOpen} onClose={() => setUploadModalOpen(false)} />

                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-between px-6 md:px-8 pt-8 pb-6">
                        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white">Музыка</h1>
                        <button onClick={() => setUploadModalOpen(true)} className="flex items-center space-x-2 text-sm bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors">
                            <UploadCloud size={18} /> <span>Загрузить аудио</span>
                        </button>
                    </div>
                    
                    <div className="px-6 md:px-8">
                        <div className="hidden md:flex border-b border-slate-300 dark:border-slate-700 overflow-x-auto no-scrollbar">
                            <div className="flex items-center gap-x-2 -mb-px">
                                {navItems.map(item => (
                                    <TabButton key={item.key} active={activeTab === item.key} onClick={item.onClick}>
                                        <item.icon size={16}/><span>{item.label}</span>
                                    </TabButton>
                                ))}
                            </div>
                        </div>

                        <div className="md:hidden mb-6">
                            <ResponsiveNav items={navItems} visibleCount={3} activeKey={activeTab} />
                        </div>
                    </div>
                    
                    <div className="p-6 md:p-8">
                        {loadingTabData ? <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin"/></div> : (
                            <div>
                                {activeTab === 'my-music' && (myMusicTracks.length > 0 ? <TrackList tracks={myMusicTracks} onSelectTrack={(track) => playTrack(track, myMusicTracks)} onToggleSave={onToggleLike} currentTrack={currentTrack} isPlaying={isPlaying} myMusicTrackIds={myMusicTrackIds} progress={progress} duration={duration} onSeek={onSeek} loadingTrackId={loadingTrackId} buffered={buffered} onPlayPauseToggle={togglePlayPause}/> : <p className="text-center py-10 text-slate-500">Ваша музыка пуста.</p>)}
                                {activeTab === 'recently-played' && (recentlyPlayed.length > 0 ? <TrackList tracks={recentlyPlayed} onSelectTrack={(track) => playTrack(track, recentlyPlayed)} onToggleSave={onToggleLike} currentTrack={currentTrack} isPlaying={isPlaying} myMusicTrackIds={myMusicTrackIds} progress={progress} duration={duration} onSeek={onSeek} loadingTrackId={loadingTrackId} buffered={buffered} onPlayPauseToggle={togglePlayPause}/> : <p className="text-center py-10 text-slate-500">Вы еще ничего не слушали.</p>)}
                                {activeTab === 'playlists' && (
                                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                                        <div className="relative group aspect-square">
                                            <button onClick={() => setCreatePlaylistModalOpen(true)} className="w-full h-full flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-blue-500 hover:text-blue-500 transition-colors">
                                                <PlusCircle size={40} />
                                                <span className="mt-2 font-semibold text-center">Создать плейлист</span>
                                            </button>
                                        </div>
                                        {playlists.map(p => <PlaylistCard key={p._id} playlist={p} onClick={() => navigate(`/music/playlist/${p._id}`)} onEdit={handleEditPlaylist} onDelete={handleDeletePlaylist} />)}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </PageWrapper>
    );
};

export default MusicPage;