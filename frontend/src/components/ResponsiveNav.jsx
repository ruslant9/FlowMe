import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { MoreHorizontal } from 'lucide-react';
import MorePanel from './MorePanel';

// Компонент для отдельной кнопки навигации
const NavItem = ({ path, icon: Icon, label, isActive }) => (
  <NavLink
    to={path}
    className={`flex-1 flex flex-col items-center justify-center space-y-1 p-2 rounded-lg transition-colors text-xs font-medium
      ${isActive
        ? 'text-blue-600 dark:text-blue-400'
        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
      }`
    }
  >
    <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
    <span>{label}</span>
  </NavLink>
);

// Компонент для кнопки "Еще"
const MoreButton = ({ onClick, isActive }) => (
  <button
    onClick={onClick}
    className={`flex-1 flex flex-col items-center justify-center space-y-1 p-2 rounded-lg transition-colors text-xs font-medium
      ${isActive
        ? 'text-blue-600 dark:text-blue-400'
        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
      }`
    }
  >
    <MoreHorizontal size={22} strokeWidth={isActive ? 2.5 : 2} />
    <span>Еще</span>
  </button>
);


const ResponsiveNav = ({ items, visibleCount = 3, activePath }) => {
  const [isMorePanelOpen, setIsMorePanelOpen] = useState(false);

  // Определяем, какие кнопки будут видимыми, а какие скрытыми
  const shouldShowMoreButton = items.length > visibleCount;
  
  const visibleItems = shouldShowMoreButton
    ? items.slice(0, visibleCount - 1)
    : items;
    
  const hiddenItems = shouldShowMoreButton
    ? items.slice(visibleCount - 1)
    : [];
    
  // Проверяем, активна ли одна из скрытых кнопок. Если да, подсвечиваем кнопку "Еще".
  const isMoreButtonActive = hiddenItems.some(item => item.path === activePath);

  return (
    <>
      <div className="w-full max-w-sm mx-auto p-2 bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-around space-x-2">
          {/* Отображаем видимые кнопки */}
          {visibleItems.map(item => (
            <NavItem
              key={item.path}
              path={item.path}
              icon={item.icon}
              label={item.label}
              isActive={activePath === item.path}
            />
          ))}

          {/* Отображаем кнопку "Еще", если есть скрытые элементы */}
          {shouldShowMoreButton && (
            <MoreButton
              onClick={() => setIsMorePanelOpen(true)}
              isActive={isMoreButtonActive}
            />
          )}
        </div>
      </div>
      
      {/* Панель со скрытыми кнопками */}
      <MorePanel isOpen={isMorePanelOpen} onClose={() => setIsMorePanelOpen(false)}>
        {hiddenItems.map(item => (
          // Здесь используем Link, а не NavLink, для простоты
          <Link
            key={item.path}
            to={item.path}
            onClick={() => setIsMorePanelOpen(false)} // Закрываем панель при клике
            className={`w-full flex items-center space-x-4 p-3 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors
              ${activePath === item.path ? 'bg-blue-100 dark:bg-blue-500/20 font-semibold' : ''}
            `}
          >
            <item.icon size={22} className={activePath === item.path ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'} />
            <span>{item.label}</span>
          </Link>
        ))}
      </MorePanel>
    </>
  );
};

export default ResponsiveNav;