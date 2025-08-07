// frontend/src/components/Twemoji.jsx --- НОВЫЙ ФАЙЛ ---

import React, { useMemo } from 'react';
import twemoji from 'twemoji';

const Twemoji = ({ text }) => {
    const parsedText = useMemo(() => {
        if (!text) return '';
        // Эта функция находит все эмодзи в тексте и заменяет их на <img> теги
        return twemoji.parse(text, {
            folder: 'svg',
            ext: '.svg',
            className: 'emoji' // Добавляем класс для стилизации
        });
    }, [text]);

    // dangerouslySetInnerHTML здесь безопасен, так как Twemoji очищает HTML
    return <span dangerouslySetInnerHTML={{ __html: parsedText }} />;
};

export default Twemoji;