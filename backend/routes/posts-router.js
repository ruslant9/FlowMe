// backend/routes/posts-router.js
const express = require('express');
const router = express.Router();

// Импорт модульных роутеров
const postRoutes = require('./posts/posts');
const commentRoutes = require('./posts/comments');

// Подключение роутеров
// Сначала подключаем роутер для комментариев, так как его пути более специфичны
// (e.g., /:postId/comments)
router.use('/', commentRoutes);

// Затем подключаем основной роутер постов, который обработает /:postId, /feed и т.д.
router.use('/', postRoutes);

module.exports = router;