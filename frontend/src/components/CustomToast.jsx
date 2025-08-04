// frontend/src/components/CustomToast.jsx
import React from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import Avatar from './Avatar';

const CustomToast = ({ t, sender, title, message, link, entityId, type }) => {
    const navigate = useNavigate();

    const handleToastClick = () => {
        const postLinkRegex = /^\/posts\/([a-f\d]{24})$/;
        const match = link.match(postLinkRegex);

        if (match) {
            const postId = match[1];
            const event = new CustomEvent('openPostModal', {
                detail: {
                    postId,
                    highlightCommentId: type && type.includes('comment') ? entityId : null
                }
            });
            window.dispatchEvent(event);
            toast.dismiss(t.id);
        } else {
            navigate(link);
            toast.dismiss(t.id);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={`ios-glass-popover w-full max-w-sm p-4 rounded-xl shadow-lg flex items-start space-x-3 cursor-pointer`}
            onClick={handleToastClick}
        >
            <div className="flex-shrink-0">
                <Avatar
                    username={sender?.username}
                    fullName={sender?.fullName}
                    avatarUrl={sender?.avatar}
                    size="md"
                />
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800 dark:text-white truncate">{title}</p>
                <p className="text-sm text-slate-600 dark:text-white/80 break-words">{message}</p>
            </div>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    toast.dismiss(t.id);
                }}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10"
            >
                <X size={16} />
            </button>
        </motion.div>
    );
};

export default CustomToast;