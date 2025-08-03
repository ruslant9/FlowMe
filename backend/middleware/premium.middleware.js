// backend/middleware/premium.middleware.js --- НОВЫЙ ФАЙЛ ---

const User = require('../models/User');

// Этот middleware проверяет, есть ли у пользователя активная Premium-подписка
module.exports = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.userId).select('premium');
        if (user && user.premium && user.premium.isActive) {
            req.dbUser = user; // Сохраняем пользователя для дальнейшего использования
            next();
        } else {
            return res.status(403).json({ message: 'Эта функция доступна только для Premium-пользователей.' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Ошибка проверки Premium-статуса.' });
    }
};