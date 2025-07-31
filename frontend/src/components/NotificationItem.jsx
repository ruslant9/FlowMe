// frontend/src/components/NotificationItem.jsx

import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, UserPlus, Trash2, Users, UserCheck, UserX } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import Avatar from './Avatar';
import { motion } from 'framer-motion';
import Tippy from '@tippyjs/react/headless'; 
import NotificationSendersList from './NotificationSendersList'; 

const API_URL = import.meta.env.VITE_API_URL;

const notificationDetails = {
    like_post: { 
        icon: Heart, 
        textSingular: (n) => `лайкнул(а) ваш пост${n.community ? ` в сообществе` : ''}.`,
        textGrouped: (n) => `лайкнули ваш пост${n.community ? ` в сообществе` : ''}.`,
        color: 'text-red-500',
        previewFormat: (notification) => notification.community ? `"${notification.community.name}"` : `пост: "${notification.previewText}"`,
    },
    like_comment: { 
        icon: Heart, 
        textSingular: (n) => `лайкнул(а) ваш комментарий${n.community ? ` в сообществе` : ''}.`,
        textGrouped: (n) => `лайкнули ваш комментарий${n.community ? ` в сообществе` : ''}.`,
        color: 'text-red-500',
        previewFormat: (notification) => notification.community ? `"${notification.community.name}"` : `комментарий: "${notification.previewText}"`,
    },
    new_comment: { 
        icon: MessageCircle, 
        textSingular: (n) => `прокомментировал(а) ваш пост${n.community ? ` в сообществе` : ''}.`,
        textGrouped: (n) => `прокомментировали ваш пост${n.community ? ` в сообществе` : ''}.`,
        color: 'text-blue-500',
        previewFormat: (notification) => notification.community ? `"${notification.community.name}"` : `пост: "${notification.previewText}"`,
    },
    reply_comment: { 
        icon: MessageCircle, 
        textSingular: (n) => `ответил(а) на ваш комментарий${n.community ? ` в сообществе` : ''}.`,
        textGrouped: (n) => `ответили на ваш комментарий${n.community ? ` в сообществе` : ''}.`,
        color: 'text-blue-500',
        previewFormat: (notification) => notification.community ? `"${notification.community.name}"` : `комментарий: "${notification.previewText}"`,
    },
    friend_request: { 
        icon: UserPlus, 
        textSingular: () => 'отправил(а) вам заявку в друзья.', 
        textGrouped: () => 'отправили вам заявку в друзья.', 
        color: 'text-green-500',
    },
    community_join_request: {
        icon: Users,
        textSingular: () => 'хочет вступить в сообщество.',
        textGrouped: () => 'хотят вступить в сообщество.',
        color: 'text-orange-500',
        previewFormat: (notification) => `"${notification.previewText}"`,
    },
    community_request_approved: {
        icon: UserCheck,
        textSingular: () => 'Ваша заявка на вступление была одобрена.',
        color: 'text-green-500',
        isCommunityAction: true
    },
    community_request_denied: {
        icon: UserX,
        textSingular: () => 'Ваша заявка на вступление была отклонена.',
        color: 'text-red-500',
        isCommunityAction: true
    },
    community_invite: {
        icon: UserPlus,
        textSingular: () => `приглашает вас в сообщество.`,
        color: 'text-purple-500',
        previewFormat: (notification) => `"${notification.previewText}"`
    },
    community_invite_accepted: {
        icon: UserCheck,
        textSingular: () => `принял(а) ваше приглашение.`,
        color: 'text-green-500',
        previewFormat: (notification) => `в сообщество: "${notification.previewText}"`
    },
    community_invite_declined: {
        icon: UserX,
        textSingular: () => `отклонил(а) ваше приглашение.`,
        color: 'text-red-500',
        previewFormat: (notification) => `в сообщество: "${notification.previewText}"`
    }
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

const NotificationItem = ({ notification, onDelete, onAction }) => {
    const details = notificationDetails[notification.type] || {};
    const Icon = details.icon || MessageCircle;

    const handleDelete = (e) => {
        e.preventDefault();
        e.stopPropagation();
        onDelete(notification._id);
    };

    const handleActionClick = (e, actionName) => {
        e.preventDefault();
        e.stopPropagation();
        onAction(actionName, notification._id);
    };

    const renderText = () => {
        const isCommunityAction = details.isCommunityAction;
        if (isCommunityAction) {
            return (
                <>
                    {details.textSingular(notification)}{' '}
                    <Link
                        to={notification.link}
                        onClick={e => e.stopPropagation()}
                        className="font-bold hover:underline"
                    >
                        "{notification.previewText}"
                    </Link>.
                </>
            );
        }

        if (!notification.senders || !Array.isArray(notification.senders)) {
            console.warn("NotificationItem: 'notification.senders' is missing or not an array for notification:", notification);
            return <span className="italic text-slate-400">Некорректное уведомление</span>;
        }

        const senderCount = notification.senders.length;
        const lastSenderName = notification.lastSender?.fullName || notification.lastSender?.username || 'Кто-то';

        const formattedPreview = details.previewFormat ? details.previewFormat(notification) : null;
        const textAction = typeof details.textSingular === 'function' ? details.textSingular(notification) : details.textSingular;
        const groupedTextAction = typeof details.textGrouped === 'function' ? details.textGrouped(notification) : details.textGrouped;

        if (senderCount <= 1) {
            return (
                <>
                    <Link
                        to={`/profile/${notification.lastSender?._id}`}
                        onClick={e => e.stopPropagation()} 
                        className="font-bold hover:underline"
                    >
                        {lastSenderName}
                    </Link>
                    {' '}{textAction}
                    {formattedPreview && <span className="text-slate-500 dark:text-slate-400 ml-1">{formattedPreview}</span>}
                </>
            );
        }
        
        if (senderCount > 1) {
            const otherCount = senderCount - 1;
            return (
                <>
                    <Tippy
                        interactive
                        placement="bottom-start"
                        delay={[100, 100]}
                        render={attrs => (
                            <NotificationSendersList senders={notification.senders} attrs={attrs} />
                        )}
                    >
                        <span className="inline-block cursor-pointer hover:underline" onClick={e => e.stopPropagation()}> 
                            <Link
                                to={`/profile/${notification.lastSender?._id}`}
                                onClick={e => e.stopPropagation()} 
                                className="font-bold hover:underline"
                            >
                                {lastSenderName}
                            </Link>{' '}
                            и еще{' '}
                            <span className="font-bold">{otherCount} {otherCount === 1 ? 'человек' : (otherCount < 5 ? 'человека' : 'человек')}</span>{' '}
                            {groupedTextAction}
                        </span>
                    </Tippy>
                    {formattedPreview && <span className="text-slate-500 dark:text-slate-400 ml-1">{formattedPreview}</span>}
                </>
            );
        }
        return null;
    };

    const isCommunitySystemNotif = details.isCommunityAction;
    let avatarLink, avatarProps;

    if (isCommunitySystemNotif) {
        avatarLink = notification.link;
        avatarProps = {
            username: notification.previewText, // community name
            avatarUrl: notification.previewImage ? `${API_URL}/${notification.previewImage}` : ''
        };
    } else {
        avatarLink = `/profile/${notification.lastSender?._id}`;
        avatarProps = {
            username: notification.lastSender?.username,
            fullName: notification.lastSender?.fullName,
            avatarUrl: notification.lastSender?.avatar ? `${API_URL}/${notification.lastSender.avatar}` : ''
        };
    }

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
        >
            <div 
                className="block p-3 rounded-lg hover:bg-slate-100/50 dark:hover:bg-white/5 transition-colors relative group cursor-pointer"
            >
                <div className="flex items-start justify-between space-x-4">
                    {!notification.read && (
                        <div className="absolute top-1/2 -translate-y-1/2 left-0 w-2 h-2 bg-blue-500 rounded-full" title="Новое"></div>
                    )}
                    <div className="relative pl-4">
                        <Link to={avatarLink} onClick={e => e.stopPropagation()}>
                            <Avatar {...avatarProps} />
                        </Link>
                        <div className={`absolute -bottom-1 -right-1 p-1 bg-white dark:bg-slate-700 rounded-full ${details.color}`}>
                            <Icon size={14} />
                        </div>
                    </div>
                    <div className="flex-1 min-w-0"> 
                        <p className="text-sm"> 
                            {renderText()}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-white/60 mt-1">
                            {formatDistanceToNow(new Date(notification.updatedAt), { addSuffix: true, locale: customRuLocale })}
                        </p>
                        {notification.type === 'community_invite' && (
                            <div className="mt-2 flex items-center space-x-2">
                                <button
                                    onClick={(e) => handleActionClick(e, 'accept_invite')}
                                    className="px-4 py-2 text-sm font-semibold rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors"
                                >
                                    Принять
                                </button>
                                <button
                                    onClick={(e) => handleActionClick(e, 'decline_invite')}
                                    className="px-4 py-2 text-sm font-semibold rounded-lg bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 transition-colors"
                                >
                                    Отклонить
                                </button>
                            </div>
                        )}
                    </div>
                    {notification.previewImage && !isCommunitySystemNotif && (
                        <div className="flex-shrink-0 ml-4">
                            <img 
                                src={`${API_URL}/${notification.previewImage}`} 
                                alt="preview" 
                                className="w-12 h-12 object-cover rounded-md"
                            />
                        </div>
                    )}
                    <button 
                        onClick={handleDelete} 
                        className="p-2 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Удалить уведомление"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

export default NotificationItem;