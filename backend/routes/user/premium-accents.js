// backend/routes/user/premium-accents.js
const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const authMiddleware = require('../../middleware/auth.middleware');

// --- НАЧАЛО ИЗМЕНЕНИЯ: Исправлен middleware для проверки Premium ---
const premiumOnly = async (req, res, next) => {
    try {
        // Загружаем полную модель пользователя из БД, так как в req.user только данные из токена
        const user = await User.findById(req.user.userId);
        if (user && user.premium && user.premium.isActive) {
            req.dbUser = user; // Сохраняем пользователя в req для дальнейшего использования
            next();
        } else {
            res.status(403).json({ message: 'Эта функция доступна только для Premium-пользователей.' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Ошибка проверки статуса пользователя.' });
    }
};
// --- КОНЕЦ ИЗМЕНЕНИЯ ---

// Установить активный акцент
router.put('/set-active', authMiddleware, premiumOnly, async (req, res) => {
    try {
        const { accent } = req.body; // Может быть строкой (URL) или ID кастомного акцента
        await User.findByIdAndUpdate(req.user.userId, {
            'premiumCustomization.activeCardAccent': accent
        });
        res.json({ message: 'Акцент успешно применен.' });
        req.broadcastMessage({ type: 'USER_DATA_UPDATED', userId: req.user.userId });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при установке акцента.' });
    }
});

// Создать новый кастомный акцент
router.post('/', authMiddleware, premiumOnly, async (req, res) => {
    try {
        const { name, backgroundUrl, emojis } = req.body;
        if (!name || !backgroundUrl || !Array.isArray(emojis) || emojis.length === 0 || emojis.length > 3) {
            return res.status(400).json({ message: 'Неверные данные для создания акцента.' });
        }

        const user = req.dbUser; // Используем пользователя, полученного в middleware
        if (user.premiumCustomization.customCardAccents.length >= 5) {
            return res.status(400).json({ message: 'Вы можете создать не более 5 кастомных акцентов.' });
        }

        const newAccent = { name, backgroundUrl, emojis };
        user.premiumCustomization.customCardAccents.push(newAccent);
        await user.save();
        
        const createdAccent = user.premiumCustomization.customCardAccents[user.premiumCustomization.customCardAccents.length - 1];
        res.status(201).json(createdAccent);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при создании акцента.' });
    }
});

// Обновить кастомный акцент
router.put('/:accentId', authMiddleware, premiumOnly, async (req, res) => {
    try {
        const { accentId } = req.params;
        const { name, backgroundUrl, emojis } = req.body;
        if (!name || !backgroundUrl || !Array.isArray(emojis) || emojis.length === 0 || emojis.length > 3) {
            return res.status(400).json({ message: 'Неверные данные для обновления акцента.' });
        }

        const user = req.dbUser; // Используем пользователя, полученного в middleware
        const accent = user.premiumCustomization.customCardAccents.id(accentId);
        if (!accent) {
            return res.status(404).json({ message: 'Акцент не найден.' });
        }

        accent.set({ name, backgroundUrl, emojis });
        await user.save();
        res.json(accent);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при обновлении акцента.' });
    }
});

// Удалить кастомный акцент
router.delete('/:accentId', authMiddleware, premiumOnly, async (req, res) => {
    try {
        const { accentId } = req.params;
        const user = req.dbUser; // Используем пользователя, полученного в middleware
        const accent = user.premiumCustomization.customCardAccents.id(accentId);
        if (!accent) {
            return res.status(404).json({ message: 'Акцент не найден.' });
        }
        
        if (user.premiumCustomization.activeCardAccent && user.premiumCustomization.activeCardAccent.toString() === accentId) {
            user.premiumCustomization.activeCardAccent = null;
        }

        user.premiumCustomization.customCardAccents.pull(accentId);
        await user.save();
        
        res.status(200).json({ message: 'Акцент успешно удален.' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при удалении акцента.' });
    }
});

module.exports = router;