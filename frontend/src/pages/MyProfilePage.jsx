// frontend/src/pages/MyProfilePage.jsx --- ИСПРАВЛЕННЫЙ ФАЙЛ ---

import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import useTitle from '../hooks/useTitle';
import { Link } from 'react-router-dom';
import Avatar from '../components/Avatar';
import { Loader2, Upload, Trash2, Edit2, Crown, Sparkles, Music, Newspaper, PlusCircle, Clock, Users, BarChart2 } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useModal } from '../hooks/useModal';
import { useUser } from '../hooks/useUser';
import { useWebSocket } from '../context/WebSocketContext';
import PostCard from '../components/PostCard';
import CreatePostModal from '../components/modals/CreatePostModal';
import EditPostModal from '../components/modals/EditPostModal';
import UserListModal from '../components/modals/UserListModal';
import TrackList from '../components/music/TrackList';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import EditProfileModal from '../components/modals/EditProfileModal';
import InterestSelectionModal from '../components/modals/InterestSelectionModal';
import StatusModal from '../components/modals/StatusModal';
import PremiumCustomizationModal from '../components/modals/PremiumCustomizationModal';
import AnimatedAccent from '../components/AnimatedAccent';
import { motion } from 'framer-motion';
import ProfileField from '../components/ProfileField';
import PageWrapper from '../components/PageWrapper';

const API_URL = import.meta.env.VITE_API_URL;

const customRuLocale = {
    ...ru,
    formatDistance: (token, count, options) => {
        if (token === 'lessThanXMinutes' || (token === 'xMinutes' && count === 1)) return 'только что';
        return ru.formatDistance(token, count, options);
    },
};

// --- ИЗМЕНЕНИЕ 1: Уменьшаем размер текста счётчика с text-2xl до text-xl ---
const StatItem = ({ label, value, onClick }) => (
    <button disabled={!onClick} onClick={onClick} className="text-center group p-2 rounded-lg transition-colors hover:bg-white/5 disabled:cursor-default">
        <p className="text-xl font-bold transition-colors text-white group-hover:text-blue-400">{value}</p>
        <p className="text-xs transition-colors text-slate-400 group-hover:text-blue-300">{label}</p>
    </button>
);

const TabButton = ({ active, onClick, children }) => (
    <button
        onClick={onClick}
        className={`flex items-center relative px-4 py-3 text-sm font-semibold transition-colors ${
            active 
            ? 'text-white' 
            : 'text-slate-400 hover:text-white'
        }`}
    >
        {children}
        {active && (
            <motion.div
                layoutId="profilePostTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
        )}
    </button>
);

const MyProfilePage = () => {
    useTitle('Мой профиль');
    
    const { currentUser: user, refetchUser, loadingUser } = useUser();
    
    const [posts, setPosts] = useState([]);
    const [scheduledPosts, setScheduledPosts] = useState([]);
    const [activePostTab, setActivePostTab] = useState('published');
    const [stats, setStats] = useState(null);
    const [loadingPostsAndStats, setLoadingPostsAndStats] = useState(true);
    const [myMusicTrackIds, setMyMusicTrackIds] = useState(new Set());
    const [musicTracks, setMusicTracks] = useState([]);
    const { playTrack, currentTrack, isPlaying, onToggleLike } = useMusicPlayer();
    const { userStatuses } = useWebSocket();
    const { showConfirmation } = useModal();
    const avatarInputRef = useRef(null);

    const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);
    const [editingPost, setEditingPost] = useState(null);
    const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
    const [isInterestModalOpen, setIsInterestModalOpen] = useState(false);
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [isPremiumCustomizationModalOpen, setIsPremiumCustomizationModalOpen] = useState(false);
    const [isUserListModalOpen, setIsUserListModalOpen] = useState(false);
    const [userForModal, setUserForModal] = useState(null);
    const [userListModalTitle, setUserListModalTitle] = useState('');
    const [listTypeInModal, setListTypeInModal] = useState('user');
    
    const userAccent = user?.premiumCustomization?.activeCardAccent;

    const fetchPostsAndStats = useCallback(async (showLoader = true) => {
        if (!user?._id) return;
        if (showLoader) setLoadingPostsAndStats(true);
        const token = localStorage.getItem('token');
        try {
            const [postsRes, statsRes, musicRes, scheduledRes] = await Promise.all([
                axios.get(`${API_URL}/api/posts/user/${user._id}`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${API_URL}/api/user/${user._id}/stats`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${API_URL}/api/music/saved`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${API_URL}/api/posts/user/scheduled`, { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setPosts(postsRes.data);
            setStats(statsRes.data);
            setMusicTracks(musicRes.data);
            setMyMusicTrackIds(new Set(musicRes.data.map(track => track.sourceId)));
            setScheduledPosts(scheduledRes.data);
        } catch (error) {
            toast.error('Не удалось загрузить посты и статистику.');
        } finally {
            setLoadingPostsAndStats(false);
        }
    }, [user?._id]);
    
    useEffect(() => {
        if (user) {
            fetchPostsAndStats(true);
        }
    }, [user?._id, fetchPostsAndStats]);

    useEffect(() => {
        const handleBackgroundUpdate = () => {
            fetchPostsAndStats(false);
        };
        window.addEventListener('postUpdated', handleBackgroundUpdate);
        window.addEventListener('postDeleted', handleBackgroundUpdate);
        return () => {
            window.removeEventListener('postUpdated', handleBackgroundUpdate);
            window.removeEventListener('postDeleted', handleBackgroundUpdate);
        };
    }, [fetchPostsAndStats]);

    const timeAgo = (dateStr) => {
        if (!dateStr) return '';
        return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: customRuLocale });
    };

    const getStatus = (user) => {
        if (!user) return null;
        const status = userStatuses && userStatuses[user._id];
        if (status?.isOnline) return <span className="text-green-400">Онлайн</span>;
        if (user.lastSeen) return `Был(а) ${timeAgo(user.lastSeen)}`;
        return null;
    };

    const handleAvatarUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('avatar', file);
        const toastId = toast.loading('Загрузка аватара...');
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/api/user/avatar`, formData, { headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` } });
            toast.success('Аватар обновлен!', { id: toastId });
            refetchUser();
        } catch (error) {
            toast.error('Ошибка загрузки аватара.', { id: toastId });
        } finally {
            e.target.value = null;
        }
    };

    const handleAvatarDelete = () => {
        showConfirmation({
            title: 'Удалить аватар?', message: 'Вы уверены, что хотите удалить свой аватар?',
            onConfirm: async () => {
                const toastId = toast.loading('Удаление аватара...');
                try {
                    const token = localStorage.getItem('token');
                    await axios.delete(`${API_URL}/api/user/avatar`, { headers: { Authorization: `Bearer ${token}` } });
                    toast.success('Аватар удален!', { id: toastId });
                    refetchUser();
                } catch (error) {
                    toast.error('Ошибка удаления аватара.', { id: toastId });
                }
            }
        });
    };

    const handlePostUpdateInPlace = (postId, updatedData) => {
        setPosts(prevPosts => {
            const newPosts = prevPosts.map(p => (p._id === postId ? { ...p, ...updatedData } : p));
            if (updatedData.isPinned !== undefined) {
                 newPosts.sort((a, b) => (a.isPinned && !b.isPinned) ? -1 : (!a.isPinned && b.isPinned) ? 1 : 0);
            }
            return newPosts;
        });
    };

    const handlePostDeleteInPlace = (postId) => {
        setPosts(prevPosts => prevPosts.filter(p => p._id !== postId));
        setStats(prev => prev ? ({...prev, posts: prev.posts - 1}) : null);
    };
    
    const handleSaveInterests = async (newInterests) => {
        const toastId = toast.loading('Сохранение интересов...');
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${API_URL}/api/user/profile`, { interests: newInterests }, { headers: { Authorization: `Bearer ${token}` } });
            toast.success('Интересы обновлены!', { id: toastId });
            refetchUser();
        } catch (error) {
            toast.error('Ошибка сохранения.', { id: toastId });
        } finally {
            setIsInterestModalOpen(false);
        }
    };

    const handleShowUsers = useCallback((type) => {
        if (!user?._id) return;
        const typeMap = {
            'friends': { listType: 'friends-with-tabs', title: 'Мои друзья' },
            'subscribers': { listType: 'subscribers-with-tabs', title: 'Мои подписчики' },
            'communities': { listType: 'communities-with-tabs', title: 'Мои сообщества' },
        };
        const config = typeMap[type];
        if (config) {
            setUserForModal(user);
            setListTypeInModal(config.listType);
            setUserListModalTitle(config.title);
            setIsUserListModalOpen(true);
        }
    }, [user]);

    if (loadingUser) {
        return <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-400" /></div>;
    }
    if (!user) {
        return <div className="p-8 text-center">Не удалось загрузить профиль. Попробуйте войти снова.</div>;
    }

    return (
        <PageWrapper>
            <CreatePostModal isOpen={isCreatePostModalOpen} onClose={() => {setIsCreatePostModalOpen(false); fetchPostsAndStats(false);}} />
            <EditPostModal isOpen={!!editingPost} post={editingPost} onClose={() => { setEditingPost(null); fetchPostsAndStats(false); }} />
            <EditProfileModal isOpen={isEditProfileModalOpen} onClose={() => {setIsEditProfileModalOpen(false); refetchUser();}} user={user} />
            <InterestSelectionModal isOpen={isInterestModalOpen} onClose={() => setIsInterestModalOpen(false)} onSave={handleSaveInterests} initialSelectedInterests={user.interests} />
            <UserListModal isOpen={isUserListModalOpen} onClose={() => setIsUserListModalOpen(false)} user={userForModal} listType={listTypeInModal} initialTitle={userListModalTitle} />
            <StatusModal isOpen={isStatusModalOpen} onClose={() => setIsStatusModalOpen(false)} currentStatus={user.status} onSave={() => refetchUser()} />
            <PremiumCustomizationModal isOpen={isPremiumCustomizationModalOpen} onClose={() => { setIsPremiumCustomizationModalOpen(false); refetchUser(); }} user={user} />

            <main className="flex-1 overflow-y-auto">
                <div className="max-w-7xl mx-auto p-4 md:p-8">
                    {/* HERO SECTION */}
                    <div className="relative rounded-3xl overflow-hidden mb-6 p-8 flex flex-col md:flex-row items-center text-center md:text-left gap-8">
                        {userAccent && <AnimatedAccent backgroundUrl={userAccent.backgroundUrl || userAccent} emojis={userAccent.emojis || []} />}
                        <div className="relative z-10 flex-shrink-0 group">
                            <Avatar username={user.username} fullName={user.fullName} avatarUrl={user.avatar} size="2xl" isPremium={user.premium?.isActive} customBorder={user.premiumCustomization?.avatarBorder} onClick={() => {}} >
                                <div className="flex items-center justify-center space-x-2">
                                    {user.avatar && (<button onClick={(e) => { e.stopPropagation(); handleAvatarDelete(); }} title="Удалить аватар" className="p-2 bg-red-500/50 rounded-full hover:bg-red-500/70"><Trash2 size={20} className="text-white" /></button>)}
                                    <button onClick={(e) => { e.stopPropagation(); avatarInputRef.current.click(); }} title="Изменить аватар" className="p-2 bg-white/20 rounded-full hover:bg-white/40"><Upload size={20} className="text-white" /></button>
                                </div>
                            </Avatar>
                            <input type="file" ref={avatarInputRef} hidden accept="image/*" onChange={handleAvatarUpload} />
                        </div>
                        <div className="relative z-10">
                            <h1 className="text-4xl md:text-5xl font-extrabold text-white flex items-center justify-center md:justify-start" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                                {user.fullName || user.username}
                                {user.premiumCustomization?.usernameEmoji?.url && (<img src={user.premiumCustomization.usernameEmoji.url} alt="emoji" className="w-8 h-8 ml-3" />)}
                            </h1>
                            <p className="text-lg text-slate-300 mt-1" style={{ textShadow: '0 1px 5px rgba(0,0,0,0.5)' }}>@{user.username}</p>
                            
                            {user.status ? (
                                <div onClick={() => setIsStatusModalOpen(true)} className="mt-3 cursor-pointer group/status">
                                    <p className="text-white/90 whitespace-pre-wrap break-words">{user.status}</p>
                                    <span className="text-xs text-blue-400 opacity-0 group-hover/status:opacity-100 transition-opacity">Изменить статус</span>
                                </div>
                            ) : (
                                <button onClick={() => setIsStatusModalOpen(true)} className="flex items-center justify-center md:justify-start mx-auto md:mx-0 space-x-2 text-sm text-blue-400 hover:underline mt-2">
                                    <Edit2 size={14} /><span>Установить статус</span>
                                </button>
                            )}

                            <div className="flex items-center justify-center md:justify-start space-x-3 mt-3 text-xs text-slate-300" style={{ textShadow: '0 1px 5px rgba(0,0,0,0.5)' }}>
                                <span>Регистрация: {format(new Date(user.createdAt), 'dd.MM.yyyy', { locale: ru })}</span>
                                {getStatus(user) && (<span>• {getStatus(user)}</span>)}
                            </div>
                            
                            <div className="mt-6 flex flex-wrap justify-center md:justify-start gap-3">
                                <button onClick={() => setIsEditProfileModalOpen(true)} className="px-5 py-2.5 text-sm font-semibold rounded-lg bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm transition-colors flex items-center space-x-2">
                                    <Edit2 size={16} /><span>Редактировать</span>
                                </button>
                                <button onClick={() => setIsPremiumCustomizationModalOpen(true)} className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-colors flex items-center space-x-2 ${user.premium?.isActive ? 'premium-gradient-bg text-white' : 'bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm'}`}>
                                    {user.premium?.isActive ? <Crown size={16} /> : <Sparkles size={16} />}
                                    <span>Кастомизация</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* MAIN GRID */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-1 flex flex-col gap-6">
                             {stats && (
                                <div className="bg-slate-800 rounded-2xl p-4">
                                    {/* --- ИЗМЕНЕНИЕ 2: Убираем flex-wrap и gap-2, чтобы элементы не переносились --- */}
                                    <div className="flex items-center justify-around">
                                        <StatItem label="Посты" value={stats.posts} />
                                        <StatItem label="Друзья" value={stats.friends} onClick={() => handleShowUsers('friends')} />
                                        <StatItem label="Сообщества" value={stats.subscribedCommunities} onClick={() => handleShowUsers('communities')} />
                                        <StatItem label="Подписчики" value={stats.subscribers} onClick={() => handleShowUsers('subscribers')} />
                                        <StatItem label="Лайки" value={stats.likes} />
                                    </div>
                                </div>
                            )}
                            <div className="bg-slate-800 rounded-2xl p-6 space-y-4">
                               <h3 className="text-xl font-bold text-white mb-2">Основная информация</h3>
                               <ProfileField label="Местоположение" value={[user.city, user.country].filter(Boolean).join(', ')} />
                               <ProfileField label="Дата рождения" value={user.dob ? format(new Date(user.dob), 'd MMMM yyyy', { locale: ru }) : ''} />
                               <ProfileField label="Пол" value={user.gender} />
                            </div>
                             <div className="bg-slate-800 rounded-2xl p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xl font-bold text-white">Интересы</h3>
                                    <button onClick={() => setIsInterestModalOpen(true)} className="p-2 rounded-full text-slate-300 hover:bg-white/10" title="Редактировать"><Edit2 size={16} /></button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {user.interests?.length > 0 ? user.interests.map(i => <div key={i} className="bg-blue-500/20 text-blue-300 rounded-full px-3 py-1 text-sm">{i}</div>) : <p className="text-slate-400 text-sm">Расскажите о своих увлечениях.</p>}
                                </div>
                            </div>
                             <div className="bg-slate-800 rounded-2xl p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xl font-bold text-white">Моя музыка</h3>
                                    <Link to="/music" state={{ defaultTab: 'my-music' }} className="text-sm font-semibold text-blue-400 hover:underline">Все ({musicTracks.length})</Link>
                                </div>
                                {loadingPostsAndStats ? <div className="flex justify-center py-4"><Loader2 className="animate-spin text-slate-400"/></div> : 
                                 musicTracks.length > 0 ? <TrackList tracks={musicTracks.slice(0, 3)} onSelectTrack={(track) => playTrack(track, musicTracks)} onToggleSave={onToggleLike} {...{currentTrack, isPlaying, myMusicTrackIds}} /> : <p className="text-slate-400 text-sm">Добавьте любимые треки в свою коллекцию.</p>}
                            </div>
                        </div>

                        <div className="lg:col-span-2 flex flex-col gap-6">
                            <div className="bg-slate-800 rounded-2xl p-4 flex items-center space-x-4">
                                <Avatar username={user.username} fullName={user.fullName} avatarUrl={user.avatar} size="md"/>
                                <button onClick={() => setIsCreatePostModalOpen(true)} className="flex-1 text-left px-4 py-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-400 transition-colors">
                                    Что у вас нового?
                                </button>
                                <button onClick={() => setIsCreatePostModalOpen(true)} className="px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"><PlusCircle size={18}/></button>
                            </div>
                            <div className="bg-slate-800 rounded-2xl">
                                <div className="flex border-b border-slate-700 px-2">
                                    <TabButton active={activePostTab === 'published'} onClick={() => setActivePostTab('published')}>
                                        <Newspaper size={16} className="mr-2"/> Опубликованные
                                    </TabButton>
                                    <TabButton active={activePostTab === 'scheduled'} onClick={() => setActivePostTab('scheduled')}>
                                        <Clock size={16} className="mr-2"/> Отложенные ({scheduledPosts.length})
                                    </TabButton>
                                </div>
                                <div className="p-6 space-y-6">
                                     {loadingPostsAndStats ? <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-slate-400"/></div> : 
                                        activePostTab === 'published' ? (posts.length > 0 ? posts.map(p => <PostCard key={p._id} post={p} onPostDelete={handlePostDeleteInPlace} onPostUpdate={handlePostUpdateInPlace} currentUser={user} myMusicTrackIds={myMusicTrackIds} onEditRequest={setEditingPost}/>) : <p className="text-center py-10 text-slate-400">У вас пока нет постов.</p>) :
                                        (scheduledPosts.length > 0 ? scheduledPosts.map(p => <PostCard key={p._id} post={p} onPostDelete={handlePostDeleteInPlace} onPostUpdate={handlePostUpdateInPlace} currentUser={user} myMusicTrackIds={myMusicTrackIds} onEditRequest={setEditingPost} isScheduled={true}/>) : <p className="text-center py-10 text-slate-400">У вас нет запланированных постов.</p>)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </PageWrapper>
    );
};

export default MyProfilePage;