// backend/fixGhostPins.js

const mongoose = require('mongoose');
require('dotenv').config();
const Conversation = require('./models/Conversation');

const fixGhostPins = async () => {
    console.log('\x1b[36m%s\x1b[0m', '--- Запуск скрипта для исправления "призрачных" закреплений ---');
    try {
        console.log('1. Подключение к MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('\x1b[32m%s\x1b[0m', '   Успешно подключено.');

        console.log('2. Поиск заархивированных, но все еще закрепленных чатов...');
        const result = await Conversation.updateMany(
            // Найти все диалоги, где ID пользователя есть ОДНОВРЕМЕННО
            // и в списке закрепивших, и в списке заархивировавших
            { $expr: { $gt: [{ $size: { $setIntersection: ["$pinnedBy", "$archivedBy"] } }, 0] } },
            // Убрать ID этого пользователя из списка закрепивших
            [ { $set: { pinnedBy: { $setDifference: ["$pinnedBy", "$archivedBy"] } } } ]
        );

        console.log('\x1b[32m%s\x1b[0m', `   Завершено. Найдено и исправлено некорректных записей: ${result.modifiedCount}`);
        console.log('\n\x1b[32m%s\x1b[0m', '--- Скрипт успешно завершил работу! ---');

    } catch (error) {
        console.error('\x1b[31m%s\x1b[0m', 'Произошла ошибка во время выполнения скрипта:');
        console.error(error);
    } finally {
        if (mongoose.connection.readyState === 1) {
            await mongoose.disconnect();
            console.log('3. Отключено от MongoDB.');
        }
    }
};

fixGhostPins();