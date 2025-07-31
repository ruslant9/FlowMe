// frontend/src/hooks/useDynamicPosition.js
import { useState, useLayoutEffect, useCallback } from 'react';

export const useDynamicPosition = () => {
  const [position, setPosition] = useState('bottom'); // 'top' or 'bottom'
  
  const ref = useCallback(node => {
    if (node !== null) {
      const rect = node.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      
      // Если расстояние от элемента до низа экрана меньше, чем до верха,
      // и меньше определенного порога (например, 300px), открываем вверх.
      if (viewportHeight - rect.bottom < 300 && rect.top > 300) {
        setPosition('top');
      } else {
        setPosition('bottom');
      }
    }
  }, []);

  return [ref, position];
};