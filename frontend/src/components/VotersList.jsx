// frontend/src/components/VotersList.jsx

import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Avatar from './Avatar';

const VotersList = ({ voters, attrs }) => {
    if (!voters || voters.length === 0) {
        return null;
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="ios-glass-popover p-2 rounded-xl shadow-lg flex flex-col space-y-1 max-h-48 overflow-y-auto"
            {...attrs}
        >
            {voters.map(user => {
                if (!user?._id) return null;
                return (
                    <Link to={`/profile/${user._id}`} key={user._id} title={user.fullName || user.username} className="flex items-center space-x-2 p-1 -m-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700">
                        <Avatar
                            username={user.username}
                            fullName={user.fullName}
                            avatarUrl={user.avatar}
                            size="sm"
                        />
                        <span className="text-sm text-slate-800 dark:text-white truncate">{user.fullName || user.username}</span>
                    </Link>
                )
            })}
            <div className="tippy-arrow" data-popper-arrow></div>
        </motion.div>
    );
};

export default VotersList;