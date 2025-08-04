// frontend/src/components/modals/CreatePostModal.jsx

import React, { useState, useRef, useEffect, Suspense, Fragment, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Image as ImageIcon, Loader2, Lock, Unlock, Smile, Pencil, BookOpen, Music, XCircle, BarChart2 as PollIcon, Calendar as CalendarIcon, Text } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import ImageAttachmentModal from '../chat/ImageAttachmentModal'; // Re-use existing image editor
import { Listbox, Transition } from '@headlessui/react';
import { Check, ChevronDown } from 'lucide-react';
import AttachTrackModal from '../music/AttachTrackModal'; 
import DatePicker, { registerLocale } from 'react-datepicker';
import { ru } from 'date-fns/locale';
import { setHours, setMinutes, isToday } from 'date-fns';
import AttachedTrack from '../music/AttachedTrack';
import Avatar from '../Avatar';

registerLocale('ru', ru);
const Picker = React.lazy(() => import('emoji-picker-react'));

const API_URL = import.meta.env.VITE_API_URL;
const EMOJI_PICKER_HEIGHT = 450;

// --- НАЧАЛО ИСПРАВЛЕНИЯ ---
const getImageUrl = (url) => {
    if (!url || url.startsWith('http')) return url;
    return `${API_URL}/${url}`;
};
// --- КОНЕЦ ИСПРАВЛЕНИЯ ---

const ToggleSwitch = ({ checked, onChange, label }) => (
    <label className="flex items-center space-x-2 cursor-pointer text-sm">
        <div className="relative">
            <input type="checkbox" className="sr-only" checked={checked} onChange={e => onChange(e.target.checked)} />
            <div className={`block w-10 h-6 rounded-full transition ${checked ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
            <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${checked ? 'transform translate-x-full' : ''}`}></div>
        </div>
        <span>{label}</span>
    </label>
);

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

const CreatePostModal = ({ isOpen, onClose, communityId }) => {
    const [text, setText] = useState('');
    const [images, setImages] = useState([]);
    const [commentsDisabled, setCommentsDisabled] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isPickerVisible, setIsPickerVisible] = useState(false);
    const [pickerPosition, setPickerPosition] = useState('top');
    const [editingImage, setEditingImage] = useState(null);
    const pickerRef = useRef(null);
    const fileInputRef = useRef(null);
    const smileButtonRef = useRef(null);

    const [selectedCommunity, setSelectedCommunity] = useState(null);
    const [myCommunities, setMyCommunities] = useState([]);
    const [fetchingCommunities, setFetchingCommunities] = useState(false);

    const [attachedTrack, setAttachedTrack] = useState(null);
    const [isAttachTrackModalOpen, setIsAttachTrackModalOpen] = useState(false);

    const [showPollCreator, setShowPollCreator] = useState(false);
    const [pollData, setPollData] = useState({ question: '', options: ['', ''] });
    const [isAnonymousPoll, setIsAnonymousPoll] = useState(false);
    const [pollExpiresAt, setPollExpiresAt] = useState(null);

    const [scheduledFor, setScheduledFor] = useState(null);

    const getMinTime = (date) => {
        if (!date || !isToday(date)) {
            return setHours(setMinutes(new Date(), 0), 0);
        }
        return new Date();
    };

    // Используем ref, чтобы хранить последнюю версию массива картинок для очистки
    const imagesForCleanup = useRef(images);
    useEffect(() => {
        imagesForCleanup.current = images;
    }, [images]);

    const resetForm = useCallback(() => {
        setText('');
        // Очищаем URL'ы, используя данные из ref, чтобы избежать зависимости от state
        imagesForCleanup.current.forEach(img => URL.revokeObjectURL(img.preview));
        setImages([]);
        setCommentsDisabled(false);
        setLoading(false);
        setAttachedTrack(null);
        setShowPollCreator(false);
        setPollData({ question: '', options: ['', ''] });
        setIsAnonymousPoll(false);
        setPollExpiresAt(null);
        setScheduledFor(null);
    }, []); // Пустой массив зависимостей делает эту функцию стабильной

    const fetchMyCommunities = useCallback(async (preselectedCommunityId) => {
        setFetchingCommunities(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/api/communities/my`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const communitiesOptions = [{ _id: null, name: 'Моя страница (личный пост)', isOwner: true }, ...response.data];
            setMyCommunities(communitiesOptions);
            
            if (preselectedCommunityId) {
                const targetCommunity = communitiesOptions.find(c => c._id === preselectedCommunityId);
                if (targetCommunity) {
                    setSelectedCommunity(targetCommunity);
                } else {
                    toast.error("Не удалось выбрать сообщество. Возможно, вы не являетесь его участником.");
                    setSelectedCommunity(communitiesOptions[0]);
                }
            } else {
                setSelectedCommunity(communitiesOptions[0]);
            }
        } catch (error) {
            toast.error('Не удалось загрузить ваши сообщества.');
            console.error('Error fetching my communities:', error);
            const personalPageOption = { _id: null, name: 'Моя страница (личный пост)', isOwner: true };
            setMyCommunities([personalPageOption]);
            setSelectedCommunity(personalPageOption);
        } finally {
            setFetchingCommunities(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            resetForm(); 
            fetchMyCommunities(communityId);
        }
    }, [isOpen, communityId, fetchMyCommunities, resetForm]);

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        if (images.length + files.length > 5) {
            toast.error('Можно прикрепить не более 5 изображений.');
            return;
        }
        
        const newImages = files.map(file => ({
            file,
            preview: URL.createObjectURL(file)
        }));
        setImages(prev => [...prev, ...newImages]);
    };

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

    const removeImage = (indexToRemove) => {
        setImages(prev => {
            const newImages = prev.filter((_, index) => index !== indexToRemove);
            URL.revokeObjectURL(prev[indexToRemove].preview);
            return newImages;
        });
    };

    const handleEditImage = (index) => {
        setEditingImage({ index, file: images[index].file });
    };

    const handleEditComplete = async (editedBlob) => {
        const index = editingImage.index;
        const originalFile = images[index].file;
        const newFile = new File([editedBlob], originalFile.name, { type: editedBlob.type || 'image/jpeg' });

        setImages(prev => {
            const newImages = [...prev];
            URL.revokeObjectURL(newImages[index].preview);
            newImages[index] = { file: newFile, preview: URL.createObjectURL(newFile) };
            return newImages;
        });
        setEditingImage(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const isPollValid = showPollCreator && pollData.question.trim() && pollData.options.filter(opt => opt.trim()).length >= 2;
        if (!text.trim() && images.length === 0 && !attachedTrack && !isPollValid) {
            toast.error('Пост не может быть пустым.');
            return;
        }

        setLoading(true);
        const toastId = toast.loading(scheduledFor ? 'Планирование поста...' : 'Публикация поста...');

        const formData = new FormData();
        formData.append('text', text);
        formData.append('commentsDisabled', commentsDisabled);
        if (selectedCommunity && selectedCommunity._id) {
            formData.append('communityId', selectedCommunity._id);
        }
        if (attachedTrack) {
            formData.append('attachedTrackId', attachedTrack._id);
        }
        if (scheduledFor) {
            formData.append('scheduledFor', scheduledFor.toISOString());
        }

        images.forEach(img => {
            formData.append('images', img.file);
        });
        
        if (isPollValid) {
            const validPollData = {
                question: pollData.question,
                options: pollData.options.map(opt => ({ text: opt.trim() })).filter(opt => opt.text),
                isAnonymous: isAnonymousPoll,
                expiresAt: pollExpiresAt ? pollExpiresAt.toISOString() : null
            };
            formData.append('poll', JSON.stringify(validPollData));
        }

        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/api/posts`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${token}`
                }
            });
            toast.success(scheduledFor ? 'Пост успешно запланирован!' : 'Пост успешно опубликован!', { id: toastId });
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Ошибка.', { id: toastId });
        } finally {
            setLoading(false);
        }
    };
    
    const handlePollChange = (index, value) => {
        const newOptions = [...pollData.options];
        newOptions[index] = value;
        setPollData(prev => ({ ...prev, options: newOptions }));
    };

    const addPollOption = () => {
        if (pollData.options.length < 10) {
            setPollData(prev => ({ ...prev, options: [...prev.options, ''] }));
        }
    };

    const removePollOption = (index) => {
        if (pollData.options.length > 2) {
            setPollData(prev => ({ ...prev, options: pollData.options.filter((_, i) => i !== index) }));
        }
    };
    
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                <ImageAttachmentModal
                    isOpen={!!editingImage}
                    onClose={() => setEditingImage(null)}
                    file={editingImage?.file}
                    onSave={handleEditComplete}
                    showCaptionInput={false}
                />
                <AttachTrackModal 
                    isOpen={isAttachTrackModalOpen}
                    onClose={() => setIsAttachTrackModalOpen(false)}
                    onSelectTrack={setAttachedTrack}
                />
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
                            <h2 className="text-xl font-bold">Новый пост</h2>
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
                            
                            {images.length > 0 && (
                                <div className="grid grid-cols-3 md:grid-cols-5 gap-2 mt-4">
                                    {images.map((img, index) => (
                                        <div key={index} className="relative aspect-square">
                                            <img src={img.preview} alt="preview" className="w-full h-full object-cover rounded-md" />
                                            <button type="button" onClick={() => removeImage(index)} className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full hover:bg-red-600 transition-colors">
                                                <X size={14}/>
                                            </button>
                                            <button type="button" onClick={() => handleEditImage(index)} className="absolute bottom-1 left-1 p-1 bg-black/50 text-white rounded-full hover:bg-blue-600 transition-colors">
                                                <Pencil size={14}/>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {attachedTrack && (
                                <div className="mt-3 relative">
                                    <div className="p-2 bg-slate-100 dark:bg-slate-800/50 rounded-lg">
                                        <AttachedTrack track={attachedTrack} />
                                    </div>
                                    <button
                                        type="button" 
                                        onClick={() => setAttachedTrack(null)} 
                                        className="absolute top-2 right-2 p-1 bg-white/50 dark:bg-slate-900/50 rounded-full text-slate-500 hover:text-red-500"
                                    >
                                        <XCircle size={18}/>
                                    </button>
                                </div>
                            )}

                            <AnimatePresence>
                                {showPollCreator && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                        animate={{ opacity: 1, height: 'auto', marginTop: '1rem' }}
                                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                        transition={{ duration: 0.3 }}
                                        className="space-y-3"
                                    >
                                        <input
                                            type="text"
                                            placeholder="Вопрос опроса"
                                            value={pollData.question}
                                            onChange={(e) => setPollData(p => ({ ...p, question: e.target.value }))}
                                            className="w-full p-2 bg-slate-100 dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                                        />
                                        <div className="space-y-2">
                                            {pollData.options.map((option, index) => (
                                                <div key={index} className="flex items-center space-x-2">
                                                    <input
                                                        type="text"
                                                        placeholder={`Вариант ${index + 1}`}
                                                        value={option}
                                                        onChange={(e) => handlePollChange(index, e.target.value)}
                                                        className="flex-grow p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                    />
                                                    {pollData.options.length > 2 && <button type="button" onClick={() => removePollOption(index)} className="p-2 text-slate-400 hover:text-red-500"><XCircle size={18}/></button>}
                                                </div>
                                            ))}
                                        </div>
                                        <button type="button" onClick={addPollOption} className="text-sm font-semibold text-blue-500 hover:underline">+ Добавить вариант</button>

                                        <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-200 dark:border-slate-700/50">
                                            <ToggleSwitch checked={isAnonymousPoll} onChange={setIsAnonymousPoll} label="Анонимный опрос" />
                                            <div className="flex items-center space-x-2">
                                                <label className="text-sm">Завершить:</label>
                                                <DatePicker
                                                    selected={pollExpiresAt}
                                                    onChange={(date) => setPollExpiresAt(date)}
                                                    showTimeSelect
                                                    timeFormat="HH:mm"
                                                    timeIntervals={15}
                                                    dateFormat="d MMMM, yyyy HH:mm"
                                                    locale={ru}
                                                    isClearable
                                                    placeholderText="Никогда"
                                                    className="w-48 text-sm p-1.5 bg-slate-200 dark:bg-slate-700 rounded-md"
                                                    portalId="modal-root"
                                                />
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            
                            <div className="flex items-center justify-between mt-4">
                                <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                                    <button type="button" onClick={() => fileInputRef.current.click()} className="p-2 text-slate-500 dark:text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Добавить фото">
                                        <ImageIcon size={22} />
                                    </button>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        hidden
                                        multiple
                                        accept="image/*"
                                        onChange={handleFileChange}
                                    />
                                    <button type="button" onClick={() => setCommentsDisabled(!commentsDisabled)} className={`p-2 text-slate-500 dark:text-slate-400 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${commentsDisabled ? 'text-red-500' : 'text-green-500'}`} title={commentsDisabled ? 'Включить комментарии' : 'Отключить комментарии'}>
                                        {commentsDisabled ? <Lock size={22} /> : <Unlock size={22} />}
                                    </button>
                                    <button ref={smileButtonRef} type="button" onClick={togglePicker} className="p-2 text-slate-500 dark:text-slate-400 hover:text-yellow-500 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800" title="Добавить эмодзи">
                                        <Smile size={22} />
                                    </button>
                                    <button type="button" onClick={() => setIsAttachTrackModalOpen(true)} className="p-2 text-slate-500 dark:text-slate-400 hover:text-purple-500 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800" title="Прикрепить трек">
                                        <Music size={22} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowPollCreator(p => !p)}
                                        className={`p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${showPollCreator ? 'text-blue-500 bg-blue-100 dark:bg-blue-500/20' : 'text-slate-500 dark:text-slate-400'}`}
                                        title="Создать опрос"
                                    >
                                        <PollIcon size={22} />
                                    </button>
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
                                        portalId="modal-root"
                                        customInput={
                                            <button type="button" className="p-2 text-slate-500 dark:text-slate-400 hover:text-green-500 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800" title="Запланировать">
                                                <CalendarIcon size={22} className={scheduledFor ? 'text-green-500' : ''}/>
                                            </button>
                                        }
                                    />
                                    <Listbox value={selectedCommunity} onChange={setSelectedCommunity} disabled={fetchingCommunities}>
                                        <div className="relative z-10 w-56">
                                            <Listbox.Button className="relative w-full cursor-default rounded-lg bg-slate-100 dark:bg-slate-800 py-2 pl-3 pr-10 text-left shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:text-sm">
                                                <span className="block truncate">
                                                    {fetchingCommunities ? 'Загрузка...' : (selectedCommunity ? selectedCommunity.name : 'Моя страница')}
                                                </span>
                                                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                                                    <ChevronDown className="h-5 w-5 text-gray-400" aria-hidden="true" />
                                                </span>
                                            </Listbox.Button>
                                            <Transition
                                                as={Fragment}
                                                leave="transition ease-in duration-100"
                                                leaveFrom="opacity-100"
                                                leaveTo="opacity-0"
                                            >
                                                <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-slate-700 py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none">
                                                    {myCommunities.map((communityOption) => (
                                                        <Listbox.Option
                                                            key={communityOption._id || 'personal'}
                                                            className={({ active }) =>
                                                                `relative cursor-default select-none py-2 pl-10 pr-4 ${
                                                                    active ? 'bg-blue-100 dark:bg-blue-600' : ''
                                                                }`
                                                            }
                                                            value={communityOption}
                                                        >
                                                            {({ selected }) => (
                                                                <>
                                                                    <span
                                                                        className={`block truncate ${
                                                                            selected ? 'font-medium' : 'font-normal'
                                                                        }`}
                                                                    >
                                                                        {communityOption.name}
                                                                    </span>
                                                                    {selected ? (
                                                                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600 dark:text-white">
                                                                            <Check className="h-5 w-5" aria-hidden="true" />
                                                                        </span>
                                                                    ) : null}
                                                                </>
                                                            )}
                                                        </Listbox.Option>
                                                    ))}
                                                </Listbox.Options>
                                            </Transition>
                                        </div>
                                    </Listbox>
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                                >
                                    {loading && <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />}
                                    {loading ? (scheduledFor ? 'Планирование...' : 'Публикация...') : (scheduledFor ? 'Запланировать' : 'Опубликовать')}
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

export default CreatePostModal;