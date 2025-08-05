// frontend/src/components/ProfileCard.jsx

import React from 'react'; // Убрали лишние импорты
import { Edit2 } from 'lucide-react'; // Заменили Edit на Edit2 для лучшего вида
import AnimatedAccent from './AnimatedAccent';

// --- НАЧАЛО ИЗМЕНЕНИЙ: Рефакторинг компонента ---

// Хелпер-функция для определения контрастного цвета текста
const getContrastingTextColor = (hexColor) => {
    if (!hexColor || !hexColor.startsWith('#') || hexColor.length < 7) {
        return null; // По умолчанию наследуем цвет
    }
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b);
    return luminance > 128 ? '#0f172a' : '#ffffff'; // slate-900 или белый
};

const LIGHT_BACKGROUND_URLS = [
    '/wallpapers/templates/love_wallpaper.svg',
];

const ProfileCard = ({ icon: Icon, title, children, onEditClick, actionButton, userAccent, renderContent }) => { 
    const [accentTextColor, setAccentTextColor] = React.useState(null);

    React.useEffect(() => {
        let accentBg = null;
        if (userAccent) {
            if (typeof userAccent === 'object' && userAccent !== null && userAccent.backgroundUrl) {
                accentBg = userAccent.backgroundUrl;
            } else if (typeof userAccent === 'string') {
                accentBg = userAccent;
            }
        }

        if (accentBg && accentBg.startsWith('#')) {
            setAccentTextColor(getContrastingTextColor(accentBg));
        } else if (accentBg) {
            if (LIGHT_BACKGROUND_URLS.includes(accentBg)) {
                setAccentTextColor('#0f172a');
            } else {
                setAccentTextColor('#ffffff');
            }
        } else {
            setAccentTextColor(null);
        }
    }, [userAccent]);

    const renderAccent = () => {
        if (!userAccent) return null;

        if (typeof userAccent === 'object' && userAccent !== null && userAccent.backgroundUrl) {
            return <AnimatedAccent backgroundUrl={userAccent.backgroundUrl} emojis={userAccent.emojis} />;
        }
        
        if (typeof userAccent === 'string') {
            return (
                <div 
                    className="absolute inset-0 opacity-95 pointer-events-none -z-10 profile-card-accent"
                    style={{ backgroundImage: `url(${userAccent})` }}
                ></div>
            );
        }
        return null;
    };
    
    const textStyle = accentTextColor ? { color: accentTextColor } : {};

    return (
        <div className="ios-glass-final rounded-3xl p-6 w-full flex flex-col relative overflow-hidden">
            {renderAccent()}
            
            <div className="flex justify-between items-center mb-4 relative z-10">
                <div className="flex items-center space-x-3" style={textStyle}>
                    {Icon && <Icon className="text-current" />}
                    <h2 className="text-xl font-bold">{title}</h2>
                </div>
                {onEditClick ? (
                    <button onClick={onEditClick} className="p-2 rounded-full hover:bg-slate-200/50 dark:hover:bg-white/10" title="Редактировать" style={textStyle}>
                        <Edit2 size={18} />
                    </button>
                ) : actionButton ? (
                    actionButton
                ) : null}
            </div>
            <div className="flex-1 relative z-10" style={textStyle}>
                {renderContent ? renderContent(accentTextColor) : children}
            </div>
        </div>
    );
};

// --- КОНЕЦ ИЗМЕНЕНИЙ ---
export default ProfileCard;