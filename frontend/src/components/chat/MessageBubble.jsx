// frontend/src/components/chat/MessageBubble.jsx --- ИСПРАВЛЕННЫЙ ФАЙЛ ---

import React, { useMemo, useRef, useState, forwardRef } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { MoreHorizontal, CornerDownRight, ChevronsRight, Check, CheckCheck, Pencil, Trash2, Pin, Loader2, Image as ImageIcon, AlertCircle } from 'lucide-react';
import Tippy from '@tippyjs/react/headless';
import 'tippy.js/dist/tippy.css';
import ReactionsPopover from './ReactionsPopover';
import { useModal } from '../../hooks/useModal';
import AttachedTrack from '../music/AttachedTrack';
import { useCachedImage } from '../../hooks/useCachedImage';

const API_URL = import.meta.env.VITE_API_URL;

const CachedImage = ({ src, alt, className, onClick }) => {
    const { finalSrc, loading } = useCachedImage(src);
    if (loading) {
        return <div className={`${className} bg-slate-200 dark:bg-slate-700 animate-pulse`}></div>;
    }
    return <img src={finalSrc} alt={alt} className={className} onClick={onClick} />;
};

const getImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) {
        return url;
    }
    return `${API_URL}/${url}`;
};

const avatarColors = [
    '#F59E0B', '#F472B6', '#A78BFA', '#60A5FA', '#4ADE80', '#F87171',
];

const getHash = (str) => {
    let hash = 0;
    if (!str || str.length === 0) return hash;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash;
};

const TippyWrapper = forwardRef((props, ref) => {
    return <button ref={ref} {...props}>{props.children}</button>;
});
TippyWrapper.displayName = 'TippyWrapper';

const MessageBubble = ({ message, isOwnMessage, isConsecutive, onReact, onReply, onEdit, onPerformDelete, onForward, onSelect, isSelected, selectionMode, openMenuId, onToggleMenu, onScrollToMessage, highlightedMessageId, isBlockingInterlocutor, isBlockedByInterlocutor, searchQuery, isCurrentSearchResult, canInteract, isPinned, onPin, onUnpin, onImageClick }) => {
    const { showConfirmation } = useModal();
    const time = format(new Date(message.createdAt), 'HH:mm');
    const menuButtonRef = useRef(null);
    const [menuPosition, setMenuPosition] = useState('bottom');

    const isMenuOpen = openMenuId === message._id;

    const replyStyle = useMemo(() => {
        if (!message.replyTo?.sender) return {};

        if (message.replyTo.imageUrl) {
            return {
                backgroundImage: `url(${getImageUrl(message.replyTo.imageUrl)})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
            };
        }

        const replySender = message.replyTo.sender;
        const accentRef = replySender.premiumCustomization?.activeCardAccent;

        if (replySender.premium?.isActive && accentRef) {
            let finalAccentUrl = null;

            if (typeof accentRef === 'object' && accentRef !== null && accentRef.backgroundUrl) {
                finalAccentUrl = accentRef.backgroundUrl;
            }
            else if (typeof accentRef === 'string' && (accentRef.startsWith('/') || accentRef.startsWith('http'))) {
                finalAccentUrl = accentRef;
            } 
            else if (accentRef) { 
                const accentIdString = accentRef.toString();
                const customAccents = replySender.premiumCustomization?.customCardAccents || [];
                const foundAccent = customAccents.find(acc => acc._id.toString() === accentIdString);
                if (foundAccent) {
                    finalAccentUrl = foundAccent.backgroundUrl;
                }
            }

            if (finalAccentUrl) {
                if (finalAccentUrl.startsWith('#')) {
                    return { backgroundColor: finalAccentUrl };
                }
                return {
                    backgroundImage: `url(${finalAccentUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                };
            }
        }
        
        const nameForHash = replySender.username || '';
        const hash = getHash(nameForHash);
        const colorIndex = Math.abs(hash) % avatarColors.length;
        const bgColor = avatarColors[colorIndex];

        return { backgroundColor: bgColor };
    }, [message.replyTo]);

    const shouldHaveOverlay = useMemo(() => {
        if (!message.replyTo?.sender) return false;

        if (message.replyTo.imageUrl) {
            return true;
        }

        const replySender = message.replyTo.sender;
        const accentRef = replySender.premiumCustomization?.activeCardAccent;

        if (replySender.premium?.isActive && accentRef) {
            return false;
        }
        
        return true;
    }, [message.replyTo]);

    const groupedReactions = useMemo(() => {
        if (!message.reactions || message.reactions.length === 0) return [];
        return message.reactions.reduce((acc, reaction) => {
            if (!acc[reaction.emoji]) {
                acc[reaction.emoji] = { emoji: reaction.emoji, count: 0, users: [] };
            }
            acc[reaction.emoji].count++;
            acc[reaction.emoji].users.push(reaction.user.username);
            return acc;
        }, {});
    }, [message.reactions]);
    
    const handleMenuClick = (e) => {
        if (message.isSending || message.isFailed) return;
        e.stopPropagation();
        if (menuButtonRef.current) {
            const rect = menuButtonRef.current.getBoundingClientRect();
            if (window.innerHeight - rect.bottom < 250) {
                setMenuPosition('top');
            } else {
                setMenuPosition('bottom');
            }
        }
        onToggleMenu(isMenuOpen ? null : message._id);
    };

    const ReadReceipt = () => {
        if (message.isSending) return <Loader2 size={16} className="animate-spin" />;
        if (message.isFailed) return <AlertCircle size={16} className="text-red-500" />;
        if (!isOwnMessage || !message.readBy) return null;
        const isSavedMessages = message.conversation?.isSavedMessages;
        const hasBeenReadByOthers = message.readBy.length > 1;
        
        if (isSavedMessages || hasBeenReadByOthers) {
            return <CheckCheck size={16} />;
        }
        return <Check size={16} />;
    };
    
    const handleDeleteRequest = () => {
        onToggleMenu(null);
        showConfirmation({
            title: "Удалить сообщение?",
            message: "Это действие нельзя будет отменить.",
            buttons: [
                {
                    label: 'Отмена',
                    onClick: () => {},
                    className: "rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/20 transition-colors"
                },
                {
                    label: 'Удалить у себя',
                    onClick: () => onPerformDelete([message._id], false),
                    className: "rounded-lg bg-red-500 hover:bg-red-600 font-semibold text-white transition-colors"
                },
                ...(isOwnMessage && canInteract ? [{
                    label: 'Удалить у всех',
                    onClick: () => onPerformDelete([message._id], true),
                    className: "rounded-lg bg-red-600 hover:bg-red-700 font-semibold text-white transition-colors"
                }] : [])
            ].reverse()
        });
    };

    const renderMessageWithHighlight = useMemo(() => {
        if (!isCurrentSearchResult || !searchQuery || !message.text) {
            return message.text;
        }

        const escapedQuery = searchQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(`(${escapedQuery})`, 'gi');
        const parts = message.text.split(regex);

        return (
            <>
                {parts.map((part, index) =>
                    regex.test(part) ? (
                        <mark key={index} className="bg-orange-300 dark:bg-orange-500 text-black dark:text-white rounded px-0.5 py-0">
                            {part}
                        </mark>
                    ) : (
                        part
                    )
                )}
            </>
        );
    }, [message.text, isCurrentSearchResult, searchQuery]);


    return (
        <div
            id={`message-${message.uuid || message._id}`}
            className={`flex items-end gap-2 group relative ${isOwnMessage ? 'justify-end' : 'justify-start'} ${isConsecutive ? 'mt-2' : 'mt-4'} ${isMenuOpen ? 'z-20' : 'z-auto'}`}
            onClick={() => selectionMode && onSelect(message._id)}
        >
            {selectionMode && (
                <div className={`flex items-center justify-center h-full ${isOwnMessage ? 'order-1' : 'order-first'}`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 transition-all duration-150 ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-400 group-hover:border-blue-500'}`}>
                        {isSelected && <Check size={12} className="text-white"/>}
                    </div>
                </div>
            )}
            
            <div className={`relative flex-shrink-0 ${isOwnMessage ? 'order-1' : 'order-2'}`}>
                {!selectionMode && !message.isSending && !message.isFailed && (
                     // --- НАЧАЛО ИЗМЕНЕНИЯ: Упрощаем структуру. Tippy теперь один и открывает меню действий. ---
                     <Tippy
                        interactive
                        placement={menuPosition === 'bottom' ? 'bottom-end' : 'top-end'}
                        visible={isMenuOpen}
                         onClickOutside={(instance, event) => {
                            const isClickOnPreviewOverlay = event.target.closest('.fixed.inset-0.bg-black\\/80');
                            if (isClickOnPreviewOverlay) {
                                return false; 
                            }
                            onToggleMenu(null);
                        }}
                        popperOptions={{ strategy: 'fixed' }}
                        render={attrs => (
                            <div className="ios-glass-popover w-48 rounded-lg shadow-xl p-1" {...attrs}>
                                {/* ReactionsPopover теперь является частью меню и имеет свой триггер */}
                                <ReactionsPopover onSelect={(emoji) => { onReact(emoji); onToggleMenu(null); }}>
                                     <button
                                        disabled={!canInteract}
                                        className="w-full text-left flex items-center space-x-3 px-3 py-1.5 text-sm rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                     >
                                       <span className="text-xl">❤️</span> <span>Реагировать</span>
                                    </button>
                                </ReactionsPopover>
                                <button onClick={() => { onReply(message); onToggleMenu(null); }} disabled={!canInteract} className="w-full text-left flex items-center space-x-3 px-3 py-1.5 text-sm rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed">
                                   <CornerDownRight size={16}/> <span>Ответить</span>
                                </button>
                                <button onClick={() => { onForward(message._id); onToggleMenu(null); }} className="w-full text-left flex items-center space-x-3 px-3 py-1.5 text-sm rounded hover:bg-slate-100 dark:hover:bg-slate-700">
                                   <ChevronsRight size={16}/> <span>Переслать</span>
                                </button>
                                <button
                                    onClick={() => { (isPinned ? onUnpin : onPin)(message._id); onToggleMenu(null); }}
                                    disabled={!canInteract}
                                    className="w-full text-left flex items-center space-x-3 px-3 py-1.5 text-sm rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                   <Pin size={16}/> <span>{isPinned ? 'Открепить' : 'Закрепить'}</span>
                                </button>
                                {isOwnMessage && (
                                    <button onClick={() => { onEdit(message); onToggleMenu(null); }} disabled={!canInteract} className="w-full text-left flex items-center space-x-3 px-3 py-1.5 text-sm rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed">
                                       <Pencil size={16}/> <span>Редактировать</span>
                                    </button>
                                )}
                                <div className="my-1 h-px bg-slate-200 dark:bg-slate-700"></div>
                                <button onClick={handleDeleteRequest} className="w-full text-left flex items-center space-x-3 px-3 py-1.5 text-sm rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10">
                                   <Trash2 size={16}/> <span>Удалить</span>
                                </button>
                                <div className="tippy-arrow" data-popper-arrow></div>
                            </div>
                        )}
                    >
                         <TippyWrapper 
                            ref={menuButtonRef} 
                            onClick={handleMenuClick} 
                            className="p-2 rounded-full text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-200 dark:hover:bg-slate-700"
                         >
                            <MoreHorizontal size={18}/>
                         </TippyWrapper>
                     </Tippy>
                    // --- КОНЕЦ ИЗМЕНЕНИЯ 1 ---
                )}
            </div>

            <div
    className={`max-w-xs md:max-w-md lg:max-w-lg rounded-3xl relative transition-colors duration-300 ${isOwnMessage ? 'order-2' : 'order-1'} ${message.isSending ? 'opacity-70' : ''}
        ${isOwnMessage ? `${isConsecutive ? 'rounded-br-md' : 'rounded-br-lg'}` : `${isConsecutive ? 'rounded-bl-md' : 'rounded-bl-lg'}`}
        ${highlightedMessageId === message._id ? 'bg-orange-400/50 dark:bg-orange-500/40' : (isOwnMessage ? 'bg-chat-bubble-own' : 'bg-chat-bubble-other')}
    `}
>
                
                <div className="pt-2"> 
                    {message.forwardedFrom && (
                        <Link to={`/profile/${message.forwardedFrom._id}`} className="flex items-center space-x-1.5 text-xs opacity-80 mb-1.5 px-3 cursor-pointer hover:underline">
                            <ChevronsRight size={14} className="flex-shrink-0"/>
                            <span className="truncate">Переслано от <strong>{message.forwardedFrom.username}</strong></span>
                        </Link>
                    )}
                </div>

                {message.replyTo && (
                     <div className="px-3 pt-2">
                         <button 
                            onClick={() => onScrollToMessage(message.replyTo._id)} 
                            className="w-full text-left p-2 mb-2 rounded-lg cursor-pointer relative overflow-hidden group"
                        >
                            <div className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-110" style={replyStyle}></div>
                            {shouldHaveOverlay && (
                                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors"></div>
                            )}
                            <div className="relative z-10 flex items-stretch space-x-2">
                                <div className="w-1 bg-blue-400 flex-shrink-0 rounded-full"></div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-white">{message.replyTo.sender.fullName || message.replyTo.sender.username}</p>
                                    <p className="text-sm text-white/80 truncate">{message.replyTo.text || (message.replyTo.imageUrl ? "Изображение" : "")}</p>
                                </div>
                            </div>
                        </button>
                    </div>
                )}
                {message.attachedTrack && (
                    <div className="px-3 pt-2 pb-2"><AttachedTrack track={message.attachedTrack} /></div>
                )}
                {message.imageUrl && (
                    <div className="relative p-1">
                        <CachedImage 
                            src={getImageUrl(message.imageUrl)} 
                            alt="Attachment" 
                            className="max-w-full h-auto rounded-xl object-cover cursor-pointer"
                            onClick={() => onImageClick && onImageClick(message.imageUrl)}
                        />
                    </div>
                )}
                
                <div className={`relative ${Object.values(groupedReactions).length > 0 ? 'pb-7' : ''}`}>
                    <div className="flex items-end flex-wrap px-3 pt-2 pb-2">
                        {message.text && (
                             <p className="whitespace-pre-wrap break-words mr-2 min-w-0">
                                {renderMessageWithHighlight}
                            </p>
                        )}
                        <div className="inline-flex items-center gap-1 text-xs opacity-70 flex-shrink-0 min-w-max self-end ml-auto">
                            {isPinned && <Pin size={12} className="text-current" />}
                            <span>{time}</span>
                            <ReadReceipt />
                        </div>
                    </div>
                    
                    <div className={`absolute bottom-1 right-2 z-10 flex items-center space-x-1`}>
                        {Object.values(groupedReactions).map(({ emoji, count, users = [] }) => {
                            const tippyContent = users.length > 0 ? users.join(', ') : '';
                            const Wrapper = users.length > 0 ? Tippy : React.Fragment;
                            const wrapperProps = users.length > 0 ? { content: tippyContent, placement: 'top' } : {};

                            return (
                                <Wrapper key={emoji} {...wrapperProps}>
                                <button disabled={!canInteract} onClick={() => onReact(emoji)} className="px-1.5 py-0.5 bg-white dark:bg-slate-600 rounded-full text-sm shadow flex items-center space-x-1 disabled:opacity-70 disabled:cursor-not-allowed">
                                    {emoji.startsWith('http') ? (
                                        <img src={emoji} alt="reaction" className="w-5 h-5 object-contain"/>
                                    ) : (
                                        <span>{emoji}</span>
                                    )}
                                    {count > 1 && <span className="font-semibold text-xs text-slate-700 dark:text-slate-200">{count}</span>}
                                </button>
                            </Wrapper>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MessageBubble;