// frontend/src/components/chat/SmartDateIndicator.jsx

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const formatDate = (date) => {
    const now = new Date();
    const targetDate = new Date(date);
    
    if (now.toDateString() === targetDate.toDateString()) {
        return 'Сегодня';
    }
    
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (yesterday.toDateString() === targetDate.toDateString()) {
        return 'Вчера';
    }
    
    return targetDate.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: now.getFullYear() !== targetDate.getFullYear() ? 'numeric' : undefined,
    });
};

const SmartDateIndicator = ({ visible, date, onClick }) => {
    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ y: -40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -40, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="absolute top-4 left-1/2 -translate-x-1/2 z-20"
                >
                    <button 
                        onClick={onClick}
                        className="px-4 py-1.5 bg-slate-200/80 dark:bg-slate-700/80 backdrop-blur-sm rounded-full text-sm font-semibold shadow-md"
                    >
                        {formatDate(date)}
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default SmartDateIndicator;