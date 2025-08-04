// frontend/src/components/chat/ReactionsPopover.jsx

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Tippy from '@tippyjs/react/headless';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '../../context/UserContext';
import PremiumRequiredModal from '../modals/PremiumRequiredModal';
import { Sparkles, Loader2 } from 'lucide-react';
import { regularReactions, emojiPacks, allPremiumReactionUrls } from '../../data/emojiData';
import EmojiPreviewModal from '../modals/EmojiPreviewModal';
import { useCachedImage } from '../../hooks/useCachedImage';

// --- НАЧАЛО ИСПРАВЛЕНИЯ: Создаем компонент для кешированного эмодзи ---
const CachedEmoji = ({ src, alt }) => {
    const { finalSrc, loading } = useCachedImage(src);
    if (loading) {
        return <div className="w-8 h-8 flex items-center justify-center"><Loader2 size={16} className="animate-spin text-slate-400"/></div>;
    }
    return <img src={finalSrc} alt={alt} className="w-8 h-8 object-contain" />;
};
// --- КОНЕЦ ИСПРАВЛЕНИЯ ---

const preloadImages = (urls) => {
    urls.forEach(url => {
        if (url) new Image().src = url;
    });
};

const ReactionsPopover = ({ onSelect, children }) => {
    const [activeTab, setActiveTab] = useState('regular');
    const { currentUser, addedPacks } = useUser();
    const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
    const hasPreloaded = useRef(false);
    const [previewingEmoji, setPreviewingEmoji] = useState(null);
    const longPressTimerRef = useRef(null);
    const longPressTriggeredRef = useRef(false);
    
    const [activePremiumPackName, setActivePremiumPackName] = useState('');
    const [activeUserPackName, setActiveUserPackName] = useState('');

    const premiumEmojiPacks = useMemo(() => {
        const premadePacks = emojiPacks.slice(1);
        const userPremiumPacks = addedPacks.filter(pack => pack.type === 'emoji' && pack.isPremium);
        return [...premadePacks, ...userPremiumPacks];
    }, [addedPacks]);
    
    const userFreeEmojiPacks = useMemo(() => {
        return addedPacks.filter(pack => pack.type === 'emoji' && !pack.isPremium);
    }, [addedPacks]);

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


    return (
        <>
            <PremiumRequiredModal isOpen={isPremiumModalOpen} onClose={() => setIsPremiumModalOpen(false)} />
            <EmojiPreviewModal isOpen={!!previewingEmoji} onClose={() => setPreviewingEmoji(null)} emojiUrl={previewingEmoji} />
            <Tippy
                interactive
                placement="auto"
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
                        className="ios-glass-popover p-2 rounded-xl shadow-lg w-auto max-w-sm"
                        {...attrs}
                    >
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
                        {/* Контейнер с фиксированной высотой для предотвращения "прыжков" */}
                        <div className="h-[250px]">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeTab}
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -5 }}
                                    transition={{ duration: 0.1 }}
                                    className="h-full flex flex-col" // Заставляем блок занимать всю высоту родителя
                                >
                                    {activeTab === 'regular' && ( <div className="flex items-start justify-center flex-1 pt-4">
+                                         <div className="flex items-center space-x-1">
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
                                        </div>
                                    )}
                                    {activeTab === 'user_emojis' && (
                                         <div className="flex flex-col h-full">
                                            <div className="flex items-center space-x-1 p-1 mb-2 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-x-auto flex-shrink-0">
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
                                            <div className="grid grid-cols-6 gap-2 overflow-y-auto p-1 flex-1 content-start">
                                                {activeUserEmojis.map(emoji => (
                                                    <button
                                                        key={emoji._id}
                                                        onMouseDown={() => handleMouseDown(emoji)}
                                                        onMouseUp={() => handleMouseUp(emoji)}
                                                        onMouseLeave={handleMouseLeave}
                                                        onTouchStart={() => handleMouseDown(emoji)}
                                                        onTouchEnd={() => handleMouseUp(emoji)}
                                                        className="p-1 rounded-full transition-transform duration-100 hover:scale-125 flex items-center justify-center"
                                                        title={emoji.name}
                                                    >
                                                        <CachedEmoji src={emoji.imageUrl} alt={emoji.name} />
                                                    </button>
                                                ))}
                                            </div>
                                             <p className="text-xs text-center text-slate-400 dark:text-slate-500 mt-2 flex-shrink-0">
                                                Удерживайте для предпросмотра
                                            </p>
                                        </div>
                                    )}
                                    {activeTab === 'premium' && (
                                        <div className="flex flex-col h-full">
                                            <div className="flex items-center space-x-1 p-1 mb-2 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-x-auto flex-shrink-0">
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
                                            <div className="grid grid-cols-6 gap-2 overflow-y-auto p-1 flex-1 content-start">
                                                {activePremiumEmojis.map(emoji => (
                                                    <button
                                                        key={emoji.id || emoji._id}
                                                        onMouseDown={() => handleMouseDown(emoji)}
                                                        onMouseUp={() => handleMouseUp(emoji)}
                                                        onMouseLeave={handleMouseLeave}
                                                        onTouchStart={() => handleMouseDown(emoji)}
                                                        onTouchEnd={() => handleMouseUp(emoji)}
                                                        className="p-1 rounded-full transition-transform duration-100 hover:scale-125 flex items-center justify-center"
                                                        title={emoji.name}
                                                    >
                                                        <CachedEmoji src={emoji.imageUrl || emoji.url} alt={emoji.name} />
                                                    </button>
                                                ))}
                                            </div>
                                            <p className="text-xs text-center text-slate-400 dark:text-slate-500 mt-2 flex-shrink-0">
                                                Удерживайте для предпросмотра
                                            </p>
                                        </div>
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </motion.div>
                )}
            >
                {children}
            </Tippy>
        </>
    );
};

export default ReactionsPopover;