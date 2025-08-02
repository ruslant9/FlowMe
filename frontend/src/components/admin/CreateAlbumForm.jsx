// frontend/components/admin/CreateAlbumForm.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { useUser } from '../../context/UserContext';
import GenreSelectorSingle from './GenreSelectorSingle'; // <-- 1. Импортируем новый компонент
import ArtistSelector from './ArtistSelector';

const API_URL = import.meta.env.VITE_API_URL;

export const CreateAlbumForm = ({ artists, onSuccess, isEditMode = false, initialData = null }) => {
    const { currentUser } = useUser();
    const [title, setTitle] = useState('');
    const [artistId, setArtistId] = useState('');
    const [genre, setGenre] = useState('');
    const [releaseYear, setReleaseYear] = useState('');
    const [coverArt, setCoverArt] = useState(null);
    const [loading, setLoading] = useState(false);
    const [coverPreview, setCoverPreview] = useState('');

    useEffect(() => {
        if (isEditMode && initialData) {
            setTitle(initialData.title || '');
            setArtistId(initialData.artist?._id || initialData.artist || '');
            setGenre(initialData.genre || '');
            setReleaseYear(initialData.releaseYear || '');
            setCoverPreview(initialData.coverArtUrl ? `${API_URL}/${initialData.coverArtUrl}` : '');
        }
    }, [isEditMode, initialData]);


    const handleCoverChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setCoverArt(file);
            setCoverPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!artistId) { toast.error("Пожалуйста, выберите артиста."); return; }
        if (!genre) { toast.error("Пожалуйста, выберите жанр."); return; }

        setLoading(true);
        const formData = new FormData();
        formData.append('title', title);
        formData.append('artistId', artistId);
        formData.append('genre', genre);
        if (releaseYear) formData.append('releaseYear', releaseYear);
        if (coverArt) formData.append('coverArt', coverArt);

        const isAdmin = currentUser.role === 'admin';
        const endpoint = isEditMode
            ? `${API_URL}/api/admin/content/albums/${initialData._id}`
            : isAdmin ? `${API_URL}/api/admin/albums` : `${API_URL}/api/submissions/albums`;
        const method = isEditMode ? 'put' : 'post';
        
        const successMessage = isEditMode ? 'Альбом обновлен!' : (isAdmin ? 'Альбом успешно создан!' : 'Заявка отправлена на модерацию!');
        const toastId = toast.loading("Отправка данных...");

        try {
            const token = localStorage.getItem('token');
            const res = await axios[method](endpoint, formData, {
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
            });
            toast.success(res.data.message || successMessage, { id: toastId });
            if (!isEditMode) {
                setTitle(''); setArtistId(''); setGenre(''); setReleaseYear(''); setCoverArt(null); setCoverPreview('');
                e.target.reset();
            }
            onSuccess();
        } catch (error) {
            toast.error(error.response?.data?.message || "Ошибка при отправке заявки.", { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="p-4 rounded-lg bg-slate-100 dark:bg-slate-800 space-y-4">
            <h3 className="font-bold text-lg">
                {isEditMode ? `Редактирование: ${initialData.title}` : (currentUser.role === 'admin' ? 'Создать Альбом' : 'Предложить новый альбом')}
            </h3>
            {currentUser.role !== 'admin' && !isEditMode && <p className="text-xs text-slate-500 -mt-3">Альбом будет отправлен на проверку администраторам.</p>}
            
            <div>
                <label className="text-sm font-semibold block mb-1">Исполнитель *</label>
                <ArtistSelector artists={artists} value={artistId} onChange={setArtistId} />
            </div>
            
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="text-sm font-semibold block mb-1">Название альбома *</label>
                    <input type="text" placeholder="Название" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 rounded bg-white dark:bg-slate-700" required />
                </div>
                 <div>
                    <label className="text-sm font-semibold block mb-1">Год выпуска</label>
                    <input type="number" placeholder="Например: 2024" value={releaseYear} onChange={e => setReleaseYear(e.target.value)} min="1900" max={new Date().getFullYear() + 1} className="w-full p-2 rounded bg-white dark:bg-slate-700" />
                </div>
             </div>
            
            {/* --- 2. Заменяем <select> на наш новый компонент --- */}
            <GenreSelectorSingle selectedGenre={genre} onGenreChange={setGenre} />
            
            <div>
                <label className="text-sm font-semibold block mb-1">Обложка альбома</label>
                <input type="file" accept="image/*" onChange={handleCoverChange} className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/50 dark:file:text-blue-300 dark:hover:file:bg-blue-900" />
                {coverPreview && <img src={coverPreview} alt="Предпросмотр" className="mt-2 w-24 h-24 rounded object-cover"/>}
            </div>

            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg flex items-center disabled:opacity-50">
                {loading && <Loader2 className="animate-spin mr-2"/>}
                {isEditMode ? 'Сохранить изменения' : (currentUser.role === 'admin' ? 'Создать альбом' : 'Отправить на проверку')}
            </button>
        </form>
    );
};