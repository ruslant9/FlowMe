// frontend/src/utils/cacheBuster.js --- НОВЫЙ ФАЙЛ ---

import { openDB } from 'idb';
import toast from 'react-hot-toast';

// Список всех баз данных IndexedDB, которые использует ваше приложение
const DATABASES_TO_CLEAR = [
  'flow-me-image-cache',
  'flow-me-chat-cache',
  'flow-me-user-cache'
];

/**
 * Регистрирует обработчик, который следит за обновлением Service Worker.
 * При обнаружении новой версии, очищает все кеши и перезагружает страницу.
 */
export function registerCacheBuster() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log("Обнаружена новая версия приложения! Очистка старых данных...");
      toast.loading('Обнаружена новая версия. Обновление...', { id: 'cache-bust-toast' });

      // 1. Очищаем IndexedDB
      const clearDBs = Promise.all(
        DATABASES_TO_CLEAR.map(dbName => 
          openDB(dbName).then(db => {
            db.close(); // Важно закрыть соединение перед удалением
            console.log(`Удаление IndexedDB: ${dbName}`);
            return indexedDB.deleteDatabase(dbName);
          })
        )
      );

      // 2. Очищаем localStorage (оставляем настройки пользователя)
      console.log("Очистка localStorage...");
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Примечание: 'rememberedEmail' и 'theme' оставлены намеренно

      // 3. Ждем завершения очистки и перезагружаем страницу
      clearDBs.then(() => {
        console.log("Кеш и данные успешно очищены. Перезагрузка страницы.");
        toast.success('Приложение обновлено!', { id: 'cache-bust-toast' });
        
        setTimeout(() => {
          window.location.reload();
        }, 1000); // Небольшая задержка, чтобы пользователь увидел уведомление

      }).catch(error => {
        console.error("Не удалось очистить IndexedDB:", error);
        toast.error('Ошибка при обновлении кеша. Пожалуйста, перезагрузите страницу вручную.', { id: 'cache-bust-toast', duration: 5000 });
      });
    });
  }
}