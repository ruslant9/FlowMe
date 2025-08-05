// frontend/src/pages/MyProfilePage.jsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import useTitle from '../hooks/useTitle';
import { Link } from 'react-router-dom';
import Avatar from '../components/Avatar';
import { Loader2, Upload, Trash2, User, BarChart2, Sparkles, Music, Newspaper, PlusCircle, Clock, Edit2, CheckCircle, Crown } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useModal } from '../hooks/useModal';
import { useUser } from '../hooks/useUser';

import ProfileField from '../components/ProfileField'; // --- ИСПРАВЛЕНИЕ: Добавлен недостающий импорт
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

// --- НАЧАЛО ИЗМЕНЕНИЙ: НОВЫЙ КОМПОНЕНТ ДЛЯ ТЕГА ИНТЕРЕСА ---
const InterestTag = ({ interest }) => (
    <div className="flex items-center bg-white/10 backdrop-blur-sm text-white rounded-full px-3 py-1 text-sm font-semibold cursor-default">
        {interest}
    </div>
);
// --- КОНЕЦ ИЗМЕНЕНИЙ ---

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

    const { showConfirmation } = useModal();
    const avatarInputRef = useRef(null);
    // --- НАЧАЛО ИЗМЕНЕНИЙ: REF для параллакса ---
    const heroRef = useRef(null);
    // --- КОНЕЦ ИЗМЕНЕНИЙ ---

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

    // --- НАЧАЛО ИЗМЕНЕНИЙ: Логика для параллакс-эффекта ---
    const handleMouseMove = (e) => {
        if (!heroRef.current) return;
        const { clientX, clientY } = e;
        const { left, top, width, height } = heroRef.current.getBoundingClientRect();
        const x = (clientX - left - width / 2) / (width / 2);
        const y = (clientY - top - height / 2) / (height / 2);

        const avatarElement = heroRef.current.querySelector('.parallax-content');
        if (avatarElement) {
            avatarElement.style.transform = `rotateY(${x * 10}deg) rotateX(${-y * 10}deg) translateZ(20px)`;
        }
    };

    const handleMouseLeave = () => {
        if (!heroRef.current) return;
        const avatarElement = heroRef.current.querySelector('.parallax-content');
        if (avatarElement) {
            avatarElement.style.transform = 'rotateY(0deg) rotateX(0deg) translateZ(0px)';
        }
    };
    // --- КОНЕЦ ИЗМЕНЕНИЙ ---

    const fetchPostsAndStats = useCallback(async (showLoader = true) => {
        if (!user?._id) return;
        if (showLoader) setLoadingPostsAndStats(true);
        const token = localStorage.getItem('token');
        try {
            const [postsRes, statsRes, musicRes, scheduledRes] = await Promise.all([
                axios.get(`${API_URL}/api/posts/user/${user._id}`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${API_URL}/api/user/${user._id}/stats`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${API_URL}/api/music/saved`, { headers: { Authorization: `Bearer ${token}` } }),
                // --- ИСПРАВЛЕНИЕ: Изменен URL с /api/user на /api/posts/user ---
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
    
    // ... (остальные useEffect и хендлеры остаются без изменений)
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
    const handlePostUpdateInPlace = (postId, updatedData) => { /* ... */ };
    const handlePostDeleteInPlace = (postId) => { /* ... */ };
    const handleSaveInterests = async (newInterests) => { /* ... */ };
    const handleShowUsers = useCallback((type) => { /* ... */ }, [user]);


    if (loadingUser) {
        return <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-400" /></div>;
    }
    if (!user) {
        return <div className="p-8 text-center">Не удалось загрузить профиль. Попробуйте войти снова.</div>;
    }
    
    const getAccentStyle = () => {
        if (!userAccent) {
            return { '--hero-bg-color': document.documentElement.classList.contains('dark') ? '#0f172a' : '#f1f5f9' };
        }
        if (typeof userAccent === 'string') {
            return { backgroundImage: `url(${userAccent})` };
        }
        if (typeof userAccent === 'object' && userAccent.backgroundUrl) {
            if (userAccent.backgroundUrl.startsWith('#')) {
                return { backgroundColor: userAccent.backgroundUrl };
            }
            return { backgroundImage: `url(${userAccent.backgroundUrl})` };
        }
        return {};
    };

    return (
        <>
            <CreatePostModal isOpen={isCreatePostModalOpen} onClose={() => {setIsCreatePostModalOpen(false); fetchPostsAndStats(false);}} />
            <EditPostModal isOpen={!!editingPost} post={editingPost} onClose={() => {setEditingPost(null); fetchPostsAndStats(false);}}/>
            <EditProfileModal isOpen={isEditProfileModalOpen} onClose={() => {setIsEditProfileModalOpen(false); refetchUser();}} user={user} />
            <InterestSelectionModal isOpen={isInterestModalOpen} onClose={() => setIsInterestModalOpen(false)} onSave={handleSaveInterests} initialSelectedInterests={user.interests} />
            <UserListModal isOpen={isUserListModalOpen} onClose={() => setIsUserListModalOpen(false)} user={userForModal} listType={listTypeInModal} initialTitle={userListModalTitle} />
            <StatusModal isOpen={isStatusModalOpen} onClose={() => setIsStatusModalOpen(false)} currentStatus={user.status} onSave={() => refetchUser()} />
            <PremiumCustomizationModal isOpen={isPremiumCustomizationModalOpen} onClose={() => {setIsPremiumCustomizationModalOpen(false); refetchUser();}} user={user} />

            <main className="flex-1">
                {/* --- НАЧАЛО ИЗМЕНЕНИЙ: НОВЫЙ HERO-БЛОК --- */}
                <div 
                    ref={heroRef}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    className="profile-hero-banner" 
                    style={getAccentStyle()}
                >
                    <div className="max-w-6xl mx-auto px-4 md:px-8 pt-10 pb-20 relative z-10 text-white">
                        <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
                            <div className="parallax-container flex-shrink-0">
                                <div className="parallax-content relative group">
                                    <Avatar
                                        username={user.username}
                                        fullName={user.fullName}
                                        avatarUrl={user.avatar}
                                        size="2xl"
                                        isPremium={user.premium?.isActive}
                                        customBorder={user.premiumCustomization?.avatarBorder}
                                    />
                                    <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center space-x-3">
                                        {user.avatar && (
                                            <button onClick={(e) => { e.stopPropagation(); handleAvatarDelete(); }} title="Удалить аватар" className="p-2 bg-red-500/70 rounded-full hover:bg-red-500/90">
                                                <Trash2 size={24} />
                                            </button>
                                        )}
                                        <button onClick={(e) => { e.stopPropagation(); avatarInputRef.current.click(); }} title="Изменить аватар" className="p-2 bg-white/30 rounded-full hover:bg-white/50">
                                            <Upload size={24} />
                                        </button>
                                    </div>
                                     <input type="file" ref={avatarInputRef} hidden accept="image/*" onChange={handleAvatarUpload} />
                                </div>
                            </div>
                            
                            <div className="flex-1">
                                <div className="flex items-center justify-center md:justify-start">
                                    <h1 className="text-4xl font-bold">{user.fullName || user.username}</h1>
                                    {user.premiumCustomization?.usernameEmoji?.url && (
                                        <img src={user.premiumCustomization.usernameEmoji.url} alt="emoji" className="w-8 h-8 ml-3" />
                                    )}
                                </div>

                                {user.status ? (
                                    <div onClick={() => setIsStatusModalOpen(true)} className="mt-2 cursor-pointer hover:opacity-80 text-center md:text-left">
                                        <p className="text-base text-white/80 whitespace-pre-wrap break-words">{user.status}</p>
                                    </div>
                                ) : (
                                    <button onClick={() => setIsStatusModalOpen(true)} className="flex items-center justify-center md:justify-start space-x-2 text-sm text-blue-300 hover:underline mt-1">
                                        <Edit2 size={14} />
                                        <span>Установить статус</span>
                                    </button>
                                )}
                                
                                <p className="text-white/60 mt-2">@{user.username}</p>
                                
                                {user.interests && user.interests.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-4 justify-center md:justify-start">
                                        {user.interests.slice(0, 5).map(interest => (
                                            <InterestTag key={interest} interest={interest} />
                                        ))}
                                        {user.interests.length > 5 && (
                                            <button onClick={() => setIsInterestModalOpen(true)} className="bg-white/20 backdrop-blur-sm text-white rounded-full px-3 py-1 text-sm font-semibold cursor-pointer hover:bg-white/30">
                                                +{user.interests.length - 5}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <ProfileStats stats={stats} onShowUsers={handleShowUsers} />
                    </div>
                </div>
                {/* --- КОНЕЦ ИЗМЕНЕНИЙ: HERO-БЛОК --- */}

                <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 px-4 md:px-8 -mt-16 relative z-20">
                    <div className="lg:col-span-1 flex flex-col gap-6">
                        <ProfileCard 
                            icon={User} 
                            title="Основная информация" 
                            onEditClick={() => setIsEditProfileModalOpen(true)}
                        >
                            <div className="space-y-4 text-left">
                                <ProfileField label="Местоположение" value={[user.city, user.country].filter(Boolean).join(', ')} />
                                <ProfileField label="Дата рождения" value={user.dob ? format(new Date(user.dob), 'd MMMM yyyy', { locale: ru }) : ''} />
                                <ProfileField label="Пол" value={user.gender} />
                            </div>
                        </ProfileCard>

                        {user.premium?.isActive && (
                            <ProfileCard 
                                icon={Sparkles} 
                                title={<span className="premium-shimmer-text">Кастомизация</span>}
                                onEditClick={() => setIsPremiumCustomizationModalOpen(true)}
                            >
                                <p className="text-slate-500 dark:text-white/50">Настройте внешний вид вашего профиля: рамка аватара, значок у имени и цвета.</p>
                            </ProfileCard>
                        )}

                        <ProfileCard 
                            icon={Music} 
                            title="Моя музыка" 
                            actionButton={<Link to="/music" state={{ defaultTab: 'my-music' }} className="text-sm font-semibold text-blue-500 hover:underline">Вся музыка ({musicTracks.length})</Link>}
                        >
                            {loadingPostsAndStats ? <div className="flex justify-center py-4"><Loader2 className="animate-spin" /></div>
                             : musicTracks.length > 0 ? (
                                <TrackList tracks={musicTracks.slice(0, 3)} onSelectTrack={(track) => playTrack(track, musicTracks)} {...{currentTrack, isPlaying, onToggleLike, myMusicTrackIds, progress, duration, onSeek, loadingTrackId, buffered, togglePlayPause}} />
                            ) : (
                                <p className="text-slate-500 dark:text-white/50">Вы еще не добавили треки.</p>
                            )}
                        </ProfileCard>
                    </div>

                    <div className="lg:col-span-2 flex flex-col gap-6">
                        {/* Поле для создания нового поста */}
                        <div className="ios-glass-final rounded-3xl p-4 flex items-center space-x-4">
                            <Avatar username={user.username} fullName={user.fullName} avatarUrl={user.avatar} size="md"/>
                            <button onClick={() => setIsCreatePostModalOpen(true)} className="flex-1 text-left text-slate-500 dark:text-white/60 hover:text-slate-700 dark:hover:text-white bg-slate-100/50 dark:bg-slate-800/50 rounded-full px-4 py-3">
                                Что у вас нового, {user.username}?
                            </button>
                            <button onClick={() => setIsCreatePostModalOpen(true)} className="p-3 bg-blue-500 text-white rounded-full font-semibold hover:bg-blue-600">
                                <PlusCircle size={20}/>
                            </button>
                        </div>
                        
                        {/* Табы для постов */}
                        <div className="flex items-center space-x-2 p-1 bg-slate-200/70 dark:bg-black/30 rounded-lg">
                            <button 
                                onClick={() => setActivePostTab('published')} 
                                className={`flex-1 py-1.5 text-sm font-semibold rounded-md transition-colors ${activePostTab === 'published' ? 'bg-white dark:bg-slate-700 shadow' : 'hover:bg-slate-100/50 dark:hover:bg-slate-800/50'}`}>
                                Опубликованные
                            </button>
                            <button 
                                onClick={() => setActivePostTab('scheduled')} 
                                className={`flex-1 py-1.5 text-sm font-semibold rounded-md transition-colors flex items-center justify-center space-x-2 ${activePostTab === 'scheduled' ? 'bg-white dark:bg-slate-700 shadow' : 'hover:bg-slate-100/50 dark:hover:bg-slate-800/50'}`}>
                                <Clock size={14} /> <span>Отложенные ({scheduledPosts.length})</span>
                            </button>
                        </div>

                        <div className="space-y-6">
                             {loadingPostsAndStats ? <div className="flex justify-center items-center py-20"><Loader2 className="w-10 h-10 animate-spin text-slate-400" /></div>
                             : activePostTab === 'published' ? (
                                posts.length > 0 ? (posts.map(post => <PostCard key={post._id} post={post} onPostDelete={handlePostDeleteInPlace} onPostUpdate={handlePostUpdateInPlace} currentUser={user} myMusicTrackIds={myMusicTrackIds} onEditRequest={setEditingPost} />))
                                : (<div className="p-10 text-center text-slate-500 dark:text-white/60"><p>У вас пока нет постов.</p></div>)
                            ) : ( 
                                scheduledPosts.length > 0 ? (scheduledPosts.map(post => <PostCard key={post._id} post={post} onPostDelete={handlePostDeleteInPlace} onPostUpdate={handlePostUpdateInPlace} currentUser={user} myMusicTrackIds={myMusicTrackIds} onEditRequest={setEditingPost} isScheduled={true} />))
                                : (<div className="p-10 text-center text-slate-500 dark:text-white/60"><p>У вас нет запланированных постов.</p></div>)
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </>
    );
};

export default MyProfilePage;