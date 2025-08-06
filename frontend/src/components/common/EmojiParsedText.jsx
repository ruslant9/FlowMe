// frontend/src/components/common/EmojiParsedText.jsx --- НОВЫЙ ФАЙЛ ---

import React, { useEffect, useRef } from 'react';
import twemoji from 'twemoji';

const EmojiParsedText = ({ text, className }) => {
  const containerRef = useRef(null);
  useEffect(() => {
    if (containerRef.current) {
      twemoji.parse(containerRef.current, {
        folder: 'svg',
        ext: '.svg'
      });
    }
  }, [text]); // Перезапускаем эффект каждый раз, когда текст меняется.

  return (
    <p
      ref={containerRef}
      className={className}
      dangerouslySetInnerHTML={{ __html: text }}
    />
  );
};

export default EmojiParsedText;