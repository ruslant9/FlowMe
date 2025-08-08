// frontend/src/components/admin/AdminManagementPanel.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Loader2, Search, Shield, ShieldCheck, ShieldPlus, ShieldX } from 'lucide-react';
import { useUser } from '../../hooks/useUser';
import { useModal } from '../../hooks/useModal';
import Avatar from '../Avatar';

const API_URL = import.meta.env.VITE_API_URL;

const AdminManagementPanel = () => {
    const { currentUser } = useUser();
    const { showConfirmation } = useModal();
    const [admins, setAdmins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    const fetchAdmins = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/api/admin/administrators`, { headers: { Authorization: `Bearer ${token}` } });
            setAdmins(res.data);
        } catch (error) {
            toast.error('Не удалось загрузить список администраторов.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAdmins();
    }, [fetchAdmins]);

    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }
        const debounce = setTimeout(async () => {
            setIsSearching(true);
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get(`${API_URL}/api/admin/search-users?q=${searchQuery}`, { headers: { Authorization: `Bearer ${token}` } });
                setSearchResults(res.data);
            } catch (error) {
                toast.error('Ошибка поиска пользователей.');
            } finally {
                setIsSearching(false);
            }
        }, 300);
        return () => clearTimeout(debounce);
    }, [searchQuery]);

    const handleGrantAdmin = (user) => {
        showConfirmation({
            title: `Назначить админом?`,
            message: `Вы уверены, что хотите назначить ${user.username} младшим администратором?`,
            onConfirm: async () => {
                const toastId = toast.loading('Назначение...');
                try {
                    const token = localStorage.getItem('token');
                    await axios.post(`${API_URL}/api/admin/grant-junior-admin/${user._id}`, {}, { headers: { Authorization: `Bearer ${token}` } });
                    toast.success('Права выданы!', { id: toastId });
                    fetchAdmins();
                    setSearchQuery('');
                } catch (error) {
                    toast.error(error.response?.data?.message || 'Ошибка.', { id: toastId });
                }
            }
        });
    };

    const handleRevokeAdmin = (user) => {
        showConfirmation({
            title: `Снять права?`,
            message: `Вы уверены, что хотите снять права администратора с ${user.username}?`,
            onConfirm: async () => {
                const toastId = toast.loading('Снятие прав...');
                try {
                    const token = localStorage.getItem('token');
                    await axios.post(`${API_URL}/api/admin/revoke-admin/${user._id}`, {}, { headers: { Authorization: `Bearer ${token}` } });
                    toast.success('Права сняты!', { id: toastId });
                    fetchAdmins();
                } catch (error) {
                    toast.error(error.response?.data?.message || 'Ошибка.', { id: toastId });
                }
            }
        });
    };

    return (
        <div className="space-y-6">
            {currentUser.role === 'super_admin' && (
                <div>
                    <h3 className="text-lg font-bold mb-2">Назначить нового администратора</h3>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Поиск пользователя по @username для назначения..."
                            className="w-full pl-10 pr-4 py-2 rounded-lg bg-white dark:bg-slate-800"
                        />
                        {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin" />}
                    </div>
                    {searchResults.length > 0 && (
                        <div className="mt-2 space-y-2 bg-slate-100 dark:bg-slate-800/50 p-2 rounded-lg">
                            {searchResults.map(user => (
                                <div key={user._id} className="flex items-center justify-between p-2">
                                    <div className="flex items-center space-x-2">
                                        <Avatar username={user.username} avatarUrl={user.avatar} size="sm" />
                                        <span className="font-semibold">{user.fullName || user.username}</span>
                                    </div>
                                    <button onClick={() => handleGrantAdmin(user)} className="flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-green-100 text-green-800 hover:bg-green-200">
                                        <ShieldPlus size={14} /><span>Назначить</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
            <div>
                <h3 className="text-lg font-bold mb-2">Текущие администраторы</h3>
                {loading ? <Loader2 className="animate-spin" /> : (
                    <div className="space-y-2">
                        {admins.map(admin => (
                            <div key={admin._id} className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                <div className="flex items-center space-x-3">
                                    <Avatar username={admin.username} avatarUrl={admin.avatar} />
                                    <div>
                                        <p className="font-bold">{admin.fullName || admin.username}</p>
                                        <div className="flex items-center space-x-2 text-xs font-semibold">
                                            {admin.role === 'super_admin' ?
                                                <span className="flex items-center text-yellow-500"><ShieldCheck size={14} className="mr-1"/>Главный админ</span> :
                                                <span className="flex items-center text-blue-500"><Shield size={14} className="mr-1"/>Младший админ</span>
                                            }
                                        </div>
                                    </div>
                                </div>
                                {currentUser.role === 'super_admin' && admin._id !== currentUser._id && (
                                    <button onClick={() => handleRevokeAdmin(admin)} className="flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-100 text-red-800 hover:bg-red-200">
                                        <ShieldX size={14} /><span>Снять права</span>
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
export default AdminManagementPanel;