// frontend/src/hooks/useDynamicAccent.js
import { useState, useEffect } from 'react';
import ColorThief from 'colorthief';
// --- НАЧАЛО ИСПРАВЛЕНИЯ: Полностью переработанный хук ---
// Хелпер-функция для определения, является ли цвет "скучным" (серым, черным, белым)
const isGrayscale = ([r, g, b]) => {
const saturation = Math.max(r, g, b) - Math.min(r, g, b);
const luminance = (r + g + b) / 3;
return saturation < 25 || luminance < 20 || luminance > 235;
};
// Хелпер-функция для определения контрастного цвета текста
const getContrastingTextColor = ([r, g, b]) => {
const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
return luminance > 0.5 ? '#000000' : '#FFFFFF';
};
export const useDynamicAccent = (imageUrl) => {
const [accent, setAccent] = useState({
gradient: 'linear-gradient(to bottom, #1f2937, #111827)',
dominantColor: '#facc15', // Дефолтный желтый цвет
textColor: '#000000' // Дефолтный черный для кнопки
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
            const palette = colorThief.getPalette(img, 8); // Берем больше цветов для анализа

            // Ищем первый "нескучный" цвет в палитре
            let dominantColor = palette.find(color => !isGrayscale(color));

            // Если все цвета в палитре серые/черные/белые, берем первый (самый доминирующий)
            if (!dominantColor) {
                dominantColor = palette[0];
            }

            const [r, g, b] = dominantColor;

            const darkerR = Math.max(0, r - 40);
            const darkerG = Math.max(0, g - 40);
            const darkerB = Math.max(0, b - 40);
            
            // Если доминирующий цвет - серый, оставляем кнопку желтой для акцента
            const buttonColor = isGrayscale(dominantColor) ? '#facc15' : `rgb(${r}, ${g}, ${b})`;
            const buttonTextColor = isGrayscale(dominantColor) ? '#000000' : getContrastingTextColor(dominantColor);
            
            setAccent({
                gradient: `linear-gradient(to bottom, rgb(${r}, ${g}, ${b}), rgb(${darkerR}, ${darkerG}, ${darkerB}))`,
                dominantColor: buttonColor,
                textColor: buttonTextColor
            });

        } catch (e) {
            console.error('Ошибка при извлечении цвета:', e);
            setAccent(defaultAccent); // Fallback
        }
    };

    img.onerror = () => {
        console.error('Не удалось загрузить изображение для извлечения цвета.');
        setAccent(defaultAccent); // Fallback
    }

    img.src = imageUrl;

}, [imageUrl]);

return accent;
};