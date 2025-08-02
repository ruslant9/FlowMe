// frontend/components/admin/CreateAlbumForm.jsx

import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

export const CreateAlbumForm = ({ artists, onSuccess }) => {
    const [title, setTitle] = useState('');
    const [artistId, setArtistId] = useState('');
    const [coverArt, setCoverArt] = useState(null);
    const [loading, setLoading] = useState(false);
    const [coverPreview, setCoverPreview] = useState('');

    const handleCoverChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setCoverArt(file);
            setCoverPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!artistId) {
            toast.error("Пожалуйста, выберите артиста.");
            return;
        }
        setLoading(true);
        const formData = new FormData();
        formData.append('title', title);
        formData.append('artistId', artistId);
        if (coverArt) formData.append('coverArt', coverArt);

        const toastId = toast.loading("Отправка альбома на модерацию...");
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_URL}/api/admin/albums`, formData, {
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
            });
            toast.success(res.data.message, { id: toastId });
            // Сброс формы
            setTitle('');
            setArtistId('');
            setCoverArt(null);
            setCoverPreview('');
            e.target.reset();
            onSuccess(); // Обновляем списки
        } catch (error) {
            toast.error(error.response?.data?.message || "Ошибка при отправке заявки на альбом.", { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="p-4 rounded-lg bg-slate-100 dark:bg-slate-800 space-y-4">
            <h3 className="font-bold text-lg">Создать Альбом</h3>
            <p className="text-xs text-slate-500 -mt-3">Альбом будет отправлен на проверку администраторам.</p>
            
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
                <label className="text-sm font-semibold block mb-1">Название альбома *</label>
                <input type="text" placeholder="Название альбома" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 rounded bg-white dark:bg-slate-700" required />
            </div>
            
            <div>
                <label className="text-sm font-semibold block mb-1">Обложка альбома</label>
                <input type="file" accept="image/*" onChange={handleCoverChange} className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/50 dark:file:text-blue-300 dark:hover:file:bg-blue-900" />
                {coverPreview && <img src={coverPreview} alt="Предпросмотр обложки" className="mt-2 w-24 h-24 rounded object-cover"/>}
            </div>

            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg flex items-center disabled:opacity-50">
                {loading && <Loader2 className="animate-spin mr-2"/>}
                Отправить на проверку
            </button>
        </form>
    );
};