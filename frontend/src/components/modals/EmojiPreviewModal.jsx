// frontend/src/components/modals/EmojiPreviewModal.jsx

import React from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

const EmojiPreviewModal = ({ isOpen, onClose, emojiUrl }) => {
    if (!isOpen) return null;
    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            e.stopPropagation();
            onClose();
        }
    };

    return ReactDOM.createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={handleOverlayClick} 
                    className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[110]"
                >
                    <motion.img
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        src={emojiUrl}
                        alt="Emoji Preview"
                        // --- ИСПРАВЛЕНИЕ ЗДЕСЬ ---
                        className="w-80 h-80 object-contain"
                        onClick={(e) => e.stopPropagation()}
                    />
                </motion.div>
            )}
        </AnimatePresence>,
        document.getElementById('modal-root')
    );
};

export default EmojiPreviewModal;
