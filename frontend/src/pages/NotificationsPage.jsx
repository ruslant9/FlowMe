// frontend/src/pages/NotificationsPage.jsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import useTitle from '../hooks/useTitle';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Bell, Loader2, Trash2, User, Users, Heart, MessageCircle, UserPlus, MoreHorizontal } from 'lucide-react';
import { useModal } from '../hooks/useModal';
import NotificationItem from '../components/NotificationItem';
import { AnimatePresence } from 'framer-motion';
import PostViewModal from '../components/modals/PostViewModal';
import MorePanel from '../components/MorePanel';
import PageWrapper from '../components/PageWrapper';

const API_URL = import.meta.env.VITE_API_URL;

// --- НАЧАЛО ИСПРАВЛЕНИЯ 1: Добавляем классы flex-1 и justify-center ---
const TabButton = ({ active, onClick, children, count }) => (
    <button
        onClick={onClick}
        className={`flex-1 justify-center px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors flex items-center space-x-2 ${
            active 
            ? 'bg-blue-600 text-white' 
            : 'text-slate-600 dark:text-white/70 hover:bg-slate-200 dark:hover:bg-white/10'
        }`}
    >
        {children}
        {typeof count === 'number' && count > 0 && 
            <span className={`px-2 py-0.5 rounded-full text-xs ${active ? 'bg-white/20' : 'bg-slate-200 dark:bg-white/10'}`}>{count > 9 ? '9+' : count}</span>
        }
    </button>
);
// --- КОНЕЦ ИСПРАВЛЕНИЯ 1 ---

const SubTabButton = ({ active, onClick, children }) => (
    <button
        onClick={onClick}
        className={`flex-shrink-0 px-2.5 py-1 text-[11px] font-semibold rounded-full transition-colors flex items-center space-x-1.5 ${
            active
                ? 'bg-slate-200 dark:bg-white/20 text-slate-800 dark:text-white'
                : 'text-slate-500 dark:text-white/60 hover:bg-slate-200/50 dark:hover:bg-white/10'
        }`}
    >
        {children}
    </button>
);

const NotificationsPage = () => {
    useTitle('Уведомления');
    const [activeTab, setActiveTab] = useState('personal');
    const [activeFilter, setActiveFilter] = useState('all');
    const [notificationsData, setNotificationsData] = useState({
        personal: { list: [], unreadCount: 0 },
        community: { list: [], unreadCount: 0 }
    });
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const { showConfirmation } = useModal();
    const [isPostModalOpen, setIsPostModalOpen] = useState(false);
    const [modalPostData, setModalPostData] = useState(null);
    const [isMorePanelOpen, setIsMorePanelOpen] = useState(false);

    const openPostInModal = useCallback(async (postId, highlightCommentId) => {
        try {
            setModalPostData({
                posts: [{ _id: postId }],
                startIndex: 0,
                highlightCommentId: highlightCommentId,
            });
            setIsPostModalOpen(true);
        } catch (error) {
            toast.error("Не удалось открыть пост.");
            setIsPostModalOpen(false);
        }
    }, []);

    useEffect(() => {
        const handleOpenPostModal = (event) => {
            const { postId, highlightCommentId } = event.detail;
            if (postId) {
                openPostInModal(postId, highlightCommentId);
            }
        };

        window.addEventListener('openPostModal', handleOpenPostModal);

        return () => {
            window.removeEventListener('openPostModal', handleOpenPostModal);
        };
    }, [openPostInModal]);

    const fetchNotifications = useCallback(async (showLoader = false) => {
        if (showLoader) setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/api/user/notifications`, { headers: { Authorization: `Bearer ${token}` } });
            setNotificationsData(res.data);

            if (res.data.personal.unreadCount > 0 || res.data.community.unreadCount > 0) {
                setTimeout(async () => {
                    try {
                        await axios.post(`${API_URL}/api/user/notifications/mark-read`, {}, { headers: { Authorization: `Bearer ${token}` } });
                        window.dispatchEvent(new CustomEvent('NEW_NOTIFICATION')); 
                    } catch (err) { console.error("Failed to mark as read", err); }
                }, 2000);
            }
        } catch (error) { toast.error(`Не удалось загрузить уведомления`); } 
        finally { if (showLoader) setLoading(false); }
    }, []);

    useEffect(() => {
        setActiveFilter('all'); 
        fetchNotifications(true);
    }, [fetchNotifications]);

    useEffect(() => {
        const handleNewNotification = () => fetchNotifications(false); 
        window.addEventListener('NEW_NOTIFICATION', handleNewNotification);
        return () => window.removeEventListener('NEW_NOTIFICATION', handleNewNotification);
    }, [fetchNotifications]);
    
    const handleNotificationClick = async (notification) => {
        const postLinkRegex = /^\/posts\/([a-f\d]{24})$/;
        const match = notification.link.match(postLinkRegex);
        if (match) {
            const postId = match[1];
            try {
                setModalPostData({ posts: [{ _id: postId }], startIndex: 0, highlightCommentId: notification.type.includes('comment') ? notification.entityId : null });
                setIsPostModalOpen(true);
            } catch (error) { toast.error("Не удалось открыть пост."); }
        } else {
            navigate(notification.link, { state: { defaultTab: 'incoming' } });
        }
    };

    const handleAction = useCallback(async (action, notificationId) => {
        const toastId = toast.loading('Обработка...');
        try {
            const token = localStorage.getItem('token');
            let endpoint = '';
            let method = 'post';

            if (action === 'accept_invite') {
                endpoint = '/api/communities/invites/accept';
            } else if (action === 'decline_invite') {
                endpoint = '/api/communities/invites/decline';
            } else {
                toast.dismiss(toastId);
                return;
            }

            const response = await axios[method](`${API_URL}${endpoint}`, { notificationId }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            toast.success(response.data.message, { id: toastId });
            fetchNotifications(false);
            window.dispatchEvent(new CustomEvent('NEW_NOTIFICATION'));

        } catch (error) {
            toast.error(error.response?.data?.message || 'Ошибка при выполнении действия.', { id: toastId });
        }
    }, [fetchNotifications]);

    const handleDelete = useCallback((notificationId) => {
        showConfirmation({
            title: "Удалить уведомление?",
            message: "Вы уверены? Это действие нельзя отменить.",
            onConfirm: async () => {
                setNotificationsData(prev => ({
                    ...prev,
                    [activeTab]: {
                        ...prev[activeTab],
                        list: prev[activeTab].list.filter(n => n._id !== notificationId)
                    }
                }));
                try {
                    const token = localStorage.getItem('token');
                    await axios.delete(`${API_URL}/api/user/notifications/${notificationId}`, { headers: { Authorization: `Bearer ${token}` } });
                    window.dispatchEvent(new CustomEvent('NEW_NOTIFICATION')); 
                    fetchNotifications(false);
                } catch (error) {
                    toast.error("Ошибка удаления.");
                    fetchNotifications(false);
                }
            }
        });
    }, [activeTab, fetchNotifications, showConfirmation]);

    const handleDeleteAll = useCallback(() => {
        const tabName = activeTab === 'personal' ? 'личные' : 'от сообществ';
        showConfirmation({
            title: `Очистить ${tabName} уведомления?`,
            message: `Все ваши ${tabName} уведомления будут удалены навсегда. Вы уверены?`,
            onConfirm: async () => {
                const originalNotifications = { ...notificationsData };
                setNotificationsData(prev => ({ ...prev, [activeTab]: { list: [], unreadCount: 0 } }));
                try {
                    const token = localStorage.getItem('token');
                    await axios.delete(`${API_URL}/api/user/notifications/clear?type=${activeTab}`, { headers: { Authorization: `Bearer ${token}` } });
                    window.dispatchEvent(new CustomEvent('NEW_NOTIFICATION')); 
                } catch (error) {
                    toast.error(`Ошибка при очистке уведомлений.`);
                    setNotificationsData(originalNotifications);
                }
            }
        });
    }, [activeTab, notificationsData, showConfirmation]);

    const filteredNotifications = useMemo(() => {
        const source = notificationsData[activeTab]?.list || [];
        if (activeFilter === 'all') return source;
        return source.filter(n => {
            switch(activeFilter) {
                case 'requests': return n.type === 'friend_request' || n.type === 'community_join_request' || n.type === 'community_invite';
                case 'likes': return n.type.startsWith('like_');
                case 'comments': return n.type === 'new_comment' || n.type === 'reply_comment';
                default: return true;
            }
        });
    }, [notificationsData, activeTab, activeFilter]);

    const groupedNotifications = useMemo(() => {
        const groups = { today: [], yesterday: [], earlier: [] };
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        filteredNotifications.forEach(notif => {
            const notifDate = new Date(notif.updatedAt); 
            if (notifDate.toDateString() === today.toDateString()) groups.today.push(notif);
            else if (notifDate.toDateString() === yesterday.toDateString()) groups.yesterday.push(notif);
            else groups.earlier.push(notif);
        });
        return groups;
    }, [filteredNotifications]);
    
    const subTabs = useMemo(() => {
        const tabs = [{ key: 'all', label: 'Все', icon: Bell, onClick: () => setActiveFilter('all') }];
        if (activeTab === 'personal') {
            tabs.push({ key: 'requests', label: 'Заявки', icon: UserPlus, onClick: () => setActiveFilter('requests') });
        }
        if (activeTab === 'community') {
            tabs.push({ key: 'requests', label: 'Заявки', icon: Users, onClick: () => setActiveFilter('requests') });
        }
        tabs.push(
            { key: 'likes', label: 'Лайки', icon: Heart, onClick: () => setActiveFilter('likes') },
            { key: 'comments', label: 'Комментарии', icon: MessageCircle, onClick: () => setActiveFilter('comments') }
        );
        return tabs;
    }, [activeTab]);

    const subVisibleCount = 3;
    const subVisibleItems = subTabs.slice(0, subVisibleCount);
    const subHiddenItems = subTabs.slice(subVisibleCount);
    const isSubMoreButtonActive = subHiddenItems.some(item => item.key === activeFilter);

    return (
        <PageWrapper>
            <main className="flex-1 p-4 md:p-8">
                {isPostModalOpen && (
                    <PostViewModal
                        posts={modalPostData.posts} startIndex={modalPostData.startIndex} highlightCommentId={modalPostData.highlightCommentId}
                        onClose={() => setIsPostModalOpen(false)}
                        onDeletePost={() => fetchNotifications()}
                    />
                )}
                <div className="ios-glass-final rounded-3xl p-6 w-full max-w-4xl mx-auto">
                     <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                        <div className="flex items-center space-x-3">
                            <Bell size={28} />
                            <h1 className="text-3xl font-bold">Уведомления</h1>
                            {notificationsData[activeTab].list.length > 0 && (
                                <button onClick={handleDeleteAll} className="md:hidden p-2 rounded-full text-red-500 hover:bg-red-500/10">
                                    <Trash2 size={18} />
                                </button>
                            )}
                        </div>
                        {notificationsData[activeTab].list.length > 0 && (
                            <button onClick={handleDeleteAll} className="hidden md:flex flex-shrink-0 items-center space-x-2 text-sm text-red-500 hover:text-red-700 dark:hover:text-red-300 transition-colors p-2 rounded-lg hover:bg-red-500/10">
                                <Trash2 size={16} /><span className="whitespace-nowrap">Очистить все</span>
                            </button>
                        )}
                    </div>

                    {/* --- НАЧАЛО ИСПРАВЛЕНИЯ 2: Удаляем flex-wrap и меняем gap --- */}
                    <div className="flex items-center gap-2 mb-4 border-b border-slate-200 dark:border-white/10 pb-4">
                        <TabButton active={activeTab === 'personal'} onClick={() => setActiveTab('personal')} count={notificationsData.personal.unreadCount}><User size={16} /> <span>Личные</span></TabButton>
                        <TabButton active={activeTab === 'community'} onClick={() => setActiveTab('community')} count={notificationsData.community.unreadCount}><Users size={16} /> <span>Сообщества</span></TabButton>
                    </div>
                    {/* --- КОНЕЦ ИСПРАВЛЕНИЯ 2 --- */}
                    
                    <div className="hidden md:flex items-center flex-wrap gap-2 mb-4 pb-4 border-b border-slate-200 dark:border-white/10">
                        {subTabs.map(tab => (
                            <SubTabButton key={tab.key} active={activeFilter === tab.key} onClick={tab.onClick}>
                                <tab.icon size={14} /> <span>{tab.label}</span>
                            </SubTabButton>
                        ))}
                    </div>
                    
                    <div className="md:hidden flex items-center gap-2 mb-4 pb-4 border-b border-slate-200 dark:border-white/10 overflow-x-auto no-scrollbar">
                        {subVisibleItems.map(tab => (
                             <SubTabButton key={tab.key} active={activeFilter === tab.key} onClick={tab.onClick}>
                                <tab.icon size={14} /> <span>{tab.label}</span>
                            </SubTabButton>
                        ))}
                        {subHiddenItems.length > 0 && (
                            <SubTabButton active={isSubMoreButtonActive} onClick={() => setIsMorePanelOpen(true)}>
                                <MoreHorizontal size={14} /> <span>Еще</span>
                            </SubTabButton>
                        )}
                    </div>
                    
                    {loading ? (
                        <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-slate-400" /></div>
                    ) : filteredNotifications.length === 0 ? (
                        <div className="text-center py-20 text-slate-500 dark:text-white/60">
                            <p>Уведомлений этого типа пока нет.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <AnimatePresence>
                                {Object.entries(groupedNotifications).map(([groupKey, groupNotifications]) => (
                                    groupNotifications.length > 0 && (
                                        <div key={groupKey}>
                                            <h2 className="font-bold text-lg mb-2 pl-3 text-slate-800 dark:text-white">
                                                {groupKey === 'today' && 'Сегодня'}
                                                {groupKey === 'yesterday' && 'Вчера'}
                                                {groupKey === 'earlier' && 'Ранее'}
                                            </h2>
                                            <div className="space-y-1">
                                                {groupNotifications.map(notification => (
                                                    <div key={notification._id} onClick={() => handleNotificationClick(notification)}>
                                                        <NotificationItem notification={notification} onDelete={handleDelete} onAction={handleAction} />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
                
                <MorePanel isOpen={isMorePanelOpen} onClose={() => setIsMorePanelOpen(false)}>
                    {subHiddenItems.map(item => (
                        <button
                            key={item.key}
                            onClick={() => { item.onClick(); setIsMorePanelOpen(false); }}
                            className={`w-full flex items-center space-x-4 p-3 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors
                            ${activeFilter === item.key ? 'bg-blue-100 dark:bg-blue-500/20 font-semibold' : ''}
                            `}
                        >
                            <item.icon size={22} className={activeFilter === item.key ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'} />
                            <span>{item.label}</span>
                        </button>
                    ))}
                </MorePanel>
            </main>
        </PageWrapper>
    );
};

export default NotificationsPage;