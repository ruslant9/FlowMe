// frontend/src/context/EmojiPickerProvider.jsx --- ИСПРАВЛЕННЫЙ ФАЙЛ ---

import React, { createContext, useState, useCallback, useRef, useEffect, Suspense } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';

const Picker = React.lazy(() => import('emoji-picker-react'));

export const EmojiPickerContext = createContext(null);

export const EmojiPickerProvider = ({ children }) => {
    const [pickerState, setPickerState] = useState({
        isOpen: false,
        position: { top: 0, left: 0 },
        onEmojiClickCallback: null,
    });
    const pickerRef = useRef(null);

    const showPicker = useCallback((targetRef, onEmojiClickCallback) => {
        if (!targetRef.current) return;

        const rect = targetRef.current.getBoundingClientRect();
        const isMobile = window.innerWidth < 768;
        const pickerHeight = isMobile ? 350 : 450;
        const pickerWidth = isMobile ? window.innerWidth * 0.95 : 350;

        const top = (window.innerHeight - rect.bottom < pickerHeight) 
            ? rect.top - pickerHeight - 10 
            : rect.bottom + 10;
            
        const left = isMobile 
            ? (window.innerWidth - pickerWidth) / 2
            : rect.left;

        setPickerState({
            isOpen: true,
            position: { top, left },
            onEmojiClickCallback,
        });
    }, []);

    const hidePicker = useCallback(() => {
        setPickerState(prev => ({ ...prev, isOpen: false }));
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target)) {
                hidePicker();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [hidePicker]);
    
    // --- НАЧАЛО ИСПРАВЛЕНИЯ ---
    const value = {
        showPicker,
        hidePicker,
        isOpen: pickerState.isOpen,
    };
    // --- КОНЕЦ ИСПРАВЛЕНИЯ ---

    return (
        // --- ИЗМЕНЕНИЕ: Используем новую переменную `value` ---
        <EmojiPickerContext.Provider value={value}>
            {children}
            {ReactDOM.createPortal(
                <AnimatePresence>
                    {pickerState.isOpen && (
                        <motion.div
                            ref={pickerRef}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.15, ease: 'easeOut' }}
                            style={{
                                position: 'fixed',
                                top: `${pickerState.position.top}px`,
                                left: `${pickerState.position.left}px`,
                                zIndex: 120, // Очень высокий z-index
                            }}
                        >
                            <Suspense fallback={<div className="w-[350px] h-[450px] bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center justify-center"><Loader2 className="animate-spin"/></div>}>
                                <Picker 
                                    onEmojiClick={pickerState.onEmojiClickCallback}
                                    theme={localStorage.getItem('theme') === 'dark' ? 'dark' : 'light'}
                                    width={window.innerWidth < 768 ? '95vw' : 350}
                                    height={window.innerWidth < 768 ? 350 : 450}
                                    autoFocusSearch={false} // Важно для предотвращения авто-фокуса
                                />
                            </Suspense>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.getElementById('modal-root')
            )}
        </EmojiPickerContext.Provider>
    );
};