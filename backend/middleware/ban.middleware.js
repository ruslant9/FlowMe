// backend/middleware/ban.middleware.js --- НОВЫЙ ФАЙЛ ---

const User = require('../models/User');

module.exports = async (req, res, next) => {
    
    // --- НАЧАЛО ИЗМЕНЕНИЯ: Упрощаем и исправляем проверку разрешенных путей ---
    if (req.path === '/profile' && (req.method === 'GET' || req.method === 'PUT')) {
        // Разрешаем GET для просмотра информации о бане и PUT для обновления статуса
        return next();
    }
    if (req.path === '/appeal' && req.method === 'POST') {
        // Разрешаем отправку апелляции
        return next();
    }
    // --- КОНЕЦ ИЗМЕНЕНИЯ ---
    
    try {
        const user = await User.findById(req.user.userId).select('banInfo');
        if (!user) {
            return res.status(401).json({ message: 'Пользователь не найден для проверки бана.' });
        }

        const { isBanned, banExpires, banReason } = user.banInfo;

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