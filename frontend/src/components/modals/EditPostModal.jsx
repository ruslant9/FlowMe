// frontend/src/components/modals/EditPostModal.jsx

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Image as ImageIcon, Trash2, Loader2, Smile, Calendar as CalendarIcon } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import DatePicker, { registerLocale } from 'react-datepicker';
import { ru } from 'date-fns/locale';
import { setHours, setMinutes, isToday } from 'date-fns';


registerLocale('ru', ru);
const Picker = React.lazy(() => import('emoji-picker-react'));
const API_URL = import.meta.env.VITE_API_URL;
const EMOJI_PICKER_HEIGHT = 450;

// --- ИЗМЕНЕНИЕ: Добавляем хелпер-функцию ---
const getImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) {
        return url;
    }
    return `${API_URL}/${url}`;
};

const getMinTime = (date) => {
    if (!date || !isToday(date)) {
        return setHours(setMinutes(new Date(), 0), 0);
    }
    return new Date();
};


const EditPostModal = ({ isOpen, onClose, post }) => {
    const [text, setText] = useState('');
    const [existingImages, setExistingImages] = useState([]);
    const [newImages, setNewImages] = useState([]);
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef(null);
    
    const [isPickerVisible, setIsPickerVisible] = useState(false);
    const [pickerPosition, setPickerPosition] = useState('top');
    const pickerRef = useRef(null);
    const smileButtonRef = useRef(null);
    
    const [scheduledFor, setScheduledFor] = useState(null);
    const isScheduledPost = !!post?.scheduledFor;

    useEffect(() => {
        if (isOpen && post) {
            setText(post.text || '');
            setExistingImages(post.imageUrls || []);
            setNewImages([]);
            setScheduledFor(post.scheduledFor ? new Date(post.scheduledFor) : null);
        }
    }, [isOpen, post]);

    const togglePicker = () => {
        if (smileButtonRef.current) {
            const rect = smileButtonRef.current.getBoundingClientRect();
            if (window.innerHeight - rect.bottom < EMOJI_PICKER_HEIGHT) {
                setPickerPosition('top');
            } else {
                setPickerPosition('bottom');
            }
        }
        setIsPickerVisible(p => !p);
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (smileButtonRef.current && smileButtonRef.current.contains(event.target)) {
                return;
            }
            if (pickerRef.current && !pickerRef.current.contains(event.target)) {
                setIsPickerVisible(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        if (existingImages.length + newImages.length + files.length > 5) {
            toast.error('Можно прикрепить не более 5 изображений.');
            return;
        }
        
        const newImagesWithPreview = files.map(file => ({
            file,
            preview: URL.createObjectURL(file)
        }));
        setNewImages(prev => [...prev, ...newImagesWithPreview]);
    };

    const removeExistingImage = (urlToRemove) => {
        setExistingImages(prev => prev.filter(url => url !== urlToRemove));
    };

    const removeNewImage = (indexToRemove) => {
        setNewImages(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!text.trim() && existingImages.length === 0 && newImages.length === 0) {
            toast.error('Пост не может быть пустым.');
            return;
        }
        setLoading(true);
        const toastId = toast.loading('Сохранение изменений...');

        const formData = new FormData();
        formData.append('text', text);
        existingImages.forEach(url => {
            formData.append('existingImages', url);
        });
        newImages.forEach(img => {
            formData.append('images', img.file);
        });
        
        if (isScheduledPost) {
            formData.append('scheduledFor', scheduledFor ? scheduledFor.toISOString() : '');
        }

        try {
            const token = localStorage.getItem('token');
            await axios.put(`${API_URL}/api/posts/${post._id}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${token}`
                }
            });
            toast.success('Пост успешно обновлен!', { id: toastId });
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Ошибка при обновлении поста.', { id: toastId });
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                >
                    <motion.div
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.9, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="ios-glass-final w-full max-w-2xl p-6 rounded-3xl flex flex-col text-slate-900 dark:text-white"
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Редактирование поста</h2>
                            <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"><X /></button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
                            <div className="relative">
                                <textarea
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                    placeholder="Что у вас нового?"
                                    className="w-full h-32 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                ></textarea>
                                {isPickerVisible && (
                                    <div ref={pickerRef} className={`absolute z-10 right-0 ${pickerPosition === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'}`}>
                                         <Suspense fallback={<div className="w-80 h-96 bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center justify-center">...</div>}>
                                            <Picker 
                                                onEmojiClick={(emojiObject) => setText(prev => prev + emojiObject.emoji)} 
                                                theme={localStorage.getItem('theme') === 'dark' ? "dark" : "light"}
                                            />
                                        </Suspense>
                                    </div>
                                )}
                            </div>
                            
                            <div className="grid grid-cols-3 md:grid-cols-5 gap-2 mt-4">
                                {existingImages.map((url) => (
                                    <div key={url} className="relative aspect-square">
                                        {/* --- ИЗМЕНЕНИЕ --- */}
                                        <img src={getImageUrl(url)} alt="existing" className="w-full h-full object-cover rounded-md" />
                                        <button type="button" onClick={() => removeExistingImage(url)} className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full hover:bg-red-600"><X size={14} /></button>
                                    </div>
                                ))}
                                {newImages.map((img, index) => (
                                    <div key={index} className="relative aspect-square">
                                        <img src={img.preview} alt="preview" className="w-full h-full object-cover rounded-md" />
                                        <button type="button" onClick={() => removeNewImage(index)} className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full hover:bg-red-600"><X size={14} /></button>
                                    </div>
                                ))}
                            </div>
                            
                            {isScheduledPost && (
                                <div className="mt-4 flex items-center space-x-2">
                                    <label className="text-sm font-semibold whitespace-nowrap">Время публикации:</label>
                                    <DatePicker
                                        selected={scheduledFor}
                                        onChange={(date) => setScheduledFor(date)}
                                        showTimeSelect
                                        minDate={new Date()}
                                        minTime={getMinTime(scheduledFor)}
                                        maxTime={setHours(setMinutes(new Date(), 59), 23)}
                                        timeFormat="HH:mm"
                                        timeIntervals={15}
                                        dateFormat="d MMMM, yyyy HH:mm"
                                        locale={ru}
                                        isClearable
                                        placeholderText="Опубликовать сейчас"
                                        portalId="modal-root"
                                        className="w-full text-sm p-2 bg-slate-200 dark:bg-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            )}

                            <div className="flex items-center justify-between mt-4">
                                <div className="flex items-center space-x-2">
                                    <button type="button" onClick={() => fileInputRef.current.click()} className="p-2 text-slate-500 dark:text-slate-400 hover:text-blue-500 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800" title="Добавить фото">
                                        <ImageIcon size={22} />
                                    </button>
                                    <button ref={smileButtonRef} type="button" onClick={togglePicker} className="p-2 text-slate-500 dark:text-slate-400 hover:text-yellow-500 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800" title="Добавить эмодзи">
                                        <Smile size={22} />
                                    </button>
                                </div>
                                <input type="file" ref={fileInputRef} hidden multiple accept="image/*" onChange={handleFileChange} />
                                
                                <button type="submit" disabled={loading} className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center">
                                    {loading && <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />}
                                    Сохранить
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default EditPostModal;