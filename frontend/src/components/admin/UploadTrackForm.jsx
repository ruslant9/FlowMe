// frontend/components/admin/UploadTrackForm.jsx

import React, { useState, useMemo, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

export const UploadTrackForm = ({ artists, albums, onSuccess }) => {
    const [title, setTitle] = useState('');
    const [artistId, setArtistId] = useState('');
    const [albumId, setAlbumId] = useState(''); // Может быть пустым для сингла
    const [trackFile, setTrackFile] = useState(null);
    const [durationMs, setDurationMs] = useState(0);
    const [loading, setLoading] = useState(false);

    const audioRef = useRef(null);

    // Фильтруем альбомы, чтобы показывать только те, что принадлежат выбранному артисту
    const filteredAlbums = useMemo(() => {
        if (!artistId) return [];
        return albums.filter(album => album.artist === artistId);
    }, [artistId, albums]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setTrackFile(file);
            // Получаем длительность трека
            const audio = new Audio(URL.createObjectURL(file));
            audio.onloadedmetadata = () => {
                setDurationMs(Math.round(audio.duration * 1000));
            };
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!artistId) {
            toast.error("Пожалуйста, выберите артиста.");
            return;
        }
        if (!trackFile) {
            toast.error("Пожалуйста, загрузите аудиофайл.");
            return;
        }
        setLoading(true);
        const formData = new FormData();
        formData.append('title', title);
        formData.append('artistId', artistId);
        if (albumId) formData.append('albumId', albumId);
        formData.append('trackFile', trackFile);
        formData.append('durationMs', durationMs);

        const toastId = toast.loading("Загрузка трека и отправка на модерацию...");
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_URL}/api/admin/tracks`, formData, {
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
            });
            toast.success(res.data.message, { id: toastId });
            // Сброс формы
            setTitle('');
            setArtistId('');
            setAlbumId('');
            setTrackFile(null);
            setDurationMs(0);
            e.target.reset();
            onSuccess();
        } catch (error) {
            toast.error(error.response?.data?.message || "Ошибка при отправке трека.", { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="p-4 rounded-lg bg-slate-100 dark:bg-slate-800 space-y-4">
            <h3 className="font-bold text-lg">Загрузить трек</h3>
            <p className="text-xs text-slate-500 -mt-3">Трек будет отправлен на проверку администраторам.</p>
            
            <div>
                <label className="text-sm font-semibold block mb-1">Исполнитель *</label>
                <select value={artistId} onChange={e => setArtistId(e.target.value)} className="w-full p-2 rounded bg-white dark:bg-slate-700" required>
                    <option value="">-- Выберите артиста --</option>
                    {artists.map(artist => (
                        <option key={artist._id} value={artist._id}>{artist.name}</option>
                    ))}
                </select>
            </div>
            
            <div>
                <label className="text-sm font-semibold block mb-1">Альбом (необязательно)</label>
                <select value={albumId} onChange={e => setAlbumId(e.target.value)} className="w-full p-2 rounded bg-white dark:bg-slate-700" disabled={!artistId}>
                    <option value="">-- Сольный трек (сингл) --</option>
                    {filteredAlbums.map(album => (
                        <option key={album._id} value={album._id}>{album.title}</option>
                    ))}
                </select>
            </div>
            
            <div>
                <label className="text-sm font-semibold block mb-1">Название трека *</label>
                <input type="text" placeholder="Название трека" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 rounded bg-white dark:bg-slate-700" required />
            </div>

            <div>
                <label className="text-sm font-semibold block mb-1">Аудиофайл *</label>
                <input type="file" accept="audio/mpeg, audio/wav, audio/mp3" onChange={handleFileChange} className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/50 dark:file:text-blue-300 dark:hover:file:bg-blue-900" required />
            </div>

            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg flex items-center disabled:opacity-50">
                {loading && <Loader2 className="animate-spin mr-2"/>}
                Отправить на проверку
            </button>
        </form>
    );
};