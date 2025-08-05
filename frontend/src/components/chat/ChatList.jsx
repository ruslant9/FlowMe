// frontend/src/components/chat/ChatList.jsx

import React, { useState, useEffect, useRef } from 'react';
import ChatItem from './ChatItem';
import { Loader2, Search, Archive, ChevronDown, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Tippy from '@tippyjs/react/headless';
import 'tippy.js/dist/tippy.css';
import { useUser } from '../../hooks/useUser';
import axios from 'axios'; // <-- НОВЫЙ ИМПОРТ
import toast from 'react-hot-toast'; // <-- НОВЫЙ ИМПОРТ
import Avatar from '../Avatar'; // <-- НОВЫЙ ИМПОРТ
import { Link } from 'react-router-dom'; // <-- НОВЫЙ ИМПОРТ
import { Bookmark } from 'lucide-react'; // <-- НОВЫЙ ИМПОРТ

const API_URL = import.meta.env.VITE_API_URL; // <-- НОВАЯ КОНСТАНТА

const ChatList = ({ activeConversations, archivedConversations, onSelectConversation, activeConversationId, loading, searchQuery, setSearchQuery, onUpdateList, typingStatuses, unreadArchivedCount, onDeleteRequest, pinnedCount, pinLimit, onOpenPremiumModal, onOptimisticPinUpdate }) => {
    const [showArchived, setShowArchived] = useState(false);
    const [openMenuId, setOpenMenuId] = useState(null);
    const chatListRef = useRef(null);
    const { currentUser } = useUser();

    // --- НАЧАЛО ИЗМЕНЕНИЙ: Состояния для админской модалки ---
    const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
    const [adminPinnedList, setAdminPinnedList] = useState([]);
    const [isAdminListLoading, setIsAdminListLoading] = useState(false);

    const handleAdminViewClick = async () => {
        setIsAdminModalOpen(true);
        setIsAdminListLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/api/admin/all-pinned-chats`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setAdminPinnedList(res.data);
        } catch (error) {
            toast.error('Не удалось загрузить список.');
        } finally {
            setIsAdminListLoading(false);
        }
    };
    // --- КОНЕЦ ИЗМЕНЕНИЙ ---


    const handleMenuToggle = (id) => setOpenMenuId(prevId => (prevId === id ? null : id));

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (chatListRef.current && !chatListRef.current.contains(event.target)) {
                setOpenMenuId(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const sortConversations = (a, b) => {
        if (a.isPinned !== b.isPinned) {
            return a.isPinned ? -1 : 1;
        }
        const dateA = new Date(a.lastMessage?.createdAt || a.updatedAt || 0);
        const dateB = new Date(b.lastMessage?.createdAt || b.updatedAt || 0);
        return dateB - dateA;
    };
    
    const renderChatItems = (conversations, isArchived) => {
        const sorted = [...conversations].sort(sortConversations);
        const pinned = sorted.filter(c => c.isPinned);
        const unpinned = sorted.filter(c => !c.isPinned);

        return (
            <>
                {pinned.length > 0 && (
                    <div className="mb-2">
                        {pinned.map((conv, index) => (
                            <React.Fragment key={conv._id}>
                                <ChatItem
                                    conversation={conv}
                                    isSelected={activeConversationId === conv._id}
                                    onClick={() => { onSelectConversation(conv); setOpenMenuId(null); }}
                                    onUpdate={onUpdateList}
                                    isTyping={typingStatuses && typingStatuses[conv._id]}
                                    onMenuToggle={handleMenuToggle}
                                    openMenuId={openMenuId}
                                    isArchived={isArchived}
                                    onDeleteRequest={onDeleteRequest}
                                    isPinned={conv.isPinned}
                                    pinnedCount={pinnedCount}
                                    pinLimit={pinLimit}
                                    onOpenPremiumModal={onOpenPremiumModal}
                                    onOptimisticUpdate={onOptimisticPinUpdate}
                                />
                                {index < pinned.length - 1 && <hr className="my-1 border-slate-200/50 dark:border-slate-700/50" />}
                            </React.Fragment>
                        ))}
                    </div>
                )}
                {unpinned.map((conv) => (
                    <ChatItem
                        key={conv._id}
                        conversation={conv}
                        isSelected={activeConversationId === conv._id}
                        onClick={() => { onSelectConversation(conv); setOpenMenuId(null); }}
                        onUpdate={onUpdateList}
                        isTyping={typingStatuses && typingStatuses[conv._id]}
                        onMenuToggle={handleMenuToggle}
                        openMenuId={openMenuId}
                        isArchived={isArchived}
                        onDeleteRequest={onDeleteRequest}
                        isPinned={conv.isPinned}
                        pinnedCount={pinnedCount}
                        pinLimit={pinLimit}
                        onOpenPremiumModal={onOpenPremiumModal}
                        onOptimisticUpdate={onOptimisticPinUpdate}
                    />
                ))}
            </>
        );
    };

    const tippyContent = currentUser?.premium?.isActive
        ? `Вы Premium-пользователь! Ваш лимит — ${pinLimit} закрепленных чатов.`
        : `Бесплатный лимит — ${pinLimit} чата. Приобретите Premium, чтобы закреплять до 8 чатов.`;

    return (
        <div className="h-full flex flex-col">
            {/* --- НАЧАЛО ИЗМЕНЕНИЙ: Модальное окно для админа --- */}
            <AnimatePresence>
                {isAdminModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsAdminModalOpen(false)}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: -20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="ios-glass-final w-full max-w-md p-6 rounded-3xl flex flex-col text-slate-900 dark:text-white max-h-[80vh]"
                        >
                            <h2 className="text-xl font-bold mb-4">Все закрепленные чаты</h2>
                            <div className="flex-1 overflow-y-auto -mr-2 pr-2 space-y-2">
                                {isAdminListLoading ? (
                                    <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin" /></div>
                                ) : (
                                    adminPinnedList.map(conv => {
                                        const linkTo = conv.isSavedMessages ? '/messages' : `/messages/${conv.interlocutor._id}`;
                                        return (
                                        <Link key={conv._id} to={linkTo} onClick={() => setIsAdminModalOpen(false)} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                                            <div className="flex items-center space-x-3">
                                                {conv.isSavedMessages ? (
                                                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                                                        <Bookmark size={20} className="text-white" fill="white" />
                                                    </div>
                                                ) : (
                                                    <Avatar size="md" username={conv.interlocutor.username} avatarUrl={conv.interlocutor.avatar} />
                                                )}
                                                <span className="font-semibold">{conv.isSavedMessages ? 'Избранное' : (conv.interlocutor.fullName || conv.interlocutor.username)}</span>
                                            </div>
                                            {conv.isArchivedForAdmin && <span className="text-xs font-bold text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded-full">В архиве</span>}
                                        </Link>
                                    )})
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            {/* --- КОНЕЦ ИЗМЕНЕНИЙ --- */}

            <div className="p-4 pb-4 border-b border-slate-200 dark:border-slate-700/50">
                <h1 className="text-2xl font-bold mb-4">Чаты</h1>
                
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Поиск..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                {pinnedCount > 0 && (
                    <div className="flex items-center justify-center space-x-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        <span>Закреплено {pinnedCount} из {pinLimit}</span>
                        <Tippy
                            placement="bottom"
                            render={attrs => (
                                <div 
                                    className="ios-glass-popover px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-800 dark:text-white"
                                    {...attrs}
                                >
                                    {tippyContent}
                                    <div className="tippy-arrow" data-popper-arrow></div>
                                </div>
                            )}
                        >
                            <button className="focus:outline-none">
                                <AlertCircle size={14} className="cursor-help" />
                            </button>
                        </Tippy>
                        {/* --- НАЧАЛО ИЗМЕНЕНИЙ: Кнопка для админа --- */}
                        {currentUser?.role === 'admin' && (
                             <button onClick={handleAdminViewClick} className="focus:outline-none text-red-500" title="Показать все закрепленные (Admin)">
                                <AlertCircle size={14} className="cursor-pointer" />
                            </button>
                        )}
                        {/* --- КОНЕЦ ИЗМЕНЕНИЙ --- */}
                    </div>
                )}
            </div>
            <div ref={chatListRef} className={`flex-1 overflow-y-auto p-2 ${openMenuId ? 'relative z-10' : ''}`}>
                {loading && activeConversations.length === 0 && archivedConversations.length === 0 ? (
                    <div className="flex justify-center items-center h-full">
                        <Loader2 className="animate-spin text-slate-400" size={32} />
                    </div>
                ) : (
                    <div>
                        {archivedConversations.length > 0 && !searchQuery && (
                            <div className="border-b border-slate-200 dark:border-slate-700/50 my-2 pb-2">
                                <button onClick={() => setShowArchived(!showArchived)} className="w-full flex items-center justify-between p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                    <div className="flex items-center space-x-2">
                                        <Archive size={18} />
                                        <span className="font-semibold text-sm">Архив</span>
                                        {unreadArchivedCount > 0 && (
                                            <span className="px-2 py-0.5 text-xs text-white rounded-full bg-blue-500">{unreadArchivedCount}</span>
                                        )}
                                    </div>
                                    <div className="flex items-center space-x-2">  
                                        <span className="text-sm font-bold">{archivedConversations.length}</span>
                                        <ChevronDown size={18} className={`transition-transform ${showArchived ? 'rotate-180' : ''}`} />
                                    </div>
                                </button>
                                <AnimatePresence>
                                    {showArchived && (
                                        <motion.div 
                                        initial={{ height: 0, opacity: 0, overflow: 'hidden' }} 
                                        animate={{ height: 'auto', opacity: 1, transitionEnd: { overflow: 'visible' } }} 
                                        exit={{ height: 0, opacity: 0, overflow: 'hidden' }} 
                                        transition={{ duration: 0.3 }}
                                        >
                                            <div className="p-1 space-y-2">
                                                {renderChatItems(archivedConversations, true)}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}
                        {renderChatItems(activeConversations, false)}

                        {activeConversations.length === 0 && archivedConversations.length > 0 && !searchQuery && (
                             <div className="text-center text-slate-500 dark:text-slate-400 pt-10">
                                 <p>Нет активных чатов.</p>
                                 <p className="text-sm">Все ваши чаты в архиве.</p>
                             </div>
                        )}

                        {activeConversations.length === 0 && archivedConversations.length === 0 && !loading && (
                             <div className="text-center text-slate-500 dark:text-slate-400 pt-10">
                                 <p>Нет активных чатов.</p>
                                 <p className="text-sm">Найдите друзей, чтобы начать общение.</p>
                             </div>
                        )}
                    </div>
                ) }
            </div>
        </div>
    );
};

export default ChatList;