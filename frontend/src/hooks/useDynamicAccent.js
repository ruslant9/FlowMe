// frontend/src/hooks/useDynamicAccent.js
import { useState, useEffect } from 'react';
import ColorThief from 'colorthief';
export const useDynamicAccent = (imageUrl) => {
const [accent, setAccent] = useState({
gradient: 'linear-gradient(to bottom, #1f2937, #111827)',
dominantColor: '#facc15' // Дефолтный желтый цвет
});

useEffect(() => {
    if (!imageUrl) {
        setAccent({
            gradient: 'linear-gradient(to bottom, #1f2937, #111827)',
            dominantColor: '#facc15'
        });
        return;
    }

    const img = new Image();
    img.crossOrigin = "Anonymous"; 
    
    img.onload = () => {
        try {
            const colorThief = new ColorThief();
            const dominantColor = colorThief.getColor(img);
            const [r, g, b] = dominantColor;

            const darkerR = Math.max(0, r - 40);
            const darkerG = Math.max(0, g - 40);
            const darkerB = Math.max(0, b - 40);

            setAccent({
                gradient: `linear-gradient(to bottom, rgb(${r}, ${g}, ${b}), rgb(${darkerR}, ${darkerG}, ${darkerB}))`,
                dominantColor: `rgb(${r}, ${g}, ${b})`
            });
        } catch (e) {
            console.error('Ошибка при извлечении цвета:', e);
             setAccent({
                gradient: 'linear-gradient(to bottom, #1f2937, #111827)',
                dominantColor: '#facc15'
            });
        }
    };

    img.onerror = () => {
        console.error('Не удалось загрузить изображение для извлечения цвета.');
        setAccent({
            gradient: 'linear-gradient(to bottom, #1f2937, #111827)',
            dominantColor: '#facc15'
        });
    }

    img.src = imageUrl;

}, [imageUrl]);

return accent;

};