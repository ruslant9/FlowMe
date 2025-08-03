// frontend/components/admin/UploadTrackForm.jsx

import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Loader2, Trash2 } from 'lucide-react';
import { useUser } from '../../context/UserContext';
import GenreSelector from './GenreSelector';
import Avatar from '../Avatar'; // Добавляем импорт аватара

const API_URL = import.meta.env.VITE_API_URL;

// --- КОМПОНЕНТ АВТОДОПОЛНЕНИЯ ДЛЯ АЛЬБОМОВ ---
const AlbumAutocomplete = ({ albums, onSelect }) => {
    const [query, setQuery] = useState('');
    const [filteredAlbums, setFilteredAlbums] = useState([]);
    const [isFocused, setIsFocused] = useState(false);

    const handleSelect = (album) => {
        setQuery(album ? `${album.title} - ${album.artist.name}` : '');
        onSelect(album ? album._id : '');
        setIsFocused(false);
    };

    useEffect(() => {
        if (query) {
            const lowerQuery = query.toLowerCase();
            setFilteredAlbums(
                albums.filter(album =>
                    album.title.toLowerCase().includes(lowerQuery) ||
                    album.artist.name.toLowerCase().includes(lowerQuery)
                ).slice(0, 5)
            );
        } else {
            setFilteredAlbums([]);
        }
    }, [query, albums]);
    
    return (
        <div className="relative" onBlur={() => setTimeout(() => setIsFocused(false), 200)}>
            <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setIsFocused(true)}
                placeholder="-- Сольный трек (сингл) --"
                className="w-full p-2 rounded bg-white dark:bg-slate-700"
            />
            {isFocused && (
                <ul className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg max-h-60 overflow-auto">
                    <li onMouseDown={() => handleSelect(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer italic">
                        -- Сольный трек (сингл) --
                    </li>
                    {filteredAlbums.map(album => (
                        <li key={album._id} onMouseDown={() => handleSelect(album)}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer flex items-center space-x-2">
                            <img src={album.coverArtUrl} alt={album.title} className="w-8 h-8 rounded-sm object-cover" />
                            <div>
                                <p>{album.title}</p>
                                <p className="text-sm text-slate-500">{album.artist.name}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

// --- КОМПОНЕНТ АВТОДОПОЛНЕНИЯ ДЛЯ МНОЖЕСТВЕННОГО ВЫБОРА АРТИСТОВ ---
const MultiArtistAutocomplete = ({ artists, selectedIds, onSelectionChange, excludeIds = [] }) => {
    const [query, setQuery] = useState('');
    const [isFocused, setIsFocused] = useState(false);

    const availableArtists = useMemo(() =>
        artists.filter(a => !selectedIds.includes(a._id) && !excludeIds.includes(a._id))
    , [artists, selectedIds, excludeIds]);
    
    const filteredArtists = useMemo(() => {
        if (!query) return [];
        return availableArtists.filter(artist =>
            artist.name.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 5);
    }, [query, availableArtists]);

    const selectedArtists = useMemo(() =>
        selectedIds.map(id => artists.find(a => a._id === id)).filter(Boolean)
    , [selectedIds, artists]);

    const handleSelect = (artist) => {
        onSelectionChange([...selectedIds, artist._id]);
        setQuery('');
        setIsFocused(false);
    };

    const handleRemove = (artistId) => {
        onSelectionChange(selectedIds.filter(id => id !== artistId));
    };

    return (
        <div className="relative" onBlur={() => setTimeout(() => setIsFocused(false), 200)}>
            <div className="flex flex-wrap gap-2 p-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 min-h-[44px]">
                {selectedArtists.map(artist => (
                    <div key={artist._id} className="flex items-center space-x-1 bg-blue-100 dark:bg-blue-900/50 rounded-full pl-1 pr-2">
                        <Avatar size="sm" username={artist.name} avatarUrl={artist.avatarUrl} />
                        <span className="text-sm">{artist.name}</span>
                        <button type="button" onClick={() => handleRemove(artist._id)}><X size={14}/></button>
                    </div>
                ))}
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    placeholder="Добавьте исполнителей..."
                    className="flex-grow bg-transparent outline-none p-1"
                />
            </div>
             {isFocused && filteredArtists.length > 0 && (
                <ul className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg max-h-60 overflow-auto">
                    {filteredArtists.map(artist => (
                        <li key={artist._id} onMouseDown={() => handleSelect(artist)}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer flex items-center space-x-2">
                            <Avatar size="md" username={artist.name} avatarUrl={artist.avatarUrl} />
                            <span>{artist.name}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

const ToggleSwitch = ({ checked, onChange, label }) => (
    <label className="flex items-center space-x-2 cursor-pointer text-sm">
        <div className="relative">
            <input type="checkbox" className="sr-only" checked={checked} onChange={e => onChange(e.target.checked)} />
            <div className={`block w-10 h-6 rounded-full transition ${checked ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
            <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${checked ? 'transform translate-x-full' : ''}`}></div>
        </div>
        <span>{label}</span>
    </label>
);

const BatchTrackItem = ({ track, index, artists, mainArtistId, onUpdate, onRemove }) => {
    return (
        <div className="p-3 bg-slate-200 dark:bg-slate-700/50 rounded-lg space-y-3 relative">
            <button type="button" onClick={onRemove} className="absolute top-2 right-2 p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full z-10">
                <Trash2 size={16} />
            </button>
            <input type="text" placeholder="Название трека" value={track.title} onChange={(e) => onUpdate(index, 'title', e.target.value)}
                className="w-full p-2 rounded bg-white dark:bg-slate-700 font-semibold" required />
            <div>
                <label className="text-sm font-semibold block mb-1">Дополнительные исполнители (фит)</label>
                 <MultiArtistAutocomplete 
                    artists={artists}
                    selectedIds={track.artistIds}
                    onSelectionChange={(ids) => onUpdate(index, 'artistIds', ids)}
                    excludeIds={[mainArtistId]}
                />
            </div>
             <ToggleSwitch checked={track.isExplicit} onChange={(checked) => onUpdate(index, 'isExplicit', checked)} label="Explicit (ненормативная лексика)" />
        </div>
    );
};


export const UploadTrackForm = ({ artists, albums, onSuccess }) => {
    const { currentUser } = useUser();
    const [albumId, setAlbumId] = useState('');
    const [loading, setLoading] = useState(false);
    const [trackList, setTrackList] = useState([]);
    const [singleTrackData, setSingleTrackData] = useState({
        title: '',
        artistIds: [],
        genres: [],
        trackFile: null,
        durationMs: 0,
        coverArt: null,
        coverPreview: '',
        releaseYear: ''
    });

    const mainAlbumArtistId = useMemo(() => {
        if (!albumId) return null;
        const album = albums.find(a => a._id === albumId);
        return album?.artist?._id || null;
    }, [albumId, albums]);

    useEffect(() => { setTrackList([]); }, [albumId]);
    const handleSingleTrackChange = (field, value) => { setSingleTrackData(prev => ({ ...prev, [field]: value })); };
    const handleSingleFileChange = (e, type) => {
        const file = e.target.files[0];
        if (!file) return;
        if (type === 'track') {
            handleSingleTrackChange('trackFile', file);
            const audio = new Audio(URL.createObjectURL(file));
            audio.onloadedmetadata = () => { handleSingleTrackChange('durationMs', Math.round(audio.duration * 1000)); };
        } else if (type === 'cover') {
            handleSingleTrackChange('coverArt', file);
            handleSingleTrackChange('coverPreview', URL.createObjectURL(file));
        }
    };
    
    const handleBatchFileChange = (e) => {
        const files = Array.from(e.target.files);
        const newTracks = files.map(file => {
             const audio = new Audio(URL.createObjectURL(file));
             audio.onloadedmetadata = () => {
                 const duration = Math.round(audio.duration * 1000);
                 setTrackList(currentList => currentList.map(t => t.file.name === file.name ? { ...t, durationMs: duration } : t));
             };
            return { file, title: file.name.replace(/\.[^/.]+$/, ""), artistIds: [], isExplicit: false, durationMs: 0 };
        });
        setTrackList(prev => [...prev, ...newTracks]);
    };

    const updateTrackInList = (index, field, value) => {
        setTrackList(currentList => {
            const newList = [...currentList];
            newList[index] = { ...newList[index], [field]: value };
            return newList;
        });
    };
    
    const removeTrackFromList = (index) => {
        setTrackList(currentList => currentList.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const toastId = toast.loading("Загрузка треков...");
        
        try {
            const token = localStorage.getItem('token');
            if (albumId) {
                if (trackList.length === 0) {
                    toast.error("Выберите аудиофайлы для загрузки.", { id: toastId });
                    setLoading(false);
                    return;
                }
                const formData = new FormData();
                const metadata = trackList.map(t => ({
                    title: t.title,
                    artistIds: [mainAlbumArtistId, ...t.artistIds].filter(Boolean),
                    isExplicit: t.isExplicit,
                    durationMs: t.durationMs
                }));
                formData.append('tracksMetadata', JSON.stringify(metadata));
                trackList.forEach(t => { formData.append('trackFiles', t.file); });
                await axios.post(`${API_URL}/api/admin/albums/${albumId}/batch-upload-tracks`, formData, {
                    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
                });
            } else {
                if (!singleTrackData.trackFile) {
                    toast.error("Аудиофайл обязателен.", { id: toastId });
                    setLoading(false);
                    return;
                }
                const formData = new FormData();
                formData.append('title', singleTrackData.title);
                formData.append('artistIds', JSON.stringify(singleTrackData.artistIds));
                formData.append('genres', JSON.stringify(singleTrackData.genres));
                formData.append('trackFile', singleTrackData.trackFile);
                if (singleTrackData.coverArt) formData.append('coverArt', singleTrackData.coverArt);
                formData.append('durationMs', singleTrackData.durationMs);
                formData.append('releaseYear', singleTrackData.releaseYear);
                await axios.post(`${API_URL}/api/admin/tracks`, formData, {
                     headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
                });
            }
            toast.success("Треки успешно загружены!", { id: toastId });
            onSuccess();
            setAlbumId('');
            setTrackList([]);
            setSingleTrackData({ title: '', artistIds: [], genres: [], trackFile: null, durationMs: 0, coverArt: null, coverPreview: '', releaseYear: '' });
            e.target.reset();
        } catch (error) {
            toast.error(error.response?.data?.message || "Ошибка при загрузке.", { id: toastId });
        } finally { setLoading(false); }
    };

    return (
        <form onSubmit={handleSubmit} className="p-4 rounded-lg bg-slate-100 dark:bg-slate-800 space-y-4">
            <h3 className="font-bold text-lg">Загрузить трек</h3>
            
            <div>
                <label className="text-sm font-semibold block mb-1">Альбом (необязательно)</label>
                <AlbumAutocomplete albums={albums} onSelect={setAlbumId} />
            </div>

            {albumId ? (
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-semibold block mb-1">Аудиофайлы *</label>
                        <div className="flex items-center space-x-4">
                            <label htmlFor="batch-file-upload" className="cursor-pointer px-4 py-2 text-sm bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors">Выбрать файлы</label>
                             <input id="batch-file-upload" type="file" multiple accept="audio/mpeg, audio/wav, audio/mp3" onChange={handleBatchFileChange} className="hidden" />
                            {trackList.length > 0 && <span className="text-sm text-slate-500 dark:text-slate-400">Число файлов: {trackList.length}</span>}
                        </div>
                    </div>
                    {trackList.length > 0 && (
                        <div className="space-y-3 pr-2 max-h-96 overflow-y-auto">
                            {trackList.map((track, index) => (
                                <BatchTrackItem key={index} track={track} index={index} artists={artists}
                                    mainArtistId={mainAlbumArtistId} onUpdate={updateTrackInList} onRemove={() => removeTrackFromList(index)} />
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                     <div>
                        <label className="text-sm font-semibold block mb-1">Исполнитель *</label>
                        <MultiArtistAutocomplete artists={artists} selectedIds={singleTrackData.artistIds} onSelectionChange={(ids) => handleSingleTrackChange('artistIds', ids)} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-semibold block mb-1">Название трека *</label>
                            <input type="text" placeholder="Название" value={singleTrackData.title} onChange={e => handleSingleTrackChange('title', e.target.value)} className="w-full p-2 rounded bg-white dark:bg-slate-700" required />
                        </div>
                        <div>
                            <label className="text-sm font-semibold block mb-1">Год выпуска</label>
                            <input type="number" placeholder="Например: 2024" value={singleTrackData.releaseYear} onChange={e => handleSingleTrackChange('releaseYear', e.target.value)} min="1900" max={new Date().getFullYear() + 1} className="w-full p-2 rounded bg-white dark:bg-slate-700" />
                        </div>
                    </div>
                    <GenreSelector selectedGenres={singleTrackData.genres} onGenreChange={(genres) => handleSingleTrackChange('genres', genres)} />
                    <div>
                        <label className="text-sm font-semibold block mb-1">Обложка сингла</label>
                        <input type="file" accept="image/*" onChange={(e) => handleSingleFileChange(e, 'cover')} className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/50 dark:file:text-blue-300 dark:hover:file:bg-blue-900" />
                        {singleTrackData.coverPreview && <img src={singleTrackData.coverPreview} alt="Предпросмотр обложки" className="mt-2 w-24 h-24 rounded object-cover"/>}
                    </div>
                     <div>
                        <label className="text-sm font-semibold block mb-1">Аудиофайл *</label>
                        <input type="file" accept="audio/mpeg, audio/wav, audio/mp3" onChange={(e) => handleSingleFileChange(e, 'track')} className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/50 dark:file:text-blue-300 dark:hover:file:bg-blue-900" required />
                    </div>
                </div>
            )}

            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg flex items-center disabled:opacity-50">
                {loading && <Loader2 className="animate-spin mr-2"/>}
                Загрузить трек(и)
            </button>
        </form>
    );
};