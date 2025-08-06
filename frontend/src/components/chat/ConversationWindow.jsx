// frontend/src/components/chat/ConversationWindow.jsx --- ИСПРАВЛЕННЫЙ ФАЙЛ ---

import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import Avatar from '../Avatar';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import ForwardModal from './ForwardModal';
import ImageAttachmentModal from './ImageAttachmentModal';
import { Loader2, MoreVertical, X, ChevronsRight, Trash2, CornerUpLeft, Search, ChevronUp, ChevronDown, XCircle, UserCheck, ShieldOff, Check, MessageSquareOff, BarChart2, Image as ImageIcon, Paintbrush, Bookmark, Calendar } from 'lucide-react';
import { useWebSocket } from '../../context/WebSocketContext';
import { useModal } from '../../hooks/useModal';
import toast from 'react-hot-toast';
import { format, formatDistanceToNow, formatDistanceToNowStrict } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useUser } from '../../hooks/useUser';
import SmartDateIndicator from './SmartDateIndicator';
import { AnimatePresence, motion } from 'framer-motion';
import SystemMessage from './SystemMessage';
import PinnedMessagesCarousel from './PinnedMessagesCarousel';
import StatsPanel from './StatsPanel';
import AttachmentsPanel from './AttachmentsPanel';
import ImageViewer from '../ImageViewer';
import DeletionTimerToast from './DeletionTimerToast';
import WallpaperModal from './WallpaperModal';
import ChatCalendarPanel from './ChatCalendarPanel';
import { MessageCache } from '../../utils/MessageCacheService';
import PremiumRequiredModal from '../modals/PremiumRequiredModal';

const API_URL = import.meta.env.VITE_API_URL;
const MESSAGE_PAGE_LIMIT = 30;

const getImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) {
        return url;
    }
    return `${API_URL}/${url}`;
};

const formatLastSeen = (dateString) => {
    if (!dateString) return "Был(а) недавно";
    const date = new Date(dateString);
    const now = new Date();
    const diffSeconds = (now.getTime() - date.getTime()) / 1000;

    if (diffSeconds < 60) return "Был(а) только что";
    if (diffSeconds < 3600) return `Был(а) ${Math.round(diffSeconds / 60)}м назад`;
    if (diffSeconds < 86400) return `Был(а) ~${Math.round(diffSeconds / 3600)}ч назад`;

    if (date.getFullYear() === now.getFullYear()) {
        return `Был(а) ${format(date, 'd MMM в HH:mm', { locale: ru })}`;
    }
    return `Был(а) ${format(date, 'd MMM yyyy в HH:mm', { locale: ru })}`;
};


const getContrastingTextColor = (hexColor) => {
    if (!hexColor || hexColor.length < 7) return '#111827'; 

    let cleanHex = hexColor.startsWith('#') ? hexColor.slice(1) : hexColor;
    if (cleanHex.length === 8) {
        cleanHex = cleanHex.slice(0, 6);
    }
    if (cleanHex.length === 3) {
        cleanHex = cleanHex.split('').map(char => char + char).join('');
    }

    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);

    const luminance = (0.299 * r + 0.587 * g + 0.114 * b);
    return luminance > 128 ? '#111827' : '#FFFFFF';
};

const ConversationWindow = ({ conversation, onDeselectConversation, onDeleteRequest }) => {
    const [internalConversation, setInternalConversation] = useState(conversation);

    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [replyingTo, setReplyingTo] = useState(null);
    const [typingUsers, setTypingUsers] = useState({});
    const [isMenuOpen, setMenuOpen] = useState(false);
    const [editingMessage, setEditingMessage] = useState(null);
    const [openMenuId, setOpenMenuId] = useState(null);

    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedMessages, setSelectedMessages] = useState([]);
    const [isForwarding, setIsForwarding] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [attachmentFile, setAttachmentFile] = useState(null);
    const [highlightedMessageId, setHighlightedMessageId] = useState(null);
    const [processingUnblock, setProcessingUnblock] = useState(false);

    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [currentResultIndex, setCurrentResultIndex] = useState(-1);

    const [unreadSeparatorIndex, setUnreadSeparatorIndex] = useState(-1);
    const [showDateIndicator, setShowDateIndicator] = useState(false);
    const [currentIndicatorDate, setCurrentIndicatorDate] = useState(null);
    const unreadPositionFoundRef = useRef(false);
    const initialLoadHandledRef = useRef(false);
    const dateIndicatorTimeoutRef = useRef(null);
    const unreadSeparatorTimeoutRef = useRef(null);
    
    const { userStatuses, setActiveConversationId } = useWebSocket();
    const { showConfirmation } = useModal();
    const { currentUser, refetchUser } = useUser();
    const messagesEndRef = useRef(null);
    const scrollContainerRef = useRef(null);
    const menuRef = useRef(null);
    const loaderTriggerRef = useRef(null);

    const throttleRef = useRef(false);
    const interlocutor = internalConversation.interlocutor;
    const currentUserId = currentUser?._id;

    const [isStatsPanelOpen, setIsStatsPanelOpen] = useState(false);
    const [isAttachmentsPanelOpen, setIsAttachmentsPanelOpen] = useState(false);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [messageDates, setMessageDates] = useState([]);
    const [loadingDates, setLoadingDates] = useState(false);

    const [conversationStats, setConversationStats] = useState(null);
    const [attachments, setAttachments] = useState([]);
    const [loadingStats, setLoadingStats] = useState(false);
    const [loadingAttachments, setLoadingAttachments] = useState(false);
    const [attachmentsPage, setAttachmentsPage] = useState(1);
    const [hasMoreAttachments, setHasMoreAttachments] = useState(true);
    const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
    const [imageViewerStartIndex, setImageViewerStartIndex] = useState(0);
    const [currentWallpaper, setCurrentWallpaper] = useState(null);
    const [isWallpaperModalOpen, setIsWallpaperModalOpen] = useState(false);
    const [wallpaperCssVars, setWallpaperCssVars] = useState({});
    const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
    const [showScrollToBottom, setShowScrollToBottom] = useState(false);
    
    const activeConversationRef = useRef(conversation);
    useEffect(() => {
        activeConversationRef.current = conversation;
    }, [conversation]);

    const refetchConversationDetails = useCallback(async () => {
        if (!internalConversation?._id) return;
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/api/messages/conversations/${internalConversation._id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setInternalConversation(res.data); 
        } catch (error) {
            console.error("Не удалось обновить данные диалога", error);
            toast.error("Не удалось обновить данные чата.");
        }
    }, [internalConversation?._id]);
    
    useEffect(() => {
        const handleUserDataUpdated = (event) => {
            const updatedUserId = event.detail.userId;
            if (internalConversation?.interlocutor?._id === updatedUserId) {
                refetchConversationDetails();
            }
        };

        window.addEventListener('userDataUpdated', handleUserDataUpdated);
        return () => {
            window.removeEventListener('userDataUpdated', handleUserDataUpdated);
        };
    }, [internalConversation, refetchConversationDetails]);
    
    useEffect(() => {
        setInternalConversation(conversation);
    }, [conversation]);

    const [appTheme, setAppTheme] = useState(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    useEffect(() => {
        const updateTheme = () => {
            const newTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
            setAppTheme(newTheme);
        };
        
        const observer = new MutationObserver((mutationsList) => {
            for (const mutation of mutationsList) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    updateTheme();
                    break;
                }
            }
        });
        
        observer.observe(document.documentElement, { attributes: true });
        updateTheme();
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const existingStyle = document.getElementById('wallpaper-style');
        if (existingStyle) existingStyle.remove();

        let cssVars = {};
        if (appTheme === 'light') {
            cssVars = {
                '--chat-header-color': 'rgba(241, 245, 249, 0.5)',
                '--chat-header-text-color': '#1e293b',
                '--chat-bubble-own-color': '#dcf8c6',
                '--chat-bubble-other-color': '#e5e7eb',
                '--chat-text-color': '#475569',
                '--chat-bubble-own-text-color': '#111827',
                '--chat-bubble-other-text-color': '#111827',
            };
        } else { // dark theme
             cssVars = {
                 '--chat-header-color': 'rgba(30, 41, 59, 0.3)',
                 '--chat-header-text-color': '#FFFFFF',
                 '--chat-bubble-own-color': '#2b5278',
                 '--chat-bubble-other-color': '#334155',
                 '--chat-text-color': '#FFFFFF',
                 '--chat-bubble-own-text-color': '#FFFFFF',
                 '--chat-bubble-other-text-color': '#FFFFFF',
             };
        }

        const userWallpaper = internalConversation?.wallpaper?.[currentUserId];

        if (userWallpaper) {
            if (userWallpaper.type === 'template') {
                try {
                    const { url, blur } = JSON.parse(userWallpaper.value);
                    const styleTag = document.createElement('style');
                    styleTag.id = 'wallpaper-style';
                    styleTag.innerHTML = `
                        .chat-wallpaper-pseudo::before {
                            content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0;
                            background-image: url(${url}); background-size: cover; background-position: center;
                            filter: blur(${blur || 0}px); z-index: -2;
                        }`;
                    document.head.appendChild(styleTag);
                } catch (e) {
                    document.body.style.setProperty('--chat-bg-image', `url(${userWallpaper.value})`);
                }
            } else if (userWallpaper.type === 'color' || userWallpaper.type === 'custom') {
                try {
                    const colors = JSON.parse(userWallpaper.value);
                    cssVars = {
                        ...cssVars,
                        '--chat-header-text-color': getContrastingTextColor(colors.header),
                        '--chat-bubble-own-text-color': colors.myBubbleText || '#ffffff',
                        '--chat-bubble-other-text-color': colors.theirBubbleText || '#111827',
                        '--chat-bg-color': colors.background || 'transparent',
                        '--chat-header-color': colors.header || 'transparent',
                        '--chat-bubble-own-color': colors.myBubble || '#3b82f6',
                        '--chat-bubble-other-color': colors.theirBubble || '#e5e7eb',
                        '--chat-text-color': colors.text || 'inherit',
                    };
                } catch (e) {
                    console.error("Failed to parse wallpaper colors", e);
                }
            }
            setCurrentWallpaper(userWallpaper);       
        }
        else {
            setCurrentWallpaper(null);
            }
        setWallpaperCssVars(cssVars);
    }, [internalConversation, currentUserId, appTheme]);

     const chatImageUrls = useMemo(() => {
        return messages
            .filter(msg => msg.imageUrl)
            .map(msg => getImageUrl(msg.imageUrl));
    }, [messages]);

    const handleImageClickInBubble = (clickedImageUrl) => {
        const fullClickedUrl = getImageUrl(clickedImageUrl);
        const index = chatImageUrls.findIndex(url => url === fullClickedUrl);
        if (index !== -1) {
            setImageViewerStartIndex(index);
            setIsImageViewerOpen(true);
        }
    };

    const visiblePinnedMessages = useMemo(() => {
        if (!internalConversation?.pinnedMessages || messages.length === 0) {
            return [];
        }
        const visibleMessageIds = new Set(messages.map(msg => msg._id));
        return internalConversation.pinnedMessages.filter(pinnedMsg => visibleMessageIds.has(pinnedMsg._id));
    }, [internalConversation?.pinnedMessages, messages]);

    const liveInterlocutor = useMemo(() => ({
        ...interlocutor,
        ...(userStatuses[interlocutor?._id] || {})
    }), [interlocutor, userStatuses]);

    const isPremium = liveInterlocutor?.premium?.isActive;
    const usernameEmoji = liveInterlocutor?.premiumCustomization?.usernameEmoji;
    
    const isBlockedByThem = liveInterlocutor?.isBlockedByThem;
    const isBlockingThem = currentUser?.blacklist?.includes(liveInterlocutor?._id);
    const isAnyBlockActive = isBlockingThem || isBlockedByThem;

    const canSendMessage = useMemo(() => {
        if (internalConversation.isSavedMessages) return true;
        if (isBlockingThem || isBlockedByThem) return false;
        const privacySource = liveInterlocutor?.privacySettings;
        if (!privacySource) return true;
        const privacySetting = privacySource.messageMe || 'everyone';
        const friendshipStatus = internalConversation?.friendshipStatus;
        if (privacySetting === 'everyone') return true;
        if (privacySetting === 'private') return false;
        if (privacySetting === 'friends') return friendshipStatus === 'friend';
        return false;
    }, [isBlockingThem, isBlockedByThem, liveInterlocutor, internalConversation]);

    const fetchStats = async () => {
        if (!internalConversation?._id) return;
        setLoadingStats(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/api/messages/conversations/${internalConversation._id}/stats`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setConversationStats(res.data);
        } catch (error) {
            toast.error("Не удалось загрузить статистику.");
        } finally {
            setLoadingStats(false);
        }
    };

    const fetchAttachments = useCallback(async (page) => {
        if (!internalConversation?._id || (page > 1 && !hasMoreAttachments)) return;
        setLoadingAttachments(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/api/messages/conversations/${internalConversation._id}/attachments?page=${page}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAttachments(prev => page === 1 ? res.data.attachments : [...prev, ...res.data.attachments]);
            setHasMoreAttachments(res.data.hasMore);
            setAttachmentsPage(page);
        } catch (error) {
            toast.error("Не удалось загрузить вложения.");
        } finally {
            setLoadingAttachments(false);
        }
    }, [internalConversation?._id, hasMoreAttachments]);

    const handleShowStats = () => {
        setIsStatsPanelOpen(true);
        setIsAttachmentsPanelOpen(false);
        setIsCalendarOpen(false);
        setMenuOpen(false);
        fetchStats();
    };

    const handleShowAttachments = () => {
        setIsAttachmentsPanelOpen(true);
        setIsStatsPanelOpen(false);
        setIsCalendarOpen(false);
        setMenuOpen(false);
        setAttachmentsPage(1);
        setHasMoreAttachments(true);
        setAttachments([]);
        fetchAttachments(1);
    };
    
    const handleOpenImageViewer = (index) => {
        setImageViewerStartIndex(index);
        setIsImageViewerOpen(true);
    };

    const handleTogglePinMessage = async (messageId) => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_URL}/api/messages/conversations/${internalConversation._id}/pin/${messageId}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(res.data.message);
        } catch (error) {
            toast.error("Не удалось изменить статус закрепленного сообщения.");
        }
    };
    
    useEffect(() => {
        if (internalConversation?._id) {
            setActiveConversationId(internalConversation._id);
        }
        
        return () => {
            setActiveConversationId(null);
        };
    }, [internalConversation?._id, setActiveConversationId]);

    const fetchMessages = useCallback(async (pageNum, isBackgroundSync = false) => {
        if (!internalConversation?._id) {
            setLoading(false);
            setMessages([]);
            setHasMore(false);
            return;
        }
        
        if (isBackgroundSync) {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get(`${API_URL}/api/messages/conversations/${internalConversation._id}/messages?page=1&limit=${MESSAGE_PAGE_LIMIT}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const newMessages = res.data;
                setMessages(prevMessages => {
                    if (newMessages.length > 0) {
                        const allMessages = [...prevMessages, ...newMessages.filter(nm => !prevMessages.some(m => m._id === nm._id))];
                        allMessages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                        MessageCache.saveMessages(internalConversation._id, allMessages);
                        return allMessages;
                    }
                    return prevMessages;
                });
            } catch (error) { console.error("Background sync failed", error); }
            return;
        }
 
        if (pageNum > 1) {
            setLoadingMore(true);
        } else {
            setLoading(true);
        }

        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/api/messages/conversations/${internalConversation._id}/messages?page=${pageNum}&limit=${MESSAGE_PAGE_LIMIT}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const scrollContainer = scrollContainerRef.current;
            const oldScrollHeight = scrollContainer ? scrollContainer.scrollHeight : 0;
            const oldScrollTop = scrollContainer ? scrollContainer.scrollTop : 0;            
 
            const newMessages = res.data.reverse();
            setMessages(prevMessages => {
                const combined = pageNum === 1 ? newMessages : [...newMessages, ...prevMessages];
                MessageCache.saveMessages(internalConversation._id, combined);
                return combined;
            });

            setHasMore(res.data.length === MESSAGE_PAGE_LIMIT);
            setPage(pageNum);

            if (pageNum > 1 && scrollContainer) {
                requestAnimationFrame(() => {
                    scrollContainer.scrollTop = scrollContainer.scrollHeight - oldScrollHeight + oldScrollTop;
                });
            }

        } catch (error) {
            console.error("Failed to fetch messages", error);
            toast.error("Не удалось загрузить сообщения.");
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [internalConversation?._id]);

    const handleScrollToDate = useCallback(async (date) => {
        setIsCalendarOpen(false);
        const dateString = date.toISOString().split('T')[0];
        
        const firstMessageOnDate = messages.find(m => m.createdAt.startsWith(dateString));

        if (firstMessageOnDate) {
            const element = document.getElementById(`message-${firstMessageOnDate._id}`);
            element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            const toastId = toast.loading('Загрузка истории чата...');
            try {
                const token = localStorage.getItem('token');
                
                const contextRes = await axios.get(`${API_URL}/api/messages/conversations/${internalConversation._id}/messages-by-date?date=${dateString}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                const targetPage = contextRes.data.page;
                const hasOlderMessages = contextRes.data.hasMore;

                const pagePromises = [];
                for (let i = 1; i <= targetPage; i++) {
                    pagePromises.push(
                        axios.get(`${API_URL}/api/messages/conversations/${internalConversation._id}/messages?page=${i}&limit=${MESSAGE_PAGE_LIMIT}`, {
                            headers: { Authorization: `Bearer ${token}` }
                        })
                    );
                }
                
                const pageResults = await Promise.all(pagePromises);
                
                const allMessages = pageResults.flatMap(res => res.data);

                setMessages(allMessages);
                setPage(targetPage);
                setHasMore(hasOlderMessages);
                
                setTimeout(() => {
                    const firstMessageOnTargetDate = allMessages.find(m => m.createdAt.startsWith(dateString));
                    if (firstMessageOnTargetDate) {
                        const element = document.getElementById(`message-${firstMessageOnTargetDate._id}`);
                        element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }, 100);

                toast.dismiss(toastId);
            } catch (error) {
                toast.error(error.response?.data?.message || 'Не удалось найти сообщения за эту дату.', { id: toastId });
            }
        }
    }, [messages, internalConversation]);

    const handleScrollToMessage = useCallback(async (messageId) => {
        const isAlreadyLoaded = messages.some(msg => msg._id === messageId);
        
        if (isAlreadyLoaded) {
            setHighlightedMessageId(messageId);
        } else {
            const toastId = toast.loading('Сообщение не в текущей истории, загружаем...');
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get(`${API_URL}/api/messages/${messageId}/context`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                
                setMessages(res.data.messages);
                setPage(res.data.page);
                setHasMore(res.data.hasMore);
                
                setHighlightedMessageId(res.data.highlightId); 

                toast.dismiss(toastId);
            } catch (error) {
                toast.error(error.response?.data?.message || 'Не удалось найти сообщение.', { id: toastId });
            }
        }
    }, [messages]);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useLayoutEffect(() => {
        if (highlightedMessageId) {
            const element = document.getElementById(`message-${highlightedMessageId}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                const timer = setTimeout(() => {
                    setHighlightedMessageId(null);
                }, 2000);
                return () => clearTimeout(timer);
            }
        }
    }, [messages, highlightedMessageId]);

    useEffect(() => {
        const loadInitialMessages = async () => {
            if (!internalConversation?._id) return;
            
            setLoading(true);
            
            const cachedMessages = await MessageCache.getMessages(internalConversation._id);
            if (cachedMessages) {
                setMessages(cachedMessages);
                setLoading(false);
                fetchMessages(1, true); 
            } else if (internalConversation.initialMessages) {
                setMessages(internalConversation.initialMessages);
                await MessageCache.saveMessages(internalConversation._id, internalConversation.initialMessages);
                setLoading(false);
            } else {
                await fetchMessages(1);
            }
        };
        
        loadInitialMessages();
        
    }, [internalConversation?._id, internalConversation.initialMessages, fetchMessages]);

    useEffect(() => {
        if (internalConversation?._id && !loading && messages.length > 0 && (internalConversation.unreadCount > 0 || internalConversation.isMarkedAsUnread)) {
            const markAsRead = async () => {
                try {
                    const token = localStorage.getItem('token');
                    await axios.post(`${API_URL}/api/messages/read`, { conversationId: internalConversation._id }, { headers: { Authorization: `Bearer ${token}` } });
                    window.dispatchEvent(new CustomEvent('optimisticConversationRead', { detail: { conversationId: internalConversation._id } }));
                } catch (error) { console.error("Failed to mark messages as read from ConversationWindow", error); }
            };
            markAsRead();
        }
    }, [loading, messages.length, internalConversation?._id, internalConversation?.unreadCount, internalConversation?.isMarkedAsUnread]);

    useEffect(() => {
        if (unreadSeparatorTimeoutRef.current) clearTimeout(unreadSeparatorTimeoutRef.current);
        if (!initialLoadHandledRef.current && page === 1 && messages.length > 0) {
            initialLoadHandledRef.current = true; // Отмечаем, что начальная загрузка обработана
            const firstUnreadIndex = messages.findIndex(msg => msg.type !== 'system' && msg.sender?._id !== currentUserId && !msg.readBy.includes(currentUserId));
            if (firstUnreadIndex !== -1) {
                setUnreadSeparatorIndex(firstUnreadIndex);
                unreadPositionFoundRef.current = true;
                setTimeout(() => {
                    const element = document.getElementById(`message-${messages[firstUnreadIndex]._id}`);
                    element?.scrollIntoView({ behavior: 'auto', block: 'center' });
                }, 300);
                unreadSeparatorTimeoutRef.current = setTimeout(() => { setUnreadSeparatorIndex(-1); }, 8000);
            } else {
                // Если нет непрочитанных сообщений, просто прокручиваем в самый низ
                setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'auto' }), 100);
            }
        }
        return () => { if (unreadSeparatorTimeoutRef.current) clearTimeout(unreadSeparatorTimeoutRef.current); };
    }, [messages, page, currentUserId]);

    useEffect(() => {
        const observer = new IntersectionObserver( (entries) => {
                if (entries[0].isIntersecting && hasMore && !loadingMore && !loading && internalConversation?._id) {
                    fetchMessages(page + 1, false);
                }
            }, { root: scrollContainerRef.current, threshold: 0.5 }
        );
        const currentLoaderRef = loaderTriggerRef.current;
        if (currentLoaderRef) observer.observe(currentLoaderRef);
        return () => { if (currentLoaderRef) observer.unobserve(currentLoaderRef); };
    }, [hasMore, loadingMore, loading, page, fetchMessages, internalConversation?._id]);

    useEffect(() => {
        const handleNewMessage = (e) => {
            const newMessage = e.detail;
            const currentConv = activeConversationRef.current; // Используем ref, чтобы избежать stale state

            const scrollContainer = scrollContainerRef.current;
            const isScrolledToBottom = scrollContainer 
                ? scrollContainer.scrollHeight - scrollContainer.clientHeight <= scrollContainer.scrollTop + 150 // Порог в 150px
                : true;

            const isForThisConversation = 
                (currentConv?._id && newMessage.conversation === currentConv._id) ||
                (currentConv?.isNew && newMessage.conversationParticipants &&
                 newMessage.conversationParticipants.includes(currentUserId) && 
                 newMessage.conversationParticipants.includes(currentConv.interlocutor._id));

            if (isForThisConversation) {
                setMessages(prev => {
                    const existingIndex = prev.findIndex(m => m.uuid === newMessage.uuid);
                    if (existingIndex > -1) {
                        const newMessages = [...prev];
                        newMessages[existingIndex] = newMessage;
                        return newMessages;
                    }
                    return [...prev, newMessage];
                });

                // Прокручиваем вниз, только если пользователь уже был внизу
                if (isScrolledToBottom) {
                    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
                }
            }
        };
        
        const handleMessageUpdate = (e) => { if(e.detail.conversationId === internalConversation?._id) setMessages(prev => prev.map(m => m.uuid === e.detail.uuid ? {...m, ...e.detail.updates} : m)); };
        const handleMessagesRead = (e) => { if (e.detail.conversationId === internalConversation?._id) { const readerId = e.detail.readerId; setMessages(prevMessages => prevMessages.map(msg => { const isAlreadyRead = msg.readBy && msg.readBy.includes(readerId); if (isAlreadyRead) return msg; const newReadBy = [...(msg.readBy || []), readerId]; return { ...msg, readBy: newReadBy }; })); }};
        const handleTyping = (e) => { if (e.detail.conversationId === internalConversation?._id) setTypingUsers(prev => ({ ...prev, [e.detail.userId]: e.detail.isTyping })); };
        const handleMessagesDeleted = e => {
            const { conversationId, messageUuids, messageIds, forEveryone, deletedBy, newLastMessage } = e.detail;
            if (conversationId === activeConversationRef.current?._id) {
                setMessages(prev => {
                    let newMessages;
                    if (forEveryone) {
                        newMessages = prev.filter(m => !messageUuids.includes(m.uuid));
                    } else if (deletedBy === currentUserId) {
                        newMessages = prev.filter(m => !messageIds.includes(m._id));
                    }
                    else {
                        newMessages = prev;
                    }
                    MessageCache.saveMessages(conversationId, newMessages); // Обновляем кеш
                    return newMessages;
                });
                if (newLastMessage) {
                    setInternalConversation(prev => ({ ...prev, lastMessage: newLastMessage }));
                }
            }
        };
        const handleHistoryCleared = (e) => { 
            if (e.detail.conversationId === activeConversationRef.current?._id && e.detail.clearedBy === currentUserId) {
                setMessages([]);
                MessageCache.saveMessages(e.detail.conversationId, []); // Очищаем кеш
            } 
        };
        
        window.addEventListener('newMessage', handleNewMessage);
        window.addEventListener('messageUpdated', handleMessageUpdate);
        window.addEventListener('messagesRead', handleMessagesRead);
        window.addEventListener('typing', handleTyping);
        window.addEventListener('messagesDeleted', handleMessagesDeleted);
        window.addEventListener('historyCleared', handleHistoryCleared);

        return () => {
            window.removeEventListener('newMessage', handleNewMessage);
            window.removeEventListener('messageUpdated', handleMessageUpdate);
            window.removeEventListener('messagesRead', handleMessagesRead);
            window.removeEventListener('typing', handleTyping);
            window.removeEventListener('messagesDeleted', handleMessagesDeleted);
            window.removeEventListener('historyCleared', handleHistoryCleared);
        };
    }, [currentUserId]);

    useEffect(() => {
        const handleClickOutside = (event) => { if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false); };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleUnblock = async () => {
        setProcessingUnblock(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/api/user/unblacklist/${liveInterlocutor._id}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Пользователь разблокирован');
            refetchUser();
        } catch (error) {
            toast.error('Не удалось разблокировать пользователя');
        } finally {
            setProcessingUnblock(false);
        }
    };

    const handleMessageSent = () => {
        if (unreadSeparatorTimeoutRef.current) clearTimeout(unreadSeparatorTimeoutRef.current);
        setUnreadSeparatorIndex(-1);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        window.dispatchEvent(new CustomEvent('conversationUpdated', { detail: { conversationId: internalConversation._id } }));
    };

    const handleOptimisticSend = (optimisticMessage) => {
        setMessages(prev => [...prev, optimisticMessage]);
        handleMessageSent();
    };

    const handleSendFail = (failedUuid) => {
        setMessages(prev => prev.map(msg => 
            msg.uuid === failedUuid 
                ? { ...msg, isSending: false, isFailed: true } 
                : msg
        ));
    };

    const handleReact = async (messageId, emoji) => {
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/api/messages/${messageId}/react`, { emoji }, { headers: { Authorization: `Bearer ${token}` } });
        } catch (error) {
            toast.error(error.response?.data?.message || "Ошибка реакции");
        }
    };

    const performDelete = async (messageIds, forEveryone) => {
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}/api/messages`, {
                headers: { Authorization: `Bearer ${token}` },
                data: { messageIds, forEveryone }
            });
            toast.success('Сообщения удалены.');
            if (forEveryone === false) {
                setMessages(prev => prev.filter(m => !messageIds.includes(m._id)));
            }
            if (selectionMode) {
                setSelectionMode(false);
                setSelectedMessages([]);
            }
        } catch (error) {
            toast.error("Ошибка удаления");
        }
    };

    const handleAttachmentSave = async (imageBlob, caption, attachedTrack) => {
        const toastId = toast.loading('Отправка сообщения...');
        try {
            const formData = new FormData();
            formData.append('image', imageBlob, attachmentFile.name);
            formData.append('text', caption);
            formData.append('recipientId', liveInterlocutor._id);
            formData.append('attachedTrackId', attachedTrack ? attachedTrack._id : null); 
            if (internalConversation?._id) {
                formData.append('conversationId', internalConversation._id);
            }

            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/api/messages`, formData, {
                headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` }
            });

            toast.success('Сообщение отправлено!', { id: toastId });
            handleMessageSent();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Ошибка отправки', { id: toastId });
            throw error;
        }
    };

    const handleDeleteMessages = (messageIds) => {
        const allAreOwn = messageIds.every(id => {
            const msg = messages.find(m => m._id === id);
            return msg && msg.sender._id === currentUserId;
        });

        showConfirmation({
            title: `Удалить ${messageIds.length} сообщен(ие/ия)?`,
            message: "Как вы хотите удалить эти сообщения? Это действие нельзя отменить.",
            buttons: [
                { label: 'Отмена', onClick: () => {}, className: "rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/20 transition-colors" },
                { label: 'Удалить у себя', onClick: () => performDelete(messageIds, false), className: "rounded-lg bg-red-500 hover:bg-red-600 font-semibold text-white transition-colors" },
                ...(allAreOwn && !isAnyBlockActive ? [{ label: 'Удалить у всех', onClick: () => performDelete(messageIds, true), className: "rounded-lg bg-red-600 hover:bg-red-700 font-semibold text-white transition-colors" }] : [])
            ].reverse()
        });
    };

    const handleForwardRequest = (messageId) => {
        setSelectedMessages([messageId]);
        setIsForwarding(true);
        setSelectionMode(false);
    };

    const handleSelectMessage = (messageId) => {
        setSelectedMessages(prev => prev.includes(messageId) ? prev.filter(id => id !== messageId) : [...prev, messageId]);
    };

    const handleEditMessage = async (messageId, newText) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${API_URL}/api/messages/${messageId}`, { text: newText }, { headers: { Authorization: `Bearer ${token}` } });
            toast.success("Сообщение изменено");
            setEditingMessage(null);
        } catch (error) { toast.error("Ошибка при изменении сообщения"); }
    };

    const handleToggleMenu = (messageId) => {
        setOpenMenuId(prevId => (prevId === messageId ? null : messageId));
    };

    const isInterlocutorTyping = Object.values(typingUsers).some(Boolean);

    const getStatusText = useCallback(() => {
        if (currentUser?.privacySettings?.viewOnlineStatus === 'private') {
            return 'Недавно';
        }

        if (!liveInterlocutor) return "Недоступно";
        if (isBlockedByThem || isBlockingThem) return "Был(а) очень давно";
        if (isInterlocutorTyping) return <span className="text-green-500 animate-pulse">Печатает...</span>;
        const privacySource = liveInterlocutor?.privacySettings;
        const privacySetting = privacySource?.viewOnlineStatus || 'everyone';
        const friendshipStatus = internalConversation?.friendshipStatus;
        const canSeeDetailedStatus = (privacySetting === 'everyone') || (privacySetting === 'friends' && friendshipStatus === 'friend');
        if (liveInterlocutor?.isOnline && canSeeDetailedStatus) return "Онлайн";
        if (canSeeDetailedStatus) {
            const lastSeenTime = liveInterlocutor.lastSeen;
            if (lastSeenTime) return formatLastSeen(lastSeenTime);
        }
        return "Недавно";
    }, [liveInterlocutor, isBlockedByThem, isBlockingThem, isInterlocutorTyping, internalConversation, currentUser]);

    const canShowOnlineIndicator = useCallback(() => {
        if (currentUser?.privacySettings?.viewOnlineStatus === 'private') {
            return false;
        }

        if (!liveInterlocutor || isBlockedByThem || isBlockingThem || !liveInterlocutor.isOnline) return false;
        const privacySource = liveInterlocutor.privacySettings;
        const privacySetting = privacySource?.viewOnlineStatus || 'everyone';
        const friendshipStatus = internalConversation?.friendshipStatus;
        return privacySetting === 'everyone' || (privacySetting === 'friends' && friendshipStatus === 'friend');
    }, [liveInterlocutor, isBlockedByThem, isBlockingThem, internalConversation, currentUser]);

    const canShowAvatar = useMemo(() => {
        if (isBlockedByThem) return false;
        const privacySource = liveInterlocutor?.privacySettings;
        if (!privacySource) return true;
        const privacySetting = privacySource.viewAvatar || 'everyone';
        const friendshipStatus = internalConversation?.friendshipStatus;
        if (privacySetting === 'everyone') return true;
        if (privacySetting === 'private') return false;
        if (privacySetting === 'friends') return friendshipStatus === 'friend';
        return false;
    }, [isBlockedByThem, liveInterlocutor, internalConversation]);

    const performSearch = useCallback(async (query) => {
        if (!query.trim() || !internalConversation?._id) {
            setSearchResults([]);
            setCurrentResultIndex(-1);
            return;
        }
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/api/messages/conversations/${internalConversation._id}/search?q=${query}`, { headers: { Authorization: `Bearer ${token}` } });
            setSearchResults(res.data);
            if (res.data.length > 0) {
                setCurrentResultIndex(0);
            } else {
                toast.error('Ничего не найдено');
                setCurrentResultIndex(-1);
            }
        } catch (error) { toast.error('Ошибка поиска'); }
    }, [internalConversation?._id]);

    useEffect(() => {
        if (searchResults.length > 0 && currentResultIndex >= 0) {
            handleScrollToMessage(searchResults[currentResultIndex]);
        }
    }, [searchResults, currentResultIndex, handleScrollToMessage]);
    
    useEffect(() => {
        const debouncer = setTimeout(() => { if(isSearching) performSearch(searchQuery); }, 300);
        return () => clearTimeout(debouncer);
    }, [searchQuery, performSearch, isSearching]);

    const navigateSearchResults = (direction) => {
        if (searchResults.length === 0) return;
        const newIndex = (currentResultIndex - direction + searchResults.length) % searchResults.length;
        setCurrentResultIndex(newIndex);
        handleScrollToMessage(searchResults[newIndex]);
    };

    const handleDeleteChat = () => {
        if (!internalConversation?._id) return;
        setMenuOpen(false);
        onDeleteRequest(internalConversation._id, false);
    };

    const handleToggleBlock = () => {
        setMenuOpen(false);
        const action = isBlockingThem ? 'unblock' : 'block';
        const confirmationDetails = {
            block: { title: `Заблокировать ${liveInterlocutor.username}?`, message: "Вы больше не сможете отправлять сообщения или звонить этому пользователю. Он не будет уведомлен.", successMessage: "Пользователь заблокирован.", errorMessage: "Не удалось заблокировать пользователя." },
            unblock: { title: `Разблокировать ${liveInterlocutor.username}?`, message: "Вы снова сможете отправлять сообщения и видеть обновления.", successMessage: "Пользователь разблокирован.", errorMessage: "Не удалось разблокировать пользователя." }
        };

        showConfirmation({
            title: confirmationDetails[action].title,
            message: confirmationDetails[action].message,
            onConfirm: async () => {
                const toastId = toast.loading(action === 'block' ? 'Блокировка...' : 'Разблокировка...');
                try {
                    const token = localStorage.getItem('token');
                    const url = `${API_URL}/api/user/${action === 'block' ? 'blacklist' : 'unblacklist'}/${liveInterlocutor._id}`;
                    await axios.post(url, {}, { headers: { Authorization: `Bearer ${token}` } });
                    toast.success(confirmationDetails[action].successMessage, { id: toastId });
                    refetchUser();
                } catch (error) { toast.error(confirmationDetails[action].errorMessage, { id: toastId }); }
            }
        });
    };

    const handleScroll = (e) => {
        if (throttleRef.current) return;
        throttleRef.current = true;
        setTimeout(() => { throttleRef.current = false; }, 100);

        setOpenMenuId(null);
        const container = e.currentTarget;
        const threshold = 200;
        const isScrolledUp = container.scrollHeight - container.scrollTop - container.clientHeight > threshold;
        setShowScrollToBottom(isScrolledUp);

        if (dateIndicatorTimeoutRef.current) clearTimeout(dateIndicatorTimeoutRef.current);
        dateIndicatorTimeoutRef.current = setTimeout(() => setShowDateIndicator(false), 1500);
        const dateSeparators = container.querySelectorAll('[data-date-separator]');
        let topVisibleDateKey = null;
        for (const separator of dateSeparators) {
            if (separator.getBoundingClientRect().top <= container.getBoundingClientRect().top) {
                topVisibleDateKey = separator.dataset.dateSeparator;
            } else { break; }
        }
        if (topVisibleDateKey) {
            setCurrentIndicatorDate(topVisibleDateKey);
            setShowDateIndicator(true);
        }
    };

    const groupedMessages = useMemo(() => {
        const groups = {};
        messages.forEach(msg => {
            const date = new Date(msg.createdAt).toDateString();
            if (!groups[date]) { groups[date] = []; }
            groups[date].push(msg);
        });
        return Object.entries(groups).sort((a, b) => new Date(a[0]) - new Date(b[0]));
    }, [messages]);

    const handleDateClick = (dateString) => {
        const dateToScrollTo = dateString || currentIndicatorDate;
        if (!dateToScrollTo || !scrollContainerRef.current) return;
        const targetDatePart = dateToScrollTo.split('T')[0];
        const firstMessageOfDate = scrollContainerRef.current.querySelector(`[data-date^="${targetDatePart}"]`);
        if (firstMessageOfDate) {
            firstMessageOfDate.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    const fetchMessageDates = useCallback(async () => {
        if (!internalConversation?._id || messageDates.length > 0) return;
        setLoadingDates(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/api/messages/conversations/${internalConversation._id}/message-dates`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMessageDates(res.data);
        } catch (error) {
            toast.error("Не удалось загрузить даты сообщений.");
        } finally {
            setLoadingDates(false);
        }
    }, [internalConversation?._id, messageDates]);

    const handleCalendarToggle = () => {
        setIsCalendarOpen(prev => !prev);
        setIsAttachmentsPanelOpen(false);
        setIsStatsPanelOpen(false);
        if (!isCalendarOpen) {
            fetchMessageDates();
        }
    };
    
    const handleWallpaperClick = () => {
        setMenuOpen(false);
        if (currentUser?.premium?.isActive) {
            setIsWallpaperModalOpen(true);
        } else {
            setIsPremiumModalOpen(true);
        }
    };

    return (
        <div className="flex flex-col h-full relative overflow-hidden" style={wallpaperCssVars}>
            <div className="absolute inset-0 bg-slate-50 dark:bg-slate-900 -z-20"></div>
            <ImageAttachmentModal isOpen={!!attachmentFile} onClose={() => setAttachmentFile(null)} file={attachmentFile} onSave={handleAttachmentSave} showCaptionInput={true} />
            {isForwarding && <ForwardModal messageIds={selectedMessages} onClose={() => { setIsForwarding(false); setSelectionMode(false); setSelectedMessages([]); }} />}
            <WallpaperModal 
                isOpen={isWallpaperModalOpen}
                onClose={() => setIsWallpaperModalOpen(false)}
                currentWallpaper={currentWallpaper}
                conversationId={internalConversation?._id}
            />
            <PremiumRequiredModal
                isOpen={isPremiumModalOpen}
                onClose={() => setIsPremiumModalOpen(false)}
            />
            <div className="flex-shrink-0 z-10">
                <header className="flex items-center justify-between p-3 border-b border-slate-200/50 dark:border-slate-700/50" style={{ backgroundColor: 'var(--chat-header-color, transparent)', color: 'var(--chat-header-text-color, inherit)' }}>
                    {internalConversation.isSavedMessages ? (
                        <>
                            <div className="flex items-center space-x-2">
                                <button onClick={onDeselectConversation} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-[color:var(--chat-header-text-color,inherit)]"><CornerUpLeft size={20} /></button>
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                                        <Bookmark size={20} className="text-white" fill="white"/>
                                    </div>
                                    <div>
                                        <h2 className="font-bold" style={{ color: 'var(--chat-header-text-color, inherit)' }}>Избранное</h2>
                                        <p className="text-xs h-4" style={{ color: 'var(--chat-header-text-color, inherit)', opacity: 0.7 }}>Ваши личные заметки</p>
                                    </div>
                                </div>
                            </div>
                            <div ref={menuRef} className="relative">
                                <div className="flex items-center space-x-1">
                                    <button onClick={handleCalendarToggle} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-[color:var(--chat-header-text-color,inherit)]"><Calendar /></button>
                                    <button onClick={() => setIsSearching(s => !s)} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-[color:var(--chat-header-text-color,inherit)]"><Search /></button>
                                    <button onClick={() => setMenuOpen(!isMenuOpen)} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-[color:var(--chat-header-text-color,inherit)]"><MoreVertical /></button>
                                </div>
                                {isMenuOpen && (
                                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-xl ring-1 ring-black/5 p-1 z-20">
                                        <button onClick={() => { setSelectionMode(true); setMenuOpen(false); }} className="w-full text-left flex items-center space-x-2 px-3 py-1.5 text-sm rounded text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700"><Check size={16} /><span>Выбрать сообщения</span></button>
                                        <div className="my-1 h-px bg-slate-200 dark:bg-slate-700/50"></div>
                                        <button onClick={handleShowAttachments} className="w-full text-left flex items-center space-x-2 px-3 py-1.5 text-sm rounded text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700"><ImageIcon size={16} /><span>Вложения</span></button>
                                        <div className="my-1 h-px bg-slate-200 dark:bg-slate-700/50"></div>
                                        <button onClick={() => { setIsWallpaperModalOpen(true); setMenuOpen(false); }} className="w-full text-left flex items-center space-x-2 px-3 py-1.5 text-sm rounded text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700"><Paintbrush size={16} /><span>Обои</span></button>
                                        <div className="my-1 h-px bg-slate-200 dark:bg-slate-700/50"></div>
                                        <button onClick={() => onDeleteRequest(internalConversation._id, false)} className="w-full text-left flex items-center space-x-2 px-3 py-1.5 text-sm rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10">
                                            <Trash2 size={16}/><span>{internalConversation.isSavedMessages ? 'Очистить историю' : 'Удалить чат'}</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex items-center space-x-2">
                                <button onClick={onDeselectConversation} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-[color:var(--chat-header-text-color,inherit)]"><CornerUpLeft size={20} /></button>
                                <Link to={`/profile/${liveInterlocutor._id}`} className="flex items-center space-x-3 group">
                                    {(() => {
                                        const border = liveInterlocutor?.premiumCustomization?.avatarBorder;
                                        const borderClass = border?.type?.startsWith('animated') ? `premium-border-${border.type}` : '';
                                        const staticBorderStyle = border?.type === 'static' ? { padding: '4px', backgroundColor: border.value } : {};

                                        return (
                                            <div className={`relative rounded-full ${borderClass}`} style={staticBorderStyle}>
                                                <Avatar
                                                    size="md"
                                                    username={liveInterlocutor.username}
                                                    avatarUrl={canShowAvatar ? liveInterlocutor.avatar : ''}
                                                    isPremium={isPremium}
                                                    customBorder={border}
                                                />
                                                {canShowOnlineIndicator() && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-slate-800"></div>}
                                            </div>
                                        );
                                    })()}
                                    <div>
                                        {/* --- НАЧАЛО ИЗМЕНЕНИЯ 1: Добавляем адаптивные классы для текста --- */}
                                        <h2 className="font-bold group-hover:underline flex items-center text-base md:text-lg" style={{ color: 'var(--chat-header-text-color, inherit)' }}>
                                            {liveInterlocutor.fullName || liveInterlocutor.username}
                                            {usernameEmoji?.url && (
                                                <img src={usernameEmoji.url} alt="emoji" className="w-5 h-5 ml-1.5" />
                                            )}
                                        </h2>
                                        <p className="text-xs h-4" style={{ color: 'var(--chat-header-text-color, inherit)', opacity: 0.7 }}>{getStatusText()}</p>
                                        {/* --- КОНЕЦ ИЗМЕНЕНИЯ 1 --- */}
                                    </div>
                                </Link>
                            </div>
                            <div ref={menuRef} className="relative">
                                <div className="flex items-center space-x-1">
                                    <button onClick={handleCalendarToggle} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-[color:var(--chat-header-text-color,inherit)]"><Calendar /></button>
                                    <button onClick={() => setIsSearching(s => !s)} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-[color:var(--chat-header-text-color,inherit)]"><Search /></button>
                                    <button onClick={() => setMenuOpen(!isMenuOpen)} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-[color:var(--chat-header-text-color,inherit)]"><MoreVertical /></button>
                                </div>
                                {isMenuOpen && (
                                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-xl ring-1 ring-black/5 p-1 z-20">
                                        <button onClick={() => { setSelectionMode(true); setMenuOpen(false); }} className="w-full text-left flex items-center space-x-2 px-3 py-1.5 text-sm rounded text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700"><Check size={16} /><span>Выбрать сообщения</span></button>
                                        <div className="my-1 h-px bg-slate-200 dark:bg-slate-700/50"></div>
                                        <button onClick={handleShowStats} className="w-full text-left flex items-center space-x-2 px-3 py-1.5 text-sm rounded text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700"><BarChart2 size={16} /><span>Статистика</span></button>
                                        <button onClick={handleShowAttachments} className="w-full text-left flex items-center space-x-2 px-3 py-1.5 text-sm rounded text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700"><ImageIcon size={16} /><span>Вложения</span></button>
                                        <div className="my-1 h-px bg-slate-200 dark:bg-slate-700/50"></div>
                                        <button onClick={() => { setIsWallpaperModalOpen(true); setMenuOpen(false); }} className="w-full text-left flex items-center space-x-2 px-3 py-1.5 text-sm rounded text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700">
                                            <Paintbrush size={16} /><span>Обои</span>
                                        </button>
                                        <div className="my-1 h-px bg-slate-200 dark:bg-slate-700/50"></div>
                                        <button onClick={handleToggleBlock} className={`w-full text-left flex items-center space-x-2 px-3 py-1.5 text-sm rounded ${isBlockingThem ? 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-500/10' : 'text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10'}`}>
                                            {isBlockingThem ? <UserCheck size={16}/> : <ShieldOff size={16}/>}
                                            <span>{isBlockingThem ? 'Разблокировать' : 'Заблокировать'}</span>
                                        </button>
                                        <button onClick={() => onDeleteRequest(internalConversation._id, false)} className="w-full text-left flex items-center space-x-2 px-3 py-1.5 text-sm rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10">
                                            <Trash2 size={16}/><span>{internalConversation.isSavedMessages ? 'Очистить историю' : 'Удалить чат'}</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </header>
                <AnimatePresence>
                    {visiblePinnedMessages && visiblePinnedMessages.length > 0 && (
                        <PinnedMessagesCarousel
                            messages={visiblePinnedMessages}
                            onJumpToMessage={handleScrollToMessage}
                            onUnpin={handleTogglePinMessage}
                        />
                    )}
                </AnimatePresence>
                {selectionMode && (<div className="p-3 border-b border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800 flex items-center justify-between"><div className="flex items-center space-x-4"><button onClick={() => setSelectionMode(false)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"><X /></button><span className="font-semibold">{selectedMessages.length} выбрано</span></div><div className="flex items-center space-x-2"><button onClick={() => handleDeleteMessages(selectedMessages)} disabled={selectedMessages.length === 0} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-red-500 disabled:opacity-50" title="Удалить"><Trash2 /></button><button onClick={() => setIsForwarding(true)} disabled={selectedMessages.length === 0} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-blue-500 disabled:opacity-50" title="Переслать"><ChevronsRight /></button></div></div>)}
                {isSearching && (<div className="p-2 border-b border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800 flex items-center justify-between gap-2"><input type="text" placeholder="Поиск по сообщениям..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="flex-grow bg-slate-100 dark:bg-slate-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" autoFocus/>{searchResults.length > 0 && (<div className="flex items-center text-sm text-slate-500"><span>{currentResultIndex + 1} из {searchResults.length}</span><button onClick={() => navigateSearchResults(-1)} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"><ChevronUp size={18}/></button><button onClick={() => navigateSearchResults(1)} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"><ChevronDown size={18}/></button></div>)}<button onClick={() => setIsSearching(false)} className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"><XCircle size={20}/></button></div>)}
            </div>
           <div className="chat-wallpaper-pseudo flex-1 flex flex-col overflow-hidden relative z-0">
                <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 flex flex-col">
                    <SmartDateIndicator visible={showDateIndicator} date={currentIndicatorDate} onClick={() => handleDateClick(null)} />
                    {hasMore && (<div ref={loaderTriggerRef} className="flex justify-center py-4">{loadingMore && <Loader2 className="animate-spin text-slate-400" />}</div>)}
                    {loading && messages.length === 0 && (<div className="flex justify-center items-center h-full m-auto"><Loader2 className="animate-spin" /></div>)}
                    <AnimatePresence>
                        {groupedMessages.map(([date, msgsInGroup]) => (
                            <React.Fragment key={date}>
                                <div data-date-separator={new Date(date).toISOString()} className="sticky top-2 z-10 flex justify-center my-2">
                                    <button onClick={() => handleDateClick(new Date(date).toISOString())} className="px-3 py-1 bg-slate-200/80 dark:bg-slate-700/80 backdrop-blur-sm rounded-full text-xs font-semibold cursor-pointer hover:ring-2 hover:ring-blue-500/50 transition-shadow">
                                        {new Date(date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: new Date().getFullYear() !== new Date(date).getFullYear() ? 'numeric' : undefined })}
                                    </button>
                                </div>
                                {msgsInGroup.map((msg, indexInGroup) => {
                                    const originalIndex = messages.findIndex(m => m._id === msg._id);
                                    const isCurrentResult = searchResults.length > 0 && searchResults[currentResultIndex] === msg._id;
                                    const isConsecutive = indexInGroup > 0 && 
                                                        msgsInGroup[indexInGroup - 1].sender?._id === msg.sender?._id &&
                                                        msgsInGroup[indexInGroup - 1].type !== 'system' &&
                                                        msg.type !== 'system';
                                    const isPinned = visiblePinnedMessages.some(pm => pm._id === msg._id);
                                    return (
                                        <motion.div
                                            key={msg.uuid || msg._id}
                                            layout
                                            initial={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -20, scale: 0.95, transition: { duration: 0.3 } }}
                                        >
                                            {originalIndex === unreadSeparatorIndex && (
                                                <AnimatePresence>
                                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                                                        <div className="flex items-center space-x-2 my-2"><hr className="flex-grow border-t border-blue-500" /><span className="text-xs font-semibold text-blue-500">Новые сообщения</span><hr className="flex-grow border-t border-blue-500" /></div>
                                                    </motion.div>
                                                </AnimatePresence>
                                            )}
                                            <AnimatePresence>
                                                {showScrollToBottom && (
                                                    <motion.button
                                                        initial={{ opacity: 0, scale: 0.8 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        exit={{ opacity: 0, scale: 0.8 }}
                                                        onClick={scrollToBottom}
                                                        className="absolute bottom-4 right-4 z-10 w-10 h-10 bg-slate-800/80 backdrop-blur-sm text-white rounded-full flex items-center justify-center shadow-lg hover:bg-slate-700 transition-colors"
                                                        title="Вниз"
                                                    >
                                                        <ChevronDown size={24} />
                                                    </motion.button>
                                                )}
                                            </AnimatePresence>
                                            <div data-date={new Date(msg.createdAt).toISOString().split('T')[0]}>
                                                {msg.type === 'system' ? (
                                                    <SystemMessage
                                                        message={msg}
                                                        onPerformDelete={performDelete}
                                                        openMenuId={openMenuId}
                                                        onToggleMenu={handleToggleMenu}
                                                        selectionMode={selectionMode}
                                                    />
                                                ) : (
                                                    <MessageBubble
                                                        message={{...msg, conversation: internalConversation}}
                                                        isOwnMessage={msg.sender._id === currentUserId}
                                                        isConsecutive={isConsecutive}
                                                        onReact={(emoji) => handleReact(msg._id, emoji)}
                                                        onReply={setReplyingTo}
                                                        onEdit={setEditingMessage}
                                                        onPerformDelete={performDelete}
                                                        onForward={handleForwardRequest}
                                                        onSelect={handleSelectMessage}
                                                        isSelected={selectedMessages.includes(msg._id)}
                                                        selectionMode={selectionMode}
                                                        openMenuId={openMenuId}
                                                        onToggleMenu={handleToggleMenu}
                                                        onScrollToMessage={handleScrollToMessage}
                                                        highlightedMessageId={highlightedMessageId}
                                                        isBlockingInterlocutor={isBlockingThem}
                                                        isBlockedByInterlocutor={isBlockedByThem}
                                                        attachedTrack={msg.attachedTrack}
                                                        searchQuery={isSearching ? searchQuery : null}
                                                        isCurrentSearchResult={isCurrentResult}
                                                        canInteract={canSendMessage}
                                                        isPinned={isPinned}
                                                        onPin={handleTogglePinMessage}
                                                        onUnpin={handleTogglePinMessage}
                                                        onImageClick={handleImageClickInBubble}
                                                    />
                                                )}
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </React.Fragment>
                        ))}
                    </AnimatePresence>
                    <div ref={messagesEndRef} />
                </div>
            </div>
            
            {selectionMode ? null : canSendMessage ? (
                <MessageInput
                    conversationId={internalConversation?._id} recipientId={liveInterlocutor._id} currentUser={currentUser} onMessageSent={handleMessageSent}
                    replyingTo={replyingTo} onClearReply={() => setReplyingTo(null)} onFileSelect={(file) => setAttachmentFile(file)}
                    onOptimisticSend={handleOptimisticSend} onSendFail={handleSendFail}
                    editingMessage={editingMessage} onCancelEdit={() => setEditingMessage(null)} onSaveEdit={handleEditMessage}
                />
            ) : (
                <div className="p-4 border-t border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/50 text-center text-sm text-slate-500 dark:text-slate-400">
                    {isBlockingThem ? (
                        <button
                            onClick={handleUnblock}
                            disabled={processingUnblock}
                            className="px-4 py-2 font-semibold rounded-lg transition-colors flex items-center space-x-2 mx-auto bg-green-500 text-white hover:bg-green-600 disabled:opacity-50"
                        >
                            {processingUnblock ? <Loader2 className="animate-spin" /> : <UserCheck size={18} />}
                            <span>Разблокировать пользователя</span>
                        </button>
                    ) : isBlockedByThem ? (
                        'Вы не можете отправлять сообщения этому пользователю.'
                    ) : (
                        <div className="flex items-center justify-center space-x-2">
                           <MessageSquareOff size={18} />
                           <span>Пользователь ограничил круг лиц, которые могут ему писать.</span>
                        </div>
                    )}
                </div>
            )}
            
            <AnimatePresence>
                {isStatsPanelOpen && (
                    <StatsPanel 
                        stats={conversationStats} 
                        loading={loadingStats} 
                        onClose={() => setIsStatsPanelOpen(false)} 
                    />
                )}
                {isAttachmentsPanelOpen && (
                    <AttachmentsPanel 
                        attachments={attachments} 
                        loading={loadingAttachments} 
                        hasMore={hasMoreAttachments} 
                        onLoadMore={() => fetchAttachments(attachmentsPage + 1)} 
                        onClose={() => setIsAttachmentsPanelOpen(false)}
                        onImageClick={handleOpenImageViewer}
                    />
                )}
                {isCalendarOpen && (
                    <ChatCalendarPanel
                        datesWithMessages={messageDates}
                        loading={loadingDates}
                        onClose={() => setIsCalendarOpen(false)}
                        onDateSelect={handleScrollToDate}
                    />
                )}
            </AnimatePresence>

            {isImageViewerOpen && (
                <ImageViewer 
                    images={isAttachmentsPanelOpen ? attachments.map(a => a.imageUrl) : chatImageUrls} 
                    startIndex={imageViewerStartIndex} 
                    onClose={() => setIsImageViewerOpen(false)}
                />
            )}
        </div>
    );
};

ConversationWindow.displayName = 'ConversationWindow';
export default ConversationWindow;