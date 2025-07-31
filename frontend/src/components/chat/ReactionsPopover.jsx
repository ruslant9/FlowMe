// frontend/src/components/chat/ReactionsPopover.jsx

import React, { useState, useEffect, useRef } from 'react';
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
    const [activePack, setActivePack] = useState(emojiPacks[1].name);
    const { currentUser } = useUser();
    const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
    const hasPreloaded = useRef(false);
    const [previewingEmoji, setPreviewingEmoji] = useState(null);
    const longPressTimerRef = useRef(null);
    const longPressTriggeredRef = useRef(false);

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

    const handleReactionSelect = (reaction) => {
        onSelect(reaction);
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
            handleReactionSelect(emoji.url);
        }
    };
    
    const handleMouseLeave = () => {
        clearTimeout(longPressTimerRef.current);
    };
    
    const activeEmojis = emojiPacks.find(p => p.name === activePack)?.emojis || [];

    return (
        <>
            <PremiumRequiredModal isOpen={isPremiumModalOpen} onClose={() => setIsPremiumModalOpen(false)} />
            <EmojiPreviewModal isOpen={!!previewingEmoji} onClose={() => setPreviewingEmoji(null)} emojiUrl={previewingEmoji} />
            <Tippy
                interactive
                placement="top"
                delay={[100, 100]}
                // --- НАЧАЛО ИЗМЕНЕНИЯ: Добавляем onClickOutside ---
                onClickOutside={(instance, event) => {
                    // Проверяем, был ли клик по оверлею нашего модального окна
                    const isClickOnPreviewOverlay = event.target.closest('.fixed.inset-0.bg-black\\/80');
                    if (isClickOnPreviewOverlay) {
                        // Если да, то НЕ закрываем Tippy
                        return false; 
                    }
                    // В противном случае, позволяем Tippy закрыться
                    instance.hide();
                }}
                // --- КОНЕЦ ИЗМЕНЕНИЯ ---
                render={attrs => (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.9 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className="ios-glass-popover p-2 rounded-xl shadow-lg w-auto max-w-xs"
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
                                                onClick={() => handleReactionSelect(emoji)}
                                                className="p-1.5 rounded-full text-2xl transition-transform duration-100 hover:scale-125"
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {activeTab === 'premium' && (
                                    <div>
                                        <div className="flex items-center space-x-1 p-1 mb-2 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-x-auto">
                                            {emojiPacks.slice(1).map(pack => (
                                                <button
                                                    key={pack.name}
                                                    onClick={() => setActivePack(pack.name)}
                                                    className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors flex-shrink-0 ${activePack === pack.name ? 'bg-blue-500 text-white' : 'hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                                                >
                                                    {pack.name}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto p-1">
                                            {activeEmojis.map(emoji => (
                                                <button
                                                    key={emoji.id}
                                                    onMouseDown={() => handleMouseDown(emoji)}
                                                    onMouseUp={() => handleMouseUp(emoji)}
                                                    onMouseLeave={handleMouseLeave}
                                                    onTouchStart={() => handleMouseDown(emoji)}
                                                    onTouchEnd={() => handleMouseUp(emoji)}
                                                    className="p-1 rounded-full transition-transform duration-100 hover:scale-125"
                                                    title={emoji.name}
                                                >
                                                    <img src={emoji.url} alt={emoji.name} className="w-8 h-8 object-contain"/>
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