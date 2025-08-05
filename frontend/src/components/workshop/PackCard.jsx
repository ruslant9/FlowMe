// frontend/src/components/workshop/PackCard.jsx

import React from 'react';
import { motion } from 'framer-motion';
import { useCachedImage } from '../../hooks/useCachedImage';

const CachedImage = ({ src, alt, className }) => {
    const { finalSrc, loading } = useCachedImage(src);
    if (loading) {
        return <div className={`${className} bg-slate-200/50 dark:bg-slate-900/50 animate-pulse rounded-md`}></div>;
    }
    return <img src={finalSrc} alt={alt} className={className} />;
};

const PackCard = ({ pack, children, onLongPress }) => {
    const isSticker = pack.type === 'sticker';

    let pressTimer;

    const handleMouseDown = () => {
        pressTimer = setTimeout(() => {
            if (onLongPress) {
                onLongPress(pack);
            }
        }, 300);
    };

    const handleMouseUp = () => {
        clearTimeout(pressTimer);
    };

    const handleMouseLeave = () => {
        clearTimeout(pressTimer);
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="ios-glass-final rounded-2xl p-4 flex flex-col select-none cursor-pointer group" // --- ДОБАВЛЯЕМ "group" ---
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleMouseDown}
            onTouchEnd={handleMouseUp}
        >
            <div className="flex-1 mb-4 pointer-events-none">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="font-bold text-lg truncate">{pack.name}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">от {pack.creator.username}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${isSticker ? 'bg-purple-200 dark:bg-purple-800/50 text-purple-800 dark:text-purple-300' : 'bg-yellow-200 dark:bg-yellow-800/50 text-yellow-800 dark:text-yellow-300'}`}>
                        {isSticker ? 'Стикеры' : 'Эмодзи'}
                    </span>
                </div>

                <div className={`mt-3 grid gap-2 ${isSticker ? 'grid-cols-3' : 'grid-cols-5'}`}>
                    {pack.items.slice(0, isSticker ? 6 : 10).map(item => (
                        <div key={item._id} className="aspect-square bg-slate-200/50 dark:bg-slate-900/50 rounded-md flex items-center justify-center p-1">
                            <CachedImage src={item.imageUrl} alt="" className="max-w-full max-h-full object-contain" />
                        </div>
                    ))}
                    {pack.items.length > (isSticker ? 6 : 10) && (
                        <div className="aspect-square bg-slate-200/50 dark:bg-slate-900/50 rounded-md flex items-center justify-center text-slate-500 font-bold">
                            +{pack.items.length - (isSticker ? 6 : 10)}
                        </div>
                    )}
                </div>
            </div>
            
            {/* --- НАЧАЛО ИЗМЕНЕНИЯ --- */}
            <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400 dark:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    Удерживайте для предпросмотра
                </p>
                <div className="flex items-center justify-end space-x-2">
                    {children}
                </div>
            </div>
            {/* --- КОНЕЦ ИЗМЕНЕНИЯ --- */}
        </motion.div>
    );
};

export default PackCard;