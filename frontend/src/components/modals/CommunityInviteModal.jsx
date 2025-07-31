// frontend/src/components/modals/CommunityInviteModal.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Send, Loader2, Users } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import Avatar from '../Avatar';

const API_URL = import.meta.env.VITE_API_URL;

const CommunityInviteModal = ({ isOpen, onClose, targetUser }) => {
    const [ownedCommunities, setOwnedCommunities] = useState([]);
    const [selectedCommunity, setSelectedCommunity] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchOwnedCommunities = useCallback(async () => {
        if (!isOpen) return;
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/api/communities/created`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setOwnedCommunities(res.data);
        } catch (error) {
            toast.error("Не удалось загрузить ваши сообщества.");
        } finally {
            setLoading(false);
        }
    }, [isOpen]);

    useEffect(() => {
        fetchOwnedCommunities();
    }, [fetchOwnedCommunities]);
    
    useEffect(() => {
        // Сбрасываем выбор при закрытии/открытии
        if (!isOpen) {
            setSelectedCommunity(null);
            setSearchTerm('');
        }
    }, [isOpen]);

    const handleInvite = async () => {
        if (!selectedCommunity || !targetUser) return;

        const toastId = toast.loading(`Приглашение в "${selectedCommunity.name}"...`);
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/api/communities/${selectedCommunity._id}/invite`, 
                { targetUserId: targetUser._id }, 
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success('Приглашение успешно отправлено!', { id: toastId });
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Ошибка при отправке приглашения.', { id: toastId });
        }
    };

    const filteredCommunities = ownedCommunities.filter(community =>
        community.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
                >
                    <motion.div
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.9, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="ios-glass-final w-full max-w-md p-6 rounded-3xl flex flex-col text-slate-900 dark:text-white max-h-[80vh]"
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Пригласить в сообщество</h2>
                            <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10"><X /></button>
                        </div>
                        
                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input
                                type="text"
                                placeholder="Поиск по вашим сообществам..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="flex-1 overflow-y-auto -mr-2 pr-2 space-y-2">
                            {loading ? (
                                <div className="text-center p-8"><Loader2 className="animate-spin mx-auto"/></div>
                            ) : filteredCommunities.length > 0 ? (
                                filteredCommunities.map(community => (
                                    <div 
                                        key={community._id} 
                                        onClick={() => setSelectedCommunity(community)} 
                                        className={`flex items-center space-x-3 p-2 rounded-lg cursor-pointer transition-colors ${selectedCommunity?._id === community._id ? 'bg-blue-500/20' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                    >
                                        <Avatar size="md" username={community.name} avatarUrl={community.avatar ? `${API_URL}/${community.avatar}` : ''} />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold truncate">{community.name}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center"><Users size={12} className="mr-1"/>{community.members?.length || 0}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-slate-500 dark:text-slate-400 py-4">У вас нет созданных сообществ.</p>
                            )}
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={handleInvite}
                                disabled={!selectedCommunity}
                                className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Send size={18} />
                                <span>Пригласить</span>
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default CommunityInviteModal;