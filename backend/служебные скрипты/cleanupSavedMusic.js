const mongoose = require('mongoose');
const User = require('../models/User'); // Убедитесь, что пути к моделям правильные
const Track = require('../models/Track');
require('dotenv').config();

const cleanupSavedMusic = async () => {
  if (!process.env.MONGO_URI) {
    console.error('\x1b[31m%s\x1b[0m', 'Ошибка: MONGO_URI не найден в файле .env.');
    return;
  }

  console.log('\x1b[36m%s\x1b[0m', '--- Запуск скрипта для очистки сохраненной музыки ("Моя музыка") ---');
  
  try {
    console.log('1. Подключение к базе данных MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('\x1b[32m%s\x1b[0m', '   Успешно подключено.');

    // Фильтр для поиска всех треков, добавленных пользователями в "Мою музыку"
    const filter = { type: 'saved' };
    
    console.log('2. Подсчет количества треков для удаления...');
    const count = await Track.countDocuments(filter);
    
    if (count === 0) {
      console.log('\x1b[33m%s\x1b[0m', '   Нет сохраненных треков для удаления. Очистка не требуется.');
    } else {
      console.log(`   Найдено ${count} треков для удаления.`);
      console.log('3. Удаление всех треков с type: "saved"...');
      
      const deleteResult = await Track.deleteMany(filter);
      
      console.log('\x1b[32m%s\x1b[0m', `   Успешно удалено ${deleteResult.deletedCount} треков.`);
    }

    console.log('\n\x1b[32m%s\x1b[0m', '--- Скрипт успешно завершил работу! "Моя музыка" для всех пользователей очищена. ---');

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

cleanupSavedMusic();