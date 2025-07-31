// frontend/src/components/EmojiPickerPopover.jsx

import React, { Suspense } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

const Picker = React.lazy(() => import('emoji-picker-react'));

const EmojiPickerPopover = ({ isOpen, targetRef, onEmojiClick, onClose }) => {
    if (!isOpen || !targetRef.current) {
        return null;
    }

    const rect = targetRef.current.getBoundingClientRect();
    const EMOJI_PICKER_HEIGHT = 450;
    const EMOJI_PICKER_WIDTH = 350;

    // Определяем позицию: открывать вверх или вниз
    const positionY = window.innerHeight - rect.bottom < EMOJI_PICKER_HEIGHT 
        ? rect.top - EMOJI_PICKER_HEIGHT - 10 // Сверху
        : rect.bottom + 10; // Снизу

    // Определяем позицию: слева или справа
    const positionX = window.innerWidth - rect.right < EMOJI_PICKER_WIDTH
        ? rect.right - EMOJI_PICKER_WIDTH // Слева от кнопки
        : rect.left; // Справа от кнопки

    return ReactDOM.createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    style={{
                        position: 'fixed',
                        top: `${positionY}px`,
                        left: `${positionX}px`,
                        zIndex: 100, // Высокий z-index
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <Suspense fallback={<div className="w-80 h-96 bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center justify-center">...</div>}>
                        <Picker 
                            onEmojiClick={onEmojiClick}
                            theme={localStorage.getItem('theme') === 'dark' ? 'dark' : 'light'}
                            width={EMOJI_PICKER_WIDTH}
                            height={EMOJI_PICKER_HEIGHT}
                        />
                    </Suspense>
                </motion.div>
            )}
        </AnimatePresence>,
        document.getElementById('modal-root') // Рендерим в портал
    );
};

export default EmojiPickerPopover;