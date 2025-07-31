// frontend/src/components/modals/CreatePlaylistModal.jsx
import React, { useState, Fragment, useEffect } from 'react'; // <-- ИЗМЕНЕНИЕ ЗДЕСЬ
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Globe, Lock, EyeOff, Check, ChevronDown } from 'lucide-react';
import { Listbox, Transition } from '@headlessui/react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL;

const visibilityOptions = [
    { id: 'public', name: 'Публичный', description: 'Виден всем и в поиске', icon: Globe },
    { id: 'unlisted', name: 'По ссылке', description: 'Виден на вашем профиле, но не в поиске', icon: EyeOff },
    { id: 'private', name: 'Приватный', description: 'Виден только вам', icon: Lock },
];

const CreatePlaylistModal = ({ isOpen, onClose, onPlaylistCreated }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [visibility, setVisibility] = useState(visibilityOptions[0]);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const toastId = toast.loading('Создание плейлиста...');
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_URL}/api/playlists`, { name, description, visibility: visibility.id }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(`Плейлист "${res.data.name}" создан!`, { id: toastId });
            onPlaylistCreated();
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Ошибка создания.', { id: toastId });
        } finally {
            setLoading(false);
        }
    };
    
    // Этот хук нужен, чтобы сбрасывать форму при закрытии модального окна
    useEffect(() => {
        if (!isOpen) {
            setName('');
            setDescription('');
            setVisibility(visibilityOptions[0]);
        }
    }, [isOpen]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="ios-glass-final w-full max-w-md p-6 rounded-3xl flex flex-col text-slate-900 dark:text-white">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Новый плейлист</h2>
                            <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10"><X /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <input type="text" placeholder="Название плейлиста" value={name} onChange={(e) => setName(e.target.value)}
                                className="w-full p-2 bg-slate-100 dark:bg-slate-800 rounded-lg" required />
                            <textarea placeholder="Описание (необязательно)" value={description} onChange={(e) => setDescription(e.target.value)}
                                className="w-full p-2 bg-slate-100 dark:bg-slate-800 rounded-lg resize-none h-24" />
                            
                            <div>
                                <Listbox value={visibility} onChange={setVisibility}>
                                    <div className="relative">
                                        <Listbox.Button className="relative w-full cursor-pointer rounded-lg bg-slate-100 dark:bg-slate-800 py-2 pl-3 pr-10 text-left shadow-sm">
                                            <span className="flex items-center">
                                                <visibility.icon className="h-5 w-5 mr-2" />
                                                <span className="block truncate">{visibility.name}</span>
                                            </span>
                                            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2"><ChevronDown className="h-5 w-5 text-gray-400"/></span>
                                        </Listbox.Button>
                                        <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                                            <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-slate-700 py-1 text-base shadow-lg ring-1 ring-black/5 z-10">
                                                {visibilityOptions.map((option) => (
                                                    <Listbox.Option key={option.id} className={({ active }) => `relative cursor-pointer select-none py-2 pl-10 pr-4 ${ active ? 'bg-blue-100 dark:bg-blue-600' : '' }`} value={option}>
                                                        {({ selected }) => (
                                                            <>
                                                                <span className={`block truncate ${ selected ? 'font-medium' : 'font-normal' }`}>{option.name}</span>
                                                                {selected ? <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600 dark:text-white"><Check className="h-5 w-5"/></span> : null}
                                                            </>
                                                        )}
                                                    </Listbox.Option>
                                                ))}
                                            </Listbox.Options>
                                        </Transition>
                                    </div>
                                </Listbox>
                                <p className="text-xs text-slate-500 mt-1 pl-1">{visibility.description}</p>
                            </div>
                            
                            <div className="flex justify-end pt-2">
                                <button type="submit" disabled={loading} className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50">
                                    {loading ? <Loader2 className="animate-spin"/> : 'Создать'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default CreatePlaylistModal;