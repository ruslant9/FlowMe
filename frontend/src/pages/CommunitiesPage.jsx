// frontend/src/pages/CommunitiesPage.jsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import useTitle from '../hooks/useTitle';
import axios from 'axios';
import { PlusCircle, Search, Users, Globe, Building, Loader2, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import CreateCommunityModal from '../components/modals/CreateCommunityModal';
import { useModal } from '../hooks/useModal';
import CommunityCard from '../components/CommunityCard';

const API_URL = import.meta.env.VITE_API_URL;

const COMMUNITIES_PER_PAGE = 10;

const TabButton = ({ children, active, onClick, count }) => (
    <button
        onClick={onClick}
        className={`flex-shrink-0 flex items-center space-x-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
            active
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 dark:text-white/70 hover:bg-slate-200 dark:hover:bg-white/10'
        }`}
    >
        {children}
        {typeof count === 'number' && count > 0 && <span className={`px-2 py-0.5 rounded-full text-xs ${active ? 'bg-white/20' : 'bg-slate-200 dark:bg-white/10'}`}>{count}</span>}
    </button>
);

const CommunitiesPage = () => {
    useTitle('Сообщества');
    const [activeTab, setActiveTab] = useState('my');
    const [myCommunities, setMyCommunities] = useState([]);
    const [createdCommunities, setCreatedCommunities] = useState([]);
    const [recommendedCommunities, setRecommendedCommunities] = useState([]);
    const [pendingSentRequests, setPendingSentRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const { showConfirmation } = useModal();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [page, setPage] = useState(1);

    const fetchAllCommunityData = useCallback(async (query = '') => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const myRes = await axios.get(`${API_URL}/api/communities/my`, { headers: { Authorization: `Bearer ${token}` } });
            const createdRes = await axios.get(`${API_URL}/api/communities/created`, { headers: { Authorization: `Bearer ${token}` } });
            const recommendedRes = await axios.get(`${API_URL}/api/communities/recommended${query ? `?q=${query}` : ''}`, { headers: { Authorization: `Bearer ${token}` } });

            setMyCommunities(myRes.data);
            setCreatedCommunities(createdRes.data);
            setRecommendedCommunities(recommendedRes.data);

            const allCommunities = [...myRes.data, ...recommendedRes.data];
            const uniquePending = Array.from(new Map(
                allCommunities
                    .filter(c => c.isPending && !c.isMember)
                    .map(c => [c._id, c])
            ).values());
            setPendingSentRequests(uniquePending);

        } catch (error) {
            toast.error('Не удалось загрузить сообщества.');
            console.error('Error fetching communities:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAllCommunityData(searchQuery);
    }, [searchQuery, fetchAllCommunityData]);

    const handleAction = async (action, communityId) => {
        const toastId = toast.loading('Обработка...');
        try {
            const token = localStorage.getItem('token');
            let response;
            if (action === 'join') {
                response = await axios.post(`${API_URL}/api/communities/${communityId}/join`, {}, { headers: { Authorization: `Bearer ${token}` } });
                toast.success(response.data.message, { id: toastId });
            } else if (action === 'leave') {
                const communityToLeave = myCommunities.find(c => c._id === communityId) || createdCommunities.find(c => c._id === communityId);
                toast.dismiss(toastId);
                showConfirmation({
                    title: `Покинуть "${communityToLeave?.name}"?`,
                    message: "Вы уверены, что хотите покинуть это сообщество?",
                    onConfirm: async () => {
                        const leaveToastId = toast.loading('Выход из сообщества...');
                        const leaveResponse = await axios.post(`${API_URL}/api/communities/${communityId}/leave`, {}, { headers: { Authorization: `Bearer ${token}` } });
                        toast.success(leaveResponse.data.message, { id: leaveToastId });
                        fetchAllCommunityData(searchQuery);
                    }
                });
                return;
             }
            
            fetchAllCommunityData(searchQuery);

        } catch (error) {
            toast.error(error.response?.data?.message || 'Ошибка при действии.', { id: toastId });
        }
    };

    const debouncedSearch = useMemo(() => {
        let timeout;
        return (query) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                setSearchQuery(query);
            }, 300);
        };
    }, []);

    const handleTabSwitch = (tabName) => {
        setActiveTab(tabName);
        setSearchQuery('');
        setPage(1);
    };

    const renderCommunityList = (list) => {
        if (loading) {
            return (
                <div className="flex justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                </div>
            );
        }
        
        const displayedList = list.slice(0, page * COMMUNITIES_PER_PAGE);
        const hasMore = displayedList.length < list.length;

        if (list.length === 0) {
            let message = '';
            if (activeTab === 'my') message = 'Вы пока не подписаны ни на одно сообщество.';
            else if (activeTab === 'created') message = 'У вас пока нет созданных сообществ. Создайте первое!';
            else if (activeTab === 'recommended' && searchQuery) message = 'Ничего не найдено по вашему запросу.';
            else if (activeTab === 'recommended') message = 'Нет рекомендаций.';
            else if (activeTab === 'pendingSent') message = 'У вас нет активных заявок на вступление в сообщества.';
            
            return (
                <div className="text-center text-slate-500 dark:text-white/60 py-10">
                    <p>{message}</p>
                </div>
            );
        }
        return (
            <>
                <div className="space-y-4">
                    <AnimatePresence>
                        {displayedList.map(community => (
                            <motion.div 
                                key={community._id}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.3 }}
                            >
                                <CommunityCard
                                    community={community}
                                    onAction={handleAction}
                                    isMember={community.members?.includes(JSON.parse(localStorage.getItem('user'))?.id)}
                                    isPending={community.isPending}
                                />
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
                {hasMore && (
                    <div className="mt-8 flex justify-center">
                        <button onClick={() => setPage(p => p + 1)} className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                            Загрузить еще
                        </button>
                    </div>
                )}
            </>
        );
    };

    return (
        <>
            <CreateCommunityModal 
                isOpen={isCreateModalOpen} 
                onClose={() => {
                    setIsCreateModalOpen(false);
                    fetchAllCommunityData(searchQuery);
                }} 
            />

            <main className="flex-1 p-4 md:p-8">
                <div className="ios-glass-final rounded-3xl p-6 w-full max-w-6xl mx-auto">
                    <div className="flex items-center justify-between mb-6">
                       <h1 className="text-2xl sm:text-3xl font-bold">Сообщества</h1>
                        {activeTab === 'created' && (
                            <button 
                                onClick={() => setIsCreateModalOpen(true)}
                                className="flex items-center space-x-2 text-xs sm:text-sm bg-blue-500 hover:bg-blue-600 text-white font-semibold px-3 py-2 sm:px-4 rounded-lg transition-colors"
                            >
                                <PlusCircle size={18} /> <span>Создать сообщество</span>
                            </button>
                        )}
                    </div>

                    <div className="relative mb-6">
                        {(activeTab === 'recommended' || activeTab === 'search') && (
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/40" size={20} />
                                <input
                                    type="text"
                                    placeholder="Поиск сообществ..."
                                    value={searchQuery}
                                    onChange={(e) => debouncedSearch(e.target.value)}
                                    className="w-full pl-12 pr-10 py-3 rounded-lg bg-slate-200/70 dark:bg-black/30 text-slate-800 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 border-none focus:outline-none focus:ring-2 focus:focus:ring-blue-500"
                                />
                            </div>
                        )}
                    </div>

                    <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-white/10 pb-4 mb-4 overflow-x-auto">
                        <TabButton active={activeTab === 'my'} onClick={() => handleTabSwitch('my')}>
                            <Users size={16} /> <span>Мои сообщества</span>
                        </TabButton>
                        <TabButton active={activeTab === 'created'} onClick={() => handleTabSwitch('created')}>
                            <Building size={16} /> <span>Созданные</span>
                        </TabButton>
                        <TabButton active={activeTab === 'recommended'} onClick={() => handleTabSwitch('recommended')}>
                            <Globe size={16} /> <span>Рекомендации</span>
                        </TabButton>
                        <TabButton active={activeTab === 'pendingSent'} onClick={() => handleTabSwitch('pendingSent')} count={pendingSentRequests.length}>
                            <Clock size={16} /> <span>Отправленные заявки</span>
                        </TabButton>
                    </div>

                    <div>
                        {activeTab === 'my' && renderCommunityList(myCommunities)}
                        {activeTab === 'created' && renderCommunityList(createdCommunities)}
                        {activeTab === 'recommended' && renderCommunityList(recommendedCommunities)}
                        {activeTab === 'pendingSent' && renderCommunityList(pendingSentRequests)}
                    </div>
                </div>
            </main>
        </>
    );
};

export default CommunitiesPage;