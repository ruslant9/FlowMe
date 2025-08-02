// frontend/components/admin/AdminUserManager.jsx --- НОВЫЙ ФАЙЛ ---

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Loader2, Search, Shield, ShieldCheck, ShieldAlert, Edit, User, Mail, Calendar } from 'lucide-react';
import BanUserModal from '../modals/BanUserModal';

const API_URL = import.meta.env.VITE_API_URL;

const AdminUserManager = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const [isBanModalOpen, setIsBanModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams({ page, search });
            const res = await axios.get(`${API_URL}/api/admin/users?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(res.data.items);
            setTotalPages(res.data.totalPages);
            setPage(res.data.currentPage);
        } catch (error) {
            toast.error('Не удалось загрузить пользователей.');
        } finally {
            setLoading(false);
        }
    }, [page, search]);

    useEffect(() => {
        const debounce = setTimeout(() => {
            setPage(1);
            fetchData();
        }, 300);
        return () => clearTimeout(debounce);
    }, [search, fetchData]);

    useEffect(() => {
        fetchData();
    }, [page]);

    const handleOpenBanModal = (user) => {
        setSelectedUser(user);
        setIsBanModalOpen(true);
    };

    const handleBanSuccess = () => {
        setIsBanModalOpen(false);
        setSelectedUser(null);
        fetchData(); // Обновляем список после бана/разбана
    };

    const renderBanStatus = (user) => {
        if (user.banInfo?.isBanned) {
            const expires = user.banInfo.banExpires ? new Date(user.banInfo.banExpires) : null;
            if (expires && expires < new Date()) {
                return <span className="flex items-center text-xs text-yellow-600"><ShieldCheck size={14} className="mr-1"/>Истек</span>;
            }
            return (
                <span className="flex items-center text-xs text-red-600" title={`Причина: ${user.banInfo.banReason || 'не указана'}`}>
                    <ShieldAlert size={14} className="mr-1"/>
                    {expires ? `До ${expires.toLocaleDateString('ru-RU')}` : 'Навсегда'}
                </span>
            );
        }
        return <span className="flex items-center text-xs text-green-600"><ShieldCheck size={14} className="mr-1"/>Активен</span>;
    };

    const renderContent = () => {
        if (loading && users.length === 0) return <div className="flex justify-center p-8"><Loader2 className="animate-spin w-8 h-8" /></div>;
        if (users.length === 0) return <p className="text-center text-slate-500 p-8">Пользователи не найдены.</p>;
        
        return (
            <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[700px]">
                    <thead>
                        <tr className="border-b dark:border-slate-700">
                            <th className="p-2 font-semibold">Пользователь</th>
                            <th className="p-2 font-semibold">Email</th>
                            <th className="p-2 font-semibold">Дата регистрации</th>
                            <th className="p-2 font-semibold">Статус бана</th>
                            <th className="p-2 text-right">Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user._id} className="border-b dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800">
                                <td className="p-2">
                                    <div className="flex items-center space-x-2">
                                        <User size={14} />
                                        <span className="font-semibold">{user.fullName || user.username}</span>
                                    </div>
                                </td>
                                <td className="p-2">
                                    <div className="flex items-center space-x-2 text-slate-500">
                                        <Mail size={14} />
                                        <span>{user.email}</span>
                                    </div>
                                </td>
                                <td className="p-2">
                                     <div className="flex items-center space-x-2 text-slate-500">
                                        <Calendar size={14} />
                                        <span>{new Date(user.createdAt).toLocaleDateString('ru-RU')}</span>
                                    </div>
                                </td>
                                <td className="p-2">{renderBanStatus(user)}</td>
                                <td className="p-2">
                                    <div className="flex items-center justify-end">
                                        <button 
                                            onClick={() => handleOpenBanModal(user)} 
                                            className="flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-500/20 dark:text-yellow-300 dark:hover:bg-yellow-500/30"
                                        >
                                            <Shield size={14} />
                                            <span>Управление</span>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="space-y-4">
            {selectedUser && (
                 <BanUserModal 
                    isOpen={isBanModalOpen}
                    onClose={() => setIsBanModalOpen(false)}
                    user={selectedUser}
                    onSuccess={handleBanSuccess}
                 />
            )}
           
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск по имени, @username или почте..." className="pl-10 pr-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 w-full sm:w-72" />
                </div>
            </div>
            {renderContent()}
             {totalPages > 1 && (
                <div className="flex justify-center items-center space-x-2 mt-4">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 rounded bg-slate-200 dark:bg-slate-700 disabled:opacity-50">Назад</button>
                    <span>Стр. {page} из {totalPages}</span>
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 rounded bg-slate-200 dark:bg-slate-700 disabled:opacity-50">Вперед</button>
                </div>
            )}
        </div>
    );
};

export default AdminUserManager;