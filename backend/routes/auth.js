// backend/routes/auth.js

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt =require('jsonwebtoken');
const nodemailer = require('nodemailer');
const passport = require('passport');
const crypto = require('crypto');
const parser = require('ua-parser-js');
const geoip = require('geoip-lite');

const User = require('../models/User'); 
const Session = require('../models/Session');
// --- ИЗМЕНЕНИЕ: Импортируем middleware для защиты нового роута ---
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

const verificationCodes = {};

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

const setAuthCookie = (res, token) => {
    const cookieDomain = process.env.NODE_ENV === 'production' 
        ? '.onrender.com' 
        : undefined;

    res.cookie('token', token, {
        httpOnly: true,
        secure: true, // Всегда true для продакшена
        sameSite: 'none', // Обязательно 'none' для кросс-доменных запросов
        maxAge: 24 * 60 * 60 * 1000, // 24 часа
        domain: cookieDomain // Явно указываем домен
    });
};

const createSessionAndToken = async (user, req) => {
    const ua = parser(req.headers['user-agent']);
    let finalIp = (req.body && req.body.publicIp) ? req.body.publicIp : (req.headers['x-forwarded-for'] || req.connection.remoteAddress);
    const geo = geoip.lookup(finalIp);
    const newSession = new Session({
        user: user._id,
        ipAddress: finalIp,
        userAgent: req.headers['user-agent'],
        device: ua.device.vendor ? `${ua.device.vendor} ${ua.device.model}` : 'Unknown Device',
        os: ua.os.name ? `${ua.os.name} ${ua.os.version}` : 'Unknown OS',
        browser: ua.browser.name ? `${ua.browser.name} ${ua.browser.version}` : 'Unknown Browser',
        countryCode: (geo && geo.country) ? geo.country.toLowerCase() : 'xx',
    });

    const token = jwt.sign(
        { userId: user._id, username: user.username, sessionId: newSession._id },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );   
    newSession.token = token;
    await newSession.save();   
    return token;
};

// ... роут /register без изменений ...
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, confirmPassword } = req.body;
        if (!username || !email || !password || !confirmPassword) {
            return res.status(400).json({ message: 'Пожалуйста, заполните все поля' });
        }
        if (username.length < 3 || username.length > 20) {
            return res.status(400).json({ message: 'Имя пользователя должно содержать от 3 до 20 символов' });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ message: 'Неверный формат почты' });
        }
        if (password.length < 6 || password.length > 30) {
            return res.status(400).json({ message: 'Пароль должен содержать от 6 до 30 символов' });
        }
        if (password !== confirmPassword) {
            return res.status(400).json({ message: 'Пароли не совпадают' });
        }
        const existingUserByEmail = await User.findOne({ email: email });
        if (existingUserByEmail) {
            return res.status(400).json({ message: 'Пользователь с такой почтой уже существует' });
        }
        const existingUserByUsername = await User.findOne({ username: username });
        if (existingUserByUsername) {
            return res.status(400).json({ message: 'Это имя пользователя уже занято' });
        }
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        verificationCodes[email] = {
            code: verificationCode,
            tempUser: { username, email, password },
            expires: Date.now() + 10 * 60 * 1000,
        };
        await transporter.sendMail({
            from: `"Flow me" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Код подтверждения регистрации',
            html: `<h1>Добро пожаловать в Flow me!</h1><p>Ваш код для подтверждения регистрации: <strong>${verificationCode}</strong></p>`,
        });
        res.status(201).json({ message: 'Код подтверждения успешно отправлен на вашу почту.' });
    } catch (error) {
        console.error('Ошибка при регистрации:', error);
        res.status(500).json({ message: 'Ошибка на сервере при попытке регистрации.' });
    }
});

router.post('/verify-email', async (req, res) => {
    try {
        const { email, code } = req.body;
        const data = verificationCodes[email];
        if (!data || Date.now() > data.expires || data.code !== code) {
            return res.status(400).json({ message: 'Неверный или истекший код верификации.' });
        }
        const { username, password } = data.tempUser;
        const hashedPassword = await bcrypt.hash(password, 12);
        const newUser = new User({ username, email, password: hashedPassword });
        await newUser.save();
        delete verificationCodes[email];
        
        const token = await createSessionAndToken(newUser, req);
        
        setAuthCookie(res, token);
        res.status(201).json({ 
            message: 'Аккаунт успешно создан и подтвержден!',
            token,
            user: { id: newUser._id, username: newUser.username }
        });
    } catch (error) {
        console.error('Ошибка при верификации:', error);
        res.status(500).json({ message: 'Ошибка на сервере при верификации.' });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Пожалуйста, введите почту и пароль.' });
        }
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Пользователь с такой почтой не найден.' });
        }
        if (!user.password) {
            return res.status(400).json({ message: 'Этот аккаунт был зарегистрирован через Google. Пожалуйста, войдите через Google.' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Неверный пароль.' });
        }
        
        const token = await createSessionAndToken(user, req);

        setAuthCookie(res, token);
        res.json({ 
            message: 'Вы успешно вошли!',
            token,
            user: { id: user._id, username: user.username } 
        });
    } catch (error) {
         console.error('Ошибка при входе:', error);
         res.status(500).json({ message: 'Ошибка на сервере при попытке входа.' });
    }
});

router.post('/logout', (req, res) => {
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
    });
    res.status(200).json({ message: 'Вы успешно вышли.' });
});


// --- РОУТЫ ДЛЯ GOOGLE OAUTH ---
router.get('/google', passport.authenticate('google', {
    scope: ['profile', 'email']
}));

// --- ИЗМЕНЕНИЕ: Убираем токен из URL редиректа ---
router.get('/google/callback', passport.authenticate('google', { session: false, failureRedirect: '/login' }), async (req, res) => {
    const token = await createSessionAndToken(req.user, req);
    setAuthCookie(res, token);
    
    // Просто перенаправляем на страницу-обработчик на фронтенде без токена
    res.redirect(`${process.env.CLIENT_URL}/auth/callback`);
});

// --- ИЗМЕНЕНИЕ: Новый безопасный роут для получения токена и данных сессии ---
router.get('/session-data', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('id username');
        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден.' });
        }
        // Возвращаем токен из cookie и данные пользователя
        res.json({
            token: req.cookies.token,
            user: { id: user._id, username: user.username }
        });
    } catch (error) {
        console.error('Ошибка при получении данных сессии:', error);
        res.status(500).json({ message: 'Ошибка на сервере.' });
    }
});


// ... роуты сброса пароля без изменений ...
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(200).json({ message: 'Если такой аккаунт существует, мы отправили инструкцию по сбросу пароля на указанную почту.' });
        }
        const token = crypto.randomBytes(20).toString('hex');
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 час
        await user.save();
        const resetLink = `${process.env.CLIENT_URL}/reset-password/${token}`;

        await transporter.sendMail({
            from: `"Flow me" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: 'Сброс пароля на Flow me',
            html: `<h1>Запрос на сброс пароля</h1><p>Вы получили это письмо, потому что вы (или кто-то другой) запросили сброс пароля для вашего аккаунта.</p><p>Пожалуйста, нажмите на ссылку ниже или вставьте ее в браузер, чтобы установить новый пароль:</p><a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #3664F4; color: white; text-decoration: none; border-radius: 5px;">Сбросить пароль</a><p>Если вы не запрашивали сброс, просто проигнорируйте это письмо.</p><p>Ссылка действительна в течение одного часа.</p>`,
        });

        res.status(200).json({ message: 'Если такой аккаунт существует, мы отправили инструкцию по сбросу пароля на указанную почту.' });

    } catch (error) {
        console.error('Ошибка при сбросе пароля:', error);
        res.status(500).json({ message: 'Ошибка на сервере.' });
    }
});
router.post('/reset-password/:token', async (req, res) => {
    try {
        const user = await User.findOne({ 
            resetPasswordToken: req.params.token,
            resetPasswordExpires: { $gt: Date.now() } 
        });

        if (!user) {
            return res.status(400).json({ message: 'Токен для сброса пароля недействителен или истек.' });
        }
        
        const { password, confirmPassword } = req.body;
        if (password.length < 6) {
             return res.status(400).json({ message: 'Пароль должен содержать от 6 до 30 символов' });
        }
        if (password !== confirmPassword) {
            return res.status(400).json({ message: 'Пароли не совпадают.' });
        }
        const hashedPassword = await bcrypt.hash(password, 12);
        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();
        res.status(200).json({ message: 'Пароль успешно изменен! Теперь вы можете войти с новым паролем.' });
    } catch (error) {
        console.error('Ошибка при установке нового пароля:', error);
        res.status(500).json({ message: 'Ошибка на сервере.' });
    }
});

module.exports = router;