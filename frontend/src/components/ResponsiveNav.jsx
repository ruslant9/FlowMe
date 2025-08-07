import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { MoreHorizontal } from 'lucide-react';
import MorePanel from './MorePanel';

// Универсальный рендер иконки: поддержка и компонентов, и готовых JSX-элементов
const renderIcon = (Icon, props = {}) => {
    return React.isValidElement(Icon)
        ? Icon
        : React.createElement(Icon, props);
};

const NavItem = ({ item, isActive, onClick }) => {
    const commonClasses = `flex flex-col items-center justify-center space-y-1 px-1 py-2 rounded-lg transition-colors text-xs font-medium
      ${isActive
        ? 'text-blue-600 dark:text-blue-400'
        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
      }`;

    // --- НАЧАЛО ИСПРАВЛЕНИЯ: Добавляем flex и items-center для центрирования счётчика ---
    const labelClasses = 'flex items-center space-x-1 text-center text-[11px] leading-tight';
    const countClasses = `px-1.5 py-0.5 rounded-full text-[10px] ${isActive ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300' : 'bg-slate-200 dark:bg-white/10'}`;
    // --- КОНЕЦ ИСПРАВЛЕНИЯ ---

    const icon = renderIcon(item.icon, { size: 22, strokeWidth: isActive ? 2.5 : 2 });
    
    // --- НАЧАЛО ИСПРАВЛЕНИЯ: Добавляем отображение счётчика ---
    const labelContent = (
        <span className={labelClasses}>
            <span>{item.label}</span>
            {typeof item.count === 'number' && item.count > 0 && (
                <span className={countClasses}>
                    {item.count > 9 ? '9+' : item.count}
                </span>
            )}
        </span>
    );
    // --- КОНЕЦ ИСПРАВЛЕНИЯ ---


    if (item.path) {
        return (
            <NavLink to={item.path} className={commonClasses}>
                {icon}
                {labelContent}
            </NavLink>
        );
    }

    if (item.onClick) {
        return (
            <button onClick={onClick} className={commonClasses}>
                {icon}
                {labelContent}
            </button>
        );
    }

    return null;
};

const MoreButton = ({ onClick, isActive }) => (
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
                    const commonClasses = `w-full flex items-center justify-between p-3 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors
              ${isActive ? 'bg-blue-100 dark:bg-blue-500/20 font-semibold' : ''}`;
                    const iconClasses = isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500';
                    const icon = renderIcon(item.icon, { size: 22, className: iconClasses });

                    // --- НАЧАЛО ИСПРАВЛЕНИЯ: Добавляем отображение счётчика в выпадающем меню ---
                    const labelContent = (
                        <div className="flex items-center space-x-4">
                            {icon}
                            <span>{item.label}</span>
                        </div>
                    );

                    const countContent = item.count > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-slate-200 dark:bg-white/10">
                            {item.count > 9 ? '9+' : item.count}
                        </span>
                    );
                    // --- КОНЕЦ ИСПРАВЛЕНИЯ ---


                    if (item.path) {
                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                onClick={() => setIsMorePanelOpen(false)}
                                className={commonClasses}
                            >
                                {labelContent}
                                {countContent}
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
                                {labelContent}
                                {countContent}
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