
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { CreateArtistForm } from './CreateArtistForm';
import { CreateAlbumForm } from './CreateAlbumForm';
import { UploadTrackForm } from './UploadTrackForm';
import { MicVocal, Disc, Music, Loader2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

// --- НАЧАЛО ИСПРАВЛЕНИЯ ---
const SubTabButton = ({ active, onClick, children, icon: Icon }) => (
    <button
        onClick={onClick}
        className={`flex flex-1 items-center justify-center space-x-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
            active
                ? 'bg-blue-600 text-white'
                : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'
        }`}
    >
        <Icon size={16} />
        <span>{children}</span>
    </button>
);
// --- КОНЕЦ ИСПРАВЛЕНИЯ ---

export const AdminUploadPanel = () => {
    const [activeSubTab, setActiveSubTab] = useState('artist');
    const [artists, setArtists] = useState([]);
    const [albums, setAlbums] = useState([]);
    const [loadingData, setLoadingData] = useState(true);

    const refetchData = useCallback(async () => {
        setLoadingData(true);
        try {
            const token = localStorage.getItem('token');
            const [artistsRes, albumsRes] = await Promise.all([
                axios.get(`${API_URL}/api/music/artists/all`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${API_URL}/api/music/albums/all`, { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setArtists(artistsRes.data);
            setAlbums(albumsRes.data);
        } catch (error) {
            toast.error("Не удалось обновить списки артистов и альбомов.");
        } finally {
            setLoadingData(false);
        }
    }, []);

    useEffect(() => {
        refetchData();
    }, [refetchData]);

    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-2">
                <SubTabButton active={activeSubTab === 'artist'} onClick={() => setActiveSubTab('artist')} icon={MicVocal}>Артист</SubTabButton>
                <SubTabButton active={activeSubTab === 'album'} onClick={() => setActiveSubTab('album')} icon={Disc}>Альбом</SubTabButton>
                <SubTabButton active={activeSubTab === 'track'} onClick={() => setActiveSubTab('track')} icon={Music}>Трек</SubTabButton>
            </div>
            
            {loadingData ? (
                <div className="flex justify-center items-center p-8">
                    <Loader2 className="animate-spin w-8 h-8 text-slate-400" />
                    <span className="ml-2">Загрузка данных...</span>
                </div>
            ) : (
                <>
                    {activeSubTab === 'artist' && <CreateArtistForm onSuccess={refetchData} />}
                    {activeSubTab === 'album' && <CreateAlbumForm artists={artists} onSuccess={refetchData} />}
                    {activeSubTab === 'track' && <UploadTrackForm artists={artists} albums={albums} onSuccess={refetchData} />}
                </>
            )}
        </div>
    );
};

export default AdminUploadPanel;