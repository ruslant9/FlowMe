// backend/middleware/auth.middleware.js
const jwt = require('jsonwebtoken');
const Session = require('../models/Session');

module.exports = async (req, res, next) => {
    if (req.method === 'OPTIONS') {
        return next();
    }
    try {
        // --- ИЗМЕНЕНИЕ: Читаем токен из HttpOnly cookie ---
        const token = req.cookies.token;
        if (!token) {
            // Удаляем заголовок Authorization из проверки, он больше не нужен
            return res.status(401).json({ message: 'Нет авторизации' });
        }
        // --- КОНЕЦ ИЗМЕНЕНИЯ ---

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        if (!decoded.sessionId) {
            return res.status(401).json({ message: 'Нет авторизации (недействительный токен)' });
        }
        const session = await Session.findById(decoded.sessionId);
        if (!session) {
            return res.status(401).json({ message: 'Сессия истекла или была прервана. Пожалуйста, войдите снова.' });
        }

        req.user = decoded; // { userId, username, sessionId }
        next();
    } catch (e) {
        if (e.name === 'JsonWebTokenError' || e.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Нет авторизации' });
        }
        console.error('Auth middleware error:', e);
        res.status(500).json({ message: 'Ошибка на сервере при аутентификации' });
    }
};