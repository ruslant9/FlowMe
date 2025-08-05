// frontend/src/App.jsx

import { Routes, Route, Navigate, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import React, { useState, useEffect, Suspense } from 'react';
import Sidebar from './components/Sidebar';
// --- ИСПРАВЛЕНИЕ: Добавляем недостающие иконки (Home, Search, Music, ListMusic, Star) ---
import { Sun, Moon, Loader2, ShieldAlert, LogOut, Menu, Home, Search, Music, ListMusic, Star } from 'lucide-react';
import { useUser } from './hooks/useUser';
const LiquidGlassBackground = React.lazy(() => import('./components/LiquidGlassBackground'));
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
import PlaylistPage from './pages/PlaylistPage';
import PremiumPage from './pages/PremiumPage';
import AdminPage from './pages/AdminPage'; 
import ArtistPage from './pages/ArtistPage';
import AlbumPage from './pages/AlbumPage';
import SinglePage from './pages/SinglePage';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useMusicPlayer } from './context/MusicPlayerContext';
import MusicPlayerBar from './components/music/MusicPlayerBar';
import FullScreenPlayer from './components/music/FullScreenPlayer';
import { useWebSocket } from './context/WebSocketContext';
import WorkshopPage from './pages/WorkshopPage';
import { Link } from 'react-router-dom';
import ResponsiveNav from './components/ResponsiveNav';

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
  const location = useLocation();
  const isMobileChatView = /^\/messages\/.+/.test(location.pathname);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
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
    playerNotification,
    isFullScreenPlayerOpen,
    openFullScreenPlayer,
  } = useMusicPlayer();

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const setViewportHeight = () => {
      let vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    setViewportHeight();
    window.addEventListener('resize', setViewportHeight);
    return () => window.removeEventListener('resize', setViewportHeight);
  }, []);

  
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    } 
    setTheme(newTheme);
 };

  return (
    <div style={{ height: 'calc(var(--vh, 1vh) * 100)' }} className={`w-full font-sans transition-colors duration-300 relative ${
      theme === 'dark' ? 'bg-liquid-background text-white' : 'bg-slate-100 text-slate-900'
       } ${
      currentTrack ? 'pb-[100px]' : ''
    }`}>
      {theme === 'dark' && (
        <Suspense fallback={null}>
          <LiquidGlassBackground />
        </Suspense>
      )}

      <button 
        onClick={() => setIsMobileNavOpen(true)}
        className={`md:hidden fixed top-4 left-4 z-30 p-2 bg-slate-200/50 dark:bg-slate-800/50 rounded-lg backdrop-blur-sm ${isMobileNavOpen || isMobileChatView ? 'hidden' : 'block'}`}
      >
        <Menu />
      </button>

      <AnimatePresence>
          {isFullScreenPlayerOpen && <FullScreenPlayer />}
      </AnimatePresence>


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
            openFullScreenPlayer={openFullScreenPlayer}
          />
        </div>
      )}
      
      
      <div className={`flex relative z-10 h-full overflow-hidden`}>
        <Sidebar 
          themeSwitcher={<ThemeSwitcher theme={theme} toggleTheme={toggleTheme} />} 
          isMobileNavOpen={isMobileNavOpen}
          onMobileNavClose={() => setIsMobileNavOpen(false)}
        />
        <div className={`flex-1 relative overflow-y-auto transform-gpu transition-all duration-300 ${isMobileChatView ? '' : 'pt-16 md:pt-0'}`}>
          {children}
        </div>
      </div>
    </div>
  );
};

const BannedOverlay = ({ banInfo }) => {
    const { logout } = useWebSocket();
    const { stopAndClearPlayer } = useMusicPlayer();
    const [showAppealForm, setShowAppealForm] = useState(false);
    const [appealText, setAppealText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);

    const banExpiresDate = banInfo.banExpires ? new Date(banInfo.banExpires) : null;
    const isPermanent = !banExpiresDate;
    
    const formattedDate = banExpiresDate 
        ? new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(banExpiresDate)
        : 'навсегда';

    useEffect(() => {
        stopAndClearPlayer();
    }, [stopAndClearPlayer]);

    const handleAppealSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/api/submissions/appeal`, 
                { appealText },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success('Ваша жалоба отправлена на рассмотрение.');
            setSubmitSuccess(true);
            setShowAppealForm(false);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Не удалось отправить жалобу.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
            <AnimatePresence>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="ios-glass-final bg-slate-800/60 border border-red-500/30 max-w-lg w-full p-8 rounded-3xl text-center"
                >
                    <ShieldAlert size={64} className="mx-auto text-red-400 mb-4" />
                    <h1 className="text-3xl font-bold mb-2 text-red-300">Доступ ограничен</h1>
                    <p className="text-lg mb-4">
                        Вы были заблокированы. Блокировка истекает: <strong className="font-bold">{formattedDate}</strong>.
                    </p>
                    <p className="text-md p-3 rounded-lg mb-8">
                        <strong>Причина:</strong> {banInfo.banReason || 'Не указана'}
                    </p>

                    {showAppealForm ? (
                        <motion.form
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            onSubmit={handleAppealSubmit}
                            className="space-y-4"
                        >
                            <textarea
                                value={appealText}
                                onChange={(e) => setAppealText(e.target.value)}
                                placeholder="Опишите, почему вы считаете блокировку ошибочной..."
                                className="w-full h-32 p-3 bg-slate-700/50 rounded-lg text-white placeholder-white/50 focus:ring-2 focus:ring-red-400 focus:outline-none resize-none"
                                minLength="10"
                                required
                            />
                            <div className="flex gap-4">
                                <button type="button" onClick={() => setShowAppealForm(false)} className="w-full px-6 py-3 bg-slate-600/80 font-semibold rounded-lg hover:bg-slate-600 transition-colors">
                                    Отмена
                                </button>
                                <button type="submit" disabled={isSubmitting} className="w-full px-6 py-3 bg-yellow-500 text-black font-semibold rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-50">
                                    {isSubmitting ? <Loader2 className="animate-spin mx-auto"/> : 'Отправить'}
                                </button>
                            </div>
                        </motion.form>
                    ) : (
                         <div className="flex flex-col sm:flex-row gap-4">
                            <button onClick={logout} className="w-full sm:w-auto flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-slate-600/80 font-semibold rounded-lg hover:bg-slate-600 transition-colors">
                                <LogOut size={18}/>
                                <span>Выйти</span>
                            </button>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

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

  const isBanned = currentUser.banInfo?.isBanned;
  const banExpires = currentUser.banInfo?.banExpires ? new Date(currentUser.banInfo.banExpires) : null;
  if (isBanned && (!banExpires || banExpires > new Date())) {
    return <BannedOverlay banInfo={currentUser.banInfo} />;
  }

  return (
    <MainLayout>
      <Outlet />
    </MainLayout>
  );
};

const AdminProtectedLayout = () => {
  const { currentUser, loadingUser } = useUser();

  if (loadingUser) {
    return null;
  }

  if (currentUser && currentUser.role !== 'admin') {
    return <Navigate to="/page-not-found" replace />;
  }

  return <Outlet />;
};

const navItems = [
  { path: '/', label: 'Главная', icon: Home },
  { path: '/search', label: 'Поиск', icon: Search },
  { path: '/my-music', label: 'Моя музыка', icon: Music },
  { path: '/playlists', label: 'Плейлисты', icon: ListMusic },
  { path: '/favorites', label: 'Избранное', icon: Star },
];

// Компонент-обертка, чтобы получить доступ к useLocation
const AppContent = () => {
  const location = useLocation();

  return (
    <div className="font-sans min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      {/* Контент страницы */}
      <main className="flex-1 p-4 text-center text-slate-800 dark:text-white">
        <h1 className="text-3xl font-bold">Текущая страница</h1>
        <p className="mt-2 bg-slate-200 dark:bg-slate-700 inline-block px-4 py-1 rounded-full">{location.pathname}</p>
      </main>

      {/* Наша навигационная панель в футере */}
      <footer className="sticky bottom-0 p-4">
        <ResponsiveNav 
          items={navItems} 
          visibleCount={3} // Показываем 2 кнопки + кнопка "Еще"
          activePath={location.pathname}
        />
      </footer>
    </div>
  );
};

function App() {
  const location = useLocation();

  return (
    <>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>

          <Route element={<AuthLayout><PageWrapper><Outlet /></PageWrapper></AuthLayout>}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
              <Route path="/auth/callback" element={<AuthCallbackPage />} />
          </Route>

          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/music" element={<MusicPage />} />
            <Route path="/music/playlist/:playlistId" element={<PlaylistPage />} />
            <Route path="/artist/:artistId" element={<ArtistPage />} />
            <Route path="/album/:albumId" element={<AlbumPage />} />
            <Route path="/single/:trackId" element={<SinglePage />} />
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
            <Route path="/workshop" element={<WorkshopPage />} />
            
            <Route element={<AdminProtectedLayout />}>
              <Route path="/admin" element={<AdminPage />} />
            </Route>
            
            <Route path="/page-not-found" element={
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 h-full">
                    <h1 className="text-4xl font-bold">404 - Страница не найдена</h1>
                    <p className="mt-4">Извините, мы не смогли найти то, что вы искали.</p>
                    <Link to="/" className="mt-6 inline-block text-blue-500 hover:underline">Вернуться на главную</Link>
                </div>
            } />

            <Route path="*" element={<Navigate to="/page-not-found" replace />} />
          </Route>

        </Routes>
      </AnimatePresence>
    </>
  );
}

export default App;