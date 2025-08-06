// frontend/src/components/CommunityCard.jsx

import React from 'react';
import { Link } from 'react-router-dom';
import Avatar from './Avatar';
import { Users, Lock, Eye, Check, Loader2, Globe, ShieldQuestion } from 'lucide-react';

const CommunityCard = ({ community, onAction, isMember, isPending }) => {
    const isOwner = community.isOwner;

    const renderActionButton = () => {
        if (isOwner) {
            return (
                <Link 
                    to={`/communities/${community._id}/manage`}
                    onClick={(e) => e.stopPropagation()}
                    className="px-4 py-2 text-sm font-semibold rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors flex items-center space-x-2"
                >
                    <ShieldQuestion size={18} /> <span>Управление</span>
                </Link>
            );
        }
        if (isMember) {
            return (
                <button
                    onClick={() => onAction('leave', community._id)}
                    className="px-4 py-2 text-sm font-semibold rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors flex items-center space-x-2"
                >
                    <Users size={18} /> <span>Покинуть</span>
                </button>
            );
        }
        if (isPending) {
            return (
                <span className="px-4 py-2 text-sm font-semibold rounded-lg bg-slate-400 text-white flex items-center space-x-2 opacity-70">
                    <Loader2 size={18} className="animate-spin" /> <span>В ожидании</span>
                </span>
            );
        }
        switch (community.joinPolicy) {
            case 'open':
                return (
                    <button onClick={() => onAction('join', community._id)} className="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors flex items-center space-x-2">
                        <Users size={18} /> <span>Вступить</span>
                    </button>
                );
            case 'approval_required':
                return (
                    <button onClick={() => onAction('join', community._id)} className="px-4 py-2 text-sm font-semibold rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors flex items-center space-x-2">
                        <Users size={18} /> <span>Запросить</span>
                    </button>
                );
            case 'invite_only':
                return (
                    <span className="px-4 py-2 text-sm font-semibold rounded-lg bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-white/70 flex items-center space-x-2">
                        <Lock size={18} /> <span>По приглашению</span>
                    </span>
                );
            default:
                return null;
        }
    };

    const renderVisibilityIcon = () => {
        if (community.visibility === 'private') return <Lock size={14} className="text-slate-500" title="Приватное сообщество"/>;
        if (community.visibility === 'secret') return <Eye size={14} className="text-red-500" title="Секретное сообщество"/>;
        return <Globe size={14} className="text-green-500" title="Публичное сообщество"/>;
    };

    return (
        <div className="ios-glass-final rounded-lg p-4 flex items-center justify-between space-x-4">
            <Link to={`/communities/${community._id}`} className="flex items-center space-x-4 flex-1 min-w-0 group">
                <Avatar username={community.name} avatarUrl={community.avatar} size="lg" />
                <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold truncate group-hover:text-blue-400 transition-colors">{community.name}</h3>
                    {/* --- НАЧАЛО ИЗМЕНЕНИЯ --- */}
                    {community.description && (
                        <p className="text-sm text-slate-600 dark:text-white/80 line-clamp-1">
                            {community.description}
                        </p>
                    )}
                    {/* --- КОНЕЦ ИЗМЕНЕНИЯ --- */}
                    <div className="flex items-center space-x-3 text-sm text-slate-500 dark:text-white/60 mt-1">
                        <div className="flex items-center space-x-1">{renderVisibilityIcon()}<span>{community.topic}</span></div>
                        <div className="flex items-center space-x-1"><Users size={14} /><span>{community.members?.length || 0}</span></div>
                    </div>
                </div>
            </Link>
            <div className="flex-shrink-0">
                {renderActionButton()}
            </div>
        </div>
    );
};

export default CommunityCard;