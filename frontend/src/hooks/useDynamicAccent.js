// frontend/src/hooks/useDynamicAccent.js
import { useState, useEffect } from 'react';
import ColorThief from 'colorthief';

// Хелпер-функция для определения, является ли цвет "скучным" (серым, черным, белым)
const isGrayscale = ([r, g, b]) => {
    const saturation = Math.max(r, g, b) - Math.min(r, g, b);
    const luminance = (r + g + b) / 3;
    return saturation < 30 || luminance < 25 || luminance > 230;
};

// Хелпер-функция для определения контрастного цвета текста
const getContrastingTextColor = ([r, g, b]) => {
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#1f2937' : '#FFFFFF'; // slate-800 или белый
};

export const useDynamicAccent = (imageUrl) => {
    const [accent, setAccent] = useState({
        gradient: 'linear-gradient(to bottom, #1f2937, #111827)', // default dark
        dominantColor: '#facc15', // default yellow
        textColor: '#FFFFFF' // default white text
    });

    useEffect(() => {
        const isDarkMode = document.documentElement.classList.contains('dark');

        const defaultAccent = {
            gradient: isDarkMode 
                ? 'linear-gradient(to bottom, #1f2937, #111827)' 
                : 'linear-gradient(to bottom, #e2e8f0, #f1f5f9)',
            dominantColor: isDarkMode ? '#facc15' : '#3b82f6',
            textColor: isDarkMode ? '#FFFFFF' : '#1f2937'
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
                const palette = colorThief.getPalette(img, 8);
                let dominantColor = palette.find(color => !isGrayscale(color)) || palette[0];
                const [r, g, b] = dominantColor;

                if (isDarkMode) {
                    const darkerR = Math.max(0, r - 40);
                    const darkerG = Math.max(0, g - 40);
                    const darkerB = Math.max(0, b - 40);
                    setAccent({
                        gradient: `linear-gradient(to bottom, rgb(${r}, ${g}, ${b}), rgb(${darkerR}, ${darkerG}, ${darkerB}))`,
                        dominantColor: `rgb(${r}, ${g}, ${b})`,
                        textColor: getContrastingTextColor(dominantColor)
                    });
                } else {
                    setAccent({
                        gradient: `linear-gradient(to bottom, rgba(${r}, ${g}, ${b}, 0.3), rgba(${r}, ${g}, ${b}, 0.1))`,
                        dominantColor: `rgb(${r}, ${g}, ${b})`,
                        textColor: '#1f2937' // Почти всегда темный текст для светлого фона
                    });
                }
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