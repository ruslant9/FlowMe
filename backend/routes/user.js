// backend/routes/user.js
const express = require('express');
const router = express.Router();

// Импорт модульных роутеров
const profileRoutes = require('./user/profile');
const socialRoutes = require('./user/social');
const publicRoutes = require('./user/public');
const notificationRoutes = require('./user/notifications');
const settingsRoutes = require('./user/settings');
const locationRoutes = require('./user/locations');
const premiumAccentRoutes = require('./user/premium-accents'); // --- НОВАЯ СТРОКА ---

// Подключение роутеров. Порядок важен!
// Сначала подключаем более конкретные пути.
router.use('/notifications', notificationRoutes);
router.use('/locations', locationRoutes);
router.use('/premium-accents', premiumAccentRoutes); // --- НОВАЯ СТРОКА ---
router.use(settingsRoutes); // Содержит /privacy-settings, /password/change и т.д.
router.use(profileRoutes);  // Содержит /profile, /avatar, /sessions и т.д.
router.use(socialRoutes);   // Содержит /friends, /send-request/:id и т.д.

// Роутер с параметризованными путями (/:userId) подключается последним,
// чтобы он не перехватывал запросы к другим роутам.
router.use('/', publicRoutes);

module.exports = router;