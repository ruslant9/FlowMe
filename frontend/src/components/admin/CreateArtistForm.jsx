// frontend/components/admin/CreateArtistForm.jsx

import React, { useState, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Loader2, Trash2, Image as ImageIcon } from 'lucide-react';
import { useUser } from '../../context/UserContext';

const API_URL = import.meta.env.VITE_API_URL;

export const CreateArtistForm = ({ onSuccess }) => {
    const { currentUser } = useUser();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [tags, setTags] = useState('');
    const [avatar, setAvatar] = useState(null);
    const [loading, setLoading] = useState(false);

    // --- ИЗМЕНЕНИЕ 1: Состояние для предпросмотра и реф для инпута ---
    const [avatarPreview, setAvatarPreview] = useState(null);
    const fileInputRef = useRef(null);
    // --- КОНЕЦ ИЗМЕНЕНИЯ 1 ---

    // --- ИЗМЕНЕНИЕ 2: Обновляем обработчик выбора файла ---
    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setAvatar(file);
            setAvatarPreview(URL.createObjectURL(file));
        }
    };
    // --- КОНЕЦ ИЗМЕНЕНИЯ 2 ---

    // --- ИЗМЕНЕНИЕ 3: Функция для удаления выбранного аватара ---
    const handleRemoveAvatar = () => {
        setAvatar(null);
        if (avatarPreview) {
            URL.revokeObjectURL(avatarPreview);
        }
        setAvatarPreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };
    // --- КОНЕЦ ИЗМЕНЕНИЯ 3 ---

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData();
        formData.append('name', name);
        formData.append('description', description);
        formData.append('tags', tags);
        if (avatar) formData.append('avatar', avatar);

        const endpoint = currentUser.role === 'admin'
            ? `${API_URL}/api/admin/artists`
            : `${API_URL}/api/submissions/artists`;
        
        const successMessage = currentUser.role === 'admin'
            ? 'Артист успешно создан!'
            : 'Заявка отправлена на модерацию!';

        const toastId = toast.loading("Отправка данных...");
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(endpoint, formData, {
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
            });
            toast.success(successMessage, { id: toastId });
            setName(''); setDescription(''); setTags('');
            handleRemoveAvatar(); // Очищаем аватар после успешной отправки
            onSuccess();
        } catch (error) {
            toast.error(error.response?.data?.message || "Ошибка отправки.", { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="p-4 rounded-lg bg-slate-100 dark:bg-slate-800 space-y-4">
            <h3 className="font-bold text-lg">
                {currentUser.role === 'admin' ? 'Создать/Редактировать Артиста' : 'Предложить нового артиста'}
            </h3>
            {currentUser.role !== 'admin' && (
                <p className="text-xs text-slate-500 -mt-3">Ваша заявка будет рассмотрена администратором.</p>
            )}
            
            <input type="text" placeholder="Имя артиста" value={name} onChange={e => setName(e.target.value)} className="w-full p-2 rounded bg-white dark:bg-slate-700" required />
            <textarea placeholder="Описание" value={description} onChange={e => setDescription(e.target.value)} className="w-full p-2 rounded bg-white dark:bg-slate-700" />
            <input type="text" placeholder="Теги через запятую (для поиска)" value={tags} onChange={e => setTags(e.target.value)} className="w-full p-2 rounded bg-white dark:bg-slate-700" />
            
            {/* --- ИЗМЕНЕНИЕ 4: Обновляем JSX для отображения превью и кнопки удаления --- */}
            <div>
                <label className="text-sm font-semibold block mb-2">Аватар артиста (обложка)</label>
                <div className="flex items-center space-x-4">
                    <div className="w-24 h-24 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {avatarPreview ? (
                            <img src={avatarPreview} alt="Предпросмотр" className="w-full h-full object-cover" />
                        ) : (
                            <ImageIcon size={40} className="text-slate-400" />
                        )}
                    </div>
                    <div className="flex flex-col space-y-2">
                        <button type="button" onClick={() => fileInputRef.current.click()} className="px-4 py-2 text-sm bg-white dark:bg-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600">
                            Выберите файл
                        </button>
                        {avatar && (
                             <button type="button" onClick={handleRemoveAvatar} className="flex items-center justify-center space-x-2 px-4 py-2 text-sm bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20">
                                <Trash2 size={16} />
                                <span>Удалить</span>
                            </button>
                        )}
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                </div>
            </div>
            {/* --- КОНЕЦ ИЗМЕНЕНИЯ 4 --- */}

            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg flex items-center disabled:opacity-50">
                {loading && <Loader2 className="animate-spin mr-2"/>}
                {currentUser.role === 'admin' ? 'Создать артиста' : 'Отправить на проверку'}
            </button>
        </form>
    );
};