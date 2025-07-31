// frontend/src/hooks/useTitle.js
import { useEffect } from 'react';

const useTitle = (title) => {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = `${title} | Flow me`; // Формат "Название страницы | Название сайта"

    // Возвращаем функцию очистки, которая вернет старый заголовок
    // при размонтировании компонента. Это хорошая практика.
    return () => {
      document.title = prevTitle;
    };
  }, [title]);
};

export default useTitle;