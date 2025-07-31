// frontend/src/components/music/MusicWave.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { Play } from 'lucide-react';

const MusicWave = ({ onPlay }) => {
    return (
        <div 
            onClick={onPlay}
            className="p-4 rounded-2xl cursor-pointer bg-gradient-to-br from-green-400 via-cyan-500 to-blue-600 group relative overflow-hidden"
        >
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors"></div>
            <motion.div 
                className="absolute top-0 left-0 w-full h-full opacity-30"
                style={{
                    backgroundImage: 'url(/noise.png)',
                    backgroundSize: '150px'
                }}
                animate={{ x: ['-20%', '20%'], y: ['-20%', '20%'] }}
                transition={{
                    duration: 10,
                    repeat: Infinity,
                    repeatType: 'mirror',
                    ease: 'easeInOut'
                }}
            />
            
            <div className="relative z-10 flex items-center justify-between">
                <div>
                    <p className="text-white font-semibold">Моя волна</p>
                    <h3 className="text-white text-2xl font-bold">Поток музыки</h3>
                </div>
                <motion.button 
                    className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                >
                    <Play size={32} fill="currentColor" />
                </motion.button>
            </div>
        </div>
    );
};

export default MusicWave;