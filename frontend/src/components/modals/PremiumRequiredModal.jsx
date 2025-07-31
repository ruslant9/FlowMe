// frontend/src/components/modals/PremiumRequiredModal.jsx

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { X, Sparkles, Crown } from 'lucide-react';
import ReactDOM from 'react-dom';

const PremiumRequiredModal = ({ isOpen, onClose }) => {
    const navigate = useNavigate();

    const handleNavigate = () => {
        onClose();
        navigate('/premium');
    };

    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4" // Increased z-index
            >
                <motion.div
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    className="ios-glass-final w-full max-w-md p-6 rounded-3xl flex flex-col items-center text-center text-slate-900 dark:text-white"
                >
                    <div className="w-20 h-20 premium-gradient-bg rounded-full flex items-center justify-center mb-4">
                        <Crown size={40} className="text-white" />
                    </div>
                    <h2 className="text-2xl font-bold premium-shimmer-text mb-2">Это функция Premium</h2>
                    <p className="text-slate-600 dark:text-white/80 mb-6">
                        Получите уникальные рамки для аватара, значки у имени, акценты для профиля и многое другое с подпиской Flow PREMIUM!
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 w-full">
                        <button
                            onClick={onClose}
                            className="w-full px-6 py-3 rounded-lg bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 transition-colors font-semibold"
                        >
                            Позже
                        </button>
                        <button
                            onClick={handleNavigate}
                            className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <Sparkles size={18} />
                            <span>Узнать больше</span>
                        </button>
                    </div>
                    <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
                        <X />
                    </button>
                </motion.div>
            </motion.div>
        </AnimatePresence>,
        document.getElementById('modal-root')
    );
};

export default PremiumRequiredModal;