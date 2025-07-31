// frontend/src/pages/ResetPasswordPage.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import useTitle from '../hooks/useTitle';
import BackgroundBlobs from '../components/BackgroundBlobs';
import { Lock } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

const ResetPasswordPage = () => {
    useTitle('Новый пароль');
    const [formData, setFormData] = useState({ password: '', confirmPassword: '' });
    const [loading, setLoading] = useState(false);
    
    const { token } = useParams(); // Получаем токен из URL
    const navigate = useNavigate();

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            return toast.error('Пароли не совпадают!');
        }
        setLoading(true);
        try {
            const response = await axios.post(`${API_URL}/api/auth/reset-password/${token}`, {
                password: formData.password,
                confirmPassword: formData.confirmPassword
            });
            toast.success(response.data.message);
            navigate('/login');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Произошла ошибка');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 font-sans relative bg-liquid-background overflow-hidden">
            <BackgroundBlobs />
            <div className="ios-glass-final w-full max-w-md p-8 rounded-3xl relative z-10">
                <h2 className="text-3xl font-bold mb-2 text-white">Установите новый пароль</h2>
                <p className="text-white/70 mb-8">Придумайте надежный пароль, который вы не забудете.</p>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={20} />
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            className="w-full pl-12 pr-5 py-4 rounded-xl bg-black/30 text-white placeholder-gray-400 border-none focus:outline-none focus:ring-2 focus:ring-white/50"
                            placeholder="Новый пароль"
                            required
                        />
                    </div>
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={20} />
                        <input
                            type="password"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            className="w-full pl-12 pr-5 py-4 rounded-xl bg-black/30 text-white placeholder-gray-400 border-none focus:outline-none focus:ring-2 focus:ring-white/50"
                            placeholder="Повторите пароль"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-white text-slate-800 py-4 rounded-xl font-bold text-lg hover:bg-gray-200 transform hover:scale-105 transition-all duration-300 disabled:opacity-50"
                    >
                        {loading ? 'Сохранение...' : 'Сохранить пароль'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ResetPasswordPage;