// frontend/src/components/music/ArtistInfoPanel.jsx

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import Avatar from '../Avatar';
import { useMusicPlayer } from '../../context/MusicPlayerContext';

const ArtistInfoPanel = ({ artist, isOpen, onClose }) => {
    const { currentTrack } = useMusicPlayer();

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 bg-black/60 z-[60]"
                >
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        onClick={(e) => e.stopPropagation()}
                        className={`absolute top-0 right-0 w-full md:w-[420px] bg-slate-100 dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700/50 flex flex-col transition-height duration-300 ${
                            currentTrack ? 'h-[calc(100%-100px)]' : 'h-full'
                        }`}
                    >
                        <header className="flex items-center justify-between p-4 pl-16 md:pl-4 border-b border-slate-200 dark:border-slate-700/50 flex-shrink-0">
                            <h3 className="font-bold text-lg">Об исполнителе</h3>
                            <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"><X size={20} /></button>
                        </header>
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div className="flex flex-col items-center text-center">
                                <Avatar size="2xl" username={artist.name} avatarUrl={artist.avatarUrl} />
                                <h2 className="text-3xl font-bold mt-4">{artist.name}</h2>
                            </div>
                            
                            {artist.description && (
                                <div>
                                    <h4 className="font-semibold mb-2">Описание</h4>
                                    <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap text-sm">
                                        {artist.description}
                                    </p>
                                </div>
                            )}
                            
                            {artist.tags && artist.tags.length > 0 && (
                                <div>
                                    <h4 className="font-semibold mb-2">Теги</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {artist.tags.map(tag => (
                                            <span key={tag} className="px-3 py-1 bg-slate-200 dark:bg-slate-700 text-xs font-semibold rounded-full">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {!artist.description && (!artist.tags || artist.tags.length === 0) && (
                                <p className="text-center text-slate-500 py-10">Информация об исполнителе отсутствует.</p>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default ArtistInfoPanel;