// backend/middleware/admin.middleware.js --- НОВЫЙ ФАЙЛ ---

const User = require('../models/User');

module.exports = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(401).json({ message: 'Пользователь не найден' });
        }

        if (user.role !== 'admin') {
            return res.status(403).json({ message: 'Доступ запрещен. Требуются права администратора.' });
        }
        
        // Сохраняем полную модель пользователя для дальнейшего использования
        req.user = user; 
        next();

    } catch (e) {
        res.status(401).json({ message: 'Ошибка проверки прав доступа' });
    }
};