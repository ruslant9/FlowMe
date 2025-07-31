// backend/routes/music-router.js
const express = require('express');
const router = express.Router();

const musicRoutes = require('./music'); // Основные маршруты
const playlistRoutes = require('./playlists'); // Маршруты плейлистов

router.use('/', musicRoutes);
router.use('/playlists', playlistRoutes);

module.exports = router;