// frontend/src/components/chat/ChatCalendarPanel.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, X } from 'lucide-react';
import DatePicker, { registerLocale } from 'react-datepicker';
import { ru } from 'date-fns/locale';

registerLocale('ru', ru);

const ChatCalendarPanel = ({ datesWithMessages, loading, onClose, onDateSelect }) => {
    
    const highlightedDates = datesWithMessages.map(dateStr => new Date(dateStr));

    const isDayWithMessages = (date) => {
        const dateStr = date.toISOString().split('T')[0];
        // datepicker передает время в локальном часовом поясе, а наш массив в UTC,
        // поэтому нужно проверять и соседние дни на всякий случай, чтобы избежать ошибок с часовыми поясами.
        const dateToCheck = new Date(dateStr);
        const prevDay = new Date(dateToCheck);
        prevDay.setDate(dateToCheck.getDate() - 1);
        const nextDay = new Date(dateToCheck);
        nextDay.setDate(dateToCheck.getDate() + 1);

        const dateStringsToCheck = [
            prevDay.toISOString().split('T')[0],
            dateStr,
            nextDay.toISOString().split('T')[0]
        ];
        
        return datesWithMessages.some(d => dateStringsToCheck.includes(d));
    };

    return (
        <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute top-0 right-0 h-full w-full md:w-[380px] bg-slate-100 dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700/50 flex flex-col z-20"
        >
            <header className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-700/50 flex-shrink-0">
                <h3 className="font-bold text-lg">Календарь сообщений</h3>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"><X size={20} /></button>
            </header>
            <div className="flex-1 overflow-y-auto p-2 flex justify-center items-start">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="animate-spin text-slate-400" />
                    </div>
                ) : (
                    <div>
                        <DatePicker
                            selected={null}
                            onChange={onDateSelect}
                            inline
                            locale="ru"
                            highlightDates={highlightedDates}
                            filterDate={isDayWithMessages}
                            dayClassName={(date) => isDayWithMessages(date) ? 'has-messages' : undefined}
                        />
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default ChatCalendarPanel;