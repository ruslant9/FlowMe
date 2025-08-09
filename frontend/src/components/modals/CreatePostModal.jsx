// frontend/src/components/modals/CreatePostModal.jsx

import React, { useState, useRef, useEffect, Suspense, Fragment, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Image as ImageIcon, Loader2, Smile, Music, XCircle, BarChart2 as PollIcon, Calendar as CalendarIcon, Text, Check, ChevronDown } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import ImageAttachmentModal from '../chat/ImageAttachmentModal';
import { Listbox, Transition } from '@headlessui/react';
import AttachTrackModal from '../music/AttachTrackModal'; 
import DatePicker, { registerLocale } from 'react-datepicker';
import { ru } from 'date-fns/locale';
import { setHours, setMinutes, isToday } from 'date-fns';
import AttachedTrack from '../music/AttachedTrack';
import Avatar from '../Avatar';
import { useUser } from '../../hooks/useUser';
import { useCachedImage } from '../../hooks/useCachedImage';
import { useEmojiPicker } from '../../hooks/useEmojiPicker';
import useMediaQuery from '../../hooks/useMediaQuery';

registerLocale('ru', ru);

const API_URL = import.meta.env.VITE_API_URL;
const EMOJI_PICKER_HEIGHT_MOBILE = 350;

const CachedImage = ({ src }) => {
    const { finalSrc, loading } = useCachedImage(src);
    if (loading) return <div className="w-full h-full object-cover rounded-md bg-slate-200 dark:bg-slate-700 animate-pulse"></div>;
    return <img src={finalSrc} alt="preview" className="w-full h-full object-cover rounded-md" />;
};

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

const CreatePostModal = ({ isOpen, onClose, communityId }) => {
    const { currentUser, loadingUser } = useUser();
    const [text, setText] = useState('');
    const [images, setImages] = useState([]);
    const [commentsDisabled, setCommentsDisabled] = useState(false);
    const [loading, setLoading] = useState(false);
    const [editingImage, setEditingImage] = useState(null);
    const fileInputRef = useRef(null);
    const smileButtonRef = useRef(null);
    const textareaRef = useRef(null);
    const { showPicker, hidePicker, isOpen: isPickerVisible } = useEmojiPicker();
    const isMobile = useMediaQuery('(max-width: 767px)');
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

    const handleEmojiButtonClick = (e) => {
        e.preventDefault();
        
        if (isPickerVisible) {
            hidePicker();
        } else {
            showPicker(smileButtonRef, (emojiObject) => {
                const { selectionStart, selectionEnd } = textareaRef.current;
                setText(prevText => {
                    const newText =
                        prevText.slice(0, selectionStart) +
                        emojiObject.emoji +
                        prevText.slice(selectionEnd);
                    return newText;
                });
                setTimeout(() => {
                    const newPosition = selectionStart + emojiObject.emoji.length;
                    textareaRef.current.focus();
                    textareaRef.current.setSelectionRange(newPosition, newPosition);
                }, 0);
            });
        }
    };
    
    const getMinTime = (date) => {
        if (!date || !isToday(date)) return setHours(setMinutes(new Date(), 0), 0);
        return new Date();
    };
    const imagesForCleanup = useRef(images);
    useEffect(() => { imagesForCleanup.current = images; }, [images]);
    const resetForm = useCallback(() => {
        setText('');
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
    }, []);
    const fetchMyCommunities = useCallback(async (preselectedCommunityId) => {
        if (!currentUser) return;
        setFetchingCommunities(true);
        try {
            const token = localStorage.getItem('token');
            const personalProfile = { 
                _id: null, 
                name: currentUser.fullName || currentUser.username, 
                username: currentUser.username,
                avatar: currentUser.avatar, 
                type: 'user',
                premium: currentUser.premium,
                premiumCustomization: currentUser.premiumCustomization,
            };
            const res = await axios.get(`${API_URL}/api/communities/my`, { headers: { Authorization: `Bearer ${token}` } });
            const communitiesOptions = [personalProfile, ...res.data.map(c => ({ ...c, type: 'community' }))];
            setMyCommunities(communitiesOptions);
            
            const targetCommunity = preselectedCommunityId ? communitiesOptions.find(c => c._id === preselectedCommunityId) : personalProfile;
            setSelectedCommunity(targetCommunity || personalProfile);
        } catch (error) {
            toast.error('Не удалось загрузить ваши сообщества.');
            const personalProfile = { 
                _id: null, 
                name: currentUser.fullName || currentUser.username, 
                username: currentUser.username,
                avatar: currentUser.avatar, 
                type: 'user',
                premium: currentUser.premium,
                premiumCustomization: currentUser.premiumCustomization,
            };
            setMyCommunities([personalProfile]);
            setSelectedCommunity(personalProfile);
        } finally {
            setFetchingCommunities(false);
        }
    }, [currentUser]);
    useEffect(() => { if (isOpen) { resetForm(); fetchMyCommunities(communityId); } }, [isOpen, communityId, fetchMyCommunities, resetForm]);
    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        if (images.length + files.length > 5) {
            toast.error('Можно прикрепить не более 5 изображений.');
            return;
        }
        setImages(prev => [...prev, ...files.map(file => ({ file, preview: URL.createObjectURL(file) }))]);
    };
    const removeImage = (indexToRemove) => {
        setImages(prev => {
            URL.revokeObjectURL(prev[indexToRemove].preview);
            return prev.filter((_, index) => index !== indexToRemove);
        });
    };
    const handleEditImage = (index) => setEditingImage({ index, file: images[index].file });
    const handleEditComplete = async (editedBlob) => {
        const index = editingImage.index;
        const newFile = new File([editedBlob], images[index].file.name, { type: editedBlob.type || 'image/jpeg' });
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
        if (!text.trim() && images.length === 0 && !attachedTrack && !isPollValid) return toast.error('Пост не может быть пустым.');
        setLoading(true);
        const toastId = toast.loading(scheduledFor ? 'Планирование поста...' : 'Публикация поста...');
        const formData = new FormData();
        formData.append('text', text);
        formData.append('commentsDisabled', commentsDisabled);
        if (selectedCommunity && selectedCommunity._id) formData.append('communityId', selectedCommunity._id);
        if (attachedTrack) formData.append('attachedTrackId', attachedTrack._id);
        if (scheduledFor) formData.append('scheduledFor', scheduledFor.toISOString());
        images.forEach(img => formData.append('images', img.file));
        if (isPollValid) formData.append('poll', JSON.stringify({
            question: pollData.question, options: pollData.options.map(opt => ({ text: opt.trim() })).filter(opt => opt.text),
            isAnonymous: isAnonymousPoll, expiresAt: pollExpiresAt ? pollExpiresAt.toISOString() : null
        }));
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/api/posts`, formData, { headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` } });
            toast.success(scheduledFor ? 'Пост успешно запланирован!' : 'Пост успешно опубликован!', { id: toastId });
            window.dispatchEvent(new CustomEvent('postUpdated', { detail: {} }));
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Ошибка.', { id: toastId });
        } finally {
            setLoading(false);
        }
    };
    const handlePollChange = (index, value) => setPollData(prev => ({ ...prev, options: [...prev.options.slice(0, index), value, ...prev.options.slice(index + 1)] }));
    const addPollOption = () => { if (pollData.options.length < 10) setPollData(prev => ({ ...prev, options: [...prev.options, ''] })); };
    const removePollOption = (index) => { if (pollData.options.length > 2) setPollData(prev => ({ ...prev, options: prev.options.filter((_, i) => i !== index) })); };
    const handleTextareaChange = (e) => {
        setText(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = `${e.target.scrollHeight}px`;
    };

    return ReactDOM.createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    <ImageAttachmentModal isOpen={!!editingImage} onClose={() => setEditingImage(null)} file={editingImage?.file} onSave={handleEditComplete} showCaptionInput={false} />
                    <AttachTrackModal isOpen={isAttachTrackModalOpen} onClose={() => setIsAttachTrackModalOpen(false)} onSelectTrack={setAttachedTrack} />
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center z-50 p-4 pt-20"
                    >
                        <motion.div
                            initial={{ y: "100%", opacity: 0 }}
                            animate={{ y: isMobile && isPickerVisible ? -EMOJI_PICKER_HEIGHT_MOBILE : 0, opacity: 1 }}
                            exit={{ y: "100%", opacity: 0 }}
                            transition={{ type: "spring", stiffness: 400, damping: 40 }}
                            onClick={(e) => e.stopPropagation()}
                            className="ios-glass-final w-full max-w-2xl bg-slate-100 dark:bg-slate-800 rounded-3xl flex flex-col text-slate-900 dark:text-white max-h-full"
                        >
                            <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
                                <div className="p-6 pb-4 flex-shrink-0">
                                    <div className="flex justify-between items-center mb-6">
                                        <h2 className="text-xl font-bold">Новый пост</h2>
                                    </div>
                                    {loadingUser ? (
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse"></div>
                                            <div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-700 animate-pulse"></div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center space-x-3">
                                            <Avatar username={currentUser?.username} fullName={currentUser?.fullName} avatarUrl={currentUser?.avatar} size="md"/>
                                            <div>
                                                <Listbox value={selectedCommunity} onChange={setSelectedCommunity} disabled={fetchingCommunities}>
                                                    <div className="relative">
                                                        <Listbox.Button 
                                                            className="flex items-center space-x-1 text-xs text-slate-500 dark:text-white/60 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                                                        >
                                                            <span>Публикация в: <span className="font-semibold">{selectedCommunity?.name || '...'}</span></span>
                                                            <ChevronDown size={14} />
                                                        </Listbox.Button>
                                                        <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                                                            <Listbox.Options className="absolute mt-2 max-h-60 w-64 overflow-auto rounded-xl ios-glass-popover p-2 z-10">
                                                                {myCommunities.map((communityOption) => (
                                                                    <Listbox.Option key={communityOption._id || 'personal'} className={({ active }) => `relative cursor-pointer select-none py-2 px-3 rounded-lg ${active ? 'bg-blue-100 dark:bg-blue-600' : ''}`} value={communityOption}>
                                                                        {({ selected }) => (
                                                                            <div className="flex items-center space-x-3">
                                                                                <Avatar 
                                                                                    username={communityOption.type === 'user' ? communityOption.username : communityOption.name} 
                                                                                    fullName={communityOption.name}
                                                                                    avatarUrl={communityOption.avatar}
                                                                                    size="md"
                                                                                    isPremium={communityOption.premium?.isActive}
                                                                                    customBorder={communityOption.premiumCustomization?.avatarBorder}
                                                                                />
                                                                                <div className="flex-1 min-w-0">
                                                                                    <div className="flex items-center">
                                                                                        <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>{communityOption.name}</span>
                                                                                        {communityOption.type === 'user' && communityOption.premium?.isActive && (
                                                                                            <span className="ml-1.5 premium-shimmer-text text-[10px] font-bold">Premium</span>
                                                                                        )}
                                                                                    </div>
                                                                                    <span className="text-xs text-slate-500 dark:text-slate-400">{communityOption.type === 'user' ? 'Личный профиль' : 'Сообщество'}</span>
                                                                                </div>
                                                                                {selected ? (<span className="text-blue-600 dark:text-white"><Check className="h-5 w-5" /></span>) : null}
                                                                            </div>
                                                                        )}
                                                                    </Listbox.Option>
                                                                ))}
                                                            </Listbox.Options>
                                                        </Transition>
                                                    </div>
                                                </Listbox>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 overflow-y-auto px-6 space-y-4 min-h-0">
                                    <textarea ref={textareaRef} value={text} onChange={handleTextareaChange} placeholder="Что у вас нового?" className="w-full text-xl bg-transparent resize-none placeholder-slate-500 dark:placeholder-white/50 min-h-[80px] border-b border-slate-200 dark:border-slate-700/50 pb-2 focus:outline-none focus:ring-0 focus:border-blue-500" />
                                    {images.length > 0 && <div className="grid grid-cols-3 md:grid-cols-5 gap-2">{images.map((img, index) => <div key={index} className="relative aspect-square"><CachedImage src={img.preview} /><button type="button" onClick={() => removeImage(index)} className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full"><X size={14}/></button></div>)}</div>}
                                    {attachedTrack && <div className="relative"><div className="p-2 bg-slate-100 dark:bg-slate-800/50 rounded-lg"><AttachedTrack track={attachedTrack} /></div><button type="button" onClick={() => setAttachedTrack(null)} className="absolute top-2 right-2 p-1"><XCircle size={18}/></button></div>}
                                    <AnimatePresence>{showPollCreator && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }} className="space-y-3"><input type="text" placeholder="Вопрос опроса" value={pollData.question} onChange={(e) => setPollData(p => ({ ...p, question: e.target.value }))} className="w-full p-2 bg-slate-100 dark:bg-slate-800 rounded-lg" /><div className="space-y-2">{pollData.options.map((option, index) => <div key={index} className="flex items-center space-x-2"><input type="text" placeholder={`Вариант ${index + 1}`} value={option} onChange={(e) => handlePollChange(index, e.target.value)} className="flex-grow p-2 bg-slate-100 dark:bg-slate-800 rounded-lg" />{pollData.options.length > 2 && <button type="button" onClick={() => removePollOption(index)}><XCircle size={18}/></button>}</div>)}</div><button type="button" onClick={addPollOption} className="text-sm">+ Добавить вариант</button><div className="flex flex-wrap gap-4 pt-2 border-t"><ToggleSwitch checked={isAnonymousPoll} onChange={setIsAnonymousPoll} label="Анонимный опрос" /><div className="flex items-center space-x-2"><label>Завершить:</label><DatePicker selected={pollExpiresAt} onChange={setPollExpiresAt} showTimeSelect dateFormat="d MMM, yyyy HH:mm" locale={ru} isClearable placeholderText="Никогда" className="w-48 text-sm p-1.5 bg-slate-200 dark:bg-slate-700 rounded-md" portalId="modal-root" withPortal /></div></div></motion.div>}</AnimatePresence>
                                </div>
                                
                                <div className="p-6 pt-4 border-t border-slate-200 dark:border-white/10 flex-shrink-0">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-1 flex-wrap gap-y-2">
                                            {[
                                                { icon: ImageIcon, title: "Фото/Видео", onClick: () => fileInputRef.current.click() },
                                                { icon: Music, title: "Трек", onClick: () => setIsAttachTrackModalOpen(true) },
                                                { icon: PollIcon, title: "Опрос", onClick: () => setShowPollCreator(p => !p), active: showPollCreator },
                                                { icon: CalendarIcon, title: "Запланировать", isDatePicker: true },
                                                !isMobile && { icon: Smile, title: "Эмодзи", ref: smileButtonRef, onMouseDown: handleEmojiButtonClick },
                                            ].filter(Boolean).map((item, idx) => ( 
                                                 item.isDatePicker ?
                                                    // --- НАЧАЛО ИСПРАВЛЕНИЯ ---
                                                    <DatePicker 
                                                        key={idx} 
                                                        selected={scheduledFor} 
                                                        onChange={setScheduledFor} 
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
                                                        withPortal={isMobile} // <-- КЛЮЧЕВОЕ ИЗМЕНЕНИЕ
                                                        customInput={<button type="button" className={`p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 ${scheduledFor ? 'text-green-500 bg-green-100 dark:bg-green-500/20' : 'text-slate-500 dark:text-slate-400'}`}><item.icon size={18} /></button>} 
                                                    />
                                                    // --- КОНЕЦ ИСПРАВЛЕНИЯ ---
                                                    :
                                                    <button key={idx} type="button" ref={item.ref} onMouseDown={item.onMouseDown} onClick={item.onClick} className={`p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${item.active ? 'text-blue-500 bg-blue-100 dark:bg-blue-500/20' : 'text-slate-500 dark:text-slate-400'}`}><item.icon size={18} /></button>
                                            ))}
                                            <input type="file" ref={fileInputRef} hidden multiple accept="image/*" onChange={handleFileChange} />
                                        </div>
                                        <button type="submit" disabled={loading} className="px-5 py-2 text-sm md:px-6 md:py-2.5 md:text-base bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center">{loading && <Loader2 className="animate-spin mr-2"/>}{scheduledFor ? 'Запланировать' : 'Опубликовать'}</button>
                                    </div>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.getElementById('modal-root')
    );
};

export default CreatePostModal;