// frontend/src/components/modals/EmojiPreviewModal.jsx

import React from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

const EmojiPreviewModal = ({ isOpen, onClose, emojiUrl }) => {
    if (!isOpen) return null;

    // --- ИЗМЕНЕНИЕ ЗДЕСЬ ---
    const handleOverlayClick = (e) => {
        // Проверяем, что клик был именно по оверлею, а не по дочерним элементам
        if (e.target === e.currentTarget) {
            e.stopPropagation(); // Останавливаем всплытие события
            onClose(); // Закрываем модальное окно
        }
    };
    // --- КОНЕЦ ИЗМЕНЕНИЯ ---

    return ReactDOM.createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    // --- ИЗМЕНЕНИЕ ЗДЕСЬ ---
                    onClick={handleOverlayClick} 
                    // --- КОНЕЦ ИЗМЕНЕНИЯ ---
                    className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[110]"
                >
                    <motion.img
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        src={emojiUrl}
                        alt="Emoji Preview"
                         className="w-128 h-128 object-contain rounded-lg"
                        onClick={(e) => e.stopPropagation()}
                    />
                </motion.div>
            )}
        </AnimatePresence>,
        document.getElementById('modal-root')
    );
};

export default EmojiPreviewModal;