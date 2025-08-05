// frontend/src/utils/AudioCacheService.js

import { openDB } from 'idb';

const DB_NAME = 'flow-me-audio-cache';
const STORE_NAME = 'audio';
const DB_VERSION = 1;

// Кеш в памяти для сверхбыстрого доступа во время текущей сессии
const memoryCache = new Map();

// Инициализация базы данных IndexedDB
const dbPromise = openDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    db.createObjectStore(STORE_NAME);
  },
});

/**
 * Получает аудиофайл из кеша (сначала из памяти, потом из IndexedDB).
 * @param {string} key - Уникальный идентификатор трека (например, track._id).
 * @returns {Promise<Blob|null>} - Промис, который разрешается в Blob аудио или null.
 */
async function getAudio(key) {
  if (!key) return null;

  // 1. Попытка получить из кеша в памяти
  if (memoryCache.has(key)) {
    return memoryCache.get(key);
  }

  // 2. Попытка получить из IndexedDB
  try {
    const db = await dbPromise;
    const blob = await db.get(STORE_NAME, key);
    if (blob) {
      memoryCache.set(key, blob); // Сохраняем в память для будущих запросов
      return blob;
    }
  } catch (error) {
    console.error("Ошибка получения аудио из IndexedDB:", error);
  }

  return null;
}

/**
 * Сохраняет аудиофайл в кеш (в IndexedDB и в память).
 * @param {string} key - Уникальный идентификатор трека.
 * @param {Blob} blob - Blob аудио для сохранения.
 */
async function setAudio(key, blob) {
  if (!key || !blob) return;

  try {
    // 1. Сохраняем в IndexedDB для долгосрочного хранения
    const db = await dbPromise;
    await db.put(STORE_NAME, blob, key);

    // 2. Сохраняем в память для быстрого доступа
    memoryCache.set(key, blob);
  } catch (error) {
    console.error("Ошибка сохранения аудио в IndexedDB:", error);
  }
}

/**
 * Полностью очищает аудио-кеш (IndexedDB и память).
 * @returns {Promise<void>}
 */
async function clearAllAudio() {
  try {
    // 1. Очищаем хранилище в IndexedDB
    const db = await dbPromise;
    await db.clear(STORE_NAME);

    // 2. Очищаем кеш в памяти
    memoryCache.clear();

    console.log("Аудио-кеш успешно очищен.");
  } catch (error) {
    console.error("Ошибка при полной очистке аудио-кеша:", error);
    throw new Error("Не удалось очистить аудио-кеш.");
  }
}

export const AudioCache = {
  getAudio,
  setAudio,
  clearAllAudio, // Экспортируем новую функцию
};