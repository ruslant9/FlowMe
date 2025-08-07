// frontend/src/components/workshop/CreateEditPackModal.jsx

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Image as ImageIcon, Trash2, PlusCircle, AlertTriangle, Crown } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useUser } from '../../hooks/useUser'; // --- НОВЫЙ ИМПОРТ ---

const API_URL = import.meta.env.VITE_API_URL;

// --- НАЧАЛО ИСПРАВЛЕНИЯ 1: Обновленный компонент ToggleSwitch ---
const ToggleSwitch = ({ checked, onChange, label, description, disabled = false }) => (
    <div 
        onClick={disabled ? () => toast.error('Эта функция доступна только для Premium-пользователей.') : null}
        className={`flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-800 rounded-lg transition-opacity ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
    >
        <div>
            <div className="flex items-center space-x-2">
                {disabled && <Crown size={16} className="text-yellow-500" />}
                <span className="font-semibold text-slate-700 dark:text-white">{label}</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-white/60">{description}</p>
        </div>
        <div className="relative inline-flex items-center flex-shrink-0">
            <input
                type="checkbox"
                className="sr-only peer"
                checked={checked}
                onChange={disabled ? undefined : e => onChange(e.target.checked)}
                disabled={disabled}
            />
            <div className="w-11 h-6 bg-gray-500/50 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </div>
    </div>
);
// --- КОНЕЦ ИСПРАВЛЕНИЯ 1 ---


const CreateEditPackModal = ({ isOpen, onClose, isEditMode, initialData, onSave }) => {
    const { currentUser } = useUser(); // Получаем данные текущего пользователя
    const [name, setName] = useState('');
    const [type, setType] = useState('sticker');
    const [isPremiumOnly, setIsPremiumOnly] = useState(false);
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
                setIsPremiumOnly(initialData.isPremium || false);
            } else {
                setName('');
                setType('sticker');
                setExistingItems([]);
                setIsPremiumOnly(false);
            }
            setNewFiles([]);
            setItemsToDelete([]);
        }
    }, [isOpen, isEditMode, initialData]);

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            const preparedFiles = files.map(file => ({
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
        
        if (type === 'emoji') {
            formData.append('isPremiumOnly', isPremiumOnly);
        }

        if (isEditMode) {
            formData.append('itemsToDelete', JSON.stringify(itemsToDelete));
            newFiles.forEach(item => {
                formData.append('newItems', item.file);
            });
        } else {
            newFiles.forEach(item => {
                formData.append('items', item.file);
            });
        }

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
                // --- НАЧАЛО ИСПРАВЛЕНИЯ 2: Изменены классы для позиционирования ---
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start md:items-center justify-center z-[110] p-4 pt-20 md:pt-4">
                {/* --- КОНЕЦ ИСПРАВЛЕНИЯ 2 --- */}
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

                            {/* --- НАЧАЛО ИСПРАВЛЕНИЯ 1 (продолжение): Добавлено свойство disabled --- */}
                            {type === 'emoji' && (
                                <ToggleSwitch 
                                    checked={isPremiumOnly}
                                    onChange={setIsPremiumOnly}
                                    label="Только для Premium"
                                    description="Этот пак будет доступен только пользователям с Premium-подпиской."
                                    disabled={!currentUser?.premium?.isActive}
                                />
                            )}
                            {/* --- КОНЕЦ ИСПРАВЛЕНИЯ 1 (продолжение) --- */}

                            <div className="flex-1 overflow-y-auto -mr-2 pr-2 border-t border-b border-slate-200 dark:border-slate-700 py-4">
                                <label className="block text-sm font-semibold mb-2">Изображения</label>
                                {type === 'sticker' && (
                                    <div className="flex items-center space-x-2 text-xs text-blue-600 dark:text-blue-400 p-2 bg-blue-400/10 rounded-md mb-3">
                                        <AlertTriangle size={16} />
                                        <span>Изображения для стикеров будут автоматически вписаны в квадрат 300x300 пикселей.</span>
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