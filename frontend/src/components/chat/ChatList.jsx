// frontend/src/components/chat/ChatList.jsx

import React, { useState, useEffect, useRef } from 'react';
import ChatItem from './ChatItem';
import { Loader2, Search, Archive, ChevronDown, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Tippy from '@tippyjs/react/headless';
import 'tippy.js/dist/tippy.css';
import { useUser } from '../../hooks/useUser';

const ChatList = ({ activeConversations, archivedConversations, onSelectConversation, activeConversationId, loading, searchQuery, setSearchQuery, onUpdateList, typingStatuses, unreadArchivedCount, onDeleteRequest, pinnedCount, pinLimit, onOpenPremiumModal, onOptimisticPinUpdate }) => {
    const [showArchived, setShowArchived] = useState(false);
    const [openMenuId, setOpenMenuId] = useState(null);
    const chatListRef = useRef(null);
    const { currentUser } = useUser();

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