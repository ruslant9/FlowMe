// frontend/src/components/Avatar.jsx

import { UserX } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

const getImageUrl = (url) => {
    if (!url || url.startsWith('http') || url.startsWith('blob:')) return url || '';
    return `${API_URL}/${url}`;
};

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
        '2xl': 'w-32 h-32 text-5xl',
    };

    const nameForInitial = fullName || username;
    const firstLetter = nameForInitial.charAt(0).toUpperCase();
    const hash = getHash(username || '');
    const colorIndex = Math.abs(hash) % avatarColors.length;
    const bgColor = avatarColors[colorIndex];
    
    // --- НАЧАЛО ИСПРАВЛЕНИЯ ВНУТРЕННЕЙ ЛОГИКИ AVATAR.JSX ---
    const hasCustomBorder = customBorder && customBorder.type !== 'none';
    const isPseudoElementBorder = hasCustomBorder && customBorder.pseudo;
    const borderClass = hasCustomBorder && customBorder.type.startsWith('animated') && !isPseudoElementBorder ? `premium-border-${customBorder.type}` : '';
    const borderStyle = hasCustomBorder && customBorder.type === 'static' ? { padding: '4px', backgroundColor: customBorder.value } : {};
    const defaultPremiumClass = isPremium && !customBorder ? 'p-1 premium-gradient-bg' : '';
    const finalWrapperClass = `relative group rounded-full transition-all duration-300 inline-block ${borderClass} ${defaultPremiumClass}`;
    // --- КОНЕЦ ИСПРАВЛЕНИЯ ВНУТРЕННЕЙ ЛОГИКИ AVATAR.JSX ---

    return (
        <div 
            className={finalWrapperClass}
            style={borderStyle}
            onClick={onClick}
        >
            {/* --- НАЧАЛО ИСПРАВЛЕНИЯ --- */}
            {(() => {
                // Внутренний контейнер для аватара. Он должен быть прозрачным для анимированных рамок,
                // чтобы градиент внешнего контейнера был виден.
                const needsTransparentBg = (hasCustomBorder && !isPseudoElementBorder && !defaultPremiumClass) || (defaultPremiumClass && !hasCustomBorder);

                const baseAvatarContainerClass = `${sizeClasses[size]} rounded-full flex-shrink-0 overflow-hidden ${onClick ? 'cursor-pointer' : ''}`;
                const bgClass = needsTransparentBg ? 'bg-transparent' : 'bg-slate-200 dark:bg-slate-700';

                if (avatarUrl) {
                    return (
                        <div className={`${baseAvatarContainerClass} ${bgClass}`}>
                            <img
                                src={getImageUrl(avatarUrl)}
                                alt={username}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    );
                } else {
                    const initialContainerClass = `${baseAvatarContainerClass} flex items-center justify-center font-bold text-white`;
                    return (
                        <div
                            className={initialContainerClass}
                            style={{ backgroundColor: isPseudoElementBorder ? 'transparent' : bgColor }}
                        >
                            {isPseudoElementBorder ? (
                                <div className="w-full h-full rounded-full flex items-center justify-center" style={{ backgroundColor: bgColor }}>
                                    {firstLetter}
                                </div>
                            ) : (
                                firstLetter
                            )}
                        </div>
                    );
                }
            })()}
            {/* --- КОНЕЦ ИСПРАВЛЕНИЯ --- */}

            {(hasCustomBorder && !isPseudoElementBorder || defaultPremiumClass) && <div className="absolute inset-1 rounded-full bg-slate-50 dark:bg-slate-900 -z-10"></div>}    
            
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