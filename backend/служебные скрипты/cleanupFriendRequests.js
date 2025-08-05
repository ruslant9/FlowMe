const mongoose = require('mongoose');
const User = require('../models/User'); // Убедитесь, что путь к модели User правильный
require('dotenv').config();

const cleanupFriendRequests = async () => {
  if (!process.env.MONGO_URI) {
    console.error('\x1b[31m%s\x1b[0m', 'Ошибка: MONGO_URI не найден в файле .env.');
    return;
  }

  console.log('\x1b[36m%s\x1b[0m', '--- Запуск скрипта для удаления всех заявок в друзья ---');
  
  try {
    console.log('1. Подключение к базе данных MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('\x1b[32m%s\x1b[0m', '   Успешно подключено.');
    
    // 2. Очищаем массивы friendRequestsSent и friendRequestsReceived у всех пользователей
    console.log('2. Очистка всех отправленных и полученных заявок в друзья...');
    
    const updateResult = await User.updateMany(
      {}, // Пустой фильтр означает "для всех пользователей"
      { $set: { friendRequestsSent: [], friendRequestsReceived: [] } }
    );
    
    console.log('\x1b[32m%s\x1b[0m', `   Успешно обновлено ${updateResult.modifiedCount} пользователей.`);
    
    console.log('\n\x1b[32m%s\x1b[0m', '--- Скрипт успешно завершил работу! Все заявки в друзья удалены. ---');

  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', 'Произошла ошибка во время выполнения скрипта:');
    console.error(error);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('3. Отключено от базы данных.');
    }
  }
};

cleanupFriendRequests();