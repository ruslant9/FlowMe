// frontend/src/components/AnimatedAccent.jsx
import React from 'react';
import { motion } from 'framer-motion';

const AnimatedAccent = ({ backgroundUrl, emojis }) => {
    const gridStyle = {
        gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))',
        gridTemplateRows: 'repeat(auto-fill, minmax(40px, 1fr))',
    };

    const isColor = backgroundUrl.startsWith('#');
    const gridItemCount = 400;

    return (
        <div 
            className="absolute inset-0 pointer-events-none -z-10 overflow-hidden"
            style={isColor ? { backgroundColor: backgroundUrl } : { backgroundImage: `url(${backgroundUrl})`, backgroundSize: 'cover' }}
        >
            <div className="absolute inset-0 bg-black/10 backdrop-blur-sm"></div>
            
            <motion.div
                className="absolute"
                style={{
                    width: '200%',
                    height: '200%',
                    display: 'grid',
                    ...gridStyle,
                    gap: '20px',
                    padding: '10px'
                }}
                animate={{
                    x: ['0%', '-50%'],
                    y: ['0%', '-50%']
                }}
                transition={{
                    duration: 40,
                    ease: 'linear',
                    repeat: Infinity,
                    repeatType: 'loop'
                }}
            >
                {Array.from({ length: gridItemCount }).map((_, i) => {
                    const emojiUrl = emojis[i % emojis.length];
                    return (
                        <div
                            key={i}
                            className="w-full h-full"
                            style={{
                                backgroundImage: `url(${emojiUrl})`,
                                backgroundSize: 'contain',
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'center',
                                opacity: 0.3 
                            }}
                        />
                    );
                })}
            </motion.div>
        </div>
    );
};

export default AnimatedAccent;