// frontend/src/context/EmojiPickerProvider.jsx --- ИСПРАВЛЕННЫЙ ФАЙЛ ---

import React, { createContext, useState, useCallback, useRef, useEffect, Suspense } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import useMediaQuery from '../hooks/useMediaQuery';

const Picker = React.lazy(() => import('emoji-picker-react'));

// --- НАЧАЛО ИЗМЕНЕНИЯ: Увеличиваем высоту панели на мобильных устройствах ---
// Было 350, стало 450. Это обеспечит примерно 5-6 строк смайликов.
const EMOJI_PICKER_HEIGHT_MOBILE = 450;
// --- КОНЕЦ ИЗМЕНЕНИЯ ---

export const EmojiPickerContext = createContext(null);

export const EmojiPickerProvider = ({ children }) => {
    const [pickerState, setPickerState] = useState({
        isOpen: false,
        position: { top: 0, left: 0 },
        onEmojiClickCallback: null,
    });
    const pickerRef = useRef(null);
    const isMobile = useMediaQuery('(max-width: 767px)');

    const showPicker = useCallback((targetRef, onEmojiClickCallback) => {
        if (!targetRef.current) return;

        const rect = targetRef.current.getBoundingClientRect();
        const pickerHeight = isMobile ? EMOJI_PICKER_HEIGHT_MOBILE : 450;
        const pickerWidth = isMobile ? window.innerWidth : 350;

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
    }, [isMobile]);

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
    
    const value = {
        showPicker,
        hidePicker,
        isOpen: pickerState.isOpen,
    };
    
    const pickerStyle = isMobile ? {
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 130,
    } : {
        position: 'fixed',
        top: `${pickerState.position.top}px`,
        left: `${pickerState.position.left}px`,
        zIndex: 120,
    };

    const initialAnimation = isMobile ? { y: "100%" } : { opacity: 0, scale: 0.9 };
    const animateAnimation = isMobile ? { y: 0 } : { opacity: 1, scale: 1 };
    const exitAnimation = isMobile ? { y: "100%" } : { opacity: 0, scale: 0.9 };


    return (
        <EmojiPickerContext.Provider value={value}>
            {children}
            {ReactDOM.createPortal(
                <AnimatePresence>
                    {pickerState.isOpen && (
                        <motion.div
                            ref={pickerRef}
                            initial={initialAnimation}
                            animate={animateAnimation}
                            exit={exitAnimation}
                            transition={{ duration: 0.25, ease: 'easeOut' }}
                            style={pickerStyle}
                        >
                            <Suspense fallback={<div className="w-full h-[350px] bg-slate-200 dark:bg-slate-700 rounded-t-2xl md:rounded-lg flex items-center justify-center"><Loader2 className="animate-spin"/></div>}>
                                <div className={isMobile ? "bg-slate-100 dark:bg-slate-800 rounded-t-2xl overflow-hidden" : ""}>
                                    <Picker 
                                        onEmojiClick={pickerState.onEmojiClickCallback}
                                        theme={localStorage.getItem('theme') === 'dark' ? 'dark' : 'light'}
                                        width={isMobile ? '100%' : 350}
                                        height={isMobile ? EMOJI_PICKER_HEIGHT_MOBILE : 450}
                                        autoFocusSearch={false}
                                        previewConfig={{ showPreview: !isMobile }}
                                    />
                                </div>
                            </Suspense>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.getElementById('modal-root')
            )}
        </EmojiPickerContext.Provider>
    );
};