// frontend/src/context/UserContext.jsx

import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import axios from 'axios';
import { UserDataCache } from '../utils/UserDataCacheService'; // --- ИМПОРТ
import { jwtDecode } from 'jwt-decode'; // --- ИМПОРТ

const API_URL = import.meta.env.VITE_API_URL;

export const UserContext = createContext(null);

export const useUser = () => {
    return useContext(UserContext);
};

export const UserProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loadingUser, setLoadingUser] = useState(true);
    const [token, setToken] = useState(() => localStorage.getItem('token'));
    const [addedPacks, setAddedPacks] = useState([]);
    const [loadingPacks, setLoadingPacks] = useState(true);

    // --- НАЧАЛО ИЗМЕНЕНИЯ 1: Функция для фонового обновления данных ---
    const fetchFreshData = useCallback(async (currentToken) => {
        if (!currentToken) return;
        try {
            const userPromise = axios.get(`${API_URL}/api/user/profile`, { headers: { Authorization: `Bearer ${currentToken}` } });
            const packsPromise = axios.get(`${API_URL}/api/workshop/packs/added`, { headers: { Authorization: `Bearer ${currentToken}` } });
            const [userRes, packsRes] = await Promise.all([userPromise, packsPromise]);

            const userData = userRes.data;
            const profileDataToCache = { user: userData, friendshipStatus: 'self' };
            await UserDataCache.setUser(userData._id, profileDataToCache);

            setCurrentUser(userData);
            setAddedPacks(packsRes.data);
        } catch (error) {
            console.error("Ошибка фонового обновления данных пользователя:", error);
            if (error.response?.status === 401) {
                // Если токен невалиден, выходим из системы
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                setToken(null);
                setCurrentUser(null);
                setAddedPacks([]);
                UserDataCache.clearAll();
            }
        }
    }, []);

    // --- НАЧАЛО ИЗМЕНЕНИЯ 2: Основной useEffect для загрузки пользователя ---
    useEffect(() => {
        let isMounted = true;
        const loadInitialData = async () => {
            if (token) {
                setLoadingUser(true);
                setLoadingPacks(true);

                let loadedFromCache = false;
                try {
                    const decodedToken = jwtDecode(token);
                    const cachedProfile = await UserDataCache.getUser(decodedToken.userId);
                    if (cachedProfile && isMounted) {
                        setCurrentUser(cachedProfile.user);
                        loadedFromCache = true;
                    }
                } catch (e) {
                    // Невалидный токен, будет обработан в fetchFreshData
                }

                // В любом случае загружаем свежие данные. Если кеша не было, это будет основная загрузка.
                // Если кеш был, это будет фоновое обновление.
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
    // --- КОНЕЦ ИЗМЕНЕНИЯ 2 ---

    const updateUserToken = useCallback((newToken) => {
        setToken(newToken);
        if (newToken) {
            localStorage.setItem('token', newToken);
        } else {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setCurrentUser(null);
            setAddedPacks([]);
            UserDataCache.clearAll(); // Очищаем кеш при выходе
        }
    }, []);


    const value = {
        currentUser,
        loadingUser,
        token,
        updateUserToken,
        refetchUser: () => fetchFreshData(token), // Обновляем refetchUser
        addedPacks,
        loadingPacks,
        refetchPacks: () => fetchFreshData(token), // Обновляем refetchPacks
    };

    return (
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    );
};