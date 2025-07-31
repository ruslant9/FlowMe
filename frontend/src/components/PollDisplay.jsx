// frontend/src/components/PollDisplay.jsx

import React, { useMemo, useState } from 'react';
import { useUser } from '../context/UserContext';
import { motion } from 'framer-motion';
import { Check, Clock, EyeOff } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import PollVotersModal from './modals/PollVotersModal';
import Tippy from '@tippyjs/react/headless'; // --- ИЗМЕНЕНИЕ 1: Меняем тип импорта на headless ---
import 'tippy.js/dist/tippy.css';

const PollDisplay = ({ poll, onVote, isScheduled }) => {
    const { currentUser } = useUser();
    const [isPollModalOpen, setIsPollModalOpen] = useState(false);

    const totalVotes = useMemo(() => {
        if (!poll || !poll.options) return 0;
        return poll.options.reduce((sum, option) => sum + option.votes.length, 0);
    }, [poll]);

    const userVote = useMemo(() => {
        if (!currentUser || !poll || !poll.options) return null;
        for (const option of poll.options) {
            if (option.votes.some(vote => (typeof vote === 'string' ? vote : vote._id) === currentUser._id)) {
                return option._id;
            }
        }
        return null;
    }, [poll, currentUser]);
    
    const isExpired = useMemo(() => {
        return poll.expiresAt && new Date() > new Date(poll.expiresAt);
    }, [poll.expiresAt]);
    
    const handleShowVoters = (e) => {
        e.stopPropagation();
        if (poll.isAnonymous || totalVotes === 0 || !userVote || isScheduled) return;
        setIsPollModalOpen(true);
    };

    return (
        <>
            <PollVotersModal
                isOpen={isPollModalOpen}
                onClose={() => setIsPollModalOpen(false)}
                poll={poll}
            />
            <div className="space-y-3 my-4">
                <h3 className="font-bold text-lg text-slate-800 dark:text-white">{poll.question}</h3>
                <div className="space-y-2">
                    {poll.options.map((option) => {
                        const votes = option.votes.length;
                        const percentage = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;
                        const isVotedByUser = userVote === option._id;
                        const canVote = !userVote && !isExpired && !isScheduled;

                        return (
                            <motion.div
                                key={option._id}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (canVote) {
                                        onVote(option._id);
                                    }
                                }}
                                layout
                                className={`relative p-3 rounded-lg border-2 overflow-hidden transition-all duration-200
                                    ${canVote ? 'cursor-pointer hover:border-blue-500' : 'cursor-default'}
                                    ${isVotedByUser ? 'border-blue-600 bg-blue-500/10 dark:bg-blue-500/20' : 'border-slate-300 dark:border-slate-700'}
                                    ${(isExpired && !userVote) || isScheduled ? 'opacity-70' : ''}
                                `}
                                title={isExpired ? "Опрос завершен" : isScheduled ? "Голосование начнется после публикации" : ""}
                            >
                                <motion.div
                                    className="absolute top-0 left-0 h-full bg-blue-500/20 dark:bg-blue-500/30 -z-10"
                                    initial={{ width: 0 }}
                                    animate={{ width: (userVote || isExpired || isScheduled) ? `${percentage}%` : '0%' }}
                                    transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                                />
                                <div className="relative z-10 flex justify-between items-center">
                                    <div className="flex items-center space-x-2">
                                        {isVotedByUser && <Check className="text-blue-600 dark:text-blue-400 flex-shrink-0" size={18} />}
                                        <span className={`font-semibold break-words ${isVotedByUser ? 'text-blue-800 dark:text-blue-300' : 'text-slate-700 dark:text-slate-200'}`}>
                                            {option.text}
                                        </span>
                                    </div>
                                    {(userVote || isExpired || isScheduled) && (
                                        <span className="text-sm font-bold text-slate-600 dark:text-slate-300 ml-2">
                                            {Math.round(percentage)}%
                                        </span>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
                <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
                    
                    {/* --- ИЗМЕНЕНИЕ 2: Заменяем `content` на `render` --- */}
                    <Tippy
                        disabled={!!userVote || poll.isAnonymous || isScheduled || totalVotes === 0}
                        render={attrs => (
                            <div 
                                className="ios-glass-popover px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-800 dark:text-white"
                                {...attrs}
                            >
                                Сначала проголосуйте, чтобы увидеть результаты
                                <div className="tippy-arrow" data-popper-arrow></div>
                            </div>
                        )}
                    >
                        <span>
                            <button 
                                onClick={handleShowVoters} 
                                className="hover:underline disabled:cursor-default disabled:no-underline" 
                                disabled={!userVote || poll.isAnonymous || isScheduled || totalVotes === 0}
                            >
                                Всего голосов: {totalVotes}
                            </button>
                        </span>
                    </Tippy>
                    
                    {poll.isAnonymous && (
                        <span className="flex items-center"><EyeOff size={14} className="mr-1" /> Анонимный опрос</span>
                    )}
                    {poll.expiresAt && (
                        <span className="flex items-center">
                            <Clock size={14} className="mr-1" />
                            {isExpired ? 'Завершён' : `Завершится ${formatDistanceToNow(new Date(poll.expiresAt), { locale: ru, addSuffix: true })}`}
                        </span>
                    )}
                </div>
            </div>
        </>
    );
};

export default PollDisplay;