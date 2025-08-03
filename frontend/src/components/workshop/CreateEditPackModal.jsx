// frontend/src/components/workshop/CreateEditPackModal.jsx

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Image as ImageIcon, Trash2, PlusCircle, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL;

const CreateEditPackModal = ({ isOpen, onClose, isEditMode, initialData, onSave }) => {
    const [name, setName] = useState('');
    const [type, setType] = useState('sticker');
    const [existingItems, setExistingItems] = useState([]);
    const [newFiles, setNewFiles] = useState([]);
    const [itemsToDelete, setItemsToDelete] = useState([]);
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            if (isEditMode && initialData) {
                setName(initialData.name);
                setType(initialData.type);
                setExistingItems(initialData.items);
            } else {
                setName('');
                setType('sticker');
                setExistingItems([]);
            }
            setNewFiles([]);
            setItemsToDelete([]);
        }
    }, [isOpen, isEditMode, initialData]);

    const validateStickerFile = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (e) => {
                const img = new Image();
                img.src = e.target.result;
                img.onload = () => {
                    if (img.width !== img.height) {
                        return reject(`Файл "${file.name}" не является квадратным.`);
                    }
                    if (img.width < 100 || img.width > 200) {
                        return reject(`Размер "${file.name}" (${img.width}x${img.height}) не входит в диапазон 100-200px.`);
                    }
                    resolve(file);
                };
                img.onerror = () => reject(`Не удалось прочитать файл "${file.name}".`);
            };
            reader.onerror = () => reject(`Ошибка чтения файла "${file.name}".`);
        });
    };

    const handleFileChange = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        let validFiles = files;
        
        if (type === 'sticker') {
            const validationPromises = files.map(validateStickerFile);
            const results = await Promise.allSettled(validationPromises);
            
            validFiles = results
                .filter(r => r.status === 'fulfilled')
                .map(r => r.value);
            
            const invalidReasons = results
                .filter(r => r.status === 'rejected')
                .map(r => r.reason);

            if (invalidReasons.length > 0) {
                toast.error(
                    (t) => (
                        <div className="flex flex-col">
                            <b>Некоторые файлы не были добавлены:</b>
                            <ul className="list-disc list-inside text-sm mt-1">
                                {invalidReasons.slice(0, 3).map((reason, i) => <li key={i}>{reason}</li>)}
                                {invalidReasons.length > 3 && <li>и еще {invalidReasons.length - 3}...</li>}
                            </ul>
                        </div>
                    ),
                    { duration: 6000 }
                );
            }
        }

        if (validFiles.length > 0) {
            const preparedFiles = validFiles.map(file => ({
                file,
                preview: URL.createObjectURL(file)
            }));
            setNewFiles(prev => [...prev, ...preparedFiles]);
        }
    };

    const handleRemoveExistingItem = (itemId) => {
        setItemsToDelete(prev => [...prev, itemId]);
        setExistingItems(prev => prev.filter(item => item._id !== itemId));
    };

    const handleRemoveNewFile = (index) => {
        setNewFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const toastId = toast.loading(isEditMode ? 'Сохранение пака...' : 'Создание пака...');

        const formData = new FormData();
        formData.append('name', name);
        formData.append('type', type);

        if (isEditMode) {
            formData.append('itemsToDelete', JSON.stringify(itemsToDelete));
        }
        
        // --- НАЧАЛО ИСПРАВЛЕНИЯ ---
        // Используем правильное имя поля в зависимости от режима (создание/редактирование)
        newFiles.forEach(item => {
            const fieldName = isEditMode ? 'newItems' : 'items';
            formData.append(fieldName, item.file);
        });
        // --- КОНЕЦ ИСПРАВЛЕНИЯ ---

        try {
            const token = localStorage.getItem('token');
            const endpoint = isEditMode ? `${API_URL}/api/workshop/packs/${initialData._id}` : `${API_URL}/api/workshop/packs`;
            const method = isEditMode ? 'put' : 'post';
            
            const res = await axios[method](endpoint, formData, {
                headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` }
            });
            
            toast.success(isEditMode ? 'Пак успешно обновлен!' : 'Пак успешно создан!', { id: toastId });
            onSave(res.data);
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Произошла ошибка.', { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
                    <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="ios-glass-final w-full max-w-2xl p-6 rounded-3xl flex flex-col text-slate-900 dark:text-white max-h-[90vh]">
                        
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">{isEditMode ? 'Редактировать пак' : 'Создать новый пак'}</h2>
                            <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10"><X /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex-1 flex flex-col space-y-4 min-h-0">
                            <div>
                                <label className="block text-sm font-semibold mb-1">Название пака</label>
                                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Например, 'Веселые коты'"
                                    className="w-full p-2 bg-slate-100 dark:bg-slate-800 rounded-lg" required />
                            </div>
                            
                            {!isEditMode && (
                                <div>
                                    <label className="block text-sm font-semibold mb-1">Тип пака</label>
                                    <div className="flex items-center space-x-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                        <button type="button" onClick={() => setType('sticker')} className={`flex-1 py-1.5 text-sm rounded-md ${type === 'sticker' ? 'bg-blue-600 text-white' : ''}`}>Стикеры</button>
                                        <button type="button" onClick={() => setType('emoji')} className={`flex-1 py-1.5 text-sm rounded-md ${type === 'emoji' ? 'bg-blue-600 text-white' : ''}`}>Эмодзи</button>
                                    </div>
                                </div>
                            )}

                            <div className="flex-1 overflow-y-auto -mr-2 pr-2 border-t border-b border-slate-200 dark:border-slate-700 py-4">
                                <label className="block text-sm font-semibold mb-2">Изображения</label>
                                {type === 'sticker' && (
                                    <div className="flex items-center space-x-2 text-xs text-yellow-600 dark:text-yellow-400 p-2 bg-yellow-400/10 rounded-md mb-3">
                                        <AlertTriangle size={16} />
                                        <span>Стикеры должны быть квадратными, от 100x100 до 200x200 пикселей.</span>
                                    </div>
                                )}
                                <div className={`grid gap-2 ${type === 'sticker' ? 'grid-cols-3' : 'grid-cols-5'}`}>
                                    {existingItems.map(item => (
                                        <div key={item._id} className="relative group aspect-square">
                                            <img src={item.imageUrl} alt="item" className="w-full h-full object-contain bg-slate-200 dark:bg-slate-700 rounded-md" />
                                            <button type="button" onClick={() => handleRemoveExistingItem(item._id)} className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
                                        </div>
                                    ))}
                                    {newFiles.map((item, index) => (
                                        <div key={index} className="relative group aspect-square">
                                            <img src={item.preview} alt="preview" className="w-full h-full object-contain bg-slate-200 dark:bg-slate-700 rounded-md" />
                                            <button type="button" onClick={() => handleRemoveNewFile(index)} className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
                                        </div>
                                    ))}
                                    <button type="button" onClick={() => fileInputRef.current.click()} className="flex items-center justify-center aspect-square border-2 border-dashed border-slate-400 dark:border-slate-600 rounded-md text-slate-500 hover:border-blue-500 hover:text-blue-500">
                                        <PlusCircle size={24} />
                                    </button>
                                </div>
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple accept="image/png, image/gif, image/webp" className="hidden" />
                            </div>

                            <div className="flex justify-end pt-2">
                                <button type="submit" disabled={loading} className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center">
                                    {loading && <Loader2 className="animate-spin mr-2"/>}
                                    {isEditMode ? 'Сохранить' : 'Создать'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default CreateEditPackModal;