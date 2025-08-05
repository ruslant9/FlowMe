// backend/markAllAsRead.js

const mongoose = require('mongoose');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
require('dotenv').config();

const markAllAsRead = async () => {
  if (!process.env.MONGO_URI) {
    console.error('\x1b[31m%s\x1b[0m', 'Ошибка: MONGO_URI не найден в файле .env.');
    return;
  }

  console.log('\x1b[36m%s\x1b[0m', '--- Запуск скрипта для пометки всех диалогов прочитанными ---');
  
  try {
    console.log('1. Подключение к базе данных MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('\x1b[32m%s\x1b[0m', '   Успешно подключено.');

    // --- Шаг 1: Сброс флага "помечено как непрочитанное" для всех диалогов ---
    console.log('\n2. Сброс флага "помечено как непрочитанное" для всех диалогов...');
    const convUpdateResult = await Conversation.updateMany(
      { 'markedAsUnreadBy.0': { $exists: true } }, // Обновляем только те, где массив не пуст
      { $set: { markedAsUnreadBy: [] } }
    );
    console.log('\x1b[32m%s\x1b[0m', `   Успешно обновлено ${convUpdateResult.modifiedCount} диалогов.`);

    // --- Шаг 2: Пометка всех сообщений как прочитанных для их получателей ---
    console.log('\n3. Обновление статуса сообщений на "прочитано" для всех пользователей...');
    
    // Получаем ID всех пользователей
    const allUsers = await User.find({}).select('_id').lean();
    const userIds = allUsers.map(u => u._id);
    
    if (userIds.length === 0) {
        console.log('\x1b[33m%s\x1b[0m', '   Пользователи не найдены. Пропускаем шаг.');
    } else {
        console.log(`   Найдено ${userIds.length} пользователей. Начинаем обработку...`);
        let totalMessagesUpdated = 0;
        
        // Для каждого пользователя находим все сообщения, где он является получателем, и помечаем их прочитанными
        for (let i = 0; i < userIds.length; i++) {
            const userId = userIds[i];
            const result = await Message.updateMany(
                { 
                    owner: userId,                // Это копия сообщения пользователя
                    sender: { $ne: userId },      // Отправитель - не он сам
                    readBy: { $ne: userId }       // Он еще не читал это сообщение
                },
                { $addToSet: { readBy: userId } } // Добавляем его ID в список прочитавших
            );

            if (result.modifiedCount > 0) {
                totalMessagesUpdated += result.modifiedCount;
            }
            // Выводим прогресс в той же строке
            process.stdout.write(`   Обработка пользователя ${i + 1} из ${userIds.length}... Обновлено сообщений: ${result.modifiedCount}\r`);
        }
        process.stdout.write('\n'); // Переход на новую строку после завершения цикла
        console.log('\x1b[32m%s\x1b[0m', `   Завершено. Всего обновлено ${totalMessagesUpdated} сообщений.`);
    }

    console.log('\n\x1b[32m%s\x1b[0m', '--- Скрипт успешно завершил работу! Все диалоги и сообщения помечены как прочитанные. ---');

  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', 'Произошла ошибка во время выполнения скрипта:');
    console.error(error);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('\n4. Отключено от базы данных.');
    }
  }
};

markAllAsRead();