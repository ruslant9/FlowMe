// frontend/components/admin/AdminUploadPanel.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { CreateArtistForm } from './CreateArtistForm';
import { CreateAlbumForm } from './CreateAlbumForm';
import { UploadTrackForm } from './UploadTrackForm';
import { MicVocal, Disc, Music } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

const SubTabButton = ({ active, onClick, children, icon: Icon }) => (
    <button
        onClick={onClick}
        className={`flex items-center space-x-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
            active
                ? 'bg-blue-600 text-white'
                : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'
        }`}
    >
        <Icon size={16} />
        <span>{children}</span>
    </button>
);

export const AdminUploadPanel = () => {
    const [activeSubTab, setActiveSubTab] = useState('artist');
    const [artists, setArtists] = useState([]);
    const [albums, setAlbums] = useState([]);
    
    // Функция для перезагрузки данных (артистов, альбомов)
    const refetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            const [artistsRes, albumsRes] = await Promise.all([
                axios.get(`${API_URL}/api/music/artists/all`, { headers: { Authorization: `Bearer ${token}` } }), // Вам нужно будет создать этот роут
                axios.get(`${API_URL}/api/music/albums/all`, { headers: { Authorization: `Bearer ${token}` } })   // и этот
            ]);
            setArtists(artistsRes.data);
            setAlbums(albumsRes.data);
        } catch (error) {
            toast.error("Не удалось обновить списки артистов и альбомов.");
        }
    };

    useEffect(() => {
        // refetchData(); // Загружаем данные при первом рендере
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <SubTabButton active={activeSubTab === 'artist'} onClick={() => setActiveSubTab('artist')} icon={MicVocal}>Артист</SubTabButton>
                <SubTabButton active={activeSubTab === 'album'} onClick={() => setActiveSubTab('album')} icon={Disc}>Альбом</SubTabButton>
                <SubTabButton active={activeSubTab === 'track'} onClick={() => setActiveSubTab('track')} icon={Music}>Трек</SubTabButton>
            </div>
            
            {activeSubTab === 'artist' && <CreateArtistForm onSuccess={refetchData} />}
            {activeSubTab === 'album' && <CreateAlbumForm artists={artists} onSuccess={refetchData} />}
            {activeSubTab === 'track' && <UploadTrackForm artists={artists} albums={albums} onSuccess={refetchData} />}
        </div>
    );
};

export default AdminUploadPanel;