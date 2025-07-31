// backend/config/passport-setup.js
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

passport.use(
    new GoogleStrategy({
        // опции для стратегии Google
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        // ИЗМЕНЕНИЕ: Указываем полный URL с портом 5000 для перенаправления
        callbackURL: `https://flowme-4q7u.onrender.com/api/auth/google/callback`,
        proxy: true // Добавляем этот параметр для корректной работы за прокси (например, при деплое)
    }, async (accessToken, refreshToken, profile, done) => {
        // Эта функция вызывается, когда Google успешно аутентифицировал пользователя
        
        try {
            // Проверяем, есть ли уже такой пользователь в нашей БД
            const existingUser = await User.findOne({ email: profile.emails[0].value });

            if (existingUser) {
                // Если есть - просто возвращаем его
                return done(null, existingUser);
            } else {
                // Если нет - создаем нового пользователя
                const newUser = await new User({
                    username: profile.displayName,
                    email: profile.emails[0].value,
                    password: null, // Пароль не нужен при OAuth
                    // googleId: profile.id, 
                    // avatar: profile.photos[0].value
                }).save();
                return done(null, newUser);
            }
        } catch (error) {
            return done(error, false);
        }
    })
);