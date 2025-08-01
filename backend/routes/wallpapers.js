// backend/routes/wallpapers.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const Wallpaper = require('../models/Wallpaper');
// --- ИЗМЕНЕНИЕ: Импортируем санитайзер ---
const { sanitize } = require('../utils/sanitize');


router.get('/my', authMiddleware, async (req, res) => {
    try {
        const wallpapers = await Wallpaper.find({ user: req.user.userId }).sort({ createdAt: -1 });
        res.json(wallpapers);
    } catch (error) {
        res.status(500).json({ message: "Ошибка при загрузке обоев" });
    }
});

router.post('/', authMiddleware, async (req, res) => {
    try {
        const { name, type, value } = req.body;
        // --- ИЗМЕНЕНИЕ: Очищаем имя ---
        const sanitizedName = sanitize(name);
        if (!sanitizedName || !type || !value) {
            return res.status(400).json({ message: "Не все поля заполнены" });
        }
        const newWallpaper = new Wallpaper({
            user: req.user.userId,
            name: sanitizedName,
            type,
            value
        });
        await newWallpaper.save();
        res.status(201).json(newWallpaper);
    } catch (error) {
        res.status(500).json({ message: "Ошибка при создании обоев" });
    }
});

router.delete('/:wallpaperId', authMiddleware, async (req, res) => {
    try {
        const wallpaper = await Wallpaper.findOne({ _id: req.params.wallpaperId, user: req.user.userId });
        if (!wallpaper) {
            return res.status(404).json({ message: "Обои не найдены или у вас нет прав на их удаление" });
        }
        await wallpaper.deleteOne();
        res.status(200).json({ message: "Обои удалены" });
    } catch (error) {
        res.status(500).json({ message: "Ошибка при удалении обоев" });
    }
});

router.put('/:wallpaperId', authMiddleware, async (req, res) => {
    try {
        const { name, type, value } = req.body;
        // --- ИЗМЕНЕНИЕ: Очищаем имя ---
        const sanitizedName = sanitize(name);
        if (!sanitizedName || !type || !value) {
            return res.status(400).json({ message: "Не все поля заполнены" });
        }
        const updatedWallpaper = await Wallpaper.findOneAndUpdate(
            { _id: req.params.wallpaperId, user: req.user.userId },
            { $set: { name: sanitizedName, type, value } },
            { new: true }
        );
        if (!updatedWallpaper) return res.status(404).json({ message: "Обои не найдены или у вас нет прав." });
        res.status(200).json(updatedWallpaper);
    } catch (error) {
        res.status(500).json({ message: "Ошибка при обновлении обоев" });
    }
});

module.exports = router;