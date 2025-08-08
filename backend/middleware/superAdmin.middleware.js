const User = require('../models/User');

module.exports = async (req, res, next) => {
    try {
        // Мы предполагаем, что этот middleware используется ПОСЛЕ admin.middleware
        if (req.user.role !== 'super_admin') {
            return res.status(403).json({ message: 'Доступ запрещен. Требуются права главного администратора.' });
        }
        next();
    } catch (e) {
        res.status(401).json({ message: 'Ошибка проверки прав доступа главного администратора' });
    }
};