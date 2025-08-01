// frontend/src/components/NotificationSendersList.jsx

import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Avatar from './Avatar';
import Tippy from '@tippyjs/react';

// Убираем API_URL
// const API_URL = import.meta.env.VITE_API_URL;

const NotificationSendersList = ({ senders, attrs }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="ios-glass-popover p-2 rounded-xl shadow-lg w-48 text-slate-900 dark:text-white"
            {...attrs}
        >
            <p className="text-sm font-bold mb-2">Кто это?</p>
            <div className="flex flex-col space-y-1">
                {senders.map(sender => {
                    const userName = sender.fullName || sender.username;
                    return (
                        <Tippy key={sender._id} content={userName} placement="right" delay={[100, 50]}>
                            <Link 
                                to={`/profile/${sender._id}`} 
                                className="flex items-center space-x-2 hover:bg-slate-100/50 dark:hover:bg-white/5 rounded-md p-1 -mx-1"
                                onClick={e => e.stopPropagation()}
                            >
                                {/* --- ИЗМЕНЕНИЕ --- */}
                                <Avatar username={sender.username} fullName={sender.fullName} avatarUrl={sender.avatar} size="sm" />
                                {/* --- КОНЕЦ ИЗМЕНЕНИЯ --- */}
                                <span className="text-sm truncate">{userName}</span>
                            </Link>
                        </Tippy>
                    );
                })}
            </div>
            <div className="tippy-arrow" data-popper-arrow></div>
        </motion.div>
    );
};

export default NotificationSendersList;