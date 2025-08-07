// frontend/src/components/Twemoji.jsx

import React, { useMemo } from 'react';
import twemoji from 'twemoji';
import useMediaQuery from '../hooks/useMediaQuery';

const Twemoji = ({ text }) => {
    const isMobile = useMediaQuery('(max-width: 768px)');

    const content = useMemo(() => {
        // Если это мобильное устройство, просто возвращаем текст как есть.
        if (isMobile) {
            return text;
        }

        // Если это десктоп, парсим текст.
        // Эта функция рекурсивно обрабатывает строки и React-элементы.
        const parseChildren = (children) => {
            return React.Children.map(children, child => {
                if (typeof child === 'string') {
                    // Находим текстовые узлы и заменяем эмодзи на <img>
                    return <span dangerouslySetInnerHTML={{ __html: twemoji.parse(child, { folder: 'svg', ext: '.svg', className: 'emoji' }) }} />;
                }
                if (React.isValidElement(child) && child.props.children) {
                    // Если дочерний элемент - это другой React-компонент (например, <mark> из поиска),
                    // рекурсивно обрабатываем его дочерние элементы.
                    return React.cloneElement(child, {
                        ...child.props,
                        children: parseChildren(child.props.children)
                    });
                }
                // Возвращаем все остальное (null, элементы без детей и т.д.) без изменений.
                return child;
            });
        };

        return parseChildren(text);

    }, [text, isMobile]);

    return <>{content}</>;
};

export default Twemoji;