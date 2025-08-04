// frontend/src/components/workshop/PackPreviewModal.jsx

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import ReactDOM from 'react-dom';
// --- НАЧАЛО ИСПРАВЛЕНИЯ: Импортируем Link ---
import { Link } from 'react-router-dom';
// --- КОНЕЦ ИСПРАВЛЕНИЯ ---

const PackPreviewModal = ({ isOpen, onClose, pack }) => {
    if (!isOpen || !pack) return null;

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const isSticker = pack.type === 'sticker';

    return ReactDOM.createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={handleOverlayClick}
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[120] p-4"
                >
                    <motion.div
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.9, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="ios-glass-final w-full max-w-2xl p-6 rounded-3xl flex flex-col text-slate-900 dark:text-white max-h-[85vh]"
                    >
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h2 className="text-xl font-bold">{pack.name}</h2>
                                {/* --- НАЧАЛО ИСПРАВЛЕНИЯ: Оборачиваем имя автора в Link --- */}
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    от{' '}
                                    <Link
                                        to={`/profile/${pack.creator._id}`}
                                        onClick={onClose}
                                        className="font-semibold hover:underline"
                                    >
                                        {pack.creator.username}
                                    </Link>
                                </p>
                                {/* --- КОНЕЦ ИСПРАВЛЕНИЯ --- */}
                            </div>
                            <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10"><X /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto -mr-2 pr-2">
                            <div className={`grid gap-3 ${isSticker ? 'grid-cols-4' : 'grid-cols-6'}`}>
                                {pack.items.map(item => (
                                    <div key={item._id} className="aspect-square bg-slate-200/50 dark:bg-slate-900/50 rounded-lg flex items-center justify-center p-2">
                                        <img src={item.imageUrl} alt="" className="max-w-full max-h-full object-contain" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.getElementById('modal-root')
    );
};

export default PackPreviewModal;