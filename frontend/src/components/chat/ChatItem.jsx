// frontend/src/components/chat/ChatItem.jsx

import React, { useMemo, useState, forwardRef } from 'react';
import Avatar from '../Avatar';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Bookmark, Trash2, MoreHorizontal, Check, CheckCheck, Bell, BellOff, MailCheck, MailWarning, Archive, ArchiveRestore, Image as ImageIcon, Pin } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useModal } from '../../hooks/useModal';
import Tippy from '@tippyjs/react/headless';
import { useUser } from '../../hooks/useUser';
import { useWebSocket } from '../../context/WebSocketContext';

const API_URL = import.meta.env.VITE_API_URL;

const TippyWrapper = forwardRef((props, ref) => {
    return <div ref={ref} {...props}>{props.children}</div>;
});
TippyWrapper.displayName = 'TippyWrapper';

const ChatItem = ({ conversation, isSelected, onClick, onUpdate, isTyping, onDeleteRequest, isPinned, pinnedCount, pinLimit, onOpenPremiumModal, onOptimisticUpdate }) => {
    const interlocutor = conversation.interlocutor;
    const lastMessage = conversation.lastMessage;
    const isSavedMessages = conversation.isSavedMessages;
    const { currentUser } = useUser();
    const currentUserId = currentUser?._id;
    const { showConfirmation } = useModal();
    const { userStatuses } = useWebSocket();
    const [isMenuVisible, setIsMenuVisible] = useState(false);

    const interlocutorStatus = userStatuses[interlocutor?._id];
    const liveInterlocutor = useMemo(() => ({
        ...interlocutor,
        ...(interlocutorStatus || {})
    }), [interlocutor, interlocutorStatus]);

    const isPremium = liveInterlocutor?.premium?.isActive;
    const usernameEmoji = liveInterlocutor?.premiumCustomization?.usernameEmoji;

    const lastMessageSenderId = lastMessage?.sender?._id || lastMessage?.sender;

    const isBlockedByThem = liveInterlocutor?.isBlockedByThem;
    const isBlockingThem = currentUser?.blacklist?.includes(liveInterlocutor?._id);
    const isBlocked = isBlockedByThem || isBlockingThem;

    const canShowAvatar = useMemo(() => {
        if (isBlockedByThem) return false;
        const privacySource = liveInterlocutor?.privacySettings;
        if (!privacySource) return true;
        const privacySetting = privacySource.viewAvatar || 'everyone';
        const friendshipStatus = conversation?.friendshipStatus;
        if (privacySetting === 'everyone') return true;
        if (privacySetting === 'private') return false;
        if (privacySetting === 'friends') return friendshipStatus === 'friend';
        return false;
    }, [isBlockedByThem, liveInterlocutor, conversation]);

    const handleMuteToggle = async (e) => {
        e.stopPropagation();
        setIsMenuVisible(false);
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/api/messages/conversations/${conversation._id}/mute`, {}, { 
                headers: { Authorization: `Bearer ${token}` } 
            });
            toast.success(conversation.isMuted ? "Уведомления включены" : "Уведомления отключены");
            onUpdate();
        } catch (error) {
            toast.error("Не удалось изменить настройки уведомлений");
        }
    };
    
    const handleMarkAsRead = async (e) => {
        e.stopPropagation();
        setIsMenuVisible(false);
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/api/messages/read`, { conversationId: conversation._id }, { 
                headers: { Authorization: `Bearer ${token}` } 
            });
            onUpdate();
        } catch (error) {
            toast.error("Не удалось отметить как прочитанное");
        }
    };

    const handleMarkAsUnread = async (e) => {
        e.stopPropagation();
        setIsMenuVisible(false);
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/api/messages/unread`, { conversationId: conversation._id }, { 
                headers: { Authorization: `Bearer ${token}` } 
            });
            onUpdate();
        } catch (error) {
            toast.error("Не удалось отметить как непрочитанное");
        }
    };

    const handleArchiveToggle = async (e) => {
        e.stopPropagation();
        setIsMenuVisible(false);
        const toastId = toast.loading(conversation.isArchived ? "Возвращение из архива..." : "Архивация...");
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_URL}/api/messages/conversations/${conversation._id}/archive`, {}, { headers: { Authorization: `Bearer ${token}` } });
            toast.success(res.data.message, { id: toastId });
            onUpdate();
        } catch (error) {
            toast.error("Не удалось изменить статус архива", { id: toastId });
        }
    };

    const handlePinToggle = async (e) => {
        e.stopPropagation();
        setIsMenuVisible(false);
        
        if (!isPinned && pinnedCount >= pinLimit) {
            if (currentUser?.premium?.isActive) {
                toast.error(`Достигнут лимит в ${pinLimit} закрепленных чатов.`);
            } else {
                onOpenPremiumModal();
            }
            return;
        }

        const originalConversation = { ...conversation };
        const optimisticallyUpdatedConversation = { ...conversation, isPinned: !isPinned };
        onOptimisticUpdate(optimisticallyUpdatedConversation);

        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_URL}/api/messages/conversations/${conversation._id}/pin`, {}, { headers: { Authorization: `Bearer ${token}` } });
            toast.success(res.data.message);
            onUpdate();
        } catch (error) {
            toast.error(error.response?.data?.message || "Не удалось изменить статус закрепления");
            onOptimisticUpdate(originalConversation);
        }
    };
    
    const handleDeleteClick = (e) => {
        e.stopPropagation();
        setIsMenuVisible(false);

        if (isSavedMessages) {
             showConfirmation({
                title: "Очистить историю?",
                message: "Все сообщения в 'Избранном' будут удалены навсегда. Это действие нельзя отменить.",
                onConfirm: () => onDeleteRequest(conversation._id, false, false)
            });
        } else {
            showConfirmation({
                title: "Удалить чат?",
                message: "Как вы хотите удалить этот чат?",
                children: (closeModal) => {
                    const [shouldAddToBlacklist, setShouldAddToBlacklist] = useState(false);
                    return (
                        <>
                            <div className="flex justify-center flex-wrap gap-3 my-6">
                                <button onClick={() => { onDeleteRequest(conversation._id, true, shouldAddToBlacklist); closeModal(); }} className="rounded-lg bg-red-600 hover:bg-red-700 font-semibold text-white transition-colors text-sm px-3.5 py-2">Удалить у всех</button>
                                <button onClick={() => { onDeleteRequest(conversation._id, false, shouldAddToBlacklist); closeModal(); }} className="rounded-lg bg-blue-600 hover:bg-blue-700 font-semibold text-white transition-colors text-sm px-3.5 py-2">Удалить у себя</button>
                            </div>
                            <div className="pt-4 border-t border-slate-200/50 dark:border-white/10">
                                <label htmlFor="blacklist-toggle-modal" className="flex items-center justify-between w-full">
                                    <span className="text-sm text-slate-600 dark:text-white/80">Также добавить в черный список</span>
                                    <div className="relative inline-flex items-center cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            id="blacklist-toggle-modal"
                                            className="sr-only peer" 
                                            checked={shouldAddToBlacklist} 
                                            onChange={(e) => setShouldAddToBlacklist(e.target.checked)}
                                        />
                                        <div className="w-11 h-6 bg-slate-300 dark:bg-slate-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </div>
                                </label>
                            </div>
                        </>
                    );
                },
                buttons: []
            });
        }
    };

    const lastMessageTime = lastMessage?.createdAt ? format(new Date(lastMessage.createdAt), 'HH:mm') : '';

    const canShowOnline = () => {
        if (currentUser?.privacySettings?.viewOnlineStatus === 'private') return false;
        if (isBlockedByThem) return false;
        if (!liveInterlocutor || !liveInterlocutor.isOnline) return false;
        const privacySource = liveInterlocutor.privacySettings;
        const privacySetting = privacySource?.viewOnlineStatus || 'everyone';
        const friendshipStatus = conversation?.friendshipStatus;
        return privacySetting === 'everyone' || (privacySetting === 'friends' && friendshipStatus === 'friend');
    };

    const ReadReceipt = () => {
        if (!lastMessage || lastMessageSenderId !== currentUserId) {
            return null;
        }
        if (isSavedMessages) {
            return <CheckCheck size={16} className="text-blue-500" />;
        }
        const isReadByRecipient = lastMessage.readBy && lastMessage.readBy.some(id => id !== currentUserId);

        if (isReadByRecipient) {
            return <CheckCheck size={16} className="text-blue-500" />;
        } else {
            return <Check size={16} />;
        }
    };

    const hasUnreadReaction =
        lastMessage &&
        lastMessage.reactions &&
        lastMessage.reactions.length > 0 &&
        !lastMessage.readBy.includes(currentUserId) &&
        lastMessageSenderId !== currentUserId;
    
    const cleanTitle = (title) => {
        if (!title) return '';
        return title.replace(
            /\s*[\(\[](?:\s*(?:official\s*)?(?:video|music\s*video|lyric\s*video|audio|live|performance|visualizer|explicit|single|edit|remix|radio\s*edit|clean|dirty|HD|HQ|full|album\s*version|version|clip|demo|teaser|cover|karaoke|instrumental|extended|rework|reedit|re-cut|reissue|bonus\s*track|unplugged|mood\s*video|concert|show|feat\.?|ft\.?|featuring|\d{4}|(?:\d{2,3}\s?kbps))\s*)[^)\]]*[\)\]]\s*$/i,
            ''
        ).trim();
    };

    const formatArtistName = (artistData) => {
        if (!artistData) return '';
        if (Array.isArray(artistData)) {
            return artistData.map(a => (a.name || '').replace(' - Topic', '').trim()).join(', ');
        }
        if (typeof artistData === 'object' && artistData.name) {
            return artistData.name.replace(' - Topic', '').trim();
        }
        if (typeof artistData === 'string') {
            return artistData.replace(' - Topic', '').trim();
        }
        return '';
    };

    const renderLastMessage = () => {
        if (isTyping) {
            return <p className="text-sm text-green-500 animate-pulse">Печатает...</p>;
        }
        if (!lastMessage || !lastMessage._id) {
            return <p className="text-sm text-slate-500 dark:text-slate-400 truncate">Нет сообщений</p>;
        }

        const prefix = lastMessageSenderId === currentUserId ? "Вы: " : "";

        if (lastMessage.imageUrl) {
            return (
                <div className="flex items-center space-x-1.5 text-sm text-slate-500 dark:text-slate-400 truncate">
                    <span>{prefix}</span>
                    <ImageIcon size={14} className="flex-shrink-0" />
                    <span className="truncate">{lastMessage.text || "Изображение"}</span>
                </div>
            );
        }
        
        const content = lastMessage.text || 
                        (lastMessage.attachedTrack ? `Трек: ${formatArtistName(lastMessage.attachedTrack.artist)} - ${cleanTitle(lastMessage.attachedTrack.title)}` : "Нет сообщений");
        return (
             <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                {prefix}{content}
            </p>
        );
    };

   const UnreadIndicator = () => {
        if (conversation.unreadCount > 0) {
            return (
                <span className={`px-2 py-0.5 text-xs text-white rounded-full ${conversation.isMuted ? 'bg-slate-400 dark:bg-slate-600' : 'bg-blue-500'}`}>
                    {conversation.unreadCount}
                </span>
            );
        }
        if (conversation.isMarkedAsUnread) {
             return (
                <span className={`w-2 h-2 rounded-full ${conversation.isMuted ? 'bg-slate-400 dark:bg-slate-600' : 'bg-blue-500'}`}></span>
            );
        }
        if (hasUnreadReaction) {
            return (
                <span className="flex items-center justify-center w-5 h-5 bg-slate-200 dark:bg-slate-700 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-slate-500 dark:text-slate-400"><path d="M12 4.248c-3.148-5.402-12-3.825-12 2.942 0 4.661 5.571 9.427 12 15.808 6.43-6.381 12-11.147 12-15.808 0-6.792-8.875-8.306-12-2.942z"/></svg>
                </span>
            );
        }
        return null;
    };


    return (
        <div
            onClick={onClick}
            className={`p-3 rounded-lg cursor-pointer transition-all duration-200 relative group
                ${isPinned ? 'bg-blue-500/5 dark:bg-blue-500/15' : ''}
                ${isSelected ? 'bg-blue-500/10 dark:bg-blue-500/20' : 'hover:bg-slate-100/50 dark:hover:bg-white/5'}
                ${isBlocked ? 'opacity-70' : ''}
            `}
        >
            <div className="flex items-start space-x-3">
                {isSavedMessages ? (
                    <div className="relative flex-shrink-0">
                        <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center">
                            <Bookmark size={24} className="text-white" fill="white" />
                        </div>
                    </div>
                ) : (
                    <div className="relative flex-shrink-0">
                        {(() => {
                            const border = liveInterlocutor?.premiumCustomization?.avatarBorder;
                            const borderClass = border?.type?.startsWith('animated') ? `premium-border-${border.type}` : '';
                            const staticBorderStyle = border?.type === 'static' ? { padding: '4px', backgroundColor: border.value } : {};

                            return (
                                <div className={`relative rounded-full ${borderClass}`} style={staticBorderStyle}>
                                    <Avatar
                                        size="lg"
                                        username={liveInterlocutor?.username}
                                        avatarUrl={canShowAvatar ? liveInterlocutor?.avatar : ''}
                                        isPremium={isPremium}
                                        customBorder={border}
                                    />
                                    {canShowOnline() && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-slate-800"></div>}
                                </div>
                            );
                        })()}
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                        <p className="font-bold truncate flex items-center text-slate-800 dark:text-slate-100">
                            {isSavedMessages ? 'Избранное' : (liveInterlocutor?.fullName || liveInterlocutor?.username)}
                            {usernameEmoji?.url && (
                                <img src={usernameEmoji.url} alt="emoji" className="w-4 h-4 ml-1.5" />
                            )}
                            {/* --- ИСПРАВЛЕНИЕ 2: Иконка "без звука" теперь здесь --- */}
                            {conversation.isMuted && <BellOff size={14} className="text-slate-400 dark:text-slate-500 ml-2 flex-shrink-0" />}
                        </p>
                        <div className="flex flex-col items-end flex-shrink-0 ml-2">
                            <div className="flex items-center space-x-1 text-xs text-slate-400">
                                <ReadReceipt />
                                <span>{lastMessageTime}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-between items-end mt-0.5">
                        {renderLastMessage()}
                        <div className="flex items-center justify-end flex-shrink-0 ml-2 space-x-2">
                            <UnreadIndicator />
                        </div>
                    </div>
                </div>

                 {/* --- НАЧАЛО ИСПРАВЛЕНИЯ --- */}
                 <div className="flex flex-col items-end justify-between flex-shrink-0">
                 {/* --- КОНЕЦ ИСПРАВЛЕНИЯ --- */}
                    <Tippy
                        interactive
                        placement="bottom-end"
                        visible={isMenuVisible}
                        onClickOutside={() => setIsMenuVisible(false)}
                        popperOptions={{ strategy: 'fixed' }}
                        render={attrs => (
                            <div className="ios-glass-popover w-52 rounded-xl shadow-lg p-1" {...attrs}>
                                {!isSavedMessages && (
                                    (conversation.unreadCount > 0 || conversation.isMarkedAsUnread) ? (
                                        <button onClick={handleMarkAsRead} className="w-full text-left flex items-center space-x-2 px-3 py-1.5 text-sm rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                                            <MailCheck size={14}/> <span>Отметить прочитанным</span>
                                        </button>
                                    ) : (
                                        <button onClick={handleMarkAsUnread} className="w-full text-left flex items-center space-x-2 px-3 py-1.5 text-sm rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                                            <MailWarning size={14}/> <span>Отметить непрочитанным</span>
                                        </button>
                                    )
                                )}
                                <button onClick={handleMuteToggle} className="w-full text-left flex items-center space-x-2 px-3 py-1.5 text-sm rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                                    {conversation.isMuted ? <Bell size={14} /> : <BellOff size={14} />}
                                    <span>{conversation.isMuted ? 'Включить увед.' : 'Отключить увед.'}</span>
                                </button>
                                {!isSavedMessages && (
                                    <button onClick={handlePinToggle} className="w-full text-left flex items-center space-x-2 px-3 py-1.5 text-sm rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                                        <Pin size={14}/>
                                        <span>{isPinned ? 'Открепить' : 'Закрепить'}</span>
                                    </button>
                                )}
                                {!isSavedMessages && (
                                    <button onClick={handleArchiveToggle} className="w-full text-left flex items-center space-x-2 px-3 py-1.5 text-sm rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                                        {conversation.isArchived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                                        <span>{conversation.isArchived ? 'Разархивировать' : 'В архив'}</span>
                                    </button>
                                )}
                                <button onClick={handleDeleteClick} className="w-full text-left flex items-center space-x-2 px-3 py-1.5 text-sm rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10">
                                    <Trash2 size={14}/> <span className="dark:text-red-400">{isSavedMessages ? 'Очистить историю' : 'Удалить'}</span>
                                </button>
                                <div className="tippy-arrow" data-popper-arrow></div>
                            </div>
                        )}
                    >
                        <TippyWrapper>
                            {/* --- НАЧАЛО ИСПРАВЛЕНИЯ --- */}
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsMenuVisible(v => !v); }}
                                className="p-1 rounded-full text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-opacity"
                            >
                                <MoreHorizontal size={16}/>
                            </button>
                            {/* --- КОНЕЦ ИСПРАВЛЕНИЯ --- */}
                        </TippyWrapper>
                    </Tippy>
                    
                    {/* --- НАЧАЛО ИСПРАВЛЕНИЯ --- */}
                    <div className="h-[14px] flex items-center justify-end">
                        {isPinned && <Pin size={14} className="text-slate-400 dark:text-slate-500" />}
                    </div>
                    {/* --- КОНЕЦ ИСПРАВЛЕНИЯ --- */}

                </div>
            </div>
        </div>
    );
};

export default ChatItem;