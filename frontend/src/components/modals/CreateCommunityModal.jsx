// frontend/src/components/modals/CreateCommunityModal.jsx

import React, { useState, useRef, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Image as ImageIcon, Users, Eye, Lock, Check, ChevronDown, BookOpen, Text, Trash2 } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Listbox, Transition } from '@headlessui/react';
import ImageAttachmentModal from '../chat/ImageAttachmentModal'; // Re-use existing image editor

const API_URL = import.meta.env.VITE_API_URL;

const topics = [
    { id: 'General', name: 'Общая', icon: Text },
    { id: 'Gaming', name: 'Игры', icon: ({className}) => <img src="/icons/gaming.svg" className={className} alt="Gaming"/> },
    { id: 'Art', name: 'Искусство', icon: ({className}) => <img src="/icons/art.svg" className={className} alt="Art"/> },
    { id: 'Technology', name: 'Технологии', icon: ({className}) => <img src="/icons/tech.svg" className={className} alt="Technology"/> },
    { id: 'Music', name: 'Музыка', icon: ({className}) => <img src="/icons/music.svg" className={className} alt="Music"/> },
    { id: 'Sports', name: 'Спорт', icon: ({className}) => <img src="/icons/sports.svg" className={className} alt="Sports"/> },
    { id: 'Science', name: 'Наука', icon: ({className}) => <img src="/icons/science.svg" className={className} alt="Science"/> },
    { id: 'Books', name: 'Книги', icon: BookOpen },
    { id: 'Food', name: 'Еда', icon: ({className}) => <img src="/icons/food.svg" className={className} alt="Food"/> },
    { id: 'Travel', name: 'Путешествия', icon: ({className}) => <img src="/icons/travel.svg" className={className} alt="Travel"/> },
    { id: 'Fashion', name: 'Мода', icon: ({className}) => <img src="/icons/fashion.svg" className={className} alt="Fashion"/> },
    { id: 'Photography', name: 'Фотография', icon: ({className}) => <img src="/icons/photo.svg" className={className} alt="Photography"/> },
    { id: 'Health', name: 'Здоровье', icon: ({className}) => <img src="/icons/health.svg" className={className} alt="Health"/> },
    { id: 'Education', name: 'Образование', icon: ({className}) => <img src="/icons/edu.svg" className={className} alt="Education"/> },
    { id: 'Business', name: 'Бизнес', icon: ({className}) => <img src="/icons/business.svg" className={className} alt="Business"/> },
    { id: 'Finance', name: 'Финансы', icon: ({className}) => <img src="/icons/finance.svg" className={className} alt="Finance"/> },
    { id: 'Nature', name: 'Природа', icon: ({className}) => <img src="/icons/nature.svg" className={className} alt="Nature"/> },
    { id: 'Pets', name: 'Питомцы', icon: ({className}) => <img src="/icons/pets.svg" className={className} alt="Pets"/> },
    { id: 'DIY', name: 'Сделай сам', icon: ({className}) => <img src="/icons/diy.svg" className={className} alt="DIY"/> },
    { id: 'Cars', name: 'Автомобили', icon: ({className}) => <img src="/icons/cars.svg" className={className} alt="Cars"/> },
    { id: 'Movies', name: 'Фильмы', icon: ({className}) => <img src="/icons/movies.svg" className={className} alt="Movies"/> },
    { id: 'TV Shows', name: 'ТВ-шоу', icon: ({className}) => <img src="/icons/tv.svg" className={className} alt="TV Shows"/> },
    { id: 'Anime & Manga', name: 'Аниме и Манга', icon: ({className}) => <img src="/icons/anime.svg" className={className} alt="Anime & Manga"/> },
    { id: 'Comics', name: 'Комиксы', icon: ({className}) => <img src="/icons/comics.svg" className={className} alt="Comics"/> },
    { id: 'History', name: 'История', icon: ({className}) => <img src="/icons/history.svg" className={className} alt="History"/> },
    { id: 'Philosophy', name: 'Философия', icon: ({className}) => <img src="/icons/philosophy.svg" className={className} alt="Philosophy"/> },
    { id: 'Politics', name: 'Политика', icon: ({className}) => <img src="/icons/politics.svg" className={className} alt="Politics"/> },
    { id: 'News', name: 'Новости', icon: ({className}) => <img src="/icons/news.svg" className={className} alt="News"/> },
    { id: 'Humor', name: 'Юмор', icon: ({className}) => <img src="/icons/humor.svg" className={className} alt="Humor"/> },
    { id: 'Fitness', name: 'Фитнес', icon: ({className}) => <img src="/icons/fitness.svg" className={className} alt="Fitness"/> },
    { id: 'Other', name: 'Другое', icon: ({className}) => <img src="/icons/other.svg" className={className} alt="Other"/> },
];


const CreateCommunityModal = ({ isOpen, onClose }) => {
    const [communityData, setCommunityData] = useState({
        name: '',
        description: '',
        topic: 'General',
        visibility: 'public',
        joinPolicy: 'open',
    });
    const [avatarFile, setAvatarFile] = useState(null);
    const [coverFile, setCoverFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [editingImageFor, setEditingImageFor] = useState(null); // 'avatar' or 'cover'

    const avatarInputRef = useRef(null);
    const coverInputRef = useRef(null);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setCommunityData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e, type) => {
        const file = e.target.files[0];
        if (!file) return;

        if (type === 'avatar') {
            setAvatarFile({ file, preview: URL.createObjectURL(file) });
        } else if (type === 'cover') {
            setCoverFile({ file, preview: URL.createObjectURL(file) });
        }
    };
    
    // --- НАЧАЛО ИЗМЕНЕНИЯ 1: Добавляем функцию удаления изображения ---
    const handleRemoveImage = (type) => {
        if (type === 'avatar' && avatarFile?.preview) {
            URL.revokeObjectURL(avatarFile.preview);
            setAvatarFile(null);
        } else if (type === 'cover' && coverFile?.preview) {
            URL.revokeObjectURL(coverFile.preview);
            setCoverFile(null);
        }
    };
    // --- КОНЕЦ ИЗМЕНЕНИЯ 1 ---

    const handleEditImage = (type) => {
        setEditingImageFor(type);
    };

    const handleImageEdited = (editedBlob) => {
        if (editingImageFor === 'avatar') {
            setAvatarFile(prev => ({ file: editedBlob, preview: URL.createObjectURL(editedBlob) }));
        } else if (editingImageFor === 'cover') {
            setCoverFile(prev => ({ file: editedBlob, preview: URL.createObjectURL(editedBlob) }));
        }
        setEditingImageFor(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!communityData.name.trim()) {
            toast.error('Название сообщества обязательно.');
            return;
        }

        setLoading(true);
        const toastId = toast.loading('Создание сообщества...');

        const formData = new FormData();
        Object.keys(communityData).forEach(key => {
            formData.append(key, communityData[key]);
        });
        if (avatarFile) formData.append('avatar', avatarFile.file);
        if (coverFile) formData.append('coverImage', coverFile.file);

        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/api/communities`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`
                }
            });
            toast.success('Сообщество успешно создано!', { id: toastId });
            onClose();
            resetForm();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Ошибка создания сообщества.', { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setCommunityData({
            name: '',
            description: '',
            topic: 'General',
            visibility: 'public',
            joinPolicy: 'open',
        });
        if (avatarFile?.preview) URL.revokeObjectURL(avatarFile.preview);
        if (coverFile?.preview) URL.revokeObjectURL(coverFile.preview);
        setAvatarFile(null);
        setCoverFile(null);
        setEditingImageFor(null);
    };

    const handleCloseModal = () => {
        resetForm();
        onClose();
    };

    const selectedTopic = topics.find(t => t.id === communityData.topic);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <ImageAttachmentModal
                        isOpen={!!editingImageFor}
                        onClose={() => setEditingImageFor(null)}
                        file={editingImageFor === 'avatar' ? avatarFile?.file : coverFile?.file}
                        onSave={handleImageEdited}
                        showCaptionInput={false}
                    />
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleCloseModal}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            // --- НАЧАЛО ИЗМЕНЕНИЯ 2: Убираем overflow-y-auto ---
                            className="ios-glass-final w-full max-w-3xl p-6 rounded-3xl flex flex-col text-slate-900 dark:text-white max-h-[90vh]"
                        >
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold">Создать сообщество</h2>
                                <button onClick={handleCloseModal} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"><X /></button>
                            </div>
                            
                            <form onSubmit={handleSubmit} className="flex-1 flex flex-col space-y-4">
                                <div>
                                    <label htmlFor="name" className="block text-sm font-semibold mb-1">Название сообщества</label>
                                    <input type="text" id="name" name="name" value={communityData.name} onChange={handleChange} className="w-full p-2 bg-slate-100 dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Например, 'Любители кошек'" required />
                                </div>
                                <div>
                                    <label htmlFor="description" className="block text-sm font-semibold mb-1">Описание</label>
                                    <textarea id="description" name="description" value={communityData.description} onChange={handleChange} rows="3" className="w-full p-2 bg-slate-100 dark:bg-slate-800 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Расскажите о чем ваше сообщество..."></textarea>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label htmlFor="topic" className="block text-sm font-semibold mb-1">Тематика</label>
                                        <Listbox value={communityData.topic} onChange={(value) => setCommunityData(prev => ({ ...prev, topic: value }))}>
                                            <div className="relative mt-1">
                                                <Listbox.Button className="relative w-full cursor-default rounded-lg bg-slate-100 dark:bg-slate-800 py-2 pl-3 pr-10 text-left shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:text-sm">
                                                    <span className="block truncate">{selectedTopic.name}</span>
                                                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                                                        <ChevronDown className="h-5 w-5 text-gray-400" aria-hidden="true" />
                                                    </span>
                                                </Listbox.Button>
                                                <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                                                    <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-slate-700 py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
                                                        {topics.map((topic) => (
                                                            <Listbox.Option key={topic.id} className={({ active }) => `relative cursor-default select-none py-2 pl-10 pr-4 ${ active ? 'bg-blue-100 dark:bg-blue-600' : '' }`} value={topic.id}>
                                                                {({ selected }) => (
                                                                    <>
                                                                        <span className={`block truncate ${ selected ? 'font-medium' : 'font-normal' }`}>{topic.name}</span>
                                                                        {selected ? (<span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600 dark:text-white"><Check className="h-5 w-5" aria-hidden="true" /></span>) : null}
                                                                    </>
                                                                )}
                                                            </Listbox.Option>
                                                        ))}
                                                    </Listbox.Options>
                                                </Transition>
                                            </div>
                                        </Listbox>
                                    </div>
                                    <div>
                                        <label htmlFor="visibility" className="block text-sm font-semibold mb-1">Видимость</label>
                                        <Listbox value={communityData.visibility} onChange={(value) => setCommunityData(prev => ({ ...prev, visibility: value }))}>
                                            <div className="relative mt-1">
                                                <Listbox.Button className="relative w-full cursor-default rounded-lg bg-slate-100 dark:bg-slate-800 py-2 pl-3 pr-10 text-left shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:text-sm">
                                                    <span className="block truncate">{communityData.visibility === 'public' ? 'Публичное' : communityData.visibility === 'private' ? 'Приватное' : 'Секретное'}</span>
                                                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2"><ChevronDown className="h-5 w-5 text-gray-400" aria-hidden="true" /></span>
                                                </Listbox.Button>
                                                <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                                                    <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-slate-700 py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
                                                        {['public', 'private', 'secret'].map((policy) => (
                                                            <Listbox.Option key={policy} className={({ active }) => `relative cursor-default select-none py-2 pl-10 pr-4 ${ active ? 'bg-blue-100 dark:bg-blue-600' : '' }`} value={policy}>
                                                                {({ selected }) => (<><span className={`block truncate ${ selected ? 'font-medium' : 'font-normal' }`}>{policy === 'public' ? 'Публичное' : policy === 'private' ? 'Приватное' : 'Секретное'}</span>{selected ? (<span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600 dark:text-white"><Check className="h-5 w-5" aria-hidden="true" /></span>) : null}</>)}
                                                            </Listbox.Option>
                                                        ))}
                                                    </Listbox.Options>
                                                </Transition>
                                            </div>
                                        </Listbox>
                                    </div>
                                    <div>
                                        <label htmlFor="joinPolicy" className="block text-sm font-semibold mb-1">Политика вступления</label>
                                        <Listbox value={communityData.joinPolicy} onChange={(value) => setCommunityData(prev => ({ ...prev, joinPolicy: value }))}>
                                            <div className="relative mt-1">
                                                <Listbox.Button className="relative w-full cursor-default rounded-lg bg-slate-100 dark:bg-slate-800 py-2 pl-3 pr-10 text-left shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:text-sm">
                                                    <span className="block truncate">{communityData.joinPolicy === 'open' ? 'Открытое' : communityData.joinPolicy === 'approval_required' ? 'По заявке' : 'По приглашению'}</span>
                                                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2"><ChevronDown className="h-5 w-5 text-gray-400" aria-hidden="true" /></span>
                                                </Listbox.Button>
                                                <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                                                    <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-slate-700 py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
                                                        {['open', 'approval_required', 'invite_only'].map((policy) => (
                                                            <Listbox.Option key={policy} className={({ active }) => `relative cursor-default select-none py-2 pl-10 pr-4 ${ active ? 'bg-blue-100 dark:bg-blue-600' : '' }`} value={policy}>
                                                                {({ selected }) => (<><span className={`block truncate ${ selected ? 'font-medium' : 'font-normal' }`}>{policy === 'open' ? 'Открытое' : policy === 'approval_required' ? 'По заявке' : 'По приглашению'}</span>{selected ? (<span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600 dark:text-white"><Check className="h-5 w-5" aria-hidden="true" /></span>) : null}</>)}
                                                            </Listbox.Option>
                                                        ))}
                                                    </Listbox.Options>
                                                </Transition>
                                            </div>
                                        </Listbox>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold mb-1">Аватар сообщества</label>
                                        <div className="flex items-center space-x-2">
                                            <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 flex-shrink-0 flex items-center justify-center">
                                                {avatarFile?.preview ? (<img src={avatarFile.preview} alt="Avatar Preview" className="w-full h-full object-cover" />) : (<ImageIcon size={24} className="text-slate-400" />)}
                                            </div>
                                            {/* --- НАЧАЛО ИЗМЕНЕНИЯ 3: Добавляем кнопку удаления --- */}
                                            <div className="flex items-center space-x-2">
                                                <button type="button" onClick={() => avatarInputRef.current.click()} className="px-3 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center">
                                                    <ImageIcon size={16} className="mr-2" /> Загрузить
                                                </button>
                                                {avatarFile && (
                                                    <>
                                                        <button type="button" onClick={() => handleEditImage('avatar')} className="px-3 py-2 text-sm bg-slate-200 dark:bg-slate-700 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600">
                                                            Редактировать
                                                        </button>
                                                        <button type="button" onClick={() => handleRemoveImage('avatar')} className="p-2 text-red-500 rounded-lg hover:bg-red-500/10" title="Удалить">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                            <input type="file" ref={avatarInputRef} hidden accept="image/jpeg, image/png, image/jpg, image/webp" onChange={(e) => handleFileChange(e, 'avatar')} />
                                            {/* --- КОНЕЦ ИЗМЕНЕНИЯ 3 --- */}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold mb-1">Обложка сообщества (опционально)</label>
                                        <div className="flex items-center space-x-2">
                                            <div className="w-24 h-16 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-700 flex-shrink-0 flex items-center justify-center">
                                                {coverFile?.preview ? (<img src={coverFile.preview} alt="Cover Preview" className="w-full h-full object-cover" />) : (<ImageIcon size={24} className="text-slate-400" />)}
                                            </div>
                                             {/* --- НАЧАЛО ИЗМЕНЕНИЯ 4: Добавляем кнопку удаления --- */}
                                            <div className="flex items-center space-x-2">
                                                <button type="button" onClick={() => coverInputRef.current.click()} className="px-3 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center">
                                                    <ImageIcon size={16} className="mr-2" /> Загрузить
                                                </button>
                                                {coverFile && (
                                                    <>
                                                        <button type="button" onClick={() => handleEditImage('cover')} className="px-3 py-2 text-sm bg-slate-200 dark:bg-slate-700 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600">
                                                            Редактировать
                                                        </button>
                                                        <button type="button" onClick={() => handleRemoveImage('cover')} className="p-2 text-red-500 rounded-lg hover:bg-red-500/10" title="Удалить">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                            <input type="file" ref={coverInputRef} hidden accept="image/jpeg, image/png, image/jpg, image/webp" onChange={(e) => handleFileChange(e, 'cover')} />
                                            {/* --- КОНЕЦ ИЗМЕНЕНИЯ 4 --- */}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end mt-6">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                                    >
                                        {loading && <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />}
                                        {loading ? 'Создание...' : 'Создать сообщество'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default CreateCommunityModal;