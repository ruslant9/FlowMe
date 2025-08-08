// backend/middleware/admin.middleware.js --- НОВЫЙ ФАЙЛ ---

const User = require('../models/User');

module.exports = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(401).json({ message: 'Пользователь не найден' });
        }

        // --- НАЧАЛО ИЗМЕНЕНИЯ ---
        if (!['junior_admin', 'super_admin'].includes(user.role)) {
            return res.status(403).json({ message: 'Доступ запрещен. Требуются права администратора.' });
        }
        // --- КОНЕЦ ИЗМЕНЕНИЯ ---
        
        req.user = user; 
        next();

    } catch (e) {
        res.status(401).json({ message: 'Ошибка проверки прав доступа' });
    }
};
