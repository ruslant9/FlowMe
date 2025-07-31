// frontend/src/context/WebSocketContext.jsx

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useUser } from './UserContext';
import toast from 'react-hot-toast';
import CustomToast from '../components/CustomToast';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

const WebSocketContext = createContext(null);

export const useWebSocket = () => {
    const context = useContext(WebSocketContext);
    if (!context) {
        throw new Error('useWebSocket must be used within a WebSocketProvider');
    }
    return context;
};

export const WebSocketProvider = ({ children }) => {
    const ws = useRef(null);
    const [isConnected, setIsConnected] = useState(false);
    const [userStatuses, setUserStatuses] = useState({});
    const reconnectTimeoutRef = useRef(null);
    const { token, updateUserToken, currentUser, refetchUser } = useUser();
    
    const isConnectionInitialized = useRef(false);

    const [activeConversationId, setActiveConversationId] = useState(null);
    const activeConversationIdRef = useRef(activeConversationId);
    
    useEffect(() => {
        activeConversationIdRef.current = activeConversationId;
    }, [activeConversationId]);

    const currentUserRef = useRef(currentUser);
    useEffect(() => {
        currentUserRef.current = currentUser;
    }, [currentUser]);

    const showNotificationToast = useCallback((payload, type) => {
        if (currentUserRef.current?.privacySettings?.disableToasts) {
            return;
        }

        if (type === 'NEW_MESSAGE') {
            if (currentUserRef.current && payload.sender && payload.sender._id === currentUserRef.current._id) {
                return;
            }
            if (activeConversationIdRef.current === payload.conversation && !document.hidden) {
                return;
            }
            if (payload.type === 'system') return;
        } else if (type === 'NEW_NOTIFICATION') {
            if (currentUserRef.current && payload.lastSender && payload.lastSender._id === currentUserRef.current._id) {
                return;
            }
        } else {
            return;
        }
        
        let toastData = { sender: null, title: '', message: '', link: '', entityId: null, type: null };

        if (type === 'NEW_MESSAGE') {
            const senderName = payload.sender?.fullName || payload.sender?.username;
            const messageText = payload.text || (payload.imageUrl ? 'Изображение' : 'Сообщение');
            toastData = { sender: payload.sender, title: 'Новое сообщение', message: `${senderName}: ${messageText}`, link: `/messages/${payload.sender._id}` };
        } else if (type === 'NEW_NOTIFICATION') {
            const sender = payload.lastSender;
            const notificationType = payload.type;
            const previewText = payload.previewText ? `"${payload.previewText.substring(0, 30)}..."` : '';
            
            toastData = { sender, title: sender?.fullName || sender?.username, link: payload.link, entityId: payload.entityId, type: notificationType };

            switch (notificationType) {
                case 'like_post': toastData.message = `понравился ваш пост: ${previewText}`; break;
                case 'like_comment': toastData.message = `понравился ваш комментарий: ${previewText}`; break;
                case 'new_comment': case 'reply_comment': toastData.message = `прокомментировал(а) ваш пост: ${previewText}`; break;
                case 'friend_request': toastData.message = 'отправил(а) вам заявку в друзья.'; toastData.link = '/friends'; break;
                case 'community_join_request': toastData.title = "Заявка на вступление"; toastData.message = `${sender.username} хочет вступить в сообщество ${previewText}.`; break;
                case 'community_request_approved': toastData.sender = { username: payload.previewText, avatar: payload.previewImage }; toastData.title = "Заявка принята"; toastData.message = `Вас приняли в сообщество ${previewText}.`; break;
                case 'community_request_denied': toastData.sender = { username: payload.previewText, avatar: payload.previewImage }; toastData.title = "Заявка отклонена"; toastData.message = `Ваша заявка в сообщество ${previewText} была отклонена.`; break;
                case 'community_invite': toastData.title = "Приглашение в сообщество"; toastData.message = `${sender.username} приглашает вас в ${previewText}.`; break;
                case 'community_invite_accepted': toastData.title = "Приглашение принято"; toastData.message = `${sender.username} вступил(а) в сообщество ${previewText}.`; break;
                case 'community_invite_declined': toastData.title = "Приглашение отклонено"; toastData.message = `${sender.username} отклонил(а) приглашение в ${previewText}.`; break;
                default: return;
            }
        }
        
        new Audio('/notification.mp3').play().catch(e => console.warn("Не удалось воспроизвести звук уведомления:", e));
        
        toast.custom((t) => ( <CustomToast t={t} sender={toastData.sender} title={toastData.title} message={toastData.message} link={toastData.link} entityId={toastData.entityId} type={toastData.type} /> ), { duration: 5000 });
    }, []);

    const connectWebSocket = useCallback(() => {
        const apiUrl = import.meta.env.VITE_API_URL;

        // 2. Заменяем http/https на ws/wss.
        const wsUrl = apiUrl.replace(/^http/, 'ws');
        // --- КОНЕЦ ИЗМЕНЕНИЯ ---

        if (ws.current && (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING)) {
            console.log('WebSocket: Попытка повторного подключения проигнорирована, соединение уже существует.');
            return;
        }

        const socket = new WebSocket(wsUrl); // Используем новую переменную wsUrl
        ws.current = socket;

        socket.onopen = () => {
            console.log('WebSocket: Соединение установлено.');
            setIsConnected(true);
            const wsToken = localStorage.getItem('token');
            if (wsToken) {
                socket.send(JSON.stringify({ type: 'auth', token: wsToken }));
            }
        };
        
        socket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                switch (message.type) {
                    case 'auth_success':
                        console.log('WebSocket: Аутентификация успешна.');
                        break;
                    case 'NEW_NOTIFICATION':
                        window.dispatchEvent(new CustomEvent('NEW_NOTIFICATION', { detail: message.payload }));
                        if (message.payload) {
                            showNotificationToast(message.payload, 'NEW_NOTIFICATION');
                        }
                        break;
                    case 'INITIAL_STATUS':
                        const initialStatuses = message.payload.reduce((acc, user) => {
                            acc[user.userId] = user;
                            return acc;
                        }, {});
                        setUserStatuses(prev => ({ ...prev, ...initialStatuses }));
                        break;
                    case 'FULL_USER_STATUS_UPDATE':
                        setUserStatuses(prev => ({
                            ...prev,
                            [message.payload.userId]: message.payload
                        }));
                        break;
                    case 'USER_DATA_UPDATED':
                        if (currentUserRef.current && message.userId === currentUserRef.current._id) {
                            window.dispatchEvent(new CustomEvent('myProfileDataUpdated'));
                        }
                        window.dispatchEvent(new CustomEvent('userDataUpdated', { detail: { userId: message.userId } }));
                        break;
                    case 'POST_UPDATED':
                        if (message.payload) {
                            window.dispatchEvent(new CustomEvent('postUpdated', { detail: message.payload }));
                        }
                        break;
                    case 'POST_DELETED':
                         window.dispatchEvent(new CustomEvent('postDeleted', { detail: { postId: message.postId } }));
                        break;
                    case 'NEW_MESSAGE':
                         window.dispatchEvent(new CustomEvent('newMessage', { detail: message.payload }));
                         showNotificationToast(message.payload, 'NEW_MESSAGE');
                         break;
                    case 'MESSAGE_UPDATED':
                        window.dispatchEvent(new CustomEvent('messageUpdated', { detail: message.payload }));
                        break;
                    case 'MESSAGES_READ':
                        window.dispatchEvent(new CustomEvent('messagesRead', { detail: message.payload }));
                        break;
                    case 'MESSAGES_DELETED':
                        window.dispatchEvent(new CustomEvent('messagesDeleted', { detail: message.payload }));
                        break;
                    case 'CONVERSATION_UPDATED':
                        window.dispatchEvent(new CustomEvent('conversationUpdated', { detail: message.payload }));
                        break;
                    case 'TYPING':
                        window.dispatchEvent(new CustomEvent('typing', { detail: message.payload }));
                        break;
                    case 'CONVERSATION_DELETED':
                        window.dispatchEvent(new CustomEvent('conversationDeleted', { detail: message.payload }));
                        break;
                    case 'HISTORY_CLEARED':
                        window.dispatchEvent(new CustomEvent('historyCleared', { detail: message.payload }));
                        break;
                    case 'USER_RELATIONSHIP_UPDATE':
                        window.dispatchEvent(new CustomEvent('myProfileDataUpdated'));
                        window.dispatchEvent(new CustomEvent('friendsDataUpdated'));
                        if (activeConversationIdRef.current) {
                            window.dispatchEvent(new CustomEvent('conversationUpdated', { detail: { conversationId: activeConversationIdRef.current } }));
                        }
                        window.dispatchEvent(new CustomEvent('USER_RELATIONSHIP_UPDATE')); 
                        break;
                    case 'COMMUNITY_UPDATED':
                        window.dispatchEvent(new CustomEvent('communityUpdated', { detail: message.payload }));
                        break;
                    case 'MUSIC_UPDATED':
                        window.dispatchEvent(new CustomEvent('myMusicUpdated', { detail: message.payload }));
                        break;
                    case 'PREMIUM_STATUS_UPDATED':
                        toast.success('Ваш Premium-статус был обновлен!');
                        refetchUser();
                        break;
                    default:
                        // console.warn('WebSocket: Получено неизвестное событие:', message.type);
                        break;
                }
            } catch(e) {
                console.error("WebSocket: Не удалось распарсить сообщение от сервера.", event.data, e);
            }
        };
        
        socket.onclose = (event) => {
            console.log(`WebSocket: Соединение закрыто (код: ${event.code})`);
            setIsConnected(false);
            setUserStatuses({});
            ws.current = null;
            
            if (event.code !== 1000) { 
                if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000); 
            }
        };

        socket.onerror = (error) => {
            console.error('WebSocket: Ошибка соединения:', error);
            if (ws.current) {
                ws.current.close();
                ws.current = null;
            }
        };
    }, [refetchUser, showNotificationToast]); 

    useEffect(() => {
        if (token && !isConnectionInitialized.current) {
            connectWebSocket();
            isConnectionInitialized.current = true;
        }

        if (!token && ws.current) {
            ws.current.close(1000, 'User logged out');
            ws.current = null;
            isConnectionInitialized.current = false;
        }

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
        };
    }, [token, connectWebSocket]); 

    const login = useCallback((wsToken, user) => {
        localStorage.setItem('token', wsToken);
        localStorage.setItem('user', JSON.stringify(user));
        updateUserToken(wsToken);
    }, [updateUserToken]);

    const logout = useCallback(async () => {
        try {
            await axios.post(`${API_URL}/api/auth/logout`);
        } catch (error) {
            console.error("Logout request failed:", error);
        } finally {
            updateUserToken(null);
            localStorage.removeItem('rememberedEmail');
        }
    }, [updateUserToken]);

    const contextValue = {
        ws: ws.current,
        isConnected,
        userStatuses,
        login,
        logout,
        setActiveConversationId,
    };

    return (
        <WebSocketContext.Provider value={contextValue}>
            {children}
        </WebSocketContext.Provider>
    );
};