// backend/fixGhostPins.js

const mongoose = require('mongoose');
require('dotenv').config();
const Conversation = require('./models/Conversation');

const fixGhostPins = async () => {
    console.log('\x1b[36m%s\x1b[0m', '--- Запуск скрипта для исправления "призрачных" закреплений (v2) ---');
    try {
        console.log('1. Подключение к MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('\x1b[32m%s\x1b[0m', '   Успешно подключено.');

        console.log('2. Поиск заархивированных, но все еще закрепленных чатов...');
        const result = await Conversation.updateMany(
            // --- НАЧАЛО ИСПРАВЛЕНИЯ: Добавляем проверку на null с помощью $ifNull ---
            // Найти все диалоги, где пересечение массивов pinnedBy и archivedBy не пустое.
            // Если какого-то из полей нет, оно будет считаться пустым массивом [].
            { 
                $expr: { 
                    $gt: [
                        { $size: { $setIntersection: [ { $ifNull: ["$pinnedBy", []] }, { $ifNull: ["$archivedBy", []] } ] } }, 
                        0
                    ] 
                } 
            },
            // Убрать из массива pinnedBy все ID, которые также есть в массиве archivedBy.
            [ 
              { 
                $set: { 
                    pinnedBy: { 
                        $setDifference: [ { $ifNull: ["$pinnedBy", []] }, { $ifNull: ["$archivedBy", []] } ] 
                    } 
                } 
              } 
            ]
            // --- КОНЕЦ ИСПРАВЛЕНИЯ ---
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