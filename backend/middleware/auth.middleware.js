// backend/middleware/auth.middleware.js
const jwt = require('jsonwebtoken');
const Session = require('../models/Session');

module.exports = async (req, res, next) => {
    if (req.method === 'OPTIONS') {
        return next();
    }
    try {
        // --- НАЧАЛО ИЗМЕНЕНИЯ: Проверяем и cookie, и заголовок Authorization ---
        let token = req.cookies.token;

        // Если токен не найден в cookie, ищем его в заголовке Authorization
        if (!token && req.headers.authorization) {
            const authHeader = req.headers.authorization;
            if (authHeader.startsWith('Bearer ')) {
                token = authHeader.split(' ')[1];
            }
        }

        if (!token) {
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