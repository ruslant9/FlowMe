// public/sw.js --- ОБНОВЛЕННЫЙ ФАЙЛ ---

// --- СУЩЕСТВУЮЩАЯ ЛОГИКА КЕШИРОВАНИЯ (ОСТАЕТСЯ БЕЗ ИЗМЕНЕНИЙ) ---

const STATIC_ASSETS_TO_CACHE = self.__WB_MANIFEST;

const CACHE_NAME = 'flow-me-cache-v4'; // Не забудьте сменить версию!


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


// --- НАЧАЛО ИЗМЕНЕНИЙ: НОВАЯ ЛОГИКА ДЛЯ PUSH-УВЕДОМЛЕНИЙ ---

// Этот обработчик срабатывает, когда браузер получает push-сообщение от сервера.
// Его задача - показать системное уведомление.
self.addEventListener('push', event => {
  const data = event.data.json();
  
  const options = {
    body: data.body,
    icon: data.icon || '/favicon.svg', // Иконка по умолчанию, если сервер не прислал
    badge: '/favicon.svg', // Маленькая монохромная иконка для Android
    vibrate: [200, 100, 200], // Паттерн вибрации
    data: {
      url: data.data.url, // URL, который нужно открыть по клику
    },
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Этот обработчик срабатывает, когда пользователь нажимает на уведомление.
// Его задача - открыть нужную страницу приложения.
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  const urlToOpen = event.notification.data.url;

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(clientList => {
      // Если вкладка с приложением уже открыта, просто фокусируемся на ней и переходим по ссылке
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        const clientUrl = new URL(client.url);
        const notificationUrl = new URL(urlToOpen, self.location.origin);

        if (clientUrl.origin === notificationUrl.origin && 'focus' in client) {
          client.navigate(urlToOpen); // Переходим на нужный URL
          return client.focus();
        }
      }
      // Если открытых вкладок нет, открываем новую
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
// --- КОНЕЦ ИЗМЕНЕНИЙ ---