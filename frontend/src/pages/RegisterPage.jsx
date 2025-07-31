// frontend/src/pages/RegisterPage.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import AnimatedSphere from '../components/AnimatedSphere';
import BackgroundBlobs from '../components/BackgroundBlobs'; // Импортируем компонент
// ИСПРАВЛЕНИЕ: Добавлены иконки Eye и EyeOff для переключения видимости пароля
import { Mail, Lock, User as UserIcon, Eye, EyeOff } from 'lucide-react';
import useTitle from '../hooks/useTitle';

const API_URL = import.meta.env.VITE_API_URL;

const AnimatedSlogans = () => {
    const slogans = ["Connect with friends.", "Share your moments.", "Discover new ideas.", "Create your community."];
    const [index, setIndex] = useState(0);
    useEffect(() => {
        const interval = setInterval(() => { setIndex(prev => (prev + 1) % slogans.length); }, 3000);
        return () => clearInterval(interval);
    }, []);
    return (
        <div className="relative h-8 mt-4">
            {slogans.map((slogan, i) => (
                <p key={i} className={`absolute w-full text-center text-white/70 text-lg transition-opacity duration-1000 ${i === index ? 'opacity-100' : 'opacity-0'}`}>{slogan}</p>
            ))}
        </div>
    );
};

const RegisterPage = () => {
  useTitle('Создание аккаунта');
  const [formData, setFormData] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  // ИСПРАВЛЕНИЕ: Состояние для отслеживания видимости пароля
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error('Пароли не совпадают!');
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/auth/register`, formData);
      toast.success(response.data.message);
      navigate('/verify-email', { state: { email: formData.email } });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full font-sans bg-liquid-background overflow-hidden">
      <div className="min-h-screen w-full flex relative">
        <div className="w-2/5 flex-col items-center justify-center p-12 relative hidden md:flex">
            <BackgroundBlobs />
            <div className="absolute z-10 opacity-50"><AnimatedSphere /></div>
            <div className="relative z-20 text-center">
                <h1 className="text-8xl font-bold text-white tracking-tighter" style={{ textShadow: '0 4px 25px rgba(0,0,0,0.3)' }}>Flow me</h1>
                <AnimatedSlogans />
            </div>
        </div>
        <div className="w-full md:w-3/5 flex items-center justify-center p-6 md:p-12 relative">
           <BackgroundBlobs />
           <div className="ios-glass-final relative z-10 w-full max-w-md rounded-3xl p-8">
            <h2 className="text-4xl font-bold mb-2 text-white">Создание аккаунта</h2>
            <p className="text-white/70 mb-8">Присоединяйтесь к нам и начните свой путь!</p>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={20} />
                <input type="text" name="username" id="username" className="w-full pl-12 pr-5 py-4 rounded-xl bg-black/30 text-white placeholder-white/40 border-none focus:outline-none focus:ring-2 focus:ring-white/50" placeholder="Имя пользователя" onChange={handleChange} required />
              </div>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={20} />
                <input type="email" name="email" id="email" className="w-full pl-12 pr-5 py-4 rounded-xl bg-black/30 text-white placeholder-white/40 border-none focus:outline-none focus:ring-2 focus:ring-white/50" placeholder="Email" onChange={handleChange} required />
              </div>
              {/* ИСПРАВЛЕНИЕ: Добавлен глазок для переключения видимости пароля */}
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={20} />
                <input type={showPassword ? 'text' : 'password'} name="password" id="password" className="w-full pl-12 pr-12 py-4 rounded-xl bg-black/30 text-white placeholder-white/40 border-none focus:outline-none focus:ring-2 focus:ring-white/50" placeholder="Пароль" onChange={handleChange} required />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="text-white/30 hover:text-white/50" size={20} /> : <Eye className="text-white/30 hover:text-white/50" size={20} />}
                </div>
              </div>
              {/* ИСПРАВЛЕНИЕ: Добавлен глазок для переключения видимости пароля */}
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={20} />
                <input type={showConfirmPassword ? 'text' : 'password'} name="confirmPassword" id="confirmPassword" className="w-full pl-12 pr-12 py-4 rounded-xl bg-black/30 text-white placeholder-white/40 border-none focus:outline-none focus:ring-2 focus:ring-white/50" placeholder="Повторите пароль" onChange={handleChange} required />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                  {showConfirmPassword ? <EyeOff className="text-white/30 hover:text-white/50" size={20} /> : <Eye className="text-white/30 hover:text-white/50" size={20} />}
                </div>
              </div>
              <button type="submit" className="w-full bg-white text-slate-800 py-4 rounded-xl font-bold text-lg hover:bg-gray-200 transform hover:scale-105 transition-all duration-300 disabled:opacity-50" disabled={loading}>{loading ? 'Создание...' : 'Зарегистрироваться'}</button>
            </form>
            <p className="mt-8 text-center text-sm text-white/70">Уже есть аккаунт? <Link to="/login" className="font-bold text-white hover:underline">Войти</Link></p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;