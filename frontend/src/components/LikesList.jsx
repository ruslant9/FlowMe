// frontend/src/components/LikesList.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Avatar from './Avatar';

const LikesList = ({ likers, attrs, postOwnerId }) => {
    if (!likers || likers.length === 0) {
        return null;
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="ios-glass-popover p-2 rounded-xl shadow-lg flex flex-col space-y-1"
            {...attrs}
        >
            {likers.map(user => {
                if (!user?._id) return null;
                const isPostCreator = user._id === postOwnerId;
                
                // --- НАЧАЛО ИСПРАВЛЕНИЯ ---
                const border = user.premiumCustomization?.avatarBorder;
                const borderClass = border?.type?.startsWith('animated') ? `premium-border-${border.type}` : '';
                // Для маленьких аватаров делаем padding меньше
                const staticBorderStyle = border?.type === 'static' ? { padding: '2px', backgroundColor: border.value } : {};
                // --- КОНЕЦ ИСПРАВЛЕНИЯ ---

                return (
                    <Link to={`/profile/${user._id}`} key={user._id} title={user.fullName || user.username} className="flex items-center space-x-2 p-1 -m-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700">
                        {/* --- НАЧАЛО ИСПРАВЛЕНИЯ --- */}
                        <div 
                            className={`relative rounded-full ${borderClass}`}
                            style={staticBorderStyle}
                        >
                            <Avatar
                                username={user.username}
                                fullName={user.fullName}
                                avatarUrl={user.avatar}
                                size="sm"
                                isPremium={user.premium?.isActive}
                                customBorder={border}
                            />
                        </div>
                        {/* --- КОНЕЦ ИСПРАВЛЕНИЯ --- */}
                        <span className="text-sm text-slate-800 dark:text-white truncate">{user.fullName || user.username}</span>
                        {isPostCreator && (
                            <span className="ml-1 text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300 px-1.5 py-0.5 rounded-full">
                                Автор
                            </span>
                        )}
                    </Link>
                )
            })}
            <div className="tippy-arrow" data-popper-arrow></div>
        </motion.div>
    );
};

export default LikesList;