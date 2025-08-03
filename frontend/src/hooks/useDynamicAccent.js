// frontend/src/hooks/useDynamicAccent.js
import { useState, useEffect } from 'react';
import ColorThief from 'colorthief';
const isGrayscale = ([r, g, b]) => {
const saturation = Math.max(r, g, b) - Math.min(r, g, b);
const luminance = (r + g + b) / 3;
return saturation < 35 || luminance < 25 || luminance > 230;
};
const getContrastingTextColor = ([r, g, b]) => {
const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
return luminance > 0.5 ? '#000000' : '#FFFFFF';
};
export const useDynamicAccent = (imageUrl) => {
const [accent, setAccent] = useState({
gradient: 'linear-gradient(to bottom, #1f2937, #111827)',
dominantColor: '#facc15',
textColor: '#000000'
});

useEffect(() => {
    const defaultAccent = {
        gradient: 'linear-gradient(to bottom, #1f2937, #111827)',
        dominantColor: '#facc15',
        textColor: '#000000'
    };

    if (!imageUrl) {
        setAccent(defaultAccent);
        return;
    }

    const img = new Image();
    img.crossOrigin = "Anonymous"; 
    
    img.onload = () => {
        try {
            const colorThief = new ColorThief();
            const palette = colorThief.getPalette(img, 10);
            let dominantColor = palette.find(color => !isGrayscale(color));
            if (!dominantColor) {
                dominantColor = palette[0];
            }
            const [r, g, b] = dominantColor;
            const darkerR = Math.max(0, r - 40);
            const darkerG = Math.max(0, g - 40);
            const darkerB = Math.max(0, b - 40);
            const buttonColor = isGrayscale(dominantColor) ? '#facc15' : `rgb(${r}, ${g}, ${b})`;
            const buttonTextColor = isGrayscale(dominantColor) ? '#000000' : getContrastingTextColor(dominantColor);     
            setAccent({
                gradient: `linear-gradient(to bottom, rgb(${r}, ${g}, ${b}), rgb(${darkerR}, ${darkerG}, ${darkerB}))`,
                dominantColor: buttonColor,
                textColor: buttonTextColor
            });
        } catch (e) {
            console.error('Ошибка при извлечении цвета:', e);
            setAccent(defaultAccent);
        }
    };

    img.onerror = () => {
        console.error('Не удалось загрузить изображение для извлечения цвета.');
        setAccent(defaultAccent);
    }

    img.src = imageUrl;

}, [imageUrl]);

return accent;

};