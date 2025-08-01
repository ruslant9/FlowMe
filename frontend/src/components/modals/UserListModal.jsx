// frontend/src/components/modals/UserListModal.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, ShieldAlert, Search } from 'lucide-react';
import Avatar from '../Avatar';
import { Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useUser } from '../../context/UserContext';

const API_URL = import.meta.env.VITE_API_URL;

const TabButton = ({ active, onClick, children, count }) => (
    <button
        onClick={onClick}
        className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${
            active 
            ? 'bg-slate-200 dark:bg-white/10' 
            : 'text-slate-500 dark:text-white/60 hover:bg-slate-100/50 dark:hover:bg-white/5'
        }`}
    >
        {children} ({count})
    </button>
);

const UserListModal = ({ isOpen, onClose, user, listType, initialTitle }) => {
    const { currentUser } = useUser();
    const [activeTab, setActiveTab] = useState('all');
    const [allItems, setAllItems] = useState([]);
    const [mutualItems, setMutualItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const isListOfCommunities = listType === 'communities-with-tabs';
    const isOwnProfile = useMemo(() => user?._id === currentUser?._id, [user, currentUser]);

    const endpoints = useMemo(() => {
        if (!user?._id) return null;
        switch (listType) {
            case 'friends-with-tabs':
                return { all: `/api/user/${user._id}/friends-list`, mutual: `/api/user/${user._id}/mutual-friends` };
            case 'subscribers-with-tabs':
                return { all: `/api/user/${user._id}/subscribers-list`, mutual: `/api/user/${user._id}/mutual-subscribers` };
            case 'communities-with-tabs':
                return { all: `/api/user/${user._id}/communities-list`, mutual: `/api/user/${user._id}/mutual-communities` };
            case 'community-members':
                return { all: `/api/communities/${user._id}/members` };
            case 'community-members-denied':
                return { denied: true };
            default:
                return null;
        }
    }, [user, listType]);

    const fetchData = useCallback(async () => {
        if (!isOpen || !endpoints) return;

        if (endpoints.denied) {
            setLoading(false);
            setAllItems([]);
            setError("Список участников скрыт настройками приватности сообщества.");
            return;
        }
        
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const requests = [axios.get(`${API_URL}${endpoints.all}`, { headers: { Authorization: `Bearer ${token}` } })];
            
            if (!isOwnProfile && endpoints?.mutual) {
                requests.push(axios.get(`${API_URL}${endpoints.mutual}`, { headers: { Authorization: `Bearer ${token}` } }));
            }

            const responses = await Promise.all(requests);
            
            setAllItems(responses[0].data);
            if (!isOwnProfile && endpoints?.mutual) {
                setMutualItems(responses[1].data);
            } else {
                setMutualItems([]); 
            }

        } catch (err) {
            setError(err.response?.data?.message || "Не удалось загрузить список.");
            toast.error(err.response?.data?.message || "Ошибка загрузки.");
        } finally {
            setLoading(false);
        }
    }, [isOpen, endpoints, isOwnProfile]);

    useEffect(() => {
        fetchData();
        return () => { if (!isOpen) { setActiveTab('all'); setSearchQuery(''); }};
    }, [isOpen, user, listType, fetchData]);

    const filteredItems = useMemo(() => {
        const sourceList = (activeTab === 'all' || isOwnProfile || !endpoints?.mutual) ? allItems : mutualItems;
        if (!searchQuery) {
            return sourceList;
        }
        return sourceList.filter(item =>
            (item.fullName && item.fullName.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (item.username && item.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (item.name && item.name.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    }, [activeTab, allItems, mutualItems, searchQuery, isOwnProfile, endpoints]);
    
    const handleClose = (e) => {
        e.stopPropagation();
        onClose();
    };
    
    if (!endpoints && isOpen) { 
        return null; 
    }

    const tabLabels = {
        'friends-with-tabs': { all: 'Все друзья', mutual: 'Общие' },
        'subscribers-with-tabs': { all: 'Все подписчики', mutual: 'Общие' },
        'communities-with-tabs': { all: 'Все сообщества', mutual: 'Общие' },
    };

    return ReactDOM.createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleClose}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="ios-glass-final w-full max-w-md p-6 rounded-3xl flex flex-col text-slate-900 dark:text-white max-h-[80vh]">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">{initialTitle}</h2>
                            <button onClick={handleClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10"><X /></button>
                        </div>

                        {!isOwnProfile && endpoints?.mutual && (
                            <div className="flex items-center space-x-2 p-1 mb-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                <TabButton active={activeTab === 'all'} onClick={() => setActiveTab('all')} count={allItems.length}>{tabLabels[listType].all}</TabButton>
                                <TabButton active={activeTab === 'mutual'} onClick={() => setActiveTab('mutual')} count={mutualItems.length}>{tabLabels[listType].mutual}</TabButton>
                            </div>
                        )}
                        
                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input type="text" placeholder="Поиск..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div className="flex-1 overflow-y-auto -mr-2 pr-2 space-y-2">
                            {loading ? (<div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>)
                            : error ? (<div className="text-center text-red-500 dark:text-red-400 py-8"><ShieldAlert className="mx-auto w-10 h-10 mb-2" /><p>{error}</p></div>)
                            : filteredItems.length === 0 ? (<div className="text-center text-slate-500 dark:text-white/60 py-8"><p>Список пуст.</p></div>)
                            : (filteredItems.map(item => {
                                const linkTo = isListOfCommunities ? `/communities/${item._id}` : `/profile/${item._id}`;
                                const displayName = isListOfCommunities ? item.name : (item.fullName || item.username);
                                const avatarUsername = isListOfCommunities ? item.name : item.username;
                                const avatarFullName = isListOfCommunities ? null : item.fullName;
                                return (
                                <Link to={linkTo} key={item._id} onClick={handleClose} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                    <Avatar username={avatarUsername} fullName={avatarFullName} avatarUrl={item.avatar} size="md" />
                                    <span className="font-semibold">{displayName}</span> 
                                </Link>
                            )}))}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.getElementById('modal-root')
    );
};

export default UserListModal;