// frontend/src/components/Twemoji.jsx

import React, { useMemo } from 'react';
import emojiRegex from 'emoji-regex';
import useMediaQuery from '../hooks/useMediaQuery';

// Вспомогательная функция для преобразования символа эмодзи в его кодовую точку (например, '😀' -> '1f600')
const toCodePoint = (char) => {
  return [...char].map(p => p.codePointAt(0).toString(16)).join('-');
};

const Twemoji = ({ text }) => {
    const isMobile = useMediaQuery('(max-width: 768px)');

    const content = useMemo(() => {
        // На мобильных устройствах для производительности используем нативные эмодзи
        if (isMobile) {
            return text;
        }

        // Рекурсивная функция для обработки текста, который может содержать другие React-компоненты (например, <mark>)
        const parseChildren = (children) => {
            return React.Children.map(children, child => {
                // Обрабатываем только текстовые узлы
                if (typeof child === 'string') {
                    const regex = emojiRegex();
                    const parts = child.split(regex);
                    
                    // Если эмодзи не найдены, просто возвращаем текст
                    if (parts.length <= 1) {
                        return child;
                    }
                    
                    const matches = child.match(regex);

                    // Собираем обратно строку, заменяя текстовые эмодзи на <img>
                    return parts.reduce((acc, part, index) => {
                         acc.push(part); // Добавляем текстовую часть
                         if (matches && matches[index]) {
                             const emoji = matches[index];
                             const codePoint = toCodePoint(emoji);
                             // Используем CDN с эмодзи в стиле Apple (из набора EmojiOne)
                             const url = `https://cdnjs.cloudflare.com/ajax/libs/emojione/2.2.7/assets/png/${codePoint}.png`;
                             acc.push(<img key={`emoji-${index}`} className="emoji" src={url} alt={emoji} />);
                         }
                         return acc;
                    }, []);
                }
                // Если дочерний элемент - это компонент с другими дочерними элементами, обрабатываем их рекурсивно
                if (React.isValidElement(child) && child.props.children) {
                    return React.cloneElement(child, {
                        ...child.props,
                        children: parseChildren(child.props.children)
                    });
                }
                // Возвращаем все остальное как есть
                return child;
            });
        };

        return parseChildren(text);

    }, [text, isMobile]);

    return <>{content}</>;
};

export default Twemoji;