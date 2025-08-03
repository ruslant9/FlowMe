// frontend/src/components/workshop/PackCard.jsx --- НОВЫЙ ФАЙЛ ---

import React from 'react';
import { motion } from 'framer-motion';

const PackCard = ({ pack, children }) => {
    const isSticker = pack.type === 'sticker';

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="ios-glass-final rounded-2xl p-4 flex flex-col"
        >
            <div className="flex-1 mb-4">
                <h3 className="font-bold text-lg truncate">{pack.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">от {pack.creator.username}</p>
                <div className={`mt-3 grid gap-2 ${isSticker ? 'grid-cols-3' : 'grid-cols-5'}`}>
                    {pack.items.slice(0, isSticker ? 6 : 10).map(item => (
                        <div key={item._id} className="aspect-square bg-slate-200/50 dark:bg-slate-900/50 rounded-md flex items-center justify-center p-1">
                            <img src={item.imageUrl} alt="" className="max-w-full max-h-full object-contain" />
                        </div>
                    ))}
                    {pack.items.length > (isSticker ? 6 : 10) && (
                        <div className="aspect-square bg-slate-200/50 dark:bg-slate-900/50 rounded-md flex items-center justify-center text-slate-500 font-bold">
                            +{pack.items.length - (isSticker ? 6 : 10)}
                        </div>
                    )}
                </div>
            </div>
            <div className="flex items-center justify-end space-x-2">
                {children}
            </div>
        </motion.div>
    );
};

export default PackCard;