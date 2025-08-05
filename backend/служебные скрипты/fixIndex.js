// backend/fixIndex.js

const mongoose = require('mongoose');
require('dotenv').config();

const fixTrackIndex = async () => {
  if (!process.env.MONGO_URI) {
    console.error('\x1b[31m%s\x1b[0m', 'Ошибка: MONGO_URI не найден в файле .env. Убедитесь, что файл .env существует в папке backend/.');
    return;
  }

  console.log('--- Запуск скрипта исправления индекса в MongoDB ---');
  
  try {
    console.log('1. Подключение к базе данных...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('\x1b[32m%s\x1b[0m', '   Успешно подключено.');

    const collection = mongoose.connection.db.collection('tracks');
    const oldIndexName = "user_1_spotifyId_1_type_1";
    const newIndexName = "user_1_youtubeId_1_type_1";

    console.log(`2. Проверка наличия старого индекса "${oldIndexName}"...`);
    const indexExists = await collection.indexExists(oldIndexName);

    if (indexExists) {
      console.log('   Старый индекс найден. Удаление...');
      await collection.dropIndex(oldIndexName);
      console.log('\x1b[32m%s\x1b[0m', `   Индекс "${oldIndexName}" успешно удален.`);
    } else {
      console.log('\x1b[36m%s\x1b[0m', '   Старый индекс не найден. Ничего удалять не нужно.');
    }

    console.log(`3. Проверка наличия нового правильного индекса "${newIndexName}"...`);
    const newIndexExists = await collection.indexExists(newIndexName);
    
    if (newIndexExists) {
        console.log('\x1b[32m%s\x1b[0m', `   Правильный индекс "${newIndexName}" уже существует.`);
    } else {
        console.log('\x1b[33m%s\x1b[0m', `   Внимание: Правильный индекс "${newIndexName}" не найден. Он будет автоматически создан при следующем запуске вашего основного сервера.`);
    }

    console.log('\n\x1b[32m%s\x1b[0m', '--- Скрипт успешно завершил работу! ---');

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

fixTrackIndex();