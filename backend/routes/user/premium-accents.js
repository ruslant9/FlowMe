// backend/routes/user/premium-accents.js
const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const authMiddleware = require('../../middleware/auth.middleware');
// --- ИЗМЕНЕНИЕ: Импортируем валидатор и санитайзер ---
const { isValidAccentUrl } = require('../../utils/validation');
const { sanitize } = require('../../utils/sanitize');

const premiumOnly = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.userId);
        if (user && user.premium && user.premium.isActive) {
            req.dbUser = user;
            next();
        } else {
            res.status(403).json({ message: 'Эта функция доступна только для Premium-пользователей.' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Ошибка проверки статуса пользователя.' });
    }
};

router.put('/set-active', authMiddleware, premiumOnly, async (req, res) => {
    try {
        const { accent } = req.body;
        await User.findByIdAndUpdate(req.user.userId, {
            'premiumCustomization.activeCardAccent': accent
        });
        res.json({ message: 'Акцент успешно применен.' });
        req.broadcastMessage({ type: 'USER_DATA_UPDATED', userId: req.user.userId });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при установке акцента.' });
    }
});

router.post('/', authMiddleware, premiumOnly, async (req, res) => {
    try {
        const { name, backgroundUrl, emojis } = req.body;

        // --- ИЗМЕНЕНИЕ: Добавляем валидацию и очистку ---
        if (!isValidAccentUrl(backgroundUrl)) {
            return res.status(400).json({ message: 'Указан неверный URL фона или цвет.' });
        }
        if (!name || !backgroundUrl || !Array.isArray(emojis) || emojis.length === 0 || emojis.length > 3) {
            return res.status(400).json({ message: 'Неверные данные для создания акцента.' });
        }
        const sanitizedName = sanitize(name);
        // --- КОНЕЦ ИЗМЕНЕНИЯ ---

        const user = req.dbUser;
        if (user.premiumCustomization.customCardAccents.length >= 5) {
            return res.status(400).json({ message: 'Вы можете создать не более 5 кастомных акцентов.' });
        }

        const newAccent = { name: sanitizedName, backgroundUrl, emojis }; // Используем очищенное имя
        user.premiumCustomization.customCardAccents.push(newAccent);
        await user.save();
        
        const createdAccent = user.premiumCustomization.customCardAccents[user.premiumCustomization.customCardAccents.length - 1];
        res.status(201).json(createdAccent);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при создании акцента.' });
    }
});

router.put('/:accentId', authMiddleware, premiumOnly, async (req, res) => {
    try {
        const { accentId } = req.params;
        const { name, backgroundUrl, emojis } = req.body;

        // --- ИЗМЕНЕНИЕ: Добавляем валидацию и очистку ---
        if (!isValidAccentUrl(backgroundUrl)) {
            return res.status(400).json({ message: 'Указан неверный URL фона или цвет.' });
        }
        if (!name || !backgroundUrl || !Array.isArray(emojis) || emojis.length === 0 || emojis.length > 3) {
            return res.status(400).json({ message: 'Неверные данные для обновления акцента.' });
        }
        const sanitizedName = sanitize(name);
        // --- КОНЕЦ ИЗМЕНЕНИЯ ---

        const user = req.dbUser;
        const accent = user.premiumCustomization.customCardAccents.id(accentId);
        if (!accent) {
            return res.status(404).json({ message: 'Акцент не найден.' });
        }

        accent.set({ name: sanitizedName, backgroundUrl, emojis }); // Используем очищенное имя
        await user.save();
        res.json(accent);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при обновлении акцента.' });
    }
});

router.delete('/:accentId', authMiddleware, premiumOnly, async (req, res) => {
    try {
        const { accentId } = req.params;
        const user = req.dbUser;
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