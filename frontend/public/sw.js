// public/sw.js --- НОВЫЙ ФАЙЛ В ПАПКЕ `public` ---

const CACHE_NAME = 'flow-me-cache-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    // Добавьте сюда пути к основным файлам вашего приложения (JS, CSS),
    // которые вы получаете после сборки (vite build).
];

// Установка Service Worker и кеширование статических активов
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Service Worker: кеширование App Shell');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Активация и очистка старых кешей
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: удаление старого кеша', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Перехват сетевых запросов
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Интересуют только GET-запросы на изображения
  const isImage = request.destination === 'image';
  const isApiRequest = request.url.includes('/api/');
  
  if (request.method !== 'GET' || isApiRequest || !isImage) {
    // Для всего остального используем стандартное поведение
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      // 1. Ищем ответ в кеше
      const cachedResponse = await cache.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }

      // 2. Если в кеше нет, идем в сеть
      try {
        const networkResponse = await fetch(request);
        // Клонируем ответ, так как его можно прочитать только один раз
        cache.put(request, networkResponse.clone());
        return networkResponse;
      } catch (error) {
        console.error('Service Worker: ошибка загрузки', error);
        // Можно вернуть заглушку, если ресурс недоступен
      }
    })
  );
});