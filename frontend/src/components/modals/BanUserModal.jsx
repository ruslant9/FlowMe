// frontend/components/modals/BanUserModal.jsx --- НОВЫЙ ФАЙЛ ---

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, ShieldAlert, ShieldCheck } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import Avatar from '../Avatar';

const API_URL = import.meta.env.VITE_API_URL;

const BanUserModal = ({ isOpen, onClose, user, onSuccess }) => {
    const [banReason, setBanReason] = useState('');
    const [banDuration, setBanDuration] = useState('permanent'); // permanent, 1_day, 7_days, 30_days
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setBanReason(user.banInfo?.banReason || '');
            // Логика для определения текущей длительности бана (упрощенная)
            setBanDuration(user.banInfo?.banExpires ? 'custom' : (user.banInfo?.isBanned ? 'permanent' : 'permanent'));
        }
    }, [isOpen, user]);

    const handleBan = async () => {
        setLoading(true);
        const toastId = toast.loading('Применение бана...');

        let banExpires = null;
        if (banDuration !== 'permanent') {
            const days = { '1_day': 1, '7_days': 7, '30_days': 30 }[banDuration];
            banExpires = new Date();
            banExpires.setDate(banExpires.getDate() + days);
        }

        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/api/admin/users/${user._id}/ban`, 
                { isBanned: true, banReason, banExpires }, 
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success('Пользователь забанен!', { id: toastId });
            onSuccess();
        } catch (error) {
            toast.error('Ошибка при бане.', { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    const handleUnban = async () => {
        setLoading(true);
        const toastId = toast.loading('Снятие бана...');
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/api/admin/users/${user._id}/ban`, 
                { isBanned: false, banReason: null, banExpires: null },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success('Пользователь разбанен!', { id: toastId });
            onSuccess();
        } catch (error) {
            toast.error('Ошибка при разбане.', { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="ios-glass-final w-full max-w-md p-6 rounded-3xl flex flex-col text-slate-900 dark:text-white">
                        
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Управление пользователем</h2>
                            <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10"><X /></button>
                        </div>

                        <div className="flex items-center space-x-3 mb-4 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                            <Avatar username={user.username} size="md" />
                            <div>
                                <p className="font-bold">{user.fullName || user.username}</p>
                                <p className="text-sm text-slate-500">{user.email}</p>
                            </div>
                        </div>

                        {user.banInfo?.isBanned ? (
                            <div className="text-center">
                                <p className="mb-4">Этот пользователь уже забанен. Вы можете снять блокировку.</p>
                                <button onClick={handleUnban} disabled={loading} className="w-full flex items-center justify-center px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50">
                                    {loading ? <Loader2 className="animate-spin"/> : <><ShieldCheck className="mr-2"/>Снять блокировку</>}
                                </button>
                            </div>
                        ) : (
                             <div className="space-y-4">
                                <div>
                                    <label htmlFor="banReason" className="block text-sm font-semibold mb-1">Причина бана</label>
                                    <textarea id="banReason" value={banReason} onChange={(e) => setBanReason(e.target.value)} placeholder="Например: Спам, оскорбления..." className="w-full p-2 bg-slate-100 dark:bg-slate-700 rounded-lg resize-none"></textarea>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold mb-1">Срок блокировки</label>
                                    <select value={banDuration} onChange={(e) => setBanDuration(e.target.value)} className="w-full p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                                        <option value="permanent">Навсегда</option>
                                        <option value="1_day">1 день</option>
                                        <option value="7_days">7 дней</option>
                                        <option value="30_days">30 дней</option>
                                    </select>
                                </div>
                                 <div className="mt-6 flex justify-end">
                                    <button onClick={handleBan} disabled={loading} className="flex items-center justify-center px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50">
                                        {loading ? <Loader2 className="animate-spin"/> : <><ShieldAlert className="mr-2"/>Заблокировать</>}
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default BanUserModal;