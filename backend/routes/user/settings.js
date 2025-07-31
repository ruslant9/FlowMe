// backend/routes/user/settings.js
const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const Session = require('../../models/Session'); 
const bcrypt = require('bcryptjs'); 
const nodemailer = require('nodemailer'); 
const authMiddleware = require('../../middleware/auth.middleware');

const passwordChangeRequests = {}; 

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

router.get('/privacy-settings', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('privacySettings');
        if (!user) return res.status(404).json({ message: 'Пользователь не найден' });
        res.json(user.privacySettings);
    } catch (e) {
        res.status(500).json({ message: 'Ошибка сервера при получении настроек приватности' });
    }
});

router.put('/privacy-settings', authMiddleware, async (req, res) => {
    try {
        const settings = req.body;
        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ message: 'Пользователь не найден' });
        
        const validSettings = ['everyone', 'friends', 'private'];
        const validFriendRequestSettings = ['everyone', 'private'];
        
        Object.keys(settings).forEach(key => {
            const value = settings[key];
            if (user.privacySettings[key] !== undefined) {
                if (key === 'sendFriendRequest' && validFriendRequestSettings.includes(value)) {
                    user.privacySettings[key] = value;
                } else if ((key === 'hideDOBYear' || key === 'disableToasts') && typeof value === 'boolean') {
                    user.privacySettings[key] = value;
                } else if (validSettings.includes(value)) {
                    user.privacySettings[key] = value;
                }
            }
        });
        
        await user.save();
        res.json({ message: 'Настройки приватности успешно обновлены.' });
        req.broadcastMessage({ type: 'USER_DATA_UPDATED', userId: req.user.userId });
        req.broadcastFullUserStatus(req.user.userId);
    } catch (e) {
        res.status(500).json({ message: 'Ошибка сервера при обновлении настроек приватности' });
    }
});


router.post('/password/change', authMiddleware, async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ message: 'Новый пароль должен содержать не менее 6 символов.' });
        }
        if (newPassword !== confirmPassword) {
            return res.status(400).json({ message: 'Пароли не совпадают.' });
        }

        const user = await User.findById(req.user.userId);
        const session = await Session.findById(req.user.sessionId);

        if (!user || !session) {
            return res.status(404).json({ message: 'Пользователь или сессия не найдены.' });
        }
        
        // --- ИЗМЕНЕНИЕ: Логика для пользователей без пароля (Google Auth) ---
        if (!user.password) {
            user.password = await bcrypt.hash(newPassword, 12);
            await user.save();
            await Session.deleteMany({ user: user._id, _id: { $ne: session._id } }); // Прерываем другие сессии для безопасности
            return res.json({ message: 'Пароль успешно установлен. Теперь вы можете входить, используя email и пароль.' });
        }
        // --- КОНЕЦ ИЗМЕНЕНИЯ ---

        const isRecentSession = (Date.now() - new Date(session.createdAt).getTime()) < 3600000; // 1 hour

        if (isRecentSession) {
            const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
            const hashedPassword = await bcrypt.hash(newPassword, 12);
            
            passwordChangeRequests[user.email] = {
                code: verificationCode,
                newPassword: hashedPassword,
                expires: Date.now() + 10 * 60 * 1000, // 10 minutes
            };

            await transporter.sendMail({
                from: `"Flow me" <${process.env.EMAIL_USER}>`,
                to: user.email,
                subject: 'Подтверждение смены пароля',
                html: `<h1>Подтверждение смены пароля</h1><p>Для подтверждения смены пароля введите этот код: <strong>${verificationCode}</strong></p><p>Код действителен 10 минут.</p>`,
            });

            return res.json({ verificationRequired: true, message: 'Код подтверждения отправлен на вашу почту.' });
        } else {
            if (!currentPassword) {
                return res.status(400).json({ message: 'Введите текущий пароль.' });
            }
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) {
                return res.status(400).json({ message: 'Неверный текущий пароль.' });
            }
            
            user.password = await bcrypt.hash(newPassword, 12);
            await user.save();
            await Session.deleteMany({ user: user._id, _id: { $ne: session._id } });

            return res.json({ message: 'Пароль успешно изменен. Все другие сессии были прерваны.' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Ошибка на сервере при смене пароля.' });
    }
});

router.post('/password/verify-change', authMiddleware, async (req, res) => {
    try {
        const { code } = req.body;
        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ message: 'Пользователь не найден' });

        const requestData = passwordChangeRequests[user.email];
        if (!requestData || Date.now() > requestData.expires || requestData.code !== code) {
            return res.status(400).json({ message: 'Неверный или истекший код верификации.' });
        }
        
        user.password = requestData.newPassword;
        await user.save();
        
        delete passwordChangeRequests[user.email];
        await Session.deleteMany({ user: user._id, _id: { $ne: req.user.sessionId } });

        res.json({ message: 'Пароль успешно изменен. Все другие сессии были прерваны.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Ошибка на сервере при подтверждении смены пароля.' });
    }
});


module.exports = router;