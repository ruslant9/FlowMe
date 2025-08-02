// frontend/src/components/admin/AdminUserManagementOverlay.jsx --- НОВЫЙ ФАЙЛ ---

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, ShieldAlert, ShieldCheck, ArrowLeft } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import Avatar from '../Avatar';

const API_URL = import.meta.env.VITE_API_URL;

const AdminUserManagementOverlay = ({ isOpen, onClose, user, onSuccess }) => {
    const [banReason, setBanReason] = useState('');
    const [banDuration, setBanDuration] = useState('permanent');
    const [loadingAction, setLoadingAction] = useState(false);

    useEffect(() => {
        if (isOpen && user) {
            setBanReason(user.banInfo?.banReason || '');
            const expires = user.banInfo?.banExpires;
            const isCurrentlyBanned = user.banInfo?.isBanned;

            if (isCurrentlyBanned) {
                setBanDuration(expires ? 'custom' : 'permanent');
            } else {
                setBanDuration('permanent');
            }
        }
    }, [isOpen, user]);

    const handleAction = async (isBanning) => {
        setLoadingAction(true);
        const actionText = isBanning ? 'Блокировка...' : 'Снятие блокировки...';
        const toastId = toast.loading(actionText);

        let payload;
        if (isBanning) {
            let banExpires = null;
            if (banDuration !== 'permanent') {
                const days = { '1_day': 1, '7_days': 7, '30_days': 30 }[banDuration];
                banExpires = new Date();
                banExpires.setDate(banExpires.getDate() + days);
            }
            payload = { isBanned: true, banReason, banExpires };
        } else {
            payload = { isBanned: false, banReason: null, banExpires: null };
        }

        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/api/admin/users/${user._id}/ban`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(isBanning ? 'Пользователь заблокирован!' : 'Блокировка снята!', { id: toastId });
            onSuccess();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Произошла ошибка.', { id: toastId });
        } finally {
            setLoadingAction(false);
        }
    };
    
    if (!isOpen || !user) return null;

    return ReactDOM.createPortal(
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={onClose}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="ios-glass-final w-full max-w-2xl p-6 rounded-3xl flex flex-col text-slate-900 dark:text-white"
                >
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center space-x-3">
                            <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
                               <ArrowLeft />
                            </button>
                            <h2 className="text-2xl font-bold">Управление пользователем</h2>
                        </div>
                    </div>

                    <div className="flex items-center space-x-4 mb-6 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                        <Avatar username={user.username} fullName={user.fullName} avatarUrl={user.avatar} size="lg" />
                        <div>
                            <p className="text-xl font-bold">{user.fullName || user.username}</p>
                            <p className="text-md text-slate-500">{user.email}</p>
                        </div>
                    </div>

                    {user.banInfo?.isBanned ? (
                        <div className="text-center">
                            <p className="mb-4">Этот пользователь уже забанен. Вы можете снять блокировку.</p>
                            <button onClick={() => handleAction(false)} disabled={loadingAction} className="w-full flex items-center justify-center px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50">
                                {loadingAction ? <Loader2 className="animate-spin"/> : <><ShieldCheck className="mr-2"/>Снять блокировку</>}
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
                                <button onClick={() => handleAction(true)} disabled={loadingAction} className="flex items-center justify-center px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50">
                                    {loadingAction ? <Loader2 className="animate-spin"/> : <><ShieldAlert className="mr-2"/>Заблокировать</>}
                                </button>
                            </div>
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>,
        document.getElementById('modal-root')
    );
};

export default AdminUserManagementOverlay;