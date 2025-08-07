// frontend/src/components/music/ArtistInfoPanel.jsx

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowLeft } from 'lucide-react';
import Avatar from '../Avatar';
import { useMusicPlayer } from '../../context/MusicPlayerContext';

// --- НАЧАЛО ИСПРАВЛЕНИЯ 1: Кастомный хук для определения размера экрана ---
// Этот хук позволяет компоненту реагировать на изменения ширины окна браузера.
const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    window.addEventListener('resize', listener);
    return () => window.removeEventListener('resize', listener);
  }, [matches, query]);

  return matches;
};
// --- КОНЕЦ ИСПРАВЛЕНИЯ 1 ---


const ArtistInfoPanel = ({ artist, isOpen, onClose }) => {
    const { currentTrack } = useMusicPlayer();
    // --- НАЧАЛО ИСПРАВЛЕНИЯ 2: Используем хук для определения мобильного устройства ---
    const isMobile = useMediaQuery('(max-width: 768px)');
    // --- КОНЕЦ ИСПРАВЛЕНИЯ 2 ---

    // Общий контент, который будет использоваться как в мобильной, так и в десктопной версии
    const PanelContent = () => (
        <div className="flex-1 overflow-y-auto p-6 space-y-6 overscroll-contain">
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
    );

    // --- НАЧАЛО ИСПРАВЛЕНИЯ 3: Условный рендеринг в зависимости от размера экрана ---
    return (
        <AnimatePresence>
            {isOpen && (
                isMobile ? (
                    // Мобильная версия: полноэкранный блок
                    <motion.div
                        key="mobile-panel"
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', stiffness: 400, damping: 40 }}
                        className={`fixed inset-0 bg-slate-100 dark:bg-slate-800 z-[60] flex flex-col ${
                            currentTrack ? 'h-[calc(100%-100px)]' : 'h-full'
                        }`}
                    >
                        <header className="flex items-center p-4 border-b border-slate-200 dark:border-slate-700/50 flex-shrink-0">
                            <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
                                <ArrowLeft size={20} />
                            </button>
                            <h3 className="font-bold text-lg mx-auto">Об исполнителе</h3>
                            <div className="w-9 h-9"></div> {/* Пустой div для центрирования заголовка */}
                        </header>
                        <PanelContent />
                    </motion.div>
                ) : (
                    // Десктопная версия: боковая панель
                    <motion.div
                        key="desktop-panel"
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
                            className={`absolute top-0 right-0 w-full md:w-[420px] bg-slate-100 dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700/50 flex flex-col ${
                                currentTrack ? 'h-[calc(100%-100px)]' : 'h-full'
                            }`}
                        >
                            <header className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700/50 flex-shrink-0">
                                <h3 className="font-bold text-lg">Об исполнителе</h3>
                                <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"><X size={20} /></button>
                            </header>
                            <PanelContent />
                        </motion.div>
                    </motion.div>
                )
            )}
        </AnimatePresence>
    );
    // --- КОНЕЦ ИСПРАВЛЕНИЯ 3 ---
};

export default ArtistInfoPanel;