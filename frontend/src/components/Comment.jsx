// frontend/src/components/Comment.jsx

import React, { useState, useRef, useEffect, Suspense } from 'react';
import axios from 'axios';
import { Heart, Pencil, Trash2, CornerDownRight, MinusSquare, Smile, Check } from 'lucide-react';
import Avatar from './Avatar';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { useModal } from '../hooks/useModal';
import LikesPopover from './LikesPopover';
import { Link } from 'react-router-dom';

const Picker = React.lazy(() => import('emoji-picker-react'));
const EMOJI_PICKER_HEIGHT = 450;
const API_URL = import.meta.env.VITE_API_URL;

const customRuLocale = {
    ...ru,
    formatDistance: (token, count, options) => {
        if (token === 'lessThanXMinutes' || (token === 'xMinutes' && count === 1)) return 'только что';
        return ru.formatDistance(token, count, options);
    },
};

const Comment = ({ comment, currentUserId, currentUser, postOwnerId, postCommunityId, onCommentUpdate, onReply, editingCommentId, setEditingCommentId, selectionMode, onToggleSelect, isSelected }) => {
    const [localComment, setLocalComment] = useState(comment);
    
    const [editedText, setEditedText] = useState(comment.text);
    const { showConfirmation } = useModal();
    const [childrenVisible, setChildrenVisible] = useState(true);
    const [pickerPosition, setPickerPosition] = useState('top');
    const [isEditPickerVisible, setIsEditPickerVisible] = useState(false);
    const editPickerContainerRef = useRef(null);
    const smileButtonRef = useRef(null);

    useEffect(() => {
        setLocalComment(comment);
    }, [comment]);
    
    const authorObject = localComment.author || localComment.user;

    if (!authorObject) {
        return null;
    }

    const isThisCommentSelected = selectionMode && isSelected(localComment._id);
    const isEditingThis = editingCommentId === localComment._id;
    const isEditingAny = !!editingCommentId;

    const authorModel = localComment.authorModel || 'User'; 
    const isCommentOwner = authorModel === 'User' && currentUserId === authorObject._id;
    const canDelete = isCommentOwner || currentUserId === postOwnerId;
    
    const isLikedByMe = localComment.likes.some(like => like && like._id === currentUserId);
    const hasChildren = localComment.children && localComment.children.length > 0;
    
    const getAuthorBadge = () => {
        if (postCommunityId) {
            if (authorModel === 'Community' && authorObject._id === postCommunityId) {
                return <span className="ml-2 text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300 px-2 py-0.5 rounded-full">Автор</span>;
            }
        } 
        else {
            if (authorModel === 'User' && authorObject._id === postOwnerId) {
                return <span className="ml-2 text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300 px-2 py-0.5 rounded-full">Автор</span>;
            }
        }
        return null;
    };
    
    const toggleEditPicker = () => {
        if (smileButtonRef.current) {
            const rect = smileButtonRef.current.getBoundingClientRect();
            if (window.innerHeight - rect.bottom < EMOJI_PICKER_HEIGHT) {
                setPickerPosition('top');
            } else {
                setPickerPosition('bottom');
            }
        }
        setIsEditPickerVisible(p => !p);
    };

    useEffect(() => {
        function handleClickOutside(event) {
            if (smileButtonRef.current && smileButtonRef.current.contains(event.target)) return;
            if (editPickerContainerRef.current && !editPickerContainerRef.current.contains(event.target)) setIsEditPickerVisible(false);
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    
    const handleUpdate = async () => {
        if (editedText.trim() === localComment.text || !editedText.trim()) {
            setEditingCommentId(null);
            return;
        }
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${API_URL}/api/posts/${localComment.post}/comments/${localComment._id}`, { text: editedText }, { headers: { Authorization: `Bearer ${token}` } });
            toast.success('Комментарий обновлен');
            onCommentUpdate();
        } catch (error) { toast.error('Ошибка обновления'); } finally { setEditingCommentId(null); }
    };
    
    const handleDelete = () => {
        showConfirmation({
            title: "Удалить комментарий?",
            message: "Вы уверены? Это действие нельзя отменить.",
            onConfirm: async () => {
                try {
                    const token = localStorage.getItem('token');
                    await axios.delete(`${API_URL}/api/posts/${localComment.post}/comments/${localComment._id}`, { headers: { Authorization: `Bearer ${token}` } });
                    toast.success('Комментарий удален');
                    onCommentUpdate();
                } catch (error) { toast.error('Ошибка удаления'); }
            }
        });
    };

    const renderCommentText = () => {
        const { text, parent } = localComment;
        const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const parentAuthorObject = parent ? (parent.author || parent.user) : null;
        if (parentAuthorObject) {
            const parentAuthorName = parentAuthorObject.name || parentAuthorObject.username;
            if (parentAuthorName) {
                const mentionRegex = new RegExp(`^@${escapeRegExp(parentAuthorName)}\\b`, 'i');
                const match = text.match(mentionRegex);
                if (match) {
                    const matchedMention = match[0];
                    const restOfText = text.substring(matchedMention.length);
                    const parentAuthorModel = parent.authorModel || 'User';
                    const linkTo = parentAuthorModel === 'Community' ? `/communities/${parentAuthorObject._id}` : `/profile/${parentAuthorObject._id}`;
                    return (<><Link to={linkTo} className="text-blue-400 hover:underline font-semibold" onClick={e => e.stopPropagation()}>{matchedMention}</Link><span>{restOfText}</span></>);
                }
            }
        }
        return text;
    };

    const handleLike = async () => {
        const originalLikes = localComment.likes;
        const optimisticLikes = isLikedByMe ? originalLikes.filter(like => like._id !== currentUserId) : [...originalLikes, { ...currentUser, _id: currentUserId }];
        setLocalComment(prev => ({ ...prev, likes: optimisticLikes }));
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/api/posts/${localComment.post}/comments/${localComment._id}/like`, {}, { headers: { Authorization: `Bearer ${token}` } });
        } catch (error) {
            toast.error('Не удалось поставить лайк');
            setLocalComment(prev => ({ ...prev, likes: originalLikes }));
        }
    };

    const authorName = authorObject.name || authorObject.username;
    const authorFullName = authorObject.fullName;
    const authorAvatar = authorObject.avatar || '';
    const authorLink = authorModel === 'Community' ? `/communities/${authorObject._id}` : `/profile/${authorObject._id}`;
    const authorIsPremium = authorModel === 'User' && authorObject.premium?.isActive;
    const authorCustomBorder = authorModel === 'User' ? authorObject.premiumCustomization?.avatarBorder : null;

    return (
        <div>
            <div 
                className={`flex items-start space-x-3 group relative p-2 rounded-lg transition-colors ${selectionMode ? 'cursor-pointer' : ''} ${isThisCommentSelected ? 'bg-blue-500/10 dark:bg-blue-500/20' : ''}`}
                onClick={(e) => {
                    if (selectionMode && e.target.closest('.comment-body')) {
                        onToggleSelect(localComment._id);
                    }
                }}
            >
                {selectionMode && 
                    <div className="absolute top-1/2 -translate-y-1/2 left-2 w-5 h-5 rounded-full flex items-center justify-center border-2 transition-all duration-150 bg-white dark:bg-slate-900 z-10">
                        <div className={`w-full h-full rounded-full flex items-center justify-center transition-all duration-150 ${isThisCommentSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-400 group-hover:border-blue-500'}`}>
                           {isThisCommentSelected && <Check size={12} className="text-white"/>}
                        </div>
                    </div>
                }
                <div className={`${selectionMode ? 'pl-8' : ''} comment-body w-full`}>
                    <div className="flex items-start space-x-3">
                        {/* --- НАЧАЛО ИСПРАВЛЕНИЯ --- */}
                        {(() => {
                            const border = authorCustomBorder;
                            const borderClass = border?.type?.startsWith('animated') ? `premium-border-${border.type}` : '';
                            const staticBorderStyle = border?.type === 'static' ? { padding: '4px', backgroundColor: border.value } : {};

                            return (
                                <div 
                                    className={`relative rounded-full ${borderClass}`}
                                    style={staticBorderStyle}
                                >
                                    <Avatar
                                        size="sm"
                                        username={authorName}
                                        fullName={authorObject.fullName || authorName}
                                        avatarUrl={authorAvatar}
                                        isPremium={authorIsPremium}
                                        customBorder={authorCustomBorder}
                                    />
                                </div>
                            );
                        })()}
                        {/* --- КОНЕЦ ИСПРАВЛЕНИЯ --- */}
                        <div className="flex-1 min-w-0">
                            {isEditingThis ? (
                                <div className="relative">
                                    <textarea value={editedText} onChange={(e) => setEditedText(e.target.value)} autoFocus className="w-full bg-slate-100 dark:bg-slate-800 p-2 rounded-md border border-blue-500 focus:outline-none text-sm resize-none"/>
                                    <div className="flex items-center justify-between mt-2">
                                        <div className="flex items-center space-x-2">
                                            <button onClick={handleUpdate} className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-md">Сохранить</button>
                                            <button onClick={() => setEditingCommentId(null)} className="text-xs bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 px-3 py-1.5 rounded-md">Отмена</button>
                                        </div>
                                        <button ref={smileButtonRef} type="button" onClick={toggleEditPicker} className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"><Smile size={18} /></button>
                                    </div>
                                    {isEditPickerVisible && (
                                        <div ref={editPickerContainerRef} className={`absolute z-20 right-0 ${pickerPosition === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'}`}>
                                            <Suspense fallback={<div className="w-80 h-96 bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center justify-center">...</div>}>
                                                <Picker onEmojiClick={(emojiObject) => setEditedText(prev => prev + emojiObject.emoji)} theme={localStorage.getItem('theme') === 'dark' ? "dark" : "light"} />
                                            </Suspense>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <div className="text-sm flex items-center space-x-2">
                                        <Link to={authorLink} className="font-bold hover:underline">
                                            {authorName}
                                        </Link>
                                        {getAuthorBadge()}
                                        <span className="text-xs text-slate-500 dark:text-slate-400">{formatDistanceToNow(new Date(localComment.createdAt), { addSuffix: true, locale: customRuLocale })}</span>
                                    </div>
                                    <p className="text-sm break-words mt-1">{renderCommentText()}</p>
                                    <div className="flex items-center space-x-4 mt-2 text-xs text-slate-500 dark:text-slate-400">
                                       <button onClick={() => onReply({ id: localComment._id, username: authorName })} disabled={isEditingAny || selectionMode} className="font-semibold hover:text-slate-800 dark:hover:text-white transition-colors disabled:text-slate-400/50 disabled:cursor-not-allowed">Ответить</button>
                                       <LikesPopover 
                                            likers={localComment.likes || []} 
                                            postOwnerId={postOwnerId}
                                        >
                                            <span>
                                                <button onClick={handleLike} className="flex items-center space-x-1 hover:text-red-500 transition-colors">
                                                    <Heart size={14} fill={isLikedByMe ? '#ef4444' : 'none'} stroke={isLikedByMe ? '#ef4444' : 'currentColor'} />
                                                    <span>{localComment.likes?.length || 0}</span>
                                                </button>
                                            </span>
                                       </LikesPopover>
                                       {hasChildren && (
                                           <button onClick={() => { setChildrenVisible(!childrenVisible); setEditingCommentId(null); }} className="flex items-center space-x-1 hover:text-slate-800 dark:hover:text-white">
                                               {childrenVisible ? <MinusSquare size={14} /> : <CornerDownRight size={14} />}
                                               <span>{childrenVisible ? 'Скрыть ответы' : `Ответы (${localComment.children.length})`}</span>
                                           </button>
                                       )}
                                    </div>
                                </>
                            )}
                        </div>
                         {!isEditingThis && !selectionMode && (
                            <div className={`opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1 absolute top-1 right-1 ${isEditingAny ? 'hidden' : ''}`}>
                                {isCommentOwner && <button onClick={() => setEditingCommentId(localComment._id)} className="p-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"><Pencil size={14} /></button>}
                                {canDelete && <button onClick={handleDelete} className="p-1 text-slate-500 dark:text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {hasChildren && childrenVisible && (
                <div className="ml-5 pl-4 border-l-2 border-slate-200 dark:border-slate-700/50 space-y-2 mt-2">
                    {localComment.children.filter(c => c && c._id).map(childComment => (
                        <Comment
                            key={childComment._id}
                            comment={childComment}
                            currentUserId={currentUserId}
                            currentUser={currentUser}
                            postOwnerId={postOwnerId}
                            postCommunityId={postCommunityId}
                            onCommentUpdate={onCommentUpdate}
                            onReply={onReply}
                            editingCommentId={editingCommentId}
                            setEditingCommentId={setEditingCommentId}
                            selectionMode={selectionMode}
                            onToggleSelect={onToggleSelect}
                            isSelected={isSelected}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default Comment;