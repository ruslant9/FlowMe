// frontend/src/hooks/useDynamicAccent.js
import { useState, useEffect } from 'react';
import ColorThief from 'colorthief';

export const useDynamicAccent = (imageUrl) => {
    const [gradient, setGradient] = useState('linear-gradient(to bottom, #1f2937, #111827)'); // Default gradient

    useEffect(() => {
        if (!imageUrl) {
            // Если URL нет, возвращаем дефолтный градиент
            setGradient('linear-gradient(to bottom, #1f2937, #111827)');
            return;
        }

        const img = new Image();
        // Важно для работы с изображениями с других доменов (например, Cloudinary)
        img.crossOrigin = "Anonymous"; 
        
        img.onload = () => {
            try {
                const colorThief = new ColorThief();
                const dominantColor = colorThief.getColor(img);
                const [r, g, b] = dominantColor;

                // Создаем более темный оттенок для второй части градиента
                const darkerR = Math.max(0, r - 40);
                const darkerG = Math.max(0, g - 40);
                const darkerB = Math.max(0, b - 40);

                const newGradient = `linear-gradient(to bottom, rgb(${r}, ${g}, ${b}), rgb(${darkerR}, ${darkerG}, ${darkerB}))`;
                setGradient(newGradient);
            } catch (e) {
                console.error('Ошибка при извлечении цвета:', e);
                setGradient('linear-gradient(to bottom, #1f2937, #111827)'); // Fallback
            }
        };

        img.onerror = () => {
            console.error('Не удалось загрузить изображение для извлечения цвета.');
            setGradient('linear-gradient(to bottom, #1f2937, #111827)'); // Fallback
        }

        img.src = imageUrl;

    }, [imageUrl]);

    return gradient;
};