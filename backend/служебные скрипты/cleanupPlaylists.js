const mongoose = require('mongoose');
const Playlist = require('../models/Playlist'); // Убедитесь, что путь к модели Playlist правильный
require('dotenv').config();

const cleanupPlaylists = async () => {
  if (!process.env.MONGO_URI) {
    console.error('\x1b[31m%s\x1b[0m', 'Ошибка: MONGO_URI не найден в файле .env.');
    return;
  }

  console.log('\x1b[36m%s\x1b[0m', '--- Запуск скрипта для удаления ВСЕХ плейлистов ---');
  
  try {
    console.log('1. Подключение к базе данных MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('\x1b[32m%s\x1b[0m', '   Успешно подключено.');

    console.log('2. Подсчет количества плейлистов для удаления...');
    const count = await Playlist.countDocuments({});
    
    if (count === 0) {
      console.log('\x1b[33m%s\x1b[0m', '   Нет плейлистов для удаления. Очистка не требуется.');
    } else {
      console.log(`   Найдено ${count} плейлистов для удаления.`);
      console.log('3. Удаление всех плейлистов из коллекции...');
      
      const deleteResult = await Playlist.deleteMany({});
      
      console.log('\x1b[32m%s\x1b[0m', `   Успешно удалено ${deleteResult.deletedCount} плейлистов.`);
    }

    console.log('\n\x1b[32m%s\x1b[0m', '--- Скрипт успешно завершил работу! Все пользовательские плейлисты удалены. ---');

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

cleanupPlaylists();