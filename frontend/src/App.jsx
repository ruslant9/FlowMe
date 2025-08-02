// frontend/src/App.jsx

import { Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import React, { useState, useEffect, Suspense } from 'react';
import Sidebar from './components/Sidebar';
import { Sun, Moon, Loader2 } from 'lucide-react';
import { useUser } from './context/UserContext';

// Ленивая загрузка нашего тяжелого компонента с шейдерами
const LiquidGlassBackground = React.lazy(() => import('./components/LiquidGlassBackground'));

// Импортируем наши страницы и обертку
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import HomePage from './pages/HomePage';
import MyProfilePage from './pages/MyProfilePage';
import UserProfilePage from './pages/UserProfilePage';
import NotificationsPage from './pages/NotificationsPage';
import FriendsPage from './pages/FriendsPage';
import MessagesPage from './pages/MessagesPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import PageWrapper from './components/PageWrapper';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import AuthLayout from './components/AuthLayout';
import SettingsPage from './pages/SettingsPage';
import CommunitiesPage from './pages/CommunitiesPage';
import CommunityDetailPage from './pages/CommunityDetailPage';
import CommunityManagementPage from './pages/CommunityManagementPage';
import MusicPage from './pages/MusicPage';
import PlaylistPage from './pages/PlaylistPage'; // <-- НОВЫЙ ИМПОРТ
import axios from 'axios';
import PremiumPage from './pages/PremiumPage';
import AdminPage from './pages/AdminPage'; 

// Импорт MusicPlayerProvider и MusicPlayerBar
import { MusicPlayerProvider, useMusicPlayer } from './context/MusicPlayerContext';
import MusicPlayerBar from './components/music/MusicPlayerBar';

// Компонент переключения темы
const ThemeSwitcher = ({ theme, toggleTheme }) => (
  <div className="flex items-center justify-center space-x-2 p-2 rounded-lg">
    <Sun size={18} className="text-yellow-400" />
    <label htmlFor="theme-switch" className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        id="theme-switch"
        className="sr-only peer"
        checked={theme === 'dark'}
        onChange={toggleTheme}
      />
      <div className="w-11 h-6 bg-gray-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
    </label>
    <Moon size={18} className="text-slate-400" />
  </div>
);

const MainLayout = ({ children }) => {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const {
    currentTrack,
    isPlaying,
    progress,
    duration,
    volume,
    isShuffle,
    isRepeat,
    isLiked,
    togglePlayPause,
    seekTo,
    setVolume,
    toggleShuffle,
    prevTrack,
    nextTrack,
    toggleRepeat,
    onToggleLike,
    buffered,
    stopAndClearPlayer,
    playerNotification
  } = useMusicPlayer();

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // --- НАЧАЛО ИЗМЕНЕНИЯ: Решение проблемы с высотой на мобильных устройствах ---
  useEffect(() => {
    const setViewportHeight = () => {
      // Создаем CSS-переменную --vh, которая будет равна 1% от реальной видимой высоты окна.
      let vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    // Устанавливаем высоту при первой загрузке
    setViewportHeight();

    // Пересчитываем высоту при изменении размера окна (например, при повороте экрана)
    window.addEventListener('resize', setViewportHeight);

    // Убираем слушатель события при размонтировании компонента
    return () => window.removeEventListener('resize', setViewportHeight);
  }, []);
  // --- КОНЕЦ ИЗМЕНЕНИЯ ---

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    window.dispatchEvent(new Event('themeChanged'));
  };

  return (
    // --- ИЗМЕНЕНИЕ: Заменяем h-screen на кастомную высоту ---
    <div style={{ height: 'calc(var(--vh, 1vh) * 100)' }} className={`w-full font-sans transition-colors duration-300 overflow-hidden relative ${
      theme === 'dark' ? 'bg-liquid-background text-white' : 'bg-slate-100 text-slate-900'
    }`}>
    {/* --- КОНЕЦ ИЗМЕНЕНИЯ --- */}
      {theme === 'dark' && (
        <Suspense fallback={null}>
          <LiquidGlassBackground />
        </Suspense>
      )}

      {currentTrack && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 dark:border-slate-700/50 bg-white/80 dark:bg-slate-900/80"> 
          <MusicPlayerBar
            track={currentTrack}
            isPlaying={isPlaying}
            progress={progress}
            duration={duration}
            volume={volume}
            isShuffle={isShuffle}
            isRepeat={isRepeat}
            isLiked={isLiked}
            onPlayPauseToggle={togglePlayPause}
            onSeek={seekTo}
            onSetVolume={setVolume}
            onPrev={prevTrack}
            buffered={buffered}
            onNext={nextTrack}
            onToggleShuffle={toggleShuffle}
            onToggleRepeat={toggleRepeat}
            onToggleLike={() => onToggleLike(currentTrack)}
            stopAndClearPlayer={stopAndClearPlayer}
            playerNotification={playerNotification}
          />
        </div>
      )}
      
      {/* --- ИЗМЕНЕНИЕ: Заменяем h-screen на h-full, чтобы он наследовал правильную высоту --- */}
      <div className={`flex relative z-10 h-full overflow-hidden ${currentTrack ? 'pb-[100px]' : ''}`}>
      {/* --- КОНЕЦ ИЗМЕНЕНИЯ --- */}
        <Sidebar themeSwitcher={<ThemeSwitcher theme={theme} toggleTheme={toggleTheme} />} />
        <div className="flex-1 relative overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

// Компонент ProtectedLayout для защиты роутов
const ProtectedLayout = () => {
  const { loadingUser, currentUser } = useUser();
  const token = localStorage.getItem('token');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (loadingUser) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-liquid-background">
        <Loader2 className="w-10 h-10 animate-spin text-white/50" />
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return (
    <MainLayout>
      <Outlet />
    </MainLayout>
  );
};


// Главный компонент приложения
function App() {
  const location = useLocation();

  return (
    <>
      <AnimatePresence mode="wait" key={location.pathname}>
        <Routes location={location}>

          {/* --- РОУТЫ АУТЕНТИФИКАЦИИ --- */}
          <Route element={<AuthLayout><PageWrapper><Outlet /></PageWrapper></AuthLayout>}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
              <Route path="/auth/callback" element={<AuthCallbackPage />} />
          </Route>

          {/* --- ОСНОВНЫЕ РОУТЫ ПРИЛОЖЕНИЯ --- */}
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/music" element={<MusicPage />} />
            <Route path="/music/playlist/:playlistId" element={<PlaylistPage />} />
            <Route path="/profile" element={<MyProfilePage />} />
            <Route path="/profile/:userId" element={<UserProfilePage />} />
            <Route path="/friends" element={<FriendsPage />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/messages/:userId" element={<MessagesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/communities" element={<CommunitiesPage />} />
            <Route path="/communities/:communityId/manage" element={<CommunityManagementPage />} />
            <Route path="/communities/:communityId" element={<CommunityDetailPage />} />
            <Route path="/premium" element={<PremiumPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Route>

          {/* Роут для всех остальных путей, ведет на главную */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </AnimatePresence>
    </>
  );
}


export default App;