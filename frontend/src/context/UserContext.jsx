// frontend/src/context/UserContext.jsx

import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

export const UserContext = createContext(null);

export const useUser = () => {
    return useContext(UserContext);
};

export const UserProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loadingUser, setLoadingUser] = useState(true);
    const [token, setToken] = useState(() => localStorage.getItem('token'));

    const fetchUser = useCallback(async (showLoader = true) => {
        if (token) {
            if (showLoader) {
                setLoadingUser(true);
            }
            try {
                const res = await axios.get(`${API_URL}/api/user/profile`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const userData = res.data;
                const isBanned = userData.banInfo?.isBanned;
                const banExpires = userData.banInfo?.banExpires ? new Date(userData.banInfo.banExpires) : null;
                
                // Мы всегда сохраняем данные пользователя, даже если он забанен,
                // чтобы BannedOverlay мог отобразить информацию о бане.
                setCurrentUser(userData);

            } catch (error) {
                // --- НАЧАЛО ИСПРАВЛЕНИЯ ---
                // Логируем ошибку, только если это не ожидаемый 403 (бан) или 401 (неавторизован).
                if (error.response?.status !== 403 && error.response?.status !== 401) {
                    console.error("Failed to fetch user in context", error);
                }
                
                // Сбрасываем пользователя (разлогиниваем на клиенте) только при ошибке 401 (неверный токен).
                // При ошибке 403 (бан) мы НЕ сбрасываем пользователя, чтобы он мог видеть оверлей бана.
                if (error.response?.status === 401) {
                    setCurrentUser(null);
                }
                // --- КОНЕЦ ИСПРАВЛЕНИЯ ---
            } finally {
                if (showLoader) {
                    setLoadingUser(false);
                }
            }
        } else {
            setLoadingUser(false);
            setCurrentUser(null);
        }
    }, [token]);

    useEffect(() => {
        fetchUser(true);
        
        const handleProfileUpdate = () => {
            fetchUser(false); 
        };

        window.addEventListener('myProfileDataUpdated', handleProfileUpdate);
        
        return () => {
            window.removeEventListener('myProfileDataUpdated', handleProfileUpdate);
        };

    }, [fetchUser]);

    const updateUserToken = useCallback((newToken) => {
        setToken(newToken);
        if (newToken) {
            localStorage.setItem('token', newToken);
        } else {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setCurrentUser(null);
        }
    }, []);


    const value = {
        currentUser,
        loadingUser,
        token,
        updateUserToken,
        refetchUser: () => fetchUser(false),
    };

    return (
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    );
};