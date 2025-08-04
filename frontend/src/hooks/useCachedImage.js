// frontend/src/hooks/useCachedImage.js --- НОВЫЙ ФАЙЛ ---

import { useState, useEffect } from 'react';
import { ImageCache } from '../utils/ImageCacheService';

/**
 * Хук для загрузки и кеширования изображений.
 * @param {string} src - Оригинальный URL изображения.
 * @returns {{ finalSrc: string, loading: boolean }}
 */
export function useCachedImage(src) {
  const [finalSrc, setFinalSrc] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let objectUrl = null;

    const loadImage = async () => {
      // Если URL пустой или это локальный blob (для превью), просто используем его
      if (!src || src.startsWith('blob:')) {
        setFinalSrc(src);
        setLoading(false);
        return;
      }

      setLoading(true);

      // 1. Пытаемся достать из кеша
      const cachedBlob = await ImageCache.getImage(src);

      if (cachedBlob) {
        if (isMounted) {
          objectUrl = URL.createObjectURL(cachedBlob);
          setFinalSrc(objectUrl);
          setLoading(false);
        }
        return;
      }

      // 2. Если в кеше нет, загружаем из сети
      try {
        const response = await fetch(src);
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const blob = await response.blob();
        
        // Сохраняем в кеш для будущего использования
        await ImageCache.setImage(src, blob);
        
        if (isMounted) {
          objectUrl = URL.createObjectURL(blob);
          setFinalSrc(objectUrl);
        }
      } catch (error) {
        console.error(`Не удалось загрузить или кешировать изображение: ${src}`, error);
        if (isMounted) {
          setFinalSrc(src); // В случае ошибки показываем оригинальный URL
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadImage();

    return () => {
      isMounted = false;
      // Очищаем созданный object URL, чтобы избежать утечек памяти
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [src]);

  return { finalSrc, loading };
}