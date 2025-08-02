// frontend/components/admin/UploadTrackForm.jsx

import React, { useState, useMemo } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { useUser } from '../../context/UserContext';
import GenreSelector from './GenreSelector'; // <-- 1. Импортируем новый компонент

const API_URL = import.meta.env.VITE_API_URL;

export const UploadTrackForm = ({ artists, albums, onSuccess, isEditMode = false, initialData = null }) => {
    const { currentUser } = useUser();
    const [title, setTitle] = useState(initialData?.title || '');
    const [artistId, setArtistId] = useState(initialData?.artist?._id || '');
    const [albumId, setAlbumId] = useState(initialData?.album?._id || '');
    const [selectedGenres, setSelectedGenres] = useState(initialData?.genres || []); // <-- Используем selectedGenres
    const [trackFile, setTrackFile] = useState(null);
    const [durationMs, setDurationMs] = useState(initialData?.durationMs || 0);
    const [loading, setLoading] = useState(false);

    const filteredAlbums = useMemo(() => {
        if (!artistId) return [];
        return albums.filter(album => (album.artist._id || album.artist) === artistId);
    }, [artistId, albums]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setTrackFile(file);
            const audio = new Audio(URL.createObjectURL(file));
            audio.onloadedmetadata = () => {
                setDurationMs(Math.round(audio.duration * 1000));
            };
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!artistId || (!trackFile && !isEditMode)) {
            toast.error("Артист и аудиофайл обязательны.");
            return;
        }
        setLoading(true);
        const formData = new FormData();
        formData.append('title', title);
        formData.append('artistId', artistId);
        if (albumId) formData.append('albumId', albumId);
        // Отправляем массив жанров как JSON-строку, чтобы бэкенд мог его распарсить
        formData.append('genres', JSON.stringify(selectedGenres)); 
        if (trackFile) formData.append('trackFile', trackFile);
        formData.append('durationMs', durationMs);

        const isAdmin = currentUser.role === 'admin';
        
        // Логика для определения эндпоинта и метода
        const endpoint = isEditMode
            ? `${API_URL}/api/admin/content/tracks/${initialData._id}`
            : isAdmin ? `${API_URL}/api/admin/tracks` : `${API_URL}/api/submissions/tracks`;
        const method = isEditMode ? 'put' : 'post';
        const successMessage = isEditMode ? 'Трек обновлен!' : (isAdmin ? 'Трек успешно загружен!' : 'Заявка отправлена на модерацию!');
        
        const toastId = toast.loading("Отправка данных...");

        try {
            const token = localStorage.getItem('token');
            const res = await axios[method](endpoint, formData, {
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
            });
            toast.success(res.data.message || successMessage, { id: toastId });
            if (!isEditMode) {
                setTitle(''); setArtistId(''); setAlbumId(''); setSelectedGenres([]); setTrackFile(null); setDurationMs(0);
                e.target.reset();
            }
            onSuccess();
        } catch (error) {
            toast.error(error.response?.data?.message || "Ошибка при отправке.", { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="p-4 rounded-lg bg-slate-100 dark:bg-slate-800 space-y-4">
            <h3 className="font-bold text-lg">
                {isEditMode ? `Редактирование: ${initialData.title}` : (currentUser.role === 'admin' ? 'Загрузить трек' : 'Предложить трек')}
            </h3>
            {currentUser.role !== 'admin' && !isEditMode && <p className="text-xs text-slate-500 -mt-3">Трек будет отправлен на проверку администраторам.</p>}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label className="text-sm font-semibold block mb-1">Исполнитель *</label>
                    <select value={artistId} onChange={e => setArtistId(e.target.value)} className="w-full p-2 rounded bg-white dark:bg-slate-700" required>
                        <option value="">-- Выберите --</option>
                        {artists.map(artist => <option key={artist._id} value={artist._id}>{artist.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-sm font-semibold block mb-1">Альбом (необязательно)</label>
                    <select value={albumId} onChange={e => setAlbumId(e.target.value)} className="w-full p-2 rounded bg-white dark:bg-slate-700" disabled={!artistId}>
                        <option value="">-- Сольный трек (сингл) --</option>
                        {filteredAlbums.map(album => <option key={album._id} value={album._id}>{album.title}</option>)}
                    </select>
                </div>
            </div>
            
            <div>
                <label className="text-sm font-semibold block mb-1">Название трека *</label>
                <input type="text" placeholder="Название" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 rounded bg-white dark:bg-slate-700" required />
            </div>

            {/* --- 2. Заменяем <select> на наш новый компонент --- */}
            <GenreSelector selectedGenres={selectedGenres} onGenreChange={setSelectedGenres} />

            <div>
                <label className="text-sm font-semibold block mb-1">Аудиофайл *</label>
                <input type="file" accept="audio/mpeg, audio/wav, audio/mp3" onChange={handleFileChange} className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/50 dark:file:text-blue-300 dark:hover:file:bg-blue-900" required={!isEditMode} />
                {isEditMode && <p className="text-xs text-slate-400 mt-1">Загрузите новый файл, только если хотите заменить существующий.</p>}
            </div>

            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg flex items-center disabled:opacity-50">
                {loading && <Loader2 className="animate-spin mr-2"/>}
                {isEditMode ? 'Сохранить изменения' : (currentUser.role === 'admin' ? 'Загрузить трек' : 'Отправить на проверку')}
            </button>
        </form>
    );
};