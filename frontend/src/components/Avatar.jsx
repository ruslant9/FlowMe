// frontend/src/components/Avatar.jsx

import { UserX } from 'lucide-react';
import { useCachedImage } from '../hooks/useCachedImage';

const API_URL = import.meta.env.VITE_API_URL;

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

const Avatar = ({ username, avatarUrl, size = 'md', fullName, onClick, isPremium = false, customBorder, children }) => {
    if (!username && !fullName) return null;

    const { finalSrc, loading } = useCachedImage(avatarUrl);

    const sizeClasses = {
        sm: 'w-8 h-8 text-sm',
        md: 'w-10 h-10 text-lg',
        lg: 'w-12 h-12 text-xl',
        xl: 'w-12 h-12 md:w-24 md:h-24 text-xl md:text-4xl', 
        '2xl': 'w-32 h-32 text-5xl',
    };

    const nameForInitial = fullName || username;
    const firstLetter = nameForInitial.charAt(0).toUpperCase();
    const hash = getHash(username || '');
    const colorIndex = Math.abs(hash) % avatarColors.length;
    const bgColor = avatarColors[colorIndex];
    const hasCustomBorder = customBorder && customBorder.type !== 'none';

    // --- НАЧАЛО ИСПРАВЛЕНИЯ ---
    const borderClass = hasCustomBorder && customBorder.type.startsWith('animated') ? `premium-border-${customBorder.type}` : '';
    
    // Используем Flexbox для центрирования, это надежнее
    const paddingClass = hasCustomBorder || isPremium ? '' : ''; 
    
    const staticBorderStyle = hasCustomBorder && customBorder.type === 'static' 
        ? { backgroundColor: customBorder.value } // Убираем padding отсюда
        : {};

    const defaultPremiumClass = isPremium && !hasCustomBorder ? 'premium-gradient-bg' : '';
    
    // Добавляем flex классы для идеального центрирования
    const finalWrapperClass = `relative group rounded-full inline-flex items-center justify-center flex-shrink-0 ${sizeClasses[size]} ${borderClass} ${paddingClass} ${defaultPremiumClass}`;
    // --- КОНЕЦ ИСПРАВЛЕНИЯ ---
    
    return (
        <div 
            className={finalWrapperClass}
            style={staticBorderStyle}
            onClick={onClick}
        >
            {/* --- НАЧАЛО ИСПРАВЛЕНИЯ: делаем внутренний контейнер чуть меньше для создания обводки --- */}
            <div 
                className="rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden" 
                style={{ 
                    width: hasCustomBorder || isPremium ? 'calc(100% - 4px)' : '100%',
                    height: hasCustomBorder || isPremium ? 'calc(100% - 4px)' : '100%'
                }}
            >
            {/* --- КОНЕЦ ИСПРАВЛЕНИЯ --- */}
                {avatarUrl ? (
                    loading ? (
                        <div className="w-full h-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
                    ) : (
                        <img
                            src={finalSrc}
                            alt={username}
                            className="w-full h-full object-cover"
                        />
                    )
                ) : (
                    <div
                        className="w-full h-full flex items-center justify-center font-bold text-white"
                        style={{ backgroundColor: bgColor }}
                    >
                        {firstLetter}
                    </div>
                )}
            </div>
            
            {onClick && children && (
                <>
                    <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                    <div className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        {children}
                    </div>
                </>
            )}
        </div>
    );
};

export default Avatar;