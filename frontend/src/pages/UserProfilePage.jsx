// frontend/src/pages/UserProfilePage.jsx --- ИСПРАВЛЕННЫЙ ФАЙЛ ---

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import useTitle from '../hooks/useTitle';
import Avatar from '../components/Avatar';
import { ShieldAlert, ShieldOff, UserCheck, Clock, UserPlus, Loader2, MessageSquare, User, BarChart2, Sparkles, Music, Newspaper, Briefcase, Crown } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useModal } from '../hooks/useModal';
import { useWebSocket } from '../context/WebSocketContext';
import ProfileCard from '../components/ProfileCard';
import ProfileStats from '../components/ProfileStats'; 
import PostCard from '../components/PostCard';
import { useUser } from '../hooks/useUser';
import EditPostModal from '../components/modals/EditPostModal';
import UserListModal from '../components/modals/UserListModal';
import TrackList from '../components/music/TrackList';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import MusicListModal from '../components/modals/MusicListModal';
import CommunityInviteModal from '../components/modals/CommunityInviteModal';
import PremiumRequiredModal from '../components/modals/PremiumRequiredModal';
import { UserDataCache } from '../utils/UserDataCacheService'; 
import ProfileField from '../components/ProfileField'; 
import PageWrapper from '../components/PageWrapper';
import AnimatedAccent from '../components/AnimatedAccent'; // --- ИМПОРТ

const API_URL = import.meta.env.VITE_API_URL;

// ... (остальной код компонента, который был выше)
const customRuLocaleForDistance = {
    ...ru,
    formatDistance: (token, count, options) => {
        if (token === 'lessThanXMinutes' || (token === 'xMinutes' && count === 1)) {
            return 'только что';
        }
        return ru.formatDistance(token, count, options);
    },
};

const formatLastSeen = (dateString) => {
    if (!dateString) return 'недавно';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    if (diffHours < 24) {
        return formatDistanceToNow(date, { addSuffix: true, locale: customRuLocaleForDistance });
    } else {
        if (date.getFullYear() === now.getFullYear()) {
            return format(date, 'd MMMM в HH:mm', { locale: ru });
        }
        return format(date, 'd MMMM yyyy г. в HH:mm', { locale: ru });
    }
};

const Spinner = ({ size = 20 }) => <Loader2 size={20} className="animate-spin" />;

const UserInteractionButtons = ({ status, onAction, user, isProcessing, onWriteMessage, onInvite }) => {
    const primaryButtonClasses = 'px-4 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center space-x-2 bg-blue-500 text-white hover:bg-blue-600';
    const secondaryButtonClasses = 'bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-600 dark:text-white/70';
    const iconButtonClasses = `p-2.5 rounded-lg transition-colors ${secondaryButtonClasses}`;
    const blockButtonClasses = 'p-2.5 rounded-lg transition-colors bg-slate-200 dark:bg-white/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-slate-600 dark:text-white/70 hover:text-red-600 dark:hover:text-red-500';

    const renderIconButton = (onClick, title, Icon, customClasses) => (
         <button onClick={(e) => { e.stopPropagation(); onClick(); }} className={customClasses} title={title} disabled={isProcessing}>
            {isProcessing ? <Spinner size={18} /> : <Icon size={18} />}
        </button>
    );

    const renderMainButton = (actionName, label, Icon, customClasses) => (
        <button
            onClick={(e) => { e.stopPropagation(); onAction(actionName, user); }}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center space-x-2 ${customClasses}`}
            disabled={isProcessing}
        >
            {isProcessing ? <Spinner size={18} /> : Icon && <Icon size={18} />}
            <span>{label}</span>
        </button>
    );

    const renderBlockButton = () => {
        if (status === 'blocked') {
            return renderMainButton('unblock', 'Разблокировать', UserCheck, 'bg-green-500 text-white hover:bg-green-600');
        }
        return renderIconButton(() => onAction('blacklist', user), 'Заблокировать', ShieldOff, blockButtonClasses);
    };

    switch (status) {
        case 'friend':
            return (
                <div className="flex items-center space-x-2">
                    {renderMainButton('remove', 'В друзьях', UserCheck, secondaryButtonClasses)}
                    {renderIconButton(onWriteMessage, 'Написать', MessageSquare, iconButtonClasses)}
                    {renderIconButton(onInvite, 'Пригласить в сообщество', Briefcase, iconButtonClasses)}
                    {renderBlockButton()}
                </div>
            );
        case 'incoming':
            return (
                <div className="flex items-center space-x-2">
                    {renderMainButton('accept', 'Принять', null, 'bg-green-500 text-white hover:bg-green-600')}
                    {renderMainButton('decline', 'Отклонить', null, secondaryButtonClasses)}
                    {renderBlockButton()}
                </div>
            );
        case 'outgoing':
            return (
                <div className="flex items-center space-x-2">
                    {renderMainButton('cancel', 'Отменить запрос', Clock, secondaryButtonClasses)}
                    {renderIconButton(onWriteMessage, 'Написать', MessageSquare, iconButtonClasses)}
                    {renderBlockButton()}
                </div>
            );
        case 'none':
            return (
                <div className="flex items-center space-x-2">
                    {renderMainButton('add', 'Добавить в друзья', UserPlus, `${primaryButtonClasses} flex-shrink-0`)}
                    {renderIconButton(onWriteMessage, 'Написать', MessageSquare, iconButtonClasses)}
                    {renderIconButton(onInvite, 'Пригласить в сообщество', Briefcase, iconButtonClasses)}
                    {renderBlockButton()}
                </div>
            );
        case 'blocked':
            return <div className="flex items-center space-x-2">{renderBlockButton()}</div>;
        default:
            return null;
    }
};


const UserProfilePage = () => {
    // ... (весь код, который был до return)
    const { userId } = useParams();
    const navigate = useNavigate();
    const [profileData, setProfileData] = useState(null);
    const [posts, setPosts] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { showConfirmation } = useModal();
    const [processingAction, setProcessingAction] = useState(null);
    const { userStatuses } = useWebSocket();
    const { currentUser } = useUser();
    const { playTrack, currentTrack, isPlaying, onToggleLike, myMusicTrackIds, progress, duration, seekTo, loadingTrackId, buffered, togglePlayPause } = useMusicPlayer();
    const [musicTracks, setMusicTracks] = useState([]);
    const [totalMusicCount, setTotalMusicCount] = useState(0);
    const [musicError, setMusicError] = useState(null);

    const interlocutorStatus = profileData?.user?._id && userStatuses ? userStatuses[profileData.user._id] : null;

    const [isUserListModalOpen, setIsUserListModalOpen] = useState(false);
    const [isMusicModalOpen, setIsMusicModalOpen] = useState(false);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [userForModal, setUserForModal] = useState(null);
    const [userListModalTitle, setUserListModalTitle] = useState('');
    const [listTypeInModal, setListTypeInModal] = useState('user');
    const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);

    useTitle(profileData?.user?.username || 'Профиль');
    
    const userAccent = profileData?.user?.premiumCustomization?.activeCardAccent;
    
    const handlePremiumFeatureClick = (e) => {
        e.stopPropagation();
        if (!currentUser?.premium?.isActive) {
            setIsPremiumModalOpen(true);
        } else {
            toast('Это эксклюзивный элемент Premium пользователя.', { icon: '✨' });
        }
    };


    const getDisplayOnlineStatus = useCallback(() => {
        if (currentUser?.privacySettings?.viewOnlineStatus === 'private') {
            return 'Недавно';
        }

        if (!profileData?.user) return null;

        if (profileData.isBlockedByThem) {
             return 'Был(а) очень давно';
        }

        const privacySource = interlocutorStatus?.privacySettings || profileData.user?.privacySettings;
        const privacySetting = privacySource?.viewOnlineStatus || 'everyone';
        const friendshipStatus = profileData.friendshipStatus;

        const canSeeDetailedStatus = (privacySetting === 'everyone') ||
                                     (privacySetting === 'friends' && friendshipStatus === 'friend');

        if (interlocutorStatus?.isOnline && canSeeDetailedStatus) {
            return <span className="text-green-600 dark:text-green-400">Онлайн</span>;
        }

        if (canSeeDetailedStatus) {
            const lastSeenTime = interlocutorStatus?.lastSeen || profileData.user.lastSeen;
            if (lastSeenTime) {
                return `Был(а) ${formatLastSeen(lastSeenTime)}`;
            }
        }

        return "Недавно";
    }, [profileData, interlocutorStatus, currentUser]);


    const fetchUserProfile = useCallback(async (showLoader = true) => {
        let loadedFromCache = false;
        const cachedData = await UserDataCache.getUser(userId);
        if (cachedData) {
            setProfileData(cachedData);
            setLoading(false); 
            loadedFromCache = true;
        } else if (showLoader) {
            setLoading(true);
        }

        setError(null);
        const token = localStorage.getItem('token');
        try {
            const profileRes = await axios.get(`${API_URL}/api/user/${userId}`, { headers: { Authorization: `Bearer ${token}` } });
            const freshProfileData = profileRes.data;
            await UserDataCache.setUser(userId, freshProfileData); 
            setProfileData(freshProfileData); 

            if (freshProfileData.isBlockedByThem) {
                setPosts([]);
                setStats(null);
                setError(null);
                setLoading(false);
                return;
            }

            try {
                const musicRes = await axios.get(`${API_URL}/api/music/user/${userId}/saved?page=1&limit=3`, { headers: { Authorization: `Bearer ${token}` } });
                setMusicTracks(musicRes.data.tracks);
                setTotalMusicCount(musicRes.data.totalCount);
                setMusicError(null);
            } catch (musicErr) {
                setMusicTracks([]);
                setTotalMusicCount(0);
                if (musicErr.response?.status === 403) {
                    setMusicError("Пользователь скрыл свою музыку.");
                } else {
                    setMusicError("Не удалось загрузить музыку пользователя.");
                }
            }
            
            try {
                const postsRes = await axios.get(`${API_URL}/api/posts/user/${userId}`, { headers: { Authorization: `Bearer ${token}` } });
                setPosts(postsRes.data);
            } catch (postError) {
                if (postError.response?.status === 403) {
                    setPosts([]);
                    toast.error('Доступ к постам ограничен.');
                } else {
                    toast.error('Не удалось загрузить посты пользователя.');
                    setPosts([]);
                }
            }

            try {
                const statsRes = await axios.get(`${API_URL}/api/user/${userId}/stats`, { headers: { Authorization: `Bearer ${token}` } });
                setStats(statsRes.data);
            } catch (statsError) {
                if (statsError.response?.status === 403) {
                     setStats(null);
                     toast.error('Доступ к статистике ограничен.');
                } else {
                    toast.error('Не удалось загрузить статистику пользователя.');
                    setStats(null);
                }
            }
            setError(null);
        } catch (err) {
            setError(err.response?.data?.message || 'Не удалось загрузить профиль.');
            toast.error(err.response?.data?.message || 'Ошибка загрузки профиля.');
        } finally {
            if (!loadedFromCache) { 
                setLoading(false);
            }
        }
    }, [userId]);
    
    useEffect(() => {
        const fetchMyMusicForLikes = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get(`${API_URL}/api/music/saved`, { headers: { Authorization: `Bearer ${token}` } });
                setMyMusicTrackIds(new Set(res.data.map(track => track.sourceId)));
            } catch (error) {
                console.error("Could not fetch my music for like status");
            }
        };
        fetchMyMusicForLikes();
    }, []);

    useEffect(() => {
        const myData = JSON.parse(localStorage.getItem('user'));
        if (myData && myData.id === userId) {
            navigate('/profile', { replace: true });
            return;
        }
        fetchUserProfile(true);

        const handleUpdates = () => fetchUserProfile(false);
        window.addEventListener('userDataUpdated', handleUpdates);
        window.addEventListener('postUpdated', handleUpdates);
        window.addEventListener('postDeleted', handleUpdates);

        return () => {
            window.removeEventListener('userDataUpdated', handleUpdates);
            window.removeEventListener('postUpdated', handleUpdates);
            window.removeEventListener('postDeleted', handleUpdates);
        };
    }, [userId, navigate, fetchUserProfile]);

    useEffect(() => {
        if (currentUser && currentUser._id !== userId) {
            const logVisit = async () => {
                try {
                    const token = localStorage.getItem('token');
                    await axios.post(`${API_URL}/api/user/${userId}/visit`, {}, { headers: { Authorization: `Bearer ${token}` } });
                } catch (error) {
                    console.warn('Could not log profile visit', error);
                }
            };
            logVisit();
        }
    }, [userId, currentUser]);
    
    const handleAction = async (action, user) => {
        const { _id: targetUserId, fullName, username } = user;
        const name = fullName || username;
        const actionsMap = {
            add: { method: 'post', url: `/api/user/send-request/${targetUserId}`, success: 'Запрос отправлен' },
            accept: { method: 'post', url: `/api/user/accept-request/${targetUserId}`, success: 'Запрос принят', confirm: { title: 'Принять заявку?', message: `Добавить ${name} в друзья?` } },
            decline: { method: 'post', url: `/api/user/decline-request/${targetUserId}`, success: 'Запрос отклонен', confirm: { title: 'Отклонить заявку?', message: `Отклонить заявку в друзья от ${name}?` } },
            cancel: { method: 'post', url: `/api/user/cancel-request/${targetUserId}`, success: 'Запрос отменен', confirm: { title: 'Отменить запрос?', message: `Отменить ваш запрос в друзья к ${name}?` } },
            remove: { method: 'post', url: `/api/user/remove-friend/${targetUserId}`, success: 'Пользователь удален из друзей', confirm: { title: 'Удалить из друзей?', message: `Вы уверены, что хотите удалить ${name} из друзей?` } },
            blacklist: { method: 'post', url: `/api/user/blacklist/${targetUserId}`, success: 'Пользователь заблокирован', confirm: { title: 'Заблокировать пользователя?', message: `Вы уверены, что хотите заблокировать ${name}? Это действие нельзя отменить.` } },
            unblock: { method: 'post', url: `/api/user/unblacklist/${targetUserId}`, success: 'Пользователь разблокирован', confirm: { title: 'Разблокировать пользователя?', message: `Вы уверены, что хотите разблокировать ${name}?` } },
        };
        const currentAction = actionsMap[action];
        if (!currentAction) return;

        const performApiCall = async () => {
            setProcessingAction(action);
            try {
                const token = localStorage.getItem('token');
                await axios[currentAction.method](`${API_URL}${currentAction.url}`, {}, { headers: { Authorization: `Bearer ${token}` } });
                toast.success(currentAction.success);
                fetchUserProfile(false);
            } catch (error) {
                toast.error(error.response?.data?.message || `Ошибка: ${action}`);
            } finally {
                setProcessingAction(null);
            }
        };

        if (currentAction.confirm) {
            showConfirmation({
                title: currentAction.confirm.title,
                message: currentAction.confirm.message,
                onConfirm: performApiCall,
            });
        } else {
            performApiCall();
        }
    };

    const handleWriteMessage = () => {
        navigate(`/messages/${userId}`);
    };

    const handlePostUpdateInPlace = (postId, updatedData) => {
        setPosts(prevPosts =>
            prevPosts.map(p => (p._id === postId ? { ...p, ...updatedData } : p))
        );
    };

    const handlePostDeleteInPlace = (postId) => {
        setPosts(prevPosts => prevPosts.filter(p => p._id !== postId));
        setStats(prev => prev ? ({...prev, posts: prev.posts - 1}) : null);
    };

    const handleShowUsers = useCallback((type) => {
        if (!profileData?.user?._id) return;

        const typeMap = {
            'friends': { listType: 'friends-with-tabs', title: `Друзья ${profileData.user.username}` },
            'subscribers': { listType: 'subscribers-with-tabs', title: `Подписчики ${profileData.user.username}` },
            'communities': { listType: 'communities-with-tabs', title: `Сообщества ${profileData.user.username}` },
        };
        
        const config = typeMap[type];
        if (config) {
            setUserForModal(profileData.user);
            setListTypeInModal(config.listType);
            setUserListModalTitle(config.title);
            setIsUserListModalOpen(true);
        }
    }, [profileData]);

    if (loading) {
        return <div className="flex-1 p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-400" /></div>;
    }
    if (error) {
        return <div className="flex-1 p-8 text-center text-red-500">{error}</div>;
    }

    const { user, friendshipStatus, isBlockedByThem, mutualFriendsCount } = profileData;

    const displayDOB = () => {
        if (!user.dob) return '';
        if (new Date(user.dob).getFullYear() === 1970 && user.privacySettings?.hideDOBYear) {
             return format(new Date(user.dob), 'd MMMM', { locale: ru });
        }
        return format(new Date(user.dob), 'd MMMM yyyy', { locale: ru });
    };
    
    if (isBlockedByThem) {
        return (
            <main className="flex-1 p-4 md:p-8 flex items-center justify-center">
                <div className="ios-glass-final rounded-3xl p-8 md:p-12 w-full max-w-lg text-center">
                    <ShieldAlert size={48} className="mx-auto text-red-400 mb-4" />
                    <h1 className="text-2xl font-bold">Профиль скрыт</h1>
                    <p className="text-slate-500 dark:text-white/60 mt-2">
                        Вы не можете просматривать профиль пользователя @{user.username}, так как он вас заблокировал.
                    </p>
                </div>
            </main>
        );
    }

    return (
        <PageWrapper>
            <PremiumRequiredModal isOpen={isPremiumModalOpen} onClose={() => setIsPremiumModalOpen(false)} />
            <EditPostModal 
                isOpen={false} 
                post={null} 
                onClose={() => {
                    fetchUserProfile(false); 
                }} 
            />
            <UserListModal
                isOpen={isUserListModalOpen}
                onClose={() => setIsUserListModalOpen(false)}
                user={userForModal}
                listType={listTypeInModal}
                initialTitle={userListModalTitle}
            />

            {user && (
                 <MusicListModal
                    isOpen={isMusicModalOpen}
                    onClose={() => setIsMusicModalOpen(false)}
                    user={user}
                />
            )}
            {user && (
                <CommunityInviteModal
                    isOpen={isInviteModalOpen}
                    onClose={() => setIsInviteModalOpen(false)}
                    targetUser={user}
                />
            )}

            <main className="flex-1 overflow-y-auto">
                <div className="max-w-7xl mx-auto p-4 md:p-8">
                    {/* HERO SECTION */}
                    <div className="relative rounded-3xl overflow-hidden mb-6 p-8 flex flex-col md:flex-row items-center text-center md:text-left gap-8 bg-slate-200 dark:bg-transparent">
                        {userAccent && <AnimatedAccent backgroundUrl={userAccent.backgroundUrl || userAccent} emojis={userAccent.emojis || []} />}
                        <div className="relative z-10 flex-shrink-0 group">
                            <Avatar
                                username={user.username}
                                fullName={user.fullName}
                                avatarUrl={user.avatar}
                                size="2xl"
                                isPremium={user.premium?.isActive}
                                customBorder={user.premiumCustomization?.avatarBorder}
                            />
                        </div>
                        <div className="relative z-10">
                            {/* --- НАЧАЛО ИСПРАВЛЕНИЯ: Добавлены адаптивные цвета текста --- */}
                            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white flex items-center justify-center md:justify-start" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                                {user.fullName || user.username}
                                {user.premiumCustomization?.usernameEmoji?.url && (
                                    <button onClick={handlePremiumFeatureClick} className="ml-3 focus:outline-none" title="Функция Premium">
                                        <img 
                                            src={user.premiumCustomization.usernameEmoji.url} 
                                            alt="emoji" 
                                            className="w-8 h-8" 
                                        />
                                    </button>
                                )}
                            </h1>
                            <p className="text-lg text-slate-600 dark:text-slate-300 mt-1" style={{ textShadow: '0 1px 5px rgba(0,0,0,0.5)' }}>@{user.username}</p>
                            
                            {user.status && (
                                <div className="mt-3">
                                    <p className="text-slate-800 dark:text-white/90 whitespace-pre-wrap break-words">{user.status}</p>
                                </div>
                            )}

                            <div className="flex flex-col md:flex-row items-center justify-center md:justify-start md:space-x-3 mt-3 text-xs text-slate-500 dark:text-slate-300" style={{ textShadow: '0 1px 5px rgba(0,0,0,0.5)' }}>
                                <span>Регистрация: {format(new Date(user.createdAt), 'dd.MM.yyyy', { locale: ru })}</span>
                                {getDisplayOnlineStatus() && (
                                    <>
                                        <span className="hidden md:inline">•</span>
                                        <span>{getDisplayOnlineStatus()}</span>
                                    </>
                                )}
                            </div>
                            
                             {mutualFriendsCount > 0 && (
                                <p className="text-sm text-slate-500 dark:text-slate-300 mt-2" style={{ textShadow: '0 1px 5px rgba(0,0,0,0.5)' }}>
                                    Общих друзей: {mutualFriendsCount}
                                </p>
                            )}
                            
                            <div className="mt-6 flex flex-wrap justify-center md:justify-start gap-3">
                                <UserInteractionButtons
                                    status={friendshipStatus}
                                    onAction={handleAction}
                                    user={user}
                                    isProcessing={!!processingAction}
                                    onWriteMessage={handleWriteMessage}
                                    onInvite={() => setIsInviteModalOpen(true)}
                                />
                            </div>
                            {/* --- КОНЕЦ ИСПРАВЛЕНИЯ --- */}
                        </div>
                    </div>

                    {/* MAIN GRID */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-1 flex flex-col gap-6">
                             {stats && (
                                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4">
                                    <ProfileStats stats={stats} onShowUsers={handleShowUsers} />
                                </div>
                            )}
                            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 space-y-4">
                               <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Основная информация</h3>
                               <ProfileField label="Местоположение" value={user.city || user.country ? [user.city, user.country].filter(Boolean).join(', ') : null} />
                               <ProfileField label="Дата рождения" value={displayDOB()} />
                               <ProfileField label="Пол" value={user.gender} />
                            </div>
                             <div className="bg-white dark:bg-slate-800 rounded-2xl p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Интересы</h3>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {user.interests && user.interests.length > 0 ? (
                                        user.interests.map(interest => (
                                            <div key={interest} className="bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300 rounded-full px-3 py-1 text-sm">
                                                {interest}
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-slate-500 dark:text-slate-400 text-sm">Пользователь не добавил интересы.</p>
                                    )}
                                </div>
                            </div>
                             
                            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Музыка пользователя</h3>
                                    {totalMusicCount > 0 && <button onClick={() => setIsMusicModalOpen(true)} className="text-sm font-semibold text-blue-500 hover:underline">Все ({totalMusicCount})</button>}
                                </div>
                                {musicError ? <p className="text-slate-500 dark:text-slate-400 text-sm">{musicError}</p> : 
                                 loading ? <div className="flex justify-center py-4"><Loader2 className="animate-spin text-slate-400"/></div> : 
                                 musicTracks.length > 0 ? <TrackList tracks={musicTracks} onSelectTrack={(track) => playTrack(track, musicTracks)} onToggleSave={onToggleLike} {...{currentTrack, isPlaying, myMusicTrackIds}} /> : <p className="text-slate-500 dark:text-slate-400 text-sm">У пользователя нет сохраненной музыки.</p>}
                            </div>
                        </div>

                        <div className="lg:col-span-2 flex flex-col gap-6">
                            {posts.length > 0 ? (
                                posts.map(post => (
                                    <PostCard
                                        key={post._id}
                                        post={post}
                                        onPostUpdate={handlePostUpdateInPlace}
                                        onPostDelete={handlePostDeleteInPlace}
                                        currentUser={currentUser}
                                        onEditRequest={() => {}}
                                    />
                                ))
                            ) : (
                                 <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full">
                                    <div className="p-10 text-center text-slate-500 dark:text-white/60">
                                        <p>У пользователя пока нет постов.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </PageWrapper>
    );
};

export default UserProfilePage;