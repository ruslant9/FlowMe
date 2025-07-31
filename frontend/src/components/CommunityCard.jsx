// frontend/src/components/CommunityCard.jsx

import React from 'react';
import { Link } from 'react-router-dom';
import Avatar from './Avatar';
import { Users, Lock, Eye, Check, Loader2, Globe, ShieldQuestion } from 'lucide-react'; // ShieldQuestion для кнопки управления

const API_URL = import.meta.env.VITE_API_URL;

const CommunityCard = ({ community, onAction, isMember, isPending }) => {
    const isOwner = community.isOwner; // Признак того, что текущий пользователь - владелец

    const renderActionButton = () => {
        if (isOwner) {
            // Если текущий пользователь - владелец, показываем кнопку "Управление"
            return (
                <Link 
                    to={`/communities/${community._id}/manage`} // Ссылка на страницу управления сообществом (пока заглушка)
                    className="px-4 py-2 text-sm font-semibold rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors flex items-center space-x-2"
                >
                    <ShieldQuestion size={18} /> Управление
                </Link>
            );
        } else if (isMember) {
            // Если пользователь уже является участником, но не владельцем, показываем кнопку "Покинуть"
            return (
                <button
                    onClick={() => onAction('leave', community._id)}
                    className="px-4 py-2 text-sm font-semibold rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors flex items-center space-x-2"
                >
                    <Users size={18} /> Покинуть
                </button>
            );
        } else if (isPending) {
            // Если пользователь отправил заявку и она в ожидании
            return (
                <span className="px-4 py-2 text-sm font-semibold rounded-lg bg-slate-400 text-white flex items-center space-x-2 opacity-70">
                    <Loader2 size={18} className="animate-spin" /> В ожидании
                </span>
            );
        } else {
            // Если пользователь не является ни владельцем, ни участником, ни в ожидании,
            // показываем кнопки в зависимости от политики вступления
            if (community.joinPolicy === 'open') {
                return (
                    <button
                        onClick={() => onAction('join', community._id)}
                        className="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors flex items-center space-x-2"
                    >
                        <Users size={18} /> Вступить
                    </button>
                );
            } else if (community.joinPolicy === 'approval_required') {
                return (
                    <button
                        onClick={() => onAction('join', community._id)}
                        className="px-4 py-2 text-sm font-semibold rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors flex items-center space-x-2"
                    >
                        <Users size={18} /> Запросить
                    </button>
                );
            } else if (community.joinPolicy === 'invite_only') {
                // Если только по приглашению, кнопка неактивна
                return (
                    <span className="px-4 py-2 text-sm font-semibold rounded-lg bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-white/70 flex items-center space-x-2">
                        <Lock size={18} /> По приглашению
                    </span>
                );
            }
        }
        return null; // Ничего не показываем, если нет подходящих условий
    };

    const renderVisibilityIcon = () => {
        if (community.visibility === 'private') {
            return <Lock size={14} className="text-slate-500" title="Приватное сообщество"/>;
        } else if (community.visibility === 'secret') {
            return <Eye size={14} className="text-red-500" title="Секретное сообщество"/>;
        }
        return <Globe size={14} className="text-green-500" title="Публичное сообщество"/>;
    };

    return (
        <div className="ios-glass-final rounded-lg p-4 flex flex-col h-full">
            {/* Ссылка на страницу деталей сообщества, пока не реализована, поэтому ведет на /communities/:id */}
            <Link to={`/communities/${community._id}`} className="flex-grow flex flex-col">
                <div className="flex items-start space-x-4 mb-3">
                    {/* Аватар сообщества */}
                    <Avatar username={community.name} avatarUrl={community.avatar ? `${API_URL}/${community.avatar}` : ''} size="lg" />
                    <div className="flex-1 min-w-0">
                        {/* Название сообщества */}
                        <h3 className="text-xl font-bold truncate mb-1">{community.name}</h3>
                        {/* Иконка видимости и тематика */}
                        <div className="flex items-center space-x-2 text-sm text-slate-500 dark:text-white/60">
                            {renderVisibilityIcon()}
                            <span>{community.topic}</span>
                        </div>
                    </div>
                </div>
                {/* Описание сообщества, обрезается до 3 строк */}
                <p className="text-sm text-slate-600 dark:text-white/80 mb-3 flex-grow line-clamp-3">
                    {community.description || 'Нет описания.'}
                </p>
                {/* Количество участников */}
                <div className="flex items-center space-x-2 text-slate-500 dark:text-white/60 text-sm mt-auto">
                    <Users size={16} />
                    <span>{community.members?.length || 0} участников</span>
                </div>
            </Link>
            {/* Кнопка действия в зависимости от статуса пользователя в сообществе */}
            <div className="mt-4 flex justify-end">
                {renderActionButton()}
            </div>
        </div>
    );
};

export default CommunityCard;