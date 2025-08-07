// frontend/src/components/EmojiPickerPopover.jsx

import React, { Suspense, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

const Picker = React.lazy(() => import('emoji-picker-react'));

const EmojiPickerPopover = ({ isOpen, targetRef, onEmojiClick, onClose }) => {
    // --- ИСПРАВЛЕНИЕ: Переносим всю логику рендеринга внутрь AnimatePresence, чтобы она была доступна, когда isOpen=true ---
    const isMobile = useMemo(() => window.innerWidth < 768, []);

    const getPickerPosition = () => {
        if (!targetRef.current || isMobile) return {};
        const rect = targetRef.current.getBoundingClientRect();
        const EMOJI_PICKER_HEIGHT = 450;
        const EMOJI_PICKER_WIDTH = 350;

        const positionY = window.innerHeight - rect.bottom < EMOJI_PICKER_HEIGHT 
            ? rect.top - EMOJI_PICKER_HEIGHT - 10 
            : rect.bottom + 10; 

        const positionX = window.innerWidth - rect.right < EMOJI_PICKER_WIDTH
            ? rect.right - EMOJI_PICKER_WIDTH
            : rect.left;
            
        return { top: `${positionY}px`, left: `${positionX}px` };
    };

    if (!isOpen) {
        return null;
    }

    return ReactDOM.createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* --- ИСПРАВЛЕНИЕ: Добавляем фон-затемнение только для мобильных --- */}
                    {isMobile && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={onClose}
                            className="fixed inset-0 bg-black/30 z-[120]"
                        />
                    )}
                    <motion.div
                        // --- ИСПРАВЛЕНИЕ: Добавляем атрибут для отслеживания кликов ---
                        data-emoji-picker="true"
                        // --- ИСПРАВЛЕНИЕ: Адаптивные стили и анимация ---
                        initial={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95, y: 10 }}
                        animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
                        exit={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                        style={isMobile ? {
                            position: 'fixed',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            zIndex: 130,
                        } : {
                            position: 'fixed',
                            ...getPickerPosition(),
                            zIndex: 130,
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Suspense fallback={<div className="w-full h-[350px] bg-slate-200 dark:bg-slate-700 rounded-t-2xl md:rounded-lg flex items-center justify-center">...</div>}>
                            <div className={isMobile ? "bg-slate-100 dark:bg-slate-800 rounded-t-2xl overflow-hidden" : ""}>
                                <Picker 
                                    onEmojiClick={(emojiObject, event) => {
                                        onEmojiClick(emojiObject, event);
                                        // Не закрываем на мобильных, чтобы можно было выбрать несколько
                                        if (!isMobile) {
                                            onClose();
                                        }
                                    }}
                                    theme={localStorage.getItem('theme') === 'dark' ? 'dark' : 'light'}
                                    width={isMobile ? '100%' : 350}
                                    height={isMobile ? 350 : 450}
                                    searchPlaceholder="Поиск"
                                    previewConfig={{ showPreview: !isMobile }}
                                />
                            </div>
                        </Suspense>
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.getElementById('modal-root')
    );
};

export default EmojiPickerPopover;