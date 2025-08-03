// frontend/src/components/Sidebar.jsx

import React, { useState, useEffect, forwardRef } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import Avatar from './Avatar';
import { LogOut, Settings, Users, Newspaper, Menu, MessageSquare, Bell, Globe, Music, Sparkles, Crown, Shield, Brush } from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';
import { useUser } from '../context/UserContext';
import { useNotifications } from '../context/NotificationContext';
import Tippy from '@tippyjs/react/headless';
import { motion, LayoutGroup } from 'framer-motion';
import { useMusicPlayer } from '../context/MusicPlayerContext';

const Tooltip = ({ text, attrs }) => (
    <div 
        className="ios-glass-popover px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-800 dark:text-white" 
        {...attrs}
    >
        {text}
    </div>
);

const TippyWrapper = forwardRef((props, ref) => {
    return <span ref={ref} {...props}>{props.children}</span>;
});
TippyWrapper.displayName = 'TippyWrapper';

const NavItem = ({ to, end, icon: Icon, text, count, isExpanded }) => {
    const baseStyles = "flex items-center transition-colors duration-200 relative";
    const expandedStyles = "py-2.5 px-3";
    const collapsedStyles = "w-12 h-12 justify-center";
    
    const getActiveStyles = (isActive) => isActive 
        ? 'text-blue-600 dark:text-white font-semibold'
        : 'text-slate-600 dark:text-white/60 hover:text-slate-800 dark:hover:text-white';

    const textContent = typeof text === 'string' ? <span>{text}</span> : text;

    // Функция для форматирования числа
    const formattedCount = count > 99 ? '99+' : count;

    return (
        <Tippy
            disabled={isExpanded}
            placement="right"
            delay={[300, 0]}
            render={attrs => <Tooltip text={typeof text === 'string' ? text : text.props.children} attrs={attrs} />}
        >
            <TippyWrapper>
                <NavLink 
                    to={to} 
                    end={end} 
                    className={({ isActive }) => `
                        ${baseStyles}
                        ${isExpanded ? expandedStyles : collapsedStyles}
                        ${getActiveStyles(isActive)}
                    `}
                >
                    {({ isActive }) => (
                        <>
                            {isActive && (
                                <motion.div
                                    layoutId="active-indicator"
                                    className="absolute inset-0 bg-blue-100 dark:bg-white/10 -z-10 rounded-full"
                                    transition={{ type: 'spring', stiffness: 600, damping: 35, mass: 1 }}
                                />
                            )}
                            
                            <div className="relative">
                                <Icon className="w-5 h-5 flex-shrink-0" />
                                {count > 0 && 
                                    <span className="absolute -top-1.5 -right-2.5 bg-red-500 text-white text-[10px] font-bold rounded-full px-1 min-w-[18px] h-[18px] flex items-center justify-center border-2 border-slate-50 dark:border-slate-900">
                                        {formattedCount}
                                    </span>
                                }
                            </div>
                            <span className={`whitespace-nowrap transition-all duration-200 ${isExpanded ? 'ml-4' : 'w-0 opacity-0 ml-0'}`}>{textContent}</span>
                        </>
                    )}
                </NavLink>
            </TippyWrapper>
        </Tippy>
    );
};

const Sidebar = ({ themeSwitcher }) => {
    const [isExpanded, setIsExpanded] = useState(localStorage.getItem('sidebarExpanded') !== 'false');
    const navigate = useNavigate();
    
    const { logout } = useWebSocket(); 
    const { currentUser: user } = useUser();
    const { summary } = useNotifications();

    const handleLogout = () => {
        stopAndClearPlayer();
        logout();
        navigate('/login');
    };

    useEffect(() => {
        localStorage.setItem('sidebarExpanded', isExpanded);
    }, [isExpanded]);

    const menuItems = [
        { name: "Уведомления", path: "/notifications", icon: Bell, count: summary.unreadNotificationsCount },
        { name: "Лента", path: "/", icon: Newspaper, count: 0 },
        { name: "Друзья", path: "/friends", icon: Users, count: summary.friendRequestsCount },
        { name: "Сообщества", path: "/communities", icon: Globe, count: 0 },
        { name: "Сообщения", path: "/messages", icon: MessageSquare, count: summary.unreadConversationsCount },
        { name: "Музыка", path: "/music", icon: Music, count: 0 },
        { name: "Мастерская", path: "/workshop", icon: Brush, count: 0 },
    ];
    
    const getActiveStylesProfile = (isActive) => isActive 
        ? 'text-slate-800 dark:text-white'
        : 'text-slate-600 dark:text-white/60 hover:text-slate-800 dark:hover:text-white';

    const cardAccentStyle = user?.premiumCustomization?.cardAccent ? { backgroundImage: `url(${user.premiumCustomization.cardAccent})` } : {};
    const cardAccentClassName = user?.premiumCustomization?.cardAccent ? 'profile-card-accent' : '';

    return (
        <div className={`ios-glass-final bg-white dark:bg-transparent h-full flex flex-col p-4 transition-all duration-300 ${isExpanded ? 'w-64' : 'w-20'} sticky top-0`}>
            <div className="flex items-center justify-between mb-6 px-2">
                <Tippy
                    placement="right"
                    delay={[300, 0]}
                    render={attrs => <Tooltip text={isExpanded ? 'Свернуть' : 'Развернуть'} attrs={attrs} />}
                >
                    <TippyWrapper>
                        <button onClick={() => setIsExpanded(!isExpanded)} className="p-2 rounded-lg text-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-white/10">
                            <Menu size={20} />
                        </button>
                    </TippyWrapper>
                </Tippy>
                <div className={`transition-all duration-200 ${isExpanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
                    {themeSwitcher}
                </div>
            </div>
            
            <div className="flex-1 flex flex-col justify-between">
                <LayoutGroup>
                    <nav className={`flex flex-col space-y-2 ${isExpanded ? 'px-2' : 'items-center'}`}>
                        <NavItem
                            to="/premium"
                            icon={user?.premium?.isActive ? Crown : Sparkles}
                            text={
                                <span className={user?.premium?.isActive ? 'premium-gradient-text font-bold' : ''}>
                                    {user?.premium?.isActive ? "Мой Premium" : "Flow PREMIUM"}
                                </span>
                            }
                            count={0}
                            isExpanded={isExpanded}
                        />

                        <Tippy
                            disabled={isExpanded}
                            placement="right"
                            delay={[300, 0]}
                            render={attrs => <Tooltip text="Мой профиль" attrs={attrs} />}
                        >
                            <TippyWrapper>
                                <NavLink
                                  to="/profile"
                                  className={({ isActive }) => `
                                    flex items-center transition-colors duration-200
                                    ${getActiveStylesProfile(isActive)}
                                    ${user?.premium?.isActive ? 'p-0.5 premium-gradient-bg rounded-full' : (isExpanded ? '' : 'w-12 h-12 justify-center')}
                                  `}
                                >
                                    {({ isActive }) => (
                                        <div className={`
                                            relative flex items-center w-full transition-colors duration-200 rounded-full overflow-hidden
                                            ${isExpanded ? 'py-2 px-3' : 'w-12 h-12 justify-center'}
                                            ${!isActive && user?.premium?.isActive ? 'bg-slate-50 dark:bg-slate-900' : ''}
                                        `}>
                                            
                                            {isActive && (
                                                <>
                                                    <div 
                                                        className={`absolute inset-0 opacity-15 pointer-events-none ${cardAccentClassName}`}
                                                        style={cardAccentStyle}
                                                    ></div>
                                                    
                                                    {!user?.premium?.isActive && (
                                                        <motion.div
                                                            layoutId="active-indicator"
                                                            className="absolute inset-0 bg-blue-100/80 dark:bg-white/10 rounded-full"
                                                            transition={{ type: 'spring', stiffness: 600, damping: 35, mass: 1 }}
                                                        />
                                                    )}
                                                </>
                                            )}

                                            <div className="relative">
                                                {user ? (
                                                    <Avatar username={user?.username} fullName={user?.fullName} avatarUrl={user?.avatar} size="md" isPremium={user.premium?.isActive} customBorder={user.premiumCustomization?.avatarBorder} />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse"></div>
                                                )}
                                            </div>
                                            <div className={`flex flex-col overflow-hidden transition-all duration-200 ${isExpanded ? 'ml-4' : 'w-0 opacity-0 ml-0'}`}>
                                                {user?.premium?.isActive && (
                                                    <span className="premium-shimmer-text font-bold text-xs uppercase tracking-wider mb-0.5">
                                                        Premium
                                                    </span>
                                                )}
                                                <span className={`text-sm font-semibold truncate ${isActive ? 'text-slate-800 dark:text-white' : 'text-slate-700 dark:text-slate-200'}`}>
                                                    {user?.fullName || user?.username || 'Профиль'}
                                                </span>
                                                <span className={`text-xs transition-colors ${isActive ? 'text-blue-800/70 dark:text-blue-200/80' : 'text-slate-500 dark:text-slate-400'}`}>
                                                    Мой профиль
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </NavLink>
                            </TippyWrapper>
                        </Tippy>
                        
                        {user?.role === 'admin' && (
                            <NavItem
                                to="/admin"
                                icon={Shield}
                                text="Админ-панель"
                                count={summary.submissionsCount} // Используем новое поле
                                isExpanded={isExpanded}
                            />
                        )}

                        {menuItems.map(item => (
                            <NavItem
                                key={item.name}
                                to={item.path}
                                end={item.path === "/"}
                                icon={item.icon}
                                text={item.name}
                                count={item.count}
                                isExpanded={isExpanded}
                            />
                        ))}
                        
                    </nav>
                    
                    <div className={`flex flex-col space-y-2 ${isExpanded ? 'px-2' : 'items-center'}`}>
                        <NavItem
                            to="/settings"
                            icon={Settings}
                            text="Настройки"
                            count={0}
                            isExpanded={isExpanded}
                        />
                    </div>
                </LayoutGroup>
            </div>
            
            <div className={`flex flex-col space-y-2 pt-2 ${isExpanded ? 'px-2' : 'items-center'}`}>
                <Tippy
                    disabled={isExpanded}
                    placement="right"
                    delay={[300, 0]}
                    render={attrs => <Tooltip text="Выйти" attrs={attrs} />}
                >
                    <TippyWrapper>
                        <button 
                          onClick={handleLogout} 
                          className={`
                            flex items-center transition-colors duration-200 relative
                            ${isExpanded ? 'py-2.5 px-3' : 'w-12 h-12 justify-center'}
                            text-red-600 dark:text-red-400 
                            hover:bg-red-100 dark:hover:bg-red-500/20 
                            hover:text-red-700 dark:hover:text-red-300
                            rounded-lg 
                          `}
                        >
                            <LogOut className="w-5 h-5 flex-shrink-0" />
                            <span className={`whitespace-nowrap transition-all duration-200 ${isExpanded ? 'ml-4' : 'w-0 opacity-0 ml-0'}`}>Выйти</span>
                        </button>
                    </TippyWrapper>
                </Tippy>
            </div>
        </div>
    );
};

export default Sidebar;