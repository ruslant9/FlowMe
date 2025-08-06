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
    
    // --- НАЧАЛО ИСПРАВЛЕНИЯ ---
    const isMobile = window.innerWidth < 480; // Точка для переключения на мобильный вид
    const EMOJI_PICKER_HEIGHT = isMobile ? 350 : 450; // Уменьшаем высоту на мобильных
    const EMOJI_PICKER_WIDTH = isMobile ? window.innerWidth * 0.95 : 350; // Ширина 95% от экрана на мобильных
    // --- КОНЕЦ ИСПРАВЛЕНИЯ ---

    // Определяем позицию: открывать вверх или вниз
    const positionY = window.innerHeight - rect.bottom < EMOJI_PICKER_HEIGHT 
        ? rect.top - EMOJI_PICKER_HEIGHT - 10 // Сверху
        : rect.bottom + 10; // Снизу

    // --- НАЧАЛО ИСПРАВЛЕНИЯ: Адаптивная позиция по горизонтали ---
    // На мобильных устройствах центрируем панель, на десктопе - выравниваем по кнопке
    const positionX = isMobile
        ? (window.innerWidth - EMOJI_PICKER_WIDTH) / 2 // Центрируем
        : window.innerWidth - rect.right < EMOJI_PICKER_WIDTH
            ? rect.right - EMOJI_PICKER_WIDTH // Слева от кнопки
            : rect.left; // Справа от кнопки
    // --- КОНЕЦ ИСПРАВЛЕНИЯ ---

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
                        zIndex: 100,
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <Suspense fallback={<div className="w-80 h-96 bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center justify-center">...</div>}>
                        <Picker 
                            onEmojiClick={onEmojiClick}
                            theme={localStorage.getItem('theme') === 'dark' ? 'dark' : 'light'}
                            // --- НАЧАЛО ИСПРАВЛЕНИЯ: Применяем адаптивные размеры ---
                            width={EMOJI_PICKER_WIDTH}
                            height={EMOJI_PICKER_HEIGHT}
                            // --- КОНЕЦ ИСПРАВЛЕНИЯ ---
                        />
                    </Suspense>
                </motion.div>
            )}
        </AnimatePresence>,
        document.getElementById('modal-root')
    );
};

export default EmojiPickerPopover;