// frontend/src/components/chat/DeletionTimerToast.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

const DeletionTimerToast = ({ onCancel, timeLeft, forEveryone }) => {
    const radius = 12;
    const circumference = 2 * Math.PI * radius;

    return (
        <motion.div
            layout
            initial={{ y: "120%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "120%", opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 40 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 w-auto"
        >
            <div className="flex items-center space-x-4 bg-slate-800/90 backdrop-blur-sm text-white rounded-full shadow-lg p-2 pr-4">
                <div className="relative w-8 h-8 flex-shrink-0">
                    <svg className="w-full h-full" viewBox="0 0 32 32">
                        <circle
                            cx="16" cy="16" r={radius}
                            className="stroke-current text-white/20"
                            strokeWidth="3"
                            fill="transparent"
                        />
                        <motion.circle
                            cx="16" cy="16" r={radius}
                            className="stroke-current text-white"
                            strokeWidth="3" fill="transparent"
                            strokeDasharray={circumference}
                            initial={{ strokeDashoffset: (timeLeft / 5) * circumference }}
                            animate={{ strokeDashoffset: ((timeLeft - 1) / 5) * circumference }}
                            transition={{ duration: 1, ease: "linear" }}
                            transform="rotate(-90 16 16)"
                        />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">{timeLeft}</span>
                </div>
                <span className="text-sm font-semibold whitespace-nowrap">
                    {forEveryone ? "Чат будет удален для всех..." : "Чат будет очищен для вас..."}
                </span>
                <button 
                    onClick={onCancel} 
                    className="ml-auto text-sm font-bold text-blue-400 hover:underline flex-shrink-0"
                >
                    Отмена
                </button>
            </div>
        </motion.div>
    );
};

export default DeletionTimerToast;