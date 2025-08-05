// backend/seedPacks.js --- НОВЫЙ ФАЙЛ ---

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');
const ContentPack = require('../models/ContentPack');

const emojiPacks = [
    {
        name: "Мемы",
        emojis: [
            { id: '19508-gotica', name: 'Gotica', url: 'https://cdn3.emoji.gg/emojis/19508-gotica.gif' },
            { id: '96427-thisisfinewooper', name: 'Всё в порядке', url: 'https://cdn3.emoji.gg/emojis/96427-thisisfinewooper.gif' },
            { id: '32875-newyork-meme1', name: 'Мем Нью-Йорк', url: 'https://cdn3.emoji.gg/emojis/32875-newyork-meme1.gif' },
            { id: '5896-uncomfortable-dog', name: 'Неудобная собака', url: 'https://cdn3.emoji.gg/emojis/5896-uncomfortable-dog.gif' },
        ]
    },
    {
        name: "Животные",
        emojis: [
            { id: '13344-cat-wtf', name: 'Cat WTF', url: 'https://cdn3.emoji.gg/emojis/13344-cat-wtf.gif' },
            { id: '14021-vibingkitty', name: 'Качающий котик', url: 'https://cdn3.emoji.gg/emojis/14021-vibingkitty.gif' },
            { id: '25050-waiting-monkey', name: 'Ждущая обезьяна', url: 'https://cdn3.emoji.gg/emojis/25050-waiting-monkey.gif' },
            { id: '80295-cat-lick', name: 'Кот облизывается', url: 'https://cdn3.emoji.gg/emojis/80295-cat-lick.gif' },
            { id: '93210-cat-wave', name: 'Cat Wave', url: 'https://cdn3.emoji.gg/emojis/93210-cat-wave.gif' },
            { id: '1383-cowdance', name: 'Танцующая корова', url: 'https://cdn3.emoji.gg/emojis/1383-cowdance.gif' },
            { id: '1383-hamster', name: 'Хомячок', url: 'https://cdn3.emoji.gg/emojis/1383-hamster.gif' },
            { id: '1465-hammy', name: 'Хомяк', url: 'https://cdn3.emoji.gg/emojis/1465-hammy.gif' },
        ]
    },
    {
        name: "Реакции",
        emojis: [
            { id: '11318-tongueblush', name: 'Язык и румянец', url: 'https://cdn3.emoji.gg/emojis/11318-tongueblush.gif' },
            { id: '18352-uzishrug', name: 'Uzi Shrug', url: 'https://cdn3.emoji.gg/emojis/18352-uzishrug.gif' },
            { id: '22248-laugh-wine', name: 'Смех с вином', url: 'https://cdn3.emoji.gg/emojis/22248-laugh-wine.gif' },
            { id: '26213-koksal-laugh', name: 'Koksal Laugh', url: 'https://cdn3.emoji.gg/emojis/26213-koksal-laugh.gif' },
            { id: '76121-cry', name: 'Cry', url: 'https://cdn3.emoji.gg/emojis/76121-cry.gif' },
            { id: '76744-sideeye', name: 'Side Eye', url: 'https://cdn3.emoji.gg/emojis/76744-sideeye.gif' },
            { id: '93151-smile-cry', name: 'Smile Cry', url: 'https://cdn3.emoji.gg/emojis/93151-smile-cry.gif' },
        ]
    },
    {
        name: "Персонажи",
        emojis: [
            { id: '16435-sonicthumbsup', name: 'Sonic Thumbs Up', url: 'https://cdn3.emoji.gg/emojis/16435-sonicthumbsup.gif' },
            { id: '30388-mikuvibin', name: 'Miku Vibin', url: 'https://cdn3.emoji.gg/emojis/30388-mikuvibin.gif' },
            { id: '29720-hellokitty', name: 'Hello Kitty', url: 'https://cdn3.emoji.gg/emojis/29720-hellokitty.gif' },
            { id: '21893-emo', name: 'Эмо', url: 'https://cdn3.emoji.gg/emojis/21893-emo.gif' },
            { id: '22683-baldman-smoking', name: 'Курящий лысый', url: 'https://cdn3.emoji.gg/emojis/22683-baldman-smoking.gif' },
            { id: '24659-toadkartwin', name: 'Тоад победил', url: 'https://cdn3.emoji.gg/emojis/24659-toadkartwin.gif' },
            { id: '31837-walter', name: 'Walter', url: 'https://cdn3.emoji.gg/emojis/31837-walter.gif' },
            { id: '39884-wariotwerk', name: 'Wario Twerk', url: 'https://cdn3.emoji.gg/emojis/39884-wariotwerk.gif' },
            { id: '64038-mariodancing', name: 'Танцующий Марио', url: 'https://cdn3.emoji.gg/emojis/64038-mariodancing.gif' },
            { id: '98136-snoopyshades', name: 'Snoopy Shades', url: 'https://cdn3.emoji.gg/emojis/98136-snoopyshades.gif' },
        ]
    },
    {
        name: "Танцы",
        emojis: [
            { id: '15061-magentaducktwerk', name: 'Magenta Duck Twerk', url: 'https://cdn3.emoji.gg/emojis/15061-magentaducktwerk.gif' },
            { id: '21980-dance', name: 'Танец', url: 'https://cdn3.emoji.gg/emojis/21980-dance.gif' },
            { id: '24454-girldance', name: 'Танцующая девушка', url: 'https://cdn3.emoji.gg/emojis/24454-girldance.gif' },
            { id: '46791-twerk', name: 'Twerk', url: 'https://cdn3.emoji.gg/emojis/46791-twerk.gif' },
            { id: '67276-scarjo-dancing', name: 'Танцующая Скарлетт', url: 'https://cdn3.emoji.gg/emojis/67276-scarjo-dancing.gif' },
            { id: '91657-dancdude', name: 'Dancdude', url: 'https://cdn3.emoji.gg/emojis/91657-dancdude.gif' },
        ]
    }
];

const seedDefaultPacks = async () => {
    console.log('--- Запуск скрипта добавления стандартных паков ---');
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Успешное подключение к MongoDB.');

        // 1. Найти или создать системного пользователя "Flow me"
        let flowUser = await User.findOne({ email: 'flowme.system@flowme.com' });
        if (!flowUser) {
            console.log('Системный пользователь не найден, создаем нового...');
            flowUser = new User({
                username: 'Flow me',
                fullName: 'Flow me',
                email: 'flowme.system@flowme.com',
                role: 'admin' // Даем роль админа, чтобы его нельзя было легко удалить
            });
            await flowUser.save();
            console.log(`Создан системный пользователь "Flow me" с ID: ${flowUser._id}`);
        } else {
            console.log(`Найден системный пользователь "Flow me" с ID: ${flowUser._id}`);
        }

        // 2. Пройти по всем пакам и добавить их, если их еще нет
        for (const pack of emojiPacks) {
            const existingPack = await ContentPack.findOne({ name: pack.name, creator: flowUser._id });
            if (existingPack) {
                console.log(`Пак "${pack.name}" уже существует. Пропускаем.`);
                continue;
            }

            console.log(`Создание пака "${pack.name}"...`);
            const newPack = new ContentPack({
                name: pack.name,
                creator: flowUser._id,
                type: 'emoji',
                isPublic: true,
                items: pack.emojis.map(emoji => ({
                    name: emoji.name,
                    imageUrl: emoji.url
                }))
            });
            await newPack.save();
            console.log(`  -> Пак "${pack.name}" успешно создан.`);
        }

        console.log('\n--- Скрипт успешно завершен! ---');

    } catch (error) {
        console.error('Произошла ошибка:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Отключено от MongoDB.');
    }
};

seedDefaultPacks();