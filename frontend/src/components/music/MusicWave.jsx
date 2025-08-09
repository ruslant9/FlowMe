// frontend/src/components/music/MusicWave.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { Play } from 'lucide-react';
import { useMusicPlayer } from '../../context/MusicPlayerContext'; // ИМПОРТ

const MusicWave = ({ onPlay }) => {
    const { isPlaying } = useMusicPlayer(); // ПОЛУЧАЕМ СТАТУС ПЛЕЕРА
    const bars = Array.from({ length: 70 }); // --- 1. Увеличиваем количество полосок

    return (
        <motion.div
            onClick={onPlay}
            className="p-6 rounded-3xl cursor-pointer relative overflow-hidden h-44 flex flex-col justify-between"
            style={{
                background: 'linear-gradient(135deg, #1db954 0%, #191414 100%)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.4), 0 0 40px rgba(29,185,84,0.3)'
            }}
            whileHover={{ scale: 1.02 }}
        >
            {/* Свечение */}
            <div className="absolute inset-0">
                <div className="absolute w-72 h-72 bg-green-400/20 rounded-full -top-20 -left-20 blur-3xl" />
                <div className="absolute w-72 h-72 bg-emerald-500/20 rounded-full -bottom-20 -right-20 blur-3xl" />
            </div>

            {/* Волны */}
            <div className="absolute inset-0 flex items-end justify-between px-4 pb-3 pointer-events-none z-0">
                {bars.map((_, i) => (
                    <motion.div
                        key={i}
                        className="bg-white/30 rounded-full"
                        style={{
                            width: '0.6%', // --- 1. Уменьшаем ширину
                            height: `${Math.random() * 50 + 20}%`,
                            margin: '0 0.5px'
                        }}
                        // --- 2. Делаем анимацию зависимой от isPlaying ---
                        animate={{
                            scaleY: isPlaying ? [1, 0.3, 1] : 1, // Анимация, если играет; статичное состояние, если нет
                        }}
                        transition={{
                            duration: Math.random() * 0.5 + 0.7,
                            repeat: isPlaying ? Infinity : 0, // Повторяем только если играет
                            repeatType: 'mirror',
                            ease: 'easeInOut',
                            delay: i * 0.04
                        }}
                    />
                ))}
            </div>

            {/* Текст и кнопка */}
            <div className="relative z-10 flex items-start justify-between">
                <div>
                    <p className="text-white/80 font-medium text-sm tracking-wide">Моя волна</p>
                    <h3 className="text-white text-4xl font-extrabold leading-tight">
                        Поток музыки
                    </h3>
                </div>
                <motion.button
                    className="w-16 h-16 bg-green-500 shadow-lg shadow-green-500/40 rounded-full flex items-center justify-center text-white flex-shrink-0"
                    whileHover={{
                        scale: 1.15,
                        boxShadow: '0 0 25px rgba(29,185,84,0.8)'
                    }}
                    whileTap={{ scale: 0.9 }}
                >
                    <Play size={32} fill="currentColor" />
                </motion.button>
            </div>
        </motion.div>
    );
};

export default MusicWave;