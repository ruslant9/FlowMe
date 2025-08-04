// frontend/src/components/modals/PostViewModal.jsx

import React, { useState, useEffect, useCallback, useRef, useMemo, Fragment, Suspense } from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, MessageCircle, ChevronLeft, ChevronRight, MoreHorizontal, Check, ChevronDown, Users, Loader2, Send, Smile, Trash2, Pin, MessageSquareOff, Edit, XCircle as CancelVoteIcon, Clock } from 'lucide-react';
import Avatar from '../Avatar';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { useModal } from '../../hooks/useModal';
import Picker from 'emoji-picker-react';
import LikesPopover from '../LikesPopover';
import ImageEditorModal from './ImageEditorModal';
import { Link } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import Comment from '../Comment';
import { Listbox, Transition } from '@headlessui/react';
import { useMusicPlayer } from '../../context/MusicPlayerContext';
import AttachedTrack from '../music/AttachedTrack';
import PollDisplay from '../PollDisplay';
import Tippy from '@tippyjs/react/headless'; 
import { format } from 'date-fns';
import AnimatedAccent from '../AnimatedAccent';

const API_URL = import.meta.env.VITE_API_URL;
const EMOJI_PICKER_HEIGHT = 450;

const getImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) {
        return url;
    }
    return `${API_URL}/${url}`;
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

const PostViewModal = ({ posts, startIndex, onClose, onDeletePost, onUpdatePost, highlightCommentId }) => {
    const { currentUser } = useUser();
    const { currentTrack } = useMusicPlayer();
    const [currentIndex, setCurrentIndex] = useState(startIndex);
    const [activePost, setActivePost] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [commentText, setCommentText] = useState('');
    const currentUserId = currentUser?._id;
    const [replyingTo, setReplyingTo] = useState(null);
    const [isPickerVisible, setIsPickerVisible] = useState(false);
    const [pickerPosition, setPickerPosition] = useState('top');
    const [editingCommentId, setEditingCommentId] = useState(null);
    const [commentSelectionMode, setCommentSelectionMode] = useState(false);
    const [selectedComments, setSelectedComments] = useState([]);
    const [showPostMenu, setShowPostMenu] = useState(false);
    const { showConfirmation } = useModal();
    const commentInputRef = useRef(null);
    const [isEditingPostImage, setIsEditingPostImage] = useState(false);

    const [sortOrder, setSortOrder] = useState('newest');
    const [showSortMenu, setShowSortMenu] = useState(false);
    const sortMenuRef = useRef(null);
    const postMenuRef = useRef(null);
    const [isSendingComment, setIsSendingComment] = useState(false);
    const smileButtonRef = useRef(null);
    const pickerRef = useRef(null);

    const [commentAs, setCommentAs] = useState(null);
    const [commentingOptions, setCommentingOptions] = useState([]);
    const previousPostIdRef = useRef(null);
    
    const userVote = useMemo(() => {
        if (!currentUser || !activePost?.poll?.options) return null;
        for (const option of activePost.poll.options) {
            if (option.votes.some(vote => (typeof vote === 'string' ? vote : vote._id) === currentUser._id)) {
                return option._id;
            }
        }
        return null;
    }, [activePost, currentUser]);

    const isPollExpired = useMemo(() => {
        return activePost?.poll?.expiresAt && new Date() > new Date(activePost.poll.expiresAt);
    }, [activePost]);


    useEffect(() => {
        const fetchCommentingOptions = async () => {
            if (!currentUser || !activePost) return;
            
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

            const currentPostId = activePost._id;

            if (previousPostIdRef.current !== currentPostId) {
                const currentCommunityId = activePost.community?._id;
                const isOwnerOfCurrentCommunity = options.some(opt => opt.type === 'community' && opt._id === currentCommunityId);

                if (currentCommunityId && isOwnerOfCurrentCommunity) {
                    setCommentAs(options.find(opt => opt._id === currentCommunityId));
                } else {
                    setCommentAs(personalProfile);
                }
                previousPostIdRef.current = currentPostId;
            }
        };

        fetchCommentingOptions();
    }, [currentUser, activePost]);

    const togglePicker = () => {
        if (smileButtonRef.current) {
            const rect = smileButtonRef.current.getBoundingClientRect();
            if (window.innerHeight - rect.bottom < EMOJI_PICKER_HEIGHT) {
                setPickerPosition('top');
            } else {
                setPickerPosition('bottom');
            }
        }
        setIsPickerVisible(v => !v);
    };

    const sortLabels = {
        newest: 'Сначала новые',
        oldest: 'Сначала старые',
        popular: 'Популярные'
    };

    const handleSortChange = useCallback((newSortOrder) => {
        setSortOrder(newSortOrder);
        setShowSortMenu(false);
        setEditingCommentId(null);
    }, []);

    const sortedComments = useMemo(() => {
        if (!activePost?.comments) return [];
        const commentsToSort = [...activePost.comments];
        
        commentsToSort.sort((a, b) => {
            switch (sortOrder) {
                case 'popular':
                    return (b.likes?.length || 0) - (a.likes?.length || 0);
                case 'oldest':
                    return new Date(a.createdAt) - new Date(b.createdAt);
                case 'newest':
                default:
                    return new Date(b.createdAt) - new Date(a.createdAt);
            }
        });
        return commentsToSort;
    }, [activePost, sortOrder]);

    useEffect(() => {
        setCurrentIndex(startIndex);
        setEditingCommentId(null);
        setCommentSelectionMode(false);
        setSelectedComments([]);
    }, [startIndex]);

    useEffect(() => {
        function handleClickOutside(event) {
            if (sortMenuRef.current && !sortMenuRef.current.contains(event.target)) {
                setShowSortMenu(false);
            }
            if (postMenuRef.current && !postMenuRef.current.contains(event.target)) {
                setShowPostMenu(false);
            }
            if (smileButtonRef.current && smileButtonRef.current.contains(event.target)) {
                return;
            }
            if (pickerRef.current && !pickerRef.current.contains(event.target)) {
                setIsPickerVisible(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);


    const fetchPostData = useCallback(async (showLoader = true) => {
        if (currentIndex === null || !posts[currentIndex]) return;
        if(showLoader) setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/api/posts/${posts[currentIndex]._id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setActivePost(res.data);
            return res.data;
        } catch (error) {
            toast.error("Не удалось загрузить данные поста.");
            onClose();
        } finally {
            if(showLoader) setIsLoading(false);
        }
    }, [currentIndex, posts, onClose]);

    useEffect(() => {
        const handlePostUpdateEvent = (event) => {
            if (activePost && event.detail && event.detail.postId && event.detail.postId === activePost._id) {
                fetchPostData(false);
            }
        };

        window.addEventListener('postUpdated', handlePostUpdateEvent);

        return () => {
            window.removeEventListener('postUpdated', handlePostUpdateEvent);
        };
    }, [activePost, fetchPostData]);

    useEffect(() => { fetchPostData(); }, [fetchPostData]);

    const handleVote = useCallback(async (optionId) => {
        const originalPoll = JSON.parse(JSON.stringify(activePost.poll));
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
    
        setActivePost(prev => ({ ...prev, poll: newPoll }));
        
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/api/posts/${activePost._id}/poll/vote`, { optionId }, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (error) {
            toast.error(error.response?.data?.message || "Ошибка при голосовании.");
            setActivePost(prev => ({ ...prev, poll: originalPoll }));
        }
    }, [activePost, currentUser]);

    const handleLike = async () => {
        const token = localStorage.getItem('token');
        try {
            const isLiked = activePost.likes.some(l => l._id === currentUserId);
            const optimisticLikes = isLiked
                ? activePost.likes.filter(l => l._id !== currentUserId)
                : [...activePost.likes, { _id: currentUserId, username: '...' }];
            
            setActivePost(prev => ({ ...prev, likes: optimisticLikes }));

            await axios.post(`${API_URL}/api/posts/${activePost._id}/like`, {}, { headers: { Authorization: `Bearer ${token}` } });
        } catch (error) {
            toast.error('Ошибка');
            fetchPostData(false);
        }
    };
    
    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        if (!commentText.trim() || isSendingComment) return;
        
        setIsSendingComment(true);
        const token = localStorage.getItem('token');
        try {
            await axios.post(
                `${API_URL}/api/posts/${activePost._id}/comments`,
                {
                    text: commentText,
                    parentId: replyingTo ? replyingTo.id : null,
                    commentAs: commentAs?.type === 'community' ? commentAs._id : null
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            setCommentText('');
            setReplyingTo(null);
            setIsPickerVisible(false);
        } catch (error) {
            toast.error('Не удалось добавить комментарий');
        } finally {
            setIsSendingComment(false);
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
                    await axios.delete(`${API_URL}/api/posts/${activePost._id}/comments`, {
                        headers: { Authorization: `Bearer ${token}` },
                        data: { commentIds: selectedComments }
                    });
                    toast.success('Комментарии удалены', { id: toastId });
                    setCommentSelectionMode(false);
                    setSelectedComments([]);
                } catch (error) {
                    toast.error('Ошибка при удалении.', { id: toastId });
                }
            }
        });
    };
    
    const handleDeleteAllComments = () => {
        const allRootCommentIds = activePost.comments.map(c => c._id);
        showConfirmation({
            title: `Удалить все ${allRootCommentIds.length} веток комментариев?`,
            message: 'Это действие нельзя отменить.',
            onConfirm: async () => {
                const toastId = toast.loading('Удаление...');
                try {
                    const token = localStorage.getItem('token');
                    await axios.delete(`${API_URL}/api/posts/${activePost._id}/comments`, {
                        headers: { Authorization: `Bearer ${token}` },
                        data: { commentIds: allRootCommentIds }
                    });
                    toast.success('Все комментарии удалены', { id: toastId });
                } catch (error) {
                    toast.error('Ошибка при удалении.', { id: toastId });
                }
            }
        });
    };

    const handleDeletePost = () => {
        setShowPostMenu(false);
        showConfirmation({
            title: 'Удалить пост?',
            message: 'Это действие нельзя отменить. Пост будет удален навсегда.',
            onConfirm: async () => {
                const toastId = toast.loading('Удаление поста...');
                try {
                    const token = localStorage.getItem('token');
                    await axios.delete(`${API_URL}/api/posts/${activePost._id}`, { headers: { Authorization: `Bearer ${token}` } });
                    toast.success('Пост удален', { id: toastId });
                    if (onDeletePost) onDeletePost(activePost._id);
                    onClose();
                } catch (error) {
                    toast.error('Ошибка при удалении поста.', { id: toastId });
                }
            }
        });
    };

    const handleImageUpdate = (newImageUrl) => {
        if (onUpdatePost) onUpdatePost(activePost._id, { imageUrls: [newImageUrl] });
        setIsEditingPostImage(false);
        fetchPostData(false);
    };
    
    const hasImages = activePost && activePost.imageUrls && activePost.imageUrls.length > 0;

    if (!posts || posts.length === 0 || currentIndex === null) {
        return null;
    }
    
    return ReactDOM.createPortal(
        <AnimatePresence>
            {currentIndex !== null && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-20 p-4">
                    <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors z-[60]"><X size={32} /></button>
                    {posts.length > 1 && <>
                        <button onClick={(e) => { e.stopPropagation(); setCurrentIndex(p=>(p-1+posts.length)%posts.length) }} className="absolute left-4 md:left-10 top-1/2 -translate-y-1/2 p-2 bg-white/10 rounded-full hover:bg-white/20 z-[60] text-white"><ChevronLeft size={32} /></button>
                        <button onClick={(e) => { e.stopPropagation(); setCurrentIndex(p=>(p+1)%posts.length) }} className="absolute right-4 md:right-10 top-1/2 -translate-y-1/2 p-2 bg-white/10 rounded-full hover:bg-white/20 z-[60] text-white"><ChevronRight size={32} /></button>
                    </>}
                    
                    {isEditingPostImage && activePost && (
                        <ImageEditorModal 
                            post={activePost}
                            onClose={() => setIsEditingPostImage(false)}
                            onSave={handleImageUpdate} />
                    )}
                    <motion.div
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0.9 }}
                        onClick={(e) => e.stopPropagation()}
                        style={{ maxHeight: currentTrack ? 'calc(90vh - 100px)' : '90vh' }}
                        className="overflow-hidden w-full h-full max-w-6xl flex bg-white dark:bg-slate-900 rounded-3xl relative text-slate-900 dark:text-white"
                    >
                        {isLoading && !activePost ? (
                            <div className="w-full flex items-center justify-center"><Loader2 className="animate-spin"/></div>
                        ) : activePost ? (
                            <>
                                {hasImages && <div className="absolute top-4 left-4 text-white/70 bg-black/30 px-3 py-1 rounded-full text-sm z-[60]">{currentIndex + 1} / {posts.length}</div>}
                                
                                {hasImages ? (
                                    <div className="w-full md:w-3/5 bg-black flex items-center justify-center">
                                        <img src={getImageUrl(activePost.imageUrls[0])} alt="Post" className="max-w-full max-h-full object-contain" />
                                    </div>
                                ) : null}
                                <div className={`
                                    flex-col relative z-20 bg-white dark:bg-slate-900
                                    ${hasImages ? 'hidden md:flex md:w-2/5' : 'flex w-full'}
                                `}>
                                    <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center space-x-3 flex-shrink-0">
                                        {(() => {
                                            const author = activePost.community || activePost.user;
                                            const linkTo = activePost.community ? `/communities/${author._id}` : `/profile/${author._id}`;
                                            const border = !activePost.community ? author.premiumCustomization?.avatarBorder : null;
                                            const borderClass = border?.type?.startsWith('animated') ? `premium-border-${border.type}` : '';
                                            const staticBorderStyle = border?.type === 'static' ? { padding: '4px', backgroundColor: border.value } : {};

                                            return (
                                                <Link to={linkTo} onClick={onClose} className="flex items-center space-x-3 group">
                                                    <div className={`relative rounded-full ${borderClass}`} style={staticBorderStyle}>
                                                        <Avatar
                                                            username={author.name || author.username}
                                                            avatarUrl={getImageUrl(author.avatar)}
                                                            isPremium={!activePost.community && author.premium?.isActive}
                                                            customBorder={border}
                                                        />
                                                    </div>
                                                    <div className="flex-grow">
                                                        {activePost.community && <p className="text-xs text-slate-400 flex items-center"><Users size={12} className="mr-1"/>Сообщество</p>}
                                                        <span className="font-bold group-hover:underline">{author.name || author.username}</span>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">{formatDistanceToNow(new Date(activePost.createdAt), { addSuffix: true, locale: customRuLocale })}</p>
                                                    </div>
                                                </Link>
                                            );
                                        })()}
                                        <div className="flex-grow"></div>
                                        {activePost.user._id === currentUserId && <div ref={postMenuRef} className="relative"><button onClick={() => setShowPostMenu(v => !v)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"><MoreHorizontal size={20}/></button>
                                            {showPostMenu && (
                                                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-10 overflow-hidden p-1 space-y-1">
                                                    <button onClick={handleDeletePost} className="w-full text-left flex items-center space-x-3 px-3 py-2 text-sm text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 rounded transition-colors">
                                                        <Trash2 size={16} />
                                                        <span>Удалить пост</span>
                                                    </button>
                                                    {activePost.comments.length > 0 && (
                                                        <>
                                                            <div className="my-1 h-px bg-slate-200 dark:bg-slate-700"></div>
                                                            <button onClick={() => { handleDeleteAllComments(); setShowPostMenu(false); }} disabled={!!editingCommentId} className="w-full text-left flex items-center space-x-3 px-3 py-2 text-sm text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 rounded transition-colors">
                                                                <Trash2 size={16} />
                                                                <span>Удалить все комм.</span>
                                                            </button>
                                                            <button onClick={() => { setCommentSelectionMode(true); setSelectedComments([]); setShowPostMenu(false); }} disabled={!!editingCommentId} className="w-full text-left flex items-center space-x-3 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors">
                                                                <Check size={16} />
                                                                <span>Выбрать комм.</span>
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>}
                                    </div>
                                    
                                    <div className="flex-1 overflow-y-auto min-h-0">
                                        <div className="p-4">
                                            {(activePost.text || activePost.attachedTrack || activePost.poll) && (
                                                <div className="border-l-2 border-slate-300 dark:border-slate-600 pl-4 py-2 mb-4 space-y-3">
                                                    {activePost.text && <p className="text-sm break-words whitespace-pre-wrap">{activePost.text}</p>}
                                                    {activePost.attachedTrack && 
                                                        <AttachedTrack 
                                                            track={{
                                                                ...activePost.attachedTrack,
                                                                albumArtUrl: activePost.attachedTrack.albumArtUrl || activePost.attachedTrack.album?.coverArtUrl
                                                            }} 
                                                        />
                                                    }
                                                    {activePost.poll && <PollDisplay poll={activePost.poll} onVote={handleVote} />}
                                                </div>
                                            )}
                                            
                                            <div className="flex items-center justify-between mt-4">
                                                <div className="flex items-center space-x-4">
                                                    <LikesPopover likers={activePost.likes}>
                                                        <span>
                                                            <button onClick={handleLike} className="flex items-center space-x-1 hover:text-red-500">
                                                                <Heart fill={activePost.likes.some(l=>l._id===currentUserId)?'#ef4444':'none'} stroke={activePost.likes.some(l=>l._id===currentUserId)?'#ef4444':'currentColor'}/>
                                                                <span>{activePost.likes.length}</span>
                                                            </button>
                                                        </span>
                                                    </LikesPopover>
                                                    <div className="flex items-center space-x-1"><MessageCircle/><span>{activePost.comments.length}</span></div>
                                                </div>

                                                {commentSelectionMode ? (
                                                    <div className="flex items-center space-x-2">
                                                        <button onClick={() => {setCommentSelectionMode(false); setSelectedComments([])}} className="inline-flex items-center justify-center whitespace-nowrap text-xs font-semibold px-2 py-1.5 rounded-lg bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20">Отмена</button>
                                                        <button onClick={handleDeleteSelectedComments} disabled={selectedComments.length === 0} className="inline-flex items-center justify-center whitespace-nowrap text-xs font-semibold px-2 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">Удалить ({selectedComments.length})</button>
                                                    </div>
                                                ) : null}

                                                {activePost.comments.length > 1 && (
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
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                                            {sortedComments.length > 0 ? sortedComments.map(comment => (
                                                <Comment 
                                                    key={comment._id} 
                                                    comment={comment} 
                                                    currentUserId={currentUserId} 
                                                    currentUser={currentUser}
                                                    postOwnerId={activePost.user._id} 
                                                    postCommunityId={activePost.community?._id}
                                                    onCommentUpdate={fetchPostData}
                                                    onReply={(c) => {
                                                        const authorName = c.name || c.username; 
                                                        setReplyingTo({ username: authorName, id: c.id }); 
                                                        setCommentText(`@${authorName}, `); 
                                                        commentInputRef.current?.focus();
                                                    }} 
                                                    editingCommentId={editingCommentId} 
                                                    setEditingCommentId={setEditingCommentId} 
                                                    selectionMode={commentSelectionMode} 
                                                    onToggleSelect={(id) => setSelectedComments(p=>p.includes(id)?p.filter(i=>i!==id):[...p,id])} 
                                                    isSelected={(id) => selectedComments.includes(id)} 
                                                />
                                            )) : <div className="text-center text-sm text-slate-500 dark:text-slate-400 py-10">Комментариев пока нет.</div>}
                                        </div>
                                    </div>
                                    
                                    {!activePost.commentsDisabled ? (
                                      <div className="p-4 border-t border-slate-200 dark:border-slate-700 relative flex-shrink-0">
                                          {replyingTo && (
                                              <div className="flex justify-between items-center bg-slate-100 dark:bg-slate-800 px-3 py-1.5 mb-2 rounded-lg text-sm">
                                                  <span className="text-slate-500 dark:text-slate-400">Ответ пользователю <span className="font-bold text-slate-800 dark:text-white">{replyingTo.username}</span></span>
                                                  <button onClick={()=>{setReplyingTo(null); setCommentText('')}} className="p-1 hover:text-slate-900"><X size={16} /></button>
                                              </div>
                                          )}

                                          <form onSubmit={handleCommentSubmit} className="flex items-start space-x-3">
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
                                                                                      avatarUrl={getImageUrl(option.avatar)}
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
                                                                    avatarUrl={getImageUrl(commentAs.avatar)}
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
                                                      value={commentText} 
                                                      onChange={e => setCommentText(e.target.value)} 
                                                      placeholder={
                                                          editingCommentId ? "Завершите редактирование..." : 
                                                          commentSelectionMode ? "Завершите выбор..." : 
                                                          "Добавить комментарий..."
                                                      }
                                                      disabled={!!editingCommentId || commentSelectionMode || isSendingComment}
                                                      className="w-full bg-slate-100 dark:bg-slate-800 rounded-full px-4 py-2 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed"/>
                                                  
                                                  {isPickerVisible && (
                                                      <div ref={pickerRef} className={`absolute z-20 right-0 ${pickerPosition === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'}`}>
                                                          <Suspense fallback={<div className="w-80 h-96 bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center justify-center">...</div>}>
                                                              <Picker 
                                                                  onEmojiClick={(e) => setCommentText(p => p+e.emoji)} 
                                                                  theme={localStorage.getItem('theme') === 'dark' ? "dark" : "light"} 
                                                              />
                                                          </Suspense>
                                                      </div>
                                                  )}
                                                  <button 
                                                      ref={smileButtonRef}
                                                      type="button" 
                                                      onClick={togglePicker}
                                                      disabled={!!editingCommentId}
                                                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                                  >
                                                      <Smile size={20}/>
                                                  </button>
                                              </div>
                                              <button 
                                                  type="submit" 
                                                  disabled={!!editingCommentId || commentSelectionMode || !commentText.trim() || isSendingComment} 
                                                  className="p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 disabled:bg-slate-300 dark:disabled:bg-slate-600 flex items-center justify-center w-9 h-9 flex-shrink-0"
                                              >
                                                  {isSendingComment ? <Loader2 size={18} className="animate-spin"/> : <Send size={16}/>}
                                              </button>
                                          </form>
                                      </div>
                                    ) : (
                                        <div className="p-4 border-t border-slate-200 dark:border-slate-700 text-center text-sm text-slate-500 dark:text-slate-400 flex-shrink-0">
                                            Комментарии к этому посту отключены.
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="w-full flex items-center justify-center">Не удалось загрузить пост.</div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.getElementById('modal-root')
    );
};
export default PostViewModal;