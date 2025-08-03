// backend/middleware/ban.middleware.js

const User = require('../models/User');

module.exports = async (req, res, next) => {
    
    // ИСПРАВЛЕНИЕ: Проверяем, был ли пользователь успешно аутентифицирован.
    // Если `req.user` не установлен, это значит, что `auth.middleware` уже отправил
    // ответ с ошибкой (например, 401 Unauthorized из-за невалидной сессии).
    // Мы должны прекратить дальнейшую обработку, чтобы не пытаться отправить второй ответ.
    if (!req.user || !req.user.userId) {
        return; 
    }
    
    // Исключение: Разрешаем забаненному пользователю запрашивать свой профиль,
    // чтобы получить актуальную информацию о бане (причину, срок).
    if (req.originalUrl === '/api/user/profile' && req.method === 'GET') {
        return next();
    }
    
    // Исключение: Разрешаем забаненному пользователю отправлять жалобу.
    if (req.originalUrl === '/api/submissions/appeal' && req.method === 'POST') {
        return next();
    }
    
    try {
        // Мы уже уверены, что req.user.userId существует благодаря проверке выше.
        const user = await User.findById(req.user.userId).select('banInfo');
        
        // Эта проверка остается для дополнительной надежности.
        if (!user) {
            return res.status(401).json({ message: 'Пользователь не найден для проверки бана.' });
        }

        const { isBanned, banExpires } = user.banInfo;

        if (isBanned) {
            const now = new Date();

            // Если бан истек, автоматически снимаем его и разрешаем доступ.
            if (banExpires && banExpires < now) {
                user.banInfo.isBanned = false;
                user.banInfo.banExpires = null;
                user.banInfo.banReason = null;
                await user.save();
                return next();
            } else {
                // Если бан все еще активен, блокируем доступ.
                return res.status(403).json({ message: 'Доступ заблокирован.', banInfo: user.banInfo });
            }
        }
        
        // Если пользователь не забанен, разрешаем доступ.
        next();
    } catch (e) {
        console.error('Ошибка в ban.middleware.js:', e);
        res.status(500).json({ message: 'Ошибка сервера при проверке статуса блокировки.' });
    }
};