// frontend/src/components/chat/StatsPanel.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, X, Calendar, MessageSquareOff, ChevronsRight, CornerUpLeft, Heart, ImageIcon as ImageIconLucide, Pin } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const StatItem = ({ icon: Icon, label, value }) => (
    <div className="flex items-start space-x-3 p-3 bg-slate-200/50 dark:bg-slate-700/50 rounded-lg">
        <Icon className="w-5 h-5 text-slate-500 dark:text-slate-400 mt-0.5" />
        <div>
            <p className="font-semibold text-slate-800 dark:text-white">{value}</p>
            <p className="text-sm text-slate-600 dark:text-slate-300">{label}</p>
        </div>
    </div>
);

const StatsPanel = ({ stats, loading, onClose }) => {
    return (
        <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute top-0 right-0 h-full w-full md:w-[380px] bg-slate-100 dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700/50 flex flex-col z-20"
        >
            <header className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-700/50 flex-shrink-0">
                <h3 className="font-bold text-lg">Статистика диалога</h3>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"><X size={20} /></button>
            </header>
            <div className="flex-1 overflow-y-auto p-4">
                {loading || !stats ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="animate-spin text-slate-400" />
                    </div>
                ) : (
                    <div className="space-y-3">
                        {/* --- НАЧАЛО ИЗМЕНЕНИЯ --- */}
                        <StatItem icon={Calendar} label="Первое сообщение" value={stats.firstMessageDate ? format(new Date(stats.firstMessageDate), 'd MMMM yyyy в HH:mm', { locale: ru }) : 'Нет'} />
                        <StatItem icon={Calendar} label="Последнее сообщение" value={stats.lastMessageDate ? format(new Date(stats.lastMessageDate), 'd MMMM yyyy в HH:mm', { locale: ru }) : 'Нет'} />
                        {/* --- КОНЕЦ ИЗМЕНЕНИЯ --- */}
                        <StatItem icon={MessageSquareOff} label="Всего сообщений" value={stats.totalMessages} />
                        <StatItem icon={ChevronsRight} label="Отправлено вами" value={stats.sentCount} />
                        <StatItem icon={CornerUpLeft} label="Получено от собеседника" value={stats.receivedCount} />
                        <StatItem icon={Heart} label="Всего реакций" value={stats.reactionsCount} />
                        <StatItem icon={ImageIconLucide} label="Всего фотографий" value={stats.photosCount} />
                        <StatItem icon={Pin} label="Закрепленных сообщений" value={stats.pinnedCount} />
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default StatsPanel;