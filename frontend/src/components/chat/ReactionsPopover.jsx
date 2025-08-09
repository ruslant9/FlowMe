// frontend/src/components/chat/ReactionsPopover.jsx --- ИСПРАВЛЕННЫЙ ФАЙЛ ---

import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';
import Tippy from '@tippyjs/react/headless';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '../../hooks/useUser';
import PremiumRequiredModal from '../modals/PremiumRequiredModal';
import { Sparkles, Loader2, Search } from 'lucide-react';
import { regularReactions, emojiPacks, allPremiumReactionUrls } from '../../data/emojiData';
import EmojiPreviewModal from '../modals/EmojiPreviewModal';
import { useCachedImage } from '../../hooks/useCachedImage';
import useMediaQuery from '../../hooks/useMediaQuery';

const CachedEmoji = ({ src, alt }) => {
    const { finalSrc, loading } = useCachedImage(src);
    if (loading) {
        return <div className="w-8 h-8 flex items-center justify-center"><Loader2 size={16} className="animate-spin text-slate-400"/></div>;
    }
    return <img src={finalSrc} alt={alt} className="w-8 h-8 object-contain" />;
};

const preloadImages = (urls) => {
    urls.forEach(url => {
        if (url) new Image().src = url;
    });
};

const ReactionsPopover = ({ isOpen, onClose, onSelect, targetRef, onOpen }) => {
    const isMobile = useMediaQuery('(max-width: 768px)');
    const [activeTab, setActiveTab] = useState('regular');
    const [searchQuery, setSearchQuery] = useState('');
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
        setSearchQuery('');
    }, [premiumEmojiPacks, activePremiumPackName]);

    useEffect(() => {
        if (userFreeEmojiPacks.length > 0 && !activeUserPackName) {
            setActiveUserPackName(userFreeEmojiPacks[0].name);
        }
        setSearchQuery('');
    }, [userFreeEmojiPacks, activeUserPackName]);

    useEffect(() => {
        if (isOpen && !hasPreloaded.current) {
            preloadImages(allPremiumReactionUrls);
            hasPreloaded.current = true;
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && onOpen) {
            onOpen();
        }
    }, [isOpen, onOpen]);

    const handlePremiumTabClick = (e) => {
        e.stopPropagation(); 
        if (currentUser?.premium?.isActive) {
            setActiveTab('premium');
            setSearchQuery('');
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
        const allEmojis = pack?.items || pack?.emojis || [];
        if (!searchQuery) return allEmojis;
        return allEmojis.filter(emoji => emoji.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [activeTab, activePremiumPackName, premiumEmojiPacks, searchQuery]);
    
    const activeUserEmojis = useMemo(() => {
        if (activeTab !== 'user_emojis') return [];
        const pack = userFreeEmojiPacks.find(p => p.name === activeUserPackName);
        const allEmojis = pack?.items || [];
        if (!searchQuery) return allEmojis;
        return allEmojis.filter(emoji => emoji.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [activeTab, activeUserPackName, userFreeEmojiPacks, searchQuery]);

    const PanelContent = () => (
        <div className="flex flex-col h-full" onClick={(e) => e.stopPropagation()}>
             <div className="flex items-center space-x-1 p-1 mb-2 bg-slate-200/50 dark:bg-slate-700/50 rounded-lg">
                <button onClick={() => { setActiveTab('regular'); setSearchQuery(''); }} className={`flex-1 px-3 py-1 text-xs font-semibold rounded-md transition-colors ${activeTab === 'regular' ? 'bg-white dark:bg-slate-600 shadow' : ''}`}>Обычные</button>
                {userFreeEmojiPacks.length > 0 && (
                    <button onClick={() => { setActiveTab('user_emojis'); setSearchQuery(''); }} className={`flex-1 px-3 py-1 text-xs font-semibold rounded-md transition-colors ${activeTab === 'user_emojis' ? 'bg-white dark:bg-slate-600 shadow' : ''}`}>Эмодзи</button>
                )}
                <button onClick={handlePremiumTabClick} className={`flex-1 px-3 py-1 text-xs font-semibold rounded-md transition-colors flex items-center justify-center space-x-1 ${activeTab === 'premium' ? 'bg-white dark:bg-slate-600 shadow' : ''}`}>
                    <Sparkles size={14} className="text-yellow-400" />
                    <span>Premium</span>
                </button>
            </div>
            {(activeTab === 'user_emojis' || activeTab === 'premium') && (
                <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="Поиск эмодзи..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-2 py-1.5 text-xs bg-slate-200/50 dark:bg-slate-700/50 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                </div>
            )}
            <div className="flex-1 overflow-y-auto">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.1 }}
                        className="h-full flex flex-col"
                    >
                        {activeTab === 'regular' && (
                            <div className="flex-1 overflow-y-auto pt-2 -mx-1 px-1">
                                <div className="flex flex-wrap gap-x-1 gap-y-2 justify-center">
                                    {regularReactions.map(emoji => (
                                        <button
                                            key={emoji}
                                            onClick={() => handleReactionSelect(emoji)}
                                            className="p-1.5 rounded-full text-2xl flex items-center justify-center w-9 h-9 transition-transform duration-100 hover:scale-125"
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
                                <div className="flex flex-wrap gap-2 justify-center overflow-y-auto p-1 flex-1 content-start">
                                    {activeUserEmojis.length > 0 ? activeUserEmojis.map(emoji => (
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
                                    )) : <p className="col-span-full text-center text-xs text-slate-400 pt-8">Ничего не найдено</p>}
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
                                <div className="flex flex-wrap gap-2 justify-center overflow-y-auto p-1 flex-1 content-start">
                                    {activePremiumEmojis.length > 0 ? activePremiumEmojis.map(emoji => (
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
                                    )) : <p className="col-span-full text-center text-xs text-slate-400 pt-8">Ничего не найдено</p>}
                                </div>
                                <p className="text-xs text-center text-slate-400 dark:text-slate-500 mt-2 flex-shrink-0">
                                    Удерживайте для предпросмотра
                                </p>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );

    if (isMobile) {
        return (
            <>
                <PremiumRequiredModal isOpen={isPremiumModalOpen} onClose={() => setIsPremiumModalOpen(false)} />
                <EmojiPreviewModal isOpen={!!previewingEmoji} onClose={() => setPreviewingEmoji(null)} emojiUrl={previewingEmoji} />
                {ReactDOM.createPortal(
                    <AnimatePresence>
                        {isOpen && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={onClose}
                                className="fixed inset-0 bg-black/30 z-[120]"
                            >
                                <motion.div
                                    initial={{ y: "100%" }}
                                    animate={{ y: 0 }}
                                    exit={{ y: "100%" }}
                                    transition={{ duration: 0.25, ease: 'easeOut' }}
                                    className="absolute bottom-0 left-0 right-0 z-[130] p-4 bg-slate-100 dark:bg-slate-800 rounded-t-2xl flex flex-col"
                                    style={{ height: 'auto', maxHeight: '50vh' }}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <PanelContent closePanel={onClose} />
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>,
                    document.getElementById('modal-root')
                )}
            </>
        );
    }

    // Desktop version
    return (
        <>
            <PremiumRequiredModal isOpen={isPremiumModalOpen} onClose={() => setIsPremiumModalOpen(false)} />
            <EmojiPreviewModal isOpen={!!previewingEmoji} onClose={() => setPreviewingEmoji(null)} emojiUrl={previewingEmoji} />
            <Tippy
                interactive
                placement="auto"
                delay={[100, 100]}
                appendTo={() => document.body}
                popperOptions={{ strategy: 'fixed' }}
                visible={isOpen}
                onClickOutside={onClose}
                reference={targetRef}
                render={(attrs, content, instance) => (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.9 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className="ios-glass-popover p-2 rounded-xl shadow-lg w-full max-w-sm"
                        {...attrs}
                    >
                        <PanelContent closePanel={onClose} />
                        <div className="tippy-arrow" data-popper-arrow></div>
                    </motion.div>
                )}
            >
                {/* Пустышка, так как триггер теперь внешний */}
                <div /> 
            </Tippy>
        </>
    );
};

export default ReactionsPopover;