// frontend/src/components/ProfileStats.jsx
import React from 'react';

// --- НАЧАЛО ИЗМЕНЕНИЙ: Упрощаем компонент и делаем его более гибким ---

const StatItem = ({ label, value, onClick }) => {
    const content = (
        <div className="flex flex-col items-center">
            <p className="text-2xl font-bold transition-colors text-white group-hover:text-blue-300">{value}</p>
            <p className="text-xs transition-colors text-white/70 group-hover:text-blue-200 whitespace-nowrap">{label}</p>
        </div>
    );

    if (onClick) {
        return (
            <button 
                onClick={onClick} 
                className="text-center group focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg p-2 transition-all cursor-pointer"
            >
                {content}
            </button>
        );
    }
    return <div className="text-center p-2">{content}</div>;
};

const ProfileStats = ({ stats, onShowUsers }) => { 
    if (!stats) {
        return (
            <div className="flex items-center justify-around flex-wrap gap-4 my-4 animate-pulse">
                {[...Array(5)].map((_, i) => (
                     <div key={i} className="flex flex-col items-center">
                        <div className="h-7 w-12 bg-white/20 rounded-md mb-2"></div>
                        <div className="h-3 w-16 bg-white/20 rounded-md"></div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="flex items-start justify-center flex-wrap gap-x-4 gap-y-2 my-4">
            <StatItem label="Посты" value={stats.posts} />
            <StatItem label="Друзья" value={stats.friends} onClick={onShowUsers ? () => onShowUsers('friends') : undefined} />
            <StatItem label="Сообщества" value={stats.subscribedCommunities} onClick={onShowUsers ? () => onShowUsers('communities') : undefined} />
            <StatItem label="Подписчики" value={stats.subscribers} onClick={onShowUsers ? () => onShowUsers('subscribers') : undefined} />
            <StatItem label="Лайки" value={stats.likes} />
        </div>
    );
};
// --- КОНЕЦ ИЗМЕНЕНИЙ ---
export default ProfileStats;