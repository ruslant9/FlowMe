// frontend/src/pages/VerifyEmailPage.jsx
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import useTitle from '../hooks/useTitle';
import BackgroundBlobs from '../components/BackgroundBlobs'; // Импортируем компонент

const API_URL = import.meta.env.VITE_API_URL;

const VerifyEmailPage = () => {
    useTitle('Подтверждение почты');
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const email = location.state?.email;

    const handleSubmit = async (e) => {
      e.preventDefault();
      setLoading(true);
      try {
        const response = await axios.post(`${API_URL}/api/auth/verify-email`, { email, code });
        toast.success(response.data.message);
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        navigate('/');
      } catch (error) {
        toast.error(error.response?.data?.message || 'Ошибка верификации');
      } finally {
        setLoading(false);
      }
    };
    
    if (!email) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center text-center font-sans relative bg-liquid-background overflow-hidden">
            <BackgroundBlobs/>
            <div className="ios-glass-final relative z-10 p-8 rounded-3xl text-red-300">
                Ошибка: Email не был предоставлен. Пожалуйста, вернитесь на страницу регистрации.
            </div>
        </div>
      );
    }
    
    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 font-sans relative bg-liquid-background overflow-hidden">
            <BackgroundBlobs />
            <div className="relative z-10 text-center text-white mb-10">
                <h1 className="text-6xl font-bold" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
                    Flow me
                </h1>
            </div>
            <div className="ios-glass-final w-full max-w-md p-8 rounded-3xl">
                <h2 className="text-3xl font-bold mb-2 text-center text-white">Подтвердите почту</h2>
                <p className="text-center text-white/70 mb-6">
                    Мы отправили 6-значный код на <strong>{email}</strong>
                </p>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <input
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            placeholder="------"
                            maxLength="6"
                            autoComplete="one-time-code"
                            className="w-full px-5 py-4 rounded-xl bg-black/30 text-white text-center text-3xl tracking-[1rem] placeholder-white/40 border-none focus:outline-none focus:ring-2 focus:ring-white/50"
                            required
                        />
                    </div>
                    {/* ИСПРАВЛЕНИЕ: Цвет текста кнопки */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-white text-slate-800 py-4 rounded-xl font-bold text-lg hover:bg-gray-200 transform hover:scale-105 transition-all duration-300 disabled:opacity-50"
                    >
                        {loading ? 'Проверка...' : 'Подтвердить'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default VerifyEmailPage;