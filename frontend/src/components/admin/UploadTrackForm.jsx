// frontend/components/admin/UploadTrackForm.jsx

import React, { useState, useMemo } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Loader2, Trash2 } from 'lucide-react';
import { useUser } from '../../context/UserContext';
import GenreSelector from './GenreSelector';
import MultiArtistSelector from './MultiArtistSelector';
import AlbumSelector from './AlbumSelector'; // Предполагаем, что у нас есть аналогичный селектор для альбомов

// Компонент для одного трека в списке пакетной загрузки
const BatchTrackItem = ({ track, index, artists, onUpdate, onRemove }) => {
    return (
        <div className="p-3 bg-slate-200 dark:bg-slate-700/50 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
                <p className="font-semibold text-sm text-slate-500 dark:text-slate-400 truncate">{track.file.name}</p>
                <button type="button" onClick={onRemove} className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full">
                    <Trash2 size={16} />
                </button>
            </div>
            <input 
                type="text" 
                placeholder="Название трека" 
                value={track.title}
                onChange={(e) => onUpdate(index, 'title', e.target.value)}
                className="w-full p-2 rounded bg-white dark:bg-slate-700"
                required
            />
            <MultiArtistSelector 
                artists={artists}
                value={track.artistIds}
                onChange={(ids) => onUpdate(index, 'artistIds', ids)}
            />
             <label className="flex items-center space-x-2 text-sm">
                <input 
                    type="checkbox" 
                    checked={track.isExplicit}
                    onChange={(e) => onUpdate(index, 'isExplicit', e.target.checked)}
                    className="form-checkbox h-4 w-4 rounded bg-slate-300 dark:bg-slate-600 border-transparent focus:ring-blue-500"
                />
                <span>Explicit (ненормативная лексика)</span>
            </label>
        </div>
    );
};


export const UploadTrackForm = ({ artists, albums, onSuccess }) => {
    const { currentUser } = useUser();
    const [albumId, setAlbumId] = useState('');
    const [loading, setLoading] = useState(false);
    
    // Состояние для пакетной загрузки
    const [trackList, setTrackList] = useState([]);

    // Состояние для сингла
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

    const handleSingleTrackChange = (field, value) => {
        setSingleTrackData(prev => ({ ...prev, [field]: value }));
    };

    const handleSingleFileChange = (e, type) => {
        const file = e.target.files[0];
        if (!file) return;

        if (type === 'track') {
            handleSingleTrackChange('trackFile', file);
            const audio = new Audio(URL.createObjectURL(file));
            audio.onloadedmetadata = () => {
                handleSingleTrackChange('durationMs', Math.round(audio.duration * 1000));
            };
        } else if (type === 'cover') {
            handleSingleTrackChange('coverArt', file);
            handleSingleTrackChange('coverPreview', URL.createObjectURL(file));
        }
    };
    
    const handleBatchFileChange = (e) => {
        const files = Array.from(e.target.files);
        const newTracks = files.map(file => {
             const audio = new Audio(URL.createObjectURL(file));
             let duration = 0;
             audio.onloadedmetadata = () => {
                 duration = Math.round(audio.duration * 1000);
                 // Обновляем состояние после получения метаданных
                 setTrackList(currentList => currentList.map(t => t.file === file ? { ...t, durationMs: duration } : t));
             };
            return {
                file,
                title: file.name.replace(/\.[^/.]+$/, ""), // Убираем расширение файла
                artistIds: [],
                isExplicit: false,
                durationMs: 0
            };
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
            // Если выбран альбом - используем пакетную загрузку
            if (albumId) {
                if (trackList.length === 0) {
                    toast.error("Выберите аудиофайлы для загрузки.", { id: toastId });
                    setLoading(false);
                    return;
                }
                
                const formData = new FormData();
                const metadata = trackList.map(t => ({
                    title: t.title,
                    artistIds: t.artistIds,
                    isExplicit: t.isExplicit,
                    durationMs: t.durationMs
                }));
                
                formData.append('tracksMetadata', JSON.stringify(metadata));
                trackList.forEach(t => {
                    formData.append('trackFiles', t.file);
                });

                await axios.post(`${API_URL}/api/admin/albums/${albumId}/batch-upload-tracks`, formData, {
                    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
                });

            } else { // Иначе - загружаем сингл
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
            // Сброс всех форм
            setAlbumId('');
            setTrackList([]);
            setSingleTrackData({ title: '', artistIds: [], genres: [], trackFile: null, durationMs: 0, coverArt: null, coverPreview: '', releaseYear: '' });
            e.target.reset();

        } catch (error) {
            toast.error(error.response?.data?.message || "Ошибка при загрузке.", { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="p-4 rounded-lg bg-slate-100 dark:bg-slate-800 space-y-4">
            <h3 className="font-bold text-lg">Загрузить трек</h3>
            
            <div>
                <label className="text-sm font-semibold block mb-1">Альбом (необязательно)</label>
                <AlbumSelector albums={albums} value={albumId} onChange={setAlbumId} />
            </div>

            {albumId ? (
                // --- ИНТЕРФЕЙС ПАКЕТНОЙ ЗАГРУЗКИ ---
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-semibold block mb-1">Аудиофайлы *</label>
                        <input type="file" multiple accept="audio/mpeg, audio/wav, audio/mp3" onChange={handleBatchFileChange} className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/50 dark:file:text-blue-300 dark:hover:file:bg-blue-900" />
                    </div>
                    {trackList.length > 0 && (
                        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                            {trackList.map((track, index) => (
                                <BatchTrackItem 
                                    key={index}
                                    track={track}
                                    index={index}
                                    artists={artists}
                                    onUpdate={updateTrackInList}
                                    onRemove={() => removeTrackFromList(index)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                // --- ИНТЕРФЕЙС ЗАГРУЗКИ СИНГЛА ---
                <div className="space-y-4">
                     <div>
                        <label className="text-sm font-semibold block mb-1">Исполнитель *</label>
                        <MultiArtistSelector artists={artists} value={singleTrackData.artistIds} onChange={(ids) => handleSingleTrackChange('artistIds', ids)} />
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