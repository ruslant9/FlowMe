// backend/unpinAllChats.js

const mongoose = require('mongoose');
const Conversation = require('./models/Conversation'); // Убедитесь, что путь к модели Conversation правильный
require('dotenv').config();

const unpinAllChats = async () => {
  if (!process.env.MONGO_URI) {
    console.error('\x1b[31m%s\x1b[0m', 'Ошибка: MONGO_URI не найден в файле .env.');
    return;
  }

  console.log('\x1b[36m%s\x1b[0m', '--- Запуск скрипта для принудительного открепления всех чатов ---');
  
  try {
    console.log('1. Подключение к базе данных MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('\x1b[32m%s\x1b[0m', '   Успешно подключено.');
    
    console.log('2. Обновление всех диалогов: установка поля pinnedBy в пустой массив...');
    
    const updateResult = await Conversation.updateMany(
      { 'pinnedBy.0': { $exists: true } }, // Для эффективности обновляем только те документы, где массив pinnedBy не пустой
      { $set: { pinnedBy: [] } }
    );
    
    console.log('\x1b[32m%s\x1b[0m', `   Успешно обновлено ${updateResult.modifiedCount} диалогов.`);
    
    console.log('\n\x1b[32m%s\x1b[0m', '--- Скрипт успешно завершил работу! Все чаты были откреплены для всех пользователей. ---');

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

unpinAllChats();