// backend/grantSuperAdmin.js

const mongoose = require('mongoose');
const User = require('./models/User'); // Убедитесь, что путь к модели User правильный
require('dotenv').config();

// --- НАСТРОЙКИ СКРИПТА ---
// Почта пользователя, которому нужно выдать права главного администратора
const TARGET_EMAIL = 'vmireclashroyaleiclashofclans@gmail.com';
// -------------------------

const grantSuperAdminRole = async () => {
  if (!process.env.MONGO_URI) {
    console.error('\x1b[31m%s\x1b[0m', 'Ошибка: MONGO_URI не найден в файле .env.');
    return;
  }

  console.log('\x1b[36m%s\x1b[0m', '--- Запуск скрипта для выдачи прав СУПЕР АДМИНА ---');
  
  try {
    // 1. Подключение к базе данных
    console.log('1. Подключение к базе данных MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('\x1b[32m%s\x1b[0m', '   Успешно подключено.');

    // 2. Поиск пользователя по email
    console.log(`2. Поиск пользователя с email: ${TARGET_EMAIL}...`);
    const user = await User.findOne({ email: TARGET_EMAIL });

    if (!user) {
      console.error('\x1b[31m%s\x1b[0m', `   Ошибка: Пользователь с email "${TARGET_EMAIL}" не найден.`);
      return;
    }
    console.log('\x1b[32m%s\x1b[0m', `   Пользователь найден: ${user.username} (ID: ${user._id})`);

    // 3. Проверка и обновление роли
    if (user.role === 'super_admin') {
        console.log('\x1b[33m%s\x1b[0m', '   Этот пользователь уже является главным администратором. Обновление не требуется.');
    } else {
        console.log(`3. Обновление роли пользователя на "super_admin"...`);
        user.role = 'super_admin';
        await user.save();
        console.log('\x1b[32m%s\x1b[0m', '   Роль успешно обновлена.');
    }
    
    console.log('\n\x1b[32m%s\x1b[0m', `--- УСПЕХ! Пользователь ${user.username} теперь имеет права главного администратора. ---`);

  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', 'Произошла критическая ошибка во время выполнения скрипта:');
    console.error(error);
  } finally {
    // 4. Обязательное отключение от базы данных
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('4. Отключено от базы данных.');
    }
  }
};

// Запускаем выполнение основной функции
grantSuperAdminRole();