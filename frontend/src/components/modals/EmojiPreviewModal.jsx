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
    initial={{ scale: 0.8, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    exit={{ scale: 0.8, opacity: 0 }}
    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    className="w-64 h-64 flex items-center justify-center bg-white/10 rounded-lg"
    onClick={(e) => e.stopPropagation()}
>
    <img
        src={emojiUrl}
        alt="Emoji Preview"
        className="max-w-full max-h-full object-contain"
    />
</motion.div>
            )}
        </AnimatePresence>,
        document.getElementById('modal-root')
    );
};

export default EmojiPreviewModal;