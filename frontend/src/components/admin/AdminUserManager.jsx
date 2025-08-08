// frontend/components/admin/AdminUserManager.jsx

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Loader2, Search, Shield, ShieldCheck, ShieldAlert, User, Mail, Calendar } from 'lucide-react';
import AdminUserManagementOverlay from './AdminUserManagementOverlay';
import { useUser } from '../../hooks/useUser';

const API_URL = import.meta.env.VITE_API_URL;

const AdminUserManager = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const [isOverlayOpen, setIsOverlayOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    
    const { currentUser } = useUser();

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
        }, 300);
        return () => clearTimeout(debounce);
    }, [search]);

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page]);


    const handleOpenOverlay = (user) => {
        setSelectedUser(user);
        setIsOverlayOpen(true);
    };

    const handleSuccess = () => {
        setIsOverlayOpen(false);
        setSelectedUser(null);
        fetchData();
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
            <>
                {/* Desktop Table View */}
                <div className="overflow-auto hidden md:block h-full">
                    <table className="w-full text-left min-w-[700px]">
                        <thead>
                            <tr className="border-b dark:border-slate-700">
                                <th className="p-2 font-semibold">Пользователь</th>
                                <th className="p-2 font-semibold">Email</th>
                                <th className="p-2 font-semibold">Дата регистрации</th>
                                <th className="p-2 font-semibold">Статус бана</th>
                                {/* --- ИСПРАВЛЕНИЕ: ВЫРАВНИВАНИЕ ЗАГОЛОВКА ПО ЦЕНТРУ --- */}
                                <th className="p-2 text-center">Действия</th>
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
                                        {/* --- ИСПРАВЛЕНИЕ: ВЫРАВНИВАНИЕ КОНТЕНТА В ЯЧЕЙКЕ ПО ЦЕНТРУ --- */}
                                        <div className="flex items-center justify-center">
                                            {currentUser?._id !== user._id ? (
                                                <button 
                                                    onClick={() => handleOpenOverlay(user)} 
                                                    className="flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-500/20 dark:text-yellow-300 dark:hover:bg-yellow-500/30"
                                                >
                                                    <Shield size={14} />
                                                    <span>Управление</span>
                                                </button>
                                            ) : (
                                                <span className="text-xs font-semibold text-slate-400">Это вы</span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-3">
                    {users.map(user => (
                        <div key={user._id} className="bg-slate-100 dark:bg-slate-800 p-3 rounded-lg">
                            <div className="flex justify-between items-start">
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold truncate">{user.fullName || user.username}</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                                </div>
                                {currentUser?._id !== user._id ? (
                                    <button 
                                        onClick={() => handleOpenOverlay(user)} 
                                        className="flex-shrink-0 flex items-center whitespace-nowrap space-x-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-500/20 dark:text-yellow-300 dark:hover:bg-yellow-500/30"
                                    >
                                        <Shield size={14} />
                                        <span>Управление</span>
                                    </button>
                                ) : (
                                    <span className="text-xs font-semibold text-slate-400">Это вы</span>
                                )}
                            </div>
                            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs">
                                <div className="text-slate-500 dark:text-slate-400">
                                    <p>Рег: {new Date(user.createdAt).toLocaleDateString('ru-RU')}</p>
                                </div>
                                <div>
                                    {renderBanStatus(user)}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </>
        );
    };

    return (
        <div className="space-y-4 flex flex-col h-full">
             <AdminUserManagementOverlay 
                isOpen={isOverlayOpen}
                onClose={() => setIsOverlayOpen(false)}
                user={selectedUser}
                onSuccess={handleSuccess}
             />
           
            <div className="flex items-center justify-between gap-4">
                <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        value={search} 
                        onChange={e => setSearch(e.target.value)} 
                        placeholder="Поиск по имени, @username или почте..." 
                        className="w-full pl-10 pr-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    />
                </div>
            </div>
             <div className="flex-1 min-h-0">{renderContent()}</div>
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