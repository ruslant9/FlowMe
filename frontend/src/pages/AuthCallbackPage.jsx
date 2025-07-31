// frontend/src/pages/AuthCallbackPage.jsx

import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useWebSocket } from '../context/WebSocketContext';
import axios from 'axios';
import { Loader2 } from 'lucide-react'; // Импортируем иконку

const API_URL = import.meta.env.VITE_API_URL;

const AuthCallbackPage = () => {
    const navigate = useNavigate();
    const { login } = useWebSocket();
    const effectRan = useRef(false);

    useEffect(() => {
        // Предотвращаем двойной вызов в React.StrictMode
        if (process.env.NODE_ENV === 'development' && effectRan.current === true) {
            return;
        }
        
        const finalizeAuthentication = async () => {
            try {
                // --- ИЗМЕНЕНИЕ: Делаем запрос на бэкенд за токеном ---
                // Браузер автоматически прикрепит HttpOnly cookie к этому запросу
                const response = await axios.get(`${API_URL}/api/auth/session-data`);

                const { token, user } = response.data;

                if (token && user) {
                    // Используем централизованную функцию login для установки токена в localStorage (для WS)
                    // и обновления UserContext
                    login(token, user);
                    toast.success('Вы успешно вошли через Google!');
                    navigate('/profile');
                } else {
                    throw new Error('Не получены данные аутентификации.');
                }
            } catch (error) {
                console.error('Ошибка на странице AuthCallback:', error);
                toast.error(error.response?.data?.message || 'Произошла ошибка при аутентификации.');
                navigate('/login');
            }
        };

        finalizeAuthentication();

        return () => {
          effectRan.current = true;
        };
    }, [navigate, login]); // Зависимости useEffect

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gray-900 text-white">
            <div className="text-center">
                <Loader2 className="w-10 h-10 animate-spin mx-auto text-white/50" />
                <p className="text-2xl mt-4">Завершение аутентификации...</p>
                <p className="text-white/50 mt-2">Пожалуйста, подождите.</p>
            </div>
        </div>
    );
};

export default AuthCallbackPage;