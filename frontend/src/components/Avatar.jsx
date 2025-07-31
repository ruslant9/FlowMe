// frontend/src/components/Avatar.jsx

import { UserX } from 'lucide-react';

const avatarColors = [
    '#F59E0B', // Оранжевый
    '#F472B6', // Розовый
    '#A78BFA', // Фиолетовый
    '#60A5FA', // Голубой
    '#4ADE80', // Зеленый
    '#F87171', // Коралловый
];

const getHash = (str) => {
    let hash = 0;
    if (str.length === 0) return hash;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash;
};

const Avatar = ({ username, avatarUrl, size = 'md', fullName, onClick, isPremium = false, customBorder, children }) => {
    if (!username && !fullName) return null;

    const sizeClasses = {
        sm: 'w-8 h-8 text-sm',
        md: 'w-10 h-10 text-lg',
        lg: 'w-12 h-12 text-xl',
        xl: 'w-24 h-24 text-4xl',
    };

    const nameForInitial = fullName || username;
    const firstLetter = nameForInitial.charAt(0).toUpperCase();
    const hash = getHash(username || '');
    const colorIndex = Math.abs(hash) % avatarColors.length;
    const bgColor = avatarColors[colorIndex];

    const hasCustomBorder = customBorder && customBorder.type !== 'none';
    const borderClass = hasCustomBorder && customBorder.type.startsWith('animated') ? `premium-border-${customBorder.type}` : '';
    const borderStyle = hasCustomBorder && customBorder.type === 'static' ? { padding: '4px', backgroundColor: customBorder.value } : {};
    
    const defaultPremiumClass = isPremium && !customBorder ? 'p-1 premium-gradient-bg' : '';

    const finalWrapperClass = `relative group rounded-full transition-all duration-300 inline-block ${borderClass} ${defaultPremiumClass}`;
    
    return (
        <div 
            className={finalWrapperClass}
            style={borderStyle}
            onClick={onClick}
        >
            {/* --- ИЗМЕНЕНИЕ: Теперь мы просто используем avatarUrl напрямую --- */}
            {avatarUrl ? (
                <div
                    className={`${sizeClasses[size]} rounded-full flex-shrink-0 overflow-hidden bg-slate-200 dark:bg-slate-700 ${onClick ? 'cursor-pointer' : ''}`}
                >
                    <img
                        src={avatarUrl}
                        alt={username}
                        className="w-full h-full object-cover"
                    />
                </div>
            ) : (
                <div
                    className={`
                        ${sizeClasses[size]} rounded-full flex items-center justify-center font-bold text-white
                        flex-shrink-0 ${onClick ? 'cursor-pointer' : ''} bg-slate-700
                    `}
                    style={{ backgroundColor: bgColor }}
                >
                    {firstLetter}
                </div>
            )}
            {(hasCustomBorder || defaultPremiumClass) && <div className="absolute inset-1 rounded-full bg-slate-50 dark:bg-slate-900 -z-10"></div>}
            
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