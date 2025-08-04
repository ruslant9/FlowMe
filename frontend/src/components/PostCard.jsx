// frontend/src/components/PostCard.jsx

import React, { useState, useEffect, useRef, Suspense, useCallback, Fragment, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Avatar from './Avatar';
import { Heart, MessageCircle, MoreHorizontal, Trash2, Send, Loader2, Smile, X, Check, ChevronDown, ChevronLeft, ChevronRight, Pin, MessageSquareOff, Edit, Users, XCircle as CancelVoteIcon, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useModal } from '../hooks/useModal';
import LikesPopover from './LikesPopover';
import Comment from './Comment';
import { motion, AnimatePresence } from 'framer-motion';
import PostViewModal from './modals/PostViewModal';
import { Listbox, Transition } from '@headlessui/react';
import EmojiPickerPopover from './EmojiPickerPopover';
import AttachedTrack from './music/AttachedTrack';
import PollDisplay from './PollDisplay';
import Tippy from '@tippyjs/react/headless';
import { format } from 'date-fns';
import AnimatedAccent from './AnimatedAccent';
import { useCachedImage } from '../../hooks/useCachedImage'; 

const API_URL = import.meta.env.VITE_API_URL;
const COMMENT_PAGE_LIMIT = 5;

// Компонент для кешированного изображения с анимацией
const CachedMotionImage = ({ src, ...props }) => {
    const { finalSrc, loading } = useCachedImage(src);

    if (loading) {
        return (
            <motion.div {...props} className="absolute w-full h-full flex items-center justify-center bg-black">
                <Loader2 className="w-10 h-10 animate-spin text-white" />
            </motion.div>
        );
    }

    return <motion.img src={finalSrc} {...props} />;
};


const customRuLocale = {
    ...ru,
    formatDistance: (token, count, options) => {
        if (token === 'lessThanXMinutes' || (token === 'xMinutes' && count === 1)) {
            return 'только что';
        }
        return ru.formatDistance(token, count, options);
    },
};

const PostCard = ({ post, onPostDelete, onPostUpdate, currentUser, highlightCommentId: initialHighlightCommentId, isCommunityOwner, onPinPost, onEditRequest, context, myMusicTrackIds, isScheduled }) => {

    const { showConfirmation } = useModal();
    const currentUserId = currentUser?._id;
    const isOwner = post.user._id === currentUserId;
    const authorData = isOwner ? currentUser : post.user;


    const [comments, setComments] = useState([]);
    const [totalComments, setTotalComments] = useState(0);
    const [totalRootComments, setTotalRootComments] = useState(0);

    const [commentPage, setCommentPage] = useState(1);
    const [loadingComments, setLoadingComments] = useState(false);
    const [newCommentText, setNewCommentText] = useState('');
    const [isSendingComment, setIsSendingComment] = useState(false);
    
    const commentInputRef = useRef(null);
    const smileButtonRef = useRef(null);
    const postCardRef = useRef(null);
    
    const [replyingTo, setReplyingTo] = useState(null);
    const [editingCommentId, setEditingCommentId] = useState(null);
    
    const [commentSelectionMode, setCommentSelectionMode] = useState(false);
    const [selectedComments, setSelectedComments] = useState([]);
    
    const [sortOrder, setSortOrder] = useState('newest');
    const [showSortMenu, setShowSortMenu] = useState(false);
    const sortMenuRef = useRef(null);

    const [currentPost, setCurrentPost] = useState(post);
    const [highlightedCommentId, setHighlightedCommentId] = useState(initialHighlightCommentId);
    
    const [isPostViewModalOpen, setIsPostViewModalOpen] = useState(false);
    const [postViewModalData, setPostViewModalData] = useState(null);
    
    const [commentAs, setCommentAs] = useState(null);
    const [commentingOptions, setCommentingOptions] = useState([]);
    const [isPickerVisible, setIsPickerVisible] = useState(false);
    const [showPostMenu, setShowPostMenu] = useState(false);
    const postMenuRef = useRef(null);
    
    const [loadingMore, setLoadingMore] = useState(false);

    const userAccent = currentPost.user?.premiumCustomization?.activeCardAccent;

    const togglePicker = () => { 
        setIsPickerVisible(v => !v);
    };

    const userVote = useMemo(() => {
        if (!currentUser || !currentPost.poll || !currentPost.poll.options) return null;
        for (const option of currentPost.poll.options) {
            if (option.votes.some(vote => (typeof vote === 'string' ? vote : vote._id) === currentUser._id)) {
                return option._id;
            }
        }
        return null;
    }, [currentPost.poll, currentUser]);

    const isPollExpired = useMemo(() => {
        return currentPost.poll?.expiresAt && new Date() > new Date(currentPost.poll.expiresAt);
    }, [currentPost.poll]);

    useEffect(() => {
        const fetchCommentingOptions = async () => {
            if (!currentUser) return;
            
            const personalProfile = { 
                _id: currentUser._id, 
                name: currentUser.fullName || currentUser.username, 
                username: currentUser.username,
                avatar: currentUser.avatar, 
                type: 'user',
                premium: currentUser.premium,
                premiumCustomization: currentUser.premiumCustomization,
            };
            let options = [personalProfile];

            try {
                const token = localStorage.getItem('token');
                const res = await axios.get(`${API_URL}/api/communities/created`, { headers: { Authorization: `Bearer ${token}` } });
                const ownedCommunities = res.data.map(c => ({ ...c, type: 'community' }));
                options = [...options, ...ownedCommunities];
            } catch (error) {
                console.error("Не удалось загрузить список сообществ для комментирования", error);
            }

            setCommentingOptions(options);

            const currentCommunityId = post.community?._id;
            const isOwnerOfCurrentCommunity = options.some(opt => opt.type === 'community' && opt._id === currentCommunityId);

            if (currentCommunityId && isOwnerOfCurrentCommunity) {
                setCommentAs(options.find(opt => opt._id === currentCommunityId));
            } else {
                setCommentAs(personalProfile);
            }
        };

        fetchCommentingOptions();
    }, [currentUser, post.community]);

    const fetchComments = useCallback(async (page = 1, sortBy = 'newest') => {
        if (currentPost.commentsDisabled) return;
        if (page === 1) {
            setLoadingComments(true);
        } else {
            setLoadingMore(true);
        }

        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(
                `${API_URL}/api/posts/${currentPost._id}/comments?page=${page}&limit=${COMMENT_PAGE_LIMIT}&sort=${sortBy}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (page === 1) {
                setComments(res.data.comments);
            } else {
                setComments(prev => [...prev, ...res.data.comments]);
            }
            
            setTotalComments(res.data.totalComments);
            setTotalRootComments(res.data.totalRootComments);
            setCommentPage(page);
        } catch (error) {
            console.error("Failed to fetch comments", error);
            if (page === 1) toast.error("Не удалось загрузить комментарии");
        } finally {
            if (page === 1) {
                setLoadingComments(false);
            } else {
                setLoadingMore(false);
            }
        }
    }, [currentPost._id, currentPost.commentsDisabled]);

    useEffect(() => {
        const handlePostUpdateEvent = (event) => {
            if (event.detail && event.detail.postId === post._id) {
                if (event.detail.fullPost) {
                    setCurrentPost(event.detail.fullPost);
                    if (onPostUpdate) {
                        onPostUpdate(event.detail.fullPost._id, event.detail.fullPost);
                    }
                } else {
                    const fetchUpdatedPost = async () => {
                        try {
                            const token = localStorage.getItem('token');
                            const res = await axios.get(`${API_URL}/api/posts/${post._id}`, {
                                headers: { Authorization: `Bearer ${token}` }
                            });
                            const updatedPost = res.data;
                            if (updatedPost) {
                                setCurrentPost(updatedPost);
                                if (onPostUpdate) {
                                    onPostUpdate(updatedPost._id, updatedPost);
                                }
                            }
                        } catch (e) {
                            console.error("Failed to fetch updated post", e);
                        }
                    }
                    fetchUpdatedPost();
                }
                fetchComments(1, sortOrder);
            }
        };
        window.addEventListener('postUpdated', handlePostUpdateEvent);
        return () => window.removeEventListener('postUpdated', handlePostUpdateEvent);
    }, [post._id, sortOrder, fetchComments, onPostUpdate]);

    useEffect(() => {
        setCurrentPost(post);
    }, [post]);

    useEffect(() => {
        if (currentPost._id && !currentPost.commentsDisabled && !isScheduled) {
            fetchComments(1, 'newest');
        } else if (currentPost.commentsDisabled || isScheduled) {
            setComments([]);
        }
    }, [currentPost._id, currentPost.commentsDisabled, isScheduled, fetchComments]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (sortMenuRef.current && !sortMenuRef.current.contains(event.target)) {
                setShowSortMenu(false);
            }
            if (isPickerVisible && smileButtonRef.current && !smileButtonRef.current.contains(event.target) && !event.target.closest('[data-emoji-picker="true"]')) {
                setIsPickerVisible(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isPickerVisible]);

    useEffect(() => {
        setHighlightedCommentId(initialHighlightCommentId);
        if (initialHighlightCommentId) {
            const timer = setTimeout(() => setHighlightedCommentId(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [initialHighlightCommentId]);
    
    const handleVote = useCallback(async (optionId) => {
        const originalPoll = JSON.parse(JSON.stringify(currentPost.poll));
        const newPoll = { ...originalPoll };
        
        let alreadyVotedOption = null;
        newPoll.options.forEach(opt => {
            const voteIndex = opt.votes.findIndex(v => (typeof v === 'string' ? v : v._id) === currentUser._id);
            if (voteIndex > -1) {
                alreadyVotedOption = opt._id;
                opt.votes.splice(voteIndex, 1);
            }
        });
        
        const targetOption = newPoll.options.find(opt => opt._id === optionId);
        if (targetOption && alreadyVotedOption !== optionId) {
            targetOption.votes.push(currentUser._id);
        }

        setCurrentPost(prev => ({ ...prev, poll: newPoll }));
        
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/api/posts/${currentPost._id}/poll/vote`, { optionId }, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (error) {
            toast.error(error.response?.data?.message || "Ошибка при голосовании.");
            setCurrentPost(prev => ({ ...prev, poll: originalPoll }));
        }
    }, [currentPost, currentUser]);

    useEffect(() => {
        const voteHandler = (event) => {
            if (event.detail.postId === currentPost._id) {
                handleVote(event.detail.optionId);
            }
        };
        window.addEventListener('voteOnPoll', voteHandler);
        return () => window.removeEventListener('voteOnPoll', voteHandler);
    }, [currentPost._id, handleVote]);

    const sortLabels = {
        newest: 'Сначала новые',
        oldest: 'Сначала старые',
        popular: 'Популярные'
    };

    const displayDate = currentPost.publishedAt || currentPost.createdAt;
    const timeAgo = formatDistanceToNow(new Date(displayDate), { addSuffix: true, locale: customRuLocale });
    
    const isLiked = currentPost.likes.some(like => {
        if (!like) return false;
        return (typeof like === 'string' ? like : like._id) === currentUserId;
    });

    const handleLike = async (e) => {
        e.stopPropagation();
        const token = localStorage.getItem('token');
        const originalLikes = currentPost.likes;
        
        const optimisticLikes = isLiked
            ? originalLikes.filter(like => (typeof like === 'string' ? like : like._id) !== currentUserId)
            : [...originalLikes, { _id: currentUserId, username: currentUser.username, fullName: currentUser.fullName, avatar: currentUser.avatar }];

        setCurrentPost(prev => ({ ...prev, likes: optimisticLikes }));

        try {
            await axios.post(`${API_URL}/api/posts/${currentPost._id}/like`, {}, { headers: { Authorization: `Bearer ${token}` } });
        } catch (error) {
            toast.error('Ошибка лайка');
            setCurrentPost(prev => ({ ...prev, likes: originalLikes }));
        }
    };

    const handleDelete = (e) => {
        e.stopPropagation();
        showConfirmation({
            title: isScheduled ? 'Отменить публикацию?' : 'Удалить пост?',
            message: isScheduled ? 'Пост будет удален безвозвратно.' : 'Это действие необратимо. Вы уверены?',
            onConfirm: async () => {
                const toastId = toast.loading(isScheduled ? 'Отмена публикации...' : 'Удаление...');
                try {
                    const token = localStorage.getItem('token');
                    await axios.delete(`${API_URL}/api/posts/${currentPost._id}`, { headers: { Authorization: `Bearer ${token}` } });
                    toast.success(isScheduled ? 'Публикация отменена' : 'Пост удален', { id: toastId });
                    if(onPostDelete) onPostDelete(currentPost._id);
                }
                catch (error) {
                    toast.error('Ошибка удаления', { id: toastId });
                }
            }
        });
    };

    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        if (!newCommentText.trim() || isSendingComment) return;

        setIsSendingComment(true);

        try {
            const token = localStorage.getItem('token');
            const payload = { 
                text: newCommentText, 
                parentId: replyingTo ? replyingTo.id : null,
                commentAs: commentAs?.type === 'community' ? commentAs._id : null
            };

            await axios.post(`${API_URL}/api/posts/${currentPost._id}/comments`, payload, { 
                headers: { Authorization: `Bearer ${token}` } 
            });

            fetchComments(1, sortOrder);

            setNewCommentText('');
            setIsPickerVisible(false);
            setReplyingTo(null);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Не удалось отправить комментарий');
        } finally {
            setIsSendingComment(false);
        }
    };
    
    const handleReply = (commentUser) => {
        const authorName = commentUser.name || commentUser.username;
        setReplyingTo({ ...commentUser, username: authorName });
        setNewCommentText(`@${authorName}, `);
        commentInputRef.current?.focus();
    };

    const handleSortChange = (newSortOrder) => {
        setSortOrder(newSortOrder);
        setShowSortMenu(false);
        setEditingCommentId(null);
        fetchComments(1, newSortOrder);
    };

    const handleLoadMore = () => {
        setEditingCommentId(null);
        fetchComments(commentPage + 1, sortOrder);
    };

    const handleHideComments = () => {
        setEditingCommentId(null);
        fetchComments(1, sortOrder);
    };

    const handleToggleComments = async () => {
        const token = localStorage.getItem('token');
        try {
            await axios.put(`${API_URL}/api/posts/${currentPost._id}/toggle-comments`, {}, { headers: { Authorization: `Bearer ${token}` } });
            const newCommentsDisabledState = !currentPost.commentsDisabled;
            setCurrentPost(prev => ({ ...prev, commentsDisabled: newCommentsDisabledState }));
            if (onPostUpdate) {
                onPostUpdate(currentPost._id, { commentsDisabled: newCommentsDisabledState });
            }
        } catch (e) { toast.error("Не удалось изменить статус комментариев"); }
    };

    const handlePinPost = async () => {
        const token = localStorage.getItem('token');
        try {
            await axios.put(`${API_URL}/api/posts/${currentPost._id}/pin`, {}, { headers: { Authorization: `Bearer ${token}` } });
            const newPinState = !currentPost.isPinned;
            setCurrentPost(prev => ({ ...prev, isPinned: newPinState }));
            if (onPostUpdate) {
                onPostUpdate(currentPost._id, { isPinned: newPinState });
            }
        } catch (e) { toast.error("Не удалось изменить статус закрепления"); }
    };

    const handleCommunityPinClick = (e) => {
        e.stopPropagation();
        onPinPost(currentPost._id);
    };

    const handleOpenEditModal = (e) => {
        e.stopPropagation();
        if (onEditRequest) {
            onEditRequest(currentPost);
        }
    };

    const handleDeleteSelectedComments = () => {
        showConfirmation({
            title: `Удалить ${selectedComments.length} комментариев?`,
            message: 'Это действие нельзя отменить. Все дочерние комментарии также будут удалены.',
            onConfirm: async () => {
                const toastId = toast.loading('Удаление...');
                try {
                    const token = localStorage.getItem('token');
                    await axios.delete(`${API_URL}/api/posts/${currentPost._id}/comments`, {
                        headers: { Authorization: `Bearer ${token}` },
                        data: { commentIds: selectedComments }
                    });
                    toast.success('Комментарии удалены', { id: toastId });
                } catch (error) {
                    toast.error('Ошибка удаления', { id: toastId });
                } finally {
                    setCommentSelectionMode(false);
                    setSelectedComments([]);
                    fetchComments(1, sortOrder);
                }
            }
        });
    };
    
    const handleDeleteAllComments = () => {
        showConfirmation({
            title: `Удалить все комментарии?`,
            message: 'Это действие нельзя отменить. Все ответы также будут удалены.',
            onConfirm: async () => {
                const toastId = toast.loading('Удаление всех комментариев...');
                try {
                    const token = localStorage.getItem('token');
                    await axios.delete(`${API_URL}/api/posts/${currentPost._id}/comments`, {
                        headers: { Authorization: `Bearer ${token}` },
                        data: { commentIds: comments.map(c => c._id) }
                    });
                    toast.success('Все комментарии удалены', { id: toastId });
                } catch (error) {
                    toast.error('Ошибка удаления всех комментариев', { id: toastId });
                } finally {
                    setCommentSelectionMode(false);
                    setSelectedComments([]);
                    fetchComments(1, sortOrder);
                }
            }
        });
    };

    const carouselVariants = {
        enter: (direction) => ({ x: direction > 0 ? '100%' : '-100%', opacity: 0 }),
        center: { zIndex: 1, x: 0, opacity: 1 },
        exit: (direction) => ({ zIndex: 0, x: direction < 0 ? '100%' : '-100%', opacity: 0 })
    };

    const [[imagePage, imageDirection], setImagePage] = useState([0, 0]);

    const paginateImage = (newDirection) => {
        const newIndex = (imagePage + newDirection + currentPost.imageUrls.length) % currentPost.imageUrls.length;
        setImagePage([newIndex, newDirection]);
    };

    const handleOpenPostInModal = () => {
        if (isScheduled) return;
        setPostViewModalData({
            posts: [currentPost],
            startIndex: 0,
            highlightCommentId: null
        });
        setIsPostViewModalOpen(true);
    };

    const hasAnimatedBorder = !post.community && authorData.premium?.isActive && authorData.premiumCustomization?.avatarBorder?.type?.startsWith('animated');

    return (
        <>
            <EmojiPickerPopover 
                isOpen={isPickerVisible}
                targetRef={smileButtonRef}
                onEmojiClick={(emojiObject) => setNewCommentText(prev => prev + emojiObject.emoji)}
                onClose={() => setIsPickerVisible(false)}
            />
            {isPostViewModalOpen && postViewModalData && (
                <PostViewModal
                    posts={postViewModalData.posts}
                    startIndex={postViewModalData.startIndex}
                    highlightCommentId={postViewModalData.highlightCommentId}
                    onClose={() => setIsPostViewModalOpen(false)}
                    onDeletePost={(deletedPostId) => {
                        if (onPostDelete) onPostDelete(deletedPostId);
                        setIsPostViewModalOpen(false);
                    }}
                    onUpdatePost={(updatedPostId, updatedData) => {
                        if (onPostUpdate) onPostUpdate(updatedPostId, updatedData);
                    }}
                />
            )}
    
            <div ref={postCardRef} className="ios-glass-final rounded-3xl w-full">
                {isScheduled && (
                    <div className="p-3 text-sm font-semibold text-yellow-700 dark:text-yellow-300 bg-yellow-400/20 rounded-t-3xl flex items-center justify-center space-x-2">
                        <Clock size={16}/>
                        <span>Будет опубликовано: {format(new Date(currentPost.scheduledFor), 'd MMMM yyyy в HH:mm', { locale: ru })}</span>
                    </div>
                )}
                <div className="relative rounded-t-3xl overflow-hidden">                  
                    <div className="relative z-10 p-6 pb-0">
                        <div className="flex items-center justify-between">
                            <div onClick={handleOpenPostInModal} className="flex items-center space-x-3 cursor-pointer">
                                {currentPost.community ? (
                                    <Link to={`/communities/${currentPost.community._id}`} onClick={e => e.stopPropagation()} className="flex items-center space-x-3 group">
                                        <Avatar username={currentPost.community.name} avatarUrl={currentPost.community.avatar} size="md" />
                                        <div>
                                            <p className="text-xs text-slate-400 flex items-center mb-1"><Users size={12} className="mr-1"/> Сообщество</p>
                                            <p className="font-bold group-hover:underline">{currentPost.community.name}</p> 
                                            {currentPost.isPinned && <p className="text-xs text-slate-400 flex items-center mt-1"><Pin size={12} className="mr-1"/> Закреплено в сообществе</p>}
                                            <p className="text-sm text-slate-500 dark:text-white/60">{timeAgo}</p>
                                        </div>
                                    </Link>
                                ) : (
                                    <div className={`p-1 ${hasAnimatedBorder ? '' : ''}`}>
                                        <Link to={`/profile/${authorData._id}`} onClick={e => e.stopPropagation()} className={`flex items-center space-x-3 group ${hasAnimatedBorder ? '-m-1' : ''}`}>
                                            {(() => {
                                                const border = authorData.premiumCustomization?.avatarBorder;
                                                return (
                                                    <Avatar
                                                        username={authorData.username}
                                                        fullName={authorData.fullName}
                                                        avatarUrl={authorData.avatar}
                                                        size="md"
                                                        isPremium={authorData.premium?.isActive}
                                                        customBorder={border}
                                                    />
                                                );
                                            })()}
                                            <div>
                                                {currentPost.isPinned && <p className="text-xs text-slate-400 flex items-center mb-1"><Pin size={12} className="mr-1"/> Закреплено в профиле</p>}
                                                <p className="font-bold group-hover:underline">{authorData.fullName || authorData.username}</p>
                                                <p className="text-sm text-slate-500 dark:text-white/60">{timeAgo}</p>
                                            </div>
                                        </Link>
                                    </div>
                                )}
                            </div>
                            
                            {(isOwner || isCommunityOwner) && context !== 'feed' && (
                                !isScheduled ? ( <Tippy
                                    interactive
                                    placement="bottom-end"
                                    delay={[100, 100]}
                                    visible={showPostMenu}
                                    onClickOutside={() => setShowPostMenu(false)}
                                    appendTo={() => document.body}
                                    popperOptions={{ strategy: 'fixed' }}
                                    render={(attrs) => (
                                        <div
                                            ref={postMenuRef}
                                            className="ios-glass-popover w-56 rounded-xl shadow-lg p-1"
                                            {...attrs}
                                        >
                                            {isOwner && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleOpenEditModal(e); setShowPostMenu(false); }}
                                                    className="w-full text-left flex items-center space-x-3 px-3 py-1.5 text-sm rounded-lg text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700"
                                                >
                                                    <Edit size={16} /><span>Редактировать</span>
                                                </button>
                                            )}
                                            {isOwner && !currentPost.community && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handlePinPost(); setShowPostMenu(false); }}
                                                    className="w-full text-left flex items-center space-x-3 px-3 py-1.5 text-sm rounded-lg text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700"
                                                >
                                                    <Pin size={16} /><span>{currentPost.isPinned ? 'Открепить' : 'Закрепить'}</span>
                                                </button>
                                            )}
                                            {isCommunityOwner && currentPost.community && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleCommunityPinClick(e); setShowPostMenu(false); }}
                                                    className="w-full text-left flex items-center space-x-3 px-3 py-1.5 text-sm rounded-lg text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700"
                                                >
                                                    <Pin size={16} /><span>{currentPost.isPinned ? 'Открепить' : 'Закрепить'}</span>
                                                </button>
                                            )}
                                            {currentPost.poll && userVote && !isPollExpired && (
                                                <>
                                                    <div className="my-1 h-px bg-slate-200 dark:bg-slate-700/50"></div>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleVote(userVote); setShowPostMenu(false); }}
                                                        className="w-full text-left flex items-center space-x-3 px-3 py-1.5 text-sm rounded-lg text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700"
                                                    >
                                                        <CancelVoteIcon size={16} /><span>Отменить голос</span>
                                                    </button>
                                                </>
                                            )}
                                            {isOwner && (
                                                <>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleToggleComments(); setShowPostMenu(false); }}
                                                        className="w-full text-left flex items-center space-x-3 px-3 py-1.5 text-sm rounded-lg text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700"
                                                    >
                                                        <MessageSquareOff size={16} /><span>{currentPost.commentsDisabled ? 'Включить комм.' : 'Выключить комм.'}</span>
                                                    </button>
                                                    <div className="my-1 h-px bg-slate-200 dark:bg-slate-700/50"></div>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDelete(e); setShowPostMenu(false); }}
                                                        className="w-full text-left flex items-center space-x-3 px-3 py-1.5 text-sm rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                                                    >
                                                        <Trash2 size={16} /><span>Удалить пост</span>
                                                    </button>
                                                    {totalComments > 0 && (
                                                        <>
                                                            <div className="my-1 h-px bg-slate-200 dark:bg-slate-700/50"></div>
                                                            <button
                                                                onClick={() => { handleDeleteAllComments(); setShowPostMenu(false); }}
                                                                disabled={!!editingCommentId}
                                                                className="w-full text-left flex items-center space-x-3 px-3 py-1.5 text-sm rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                                                            >
                                                                <Trash2 size={16} /><span>Удалить все комм.</span>
                                                            </button>
                                                            <button
                                                                onClick={() => { setCommentSelectionMode(true); setSelectedComments([]); setShowPostMenu(false); }}
                                                                disabled={!!editingCommentId}
                                                                className="w-full text-left flex items-center space-x-3 px-3 py-1.5 text-sm rounded-lg text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700"
                                                            >
                                                                <Check size={16} /><span>Выбрать комм.</span>
                                                            </button>
                                                        </>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    )}
                                >
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setShowPostMenu(v => !v); }}
                                        className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10"
                                    >
                                        <MoreHorizontal />
                                    </button>
                                </Tippy>) : (
                                    <Tippy
                                        interactive
                                        placement="bottom-end"
                                        delay={[100, 100]}
                                        visible={showPostMenu}
                                        onClickOutside={() => setShowPostMenu(false)}
                                        appendTo={() => document.body}
                                        popperOptions={{ strategy: 'fixed' }}
                                        render={(attrs) => (
                                            <div
                                                ref={postMenuRef}
                                                className="ios-glass-popover w-56 rounded-xl shadow-lg p-1"
                                                {...attrs}
                                            >
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleOpenEditModal(e); setShowPostMenu(false); }}
                                                    className="w-full text-left flex items-center space-x-3 px-3 py-1.5 text-sm rounded-lg text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700"
                                                >
                                                    <Edit size={16} /> <span>Редактировать</span>
                                                </button>
                                                <div className="my-1 h-px bg-slate-200 dark:bg-slate-700/50"></div>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDelete(e); setShowPostMenu(false); }}
                                                    className="w-full text-left flex items-center space-x-3 px-3 py-1.5 text-sm rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                                                >
                                                    <Trash2 size={16} /> <span>Отменить публикацию</span>
                                                </button>
                                            </div>
                                        )}
                                    >
                                        <button onClick={(e) => { e.stopPropagation(); setShowPostMenu(v => !v); }} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10">
                                            <MoreHorizontal />
                                        </button>
                                    </Tippy>
                                )
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-6 pt-2">
                    <div onClick={isScheduled ? undefined : handleOpenPostInModal} className={isScheduled ? '' : 'cursor-pointer'}>
                        {currentPost.text && <p className="mb-4 whitespace-pre-wrap break-words">{currentPost.text}</p>}
                    
                        {currentPost.poll && <PollDisplay poll={currentPost.poll} onVote={handleVote} isScheduled={isScheduled} />}
                        
                        {currentPost.imageUrls && currentPost.imageUrls.length > 0 && (
                            <div className="relative group mb-4">
                                <div className="relative aspect-square md:aspect-video bg-black rounded-lg overflow-hidden">
                                    <AnimatePresence initial={false} custom={imageDirection}>
                                        <CachedMotionImage
                                            key={imagePage}
                                            src={currentPost.imageUrls[imagePage]}
                                            custom={carouselVariants}
                                            initial="enter"
                                            animate="center"
                                            exit="exit"
                                            transition={{ x: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } }}
                                            onClick={(e) => { e.stopPropagation(); if (!isScheduled) handleOpenPostInModal(); }} 
                                            className="absolute top-0 left-0 w-full h-full object-contain cursor-pointer"
                                        />
                                    </AnimatePresence>
                                </div>

                                {currentPost.imageUrls.length > 1 && (
                                    <>
                                        <button onClick={(e) => { e.stopPropagation(); paginateImage(-1); }} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 outline-none z-10">
                                            <ChevronLeft size={24} />
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); paginateImage(1); }} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 outline-none z-10">
                                            <ChevronRight size={24} />
                                        </button>
                                        <div className="absolute top-2 right-2 bg-black/50 text-white text-xs rounded-full px-2 py-1 z-10">
                                            {imagePage + 1} / {currentPost.imageUrls.length}
                                        </div>
                                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-2 z-10">
                                            {currentPost.imageUrls.map((_, index) => (
                                                <button
                                                    key={index}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setImagePage([index, index > imagePage ? 1 : -1]);
                                                    }}
                                                    className={`w-2 h-2 rounded-full transition-all duration-200 ease-in-out hover:scale-150 ${index === imagePage ? 'bg-white scale-125' : 'bg-white/50'}`}
                                                />
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                        
                        {currentPost.attachedTrack && (
                            <div className="mb-4">
                                <AttachedTrack 
                                    track={currentPost.attachedTrack} 
                                    isInitiallySaved={myMusicTrackIds?.has(currentPost.attachedTrack.youtubeId)} 
                                />
                            </div>
                        )}
                    </div>
                    
                    {!isScheduled && (
                        <>
                            <div className="flex items-center justify-between text-slate-500 dark:text-white/60 border-b border-slate-200/50 dark:border-white/10 pb-3">
                                <div className="flex items-center space-x-5">
                                    <LikesPopover likers={currentPost.likes || []}>
                                        <span>
                                            <button onClick={handleLike} className="flex items-center space-x-2 hover:text-red-500 transition-colors">
                                                <Heart size={22} fill={isLiked ? '#ef4444' : 'none'} className={isLiked ? 'text-red-500' : ''}/>
                                                <span className="font-semibold">{currentPost.likes.length}</span>
                                            </button>
                                        </span>
                                    </LikesPopover>
                                    <div className="flex items-center space-x-2">
                                        <MessageCircle size={22} />
                                        <span className="font-semibold">{totalComments}</span>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2 flex-shrink-0">
                                    {commentSelectionMode ? (
                                        <div className="flex items-center space-x-2">
                                            <button onClick={() => {setCommentSelectionMode(false); setSelectedComments([])}} className="inline-flex items-center justify-center whitespace-nowrap text-xs font-semibold px-2 py-1.5 rounded-lg bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20">Отмена</button>
                                            <button onClick={handleDeleteSelectedComments} disabled={selectedComments.length === 0} className="inline-flex items-center justify-center whitespace-nowrap text-xs font-semibold px-2 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">Удалить ({selectedComments.length})</button>
                                        </div>
                                    ) : (
                                        <>
                                            {(!currentPost.commentsDisabled && totalComments > 1) ? ( 
                                                <div className="relative" ref={sortMenuRef}>
                                                    <button onClick={() => setShowSortMenu(v => !v)} className="inline-flex items-center justify-center whitespace-nowrap space-x-1 text-xs font-semibold px-2 py-1.5 rounded-lg bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 disabled:opacity-50" disabled={!!editingCommentId}>
                                                        <span>{sortLabels[sortOrder]}</span>
                                                        <ChevronDown size={16} className={`transition-transform ${showSortMenu ? 'rotate-180' : ''}`} />
                                                    </button>
                                                    {showSortMenu && (
                                                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-md shadow-lg ring-1 ring-black dark:ring-white/10 ring-opacity-5 py-1 z-30">
                                                            {Object.entries(sortLabels).map(([key, label]) => (
                                                                <button key={key} onClick={() => handleSortChange(key)} className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between ${sortOrder === key ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-200'} hover:bg-slate-100 dark:hover:bg-slate-700`}>
                                                                    {label}
                                                                    {sortOrder === key && <Check size={16} />}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : null}
                                        </>
                                    )}
                                </div>
                            </div>
                            
                            {!currentPost.commentsDisabled ? (
                                <div className="mt-4">
                                    <div className="space-y-2">
                                        {comments.map(comment => (
                                            <Comment 
                                                key={comment._id}
                                                comment={comment}
                                                currentUserId={currentUser._id}
                                                currentUser={currentUser}
                                                postOwnerId={currentPost.user._id}
                                                postCommunityId={currentPost.community?._id}
                                                onCommentUpdate={() => fetchComments(1, sortOrder)}
                                                onReply={handleReply}
                                                editingCommentId={editingCommentId}
                                                setEditingCommentId={setEditingCommentId}
                                                selectionMode={commentSelectionMode}
                                                onToggleSelect={(id) => setSelectedComments(p => p.includes(id) ? p.filter(i => i !== id) : [...p, id])}
                                                isSelected={(id) => selectedComments.includes(id)}
                                            />
                                        ))}
                                    </div>
                                    
                                    {loadingComments && (
                                        <div className="flex justify-center py-4"><Loader2 className="animate-spin" /></div>
                                    )}
                                    
                                    <div className="flex justify-center mt-4">
                                        {comments.length < totalRootComments && !loadingComments && (
                                            <button 
                                                onClick={handleLoadMore} 
                                                // --- НАЧАЛО ИСПРАВЛЕНИЯ: Убираем `w-28` и добавляем `whitespace-nowrap` ---
                                                className="text-sm font-semibold text-slate-500 dark:text-slate-400 hover:underline px-3 py-1.5 rounded-lg flex items-center justify-center whitespace-nowrap"
                                                // --- КОНЕЦ ИСПРАВЛЕНИЯ ---
                                                disabled={loadingMore}
                                            >
                                                {loadingMore ? <Loader2 className="animate-spin" /> : "Показать еще"}
                                            </button>
                                        )}
                                        {comments.length > COMMENT_PAGE_LIMIT && !loadingComments && (
                                            <button onClick={handleHideComments} className="text-sm font-semibold text-slate-500 dark:text-slate-400 hover:underline px-3 py-1.5 rounded-lg">
                                                Скрыть
                                            </button>
                                        )}
                                    </div>

                                    <div className="relative">
                                        {replyingTo && (
                                            <div className="text-xs bg-slate-100 dark:bg-slate-800 py-1 px-3 rounded-t-md text-slate-500 dark:text-slate-400 flex justify-between items-center">
                                                <span>Ответ пользователю @{replyingTo.username}</span>
                                                <button onClick={() => { setReplyingTo(null); setNewCommentText(''); }} className="p-1 hover:text-red-500">
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        )}

                                        <form onSubmit={handleCommentSubmit} className="flex items-start space-x-3 pt-4 border-t border-slate-200/50 dark:border-white/10">
                                            {commentAs && (
                                                <Tippy
                                                    interactive
                                                    placement="top-start"
                                                    disabled={commentingOptions.length <= 1}
                                                    render={attrs => (
                                                        <AnimatePresence>
                                                            <motion.div
                                                                initial={{ opacity: 0, y: 10 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                exit={{ opacity: 0, y: 10 }}
                                                                className="ios-glass-popover p-2 rounded-xl shadow-lg w-72" {...attrs}
                                                            >
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    {commentingOptions.map(option => {
                                                                        const isSelected = commentAs?._id === option._id;
                                                                        return (
                                                                            <button
                                                                                type="button"
                                                                                key={option._id || 'personal'}    
                                                                                onClick={() => setCommentAs(option)}
                                                                                className={`p-2 rounded-lg flex flex-col items-center justify-center text-center transition-colors ${isSelected ? 'bg-blue-600/20 ring-2 ring-blue-500' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                                                                            >
                                                                                <Avatar
                                                                                    username={option.type === 'user' ? option.username : option.name}
                                                                                    fullName={option.name}
                                                                                    avatarUrl={option.avatar}
                                                                                    size="md"
                                                                                    isPremium={option.premium?.isActive}
                                                                                    customBorder={option.premiumCustomization?.avatarBorder}
                                                                                />
                                                                                <div className="flex items-center">
                                                                                    <span className="text-xs font-semibold mt-2 truncate">{option.name}</span>
                                                                                    {option.type === 'user' && option.premium?.isActive && (
                                                                                        <span className="ml-1 mt-2 premium-shimmer-text text-[10px] font-bold">Premium</span>
                                                                                    )}
                                                                                </div>
                                                                                <span className="text-xs text-slate-500 dark:text-slate-400">{option.type === 'user' ? 'Личный профиль' : 'Сообщество'}</span>
                                                                            </button>
                                                                        )
                                                                    })}
                                                                </div>
                                                            </motion.div>
                                                        </AnimatePresence>
                                                    )}
                                                >
                                                    <button type="button" className="focus:outline-none">
                                                        <Avatar
                                                            username={commentAs.type === 'user' ? commentAs.username : commentAs.name}
                                                            fullName={commentAs.name}
                                                            avatarUrl={commentAs.avatar}
                                                            isPremium={commentAs.premium?.isActive}
                                                            customBorder={commentAs.premiumCustomization?.avatarBorder}
                                                            size="sm"
                                                        />
                                                    </button>
                                                </Tippy>
                                            )}
                                            <div className="relative flex-1">
                                                <input
                                                    ref={commentInputRef}
                                                    type="text"
                                                    value={newCommentText}
                                                    onChange={(e) => {
                                                        if (replyingTo && !e.target.value.startsWith(`@${replyingTo.username}, `)) {
                                                            setReplyingTo(null);
                                                        }
                                                        setNewCommentText(e.target.value);
                                                    }}
                                                    placeholder="Написать комментарий..."
                                                    className="w-full bg-slate-100 dark:bg-slate-800 rounded-full px-4 py-2 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    disabled={!!editingCommentId || commentSelectionMode || isSendingComment}
                                                />
                                                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                                    <button ref={smileButtonRef} type="button" onClick={togglePicker} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white" disabled={!!editingCommentId || commentSelectionMode}>
                                                        <Smile size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                            <button 
                                                type="submit" 
                                                disabled={!newCommentText.trim() || !!editingCommentId || commentSelectionMode || isSendingComment} 
                                                className="p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 disabled:bg-slate-300 dark:disabled:bg-slate-600"
                                            >
                                                {isSendingComment ? <Loader2 size={16} className="animate-spin" /> : <Send size={16}/>}
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400 py-3 bg-slate-100 dark:bg-slate-800/50 rounded-lg">
                                    Комментарии к этому посту отключены.
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </>
    );
};

export default PostCard;