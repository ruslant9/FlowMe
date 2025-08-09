// frontend/src/components/chat/PinnedMessagesCarousel.jsx

import React, { useState } from 'react';
import { Pin, X, Image as ImageIcon, Music, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = import.meta.env.VITE_API_URL;

const PinnedMessagesCarousel = ({ messages, onJumpToMessage, onUnpin }) => {
    const [[page, direction], setPage] = useState([0, 0]);

    if (!messages || messages.length === 0) return null;

    const paginate = (newDirection) => {
        const newIndex = (page + newDirection + messages.length) % messages.length;
        setPage([newIndex, newDirection]);
        
        const newMessageId = messages[newIndex]?._id;
        if (newMessageId && onJumpToMessage) {
            onJumpToMessage(newMessageId);
        }
    };
    
    const activeMessage = messages[page];

    // --- НАЧАЛО ИСПРАВЛЕНИЯ: Улучшенная функция для превью ---
    const getMessagePreview = (message) => {
        if (message.type === 'system') {
            const parts = message.text.split(/: (.+)/);
            const actionText = parts[0];
            const quotedText = parts.length > 1 ? `: ${parts[1]}` : '';
            return <p className="truncate">{actionText}<span className="italic opacity-80">{quotedText}</span></p>;
        }
        if (message.imageUrl) {
            return (
                <div className="flex items-center space-x-1.5 truncate">
                    <ImageIcon size={14} className="flex-shrink-0" />
                    <span className="truncate">{message.text || 'Изображение'}</span>
                </div>
            );
        }
        if (message.text) return <p className="truncate">{message.text}</p>;
        if (message.attachedTrack) return <div className="flex items-center truncate"><Music size={14} className="mr-1.5 flex-shrink-0"/>Трек: {message.attachedTrack.title}</div>;
        return <p>Вложение</p>;
    };
    // --- КОНЕЦ ИСПРАВЛЕНИЯ ---


    const variants = {
      enter: (direction) => ({ opacity: 0, x: direction > 0 ? 20 : -20 }),
      center: { zIndex: 1, opacity: 1, x: 0 },
      exit: (direction) => ({ zIndex: 0, opacity: 0, x: direction < 0 ? 20 : -20 }),
    };

    return (
        <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="flex-shrink-0 p-3 border-b border-slate-200 dark:border-slate-700/50 bg-slate-100/50 dark:bg-slate-800/50 flex items-center justify-between"
        >
            <div className="flex items-center space-x-3 text-left min-w-0 group flex-1">
                <Pin className="text-blue-500 flex-shrink-0" size={20} />
                <div 
                    onClick={() => onJumpToMessage(activeMessage._id)} 
                    className="flex-1 min-w-0 cursor-pointer"
                >
                    <p className="font-bold text-blue-500 group-hover:underline text-sm">
                        Закрепленное сообщение {messages.length > 1 ? `(${page + 1}/${messages.length})` : ''}
                    </p>
                    <div className="text-sm text-slate-600 dark:text-slate-300 relative h-5 w-full">
                         <AnimatePresence initial={false} custom={direction}>
                            <motion.div
                                key={page}
                                custom={direction}
                                variants={variants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ x: { type: 'spring', stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } }}
                                className="absolute inset-0"
                            >
                                {getMessagePreview(activeMessage)}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </div>
            <div className="flex items-center">
                {messages.length > 1 && (
                    <>
                        <button onClick={() => paginate(-1)} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"><ChevronLeft size={18}/></button>
                        <button onClick={() => paginate(1)} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"><ChevronRight size={18}/></button>
                    </>
                )}
                <button onClick={() => onUnpin(activeMessage._id)} className="p-2 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700">
                    <X size={18} />
                </button>
            </div>
        </motion.div>
    );
};

export default PinnedMessagesCarousel;