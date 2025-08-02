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

    // ИЗМЕНЕНИЕ: Добавлен параметр showLoader, по умолчанию true.
    const fetchUser = useCallback(async (showLoader = true) => {
        if (token) {
            // Устанавливаем флаг загрузки, только если это требуется.
            if (showLoader) {
                setLoadingUser(true);
            }
            try {
                const res = await axios.get(`${API_URL}/api/user/profile`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setCurrentUser(res.data);
            } catch (error) {
                console.error("Failed to fetch user in context", error);
                setCurrentUser(null);
            } finally {
                // Снимаем флаг загрузки, только если мы его устанавливали.
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
        // Первая, начальная загрузка всегда должна показывать спиннер.
        fetchUser(true);
        
        // Все последующие обновления, инициированные событием, - фоновые.
        const handleProfileUpdate = () => {
            fetchUser(false); 
        };

        window.addEventListener('myProfileDataUpdated', handleProfileUpdate);
        
        return () => {
            window.removeEventListener('myProfileDataUpdated', handleProfileUpdate);
        };

    }, [fetchUser]);

    // --- НАЧАЛО ИСПРАВЛЕНИЯ ---
    const updateUserToken = useCallback((newToken) => {
        setToken(newToken);
        if (newToken) {
            localStorage.setItem('token', newToken);
        } else {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setCurrentUser(null);
        }
    }, []); // Пустой массив зависимостей делает эту функцию стабильной и предотвращает лишние ререндеры
    // --- КОНЕЦ ИСПРАВЛЕНИЯ ---


    const value = {
        currentUser,
        loadingUser,
        token,
        updateUserToken,
        // Принудительный refetch тоже делаем фоновым по умолчанию.
        refetchUser: () => fetchUser(false),
    };

    return (
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    );
};