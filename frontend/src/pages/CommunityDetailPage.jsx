// frontend/src/pages/CommunityDetailPage.jsx --- ИСПРАВЛЕННЫЙ ФАЙЛ ---

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import useTitle from '../hooks/useTitle';
import { Loader2, ArrowLeft, Users, Globe, Lock, Eye, PlusCircle, UserCheck, ShieldQuestion } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import Avatar from '../components/Avatar';
import PostCard from '../components/PostCard';
import { useUser } from '../hooks/useUser';
import { useModal } from '../hooks/useModal';
import CreatePostModal from '../components/modals/CreatePostModal';
import EditPostModal from '../components/modals/EditPostModal';
import ImageViewer from '../components/ImageViewer';

const API_URL = import.meta.env.VITE_API_URL;

const pluralizeMembers = (count) => {
    if (!count) count = 0;
    const lastDigit = count % 10;
    const lastTwoDigits = count % 100;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return `${count} участников`;
    if (lastDigit === 1) return `${count} участник`;
    if (lastDigit >= 2 && lastDigit <= 4) return `${count} участника`;
    return `${count} участников`;
};

const CommunityDetailPage = () => {
    const { communityId } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useUser();
    const { showConfirmation } = useModal();
    const [community, setCommunity] = useState(null);
    const [communityPosts, setCommunityPosts] = useState([]);
    const [loadingCommunity, setLoadingCommunity] = useState(true);
    const [loadingPosts, setLoadingPosts] = useState(true);
    const [error, setError] = useState(null);
    const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);
    const [editingPost, setEditingPost] = useState(null);
    const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
    const [imageViewerSource, setImageViewerSource] = useState([]);
    
    const mainRef = useRef(null);

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
        return () => window.removeEventListener('communityUpdated', handleCommunityUpdate);
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

    const renderVisibilityIcon = (visibility) => {
        if (visibility === 'private') return <Lock size={16} title="Приватное сообщество"/>;
        if (visibility === 'secret') return <Eye size={16} title="Секретное сообщество"/>;
        return <Globe size={16} title="Публичное сообщество"/>;
    };

    if (loadingCommunity) {
        return <main className="flex-1 p-8 flex justify-center items-center"><Loader2 className="w-10 h-10 animate-spin text-slate-400" /></main>;
    }
    
    if (error) {
        return <main className="flex-1 p-8 text-center text-red-500 dark:text-red-400">{error}</main>;
    }

    if (!community) {
        return <main className="flex-1 p-8 text-center text-slate-500 dark:text-white/60">Сообщество не найдено.</main>;
    }

    const canPost = community.isMember && (community.postingPolicy === 'everyone' || community.isOwner);
    const canViewContent = community.isMember || community.visibility === 'public';
    
    return (
        <>
            <CreatePostModal isOpen={isCreatePostModalOpen} onClose={() => { setIsCreatePostModalOpen(false); fetchCommunityPosts(); }} communityId={community._id} />
            <EditPostModal isOpen={!!editingPost} post={editingPost} onClose={() => { setEditingPost(null); fetchCommunityPosts(); }} />
            {isImageViewerOpen && <ImageViewer images={imageViewerSource} startIndex={0} onClose={() => setIsImageViewerOpen(false)} />}

            <main ref={mainRef} className="flex-1 overflow-y-auto bg-slate-100 dark:bg-slate-900">
                {/* --- HEADER SECTION --- */}
                <div className="relative">
                    <div className="h-48 md:h-80 bg-slate-300 dark:bg-slate-700 relative">
                        {community.coverImage && (
                            <img src={community.coverImage} alt="" className="w-full h-full object-cover"/>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-100 via-slate-100/50 to-transparent dark:from-slate-900 dark:via-slate-900/50"></div>
                    </div>
                    
                    {/* --- НАЧАЛО ИЗМЕНЕНИЙ --- */}
                    <button 
                        onClick={() => navigate(-1)} 
                        className="absolute top-6 left-6 flex items-center space-x-2 text-sm z-10 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-lg hover:scale-105 hover:bg-white transition-all font-semibold text-slate-800"
                    >
                        <ArrowLeft size={16} strokeWidth={2.5} />
                        <span>Назад</span>
                    </button>
                    {/* --- КОНЕЦ ИЗМЕНЕНИЙ --- */}
                    
                    <div className="max-w-2xl mx-auto px-4 md:px-8">
                        <div className="flex flex-col md:flex-row items-center md:items-end md:justify-between -mt-16 md:-mt-20 relative z-10 gap-4">
                            {/* Левая часть: Аватар + Имя/Метаданные */}
                            <div className="flex flex-col md:flex-row items-center text-center md:text-left gap-4">
                                <div 
                                    onClick={() => community.avatar && (setImageViewerSource([community.avatar]), setIsImageViewerOpen(true))}
                                    className="w-32 h-32 rounded-full border-4 border-slate-100 dark:border-slate-900 flex-shrink-0 cursor-pointer"
                                >
                                    <Avatar username={community.name} avatarUrl={community.avatar} size="2xl"/>
                                </div>
                                <div className="md:mb-2">
                                    <h1 className="text-3xl md:text-4xl font-bold truncate">{community.name}</h1>
                                    <div className="flex items-center justify-center md:justify-start space-x-3 text-sm text-slate-500 dark:text-white/60 mt-2">
                                        <div className="flex items-center space-x-1">{renderVisibilityIcon(community.visibility)} <span>{pluralizeMembers(community.memberCount)}</span></div>
                                        <span className="opacity-50">•</span>
                                        <span>{community.topic}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Правая часть: Кнопка управления/вступления */}
                            <div className="flex items-center space-x-2 flex-shrink-0 md:mb-2">
                                {community.isOwner ? (
                                    <Link to={`/communities/${community._id}/manage`} className="px-4 py-2 text-sm font-semibold rounded-lg bg-green-500 text-white hover:bg-green-600 flex items-center space-x-2"><ShieldQuestion size={18} /><span>Управление</span></Link>
                                ) : community.isMember ? (
                                    <button onClick={handleJoinLeaveCommunity} className="px-4 py-2 text-sm font-semibold rounded-lg bg-red-500 text-white hover:bg-red-600 flex items-center space-x-2"><Users size={18} /><span>Покинуть</span></button>
                                ) : community.isPending ? (
                                    <span className="px-4 py-2 text-sm font-semibold rounded-lg bg-slate-400 text-white flex items-center space-x-2 opacity-70"><Loader2 size={18} className="animate-spin" /><span>В ожидании</span></span>
                                ) : community.joinPolicy === 'open' ? (
                                    <button onClick={handleJoinLeaveCommunity} className="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-500 text-white hover:bg-blue-600 flex items-center space-x-2"><Users size={18} /><span>Вступить</span></button>
                                ) : community.joinPolicy === 'approval_required' ? (
                                    <button onClick={handleJoinLeaveCommunity} className="px-4 py-2 text-sm font-semibold rounded-lg bg-orange-500 text-white hover:bg-orange-600 flex items-center space-x-2"><UserCheck size={18} /><span>Запросить</span></button>
                                ) : (
                                    <span className="px-4 py-2 text-sm font-semibold rounded-lg bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-white/70 flex items-center space-x-2"><Lock size={18} /><span>По приглашению</span></span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- POSTS SECTION --- */}
                <div className="px-4 md:px-8 pt-8 pb-8 max-w-2xl mx-auto w-full">
                    {community.description && (
                        <p className="mb-8 text-slate-600 dark:text-white/80 text-center">{community.description}</p>
                    )}

                    {canPost && (
                        <div className="mb-6 flex items-center space-x-4 p-4 rounded-xl bg-white dark:bg-slate-800 shadow-sm">
                            <Avatar username={currentUser.username} fullName={currentUser.fullName} avatarUrl={currentUser.avatar} size="md"/>
                            <button onClick={() => setIsCreatePostModalOpen(true)} className="flex-1 text-left text-slate-500 dark:text-white/60 hover:text-slate-700 dark:hover:text-white">
                                Создать новый пост...
                            </button>
                            <button onClick={() => setIsCreatePostModalOpen(true)} className="px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600"><PlusCircle size={18}/></button>
                        </div>
                    )}
                    
                    {loadingPosts ? (
                        <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
                    ) : canViewContent ? (
                        communityPosts.length > 0 ? (
                            <div className="space-y-6">
                                {communityPosts.map(post => (
                                    <PostCard
                                        key={post._id}
                                        post={post}
                                        onPostDelete={handlePostDeleteInPlace}
                                        onPostUpdate={handlePostUpdateInPlace}
                                        currentUser={currentUser}
                                        isCommunityOwner={community.isOwner}
                                        onPinPost={handlePinPost}
                                        onEditRequest={setEditingPost}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10 text-slate-500 dark:text-white/60 bg-white dark:bg-slate-800 rounded-xl">
                                <p>В этом сообществе пока нет постов.</p>
                            </div>
                        )
                    ) : (
                        <div className="text-center py-10 text-slate-500 dark:text-white/60 bg-white dark:bg-slate-800 rounded-xl">
                            <p>Вступите в сообщество, чтобы видеть его контент.</p>
                        </div>
                    )}
                </div>
            </main>
        </>
    );
};

export default CommunityDetailPage;