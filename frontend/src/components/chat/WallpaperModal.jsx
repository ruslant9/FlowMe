// frontend/src/components/chat/WallpaperModal.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Image as ImageIcon, Paintbrush, Plus, Trash2, Loader2, Palette, Edit, RotateCcw, CheckCircle, Heart } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useModal } from '../../hooks/useModal';
import { useUser } from '../../hooks/useUser';
import PremiumRequiredModal from '../modals/PremiumRequiredModal';

const API_URL = import.meta.env.VITE_API_URL;

const getContrastingTextColor = (hexColor) => {
    if (!hexColor || hexColor.length < 7) return '#111827'; 

    let cleanHex = hexColor.startsWith('#') ? hexColor.slice(1) : hexColor;
    if (cleanHex.length === 8) {
        cleanHex = cleanHex.slice(0, 6);
    }
    if (cleanHex.length === 3) {
        cleanHex = cleanHex.split('').map(char => char + char).join('');
    }

    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);

    const luminance = (0.299 * r + 0.587 * g + 0.114 * b);
    return luminance > 128 ? '#111827' : '#FFFFFF';
};

const TabButton = ({ active, onClick, children }) => (
    <button
        onClick={onClick}
        className={`flex-1 px-2 py-1.5 text-xs md:px-4 md:py-2.5 md:text-sm font-semibold rounded-md transition-colors ${
            active 
            ? 'bg-blue-600 text-white shadow' 
            : 'text-slate-600 dark:text-white/70 hover:bg-slate-200/50 dark:hover:bg-white/10'
        }`}
    >
        {children}
    </button>
);

const ColorPicker = ({ label, value, onChange }) => (
    <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{label}</label>
        <div className="relative w-10 h-10 rounded-lg border border-slate-300 dark:border-slate-600" style={{ backgroundColor: value }}>
            <input type="color" value={value} onChange={e => onChange(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/>
        </div>
    </div>
);

const BlurSelectionModal = ({ isOpen, onClose, onApply, imageUrl }) => (
    <AnimatePresence>
        {isOpen && (
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/50 flex items-center justify-center z-20"
            >
                <motion.div
                    initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-slate-200 dark:bg-slate-700 p-6 rounded-2xl w-full max-w-sm"
                >
                    <h3 className="font-bold text-lg mb-4">Настройте размытие</h3>
                    <div className="w-full h-32 rounded-lg mb-4 overflow-hidden">
                        <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${imageUrl})`, filter: `blur(${document.getElementById('blur-slider')?.value || 0}px)` }} id="blur-preview"></div>
                    </div>
                    <input
                        id="blur-slider"
                        type="range"
                        min="0"
                        max="30"
                        step="1"
                        defaultValue="0"
                        className="w-full"
                        onChange={(e) => {
                            const preview = document.getElementById('blur-preview');
                            if (preview) preview.style.filter = `blur(${e.target.value}px)`;
                        }}
                    />
                    <div className="flex justify-end mt-4">
                        <button onClick={() => onApply(document.getElementById('blur-slider').value)} className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg">Применить</button>
                    </div>
                </motion.div>
            </motion.div>
        )}
    </AnimatePresence>
);

const wallpaperSections = [
    {
        title: "Фирменные узоры",
        wallpapers: [
            { name: "Неоновый дудл", url: "/wallpapers/templates/wallpaper-doodle-dark.svg" },
            { name: "Закатный дудл", url: "/wallpapers/templates/wallpaper-doodle-sunset.svg" },
            { name: "Лесной дудл", url: "/wallpapers/templates/wallpaper-doodle-forest.svg" },
            { name: "Синтвейв дудл", url: "/wallpapers/templates/wallpaper-doodle-synthwave.svg" },
            { name: "Золотой дудл", url: "/wallpapers/templates/wallpaper-doodle-gold.svg" },
            { name: "Восходящие сердца", url: "/wallpapers/templates/love_wallpaper.svg" },
        ]
    },
    {
        title: "Пейзажи и космос",
        wallpapers: [
            { name: "Ночные горы", url: "/wallpapers/templates/template-6.svg" },
            { name: "Лунная долина", url: "/wallpapers/templates/template-7.svg" },
            { name: "Одинокая планета", url: "/wallpapers/templates/template-14.svg" },
            { name: "Пастельные волны", url: "/wallpapers/templates/template-16.svg" },
        ]
    },
    {
        title: "Абстракции и геометрия",
        wallpapers: [
            { name: "Неоновые треугольники", url: "/wallpapers/templates/template-8.svg" },
            { name: "Фиолетовые грани", url: "/wallpapers/templates/template-9.svg" },
            { name: "Синяя схема", url: "/wallpapers/templates/template-10.svg" },
            { name: "Синяя рябь", url: "/wallpapers/templates/template-11.svg" },
            { name: "Золотая чешуя", url: "/wallpapers/templates/template-12.svg" },
            { name: "Неоновая молния", url: "/wallpapers/templates/template-13.svg" },
            { name: "Золотой радар", url: "/wallpapers/templates/template-19.svg" },
            { name: "Синий полигон", url: "/wallpapers/templates/template-20.svg" },
        ]
    },
    {
        title: "Градиенты и текстуры",
        wallpapers: [
            { name: "Темный градиент", url: "/wallpapers/templates/template-15.svg" },
            { name: "Темная кожа", url: "/wallpapers/templates/template-17.svg" },
            { name: "Цветное боке", url: "/wallpapers/templates/template-18.svg" },
        ]
    },
    {
        title: "Абстрактные узоры",
        wallpapers: [
            { name: "Ледяная сеть", url: "/wallpapers/templates/template-1.svg" },
            { name: "Золотой горизонт", url: "/wallpapers/templates/template-2.svg" },
            { name: "Ночные огни", url: "/wallpapers/templates/template-3.svg" },
            { name: "Кожа дракона", url: "/wallpapers/templates/template-4.svg" },
            { name: "Пастельные дюны", url: "/wallpapers/templates/template-5.svg" },
        ]
    }
];

const WallpaperModal = ({ isOpen, onClose, conversationId, currentWallpaper }) => {
    const [activeTab, setActiveTab] = useState('templates');
    const { showConfirmation } = useModal();
    const [myWallpapers, setMyWallpapers] = useState([]);
    const [loadingMyWallpapers, setLoadingMyWallpapers] = useState(false);
    const [editingWallpaper, setEditingWallpaper] = useState(null);
    const [templateSelection, setTemplateSelection] = useState(null); // { url, applyFor }
    const { currentUser } = useUser();
    const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
    
    const [creatorColors, setCreatorColors] = useState({
        background: '#0f172a',
        header: '#1e293b99',
        myBubble: '#3b82f6',
        theirBubble: '#334155',
        text: '#ffffff',
        myBubbleText: '#ffffff',
        theirBubbleText: '#ffffff',
    });
    const [wallpaperName, setWallpaperName] = useState('');

    const fetchMyWallpapers = useCallback(async () => {
        if (!isOpen) return;
        setLoadingMyWallpapers(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/api/wallpapers/my`, { headers: { Authorization: `Bearer ${token}` }});
            setMyWallpapers(res.data);
        } catch (error) {
            toast.error("Не удалось загрузить ваши обои.");
        } finally {
            setLoadingMyWallpapers(false);
        }
    }, [isOpen]);

    useEffect(() => {
        if (activeTab === 'my') {
            fetchMyWallpapers();
        }
    }, [activeTab, fetchMyWallpapers]);

    useEffect(() => {
        if (activeTab !== 'creator' && editingWallpaper) {
            setEditingWallpaper(null);
            setWallpaperName('');
            // Сбрасываем цвета к дефолтным
            setCreatorColors({ background: '#0f172a', header: '#1e293b99', myBubble: '#3b82f6', theirBubble: '#334155', text: '#ffffff', myBubbleText: '#ffffff', theirBubbleText: '#ffffff' });
        }
    }, [activeTab, editingWallpaper]);

    const handleSetWallpaper = async (type, value, applyFor = 'me', name = null) => {
        const toastId = toast.loading('Установка обоев...');
        let finalValue = value;

        if (type === 'template' && typeof value === 'object' && value.url) {
             finalValue = JSON.stringify(value);
        }

        if (type === 'template' && typeof value === 'string') {
            finalValue = JSON.stringify({ url: value, blur: 0 });
        }
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/api/messages/conversations/${conversationId}/wallpaper`,
                { type, value: finalValue, applyFor, name },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success('Обои установлены!', { id: toastId });
            onClose();
        } catch (error) {
            toast.error('Не удалось установить обои.', { id: toastId });
        }
    };
    
    const handleResetWallpaper = async () => {
        const toastId = toast.loading('Сброс обоев...');
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}/api/messages/conversations/${conversationId}/wallpaper`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Обои сброшены до стандартных.', { id: toastId });
            onClose();
        } catch (error) {
            toast.error('Не удалось сбросить обои.', { id: toastId });
        }
    };

    const handleSaveCustomWallpaper = async () => {
        if (!wallpaperName.trim()) {
            return toast.error("Введите название для обоев.");
        }
        const toastId = toast.loading('Сохранение...');
        const value = JSON.stringify(creatorColors);
        const payload = { name: wallpaperName, type: 'color', value };

        try {
            const token = localStorage.getItem('token');
            if (editingWallpaper) {
                await axios.put(`${API_URL}/api/wallpapers/${editingWallpaper._id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
                toast.success('Обои обновлены!', { id: toastId });
            } else {
                await axios.post(`${API_URL}/api/wallpapers`, payload, { headers: { Authorization: `Bearer ${token}` } });
                toast.success('Обои сохранены!', { id: toastId });
            }

            setEditingWallpaper(null);
            setWallpaperName('');
            setCreatorColors({ background: '#0f172a', header: '#1e293b99', myBubble: '#3b82f6', theirBubble: '#334155', text: '#ffffff', myBubbleText: '#ffffff', theirBubbleText: '#ffffff' });
            setActiveTab('my');
        } catch (error) {
            toast.error('Ошибка сохранения.', { id: toastId });
        }
    };

    const handleDeleteWallpaper = async (wallpaperId) => {
        showConfirmation({
            title: "Удалить обои?",
            message: "Вы уверены? Это действие нельзя отменить.",
            onConfirm: async () => {
                const toastId = toast.loading('Удаление...');
                try {
                    const token = localStorage.getItem('token');
                    await axios.delete(`${API_URL}/api/wallpapers/${wallpaperId}`, { headers: { Authorization: `Bearer ${token}` } });
                    toast.success('Обои удалены.', { id: toastId });
                    fetchMyWallpapers();
                } catch (error) {
                    toast.error('Ошибка удаления.', { id: toastId });
                }
            }
        });
    };

    const handleEditWallpaper = (wp) => {
        setEditingWallpaper(wp);
        setWallpaperName(wp.name);
        setCreatorColors(JSON.parse(wp.value));
        setActiveTab('creator');
    };

    const handleTemplateClick = (wallpaper, applyFor) => {
        setTemplateSelection({ url: wallpaper.url, name: wallpaper.name, applyFor });
    };

    const handleBlurModalClose = (e) => {
        e.stopPropagation();
        setTemplateSelection(null);
    }

    const handleBlurApplied = (blurValue) => {
        handleSetWallpaper('template', { url: templateSelection.url, blur: blurValue }, templateSelection.applyFor, templateSelection.name);
        setTemplateSelection(null);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
                    <PremiumRequiredModal isOpen={isPremiumModalOpen} onClose={() => setIsPremiumModalOpen(false)} />
                    <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="ios-glass-final w-full max-w-4xl p-4 md:p-6 rounded-3xl flex flex-col text-slate-900 dark:text-white max-h-[90vh]">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg md:text-xl font-bold">Выбор обоев для чата</h2>
                            <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10">
                                <X />
                            </button>
                        </div>

                        <div className="flex items-center space-x-1 md:space-x-2 p-1 mb-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                            {editingWallpaper && <button onClick={() => { setEditingWallpaper(null); setActiveTab('my');}} className="text-sm px-2 text-blue-500 hover:underline">← Назад</button>}
                            <TabButton active={activeTab === 'my'} onClick={() => setActiveTab('my')}>Мои обои</TabButton>
                            <TabButton active={activeTab === 'templates'} onClick={() => setActiveTab('templates')}>Шаблоны</TabButton>
                            <TabButton 
    active={activeTab === 'creator'} 
    onClick={() => {
        if (currentUser?.premium?.isActive) {
            setActiveTab('creator');
        } else {
            setIsPremiumModalOpen(true);
        }
    }}
>
    <div className="flex items-center justify-center space-x-2">
        <span>Создать</span>
        {!currentUser?.premium?.isActive && (
            <span className="premium-shimmer-text font-bold text-xs">(Premium)</span>
        )}
    </div>
</TabButton>
                        </div>
                        
                        <div className="flex justify-end mb-2">
                             <button onClick={handleResetWallpaper} className="flex items-center space-x-2 text-xs md:text-sm text-slate-700 dark:text-slate-300 hover:text-blue-500 dark:hover:text-blue-400 font-semibold px-2.5 py-1 md:px-3 md:py-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                                 <RotateCcw size={14}/> <span className="hidden sm:inline">Сбросить до стандартных</span><span className="sm:hidden">Сбросить</span>
                            </button>
                        </div>

                         <div className="flex-1 overflow-y-auto px-2">
                            {activeTab === 'my' && (
                                loadingMyWallpapers ? <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div> :
                                myWallpapers.length === 0 ? <p className="text-center py-10 text-slate-500">У вас нет сохраненных обоев.</p> :
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {myWallpapers.map(wp => {
                                        const colors = JSON.parse(wp.value);
                                        const isActive = currentWallpaper?.type === 'color' && currentWallpaper.value === wp.value;
                                        return (
                                            <div key={wp._id} className={`rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col relative transition-all ${isActive ? 'ring-4 ring-blue-500' : ''}`}>
                                                {isActive && (
                                                     <div className="absolute top-1 right-1 bg-white/80 dark:bg-slate-900/80 rounded-full w-6 h-6 flex items-center justify-center z-10">
                                                        <CheckCircle size={16} className="text-blue-500"/>
                                                    </div>
                                                )}
                                                <div className="relative group h-24 w-full" style={{ background: colors.background }}>
                                                    <button onClick={() => handleEditWallpaper(wp)} className="absolute top-1 left-1 p-1.5 bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60">
                                                        <Edit size={14}/>
                                                    </button>
                                                    <button onClick={() => handleDeleteWallpaper(wp._id)} className="absolute top-1 right-1 p-1.5 bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60">
                                                        <Trash2 size={14}/>
                                                    </button>
                                                </div>
                                                <div className="p-2 bg-slate-100 dark:bg-slate-800">
                                                    <p className="font-semibold truncate">{wp.name}</p>
                                                    <div className="flex items-center space-x-1 mt-2">
                                                        <button onClick={() => handleSetWallpaper(wp.type, wp.value, 'me', wp.name)} className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">Для меня</button>
                                                        <button onClick={() => handleSetWallpaper(wp.type, wp.value, 'both', wp.name)} className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">Для обоих</button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {activeTab === 'templates' && (
                                <div className="space-y-6">
                                    {wallpaperSections.map(section => (
                                        <div key={section.title}>
                                            <h3 className="font-bold text-lg mb-3 pl-1">{section.title}</h3>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                {section.wallpapers.map(wallpaper => {
                                                    const isActive = currentWallpaper?.type === 'template' && JSON.parse(currentWallpaper.value).url === wallpaper.url;
                                                    return (
                                                        <div key={wallpaper.name} className={`group relative rounded-lg overflow-hidden cursor-pointer aspect-video ring-offset-2 ring-offset-slate-100 dark:ring-offset-slate-800 transition-all ${isActive ? 'ring-4 ring-blue-500' : 'ring-1 ring-slate-200/50 dark:ring-slate-700/50'}`}>
                                                            <img src={wallpaper.url} alt={wallpaper.name} className="w-full h-full object-cover" />
                                                            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                                                                {isActive && (<div className="absolute top-1 right-1 bg-white/80 dark:bg-slate-900/80 rounded-full w-6 h-6 flex items-center justify-center z-10"><CheckCircle size={16} className="text-blue-500"/></div>)}
                                                                <p className="text-white text-xs font-semibold truncate">{wallpaper.name}</p>
                                                            </div>
                                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center space-y-2 p-2">
                                                                <button onClick={() => handleTemplateClick(wallpaper, 'me')} className="w-full text-sm font-semibold bg-white/80 text-black backdrop-blur-sm px-3 py-1.5 rounded-lg hover:bg-white">Для меня</button>
                                                                <button onClick={() => handleTemplateClick(wallpaper, 'both')} className="w-full text-sm font-semibold bg-white/80 text-black backdrop-blur-sm px-3 py-1.5 rounded-lg hover:bg-white">Для обоих</button>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {activeTab === 'creator' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <h3 className="font-bold">Палитра</h3>
                                        <ColorPicker label="Фон чата" value={creatorColors.background} onChange={v => setCreatorColors(c => ({...c, background: v}))} />
                                        <ColorPicker label="Шапка чата" value={creatorColors.header} onChange={v => setCreatorColors(c => ({...c, header: v}))} />
                                        <ColorPicker label="Мои сообщения" value={creatorColors.myBubble} onChange={v => setCreatorColors(c => ({...c, myBubble: v}))} />
                                        <ColorPicker label="Текст в моих сообщениях" value={creatorColors.myBubbleText} onChange={v => setCreatorColors(c => ({...c, myBubbleText: v}))} />
                                        <ColorPicker label="Сообщения собеседника" value={creatorColors.theirBubble} onChange={v => setCreatorColors(c => ({...c, theirBubble: v}))} />
                                        <ColorPicker label="Текст в их сообщениях" value={creatorColors.theirBubbleText} onChange={v => setCreatorColors(c => ({...c, theirBubbleText: v}))} />
                                        <ColorPicker label="Текст (шапка, время, системные)" value={creatorColors.text} onChange={v => setCreatorColors(c => ({...c, text: v}))} />
                                    </div>
                                    <div className="space-y-4">
                                        <h3 className="font-bold">Предпросмотр и сохранение</h3>
                                        <div className="p-3 rounded-lg w-full h-64 flex flex-col" style={{ backgroundColor: creatorColors.background }}>
                                            <div className="p-2 rounded-t-lg" style={{ backgroundColor: creatorColors.header, color: getContrastingTextColor(creatorColors.header) }}>Шапка</div>
                                            <div className="flex-1 pt-2 space-y-2">
                                                <div className="ml-auto w-3/5 p-2 rounded-lg" style={{ backgroundColor: creatorColors.myBubble, color: creatorColors.myBubbleText }}>Привет!</div>
                                                <div className="mr-auto w-3/5 p-2 rounded-lg" style={{ backgroundColor: creatorColors.theirBubble, color: creatorColors.theirBubbleText }}>Как дела?</div>
                                            </div>
                                            <p className="text-right text-xs" style={{ color: creatorColors.text }}>12:34</p>
                                        </div>
                                        <input type="text" placeholder="Название для обоев..." value={wallpaperName} onChange={e => setWallpaperName(e.target.value)}
                                            className="w-full p-2 bg-slate-100 dark:bg-slate-800 rounded-lg"/>
                                        <button onClick={handleSaveCustomWallpaper} className="w-full py-2 bg-blue-600 text-white rounded-lg font-semibold">{editingWallpaper ? 'Обновить' : 'Сохранить'}</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                    <BlurSelectionModal isOpen={!!templateSelection} onClose={handleBlurModalClose} onApply={handleBlurApplied} imageUrl={templateSelection?.url} />
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default WallpaperModal;