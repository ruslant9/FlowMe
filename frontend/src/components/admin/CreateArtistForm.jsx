// frontend/components/admin/CreateArtistForm.jsx

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Loader2, Trash2, Image as ImageIcon } from 'lucide-react';
import { useUser } from '../../hooks/useUser';
import { useCachedImage } from '../../hooks/useCachedImage'; // ИМПОРТ

const API_URL = import.meta.env.VITE_API_URL;

// Компонент для кешированного изображения
const CachedImage = ({ src }) => {
    const { finalSrc, loading } = useCachedImage(src);
    if (loading) {
        return <div className="w-full h-full object-cover bg-slate-200 dark:bg-slate-700 animate-pulse" />;
    }
    return <img src={finalSrc} alt="Предпросмотр" className="w-full h-full object-cover" />;
};

export const CreateArtistForm = ({ onSuccess, isEditMode = false, initialData = null }) => {
    const { currentUser } = useUser();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [tags, setTags] = useState('');
    const [avatar, setAvatar] = useState(null);
    const [loading, setLoading] = useState(false);
    const [avatarPreview, setAvatarPreview] = useState(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (isEditMode && initialData) {
            setName(initialData.name || '');
            setDescription(initialData.description || '');
            setTags(initialData.tags?.join(', ') || '');
            setAvatarPreview(initialData.avatarUrl || null);
        }
    }, [isEditMode, initialData]);

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setAvatar(file);
            if (avatarPreview && avatarPreview.startsWith('blob:')) {
                URL.revokeObjectURL(avatarPreview);
            }
            setAvatarPreview(URL.createObjectURL(file));
        }
    };

    const handleRemoveAvatar = () => {
        setAvatar(null);
        if (avatarPreview && avatarPreview.startsWith('blob:')) {
            URL.revokeObjectURL(avatarPreview);
        }
        setAvatarPreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData();
        formData.append('name', name);
        formData.append('description', description);
        formData.append('tags', tags);
        if (avatar) {
            formData.append('avatar', avatar);
        }

        const isAdmin = currentUser.role === 'admin';
        const endpoint = isEditMode
            ? `${API_URL}/api/admin/content/artists/${initialData._id}`
            : isAdmin
                ? `${API_URL}/api/admin/artists`
                : `${API_URL}/api/submissions/artists`;
        
        const method = isEditMode ? 'put' : 'post';
        
        const successMessage = isEditMode
            ? 'Артист успешно обновлен!'
            : (isAdmin ? 'Артист успешно создан!' : 'Заявка отправлена на модерацию!');
        
        const toastId = toast.loading("Отправка данных...");

        try {
            const token = localStorage.getItem('token');
            const res = await axios[method](endpoint, formData, {
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
            });

            toast.success(res.data.message || successMessage, { id: toastId });

            if (!isEditMode) {
                setName('');
                setDescription('');
                setTags('');
                handleRemoveAvatar();
            }
            onSuccess(); // Вызываем колбэк для обновления списка или закрытия модалки
        } catch (error) {
            toast.error(error.response?.data?.message || "Ошибка при отправке.", { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="p-4 rounded-lg bg-slate-100 dark:bg-slate-800 space-y-4">
    <h3 className="font-bold text-lg">
        {isEditMode ? `Редактирование: ${initialData.name}` : 
         (currentUser.role === 'admin' ? 'Создать Артиста' : 'Предложить нового артиста')}
    </h3>
    {currentUser.role !== 'admin' && !isEditMode && (
        <p className="text-xs text-slate-500 -mt-3">Ваша заявка будет рассмотрена администратором.</p>
    )}
    
    <input type="text" placeholder="Имя артиста" value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2.5 rounded bg-white dark:bg-slate-700" required />
    <textarea placeholder="Описание" value={description} onChange={e => setDescription(e.target.value)} className="w-full px-3 py-2.5 rounded bg-white dark:bg-slate-700" />
    <input type="text" placeholder="Теги через запятую (например: поп-панк, русский рэп)" value={tags} onChange={e => setTags(e.target.value)} className="w-full px-3 py-2.5 rounded bg-white dark:bg-slate-700" />
    
    <div>
        <label className="text-sm font-semibold block mb-2">Аватар артиста (обложка)</label>
        <div className="flex items-center space-x-4">
            <div className="w-20 h-20 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                {avatarPreview ? (
                    <CachedImage src={avatarPreview} />
                ) : (
                    <ImageIcon size={40} className="text-slate-400" />
                )}
            </div>
            <div className="flex flex-col items-start space-y-2">
                <button type="button" onClick={() => fileInputRef.current.click()} className="px-3 py-2 text-sm bg-white dark:bg-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600">
                    Выберите файл
                </button>
                {(avatar || avatarPreview) && (
                     <button type="button" onClick={handleRemoveAvatar} className="flex items-center justify-center space-x-2 px-3 py-2 text-sm bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20">
                        <Trash2 size={16} />
                        <span>Удалить</span>
                    </button>
                )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
        </div>
    </div>

    <button type="submit" disabled={loading} className="w-full px-4 py-2.5 bg-blue-600 text-white font-semibold rounded-lg flex items-center justify-center disabled:opacity-50">
        {loading && <Loader2 className="animate-spin mr-2"/>}
        {isEditMode ? 'Сохранить изменения' : (currentUser.role === 'admin' ? 'Создать артиста' : 'Отправить на проверку')}
    </button>
</form>
    );
};