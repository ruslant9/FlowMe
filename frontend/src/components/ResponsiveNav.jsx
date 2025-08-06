// frontend/src/components/ResponsiveNav.jsx --- ИСПРАВЛЕННЫЙ ФАЙЛ ---

import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { MoreHorizontal } from 'lucide-react';
import MorePanel from './MorePanel';

// Компонент для элемента навигации (может быть ссылкой или кнопкой)
const NavItem = ({ item, isActive, onClick }) => {
    // --- ИЗМЕНЕНИЕ: Убран flex-1, уменьшен горизонтальный padding (p-2 -> px-1 py-2) ---
    const commonClasses = `flex flex-col items-center justify-center space-y-1 px-1 py-2 rounded-lg transition-colors text-xs font-medium
      ${isActive
        ? 'text-blue-600 dark:text-blue-400'
        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
      }`;
    
    const labelClasses = 'text-center text-[11px] leading-tight';

    if (item.path) {
        return (
            <NavLink to={item.path} className={commonClasses}>
                <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                <span className={labelClasses}>{item.label}</span>
            </NavLink>
        );
    }

    if (item.onClick) {
        return (
            <button onClick={onClick} className={commonClasses}>
                <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                <span className={labelClasses}>{item.label}</span>
            </button>
        );
    }

    return null;
};

// Компонент для кнопки "Еще"
const MoreButton = ({ onClick, isActive }) => (
    // --- ИЗМЕНЕНИЕ: Убран flex-1, уменьшен горизонтальный padding (p-2 -> px-1 py-2) ---
    <button
        onClick={onClick}
        className={`flex flex-col items-center justify-center space-y-1 px-1 py-2 rounded-lg transition-colors text-xs font-medium
      ${isActive
            ? 'text-blue-600 dark:text-blue-400'
            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
            }`
        }
    >
        <MoreHorizontal size={22} strokeWidth={isActive ? 2.5 : 2} />
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
            <div className="w-full max-w-sm mx-auto p-2 bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700">
                {/* --- ИЗМЕНЕНИЕ: justify-around заменен на justify-evenly для лучшего распределения --- */}
                <div className="flex items-center justify-evenly">
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
                    const commonClasses = `w-full flex items-center space-x-4 p-3 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors
              ${isActive ? 'bg-blue-100 dark:bg-blue-500/20 font-semibold' : ''}
            `;
                    const iconClasses = isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500';

                    if (item.path) {
                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                onClick={() => setIsMorePanelOpen(false)}
                                className={commonClasses}
                            >
                                <item.icon size={22} className={iconClasses} />
                                <span>{item.label}</span>
                            </NavLink>
                        );
                    }

                    if (item.onClick) {
                        return (
                            <button
                                key={item.key}
                                onClick={() => {
                                    item.onClick();
                                    setIsMorePanelOpen(false);
                                }}
                                className={commonClasses}
                            >
                                <item.icon size={22} className={iconClasses} />
                                <span>{item.label}</span>
                            </button>
                        );
                    }
                    return null;
                })}
            </MorePanel>
        </>
    );
};

export default ResponsiveNav;