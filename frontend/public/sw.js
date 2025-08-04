// public/sw.js --- ОБНОВЛЕННЫЙ ФАЙЛ ---

const CACHE_NAME = 'flow-me-cache-v2'; // Увеличиваем версию кеша, чтобы он обновился у пользователей

// Список всех статических ресурсов приложения для кеширования
const STATIC_ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  // Основные ассеты сборки (Vite сам подставит правильные имена с хешами, если использовать PWA плагин, но для ручной настройки мы перечисляем основные)
  // В реальном проекте пути к JS/CSS файлам будут с хешами, их лучше добавлять динамически во время сборки.
  // Пока оставим так для демонстрации.
  
  // Иконки и общие изображения
  '/favicon.svg',
  '/noise.png',
  '/notification.mp3',

  // Эмодзи для ника
  '/emojis/fire.gif',
  '/emojis/crown.gif',
  '/emojis/diamond.gif',
  '/emojis/heart.gif',

  // Иконки тем сообществ
  '/icons/gaming.svg', '/icons/art.svg', '/icons/tech.svg', '/icons/music.svg',
  '/icons/sports.svg', '/icons/science.svg', '/icons/food.svg', '/icons/travel.svg',
  '/icons/fashion.svg', '/icons/photo.svg', '/icons/health.svg', '/icons/edu.svg',
  '/icons/business.svg', '/icons/finance.svg', '/icons/nature.svg', '/icons/pets.svg',
  '/icons/diy.svg', '/icons/cars.svg', '/icons/movies.svg', '/icons/tv.svg',
  '/icons/anime.svg', '/icons/comics.svg', '/icons/history.svg', '/icons/philosophy.svg',
  '/icons/politics.svg', '/icons/news.svg', '/icons/humor.svg', '/icons/fitness.svg',
  '/icons/other.svg',

  // Шаблоны обоев
  '/wallpapers/templates/wallpaper-doodle-dark.svg',
  '/wallpapers/templates/wallpaper-doodle-sunset.svg',
  '/wallpapers/templates/wallpaper-doodle-forest.svg',
  '/wallpapers/templates/wallpaper-doodle-synthwave.svg',
  '/wallpapers/templates/wallpaper-doodle-gold.svg',
  '/wallpapers/templates/love_wallpaper.svg',
  '/wallpapers/templates/template-1.svg', '/wallpapers/templates/template-2.svg',
  '/wallpapers/templates/template-3.svg', '/wallpapers/templates/template-4.svg',
  '/wallpapers/templates/template-5.svg', '/wallpapers/templates/template-6.svg',
  '/wallpapers/templates/template-7.svg', '/wallpapers/templates/template-8.svg',
  '/wallpapers/templates/template-9.svg', '/wallpapers/templates/template-10.svg',
  '/wallpapers/templates/template-11.svg', '/wallpapers/templates/template-12.svg',
  '/wallpapers/templates/template-13.svg', '/wallpapers/templates/template-14.svg',
  '/wallpapers/templates/template-15.svg', '/wallpapers/templates/template-16.svg',
  '/wallpapers/templates/template-17.svg', '/wallpapers/templates/template-18.svg',
  '/wallpapers/templates/template-19.svg', '/wallpapers/templates/template-20.svg',
];


self.addEventListener('install', (event) => {
  self.skipWaiting(); // Принудительная активация нового Service Worker
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Service Worker: кеширование статических ресурсов.');
      return cache.addAll(STATIC_ASSETS_TO_CACHE);
    })
  );
});

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
      ).then(() => self.clients.claim()); // Захватываем контроль над открытыми страницами
    })
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Не кешируем API-запросы и запросы, которые не являются GET
  if (request.url.includes('/api/') || request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      // 1. Проверяем, есть ли ресурс в кеше
      const cachedResponse = await cache.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }

      // 2. Если нет, идем в сеть
      try {
        const networkResponse = await fetch(request);
        // Клонируем ответ, так как его можно прочитать только один раз
        // и кладем в кеш для будущих запросов
        cache.put(request, networkResponse.clone());
        return networkResponse;
      } catch (error) {
        console.error('Service Worker: ошибка загрузки ресурса', request.url, error);
        // Можно вернуть заглушку, если ресурс недоступен
      }
    })
  );
});