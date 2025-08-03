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
    // --- НАЧАЛО ИЗМЕНЕНИЯ ---
    const [addedPacks, setAddedPacks] = useState([]);
    const [loadingPacks, setLoadingPacks] = useState(true);
    // --- КОНЕЦ ИЗМЕНЕНИЯ ---

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
                
                setCurrentUser(userData);

            } catch (error) {
                if (error.response?.status !== 403 && error.response?.status !== 401) {
                    console.error("Failed to fetch user in context", error);
                }
                
                if (error.response?.status === 401) {
                    setCurrentUser(null);
                }
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

    // --- НАЧАЛО ИЗМЕНЕНИЯ ---
    const fetchAddedPacks = useCallback(async (showLoader = true) => {
        if (token) {
            if (showLoader) setLoadingPacks(true);
            try {
                const res = await axios.get(`${API_URL}/api/workshop/packs/added`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setAddedPacks(res.data);
            } catch (error) {
                console.error("Failed to fetch added packs:", error);
                setAddedPacks([]);
            } finally {
                if (showLoader) setLoadingPacks(false);
            }
        } else {
            setAddedPacks([]);
            setLoadingPacks(false);
        }
    }, [token]);
    // --- КОНЕЦ ИЗМЕНЕНИЯ ---

    useEffect(() => {
        fetchUser(true);
        // --- НАЧАЛО ИЗМЕНЕНИЯ ---
        fetchAddedPacks(true);
        
        const handleProfileUpdate = () => {
            fetchUser(false); 
        };
        
        // Отдельный обработчик для паков, чтобы не перезагружать профиль лишний раз
        const handlePacksUpdate = () => {
            fetchAddedPacks(false);
        };
        
        window.addEventListener('myProfileDataUpdated', handleProfileUpdate);
        window.addEventListener('packsUpdated', handlePacksUpdate); 
        // --- КОНЕЦ ИЗМЕНЕНИЯ ---
        
        return () => {
            window.removeEventListener('myProfileDataUpdated', handleProfileUpdate);
            // --- НАЧАЛО ИЗМЕНЕНИЯ ---
            window.removeEventListener('packsUpdated', handlePacksUpdate);
            // --- КОНЕЦ ИЗМЕНЕНИЯ ---
        };

    }, [fetchUser, fetchAddedPacks]);

    const updateUserToken = useCallback((newToken) => {
        setToken(newToken);
        if (newToken) {
            localStorage.setItem('token', newToken);
        } else {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setCurrentUser(null);
            // --- НАЧАЛО ИЗМЕНЕНИЯ ---
            setAddedPacks([]); // Очищаем паки при выходе
            // --- КОНЕЦ ИЗМЕНЕНИЯ ---
        }
    }, []);


    const value = {
        currentUser,
        loadingUser,
        token,
        updateUserToken,
        refetchUser: () => fetchUser(false),
        // --- НАЧАЛО ИЗМЕНЕНИЯ ---
        addedPacks,
        loadingPacks,
        refetchPacks: () => fetchAddedPacks(false),
        // --- КОНЕЦ ИЗМЕНЕНИЯ ---
    };

    return (
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    );
};