// frontend/src/utils/UserDataCacheService.js --- НОВЫЙ ФАЙЛ ---

import { openDB } from 'idb';

const DB_NAME = 'flow-me-user-cache';
const STORE_NAME = 'profiles';
const DB_VERSION = 1;

// Кеш в памяти для сверхбыстрого доступа во время сессии
const memoryCache = new Map();

const dbPromise = openDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    // В качестве ключа будет использоваться user._id из сохраняемого объекта
    db.createObjectStore(STORE_NAME, { keyPath: 'user._id' });
  },
});

/**
 * Получает профиль пользователя из кеша (сначала из памяти, потом из IndexedDB).
 * @param {string} userId - ID пользователя.
 * @returns {Promise<Object|null>} - Промис, который разрешается в объект с данными профиля или null.
 */
async function getUser(userId) {
  if (!userId) return null;

  // 1. Попытка получить из кеша в памяти
  if (memoryCache.has(userId)) {
    return memoryCache.get(userId);
  }

  // 2. Попытка получить из IndexedDB
  try {
    const db = await dbPromise;
    const profileData = await db.get(STORE_NAME, userId);
    if (profileData) {
      memoryCache.set(userId, profileData); // Сохраняем в память для будущих запросов
      return profileData;
    }
  } catch (error) {
    console.error("Ошибка получения пользователя из IndexedDB:", error);
  }

  return null;
}

/**
 * Сохраняет данные профиля пользователя в кеш (в IndexedDB и в память).
 * @param {string} userId - ID пользователя (ключ).
 * @param {Object} profileData - Полный объект данных профиля для сохранения.
 */
async function setUser(userId, profileData) {
  if (!userId || !profileData || !profileData.user) return;

  try {
    // 1. Сохраняем в IndexedDB для долгосрочного хранения
    const db = await dbPromise;
    // Ключ извлекается из самого объекта благодаря настройке keyPath
    await db.put(STORE_NAME, profileData);

    // 2. Сохраняем в память для быстрого доступа
    memoryCache.set(userId, profileData);
  } catch (error) {
    console.error("Ошибка сохранения пользователя в IndexedDB:", error);
  }
}

/**
 * Полностью очищает кеш пользователей.
 */
async function clearAll() {
    try {
        const db = await dbPromise;
        await db.clear(STORE_NAME);
        memoryCache.clear();
        console.log("Кеш данных пользователей очищен.");
    } catch (error) {
        console.error("Ошибка очистки кеша пользователей:", error);
    }
}

export const UserDataCache = {
  getUser,
  setUser,
  clearAll,
};