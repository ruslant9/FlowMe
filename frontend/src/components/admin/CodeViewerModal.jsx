// frontend/src/components/admin/CodeViewerModal.jsx --- НОВЫЙ ФАЙЛ ---

import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clipboard, Check } from 'lucide-react';
import toast from 'react-hot-toast';

const CodeViewerModal = ({ isOpen, onClose, title, code }) => {
    const [copyStatus, setCopyStatus] = useState('copy'); // 'copy', 'copied'

    const handleCopy = () => {
        navigator.clipboard.writeText(code).then(() => {
            setCopyStatus('copied');
            toast.success('Код скопирован в буфер обмена!');
            setTimeout(() => setCopyStatus('copy'), 2000);
        }, () => {
            toast.error('Не удалось скопировать код.');
        });
    };
    
    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[200] p-4"
            >
                <motion.div
                    initial={{ scale: 0.95, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.95, y: -20 }}
                    onClick={(e) => e.stopPropagation()}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="ios-glass-final w-full max-w-4xl p-6 rounded-3xl flex flex-col text-slate-900 dark:text-white max-h-[90vh]"
                >
                    <div className="flex justify-between items-center mb-4 flex-shrink-0">
                        <h2 className="text-xl font-bold">{title}</h2>
                        <div className="flex items-center space-x-2">
                             <button onClick={handleCopy} className="flex items-center space-x-2 px-3 py-1.5 text-sm font-semibold rounded-lg bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 transition-colors">
                                {copyStatus === 'copy' ? <Clipboard size={16} /> : <Check size={16} className="text-green-500" />}
                                <span>{copyStatus === 'copy' ? 'Копировать' : 'Скопировано!'}</span>
                            </button>
                            <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10"><X /></button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto bg-slate-100 dark:bg-slate-800 rounded-lg p-4 -mx-2">
                        <pre className="text-sm">
                            <code className="language-jsx whitespace-pre-wrap break-all">
                                {code}
                            </code>
                        </pre>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>,
        document.getElementById('modal-root')
    );
};

export default CodeViewerModal;