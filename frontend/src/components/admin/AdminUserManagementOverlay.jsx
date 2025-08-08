// frontend/src/components/admin/AdminUserManagementOverlay.jsx

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, ShieldAlert, ShieldCheck, ArrowLeft, Trash2, Crown } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import Avatar from '../Avatar';
import { useUser } from '../../hooks/useUser'; // <-- ИМПОРТ ДЛЯ ПОЛУЧЕНИЯ ДАННЫХ ТЕКУЩЕГО АДМИНА
import { useModal } from '../../hooks/useModal'; // <-- ИМПОРТ ДЛЯ ПОДТВЕРЖДЕНИЙ

const API_URL = import.meta.env.VITE_API_URL;

const AdminUserManagementOverlay = ({ isOpen, onClose, user, onSuccess }) => {
    const { currentUser } = useUser(); // <-- Получаем текущего пользователя (админа)
    const { showConfirmation } = useModal(); // <-- Получаем функцию подтверждения

    const [banReason, setBanReason] = useState('');
    const [banDuration, setBanDuration] = useState('permanent');
    const [premiumDuration, setPremiumDuration] = useState(1); // <-- Новое состояние для срока Premium
    const [loadingAction, setLoadingAction] = useState(false);
    const [actionType, setActionType] = useState(''); // 'ban', 'unban', 'delete', 'premium'

    useEffect(() => {
        if (isOpen && user) {
            setBanReason(user.banInfo?.banReason || '');
            const expires = user.banInfo?.banExpires;
            const isCurrentlyBanned = user.banInfo?.isBanned;
            if (isCurrentlyBanned) setBanDuration(expires ? 'custom' : 'permanent');
            else setBanDuration('permanent');
        }
    }, [isOpen, user]);
    
    // --- УНИВЕРСАЛЬНЫЙ ОБРАБОТЧИК ДЕЙСТВИЙ ---
    const handleAction = async (type, payload = {}) => {
        setLoadingAction(true);
        setActionType(type);
        const toastId = toast.loading('Выполнение...');

        try {
            const token = localStorage.getItem('token');
            let response;

            switch (type) {
                case 'ban':
                case 'unban':
                    response = await axios.post(`${API_URL}/api/admin/users/${user._id}/ban`, payload, { headers: { Authorization: `Bearer ${token}` } });
                    break;
                case 'delete':
                    response = await axios.delete(`${API_URL}/api/admin/users/${user._id}`, { headers: { Authorization: `Bearer ${token}` } });
                    break;
                case 'premium':
                    response = await axios.post(`${API_URL}/api/admin/users/${user._id}/grant-premium`, payload, { headers: { Authorization: `Bearer ${token}` } });
                    break;
                default:
                    throw new Error('Неизвестное действие');
            }
            
            toast.success(response.data.message || 'Действие выполнено!', { id: toastId });
            onSuccess(); // Обновляем список пользователей
            onClose(); // Закрываем модальное окно

        } catch (error) {
            toast.error(error.response?.data?.message || 'Произошла ошибка.', { id: toastId });
        } finally {
            setLoadingAction(false);
            setActionType('');
        }
    };
    
    // --- ОБРАБОТЧИКИ КНОПОК ---

    const handleBanClick = () => {
        let banExpires = null;
        if (banDuration !== 'permanent') {
            const days = { '1_day': 1, '7_days': 7, '30_days': 30 }[banDuration];
            banExpires = new Date();
            banExpires.setDate(banExpires.getDate() + days);
        }
        handleAction('ban', { isBanned: true, banReason, banExpires });
    };

    const handleUnbanClick = () => {
        handleAction('unban', { isBanned: false, banReason: null, banExpires: null });
    };

    const handleDeleteClick = () => {
        showConfirmation({
            title: `Удалить аккаунт ${user.username}?`,
            message: 'Это действие необратимо. Все данные пользователя будут удалены навсегда. Вы уверены?',
            onConfirm: () => handleAction('delete')
        });
    };
    
    const handlePremiumClick = (months) => {
        handleAction('premium', { durationMonths: months });
    };

    if (!isOpen || !user) return null;

    const isTargetAdmin = user.role === 'junior_admin' || user.role === 'super_admin';

    return ReactDOM.createPortal(
        <AnimatePresence>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
                className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()} transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="ios-glass-final w-full max-w-lg p-6 rounded-3xl flex flex-col text-slate-900 dark:text-white space-y-6">
                    
                    <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                            <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"><ArrowLeft /></button>
                            <h2 className="text-2xl font-bold">Управление пользователем</h2>
                        </div>
                    </div>

                    <div className="flex items-center space-x-4 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                        <Avatar username={user.username} fullName={user.fullName} avatarUrl={user.avatar} size="lg" />
                        <div>
                            <p className="text-xl font-bold">{user.fullName || user.username}</p>
                            <p className="text-md text-slate-500">{user.email}</p>
                        </div>
                    </div>

                    {/* --- СЕКЦИЯ БАНА --- */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-lg">Блокировка</h3>
                        {isTargetAdmin ? (
                             <p className="text-center p-4 bg-yellow-500/10 text-yellow-600 dark:text-yellow-300 rounded-lg text-sm">Нельзя заблокировать другого администратора.</p>
                        ) : user.banInfo?.isBanned ? (
                            <div className="text-center">
                                <p className="mb-4">Этот пользователь уже забанен. Вы можете снять блокировку.</p>
                                <button onClick={handleUnbanClick} disabled={loadingAction} className="w-full flex items-center justify-center px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50">
                                    {loadingAction && actionType === 'unban' ? <Loader2 className="animate-spin"/> : <><ShieldCheck className="mr-2"/>Снять блокировку</>}
                                </button>
                            </div>
                        ) : (
                             <>
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
                                 <div className="flex justify-end">
                                    <button onClick={handleBanClick} disabled={loadingAction} className="flex items-center justify-center px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50">
                                        {loadingAction && actionType === 'ban' ? <Loader2 className="animate-spin"/> : <><ShieldAlert className="mr-2"/>Заблокировать</>}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                    
                    {/* --- СЕКЦИЯ PREMIUM --- */}
                    {currentUser.role === 'super_admin' && (
                        <div className="space-y-4 pt-6 border-t border-slate-200 dark:border-slate-700">
                            <h3 className="font-bold text-lg flex items-center space-x-2"><Crown className="text-yellow-400" /><span>Выдать Premium</span></h3>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {[1, 3, 6, 12].map(months => (
                                    <button key={months} onClick={() => handlePremiumClick(months)} disabled={loadingAction}
                                        className="px-4 py-2 bg-yellow-400/20 text-yellow-700 dark:text-yellow-300 font-semibold rounded-lg hover:bg-yellow-400/40 disabled:opacity-50">
                                        {loadingAction && actionType === 'premium' ? <Loader2 className="animate-spin mx-auto"/> : `${months} мес.`}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {/* --- СЕКЦИЯ УДАЛЕНИЯ --- */}
                    {currentUser.role === 'super_admin' && (
                        <div className="space-y-4 pt-6 border-t border-slate-200 dark:border-slate-700">
                             <h3 className="font-bold text-lg text-red-500">Опасная зона</h3>
                             <div className="flex justify-between items-center p-4 bg-red-500/10 rounded-lg">
                                 <div>
                                     <p className="font-semibold">Удаление аккаунта</p>
                                     <p className="text-sm text-red-600 dark:text-red-300">Это действие необратимо.</p>
                                 </div>
                                 <button onClick={handleDeleteClick} disabled={loadingAction} className="flex items-center justify-center px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50">
                                     {loadingAction && actionType === 'delete' ? <Loader2 className="animate-spin"/> : <><Trash2 className="mr-2" size={16}/>Удалить</>}
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