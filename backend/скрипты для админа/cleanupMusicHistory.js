// backend/cleanupMusicHistory.js

const mongoose = require('mongoose');
const Track = require('../models/Track'); // Убедитесь, что путь к модели Track правильный
require('dotenv').config();

const cleanupHistory = async () => {
  if (!process.env.MONGO_URI) {
    console.error('\x1b[31m%s\x1b[0m', 'Ошибка: MONGO_URI не найден в файле .env.');
    return;
  }

  console.log('--- Запуск скрипта для очистки истории прослушиваний ---');
  
  try {
    console.log('1. Подключение к базе данных MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('\x1b[32m%s\x1b[0m', '   Успешно подключено.');

    // Фильтр для поиска всех треков, являющихся частью истории прослушиваний
    const filter = { type: 'recent' };
    
    console.log('2. Подсчет количества записей в истории для удаления (с type: "recent")...');
    const count = await Track.countDocuments(filter);
    
    if (count === 0) {
      console.log('\x1b[36m%s\x1b[0m', '   Нет записей в истории для удаления. Очистка не требуется.');
    } else {
      console.log(`   Найдено ${count} записей для удаления.`);
      console.log('3. Удаление всех записей из истории прослушиваний...');
      
      const deleteResult = await Track.deleteMany(filter);
      
      console.log('\x1b[32m%s\x1b[0m', `   Успешно удалено ${deleteResult.deletedCount} записей.`);
    }

    console.log('\n\x1b[32m%s\x1b[0m', '--- Скрипт успешно завершил работу! История прослушиваний для всех пользователей очищена. ---');

  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', 'Произошла ошибка во время выполнения скрипта:');
    console.error(error);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('4. Отключено от базы данных.');
    }
  }
};

cleanupHistory();