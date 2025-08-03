// backend/middleware/ban.middleware.js

const User = require('../models/User');

module.exports = async (req, res, next) => {
    
    // --- НАЧАЛО ИЗМЕНЕНИЯ: Используем полный путь (originalUrl) для надежности ---
    // Разрешаем GET-запрос на /api/user/profile, чтобы забаненный пользователь мог загрузить информацию о своем бане.
    if (req.originalUrl === '/api/user/profile' && req.method === 'GET') {
        return next();
    }
    // Разрешаем POST-запрос на /api/submissions/appeal для отправки жалобы.
    if (req.originalUrl === '/api/submissions/appeal' && req.method === 'POST') {
        return next();
    }
    // --- КОНЕЦ ИЗМЕНЕНИЯ ---
    
    try {
        const user = await User.findById(req.user.userId).select('banInfo');
        if (!user) {
            return res.status(401).json({ message: 'Пользователь не найден для проверки бана.' });
        }

        const { isBanned, banExpires } = user.banInfo;

        if (isBanned) {
            const now = new Date();

            // Если бан истек, снимаем его
            if (banExpires && banExpires < now) {
                user.banInfo.isBanned = false;
                user.banInfo.banExpires = null;
                user.banInfo.banReason = null;
                await user.save();
                return next(); // Разрешаем доступ
            } else {
                // Если бан активен, блокируем доступ
                return res.status(403).json({ message: 'Доступ заблокирован.', banInfo: user.banInfo });
            }
        }
        next();
    } catch (e) {
        res.status(500).json({ message: 'Ошибка сервера при проверке статуса блокировки.' });
    }
};