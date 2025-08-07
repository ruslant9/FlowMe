// frontend/src/components/ResponsiveNav.jsx --- ИСПРАВЛЕННЫЙ ФАЙЛ ---

import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { MoreHorizontal } from 'lucide-react';
import MorePanel from './MorePanel';

// --- НАЧАЛО ИЗМЕНЕНИЯ: Удаляем вспомогательную функцию renderIcon ---
// const renderIcon = ... (УДАЛЕНО)
// --- КОНЕЦ ИЗМЕНЕНИЯ ---

const NavItem = ({ item, isActive, onClick }) => {
    const commonClasses = `flex flex-col items-center justify-center space-y-0.5 px-1 py-1.5 rounded-lg transition-colors text-xs font-medium w-full
      ${isActive
        ? 'text-blue-600 dark:text-blue-400'
        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
      }`;
    
    const labelClasses = 'text-center text-[11px] leading-tight';

    // --- НАЧАЛО ИЗМЕНЕНИЯ: Рендерим иконку напрямую через JSX ---
    const IconComponent = item.icon;
    const icon = <IconComponent size={20} strokeWidth={isActive ? 2.5 : 2} />;
    // --- КОНЕЦ ИЗМЕНЕНИЯ ---

    const count = item.count;
    const formattedCount = count > 9 ? '9+' : count;

    const content = (
        <>
            <div className="relative">
                {icon}
                {count > 0 &&
                    <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full px-1 min-w-[16px] h-[16px] flex items-center justify-center border-2 border-white dark:border-slate-800">
                        {formattedCount}
                    </span>
                }
            </div>
            <span className={labelClasses}>{item.label}</span>
        </>
    );

    const commonProps = {
        className: commonClasses,
        onClick: onClick,
    };
    
    // Используем единый подход для кнопки и ссылки
    const Element = item.path ? NavLink : 'button';
    const elementProps = item.path ? { ...commonProps, to: item.path } : commonProps;

    return <Element {...elementProps}>{content}</Element>;
};

const MoreButton = ({ onClick, isActive }) => (
    <button
        onClick={onClick}
        className={`flex flex-col items-center justify-center space-y-0.5 px-1 py-1.5 rounded-lg transition-colors text-xs font-medium w-full
      ${isActive
            ? 'text-blue-600 dark:text-blue-400'
            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
            }`
        }
    >
        <MoreHorizontal size={20} strokeWidth={isActive ? 2.5 : 2} />
        <span className="text-[11px] leading-tight">Еще</span>
    </button>
);

const ResponsiveNav = ({ items, visibleCount = 3, activePath, activeKey }) => {
    const [isMorePanelOpen, setIsMorePanelOpen] = useState(false);

    const shouldShowMoreButton = items.length > visibleCount;

    const visibleItems = shouldShowMoreButton
        ? items.slice(0, visibleCount - 1)
        : items;

    const hiddenItems = shouldShowMoreButton
        ? items.slice(visibleCount - 1)
        : [];

    const isMoreButtonActive = hiddenItems.some(item =>
        item.path ? item.path === activePath : item.key === activeKey
    );

    return (
        <>
            <div className="w-full max-w-sm mx-auto p-1 bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-around">
                    {visibleItems.map(item => (
                        <NavItem
                            key={item.path || item.key}
                            item={item}
                            isActive={item.path ? activePath === item.path : activeKey === item.key}
                            onClick={item.onClick}
                        />
                    ))}
                    {shouldShowMoreButton && (
                        <MoreButton
                            onClick={() => setIsMorePanelOpen(true)}
                            isActive={isMoreButtonActive}
                        />
                    )} 
                </div>
            </div>

            <MorePanel isOpen={isMorePanelOpen} onClose={() => setIsMorePanelOpen(false)}>
                {hiddenItems.map(item => {
                    const isActive = item.path ? activePath === item.path : activeKey === item.key;
                    const panelItemClasses = `w-full flex items-center space-x-4 p-3 rounded-lg transition-colors text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 ${isActive ? 'bg-blue-100 dark:bg-blue-500/20 font-semibold' : ''}`;
                    
                    // --- НАЧАЛО ИЗМЕНЕНИЯ: Рендерим иконку напрямую через JSX ---
                    const IconComponent = item.icon;
                    const iconClasses = isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500';
                    const icon = <IconComponent size={22} className={iconClasses} />;
                    // --- КОНЕЦ ИЗМЕНЕНИЯ ---

                    const handleClick = () => {
                        if (item.onClick) item.onClick();
                        setIsMorePanelOpen(false);
                    };

                    const Element = item.path ? NavLink : 'button';
                    const props = {
                        key: item.path || item.key,
                        className: panelItemClasses,
                        onClick: handleClick,
                        ...(item.path && { to: item.path })
                    };

                    return <Element {...props}>{icon}<span>{item.label}</span></Element>;
                })}
            </MorePanel>
        </>
    );
};

export default ResponsiveNav;