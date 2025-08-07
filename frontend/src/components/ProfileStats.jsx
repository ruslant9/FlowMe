// frontend/src/components/ProfileStats.jsx
import React from 'react';

const StatItem = ({ label, value, onClick, accentTextColor }) => {
    // Класс для подписи (label) изменен на статичный светло-серый.
    const labelClasses = accentTextColor ? '' : 'text-slate-400 group-hover:text-blue-300';
    const valueClasses = accentTextColor ? '' : 'group-hover:text-blue-400';
    const labelStyle = accentTextColor ? { color: accentTextColor, opacity: 0.7 } : {};

    const content = (
        <div className="flex flex-col items-center">
            {/* Основной текст (value) унаследует белый цвет. */}
            <p className={`text-base font-bold transition-colors ${valueClasses}`}>{value}</p>
            <p className={`text-[11px] transition-colors whitespace-nowrap ${labelClasses}`} style={labelStyle}>{label}</p>
        </div>
    );

    if (onClick) {
        return (
            <button 
                onClick={onClick} 
                className="text-center group focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg p-1 transition-all cursor-pointer"
            >
                {content}
            </button>
        );
    }
    return (
        <div className="text-center p-1">
            {content}
        </div>
    );
};

const ProfileStats = ({ stats, onShowUsers, accentTextColor }) => { 
    if (!stats) {
        return (
            <div className="flex items-center justify-around flex-nowrap my-4 gap-x-1 animate-pulse">
                {[...Array(5)].map((_, i) => (
                     <div key={i} className="flex flex-col items-center p-1">
                        <div className="h-6 w-8 bg-slate-300 dark:bg-slate-700 rounded-md mb-1.5"></div>
                        <div className="h-3 w-12 bg-slate-300 dark:bg-slate-700 rounded-md"></div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="flex items-start justify-around my-4">
            <StatItem label="Посты" value={stats.posts} accentTextColor={accentTextColor} />
            <StatItem label="Друзья" value={stats.friends} onClick={onShowUsers ? () => onShowUsers('friends') : undefined} accentTextColor={accentTextColor} />
            <StatItem label="Сообщества" value={stats.subscribedCommunities} onClick={onShowUsers ? () => onShowUsers('communities') : undefined} accentTextColor={accentTextColor} />
            <StatItem label="Подписчики" value={stats.subscribers} onClick={onShowUsers ? () => onShowUsers('subscribers') : undefined} accentTextColor={accentTextColor} />
            <StatItem label="Лайки" value={stats.likes} accentTextColor={accentTextColor} />
        </div>
    );
};

export default ProfileStats;