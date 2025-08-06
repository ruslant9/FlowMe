// frontend/src/context/UserContext.jsx

import React, { createContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
// --- ИЗМЕНЕНИЕ: Удален импорт UserDataCache ---
// import { UserDataCache } from '../utils/UserDataCacheService';
import { jwtDecode } from 'jwt-decode';

const API_URL = import.meta.env.VITE_API_URL;

export const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loadingUser, setLoadingUser] = useState(true);
    const [token, setToken] = useState(() => localStorage.getItem('token'));
    const [addedPacks, setAddedPacks] = useState([]);
    const [loadingPacks, setLoadingPacks] = useState(true);

    const fetchFreshData = useCallback(async (currentToken) => {
        if (!currentToken) return;
        try {
            const userPromise = axios.get(`${API_URL}/api/user/profile`, { headers: { Authorization: `Bearer ${currentToken}` } });
            const packsPromise = axios.get(`${API_URL}/api/workshop/packs/added`, { headers: { Authorization: `Bearer ${currentToken}` } });
            const [userRes, packsRes] = await Promise.all([userPromise, packsPromise]);

            const userData = userRes.data;
            // --- ИЗМЕНЕНИЕ: Логика сохранения в кеш удалена ---
            // const profileDataToCache = { user: userData, friendshipStatus: 'self' };
            // await UserDataCache.setUser(userData._id, profileDataToCache);

            setCurrentUser(userData);
            setAddedPacks(packsRes.data);
        } catch (error) {
            console.error("Ошибка фонового обновления данных пользователя:", error);
            if (error.response?.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                setToken(null);
                setCurrentUser(null);
                setAddedPacks([]);
                // --- ИЗМЕНЕНИЕ: Очистка кеша удалена ---
                // UserDataCache.clearAll();
            }
        }
    }, []);

    useEffect(() => {
        let isMounted = true;
        const loadInitialData = async () => {
            if (token) {
                setLoadingUser(true);
                setLoadingPacks(true);

                // --- ИЗМЕНЕНИЕ: Вся логика загрузки из кеша полностью удалена.
                // Теперь данные всегда запрашиваются с сервера при инициализации.
                await fetchFreshData(token);

                if (isMounted) {
                    setLoadingUser(false);
                    setLoadingPacks(false);
                }

            } else {
                setLoadingUser(false);
                setLoadingPacks(false);
                setCurrentUser(null);
                setAddedPacks([]);
            }
        };

        loadInitialData();

        const refetchAll = () => fetchFreshData(localStorage.getItem('token'));
        window.addEventListener('myProfileDataUpdated', refetchAll);
        window.addEventListener('packsUpdated', refetchAll);

        return () => {
            isMounted = false;
            window.removeEventListener('myProfileDataUpdated', refetchAll);
            window.removeEventListener('packsUpdated', refetchAll);
        };
    }, [token, fetchFreshData]);

    const updateUserToken = useCallback((newToken) => {
        setToken(newToken);
        if (newToken) {
            localStorage.setItem('token', newToken);
        } else {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setCurrentUser(null);
            setAddedPacks([]);
            // --- ИЗМЕНЕНИЕ: Очистка кеша удалена ---
            // UserDataCache.clearAll();
        }
    }, []);


    const value = {
        currentUser,
        loadingUser,
        token,
        updateUserToken,
        refetchUser: () => fetchFreshData(token),
        addedPacks,
        loadingPacks,
        refetchPacks: () => fetchFreshData(token),
    };

    return (
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    );
};