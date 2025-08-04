// frontend/src/utils/ImageCacheService.js --- НОВЫЙ ФАЙЛ ---

import { openDB } from 'idb';

const DB_NAME = 'flow-me-image-cache';
const STORE_NAME = 'images';
const DB_VERSION = 1;

// Уровень 2: Кеш в памяти для сверхбыстрого доступа во время сессии
const memoryCache = new Map();

// Инициализация базы данных (IndexedDB)
const dbPromise = openDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    db.createObjectStore(STORE_NAME);
  },
});

/**
 * Получает изображение из кеша (сначала из памяти, потом из IndexedDB).
 * @param {string} url - URL изображения (будет использован как ключ).
 * @returns {Promise<Blob|null>} - Промис, который разрешается в Blob изображения или null.
 */
async function getImage(url) {
  if (!url) return null;

  // 1. Попытка получить из кеша в памяти
  if (memoryCache.has(url)) {
    return memoryCache.get(url);
  }

  // 2. Попытка получить из IndexedDB
  try {
    const db = await dbPromise;
    const blob = await db.get(STORE_NAME, url);
    if (blob) {
      memoryCache.set(url, blob); // Сохраняем в память для будущих запросов
      return blob;
    }
  } catch (error) {
    console.error("Ошибка получения изображения из IndexedDB:", error);
  }

  return null;
}

/**
 * Сохраняет изображение в кеш (в IndexedDB и в память).
 * @param {string} url - URL изображения (ключ).
 * @param {Blob} blob - Blob изображения для сохранения.
 */
async function setImage(url, blob) {
  if (!url || !blob) return;

  try {
    // 1. Сохраняем в IndexedDB для долгосрочного хранения
    const db = await dbPromise;
    await db.put(STORE_NAME, blob, url);

    // 2. Сохраняем в память для быстрого доступа
    memoryCache.set(url, blob);
  } catch (error) {
    console.error("Ошибка сохранения изображения в IndexedDB:", error);
  }
}

export const ImageCache = {
  getImage,
  setImage,
};