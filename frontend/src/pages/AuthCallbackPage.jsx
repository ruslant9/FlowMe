// frontend/src/pages/AuthCallbackPage.jsx

import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useWebSocket } from '../context/WebSocketContext';
import axios from 'axios';
import { Loader2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

const AuthCallbackPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useWebSocket();
    const effectRan = useRef(false);

    useEffect(() => {
        if (process.env.NODE_ENV === 'development' && effectRan.current) {
            return;
        }
        
        const finalizeAuthentication = async () => {
            // 1. Получаем токен из URL, который передал бэкенд
            const token = new URLSearchParams(location.search).get('token');

            if (!token) {
                toast.error('Ошибка аутентификации: токен не найден.');
                navigate('/login', { replace: true });
                return;
            }

            try {
                // 2. Отправляем токен на наш новый эндпоинт для установки cookie
                const response = await axios.post(`${API_URL}/api/auth/finalize-google-auth`, { token });

                const { user } = response.data;
                if (user) {
                    // 3. Используем login для обновления контекста и localStorage (для WebSocket)
                    login(token, user); 
                    toast.success('Вы успешно вошли через Google!');
                    navigate('/profile', { replace: true });
                } else {
                    throw new Error('Не получены данные пользователя.');
                }

            } catch (error) {
                console.error('Ошибка на странице AuthCallback:', error);
                toast.error(error.response?.data?.message || 'Произошла ошибка при завершении аутентификации.');
                navigate('/login', { replace: true });
            }
        };

        finalizeAuthentication();

        return () => {
          effectRan.current = true;
        };
    }, [navigate, location, login]);

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