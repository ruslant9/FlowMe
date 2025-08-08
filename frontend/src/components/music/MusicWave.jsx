// frontend/src/components/music/MusicWave.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { Play } from 'lucide-react';

const MusicWave = ({ onPlay }) => {
    const bars = Array.from({ length: 30 });

    return (
        <div 
            onClick={onPlay}
            className="p-6 rounded-2xl cursor-pointer bg-gradient-to-br from-green-400 via-cyan-500 to-blue-600 group relative overflow-hidden h-40 flex flex-col justify-between"
        >
            <div className="absolute inset-0 flex items-end justify-between px-4 pb-2 pointer-events-none z-0">
                {bars.map((_, i) => (
                    <motion.div
                        key={i}
                        className="bg-white/30 rounded-full"
                        style={{ width: '2%', height: `${Math.random() * 60 + 10}%` }}
                        animate={{
                            scaleY: [1, 0.2, 1],
                        }}
                        transition={{
                            duration: Math.random() * 0.5 + 0.8,
                            repeat: Infinity,
                            repeatType: 'mirror',
                            ease: 'easeInOut',
                            delay: Math.random() * 1,
                        }}
                    />
                ))}
            </div>
            
            <div className="relative z-10 flex items-start justify-between">
                <div>
                    <p className="text-white font-semibold">Моя волна</p>
                    <h3 className="text-white text-4xl font-extrabold" style={{ textShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>Поток музыки</h3>
                </div>
                <motion.button 
                    className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white flex-shrink-0"
                    whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.3)' }}
                    whileTap={{ scale: 0.9 }}
                >
                    <Play size={32} fill="currentColor" />
                </motion.button>
            </div>
        </div>
    );
};

export default MusicWave;