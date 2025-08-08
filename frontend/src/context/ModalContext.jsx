// frontend/src/context/ModalContext.jsx
import React, { createContext, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const CustomModal = ({ isOpen, onClose, title, message, children, buttons }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                // --- НАЧАЛО ИСПРАВЛЕНИЯ: Увеличиваем z-index с z-50 до z-[100] ---
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[200] p-4"
                >
                {/* --- КОНЕЦ ИСПРАВЛЕНИЯ --- */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        onClick={(e) => e.stopPropagation()}
                        className="ios-glass-final w-full max-w-md p-6 rounded-3xl relative text-slate-900 dark:text-white"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <h2 className="text-xl font-bold">{title}</h2>
                            <button onClick={onClose} className="text-slate-500 hover:text-slate-800 dark:text-white/50 dark:hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <p className="text-slate-600 dark:text-white/80">{message}</p>
                        
                        {typeof children === 'function' ? children(onClose) : children}

                        {(!children && buttons) && (
                            <div className="flex justify-center flex-wrap gap-3 mt-6">
                                {buttons.map((btn, index) => (
                                    <button
                                        key={index}
                                        onClick={btn.onClick}
                                        className={`${btn.className} text-sm px-3.5 py-2`}
                                    >
                                        {btn.label}
                                    </button>
                                ))}
                            </div>
                        )}
                        
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};


export const ModalContext = createContext();

export const ModalProvider = ({ children }) => {
    const [modalState, setModalState] = useState({
        isOpen: false,
        title: '',
        message: '',
        buttons: [],
        children: null,
        onConfirm: () => {},
    });

    const hideConfirmation = () => {
        setModalState({ ...modalState, isOpen: false });
    };

    const showConfirmation = ({ title, message, onConfirm, buttons, children }) => {
        const enhancedButtons = buttons?.map(btn => ({
            ...btn,
            onClick: () => {
                if (btn.onClick) btn.onClick();
                hideConfirmation();
            }
        }));

        if (children) {
            setModalState({ isOpen: true, title, message, children, buttons: enhancedButtons || [] });
        } else if (buttons) {
            setModalState({ isOpen: true, title, message, children: null, buttons: enhancedButtons });
        } else {
            setModalState({
                isOpen: true,
                title,
                message,
                children: null,
                buttons: [
                    { label: 'Нет', onClick: hideConfirmation, className: "rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/20 transition-colors" },
                    { label: 'Да', onClick: () => { onConfirm(); hideConfirmation(); }, className: "rounded-lg bg-red-600 hover:bg-red-700 font-semibold text-white transition-colors" }
                ]
            });
        }
    };

    return (
        <ModalContext.Provider value={{ showConfirmation }}>
            {children}
            <CustomModal
                isOpen={modalState.isOpen}
                onClose={hideConfirmation}
                title={modalState.title}
                message={modalState.message}
                buttons={modalState.buttons}
                children={modalState.children}
            />
        </ModalContext.Provider>
    );
};