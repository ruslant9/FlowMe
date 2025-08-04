// frontend/src/components/chat/ReactionsPopover.jsx

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Tippy from '@tippyjs/react/headless';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '../../context/UserContext';
import PremiumRequiredModal from '../modals/PremiumRequiredModal';
import { Sparkles, Search } from 'lucide-react';
import { regularReactions, allPremiumReactionUrls } from '../../data/emojiData';
import EmojiPreviewModal from '../modals/EmojiPreviewModal';

const preloadImages = (urls) => {
    urls.forEach(url => {
        if (url) new Image().src = url;
    });
};

const ReactionsPopover = ({ onSelect, children }) => {
    const [activeTab, setActiveTab] = useState('regular');
    const [activePackName, setActivePackName] = useState(''); 
    const { currentUser, addedPacks } = useUser();
    const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
    const hasPreloaded = useRef(false);
    const [previewingEmoji, setPreviewingEmoji] = useState(null);
    const longPressTimerRef = useRef(null);
    const longPressTriggeredRef = useRef(false);
    // --- НАЧАЛО ИСПРАВЛЕНИЯ ---
    const [searchQuery, setSearchQuery] = useState('');
    // --- КОНЕЦ ИСПРАВЛЕНИЯ ---

    const userEmojiPacks = useMemo(() => {
        return addedPacks.filter(pack => pack.type === 'emoji');
    }, [addedPacks]);

    useEffect(() => {
        if (userEmojiPacks.length > 0) {
            setActivePackName(userEmojiPacks[0].name);
        } else {
            setActivePackName('');
        }
    }, [userEmojiPacks]);


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
            if (item.imageUrl) {
                setPreviewingEmoji(item.imageUrl);
                longPressTriggeredRef.current = true;
            }
        }, 400);
    };

    const handleMouseUp = (item) => {
        clearTimeout(longPressTimerRef.current);
        if (!longPressTriggeredRef.current) {
            handleReactionSelect(item.imageUrl);
        }
    };
    
    const handleMouseLeave = () => {
        clearTimeout(longPressTimerRef.current);
    };
    
    const activeEmojis = useMemo(() => {
        const pack = userEmojiPacks.find(p => p.name === activePackName);
        return pack?.items || [];
    }, [activePackName, userEmojiPacks]);

    // --- НАЧАЛО ИСПРАВЛЕНИЯ ---
    useEffect(() => {
        setSearchQuery('');
    }, [activeTab, activePackName]);

    const filteredEmojis = useMemo(() => {
        if (!searchQuery.trim()) {
            return activeEmojis;
        }
        return activeEmojis.filter(emoji => 
            emoji.name && emoji.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [activeEmojis, searchQuery]);
    // --- КОНЕЦ ИСПРАВЛЕНИЯ ---


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
                        className="ios-glass-popover p-3 rounded-xl shadow-lg w-auto max-w-md"
                        {...attrs}
                    >
                        <div className="flex items-center space-x-1 p-1 mb-2 bg-slate-200/50 dark:bg-slate-700/50 rounded-lg">
                            <button onClick={() => setActiveTab('regular')} className={`flex-1 px-3 py-1 text-xs font-semibold rounded-md transition-colors ${activeTab === 'regular' ? 'bg-white dark:bg-slate-600 shadow' : ''}`}>Обычные</button>
                            <button onClick={handlePremiumTabClick} className={`flex-1 px-3 py-1 text-xs font-semibold rounded-md transition-colors flex items-center justify-center space-x-1 ${activeTab === 'premium' ? 'bg-white dark:bg-slate-600 shadow' : ''}`}>
                                <Sparkles size={14} className="text-yellow-400" />
                                <span>Premium</span>
                            </button>
                        </div>
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
                                {activeTab === 'premium' && (
                                    <div>
                                        {userEmojiPacks.length > 0 ? (
                                            <>
                                                <div className="flex items-center space-x-1 p-1 mb-2 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-x-auto">
                                                    {userEmojiPacks.map(pack => (
                                                        <button
                                                            key={pack.name}
                                                            onClick={() => setActivePackName(pack.name)}
                                                            className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors flex-shrink-0 ${activePackName === pack.name ? 'bg-blue-500 text-white' : 'hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                                                        >
                                                            {pack.name}
                                                        </button>
                                                    ))}
                                                </div>
                                                {/* --- НАЧАЛО ИСПРАВЛЕНИЯ --- */}
                                                <div className="relative mb-2">
                                                    <Search size={16} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                                    <input 
                                                        type="text"
                                                        placeholder="Поиск эмодзи..."
                                                        value={searchQuery}
                                                        onChange={(e) => setSearchQuery(e.target.value)}
                                                        className="w-full pl-7 pr-2 py-1 text-xs bg-slate-100 dark:bg-slate-800 rounded-md"
                                                    />
                                                </div>
                                                <div className="grid grid-cols-5 gap-2 max-h-48 overflow-y-auto p-2">
                                                    {filteredEmojis.length > 0 ? filteredEmojis.map(emoji => (
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
                                                    )) : (
                                                        <p className="col-span-5 text-center text-xs text-slate-400 py-4">Ничего не найдено</p>
                                                    )}
                                                </div>
                                                {/* --- КОНЕЦ ИСПРАВЛЕНИЯ --- */}
                                                <p className="text-xs text-center text-slate-400 dark:text-slate-500 mt-2">
                                                    Удерживайте для предпросмотра
                                                </p>
                                            </>
                                        ) : (
                                            <p className="text-sm text-center text-slate-500 dark:text-slate-400 p-4">
                                                У вас нет добавленных эмодзи-паков.
                                            </p>
                                        )}
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