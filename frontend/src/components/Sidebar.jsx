// frontend/src/components/Sidebar.jsx

import React, { useState, useEffect, forwardRef, useMemo } from 'react';
import { useNavigate, NavLink, useLocation } from 'react-router-dom';
import Avatar from './Avatar';
import { LogOut, Settings, Users, Newspaper, Menu, MessageSquare, Bell, Globe, Music, Sparkles, Crown, Shield, Brush, X, MoreHorizontal } from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';
import { useUser } from '../hooks/useUser';
import { useNotifications } from '../context/NotificationContext';
import Tippy from '@tippyjs/react/headless';
import { motion, LayoutGroup, AnimatePresence } from 'framer-motion';
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
    const expandedStyles = "py-2 px-3 md:py-2.5"; 
    const collapsedStyles = "w-12 h-12 justify-center";
    
    const getActiveStyles = (isActive) => isActive 
        ? 'text-blue-600 dark:text-white font-semibold'
        : 'text-slate-600 dark:text-white/60 hover:text-slate-800 dark:hover:text-white';

    const textContent = typeof text === 'string' ? <span>{text}</span> : text;

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
                            <div className={`whitespace-nowrap transition-all duration-200 ${isExpanded ? 'ml-4' : 'w-0 opacity-0 ml-0'}`}>{textContent}</div>
                        </>
                    )}
                </NavLink>
            </TippyWrapper>
        </Tippy>
    );
};

const FullScreenNav = ({ isOpen, onClose, navItems, user, summary, isExpanded }) => {
    const location = useLocation();

    useEffect(() => {
        if (isOpen) {
            onClose();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.pathname]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 bg-black/60 z-[100] md:hidden"
                >
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", stiffness: 400, damping: 40 }}
                        onClick={(e) => e.stopPropagation()}
                        className="absolute bottom-0 left-0 right-0 bg-slate-100 dark:bg-slate-900 rounded-t-3xl p-4 flex flex-col"
                        style={{ height: 'calc(var(--vh, 1vh) * 75)' }}
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Навигация</h2>
                            <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10"><X /></button>
                        </div>
                        <nav className="flex-1 overflow-y-auto space-y-2">
                            <NavItem
                                to="/premium"
                                icon={user?.premium?.isActive ? Crown : Sparkles}
                                text={<span className={user?.premium?.isActive ? 'premium-gradient-text font-bold' : ''}>{user?.premium?.isActive ? "Мой Premium" : "Flow PREMIUM"}</span>}
                                count={0}
                                isExpanded={true}
                            />
                            {navItems.map(item => (
                                <NavItem
                                    key={item.name}
                                    to={item.path}
                                    end={item.path === "/"}
                                    icon={item.icon}
                                    text={item.name}
                                    count={item.count}
                                    isExpanded={true}
                                />
                            ))}
                        </nav>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

const Sidebar = ({ themeSwitcher, isMobileNavOpen, onMobileNavClose }) => {
    const [isExpanded, setIsExpanded] = useState(localStorage.getItem('sidebarExpanded') !== 'false');
    const navigate = useNavigate();
    const location = useLocation();
    
    const { stopAndClearPlayer } = useMusicPlayer();
    const { logout } = useWebSocket(); 
    const { currentUser: user } = useUser();
    const { summary } = useNotifications();
    const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

    const handleLogout = () => {
        stopAndClearPlayer();
        logout();
        navigate('/login');
    };

    useEffect(() => {
        localStorage.setItem('sidebarExpanded', isExpanded);
    }, [isExpanded]);

    useEffect(() => {
        if (isMobileNavOpen) {
            onMobileNavClose();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.pathname]);
    
    const menuItems = useMemo(() => [
        { name: "Лента", path: "/", icon: Newspaper, count: 0 },
        { name: "Друзья", path: "/friends", icon: Users, count: summary.friendRequestsCount },
        { name: "Сообщения", path: "/messages", icon: MessageSquare, count: summary.unreadConversationsCount },
        { name: "Сообщества", path: "/communities", icon: Globe, count: 0 },
        { name: "Уведомления", path: "/notifications", icon: Bell, count: summary.unreadNotificationsCount },
        { name: "Музыка", path: "/music", icon: Music, count: 0 },
        { name: "Мастерская", path: "/workshop", icon: Brush, count: 0 },
    ], [summary]);

    const allNavItems = useMemo(() => [
        ...menuItems,
        ...(user?.role === 'admin' ? [{ name: "Админ-панель", path: "/admin", icon: Shield, count: summary.submissionsCount }] : [])
    ], [user, summary, menuItems]);
    
    const NAV_ITEM_LIMIT = 7;
    const shouldTruncate = allNavItems.length > NAV_ITEM_LIMIT;
    const visibleNavItems = shouldTruncate ? allNavItems.slice(0, NAV_ITEM_LIMIT - 1) : allNavItems;
    
    const getActiveStylesProfile = (isActive) => isActive 
        ? 'text-slate-800 dark:text-white'
        : 'text-slate-600 dark:text-white/60 hover:text-slate-800 dark:hover:text-white';

    const cardAccentStyle = user?.premiumCustomization?.cardAccent ? { backgroundImage: `url(${user.premiumCustomization.cardAccent})` } : {};
    const cardAccentClassName = user?.premiumCustomization?.cardAccent ? 'profile-card-accent' : '';

    return (
        <>
            <AnimatePresence>
                {isMobileNavOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onMobileNavClose}
                        className="md:hidden fixed inset-0 bg-black/60 z-30"
                    />
                )}
            </AnimatePresence>

            <FullScreenNav
                isOpen={isMoreMenuOpen}
                onClose={() => setIsMoreMenuOpen(false)}
                navItems={allNavItems}
                user={user}
                summary={summary}
                isExpanded={isExpanded || isMobileNavOpen}
            />

            <div className={`
                h-full flex flex-col transition-all duration-300
                fixed inset-y-0 left-0 z-40 transform 
                md:sticky md:translate-x-0
                ${isMobileNavOpen ? 'translate-x-0' : '-translate-x-full'}
                ${isExpanded ? 'w-64' : 'md:w-20'}
            `}>
                <div className="ios-glass-final h-full flex flex-col p-4 relative">
                    <button onClick={onMobileNavClose} className="absolute top-4 left-4 p-2 rounded-lg text-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-white/10 md:hidden z-10">
                        <X size={20} />
                    </button>
                    
                    <div className="flex items-center justify-between mb-6">
                        <Tippy
                            placement="right"
                            delay={[300, 0]}
                            render={attrs => <Tooltip text={isExpanded ? 'Свернуть' : 'Развернуть'} attrs={attrs} />}
                        >
                            <TippyWrapper>
                                <button onClick={() => setIsExpanded(!isExpanded)} className="p-2 rounded-lg text-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-white/10 hidden md:block">
                                    <Menu size={20} />
                                </button>
                            </TippyWrapper>
                        </Tippy>
                        
                        <div className={`transition-all duration-200 ${isExpanded || isMobileNavOpen ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
                            {themeSwitcher}
                        </div>
                    </div>
                    
                    <div className="flex-1 flex flex-col min-h-0">
                        <LayoutGroup>
                            <nav className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden -mr-4 pr-4 space-y-2 ${isExpanded || isMobileNavOpen ? 'px-2' : 'items-center flex flex-col'}`}>
                                <NavItem
                                    to="/premium"
                                    icon={user?.premium?.isActive ? Crown : Sparkles}
                                    text={
                                        <div className="flex items-center">
                                            <span className={`text-sm ${user?.premium?.isActive ? 'premium-gradient-text font-bold' : ''}`}>
                                                {user?.premium?.isActive ? "Мой Premium" : "Flow PREMIUM"}
                                            </span>
                                            {!(user?.premium?.isActive) && (isExpanded || isMobileNavOpen) && (
                                                <span className="ml-2 px-1.5 py-0.5 text-[10px] font-semibold bg-yellow-400 text-yellow-900 rounded-full animate-pulse">
                                                    Купить
                                                </span>
                                            )}
                                        </div>
                                    }
                                    count={0}
                                    isExpanded={isExpanded || isMobileNavOpen}
                                />

                                <Tippy disabled={isExpanded || isMobileNavOpen} placement="right" delay={[300, 0]} render={attrs => <Tooltip text="Мой профиль" attrs={attrs} />}>
                                    <TippyWrapper>
                                        <div className="my-2">
                                            <NavLink to="/profile" className={({ isActive }) => `flex items-center transition-colors duration-200 ${getActiveStylesProfile(isActive)} ${(isExpanded || isMobileNavOpen) ? (user?.premium?.isActive ? 'p-0.5 premium-gradient-bg rounded-full' : '') : 'w-12 h-12 justify-center'}`}>
                                                {({ isActive }) => (
                                                    <div className={`relative flex items-center w-full transition-colors duration-200 rounded-full overflow-hidden ${isExpanded || isMobileNavOpen ? 'py-2 px-3 md:py-2.5' : 'w-12 h-12 justify-center'} ${!isActive && user?.premium?.isActive ? 'bg-slate-50 dark:bg-slate-900' : ''}`}>
                                                        {isActive && (<>
                                                            <div className={`absolute inset-0 opacity-15 pointer-events-none ${cardAccentClassName}`} style={cardAccentStyle}></div>
                                                            {!user?.premium?.isActive && (<motion.div layoutId="active-indicator" className="absolute inset-0 bg-blue-100/80 dark:bg-white/10 rounded-full" transition={{ type: 'spring', stiffness: 600, damping: 35, mass: 1 }}/>)}
                                                        </>)}
                                                        <div className="relative">
                                                            {user ? (<Avatar username={user?.username} fullName={user?.fullName} avatarUrl={user?.avatar} size="md" isPremium={user.premium?.isActive} customBorder={user.premiumCustomization?.avatarBorder} />) : (<div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse"></div>)}
                                                        </div>
                                                        <div className={`flex flex-col overflow-hidden transition-all duration-200 ${isExpanded || isMobileNavOpen ? 'ml-4' : 'w-0 opacity-0 ml-0'}`}>
                                                            {user?.premium?.isActive && (<span className="premium-shimmer-text font-bold text-xs uppercase tracking-wider mb-0.5">Premium</span>)}
                                                            <span className={`text-sm font-semibold truncate ${isActive ? 'text-slate-800 dark:text-white' : 'text-slate-700 dark:text-slate-200'}`}>{user?.fullName || user?.username || 'Профиль'}</span>
                                                            <span className={`text-xs transition-colors ${isActive ? 'text-blue-800/70 dark:text-blue-200/80' : 'text-slate-500 dark:text-slate-400'}`}>Мой профиль</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </NavLink>
                                        </div>
                                    </TippyWrapper>
                                </Tippy>
                                
                                <div className="hidden md:flex md:flex-col md:space-y-2">
                                    {allNavItems.map(item => (
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
                                </div>
                                
                                <div className="md:hidden flex flex-col space-y-2">
                                    {visibleNavItems.map(item => (
                                        <NavItem
                                            key={item.name}
                                            to={item.path}
                                            end={item.path === "/"}
                                            icon={item.icon}
                                            text={item.name}
                                            count={item.count}
                                            isExpanded={isMobileNavOpen}
                                        />
                                    ))}
                                    {shouldTruncate && (
                                        <button
                                            onClick={() => setIsMoreMenuOpen(true)}
                                            className="flex items-center transition-colors duration-200 relative text-slate-600 dark:text-white/60 hover:text-slate-800 dark:hover:text-white py-2 px-3 md:py-2.5"
                                        >
                                            <MoreHorizontal className="w-5 h-5 flex-shrink-0" />
                                            <span className="whitespace-nowrap transition-all duration-200 ml-4">Ещё</span>
                                        </button>
                                    )}
                                </div>
                            </nav>
                        </LayoutGroup>
                    </div>
                    
                    <div className="flex-shrink-0 pt-2">
                        <LayoutGroup>
                            <div className={`flex flex-col space-y-2 ${isExpanded || isMobileNavOpen ? 'px-2' : 'items-center'}`}>
                                <NavItem
                                    to="/settings"
                                    icon={Settings}
                                    text="Настройки"
                                    count={0}
                                    isExpanded={isExpanded || isMobileNavOpen}
                                />
                            </div>
                            <div className={`flex flex-col space-y-2 pt-2 ${isExpanded || isMobileNavOpen ? 'px-2' : 'items-center'}`}>
                                <Tippy disabled={isExpanded || isMobileNavOpen} placement="right" delay={[300, 0]} render={attrs => <Tooltip text="Выйти" attrs={attrs} />}>
                                    <TippyWrapper>
                                        <button onClick={handleLogout} className={`flex items-center transition-colors duration-200 relative w-full ${isExpanded || isMobileNavOpen ? 'py-2 px-3 md:py-2.5' : 'w-12 h-12 justify-center'} text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 hover:text-red-700 dark:hover:text-red-300 rounded-lg`}>
                                            <LogOut className="w-5 h-5 flex-shrink-0" />
                                            <span className={`whitespace-nowrap transition-all duration-200 ${isExpanded || isMobileNavOpen ? 'ml-4' : 'w-0 opacity-0 ml-0'}`}>Выйти</span>
                                        </button>
                                    </TippyWrapper>
                                </Tippy>
                            </div>
                        </LayoutGroup>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Sidebar;