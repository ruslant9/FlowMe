// frontend/src/components/modals/PollVotersModal.jsx

import React from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import Tippy from '@tippyjs/react/headless';
import VotersList from '../VotersList';

const PollVotersModal = ({ isOpen, onClose, poll }) => {
    if (!isOpen || !poll) return null;

    const totalVotes = poll.options.reduce((sum, option) => sum + option.votes.length, 0);

    // --- НАЧАЛО ИЗМЕНЕНИЯ: Создаем функцию для закрытия, которая останавливает всплытие ---
    const handleClose = (e) => {
        e.stopPropagation(); // Это ключ к решению! Останавливаем событие здесь.
        onClose();
    };
    // --- КОНЕЦ ИЗМЕНЕНИЯ ---

    return ReactDOM.createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    // --- ИЗМЕНЕНИЕ: Используем новую функцию handleClose ---
                    onClick={handleClose}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
                >
                    <motion.div
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.9, y: 20 }}
                        onClick={(e) => e.stopPropagation()} // Этот stopPropagation нужен, чтобы клик по самому окну не закрывал его
                        className="ios-glass-final w-full max-w-lg p-6 rounded-3xl flex flex-col text-slate-900 dark:text-white max-h-[80vh]"
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Проголосовавшие ({totalVotes})</h2>
                            {/* --- ИЗМЕНЕНИЕ: Используем новую функцию handleClose и для кнопки-крестика --- */}
                            <button onClick={handleClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10"><X /></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto -mr-2 pr-2 space-y-4">
                            {poll.options.map(option => {
                                const votes = option.votes.length;
                                const percentage = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;
                                
                                return (
                                    <Tippy
                                        key={option._id}
                                        interactive
                                        placement="bottom"
                                        disabled={poll.isAnonymous || votes === 0}
                                        render={attrs => <VotersList voters={option.votes} attrs={attrs} />}
                                    >
                                        <div>
                                            <div className="flex justify-between items-baseline mb-1 text-sm">
                                                <p className="font-semibold break-all">{option.text}</p>
                                                <p className="font-bold text-slate-500 dark:text-slate-400 flex-shrink-0 ml-2">
                                                    {percentage.toFixed(0)}% ({votes})
                                                </p>
                                            </div>
                                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                                                <motion.div
                                                    className="bg-blue-600 h-2.5 rounded-full"
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${percentage}%` }}
                                                    transition={{ duration: 0.5, ease: "easeInOut" }}
                                                />
                                            </div>
                                        </div>
                                    </Tippy>
                                );
                            })}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.getElementById('modal-root')
    );
};

export default PollVotersModal;