// frontend/src/pages/MessagesPage.jsx

import React, { useState, useEffect, useCallback, useRef } from 'react';
import useTitle from '../hooks/useTitle';
import axios from 'axios';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import ChatList from '../components/chat/ChatList';
import ConversationWindow from '../components/chat/ConversationWindow';
import { MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { useUser } from '../context/UserContext';
import { AnimatePresence } from 'framer-motion';
import DeletionTimerToast from '../components/chat/DeletionTimerToast';

const API_URL = import.meta.env.VITE_API_URL;

const MessagesPage = () => {
    useTitle('Сообщения');
    const navigate = useNavigate();
    const location = useLocation();
    const { userId: userIdFromParams } = useParams();
    const { currentUser } = useUser(); 

    const [conversations, setConversations] = useState([]);
    const [activeConversation, setActiveConversation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const hasFetchedForParams = useRef(false);
    const initialLoadCompleteRef = useRef(false);
    const [typingStatuses, setTypingStatuses] = useState({});
    
    const [pendingDeletion, setPendingDeletion] = useState(null);
    const deletionTimerRef = useRef(null);
    const countdownIntervalRef = useRef(null);

    const conversationsRef = useRef(conversations);
    useEffect(() => {
        conversationsRef.current = conversations;
    }, [conversations]);

    const activeConversationRef = useRef(activeConversation);
    useEffect(() => {
        activeConversationRef.current = activeConversation;
    }, [activeConversation]);

    const refetchSingleConversation = useCallback(async (conversationId) => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/api/messages/conversations/${conversationId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const updatedConv = res.data;
            
            setConversations(prev => {
                const index = prev.findIndex(c => c._id === updatedConv._id);
                let newList;
                if (index > -1) {
                    newList = [...prev];
                    newList[index] = updatedConv;
                } else {
                    newList = [updatedConv, ...prev];
                }
                newList.sort((a, b) => {
                    if (a.isSavedMessages) return -1;
                    if (b.isSavedMessages) return 1;
                    return new Date(b.lastMessage?.createdAt || b.updatedAt || 0) - new Date(a.lastMessage?.createdAt || a.updatedAt || 0)
                });
                return newList;
            });

            if (activeConversationRef.current?._id === conversationId) {
                setActiveConversation(updatedConv);
            }

        } catch (error) {
            console.error(`Failed to refetch conversation ${conversationId}`, error);
        }
    }, []);

    const fetchConversations = useCallback(async (showLoader = true) => {
        if (showLoader) {
            setLoading(true);
        }
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/api/messages/conversations`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setConversations(res.data);
            return res.data;
        } catch (error) {
            console.error("Failed to fetch conversations", error);
        } finally {
            if (showLoader) {
                setLoading(false);
            }
        }
    }, []);

    const findOrCreateConversationWithUser = useCallback(async (userId) => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/api/messages/conversations/with/${userId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const conversationData = res.data;

            setConversations(prev => {
                const isAlreadyInList = prev.some(c => c._id === conversationData._id);
                if (isAlreadyInList) {
                    return prev.map(c => c._id === conversationData._id ? conversationData : c);
                }
                return [conversationData, ...prev];
            });
            
            setActiveConversation(conversationData);

        } catch (error) {
            toast.error(error.response?.data?.message || "Не удалось открыть чат.");
            navigate('/messages', { replace: true });
        }
    }, [navigate]);
    
    useEffect(() => {
        const initialize = async () => {
            await fetchConversations(!initialLoadCompleteRef.current);
            initialLoadCompleteRef.current = true; 
            const conversationFromState = location.state?.conversation;
            if (userIdFromParams && !hasFetchedForParams.current) {
                hasFetchedForParams.current = true;
                await findOrCreateConversationWithUser(userIdFromParams);
            } else if (conversationFromState) {
                setConversations(prev => {
                    const isAlreadyInList = prev.some(c => c._id === conversationFromState._id);
                    return isAlreadyInList ? prev.map(c => c._id === conversationFromState._id ? conversationFromState : c) : [conversationFromState, ...prev];
                });
                setActiveConversation(conversationFromState);
                navigate(location.pathname, { replace: true, state: {} });
            }
        };
        initialize();
    }, [location.state, userIdFromParams, fetchConversations, findOrCreateConversationWithUser, navigate, location.pathname]);

    useEffect(() => {
        const handleTyping = (e) => setTypingStatuses(prev => ({ ...prev, [e.detail.conversationId]: e.detail.isTyping }));
        
        const handleMessagesRead = (e) => {
             const { conversationId, readerId } = e.detail;
            setConversations(prev => prev.map(conv => {
                if (conv._id === conversationId && conv.lastMessage) {
                    const isAlreadyRead = conv.lastMessage.readBy && conv.lastMessage.readBy.includes(readerId);
                    if (isAlreadyRead) return conv;
                    return { ...conv, lastMessage: { ...conv.lastMessage, readBy: [...(conv.lastMessage.readBy || []), readerId] } };
                }
                return conv;
            }));
        };
        
        const handleNewMessage = (e) => {
            const newMessage = e.detail;
            refetchSingleConversation(newMessage.conversation);
        };
        
        const handleConversationUpdate = (e) => {
            const { conversationId } = e.detail;
            if (conversationId) {
                refetchSingleConversation(conversationId);
            } else if (e.detail.conversation) {
                refetchSingleConversation(e.detail.conversation._id);
            }
        };

        const handleConversationDeleted = (e) => {
            const { conversationId } = e.detail;
            setConversations(prev => prev.filter(c => c._id !== conversationId));
            if (activeConversationRef.current?._id === conversationId) {
                setActiveConversation(null);
                navigate('/messages', { replace: true });
            }
        };

        const handleHistoryCleared = (e) => {
            const { conversationId, clearedBy } = e.detail;
            const myUserId = currentUser?._id;
            if (clearedBy === myUserId && activeConversationRef.current?._id === conversationId) {
                setActiveConversation(prev => ({...prev, forceMessageRefetch: true}));
            }
            fetchConversations(false);
        };
        
        const handleUserDataUpdated = (e) => {
            const updatedUserId = e.detail.userId;
            const activeConv = activeConversationRef.current;
            if (activeConv && activeConv.interlocutor?._id === updatedUserId) {
                refetchSingleConversation(activeConv._id);
            } else {
                const relevantConversationInList = conversationsRef.current.find(c =>
                    c.interlocutor?._id === updatedUserId
                );
                if (relevantConversationInList) {
                    fetchConversations(false);
                }
            }
        };

        window.addEventListener('userDataUpdated', handleUserDataUpdated);
        window.addEventListener('typing', handleTyping);
        window.addEventListener('messagesRead', handleMessagesRead);
        window.addEventListener('newMessage', handleNewMessage);
        window.addEventListener('conversationUpdated', handleConversationUpdate);
        window.addEventListener('conversationDeleted', handleConversationDeleted);
        window.addEventListener('historyCleared', handleHistoryCleared);

        return () => {
            window.removeEventListener('userDataUpdated', handleUserDataUpdated);
            window.removeEventListener('typing', handleTyping);
            window.removeEventListener('messagesRead', handleMessagesRead);
            window.removeEventListener('newMessage', handleNewMessage);
            window.removeEventListener('conversationUpdated', handleConversationUpdate);
            window.removeEventListener('conversationDeleted', handleConversationDeleted);
            window.removeEventListener('historyCleared', handleHistoryCleared);
        };
    }, [fetchConversations, navigate, currentUser, refetchSingleConversation]);

    const cancelDeletion = () => {
        if (deletionTimerRef.current) clearTimeout(deletionTimerRef.current);
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        setPendingDeletion(null);
        toast('Удаление отменено.', { icon: '👍' });
    };

    // --- НАЧАЛО ИСПРАВЛЕНИЯ 1: Функция принимает и передает `addToBlacklist` ---
    const performChatDeletion = useCallback(async (conversationId, forEveryone, addToBlacklist) => {
        const toastId = toast.loading("Удаление чата...");
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}/api/messages/conversations/${conversationId}`, {
                headers: { Authorization: `Bearer ${token}` },
                data: { forEveryone, addToBlacklist } // Передаем флаг блокировки
            });
            toast.success(forEveryone ? "Чат удален" : "История очищена", { id: toastId });
            setConversations(prev => prev.filter(c => c._id !== conversationId));
            if (activeConversationRef.current?._id === conversationId) {
                setActiveConversation(null);
                navigate('/messages', { replace: true });
            }
        } catch (error) {
            toast.error("Ошибка при удалении чата", { id: toastId });
        }
    }, [navigate]);

    // --- НАЧАЛО ИСПРАВЛЕНИЯ 2: Функция принимает и передает `addToBlacklist` ---
    const handleDeleteRequest = useCallback((conversationId, forEveryone, addToBlacklist) => {
        if (deletionTimerRef.current) clearTimeout(deletionTimerRef.current);
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

        setPendingDeletion({ conversationId, forEveryone, addToBlacklist, timeLeft: 5 });

        countdownIntervalRef.current = setInterval(() => {
            setPendingDeletion(prev => {
                if (!prev || prev.timeLeft <= 1) {
                    clearInterval(countdownIntervalRef.current);
                    return prev;
                }
                return { ...prev, timeLeft: prev.timeLeft - 1 };
            });
        }, 1000);

        deletionTimerRef.current = setTimeout(() => {
            performChatDeletion(conversationId, forEveryone, addToBlacklist);
            setPendingDeletion(null);
        }, 5000);
    }, [performChatDeletion]);
    // --- КОНЕЦ ИСПРАВЛЕНИЙ ---

    const filteredConversations = conversations.filter(conv => {
        const lowerCaseQuery = searchQuery.toLowerCase();
        if (conv.isSavedMessages) {
            return lowerCaseQuery === '' || 'избранное'.includes(lowerCaseQuery);
        }
        return (
            conv.interlocutor?.fullName?.toLowerCase().includes(lowerCaseQuery) ||
            conv.interlocutor?.username.toLowerCase().includes(lowerCaseQuery)
        );
    });

    const activeConversations = filteredConversations.filter(c => !c.isArchived);
    const archivedConversations = filteredConversations.filter(c => c.isArchived);
    const unreadArchivedCount = archivedConversations.reduce((acc, curr) => acc + (curr.unreadCount || 0), 0);

    const pinnedCount = conversations.filter(c => c.isPinned).length;
    const pinLimit = currentUser?.premium?.isActive ? 8 : 4;

    const handleSelectConversation = (conv) => {
        const newPath = conv.isSavedMessages ? '/messages' : `/messages/${conv.interlocutor._id}`;
        navigate(newPath, { replace: true });
        setActiveConversation(conv);
    };

    return (
        <div className="flex h-full relative">
            <div className={`
                ${activeConversation ? 'hidden md:flex' : 'flex'}
                w-full md:w-[380px] flex-col flex-shrink-0 border-r border-slate-300 dark:border-slate-700/50
            `}>
                <ChatList
                    activeConversations={activeConversations}
                    archivedConversations={archivedConversations}
                    onSelectConversation={handleSelectConversation}
                    activeConversationId={activeConversation?._id}
                    loading={loading}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    onUpdateList={() => fetchConversations(false)}
                    typingStatuses={typingStatuses}
                    unreadArchivedCount={unreadArchivedCount}
                    onDeleteRequest={handleDeleteRequest}
                    pinnedCount={pinnedCount}
                    pinLimit={pinLimit}
                />
            </div>
            <div className={`
                ${activeConversation ? 'flex' : 'hidden md:flex'}
                flex-1 flex-col
            `}>
                {activeConversation ? (
                    <ConversationWindow
                        key={activeConversation.interlocutor._id}
                        conversation={activeConversation}
                        onDeselectConversation={() => {
                            setActiveConversation(null);
                            navigate('/messages', { replace: true });
                        }}
                        onDeleteRequest={handleDeleteRequest}
                    />
                ) : (
                    <div className="h-full flex-col flex items-center justify-center text-slate-500 dark:text-slate-400 p-8 text-center">
                        <MessageSquare size={48} className="mb-4" />
                        <h2 className="text-xl font-semibold">Выберите чат</h2>
                        <p>Начните общение с друзьями или найдите новых!</p>
                    </div>
                )}
            </div>
            <AnimatePresence>
                {pendingDeletion && (
                    <DeletionTimerToast
                        onCancel={cancelDeletion}
                        timeLeft={pendingDeletion.timeLeft}
                        forEveryone={pendingDeletion.forEveryone}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default MessagesPage;