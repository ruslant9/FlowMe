// backend/routes/music-router.js
const express = require('express');
const router = express.Router();
const musicRoutes = require('./music'); // Основные маршруты
router.use('/', musicRoutes);
module.exports = router;