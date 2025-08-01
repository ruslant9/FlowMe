// frontend/src/pages/LoginPage.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import AnimatedSphere from '../components/AnimatedSphere';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import useTitle from '../hooks/useTitle';
import { useWebSocket } from '../context/WebSocketContext'; 

const API_URL = import.meta.env.VITE_API_URL;

// ... (вспомогательные компоненты LeftBlobs, RightBlobs, AnimatedSlogans остаются без изменений) ...

const LeftBlobs = () => (
    <>
        <div className="blob absolute top-0 -left-1/4 w-[500px] h-[500px] bg-cyan-400 opacity-20" style={{ animation: 'move 32s infinite alternate' }}></div>
        <div className="blob absolute bottom-0 left-0 w-[400px] h-[400px] bg-green-400 opacity-20" style={{ animation: 'move 28s infinite alternate-reverse' }}></div>
    </>
);

const RightBlobs = () => (
    <>
        <div className="blob absolute top-0 -right-1/4 w-[600px] h-[600px] bg-purple-600 opacity-30" style={{ animation: 'move 38s infinite alternate-reverse' }}></div>
        <div className="blob absolute bottom-0 right-0 w-[400px] h-[400px] bg-indigo-600 opacity-40" style={{ animation: 'move 25s infinite alternate' }}></div>
    </>
);

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


const LoginPage = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();
  const { login } = useWebSocket(); 
  
  // --- ИЗМЕНЕНИЕ 1: Добавляем состояние для публичного IP ---
  const [publicIp, setPublicIp] = useState(null);

  useTitle('Вход в аккаунт');

  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setFormData(prev => ({ ...prev, email: savedEmail }));
      setRememberMe(true);
    }

    // --- ИЗМЕНЕНИЕ 2: Запрашиваем IP при монтировании компонента ---
    const fetchPublicIp = async () => {
        try {
            const response = await axios.get('https://api.ipify.org?format=json', { withCredentials: false });
            setPublicIp(response.data.ip);
        } catch (error) {
            console.warn("Не удалось получить публичный IP-адрес. Будет использован IP сервера.");
        }
    };
    fetchPublicIp();

  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRememberMeChange = (e) => {
    setRememberMe(e.target.checked);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // --- ИЗМЕНЕНИЕ 3: Добавляем publicIp в тело запроса ---
      const response = await axios.post(`${API_URL}/api/auth/login`, {
          ...formData,
          publicIp: publicIp 
      });
      
      login(response.data.token, response.data.user);
      
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', formData.email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }

      toast.success(response.data.message || 'Вы успешно вошли!');
      navigate('/profile');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="hidden md:block absolute top-1/2 left-[-10%] md:left-[20%] -translate-x-1/2 -translate-y-1/2 z-20 opacity-40 pointer-events-none">
        <AnimatedSphere />
      </div>

      <div className="min-h-screen w-full flex relative">
        
        <div className="w-2/5 flex-col items-center justify-center p-12 relative hidden md:flex">
            <LeftBlobs />
            <div className="relative z-30 text-center">
                <h1 className="text-8xl font-bold text-white tracking-tighter" style={{ textShadow: '0 4px 25px rgba(0,0,0,0.3)' }}>Flow me</h1>
                <AnimatedSlogans />
            </div>
        </div>
        
        <div className="w-full md:w-3/5 flex items-center justify-center p-6 md:p-12 relative">
           <RightBlobs />
           <div className="ios-glass-final relative z-10 w-full max-w-md rounded-3xl p-8">
                <h2 className="text-4xl font-bold mb-2 text-white">Вход в аккаунт</h2>
                <p className="text-white/70 mb-8">Добро пожаловать! Мы рады видеть вас снова.</p>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* ... (остальная часть формы без изменений) ... */}
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={20} />
                    <input type="email" name="email" id="email" className="w-full pl-12 pr-5 py-4 rounded-xl bg-black/30 text-white placeholder-gray-400 border-none focus:outline-none focus:ring-2 focus:ring-white/50" placeholder="Email" onChange={handleChange} value={formData.email} required />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={20} />
                    <input type={showPassword ? "text" : "password"} name="password" id="password" className="w-full pl-12 pr-12 py-4 rounded-xl bg-black/30 text-white placeholder-gray-400 border-none focus:outline-none focus:ring-2 focus:ring-white/50" placeholder="Пароль" onChange={handleChange} required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors" aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}>
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <label htmlFor="rememberMe" className="flex items-center cursor-pointer text-white/70 hover:text-white">
                      <input type="checkbox" id="rememberMe" checked={rememberMe} onChange={handleRememberMeChange} className="form-checkbox h-4 w-4 text-blue-500 rounded-sm border-gray-300 focus:ring-blue-500 bg-black/30 dark:bg-black/50 border-white/30 mr-2" />
                      Запомнить логин
                    </label>
                    <Link to="/forgot-password" className="text-white/70 hover:text-white hover:underline">Забыли пароль?</Link>
                  </div>
                 <button type="submit" className="w-full bg-white text-slate-800 py-4 rounded-xl font-bold text-lg hover:bg-gray-200 transform hover:scale-105 transition-all duration-300 disabled:opacity-50" disabled={loading}>
                  {loading ? 'Вход...' : 'Войти'}
                </button>
                </form>
                <div className="flex items-center my-6"><hr className="flex-grow border-white/20"/><span className="mx-4 text-white/50 text-sm">или</span><hr className="flex-grow border-white/20"/></div>
                <div className="space-y-4">
                    <a href={`${API_URL}/api/auth/google`} className="w-full flex items-center justify-center py-3 px-4 rounded-xl bg-black/30 text-white hover:bg-black/40 transition-colors">
                        <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5 mr-3"/>Продолжить с Google
                    </a>
                </div>
                <p className="mt-8 text-center text-sm text-white/70">Еще нет аккаунта? <Link to="/register" className="font-bold text-white hover:underline">Создать</Link></p>
           </div>
        </div>
      </div>
    </>
  );
};

export default LoginPage;