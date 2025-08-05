// frontend/src/utils/MessageCacheService.js --- НОВЫЙ ФАЙЛ ---

import { openDB } from 'idb';

const DB_NAME = 'flow-me-chat-cache';
const STORE_NAME = 'conversations';
const DB_VERSION = 1;

const dbPromise = openDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME, { keyPath: 'conversationId' });
    }
  },
});

/**
 * Получает сообщения для диалога из кеша.
 * @param {string} conversationId ID диалога.
 * @returns {Promise<Array|null>} Массив сообщений или null, если кеша нет.
 */
async function getMessages(conversationId) {
  try {
    const db = await dbPromise;
    const conversationData = await db.get(STORE_NAME, conversationId);
    return conversationData ? conversationData.messages : null;
  } catch (error) {
    console.error("Ошибка получения сообщений из IndexedDB:", error);
    return null;
  }
}

/**
 * Сохраняет (перезаписывает) все сообщения для диалога в кеш.
 * @param {string} conversationId ID диалога.
 * @param {Array} messages Массив сообщений для сохранения.
 */
async function saveMessages(conversationId, messages) {
  try {
    const db = await dbPromise;
    await db.put(STORE_NAME, { conversationId, messages, timestamp: new Date() });
  } catch (error) {
    console.error("Ошибка сохранения сообщений в IndexedDB:", error);
  }
}

/**
 * Полностью очищает кеш сообщений.
 */
async function clearAllMessages() {
  try {
    const db = await dbPromise;
    await db.clear(STORE_NAME);
    console.log("Кеш сообщений очищен.");
  } catch (error) {
    console.error("Ошибка очистки кеша сообщений:", error);
  }
}

export const MessageCache = {
  getMessages,
  saveMessages,
  clearAllMessages,
};