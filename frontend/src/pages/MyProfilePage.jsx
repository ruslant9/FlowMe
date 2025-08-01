// frontend/src/pages/MyProfilePage.jsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import useTitle from '../hooks/useTitle';
import { Link } from 'react-router-dom';
import Avatar from '../components/Avatar';
import { Loader2, Upload, Trash2, User, BarChart2, Sparkles, Music, Newspaper, PlusCircle, Clock, Edit2, CheckCircle, Crown } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useModal } from '../hooks/useModal';
import { useUser } from '../context/UserContext';
import { useWebSocket } from '../context/WebSocketContext';

import ProfileStats from '../components/ProfileStats';
import PostCard from '../components/PostCard';
import CreatePostModal from '../components/modals/CreatePostModal';
import EditPostModal from '../components/modals/EditPostModal';
import UserListModal from '../components/modals/UserListModal';
import TrackList from '../components/music/TrackList';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import ProfileCard from '../components/ProfileCard';
import EditProfileModal from '../components/modals/EditProfileModal';
import InterestSelectionModal from '../components/modals/InterestSelectionModal';
import StatusModal from '../components/modals/StatusModal';
import PremiumCustomizationModal from '../components/modals/PremiumCustomizationModal';

const API_URL = import.meta.env.VITE_API_URL;

const customRuLocale = {
    ...ru,
    formatDistance: (token, count, options) => {
        if (token === 'lessThanXMinutes' || (token === 'xMinutes' && count === 1)) return 'только что';
        return ru.formatDistance(token, count, options);
    },
};

const ProfileFieldDisplay = ({ label, value, accentTextColor }) => {
    const labelClasses = accentTextColor ? '' : 'text-slate-500 dark:text-white/50';
    const labelStyle = accentTextColor ? { color: accentTextColor, opacity: 0.7 } : {};

    return (
        <div>
            <p className={`text-sm ${labelClasses}`} style={labelStyle}>{label}</p>
            <p className="text-lg break-words">{value || 'Не указано'}</p>
        </div>
    );
};

const avatarBordersMap = {
    'static-blue': 'Синяя рамка',
    'static-purple': 'Фиолетовая рамка',
    'static-green': 'Зеленая рамка',
    'animated-1': 'Рамка "Аврора"',
    'animated-2': 'Рамка "Инста"',
};

const usernameEmojisMap = {
    'fire': 'Эмодзи "Огонь"',
    'crown': 'Эмодзи "Корона"',
    'diamond': 'Эмодзи "Бриллиант"',
    'verified': 'Эмодзи "Галочка"',
    'heart': 'Эмодзи "Сердце"',
};


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
    const { playTrack, currentTrack, isPlaying, onToggleLike, progress, duration, seekTo, loadingTrackId, buffered, togglePlayPause } = useMusicPlayer();

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
            setMyMusicTrackIds(new Set(musicRes.data.map(track => track.youtubeId)));
            setScheduledPosts(scheduledRes.data);
        } catch (error) {
            toast.error('Не удалось загрузить посты и статистику.');
        } finally {
            if (showLoader) setLoadingPostsAndStats(false);
        }
    }, [user?._id]);

    useEffect(() => {
        if (user) {
            fetchPostsAndStats(true);
        }
    }, [user, fetchPostsAndStats]);

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
        if (status?.isOnline) {
            return <span className="text-green-400">Онлайн</span>;
        }
        if (user.lastSeen) {
            return `Был(а) ${timeAgo(user.lastSeen)}`;
        }
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
            await axios.post(`${API_URL}/api/user/avatar`, formData, {
                headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` }
            });
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
                 newPosts.sort((a, b) => {
                    if (a.isPinned && !b.isPinned) return -1;
                    if (!a.isPinned && b.isPinned) return 1;
                    return new Date(b.createdAt) - new Date(a.createdAt);
                });
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

    const getActiveCustomizations = () => {
        const active = [];
        const custom = user?.premiumCustomization;

        if (!custom) return active;

        if (custom.avatarBorder?.type && custom.avatarBorder.type !== 'none') {
            active.push(
                <span key="border">{avatarBordersMap[custom.avatarBorder.type] || 'Особая рамка'}</span>
            );
        }
        
        if (custom.usernameEmoji?.id && custom.usernameEmoji.id !== 'none') {
            active.push(
                <div key="emoji" className="flex items-center">
                    <span>{usernameEmojisMap[custom.usernameEmoji.id] || 'Особый эмодзи'}</span>
                    <img src={custom.usernameEmoji.url} alt="emoji" className="w-6 h-6 ml-2" />
                </div>
            );
        }
        
        if (custom.activeCardAccent) {
            if (typeof custom.activeCardAccent === 'object' && custom.activeCardAccent.name) {
                active.push(<span key="accent">{`Акцент: "${custom.activeCardAccent.name}"`}</span>);
            } else {
                 active.push(<span key="accent">Акцент карточки</span>);
            }
        }
        return active;
    };
    
    const activeCustomizations = getActiveCustomizations();

    if (loadingUser) {
        return <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-400" /></div>;
    }
    if (!user) {
        return <div className="p-8 text-center">Не удалось загрузить профиль. Попробуйте войти снова.</div>;
    }

    return (
        <>
            <CreatePostModal isOpen={isCreatePostModalOpen} onClose={() => {setIsCreatePostModalOpen(false); fetchPostsAndStats(false);}} />
            <EditPostModal
                isOpen={!!editingPost}
                post={editingPost}
                onClose={() => {
                    setEditingPost(null);
                    fetchPostsAndStats(false);
                }}
            />
            <EditProfileModal isOpen={isEditProfileModalOpen} onClose={() => {setIsEditProfileModalOpen(false); refetchUser();}} user={user} />
            <InterestSelectionModal isOpen={isInterestModalOpen} onClose={() => setIsInterestModalOpen(false)} onSave={handleSaveInterests} initialSelectedInterests={user.interests} />
            <UserListModal
                isOpen={isUserListModalOpen}
                onClose={() => setIsUserListModalOpen(false)}
                user={userForModal}
                listType={listTypeInModal}
                initialTitle={userListModalTitle}
            />
            <StatusModal 
                isOpen={isStatusModalOpen}
                onClose={() => setIsStatusModalOpen(false)}
                currentStatus={user.status}
                onSave={() => refetchUser()}
            />
            <PremiumCustomizationModal
                isOpen={isPremiumCustomizationModalOpen}
                onClose={() => {
                    setIsPremiumCustomizationModalOpen(false);
                    refetchUser();
                }}
                user={user}
            />

            <main className="flex-1 p-4 md:p-8">
                <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1 flex flex-col gap-6">
                        <ProfileCard
                            icon={User}
                            title="Профиль"
                            noHeaderMargin
                            userAccent={userAccent}
                            actionButton={
                                user.premium?.isActive && (
                                    <div className="flex items-center space-x-2">
                                        <span className="premium-shimmer-text font-bold">Premium</span>
                                        <Crown size={18} className="text-yellow-400" />
                                    </div>
                                )
                            }
                            renderContent={(accentTextColor) => (
                                <div className="text-center pt-4 pb-6">
                                    <div className="relative flex-shrink-0 mx-auto mb-4">
                                        {/* --- ИЗМЕНЕНИЕ ЗДЕСЬ --- */}
                                        <Avatar 
                                            username={user.username} 
                                            fullName={user.fullName} 
                                            avatarUrl={user.avatar} 
                                            size="xl" 
                                            isPremium={user.premium?.isActive} 
                                            customBorder={user.premiumCustomization?.avatarBorder}
                                            onClick={() => {}}
                                        >
                                            <div className="flex items-center space-x-2">
                                                {user.avatar && (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleAvatarDelete(); }} 
                                                        title="Удалить аватар" 
                                                        className="p-2 bg-red-500/50 rounded-full hover:bg-red-500/70"
                                                    >
                                                        <Trash2 size={20} className="text-white" />
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); avatarInputRef.current.click(); }} 
                                                    title="Изменить аватар" 
                                                    className="p-2 bg-white/20 rounded-full hover:bg-white/40"
                                                >
                                                    <Upload size={20} className="text-white" />
                                                </button>
                                            </div>
                                        </Avatar>
                                        <input type="file" ref={avatarInputRef} hidden accept="image/*" onChange={handleAvatarUpload} />
                                    </div>
                                    <div className="flex items-center justify-center">
                                        <h1 className="text-2xl font-bold">{user.fullName || user.username}</h1>
                                        {user.premiumCustomization?.usernameEmoji?.url && (
                                            <img src={user.premiumCustomization.usernameEmoji.url} alt="emoji" className="w-6 h-6 ml-2" />
                                        )}
                                    </div>
                                    
                                    {user.status ? (
                                        <div onClick={() => setIsStatusModalOpen(true)} className="mt-2 cursor-pointer hover:opacity-80 text-center w-full max-w-xs mx-auto">
                                            <p className="text-sm text-slate-600 dark:text-slate-300" style={accentTextColor ? {color: accentTextColor, opacity: 0.8} : {}}>
                                                <span className="font-semibold"></span> <span className="whitespace-pre-wrap break-words">{user.status}</span>
                                            </p>
                                        </div>
                                    ) : (
                                        <button onClick={() => setIsStatusModalOpen(true)} className="flex items-center justify-center mx-auto space-x-2 text-sm text-blue-500 hover:underline mt-1">
                                            <Edit2 size={14} />
                                            <span>Установить статус</span>
                                        </button>
                                    )}

                                    <p className="text-slate-500 dark:text-white/60 mt-2" style={accentTextColor ? {color: accentTextColor, opacity: 0.7} : {}}>@{user.username}</p>
                                    <div className="flex items-center justify-center space-x-2 mt-2 text-xs text-slate-500 dark:text-white/50" style={accentTextColor ? {color: accentTextColor, opacity: 0.6} : {}}>
                                        <span>Регистрация: {format(new Date(user.createdAt), 'dd.MM.yyyy', { locale: ru })}</span>
                                        {getStatus(user) && (<span className="flex items-center"><span className="px-1">•</span>{getStatus(user)}</span>)}
                                    </div>
                                </div>
                            )}
                        >
                        </ProfileCard>
                        
                        {user.premium?.isActive && (
                            <ProfileCard 
                                icon={Sparkles} 
                                title={<span className="premium-shimmer-text">Кастомизация Premium</span>}
                                onEditClick={() => setIsPremiumCustomizationModalOpen(true)}
                                userAccent={userAccent}
                                renderContent={(accentTextColor) => (
                                    activeCustomizations.length > 0 ? (
                                        <div className="space-y-2">
                                            {activeCustomizations.map((item, index) => (
                                                <div key={index} className="flex items-center space-x-2 text-sm">
                                                    <CheckCircle size={16} className="text-green-500" />
                                                    {item}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-slate-500 dark:text-white/50" style={accentTextColor ? { color: accentTextColor, opacity: 0.7 } : {}}>
                                            Настройте внешний вид вашего профиля: рамка аватара, значок у имени и цвета.
                                        </p>
                                    )
                                )}
                            />
                        )}
                        <ProfileCard 
                            icon={BarChart2} 
                            title="Статистика" 
                            renderContent={(accentTextColor) => (
                                <ProfileStats stats={stats} onShowUsers={handleShowUsers} accentTextColor={accentTextColor} />
                            )}
                        />

                        <ProfileCard 
                            icon={User} 
                            title="Основная информация" 
                            onEditClick={() => setIsEditProfileModalOpen(true)}
                            renderContent={(accentTextColor) => (
                                <div className="space-y-6 text-left">
                                    <ProfileFieldDisplay label="Полное имя" value={user.fullName} accentTextColor={accentTextColor} />
                                    <ProfileFieldDisplay label="Местоположение" value={[user.city, user.country].filter(Boolean).join(', ')} accentTextColor={accentTextColor} />
                                    <ProfileFieldDisplay label="Дата рождения" value={user.dob ? format(new Date(user.dob), 'd MMMM yyyy', { locale: ru }) : ''} accentTextColor={accentTextColor} />
                                    <ProfileFieldDisplay label="Пол" value={user.gender} accentTextColor={accentTextColor} />
                                </div>
                            )}
                        />
                        
                        <ProfileCard 
                            icon={Sparkles} 
                            title="Интересы"
                            onEditClick={() => setIsInterestModalOpen(true)}
                             renderContent={(accentTextColor) => (
                                <div className="flex flex-wrap gap-2">
                                    {user.interests && user.interests.length > 0 ? (
                                        user.interests.map(interest => (
                                            <div key={interest} className="flex items-center bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300 rounded-full px-3 py-1 text-sm">
                                                {interest}
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-slate-500 dark:text-white/50" style={accentTextColor ? { color: accentTextColor, opacity: 0.7 } : {}}>Расскажите о своих увлечениях, нажав на карандаш.</p>
                                    )}
                                </div>
                            )}
                        >
                        </ProfileCard>

                         <ProfileCard 
                            icon={Music} 
                            title="Моя музыка" 
                            actionButton={<Link to="/music" state={{ defaultTab: 'my-music' }} className="text-sm font-semibold text-blue-500 hover:underline">Вся музыка</Link>}
                             renderContent={() => (
                                loadingPostsAndStats ? (
                                    <div className="flex justify-center py-4"><Loader2 className="animate-spin" /></div>
                                ) : musicTracks.length > 0 ? (
                                    <TrackList
                                        tracks={musicTracks.slice(0, 3)} 
                                        onSelectTrack={(youtubeId) => playTrack(musicTracks.find(t => t.youtubeId === youtubeId), musicTracks)}
                                        currentPlayingTrackId={currentTrack?.youtubeId}
                                        isPlaying={isPlaying}
                                        onToggleSave={onToggleLike}
                                        myMusicTrackIds={myMusicTrackIds}
                                        progress={progress}
                                        duration={duration}
                                        onSeek={seekTo}
                                        loadingTrackId={loadingTrackId}
                                        buffered={buffered}
                                        onPlayPauseToggle={togglePlayPause}
                                    />
                                ) : (
                                    <p className="text-slate-500 dark:text-white/50">Вы еще не добавили треки в свою музыку.</p>
                                )
                            )}
                        >
                        </ProfileCard>
                    </div>

                    <div className="lg:col-span-2 flex flex-col gap-6">
                        <ProfileCard
                            icon={Newspaper}
                            title="Мои посты"
                            actionButton={
                                <button onClick={() => setIsCreatePostModalOpen(true)} className="flex items-center space-x-2 text-sm bg-blue-500 hover:bg-blue-600 text-white font-semibold px-3 py-2 rounded-lg transition-colors">
                                    <PlusCircle size={18} /> <span>Новый пост</span>
                                </button>
                            }
                        >
                            <div className="flex items-center space-x-2 mb-4 p-1 bg-slate-200/70 dark:bg-black/30 rounded-lg">
                                <button 
                                    onClick={() => setActivePostTab('published')} 
                                    className={`flex-1 py-1.5 text-sm font-semibold rounded-md transition-colors ${activePostTab === 'published' ? 'bg-white dark:bg-slate-700 shadow' : 'hover:bg-slate-100/50 dark:hover:bg-slate-800/50'}`}
                                >
                                    Опубликованные
                                </button>
                                <button 
                                    onClick={() => setActivePostTab('scheduled')} 
                                    className={`flex-1 py-1.5 text-sm font-semibold rounded-md transition-colors flex items-center justify-center space-x-2 ${activePostTab === 'scheduled' ? 'bg-white dark:bg-slate-700 shadow' : 'hover:bg-slate-100/50 dark:hover:bg-slate-800/50'}`}
                                >
                                    <Clock size={14} /> <span>Отложенные ({scheduledPosts.length})</span>
                                </button>
                            </div>

                            <div className="space-y-6">
                                {loadingPostsAndStats ? (
                                    <div className="flex justify-center items-center py-20">
                                        <Loader2 className="w-10 h-10 animate-spin text-slate-400" />
                                    </div>
                                ) : activePostTab === 'published' ? (
                                    posts.length > 0 ? (
                                        posts.map(post => (
                                            <PostCard 
                                                key={post._id} 
                                                post={post} 
                                                onPostDelete={handlePostDeleteInPlace}
                                                onPostUpdate={handlePostUpdateInPlace}
                                                currentUser={user}
                                                myMusicTrackIds={myMusicTrackIds}
                                                onEditRequest={setEditingPost}
                                            />
                                        ))
                                    ) : (
                                        <div className="p-10 text-center text-slate-500 dark:text-white/60">
                                            <p>У вас пока нет постов.</p>
                                        </div>
                                    )
                                ) : ( 
                                    scheduledPosts.length > 0 ? (
                                        scheduledPosts.map(post => (
                                            <PostCard 
                                                key={post._id}
                                                post={post}
                                                onPostDelete={handlePostDeleteInPlace}
                                                onPostUpdate={handlePostUpdateInPlace}
                                                currentUser={user}
                                                myMusicTrackIds={myMusicTrackIds}
                                                onEditRequest={setEditingPost}
                                                isScheduled={true}
                                            />
                                        ))
                                    ) : (
                                        <div className="p-10 text-center text-slate-500 dark:text-white/60">
                                            <p>У вас нет запланированных постов.</p>
                                        </div>
                                    )
                                )}
                            </div>
                        </ProfileCard>
                    </div>
                </div>
            </main>
        </>
    );
};

export default MyProfilePage;