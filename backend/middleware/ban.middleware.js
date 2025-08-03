// backend/middleware/ban.middleware.js

const User = require('../models/User');

module.exports = async (req, res, next) => {
    
    // Исключения для апелляции и получения профиля остаются без изменений
    if (
        (req.originalUrl === '/api/user/profile' && req.method === 'GET') ||
        (req.originalUrl === '/api/submissions/appeal' && req.method === 'POST')
    ) {
        return next();
    }
    
    try {
        // --- КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ ---
        // Проверяем оба возможных источника ID пользователя:
        // 1. req.user.userId - от auth.middleware.js (простой объект из токена)
        // 2. req.user._id - от admin.middleware.js (полная модель Mongoose)
        const userId = req.user.userId || req.user._id;

        if (!userId) {
            // Если ID не найден ни в одном из форматов, это ошибка аутентификации.
            return res.status(401).json({ message: 'Ошибка аутентификации для проверки бана.' });
        }
        
        const user = await User.findById(userId).select('banInfo');
        
        if (!user) {
            return res.status(401).json({ message: 'Пользователь не найден для проверки бана.' });
        }

        const { isBanned, banExpires } = user.banInfo;

        if (isBanned) {
            const now = new Date();

            // Если бан истек, автоматически снимаем его.
            if (banExpires && banExpires < now) {
                user.banInfo.isBanned = false;
                user.banInfo.banExpires = null;
                user.banInfo.banReason = null;
                await user.save();
                return next(); // Разрешаем доступ
            } else {
                // Если бан активен, блокируем.
                return res.status(403).json({ message: 'Доступ заблокирован.', banInfo: user.banInfo });
            }
        }
        
        // Если пользователь не забанен, пропускаем дальше.
        next();
    } catch (e) {
        console.error('Ошибка в ban.middleware.js:', e);
        res.status(500).json({ message: 'Ошибка сервера при проверке статуса блокировки.' });
    }
};