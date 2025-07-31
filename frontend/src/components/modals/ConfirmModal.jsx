// frontend/src/components/modals/ConfirmModal.jsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        onClick={(e) => e.stopPropagation()}
                        // ИЗМЕНЕНИЕ: Основной цвет текста теперь адаптивный
                        className="ios-glass-final w-full max-w-md p-6 rounded-3xl relative text-slate-900 dark:text-white"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <h2 className="text-xl font-bold">{title}</h2>
                            {/* ИЗМЕНЕНИЕ: Цвет крестика стал адаптивным */}
                            <button onClick={onClose} className="text-slate-500 hover:text-slate-800 dark:text-white/50 dark:hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        {/* ИЗМЕНЕНИЕ: Цвет текста сообщения стал адаптивным */}
                        <p className="text-slate-600 dark:text-white/80 mb-6">{message}</p>
                        <div className="flex justify-end space-x-4">
                            {/* ИЗМЕНЕНИЕ: Стили кнопки "Нет" стали адаптивными */}
                            <button
                                onClick={onClose}
                                className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/20 transition-colors"
                            >
                                Нет
                            </button>
                            <button
                                onClick={onConfirm}
                                // ИЗМЕНЕНИЕ: Добавлен явный цвет текста для консистентности
                                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 font-semibold text-white transition-colors"
                            >
                                Да
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default ConfirmModal;