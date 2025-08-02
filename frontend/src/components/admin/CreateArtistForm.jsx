// frontend/components/admin/CreateArtistForm.jsx

import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

export const CreateArtistForm = ({ onSuccess }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [tags, setTags] = useState('');
    const [avatar, setAvatar] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData();
        formData.append('name', name);
        formData.append('description', description);
        formData.append('tags', tags);
        if (avatar) formData.append('avatar', avatar);

        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_URL}/api/admin/artists`, formData, {
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
            });
            toast.success(res.data.message);
            setName(''); setDescription(''); setTags(''); setAvatar(null);
            e.target.reset();
            onSuccess();
        } catch (error) {
            toast.error(error.response?.data?.message || "Ошибка отправки.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="p-4 rounded-lg bg-slate-100 dark:bg-slate-800 space-y-4">
            <h3 className="font-bold text-lg">Создать/Редактировать Артиста</h3>
            <input type="text" placeholder="Имя артиста" value={name} onChange={e => setName(e.target.value)} className="w-full p-2 rounded bg-white dark:bg-slate-700" required />
            <textarea placeholder="Описание" value={description} onChange={e => setDescription(e.target.value)} className="w-full p-2 rounded bg-white dark:bg-slate-700" />
            <input type="text" placeholder="Теги через запятую (для поиска)" value={tags} onChange={e => setTags(e.target.value)} className="w-full p-2 rounded bg-white dark:bg-slate-700" />
            <div>
                <label className="text-sm block mb-1">Аватар артиста (обложка)</label>
                <input type="file" accept="image/*" onChange={e => setAvatar(e.target.files[0])} className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
            </div>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center disabled:opacity-50">
                {loading && <Loader2 className="animate-spin mr-2"/>}
                Отправить на проверку
            </button>
        </form>
    );
};