// frontend/src/components/modals/PremiumCustomizationModal.jsx

import React, { useState, Fragment, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Check, Loader2, Sparkles, RotateCcw, CheckCircle, ArrowLeft, Plus, Edit as EditIcon, Trash2 as TrashIcon } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useUser } from '../../hooks/useUser';

import { useModal } from '../../hooks/useModal';
import EmojiPreviewModal from './EmojiPreviewModal';
import Avatar from '../Avatar';
import { emojiPacks, allEmojiUrls, allPremiumReactionUrls } from '../../data/emojiData';
import AnimatedAccent from '../AnimatedAccent';

const API_URL = import.meta.env.VITE_API_URL;

const avatarBorders = [
    { id: 'none', name: 'Без рамки', type: 'none', value: null },
    { id: 'animated-1', name: 'Аврора', type: 'animated-1', value: null },
    { id: 'animated-2', name: 'Инста', type: 'animated-2', value: null },
    { id: 'pulse', name: 'Пульс', type: 'animated-pulse' },
];

const premadeAccents = [
    { name: "Неоновый дудл", url: "/wallpapers/templates/wallpaper-doodle-dark.svg" },
    { name: "Закатный дудл", url: "/wallpapers/templates/wallpaper-doodle-sunset.svg" },
    { name: "Лесной дудл", url: "/wallpapers/templates/wallpaper-doodle-forest.svg" },
    { name: "Синтвейв дудл", url: "/wallpapers/templates/wallpaper-doodle-synthwave.svg" },
    { name: "Золотой дудл", url: "/wallpapers/templates/wallpaper-doodle-gold.svg" },
    { name: "Восходящие сердца", url: "/wallpapers/templates/love_wallpaper.svg" },
];

const pastelColors = [
    { name: "Нежный персик", value: "#FFDAB9" },
    { name: "Мятный крем", value: "#bdfcc9" },
    { name: "Голубая лагуна", value: "#A7C7E7" },
    { name: "Лавандовый сон", value: "#E6E6FA" },
    { name: "Розовый зефир", value: "#F8C8DC" },
    { name: "Лимонный сорбет", value: "#FFFACD" },
    { name: "Весенний сиреневый", value: "#C8A2C8" },
    { name: "Пудровый синий", value: "#B0E0E6" },
    { name: "Кремовый желтый", value: "#F3E5AB" },
    { name: "Фисташковый", value: "#93C572" },
    { name: "Перламутровый", value: "#EAE0C8" },
    { name: "Коралловый риф", value: "#FDBCB4" },
];

const preloadImages = (urls) => {
    urls.forEach(url => {
        if (url) {
            const img = new Image();
            img.src = url;
        }
    });
};

const AvatarBorderPreview = ({ border, isSelected, onClick, user }) => {
    return (
        <div 
            onClick={onClick}
            className={`flex flex-col items-center space-y-2 p-2 rounded-lg cursor-pointer transition-all ${isSelected ? 'ring-2 ring-blue-500' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
        >
            <Avatar
                username={user.username}
                avatarUrl={user.avatar ? getImageUrl(user.avatar) : ''}
                customBorder={border}
                size="md"
            />
            <span className="text-xs text-center">{border.name}</span>
        </div>
    );
};

const getImageUrl = (url) => {
    if (!url || url.startsWith('http') || url.startsWith('blob:')) return url || '';
    return `${API_URL}/${url}`;
};

const PremiumCustomizationModal = ({ isOpen, onClose, user }) => {
    const { refetchUser } = useUser();
    const { showConfirmation } = useModal();
    const [draftData, setDraftData] = useState({});
    const [loading, setLoading] = useState(false);
    const [activePack, setActivePack] = useState(emojiPacks[0].name);
    const [previewingEmoji, setPreviewingEmoji] = useState(null);
    const longPressTimerRef = useRef(null);
    const longPressTriggeredRef = useRef(false);
    const hasPreloaded = useRef(false);

    const [view, setView] = useState('main');
    const [editingAccent, setEditingAccent] = useState(null);
    const [accentName, setAccentName] = useState('');
    const [selectedBg, setSelectedBg] = useState(premadeAccents[0].url);
    const [selectedEmojis, setSelectedEmojis] = useState([]);

    useEffect(() => {
        if (isOpen && !hasPreloaded.current) {
            preloadImages(allEmojiUrls);
            preloadImages(allPremiumReactionUrls);
            preloadImages(premadeAccents.map(a => a.url));
            hasPreloaded.current = true;
        }
    }, [isOpen]);
    
    useEffect(() => {
        if (isOpen) {
            setDraftData(user.premiumCustomization || {});
            setView('main');
        }
    }, [isOpen, user]);

    const handleDraftChange = (field, value) => {
        setDraftData(prev => ({ ...prev, [field]: value }));
    };

    const handleCreateNewAccent = () => {
        if (draftData.customCardAccents.length >= 5) {
            toast.error('Можно создать не более 5 кастомных акцентов.');
            return;
        }
        setEditingAccent(null);
        setAccentName('');
        setSelectedBg(premadeAccents[0].url);
        setSelectedEmojis([]);
        setView('editor');
    };

    const handleEditAccent = (accent) => {
        setEditingAccent(accent);
        setAccentName(accent.name);
        setSelectedBg(accent.backgroundUrl);
        setSelectedEmojis(accent.emojis);
        setView('editor');
    };
    
    const handleToggleEmoji = (emojiUrl) => {
        setSelectedEmojis(prev => {
            if (prev.includes(emojiUrl)) {
                return prev.filter(e => e !== emojiUrl);
            }
            if (prev.length < 3) {
                return [...prev, emojiUrl];
            }
            toast.error('Можно выбрать не более 3 эмодзи.');
            return prev;
        });
    };
    
    const handleSaveAccent = async () => {
        if (!accentName.trim()) return toast.error('Название акцента не может быть пустым.');
        if (selectedEmojis.length === 0) return toast.error('Выберите хотя бы один эмодзи.');

        setLoading(true);
        const toastId = toast.loading(editingAccent ? 'Обновление...' : 'Создание...');
        const payload = {
            name: accentName,
            backgroundUrl: selectedBg,
            emojis: selectedEmojis
        };

        try {
            const token = localStorage.getItem('token');
            const endpoint = editingAccent 
                ? `${API_URL}/api/user/premium-accents/${editingAccent._id}` 
                : `${API_URL}/api/user/premium-accents`;
            const method = editingAccent ? 'put' : 'post';
            
            await axios[method](endpoint, payload, { headers: { Authorization: `Bearer ${token}` } });
            
            toast.success('Акцент сохранен!', { id: toastId });
            refetchUser();
            setView('main');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Ошибка', { id: toastId });
        } finally {
            setLoading(false);
        }
    };
    
    const handleDeleteAccent = (accentId) => {
        showConfirmation({
            title: 'Удалить акцент?',
            message: 'Это действие необратимо.',
            onConfirm: async () => {
                const toastId = toast.loading('Удаление...');
                try {
                    const token = localStorage.getItem('token');
                    await axios.delete(`${API_URL}/api/user/premium-accents/${accentId}`, { headers: { Authorization: `Bearer ${token}` } });
                    toast.success('Акцент удален', { id: toastId });
                    refetchUser();
                } catch (error) {
                    toast.error('Ошибка', { id: toastId });
                }
            }
        });
    };

    const handleSaveAll = async () => {
        setLoading(true);
        const toastId = toast.loading('Сохранение...');
        try {
            const token = localStorage.getItem('token');
            const payload = {
                avatarBorder: draftData.avatarBorder,
                usernameEmoji: draftData.usernameEmoji,
            };
            await axios.put(`${API_URL}/api/user/profile`, { premiumCustomization: payload }, { headers: { Authorization: `Bearer ${token}` } });
            
            const accentId = (typeof draftData.activeCardAccent === 'object' && draftData.activeCardAccent !== null) ? draftData.activeCardAccent._id : draftData.activeCardAccent;
            await axios.put(`${API_URL}/api/user/premium-accents/set-active`, { accent: accentId }, { headers: { Authorization: `Bearer ${token}` } });

            toast.success('Настройки сохранены!', { id: toastId });
            refetchUser();
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Ошибка сохранения.', { id: toastId });
            refetchUser();
        } finally {
            setLoading(false);
        }
    };

    const handleResetAll = () => {
        showConfirmation({
            title: 'Сбросить все настройки?',
            message: 'Все ваши настройки кастомизации будут возвращены к стандартным значениям. Кастомные акценты не будут удалены.',
            onConfirm: () => {
                setDraftData(prev => ({
                    ...prev,
                    avatarBorder: { id: 'none', type: 'none', value: null },
                    usernameEmoji: { id: 'none', url: null },
                    activeCardAccent: null,
                }));
                toast.success('Настройки сброшены.');
            }
        });
    };

    const handleMouseDown = (emoji) => {
        longPressTriggeredRef.current = false;
        longPressTimerRef.current = setTimeout(() => {
            if (emoji.url) {
                setPreviewingEmoji(emoji.url);
                longPressTriggeredRef.current = true;
            }
        }, 400);
    };

    const handleMouseUp = (emoji) => {
        clearTimeout(longPressTimerRef.current);
        if (!longPressTriggeredRef.current) {
            handleDraftChange('usernameEmoji', emoji);
        }
    };
    
    const handleMouseLeave = () => {
        clearTimeout(longPressTimerRef.current);
    };
    
    const activeEmojis = emojiPacks.find(p => p.name === activePack)?.emojis || [];

    const getActiveAccentId = () => {
        const active = draftData.activeCardAccent;
        if (!active) return null;
        return typeof active === 'object' ? active._id : active;
    };

    return ReactDOM.createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    <EmojiPreviewModal isOpen={!!previewingEmoji} onClose={() => setPreviewingEmoji(null)} emojiUrl={previewingEmoji} />
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} 
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start md:items-center justify-center z-[100] p-4 pt-10 md:pt-4"
                    >
                        <motion.div 
                            initial={{ scale: 0.95, y: 20 }} 
                            animate={{ scale: 1, y: 0 }} 
                            exit={{ scale: 0.95, y: -20 }} 
                            onClick={(e) => e.stopPropagation()} 
                            className="ios-glass-final w-full max-w-2xl p-4 md:p-6 rounded-3xl flex flex-col text-slate-900 dark:text-white max-h-full"
                        >
                            <div className="flex justify-between items-center mb-4 flex-shrink-0">
                                <div className="flex items-center space-x-2">
                                    {view === 'editor' && <button onClick={() => setView('main')} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"><ArrowLeft /></button>}
                                    <Sparkles size={24} className="premium-icon-glow text-yellow-400" />
                                    <h2 className="text-xl font-bold premium-shimmer-text">{view === 'main' ? 'Кастомизация Premium' : (editingAccent ? 'Редактор акцента' : 'Новый акцент')}</h2>
                                </div>
                                <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10"><X /></button>
                            </div>
                            
                            <AnimatePresence mode="wait">
                            <motion.div
                                key={view}
                                initial={{ opacity: 0, x: view === 'editor' ? 30 : -30 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: view === 'editor' ? -30 : 30 }}
                                transition={{ duration: 0.2 }}
                                className="flex-1 flex flex-col min-h-0"
                            >
                            {view === 'main' ? (
                                <div className="flex-1 overflow-y-auto pr-2 -mr-4 space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="flex flex-col">
                                            <label className="text-sm font-medium text-slate-600 dark:text-white/70 mb-2 block">Рамка аватара</label>
                                            <div className="grid grid-cols-3 gap-2 p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                                {avatarBorders.map((border) => (
                                                    <AvatarBorderPreview
                                                        key={border.id}
                                                        border={border}
                                                        isSelected={draftData.avatarBorder?.id === border.id}
                                                        onClick={() => handleDraftChange('avatarBorder', border)}
                                                        user={user}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex flex-col">
                                            <label className="text-sm font-medium text-slate-600 dark:text-white/70 mb-2 block">Эмодзи у ника</label>
                                            <div className="flex-1 flex flex-col min-h-0">
                                                <div className="flex items-center space-x-1 p-1 mb-2 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-x-auto no-scrollbar">
                                                    {emojiPacks.map(pack => (
                                                        <button key={pack.name} onClick={() => setActivePack(pack.name)} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex-shrink-0 ${activePack === pack.name ? 'bg-blue-600 text-white' : 'hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                                                            {pack.name}
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="flex-1 overflow-y-auto grid grid-cols-[repeat(auto-fill,minmax(4rem,1fr))] gap-2 p-2 bg-slate-100 dark:bg-slate-800 rounded-lg min-h-[120px]">
                                                    {activeEmojis.map((emoji) => {
                                                        const isSelected = draftData.usernameEmoji?.id === emoji.id;
                                                        return (
                                                            <button
                                                                key={emoji.id}
                                                                type="button"
                                                                onMouseDown={() => handleMouseDown(emoji)}
                                                                onMouseUp={() => handleMouseUp(emoji)}
                                                                onMouseLeave={handleMouseLeave}
                                                                onTouchStart={() => handleMouseDown(emoji)}
                                                                onTouchEnd={() => handleMouseUp(emoji)}
                                                                className={`flex flex-col items-center justify-center p-1 rounded-lg aspect-square transition-colors hover:bg-slate-200 dark:hover:bg-slate-700`}
                                                                title={emoji.name}
                                                            >
                                                                <div className={`p-1 rounded-md ${isSelected ? 'bg-blue-600' : ''}`}>
                                                                    {emoji.url ? (
                                                                        <img src={emoji.url} alt={emoji.name} className="w-6 h-6 object-contain" />
                                                                    ) : (
                                                                        <div className="w-6 h-6 flex items-center justify-center">
                                                                            <span className={`text-xs ${isSelected ? 'text-white' : ''}`}>Нет</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                                <p className="text-xs text-center text-slate-400 dark:text-slate-500 mt-2">
                                                    Удерживайте для предпросмотра
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="text-sm font-medium text-slate-600 dark:text-white/70 block">Акцент карточек</label>
                                            {draftData.activeCardAccent && (
                                                <button
                                                    onClick={() => handleDraftChange('activeCardAccent', null)}
                                                    className="text-xs font-semibold text-slate-500 hover:text-red-500 transition-colors flex items-center space-x-1"
                                                >
                                                    <RotateCcw size={14} />
                                                    <span>Сбросить текущий</span>
                                                </button>
                                            )}
                                        </div>
                                        <div className="space-y-3">
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                <button onClick={handleCreateNewAccent} className="relative rounded-lg border-2 border-dashed border-slate-400 dark:border-slate-600 h-20 transition-all hover:border-blue-500 hover:text-blue-500 flex flex-col items-center justify-center">
                                                    <Plus size={24} />
                                                    <span className="text-xs font-semibold">Создать свой</span>
                                                </button>
                                                {draftData.customCardAccents?.map(accent => {
                                                    const isSelected = getActiveAccentId() === accent._id;
                                                    return (
                                                        <div key={accent._id} className="relative group">
                                                            <button onClick={() => handleDraftChange('activeCardAccent', accent)} className="w-full h-20 rounded-lg overflow-hidden relative">
                                                                <AnimatedAccent backgroundUrl={accent.backgroundUrl} emojis={accent.emojis} />
                                                                <div className="absolute inset-0 bg-black/30"></div>
                                                                <p className="absolute bottom-1 left-2 text-white text-xs font-semibold truncate">{accent.name}</p>
                                                                {isSelected && (
                                                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                                        <CheckCircle size={24} className="text-white"/>
                                                                    </div>
                                                                )}
                                                            </button>
                                                            <div className="absolute top-1 right-1 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                                <button onClick={() => handleEditAccent(accent)} className="p-1 bg-black/50 text-white rounded-full"><EditIcon size={12}/></button>
                                                                <button onClick={() => handleDeleteAccent(accent._id)} className="p-1 bg-black/50 text-white rounded-full"><TrashIcon size={12}/></button>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                                {premadeAccents.map(accent => {
                                                    const isSelected = getActiveAccentId() === accent.url;
                                                    return (
                                                         <button key={accent.name} onClick={() => handleDraftChange('activeCardAccent', accent.url)} className={`relative rounded-lg overflow-hidden border-2 h-20 transition-all ${isSelected ? 'border-blue-500' : 'border-transparent'}`}>
                                                            <div className="absolute inset-0 profile-card-accent" style={{ backgroundImage: `url(${accent.url})` }}></div>
                                                            <div className="absolute inset-0 bg-black/30"></div>
                                                            <p className="absolute bottom-1 left-2 text-white text-xs font-semibold truncate">{accent.name}</p>
                                                            {isSelected && (
                                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                                    <CheckCircle size={24} className="text-white"/>
                                                                </div>
                                                            )}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : ( // view === 'editor'
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pr-2 -mr-4">
                                    <div className="space-y-4">
                                        <input type="text" placeholder="Название акцента..." value={accentName} onChange={e => setAccentName(e.target.value)} className="w-full p-2 bg-slate-100 dark:bg-slate-800 rounded-lg"/>
                                        <div>
                                            <h4 className="font-semibold mb-2 text-sm">Фон</h4>
                                            <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                                {pastelColors.map(bg => (
                                                    <button key={bg.value} onClick={() => setSelectedBg(bg.value)} className={`relative h-16 rounded-md overflow-hidden border-2 ${selectedBg === bg.value ? 'border-blue-500' : 'border-transparent'}`} style={{ backgroundColor: bg.value }}>
                                                        {selectedBg === bg.value && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><CheckCircle className="text-white"/></div>}
                                                    </button>
                                                ))}
                                                {premadeAccents.map(bg => (
                                                    <button key={bg.url} onClick={() => setSelectedBg(bg.url)} className={`relative h-16 rounded-md overflow-hidden border-2 ${selectedBg === bg.url ? 'border-blue-500' : 'border-transparent'}`}>
                                                        <img src={bg.url} className="w-full h-full object-cover" alt={bg.name} />
                                                        {selectedBg === bg.url && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><CheckCircle className="text-white"/></div>}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                         <div>
                                            <h4 className="font-semibold mb-2 text-sm">Эмодзи (до 3)</h4>
                                            <div className="grid grid-cols-6 gap-2 max-h-40 overflow-y-auto p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                                 {allPremiumReactionUrls.map(url => (
                                                     <button key={url} onClick={() => handleToggleEmoji(url)} className={`relative p-1 rounded-lg aspect-square ${selectedEmojis.includes(url) ? 'bg-blue-200 dark:bg-blue-800' : 'hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                                                         <img src={url} className="w-full h-full object-contain"/>
                                                         {selectedEmojis.includes(url) && <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-lg"><CheckCircle className="text-white"/></div>}
                                                     </button>
                                                 ))}
                                             </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col space-y-4">
                                        <h4 className="font-semibold text-sm">Предпросмотр</h4>
                                        <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                                            <AnimatedAccent backgroundUrl={selectedBg} emojis={selectedEmojis.length > 0 ? selectedEmojis : ['/emojis/fire.gif']} />
                                        </div>
                                        <button onClick={handleSaveAccent} disabled={loading} className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold flex items-center justify-center">
                                            {loading ? <Loader2 className="animate-spin"/> : (editingAccent ? 'Обновить акцент' : 'Создать акцент')}
                                        </button>
                                    </div>
                                </div>
                            )}
                            </motion.div>
                            </AnimatePresence>
                            <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-200 dark:border-white/10 flex-shrink-0">
                                <button onClick={handleResetAll} className="flex items-center space-x-2 px-4 py-2 text-sm text-slate-500 hover:text-red-500 rounded-lg hover:bg-red-500/10 transition-colors">
                                    <RotateCcw size={16}/><span>Сбросить все</span>
                                </button>
                                <button onClick={handleSaveAll} disabled={loading} className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center">
                                    {loading ? <Loader2 className="animate-spin -ml-1 mr-2"/> : <Save size={18} className="mr-2" />}
                                    Готово
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.getElementById('modal-root')
    );
};

export default PremiumCustomizationModal;