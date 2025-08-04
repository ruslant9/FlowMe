// frontend/src/components/workshop/ReactionsPopover.jsx

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Tippy from '@tippyjs/react/headless';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '../../context/UserContext';
import PremiumRequiredModal from '../modals/PremiumRequiredModal';
import { Sparkles } from 'lucide-react';
import { regularReactions, emojiPacks, allPremiumReactionUrls } from '../../data/emojiData';
import EmojiPreviewModal from '../modals/EmojiPreviewModal';

const preloadImages = (urls) => {
    urls.forEach(url => {
        if (url) new Image().src = url;
    });
};

const ReactionsPopover = ({ onSelect, children }) => {
    const [activeTab, setActiveTab] = useState('regular');
    const { currentUser, addedPacks } = useUser(); // Получаем добавленные паки
    const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
    const hasPreloaded = useRef(false);
    const [previewingEmoji, setPreviewingEmoji] = useState(null);
    const longPressTimerRef = useRef(null);
    const longPressTriggeredRef = useRef(false);

    // --- НАЧАЛО ИСПРАВЛЕНИЯ 1: Фильтруем паки для каждой вкладки ---
    const [activePremiumPackName, setActivePremiumPackName] = useState('');
    const [activeUserPackName, setActiveUserPackName] = useState('');

    // Паки для вкладки "Premium"
    const premiumEmojiPacks = useMemo(() => {
        const premadePacks = emojiPacks.slice(1); // Предустановленные
        const userPremiumPacks = addedPacks.filter(pack => pack.type === 'emoji' && pack.isPremium);
        return [...premadePacks, ...userPremiumPacks];
    }, [addedPacks]);

    // Паки для новой вкладки "Эмодзи"
    const userFreeEmojiPacks = useMemo(() => {
        return addedPacks.filter(pack => pack.type === 'emoji' && !pack.isPremium);
    }, [addedPacks]);

    // Устанавливаем активный пак по умолчанию для каждой вкладки
    useEffect(() => {
        if (premiumEmojiPacks.length > 0 && !activePremiumPackName) {
            setActivePremiumPackName(premiumEmojiPacks[0].name);
        }
    }, [premiumEmojiPacks, activePremiumPackName]);

    useEffect(() => {
        if (userFreeEmojiPacks.length > 0 && !activeUserPackName) {
            setActiveUserPackName(userFreeEmojiPacks[0].name);
        }
    }, [userFreeEmojiPacks, activeUserPackName]);
    // --- КОНЕЦ ИСПРАВЛЕНИЯ 1 ---


    useEffect(() => {
        if (!hasPreloaded.current) {
            preloadImages(allPremiumReactionUrls);
            hasPreloaded.current = true;
        }
    }, []);

    const handlePremiumTabClick = () => {
        if (currentUser?.premium?.isActive) {
            setActiveTab('premium');
        } else {
            setIsPremiumModalOpen(true);
        }
    };

    const handleReactionSelect = (reactionUrl) => {
        onSelect(reactionUrl);
    };

    const handleMouseDown = (item) => {
        longPressTriggeredRef.current = false;
        longPressTimerRef.current = setTimeout(() => {
            const url = item.imageUrl || item.url;
            if (url) {
                setPreviewingEmoji(url);
                longPressTriggeredRef.current = true;
            }
        }, 400);
    };

    const handleMouseUp = (item) => {
        clearTimeout(longPressTimerRef.current);
        if (!longPressTriggeredRef.current) {
            handleReactionSelect(item.imageUrl || item.url);
        }
    };
    
    const handleMouseLeave = () => {
        clearTimeout(longPressTimerRef.current);
    };
    
    // --- НАЧАЛО ИСПРАВЛЕНИЯ 2: Получаем список эмодзи для активного пака в каждой вкладке ---
    const activePremiumEmojis = useMemo(() => {
        if (activeTab !== 'premium') return [];
        const pack = premiumEmojiPacks.find(p => p.name === activePremiumPackName);
        return pack?.items || pack?.emojis || [];
    }, [activeTab, activePremiumPackName, premiumEmojiPacks]);
    
    const activeUserEmojis = useMemo(() => {
        if (activeTab !== 'user_emojis') return [];
        const pack = userFreeEmojiPacks.find(p => p.name === activeUserPackName);
        return pack?.items || [];
    }, [activeTab, activeUserPackName, userFreeEmojiPacks]);
    // --- КОНЕЦ ИСПРАВЛЕНИЯ 2 ---


    return (
        <>
            <PremiumRequiredModal isOpen={isPremiumModalOpen} onClose={() => setIsPremiumModalOpen(false)} />
            <EmojiPreviewModal isOpen={!!previewingEmoji} onClose={() => setPreviewingEmoji(null)} emojiUrl={previewingEmoji} />
            <Tippy
                interactive
                placement="auto" // <-- ИЗМЕНЕНИЕ: Автоматический выбор положения
                delay={[100, 100]}
                onClickOutside={(instance, event) => {
                    const isClickOnPreviewOverlay = event.target.closest('.fixed.inset-0.bg-black\\/80');
                    if (isClickOnPreviewOverlay) {
                        return false; 
                    }
                    instance.hide();
                }}
                render={attrs => (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.9 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className="ios-glass-popover p-2 rounded-xl shadow-lg w-auto max-w-sm" // <-- ИЗМЕНЕНИЕ: Увеличен размер
                        {...attrs}
                    >
                        {/* --- НАЧАЛО ИСПРАВЛЕНИЯ 3: Добавляем новую кнопку-вкладку "Эмодзи" --- */}
                        <div className="flex items-center space-x-1 p-1 mb-2 bg-slate-200/50 dark:bg-slate-700/50 rounded-lg">
                            <button onClick={() => setActiveTab('regular')} className={`flex-1 px-3 py-1 text-xs font-semibold rounded-md transition-colors ${activeTab === 'regular' ? 'bg-white dark:bg-slate-600 shadow' : ''}`}>Обычные</button>
                            {userFreeEmojiPacks.length > 0 && (
                                <button onClick={() => setActiveTab('user_emojis')} className={`flex-1 px-3 py-1 text-xs font-semibold rounded-md transition-colors ${activeTab === 'user_emojis' ? 'bg-white dark:bg-slate-600 shadow' : ''}`}>Эмодзи</button>
                            )}
                            <button onClick={handlePremiumTabClick} className={`flex-1 px-3 py-1 text-xs font-semibold rounded-md transition-colors flex items-center justify-center space-x-1 ${activeTab === 'premium' ? 'bg-white dark:bg-slate-600 shadow' : ''}`}>
                                <Sparkles size={14} className="text-yellow-400" />
                                <span>Premium</span>
                            </button>
                        </div>
                        {/* --- КОНЕЦ ИСПРАВЛЕНИЯ 3 --- */}
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                transition={{ duration: 0.1 }}
                            >
                                {activeTab === 'regular' && (
                                    <div className="flex items-center space-x-1">
                                        {regularReactions.map(emoji => (
                                            <button
                                                key={emoji}
                                                onClick={() => onSelect(emoji)}
                                                className="p-1.5 rounded-full text-2xl transition-transform duration-100 hover:scale-125"
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {/* --- НАЧАЛО ИСПРАВЛЕНИЯ 4: Новый блок для вкладки "Эмодзи" --- */}
                                {activeTab === 'user_emojis' && (
                                     <div>
                                        <div className="flex items-center space-x-1 p-1 mb-2 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-x-auto">
                                            {userFreeEmojiPacks.map(pack => (
                                                <button
                                                    key={pack.name}
                                                    onClick={() => setActiveUserPackName(pack.name)}
                                                    className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors flex-shrink-0 ${activeUserPackName === pack.name ? 'bg-blue-500 text-white' : 'hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                                                >
                                                    {pack.name}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto p-1">
                                            {activeUserEmojis.map(emoji => (
                                                <button
                                                    key={emoji._id}
                                                    onMouseDown={() => handleMouseDown(emoji)}
                                                    onMouseUp={() => handleMouseUp(emoji)}
                                                    onMouseLeave={handleMouseLeave}
                                                    onTouchStart={() => handleMouseDown(emoji)}
                                                    onTouchEnd={() => handleMouseUp(emoji)}
                                                    className="p-1 rounded-full transition-transform duration-100 hover:scale-125"
                                                    title={emoji.name}
                                                >
                                                    <img src={emoji.imageUrl} alt={emoji.name} className="w-8 h-8 object-contain"/>
                                                </button>
                                            ))}
                                        </div>
                                         <p className="text-xs text-center text-slate-400 dark:text-slate-500 mt-2">
                                            Удерживайте для предпросмотра
                                        </p>
                                    </div>
                                )}
                                {/* --- КОНЕЦ ИСПРАВЛЕНИЯ 4 --- */}
                                {activeTab === 'premium' && (
                                    <div>
                                        <div className="flex items-center space-x-1 p-1 mb-2 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-x-auto">
                                            {premiumEmojiPacks.map(pack => (
                                                <button
                                                    key={pack.name}
                                                    onClick={() => setActivePremiumPackName(pack.name)}
                                                    className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors flex-shrink-0 ${activePremiumPackName === pack.name ? 'bg-blue-500 text-white' : 'hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                                                >
                                                    {pack.name}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto p-1">
                                            {activePremiumEmojis.map(emoji => (
                                                <button
                                                    key={emoji.id || emoji._id}
                                                    onMouseDown={() => handleMouseDown(emoji)}
                                                    onMouseUp={() => handleMouseUp(emoji)}
                                                    onMouseLeave={handleMouseLeave}
                                                    onTouchStart={() => handleMouseDown(emoji)}
                                                    onTouchEnd={() => handleMouseUp(emoji)}
                                                    className="p-1 rounded-full transition-transform duration-100 hover:scale-125"
                                                    title={emoji.name}
                                                >
                                                    <img src={emoji.imageUrl || emoji.url} alt={emoji.name} className="w-8 h-8 object-contain"/>
                                                </button>
                                            ))}
                                        </div>
                                        <p className="text-xs text-center text-slate-400 dark:text-slate-500 mt-2">
                                            Удерживайте для предпросмотра
                                        </p>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </motion.div>
                )}
            >
                {children}
            </Tippy>
        </>
    );
};

export default ReactionsPopover;