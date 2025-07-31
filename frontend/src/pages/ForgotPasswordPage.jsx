// frontend/src/pages/ForgotPasswordPage.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import useTitle from '../hooks/useTitle';
import BackgroundBlobs from '../components/BackgroundBlobs';
import { Mail, ArrowLeft } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

const ForgotPasswordPage = () => {
  useTitle('Восстановление пароля');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [messageSent, setMessageSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/auth/forgot-password`, { email });
      toast.success(response.data.message);
      setMessageSent(true);
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
            {messageSent ? (
                <div className="text-center">
                    <Mail size={48} className="mx-auto text-green-400 mb-4" />
                    <h2 className="text-3xl font-bold mb-2 text-white">Проверьте почту</h2>
                    <p className="text-white/70 mb-6">
                        Мы отправили ссылку для восстановления пароля на <strong>{email}</strong>.
                    </p>
                    <Link to="/login" className="flex items-center justify-center text-white/80 hover:text-white">
                        <ArrowLeft size={16} className="mr-2"/> Вернуться ко входу
                    </Link>
                </div>
            ) : (
                <>
                    <h2 className="text-3xl font-bold mb-2 text-white">Забыли пароль?</h2>
                    <p className="text-white/70 mb-8">Не беда! Введите вашу почту, и мы пришлем ссылку для восстановления.</p>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={20} />
                            <input
                                type="email"
                                name="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-12 pr-5 py-4 rounded-xl bg-black/30 text-white placeholder-gray-400 border-none focus:outline-none focus:ring-2 focus:ring-white/50"
                                placeholder="Ваш Email"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-white text-slate-800 py-4 rounded-xl font-bold text-lg hover:bg-gray-200 transform hover:scale-105 transition-all duration-300 disabled:opacity-50"
                        >
                            {loading ? 'Отправка...' : 'Отправить ссылку'}
                        </button>
                    </form>
                    <p className="mt-8 text-center text-sm text-white/70">
                        <Link to="/login" className="font-bold text-white hover:underline flex items-center justify-center">
                            <ArrowLeft size={16} className="mr-2"/> Я вспомнил пароль
                        </Link>
                    </p>
                </>
            )}
        </div>
    </div>
  );
};

export default ForgotPasswordPage;