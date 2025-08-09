// frontend/src/components/chat/SystemMessage.jsx

import React, { forwardRef, useState, useRef } from 'react'; // 1. ИМПОРТИРУЕМ useState и useRef
import { Pin, MoreHorizontal, Trash2 } from 'lucide-react';
import { useModal } from '../../hooks/useModal';
import Tippy from '@tippyjs/react/headless';

const TippyWrapper = forwardRef((props, ref) => {
    return (
        <button ref={ref} {...props}>
            {props.children}
        </button>
    );
});
TippyWrapper.displayName = 'TippyWrapper';

const SystemMessage = ({ message, onPerformDelete, onToggleMenu, openMenuId, selectionMode }) => {
    const { showConfirmation } = useModal();
    const isMenuOpen = openMenuId === message._id;

    // --- НАЧАЛО ИСПРАВЛЕНИЯ ---
    const menuButtonRef = useRef(null);
    const [menuPosition, setMenuPosition] = useState('bottom');

    const handleMenuClick = (e) => {
        e.stopPropagation();
        if (menuButtonRef.current) {
            const rect = menuButtonRef.current.getBoundingClientRect();
            // Если до низа экрана меньше 150px, открываем вверх
            if (window.innerHeight - rect.bottom < 150) {
                setMenuPosition('top');
            } else {
                setMenuPosition('bottom');
            }
        }
        onToggleMenu(isMenuOpen ? null : message._id);
    };
    // --- КОНЕЦ ИСПРАВЛЕНИЯ ---


    const getIcon = () => {
        const text = message.text.toLowerCase();
        if (text.includes('закрепил') || text.includes('открепил')) {
            return <Pin size={12} className="mr-2 flex-shrink-0" />;
        }
        return null;
    };

    const renderMessageText = () => {
        const parts = message.text.split(/: (.+)/);
        if (parts.length > 1) {
            const actionText = parts[0];
            const quotedText = parts[1];
            return (
                <>
                    <span>{actionText}: </span>
                    <span className="italic opacity-80">{quotedText}</span>
                </>
            );
        }
        return <span>{message.text}</span>;
    };

    const handleDeleteRequest = (e) => {
        e.stopPropagation();
        onToggleMenu(null);
        showConfirmation({
            title: "Удалить системное сообщение?",
            message: "Это действие необратимо и удалит сообщение только для вас.",
            onConfirm: () => onPerformDelete([message._id], false),
        });
    };

    return (
        <div className="flex justify-center my-4">
            <div className="relative group inline-flex items-center">
                <div className="flex items-center text-xs font-semibold text-slate-800 dark:text-slate-400 bg-slate-200 dark:bg-slate-700 rounded-full px-3 py-1.5 max-w-sm text-center">
                    {getIcon()}
                    <span className="truncate">{renderMessageText()}</span>
                </div>
                {!selectionMode && (
                    <Tippy
                        interactive
                        // --- ИСПРАВЛЕНИЕ: Используем динамическую позицию ---
                        placement={menuPosition === 'bottom' ? 'bottom-end' : 'top-end'}
                        visible={isMenuOpen}
                        onClickOutside={() => onToggleMenu(null)}
                        popperOptions={{ strategy: 'fixed' }}
                        render={attrs => (
                            <div className="ios-glass-popover w-40 rounded-lg shadow-xl p-1" {...attrs}>
                                <button 
                                    onClick={handleDeleteRequest}
                                    className="w-full text-left flex items-center space-x-3 px-3 py-1.5 text-sm rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                                >
                                <Trash2 size={16}/> <span>Удалить</span>
                                </button>
                                <div className="tippy-arrow" data-popper-arrow></div>
                            </div>
                        )}
                    >
                        <TippyWrapper 
                            // --- ИСПРАВЛЕНИЕ: Привязываем ref и новый обработчик ---
                            ref={menuButtonRef}
                            onClick={handleMenuClick}
                            className="p-1 ml-1 rounded-full text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-200 dark:hover:bg-slate-700"
                        >
                            <MoreHorizontal size={16}/>
                        </TippyWrapper>
                    </Tippy>
                )}
            </div>
        </div>
    );
};

export default SystemMessage;