// backend/seedChat.js

const mongoose = require('mongoose');
const crypto = require('crypto');
require('dotenv').config();

const User = require('./models/User');
const Conversation = require('./models/Conversation');
const Message = require('./models/Message');

// --- НАСТРОЙКИ СКРИПТА ---

// 1. Укажите email двух пользователей, между которыми нужно создать диалог
const USER_A_EMAIL = 'ruslanmailhome1@gmail.com';
const USER_B_EMAIL = 'vmireclashroyaleiclashofclans@gmail.com';

// 2. Укажите, сколько сообщений нужно создать
const NUMBER_OF_MESSAGES = 100;

// 3. Укажите, как давно должен был начаться диалог (в днях)
const DAYS_AGO = 30;

// 4. Примеры сообщений, которые будут использоваться случайным образом
const SAMPLE_MESSAGES = [
    "Привет! Как дела?",
    "Отлично, а у тебя?",
    "Тоже все хорошо. Что нового?",
    "Да так, ничего особенного. Работаю.",
    "Понятно. Может, встретимся на выходных?",
    "Отличная идея! Куда сходим?",
    "Можно в кино или просто погулять в парке.",
    "Давай в парк, погода обещает быть хорошей.",
    "Супер, договорились! Тогда в субботу?",
    "Да, в субботу в 15:00 у входа. Ок?",
    "Ок, до встречи!",
    "Скинь фотку, которую ты сделал вчера.",
    "Ага, сейчас найду.",
    "Слушай, я тут такой фильм посмотрел...",
    "Какой?",
    "Называется 'Начало'. Очень рекомендую, если не видел.",
    "Спасибо, посмотрю обязательно.",
    "Ты не забыл про нашу встречу?",
    "Нет, конечно! Уже собираюсь.",
    "Кстати, видел последние новости?",
    "Неа, что там?",
    "Потом расскажу, долго писать.",
];

// --- КОНЕЦ НАСТРОЕК ---


const seedChat = async () => {
    console.log('\x1b[36m%s\x1b[0m', '--- Запуск скрипта для заполнения диалога ---');

    try {
        // 1. Подключение к базе данных
        console.log('1. Подключение к MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('\x1b[32m%s\x1b[0m', '   Успешно подключено.');

        // 2. Поиск пользователей и диалога
        console.log('2. Поиск пользователей и диалога...');
        const userA = await User.findOne({ email: USER_A_EMAIL });
        const userB = await User.findOne({ email: USER_B_EMAIL });

        if (!userA || !userB) {
            console.error('\x1b[31m%s\x1b[0m', 'Ошибка: Один или оба пользователя не найдены в базе данных. Проверьте email в настройках.');
            return;
        }
        console.log(`   Найдены пользователи: ${userA.username} и ${userB.username}`);

        let conversation = await Conversation.findOne({
            participants: { $all: [userA._id, userB._id], $size: 2 }
        });

        if (!conversation) {
            console.log('\x1b[33m%s\x1b[0m', '   Диалог не найден, создаем новый...');
            conversation = new Conversation({ participants: [userA._id, userB._id] });
            await conversation.save();
            console.log('\x1b[32m%s\x1b[0m', '   Новый диалог успешно создан.');
        } else {
            console.log('   Диалог найден.');
        }
        
        // 3. Очистка старых сообщений в этом диалоге
        console.log('3. Очистка старых сообщений в этом диалоге...');
        await Message.deleteMany({ conversation: conversation._id });
        console.log('   Старые сообщения удалены.');


        // 4. Генерация и вставка новых сообщений
        console.log(`4. Генерация ${NUMBER_OF_MESSAGES} новых сообщений...`);
        const messagesToInsert = [];
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - DAYS_AGO);

        let currentDate = startDate;

        for (let i = 0; i < NUMBER_OF_MESSAGES; i++) {
            const sender = i % 2 === 0 ? userA : userB;
            const text = SAMPLE_MESSAGES[Math.floor(Math.random() * SAMPLE_MESSAGES.length)];
            const uuid = crypto.randomUUID();

            // Создаем копию сообщения для каждого участника
            const messageForOwnerA = {
                conversation: conversation._id,
                owner: userA._id,
                uuid,
                sender: sender._id,
                text,
                createdAt: new Date(currentDate),
                updatedAt: new Date(currentDate),
            };
            const messageForOwnerB = {
                ...messageForOwnerA,
                owner: userB._id,
            };

            messagesToInsert.push(messageForOwnerA, messageForOwnerB);

            // --- Улучшенная логика для создания реалистичных интервалов ---
            // Добавляем небольшой интервал для имитации быстрого ответа (1-15 минут)
            const replyMinutes = Math.floor(Math.random() * 14) + 1;
            currentDate.setMinutes(currentDate.getMinutes() + replyMinutes);

            // С вероятностью 20% добавляем большую паузу (от 6 до 24 часов), чтобы перенести диалог на следующий день
            if (Math.random() < 0.2) {
                const pauseHours = Math.floor(Math.random() * 18) + 6;
                currentDate.setHours(currentDate.getHours() + pauseHours);
            }

            // Предотвращаем создание сообщений в будущем
            if (currentDate > new Date()) {
                break; // Если дата превысила текущую, останавливаем генерацию
            }
            // --- Конец улучшенной логики ---
        }
        
        console.log(`   Подготовлено ${messagesToInsert.length} документов для вставки.`);
        if (messagesToInsert.length === 0) {
            console.log('\x1b[33m%s\x1b[0m', '   Нет сообщений для вставки. Возможно, период времени слишком мал.');
        } else {
            const createdMessages = await Message.insertMany(messagesToInsert);
            console.log('\x1b[32m%s\x1b[0m', `   Успешно вставлено ${createdMessages.length} сообщений.`);
            
            // 5. Обновление последнего сообщения в диалоге
            console.log('5. Обновление последнего сообщения в диалоге...');
            const lastMessage = createdMessages[createdMessages.length - 1];
            conversation.lastMessage = lastMessage._id;
            await conversation.save();
            console.log('   Последнее сообщение обновлено.');
        }

        console.log('\n\x1b[32m%s\x1b[0m', '--- Скрипт успешно завершил работу! ---');

    } catch (error) {
        console.error('\x1b[31m%s\x1b[0m', 'Произошла ошибка во время выполнения скрипта:');
        console.error(error);
    } finally {
        if (mongoose.connection.readyState === 1) {
            await mongoose.disconnect();
            console.log('6. Отключено от базы данных.');
        }
    }
};

seedChat();