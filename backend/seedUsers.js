// backend/seedUsers.js --- НОВЫЙ ФАЙЛ ---

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Убедитесь, что путь к модели User правильный
const User = require('./models/User');

// --- НАСТРОЙКИ СКРИПТА ---
const NUMBER_OF_USERS = 10;
const BASE_PASSWORD = "password123"; // У всех тестовых пользователей будет этот пароль
// --- КОНЕЦ НАСТРОЕК ---

const seedUsers = async () => {
    console.log('\x1b[36m%s\x1b[0m', '--- Запуск скрипта для создания тестовых пользователей ---');

    if (!process.env.MONGO_URI) {
        console.error('\x1b[31m%s\x1b[0m', 'Ошибка: MONGO_URI не найден в файле .env.');
        return;
    }

    try {
        // 1. Подключение к базе данных
        console.log('1. Подключение к MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('\x1b[32m%s\x1b[0m', '   Успешно подключено.');

        // 2. Генерация и сохранение пользователей
        console.log(`2. Создание ${NUMBER_OF_USERS} тестовых пользователей...`);

        // Хешируем пароль один раз, чтобы не делать это в цикле
        const hashedPassword = await bcrypt.hash(BASE_PASSWORD, 12);
        let createdCount = 0;

        for (let i = 1; i <= NUMBER_OF_USERS; i++) {
            const userData = {
                username: `testuser${i}`,
                fullName: `Тестовый Пользователь ${i}`,
                email: `testuser${i}@example.com`,
                password: hashedPassword
            };

            // Проверяем, существует ли пользователь с таким email или username
            const existingUser = await User.findOne({
                $or: [{ email: userData.email }, { username: userData.username }]
            });

            if (existingUser) {
                console.log('\x1b[33m%s\x1b[0m', `   -> Пользователь ${userData.username} уже существует. Пропускаем.`);
                continue; // Переходим к следующему пользователю
            }

            // Создаем и сохраняем нового пользователя
            const newUser = new User(userData);
            await newUser.save();
            createdCount++;
            console.log(`   -> Создан пользователь: ${newUser.username} (${newUser.email})`);
        }
        
        if (createdCount > 0) {
            console.log('\x1b[32m%s\x1b[0m', `   Успешно создано ${createdCount} новых пользователей.`);
        } else {
            console.log('\x1b[33m%s\x1b[0m', '   Новых пользователей не создано (все уже существуют).');
        }


        console.log('\n\x1b[32m%s\x1b[0m', `--- Скрипт успешно завершен! ---`);
        console.log(`Пароль для всех тестовых пользователей: "${BASE_PASSWORD}"`);

    } catch (error) {
        console.error('\x1b[31m%s\x1b[0m', 'Произошла ошибка во время выполнения скрипта:');
        console.error(error);
    } finally {
        // 3. Обязательно отключаемся от базы данных
        if (mongoose.connection.readyState === 1) {
            await mongoose.disconnect();
            console.log('3. Отключено от MongoDB.');
        }
    }
};

// Запускаем выполнение скрипта
seedUsers();