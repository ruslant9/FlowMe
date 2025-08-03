// frontend/src/hooks/useDynamicAccent.js
import { useState, useEffect } from 'react';
import ColorThief from 'colorthief';

// --- НАЧАЛО ИСПРАВЛЕНИЯ: Улучшенная функция для фильтрации "грязных" и серых цветов ---
const isUnwantedColor = ([r, g, b]) => {
    // Рассчитываем насыщенность и яркость
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const saturation = (max - min) / max;
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // Отфильтровываем слишком темные, слишком светлые и ненасыщенные (сероватые/коричневатые) цвета
    if (luminance < 0.15 || luminance > 0.9) return true; // Слишком темный или светлый
    if (saturation < 0.35) return true; // Низкая насыщенность (серый)
    
    // Фильтруем специфичные "грязные" оттенки
    if (r > 100 && g > 80 && b < 80 && Math.abs(r - g) < 40) return true; // Грязно-оранжевый/коричневый

    return false;
};
// --- КОНЕЦ ИСПРАВЛЕНИЯ ---

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

                // --- НАЧАЛО ИСПРАВЛЕНИЯ: Находим первый "хороший" цвет в палитре ---
                let dominantColor = palette.find(color => !isUnwantedColor(color));
                if (!dominantColor) {
                    // Если все цвета отфильтровались, берем самый первый из палитры
                    dominantColor = palette[0];
                }
                // --- КОНЕЦ ИСПРАВЛЕНИЯ ---

                const [r, g, b] = dominantColor;
                const darkerR = Math.max(0, r - 40);
                const darkerG = Math.max(0, g - 40);
                const darkerB = Math.max(0, b - 40);
                
                const buttonColor = isUnwantedColor(dominantColor) ? '#facc15' : `rgb(${r}, ${g}, ${b})`;
                const buttonTextColor = isUnwantedColor(dominantColor) ? '#000000' : getContrastingTextColor(dominantColor);
                
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