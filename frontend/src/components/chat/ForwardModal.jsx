// frontend/src/components/chat/ForwardModal.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Send, Loader2, Bookmark } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import Avatar from '../Avatar';

const API_URL = import.meta.env.VITE_API_URL;

const ForwardModal = ({ messageIds, onClose }) => {
    const [conversations, setConversations] = useState([]);
    const [selectedConvIds, setSelectedConvIds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchConversations = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/api/messages/conversations`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setConversations(res.data);
        } catch (error) {
            toast.error("Не удалось загрузить список чатов.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchConversations();
    }, [fetchConversations]);

    const handleToggleSelection = (convId) => {
        setSelectedConvIds(prev =>
            prev.includes(convId) ? prev.filter(id => id !== convId) : [...prev, convId]
        );
    };

    const handleForward = async () => {
        const toastId = toast.loading('Пересылка сообщений...');
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/api/messages/forward`, {
                messageIds,
                targetConversationIds: selectedConvIds
            }, { headers: { Authorization: `Bearer ${token}` } });
            toast.success('Сообщения успешно пересланы!', { id: toastId });
            onClose();
        } catch (error) {
            toast.error('Ошибка при пересылке сообщений.', { id: toastId });
        }
    };

    const filteredConversations = useMemo(() => {
        const sorted = [...conversations].sort((a, b) => {
            if (a.isSavedMessages) return -1;
            if (b.isSavedMessages) return 1;
            return 0;
        });
        return sorted.filter(conv => {
            const lowerCaseSearch = searchTerm.toLowerCase();
            if (conv.isSavedMessages) {
                return 'избранное'.includes(lowerCaseSearch);
            }
            // --- ИЗМЕНЕНИЕ: Добавлено опциональное связывание (?.) для предотвращения ошибки ---
            return (
                conv.interlocutor?.fullName?.toLowerCase().includes(lowerCaseSearch) ||
                conv.interlocutor?.username.toLowerCase().includes(lowerCaseSearch)
            );
        });
    }, [conversations, searchTerm]);

    return (
        <AnimatePresence>
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
                        <h2 className="text-xl font-bold">Переслать сообщение</h2>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10"><X /></button>
                    </div>
                    
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Поиск чата..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto -mr-2 pr-2 space-y-2">
                        {loading ? <div className="text-center p-8"><Loader2 className="animate-spin mx-auto"/></div> :
                         filteredConversations.map(conv => {
                            const isSaved = conv.isSavedMessages;
                            return (
                            <div key={conv._id} onClick={() => handleToggleSelection(conv._id)} className="flex items-center space-x-3 p-2 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800">
                                <input
                                    type="checkbox"
                                    checked={selectedConvIds.includes(conv._id)}
                                    readOnly
                                    className="form-checkbox h-5 w-5 text-blue-600 rounded-full bg-slate-200 dark:bg-slate-700 border-transparent focus:ring-blue-500"
                                />
                                {isSaved ? (
                                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                                        <Bookmark size={20} className="text-white" fill="white" />
                                    </div>
                                ) : (
                                    <Avatar size="md" username={conv.interlocutor.username} avatarUrl={conv.interlocutor.avatar} />
                                )}
                                <span className="font-semibold">{isSaved ? 'Избранное' : (conv.interlocutor.fullName || conv.interlocutor.username)}</span>
                            </div>
                        )})
                        }
                    </div>

                    <div className="mt-6 flex justify-end">
                        <button
                            onClick={handleForward}
                            disabled={selectedConvIds.length === 0}
                            className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send size={18} />
                            <span>Переслать ({selectedConvIds.length})</span>
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default ForwardModal;