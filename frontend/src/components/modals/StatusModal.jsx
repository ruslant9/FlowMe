// frontend/src/components/modals/StatusModal.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Loader2 } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL;

const StatusModal = ({ isOpen, onClose, currentStatus, onSave }) => {
    const [statusText, setStatusText] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setStatusText(currentStatus || '');
        }
    }, [isOpen, currentStatus]);

    const handleSave = async () => {
        setLoading(true);
        const toastId = toast.loading('Сохранение статуса...');
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${API_URL}/api/user/profile`, { status: statusText }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Статус обновлен!', { id: toastId });
            onSave(statusText); // Передаем новый статус наверх
            onClose();
        } catch (error) {
            toast.error('Ошибка при сохранении статуса.', { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                >
                    <motion.div
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.9, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="ios-glass-final w-full max-w-md p-6 rounded-3xl flex flex-col text-slate-900 dark:text-white"
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Установить статус</h2>
                            <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10"><X /></button>
                        </div>
                        
                        <textarea
                            value={statusText}
                            onChange={(e) => setStatusText(e.target.value)}
                            maxLength="100"
                            placeholder="Что у вас на уме?"
                            className="w-full h-24 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                        />
                        <p className="text-right text-xs text-slate-400 mt-1">{statusText.length} / 100</p>
                        
                        <div className="flex justify-end mt-6">
                            <button
                                onClick={handleSave}
                                disabled={loading}
                                className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
                            >
                                {loading ? <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" /> : <Save size={18} className="mr-2" />}
                                Сохранить
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default StatusModal;