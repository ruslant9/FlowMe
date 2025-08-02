// backend/grantPremium.js

const mongoose = require('mongoose');
const User = require('./models/User'); // Убедитесь, что путь к модели User правильный
require('dotenv').config();

// --- НАСТРОЙКИ СКРИПТА ---
const TARGET_EMAIL = 'vmireclashroyaleiclashofclans@gmail.com'; // Email пользователя, которому выдаем премиум
const DURATION_DAYS = 30; // Длительность подписки в днях (1 месяц)
// -------------------------

const grantPremium = async () => {
  if (!process.env.MONGO_URI) {
    console.error('\x1b[31m%s\x1b[0m', 'Ошибка: MONGO_URI не найден в файле .env.');
    return;
  }

  console.log('\x1b[36m%s\x1b[0m', '--- Запуск скрипта для выдачи PREMIUM ---');
  
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

    // 3. Расчет новой даты окончания подписки
    console.log(`3. Расчет даты окончания подписки (+${DURATION_DAYS} дней)...`);
    const now = new Date();
    const currentExpiresAt = user.premium?.expiresAt;
    
    // Если у пользователя уже есть активная подписка, продлеваем ее. Иначе - начинаем с текущего момента.
    const startDate = (currentExpiresAt && currentExpiresAt > now) ? currentExpiresAt : now;
    
    const newExpiresAt = new Date(startDate);
    newExpiresAt.setDate(newExpiresAt.getDate() + DURATION_DAYS);

    console.log(`   Старая дата окончания: ${currentExpiresAt ? currentExpiresAt.toLocaleDateString('ru-RU') : 'Нет'}`);
    console.log(`   Новая дата окончания: ${newExpiresAt.toLocaleDateString('ru-RU')}`);

    // 4. Обновление данных пользователя
    console.log('4. Обновление данных пользователя в базе...');
    user.premium = {
      isActive: true,
      expiresAt: newExpiresAt,
      plan: '1_month' // Административная выдача, чтобы отличать от покупки
    };

    await user.save();
    console.log('\x1b[32m%s\x1b[0m', '   Данные пользователя успешно сохранены.');
    
    console.log('\n\x1b[32m%s\x1b[0m', `--- УСПЕХ! PREMIUM-статус для пользователя ${user.username} активен до ${newExpiresAt.toLocaleString('ru-RU')}. ---`);

  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', 'Произошла критическая ошибка во время выполнения скрипта:');
    console.error(error);
  } finally {
    // 5. Обязательное отключение от базы данных
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('5. Отключено от базы данных.');
    }
  }
};

// Запускаем выполнение основной функции
grantPremium();