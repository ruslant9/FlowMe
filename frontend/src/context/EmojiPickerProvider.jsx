// frontend/src/context/EmojiPickerProvider.jsx --- ИСПРАВЛЕННЫЙ ФАЙЛ ---

import React, { createContext, useState, useCallback, useRef, useEffect, Suspense } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import useMediaQuery from '../hooks/useMediaQuery';

const Picker = React.lazy(() => import('emoji-picker-react'));

const EMOJI_PICKER_HEIGHT_MOBILE = 450;

export const EmojiPickerContext = createContext(null);

export const EmojiPickerProvider = ({ children }) => {
    const [pickerState, setPickerState] = useState({
        isOpen: false,
        position: { top: 0, left: 0 },
        onEmojiClickCallback: null,
    });
    const pickerRef = useRef(null);
    const openerRef = useRef(null);
    const isMobile = useMediaQuery('(max-width: 767px)');

    const showPicker = useCallback((targetRef, onEmojiClickCallback) => {
        if (!targetRef.current) return;
        openerRef.current = targetRef.current;

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
        openerRef.current = null;
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!pickerState.isOpen) return;

            if (openerRef.current && openerRef.current.contains(event.target)) {
                return;
            }
            if (pickerRef.current && pickerRef.current.contains(event.target)) {
                return;
            }
            hidePicker();
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [hidePicker, pickerState.isOpen]);

    const value = {
        showPicker,
        hidePicker,
        isOpen: pickerState.isOpen,
    };
    
    // --- НАЧАЛО ИСПРАВЛЕНИЯ ---
    const variants = {
        hidden: {
            ...(isMobile 
                ? { y: "100%" } 
                : { opacity: 0, scale: 0.9, y: 10 }),
            transition: { duration: 0.2, ease: 'easeOut' },
            transitionEnd: {
                display: 'none',
            },
        },
        visible: {
            ...(isMobile 
                ? { y: 0 } 
                : { opacity: 1, scale: 1, y: 0 }),
            display: 'block',
            transition: { duration: 0.25, ease: 'easeOut' },
        },
    };
    // --- КОНЕЦ ИСПРАВЛЕНИЯ ---
    
    return (
        <EmojiPickerContext.Provider value={value}>
            {children}
            {ReactDOM.createPortal(
                <motion.div
                    ref={pickerRef}
                    initial="hidden"
                    animate={pickerState.isOpen ? "visible" : "hidden"}
                    variants={variants}
                    style={{
                        position: 'fixed',
                        zIndex: 130,
                        top: isMobile ? undefined : `${pickerState.position.top}px`,
                        left: isMobile ? 0 : `${pickerState.position.left}px`,
                        right: isMobile ? 0 : undefined,
                        bottom: isMobile ? 0 : undefined,
                        pointerEvents: pickerState.isOpen ? 'auto' : 'none'
                    }}
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
                </motion.div>,
                document.getElementById('modal-root')
            )}
        </EmojiPickerContext.Provider>
    );
};