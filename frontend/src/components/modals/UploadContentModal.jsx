// frontend/src/components/modals/UploadContentModal.jsx

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import AdminUploadPanel from '../admin/AdminUploadPanel';
import ReactDOM from 'react-dom';

const UploadContentModal = ({ isOpen, onClose }) => {
    
    // Функция, которая будет вызвана после успешной отправки заявки
    const handleSuccess = () => {
        // Можно добавить обновление данных, но пока просто закроем окно
        onClose();
    };

    return ReactDOM.createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start md:items-center justify-center pt-20 px-4 pb-4 z-[110]"
                >
                    <motion.div
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.9, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="ios-glass-final w-full max-w-2xl p-6 rounded-3xl flex flex-col text-slate-900 dark:text-white max-h-[90vh]"
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Предложить контент</h2>
                            <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"><X /></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto pr-2 -mr-4">
                            <AdminUploadPanel onSuccess={handleSuccess} />
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.getElementById('modal-root')
    );
};

export default UploadContentModal;