// frontend/src/pages/CommunityDetailPage.jsx

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import useTitle from '../hooks/useTitle';
import { Loader2, ArrowLeft, Users, Globe, Lock, Eye, PlusCircle, UserCheck, User as UserIcon } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import Avatar from '../components/Avatar';
import PostCard from '../components/PostCard';
import { useUser } from '../context/UserContext';
import { useModal } from '../hooks/useModal';
import CreatePostModal from '../components/modals/CreatePostModal';
import EditPostModal from '../components/modals/EditPostModal';
import UserListModal from '../components/modals/UserListModal';
import ImageViewer from '../components/ImageViewer';
import ProfileCard from '../components/ProfileCard';

const API_URL = import.meta.env.VITE_API_URL;

const topics = [
    { id: 'General', name: 'Общая' }, { id: 'Gaming', name: 'Игры' }, { id: 'Art', name: 'Искусство' }, { id: 'Technology', name: 'Технологии' }, { id: 'Music', name: 'Музыка' }, { id: 'Sports', name: 'Спорт' }, { id: 'Science', name: 'Наука' }, { id: 'Books', name: 'Книги' }, { id: 'Food', name: 'Еда' }, { id: 'Travel', name: 'Путешествия' }, { id: 'Fashion', name: 'Мода' }, { id: 'Photography', name: 'Фотография' }, { id: 'Health', name: 'Здоровье' }, { id: 'Education', name: 'Образование' }, { id: 'Business', name: 'Бизнес' }, { id: 'Finance', name: 'Финансы' }, { id: 'Nature', name: 'Природа' }, { id: 'Pets', name: 'Питомцы' }, { id: 'DIY', name: 'Сделай сам' }, { id: 'Cars', name: 'Автомобили' }, { id: 'Movies', name: 'Фильмы' }, { id: 'TV Shows', name: 'ТВ-шоу' }, { id: 'Anime & Manga', name: 'Аниме и Манга' }, { id: 'Comics', name: 'Комиксы' }, { id: 'History', name: 'История' }, { id: 'Philosophy', name: 'Философия' }, { id: 'Politics', name: 'Политика' }, { id: 'News', name: 'Новости' }, { id: 'Humor', name: 'Юмор' }, { id: 'Fitness', name: 'Фитнес' }, { id: 'Other', name: 'Другое' },
];

const pluralizeMembers = (count) => {
    if (!count) count = 0;
    const lastDigit = count % 10;
    const lastTwoDigits = count % 100;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return `${count} участников`;
    if (lastDigit === 1) return `${count} участник`;
    if (lastDigit >= 2 && lastDigit <= 4) return `${count} участника`;
    return `${count} участников`;
};

// --- ИЗМЕНЕНИЕ: Добавляем хелпер-функцию для изображений ---
const getImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) {
        return url;
    }
    return `${API_URL}/${url}`;
};

const CommunityDetailPage = () => {
    const { communityId } = useParams();
    const { currentUser } = useUser();
    const { showConfirmation } = useModal();
    const [community, setCommunity] = useState(null);
    const [communityPosts, setCommunityPosts] = useState([]);
    const [loadingCommunity, setLoadingCommunity] = useState(true);
    const [loadingPosts, setLoadingPosts] = useState(true);
    const [error, setError] = useState(null);
    const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);
    const [isUserListModalOpen, setIsUserListModalOpen] = useState(false);
    const [userListModalTitle, setUserListModalTitle] = useState('');
    const [editingPost, setEditingPost] = useState(null);
    const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
    const [userForModal, setUserForModal] = useState(null);
    const [listTypeInModal, setListTypeInModal] = useState('community-members');

    useTitle(community ? community.name : 'Сообщество');

    const fetchCommunityDetails = useCallback(async (showLoader = true) => {
        if (showLoader) setLoadingCommunity(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/api/communities/${communityId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCommunity(response.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Не удалось загрузить информацию о сообществе.');
            toast.error(err.response?.data?.message || 'Не удалось загрузить сообщество.');
        } finally {
            if (showLoader) setLoadingCommunity(false);
        }
    }, [communityId]);

    const fetchCommunityPosts = useCallback(async (showLoader = true) => {
        if (showLoader) setLoadingPosts(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/api/communities/${communityId}/posts`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCommunityPosts(response.data);
        } catch (err) {
            if (err.response?.status === 403) {
                setCommunityPosts([]);
            } else {
                toast.error(err.response?.data?.message || 'Не удалось загрузить посты сообщества.');
            }
        } finally {
            if (showLoader) setLoadingPosts(false);
        }
    }, [communityId]);

    useEffect(() => {
        fetchCommunityDetails(true);
        fetchCommunityPosts(true);
    }, [communityId, fetchCommunityDetails, fetchCommunityPosts]);
    
    useEffect(() => {
        const handleCommunityUpdate = (event) => {
            if (event.detail && event.detail.communityId === communityId) {
                fetchCommunityDetails(false);
            }
        };

        window.addEventListener('communityUpdated', handleCommunityUpdate);
        return () => {
            window.removeEventListener('communityUpdated', handleCommunityUpdate);
        };
    }, [communityId, fetchCommunityDetails]);

    const handleJoinLeaveCommunity = () => {
        if (!community) return;
        const action = community.isMember ? 'leave' : 'join';
        const endpoint = `${API_URL}/api/communities/${community._id}/${action}`;
        const confirmMessage = community.isMember 
            ? `Вы уверены, что хотите покинуть сообщество "${community.name}"?`
            : `Вы хотите вступить в сообщество "${community.name}"?`;

        showConfirmation({
            title: community.isMember ? 'Покинуть сообщество?' : 'Вступить в сообщество?',
            message: confirmMessage,
            onConfirm: async () => {
                const toastId = toast.loading('Обработка...');
                try {
                    const token = localStorage.getItem('token');
                    const response = await axios.post(endpoint, {}, { headers: { Authorization: `Bearer ${token}` } });
                    toast.success(response.data.message, { id: toastId });
                    fetchCommunityDetails();
                    fetchCommunityPosts();
                } catch (err) {
                    toast.error(err.response?.data?.message || 'Ошибка при выполнении действия.', { id: toastId });
                }
            }
        });
    };
    
    const handlePinPost = async (postId) => {
        const toastId = toast.loading('Обработка...');
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${API_URL}/api/communities/${communityId}/pin-post`, { postId }, { headers: { Authorization: `Bearer ${token}` } });
            toast.success('Статус поста обновлен!', { id: toastId });
            fetchCommunityPosts();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Ошибка.', { id: toastId });
        }
    };

    const canShowAdmin = () => {
        if (!community || !community.owner) return false;
        if (community.isOwner) return true;
        if (community.adminVisibility === 'everyone') return true;
        if (community.adminVisibility === 'members_only' && community.isMember) return true;
        return false;
    };

    const canShowMembers = () => {
        if (!community) return false;
        if (community.isOwner) return true;
        if (community.memberListVisibility === 'everyone') return true;
        if (community.memberListVisibility === 'members_only' && community.isMember) return true;
        return false;
    };
    
    const handleShowMembers = () => {
        if (!community) return;
        
        setUserForModal(community);
        setUserListModalTitle(`Участники: ${community.name}`);

        if (!canShowMembers()) {
            setListTypeInModal('community-members-denied');
        } else {
            setListTypeInModal('community-members');
        }
        setIsUserListModalOpen(true);
    };

    const handlePostUpdateInPlace = (postId, updatedData) => {
        setCommunityPosts(prevPosts => {
            const newPosts = prevPosts.map(p => (p._id === postId ? { ...p, ...updatedData } : p));
            if (updatedData.isPinned !== undefined) {
                newPosts.sort((a, b) => {
                    if (a.isPinned && !b.isPinned) return -1;
                    if (!a.isPinned && b.isPinned) return 1;
                    return 0;
                });
            }
            return newPosts;
        });
    };

    const handlePostDeleteInPlace = (postId) => {
        setCommunityPosts(prevPosts => prevPosts.filter(p => p._id !== postId));
    };

    const getTranslatedTopic = (topicId) => {
        const topic = topics.find(t => t.id === topicId);
        return topic ? topic.name : topicId;
    };

    const renderPostsSection = () => {
        if (!community) return null;
    
        const canInteract = community.isMember || (community.visibility === 'public' && community.joinPolicy === 'open');
        const canComment = canInteract && (community.postingPolicy === 'everyone' || community.isOwner);
    
        if (community.isBanned) {
            return (
                <div className="ios-glass-final rounded-3xl p-10 text-center text-red-500 dark:text-red-400">
                    <h3 className="text-xl font-semibold mb-2">Доступ запрещен</h3>
                    <p>Вы заблокированы в этом сообществе и не можете просматривать его контент.</p>
                </div>
            );
        }
    
        if (!community.isMember && !(community.visibility === 'public' && community.joinPolicy === 'open')) {
            return (
                <div className="ios-glass-final rounded-3xl p-10 text-center text-slate-500 dark:text-white/60">
                    <h3 className="text-xl font-semibold mb-2">Контент для участников</h3>
                    <p>Вступите в сообщество, чтобы просматривать и комментировать посты.</p>
                </div>
            );
        }
        
        if (loadingPosts) {
            return (
                <div className="flex justify-center items-center py-20">
                    <Loader2 className="w-10 h-10 animate-spin text-slate-400" />
                </div>
            );
        }
    
        if (communityPosts.length === 0) {
            return (
                <div className="ios-glass-final rounded-3xl p-10 text-center text-slate-500 dark:text-white/60">
                    <h3 className="text-xl font-semibold mb-2">Постов пока нет.</h3>
                    <p>Будьте первым, кто опубликует что-нибудь в этом сообществе!</p>
                </div>
            );
        }
    
        return communityPosts.map(post => (
            <PostCard
                key={post._id}
                post={post}
                onPostDelete={handlePostDeleteInPlace}
                onPostUpdate={handlePostUpdateInPlace}
                currentUser={currentUser}
                isCommunityOwner={community.isOwner}
                onPinPost={handlePinPost}
                onEditRequest={setEditingPost}
                canInteract={canInteract}
                canComment={canComment}
            />
        ));
    };

    if (loadingCommunity) {
        return (
            <main className="flex-1 p-4 md:p-8">
                <div className="ios-glass-final rounded-3xl p-6 w-full max-w-6xl mx-auto text-center">
                    <Loader2 className="w-10 h-10 animate-spin text-slate-400 mx-auto mb-4" />
                    <p className="text-lg">Загрузка сообщества...</p>
                </div>
            </main>
        );
    }
    
    if (error) {
        return (
            <main className="flex-1 p-4 md:p-8">
                <div className="ios-glass-final rounded-3xl p-6 w-full max-w-6xl mx-auto text-center text-red-500 dark:text-red-400">
                    <p className="text-xl font-bold mb-4">Ошибка загрузки</p>
                    <p className="mb-6">{error}</p>
                    <Link to="/communities" className="text-blue-500 hover:underline flex items-center justify-center">
                        <ArrowLeft size={16} className="mr-2" /> Вернуться к сообществам
                    </Link>
                </div>
            </main>
        );
    }

    if (!community) {
        return (
            <main className="flex-1 p-4 md:p-8">
                <div className="ios-glass-final rounded-3xl p-6 w-full max-w-6xl mx-auto text-center text-slate-500 dark:text-white/60">
                    <p className="text-xl font-bold mb-4">Сообщество не найдено</p>
                    <p className="mb-6">Возможно, оно было удалено или у вас нет доступа.</p>
                    <Link to="/communities" className="text-blue-500 hover:underline flex items-center justify-center">
                        <ArrowLeft size={16} className="mr-2" /> Вернуться к сообществам
                    </Link>
                </div>
            </main>
        );
    }

    const renderVisibilityIcon = (visibility) => {
        if (visibility === 'private') return <Lock size={16} className="text-slate-500" title="Приватное сообщество"/>;
        if (visibility === 'secret') return <Eye size={16} className="text-red-500" title="Секретное сообщество"/>;
        return <Globe size={16} className="text-green-500" title="Публичное сообщество"/>;
    };

    const renderJoinPolicyText = (policy) => {
        switch (policy) {
            case 'open': return 'Открытое';
            case 'approval_required': return 'По заявке';
            case 'invite_only': return 'По приглашению';
            default: return '';
        }
    };

    return (
        <>
            <UserListModal 
                isOpen={isUserListModalOpen} 
                onClose={() => setIsUserListModalOpen(false)} 
                initialTitle={userListModalTitle}
                user={userForModal}
                listType={listTypeInModal}
            />
            <CreatePostModal isOpen={isCreatePostModalOpen} onClose={() => { setIsCreatePostModalOpen(false); fetchCommunityPosts(); }} communityId={community._id} />
            <EditPostModal 
                isOpen={!!editingPost}
                post={editingPost}
                onClose={() => {
                    setEditingPost(null);
                    fetchCommunityPosts();
                }}
            />
            {isImageViewerOpen && community?.avatar && (
                <ImageViewer images={[community.avatar]} startIndex={0} onClose={() => setIsImageViewerOpen(false)} />
            )}

            <main className="p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                <div className="lg:col-span-1 flex flex-col gap-6">
                    <ProfileCard icon={UserIcon} title="Сообщество" noHeaderMargin>
                         <div className="text-center pt-4 pb-6">
                            <div className="relative group flex-shrink-0 mx-auto mb-4 w-24 h-24">
                                {/* --- ИЗМЕНЕНИЕ --- */}
                                <Avatar username={community.name} avatarUrl={getImageUrl(community.avatar)} size="xl" onClick={() => community.avatar && setIsImageViewerOpen(true)} />
                            </div>
                            <h2 className="text-2xl font-bold">{community.name}</h2>
                            <p className="text-slate-500 dark:text-white/60">Тематика: {getTranslatedTopic(community.topic)}</p>
                            <div className="flex items-center justify-center flex-wrap gap-x-3 gap-y-1 mt-2 text-sm text-slate-500 dark:text-white/50">
                                <span className="flex items-center space-x-1">{renderVisibilityIcon(community.visibility)}<span>{community.visibility === 'public' ? 'Публичное' : community.visibility === 'private' ? 'Приватное' : 'Секретное'}</span></span>
                                
                                <button onClick={handleShowMembers} className="flex items-center space-x-1 hover:underline">
                                    <Users size={16} />
                                    <span>{pluralizeMembers(community.memberCount || 0)}</span>
                                </button>

                                <span className="flex items-center space-x-1"><UserCheck size={16} /><span>Вступление: {renderJoinPolicyText(community.joinPolicy)}</span></span>
                            </div>
                            <p className="mt-4 text-slate-600 dark:text-white/80 whitespace-pre-wrap">{community.description || 'Нет описания.'}</p>
                             <div className="mt-4 flex justify-center">
                                {community.isOwner ? ( <Link to={`/communities/${community._id}/manage`} className="flex items-center bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors text-sm font-semibold"><UserCheck size={18} className="mr-2" /> Управление</Link> ) : community.isMember ? ( <button onClick={handleJoinLeaveCommunity} className="flex items-center bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors text-sm font-semibold"><Users size={18} className="mr-2" /> Покинуть</button> ) : community.isPending ? ( <span className="flex items-center bg-slate-400 text-white px-4 py-2 rounded-lg text-sm font-semibold opacity-70"><Loader2 size={18} className="mr-2 animate-spin" /> В ожидании</span> ) : community.joinPolicy === 'open' ? ( <button onClick={handleJoinLeaveCommunity} className="flex items-center bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors text-sm font-semibold"><Users size={18} className="mr-2" /> Вступить</button> ) : community.joinPolicy === 'approval_required' ? ( <button onClick={handleJoinLeaveCommunity} className="flex items-center bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors text-sm font-semibold"><UserCheck size={18} className="mr-2" /> Запросить</button> ) : ( <span className="flex items-center bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-white/70 px-4 py-2 rounded-lg text-sm font-semibold"><Lock size={18} className="mr-2" /> По приглашению</span> )}
                            </div>
                        </div>
                    </ProfileCard>
                    
                    {canShowAdmin() && (
                        <ProfileCard icon={UserIcon} title="Администратор">
                            <Link to={`/profile/${community.owner._id}`} className="flex items-center space-x-3 group p-2 -m-2 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-700/50">
                                {/* --- ИЗМЕНЕНИЕ --- */}
                                <Avatar username={community.owner.username} fullName={community.owner.fullName} avatarUrl={getImageUrl(community.owner.avatar)} size="md" />
                                <div>
                                    <p className="font-bold group-hover:underline">{community.owner.fullName || community.owner.username}</p>
                                    <p className="text-sm text-slate-500 dark:text-white/60">@{community.owner.username}</p>
                                </div>
                            </Link>
                        </ProfileCard>
                    )}
                </div>

                <div className="lg:col-span-2 flex flex-col">
                     <div className="ios-glass-final rounded-3xl p-6 w-full space-y-6">
                        <div className="relative">
                            <h2 className="text-2xl font-bold">Посты сообщества</h2>
                            {(community.isMember || community.isOwner) && (community.postingPolicy === 'everyone' || community.isOwner) && ( <button onClick={() => setIsCreatePostModalOpen(true)} className="absolute top-1/2 -translate-y-1/2 right-0 flex items-center space-x-2 text-sm bg-blue-500 hover:bg-blue-600 text-white font-semibold px-3 py-2 rounded-lg transition-colors"><PlusCircle size={18} /> <span>Новый пост</span></button> )}
                        </div>
                        {renderPostsSection()}
                    </div>
                </div>
            </main>
        </>
    );
};

export default CommunityDetailPage;