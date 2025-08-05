// frontend/src/context/NotificationContext.jsx

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useUser } from '../hooks/useUser';

const API_URL = import.meta.env.VITE_API_URL;

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
    const [summary, setSummary] = useState({
        unreadNotificationsCount: 0,
        friendRequestsCount: 0,
        unreadConversationsCount: 0
    });
    const { token } = useUser();

    const fetchSummary = useCallback(async () => {
        if (!token) {
            setSummary({ unreadNotificationsCount: 0, friendRequestsCount: 0, unreadConversationsCount: 0 });
            return;
        }
        try {
            const res = await axios.get(`${API_URL}/api/user/notifications/summary`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSummary(res.data);
        } catch (error) {
            console.error('Failed to fetch notification summary:', error);
        }
    }, [token]);

    useEffect(() => {
        fetchSummary();

        // This comprehensive list of events ensures the counts are updated
        // whenever a relevant action happens anywhere in the app.
        const eventsToListen = [
            'NEW_NOTIFICATION',
            'messagesRead',
            'newMessage',
            'friendsDataUpdated',
            'conversationDeleted',
            'USER_RELATIONSHIP_UPDATE',
            'conversationUpdated'
        ];

        eventsToListen.forEach(event => window.addEventListener(event, fetchSummary));

        return () => {
            eventsToListen.forEach(event => window.removeEventListener(event, fetchSummary));
        };
    }, [fetchSummary]);

    return (
        <NotificationContext.Provider value={{ summary, fetchSummary }}>
            {children}
        </NotificationContext.Provider>
    );
};