// frontend/src/data/emojiData.js

// --- ОБЫЧНЫЕ РЕАКЦИИ ---
export const regularReactions = [
  '❤️', '😂', '👍', '😢', '😮', '🙏',
  '🔥', '💯', '👏', '🤔', '🤯', '🤩',
  '🥰', '😎', '🙄', '😴', '😡', '🥳',
  '😇', '😈', '👻', '💀', '👽', '🤖',
  '🤮', '🤡', '💩', '👎', '😠', '🤬' // Добавлены блювотка, клоун, какашка, дизлайк, злость и ругань
];

// --- PREMIUM ЭМОДЗИ ДЛЯ НИКА (ОСТАЕТСЯ КАК ЕСТЬ) ---
export const emojiPacks = [
    {
        name: "Классика",
        emojis: [
            { id: 'none', name: 'Без эмодзи', url: null },
            { id: 'fire', name: 'Огонь', url: '/emojis/fire.gif' },
            { id: 'crown', name: 'Корона', url: '/emojis/crown.gif' },
            { id: 'diamond', name: 'Бриллиант', url: '/emojis/diamond.gif' },
            { id: 'verified', name: 'Галочка', url: 'https://img.icons8.com/?size=100&id=FNbnqlDTjR45&format=png&color=000000' },
            { id: 'heart', name: 'Сердце', url: '/emojis/heart.gif' },
            { id: '22123-rocket', name: 'Ракета', url: 'https://cdn3.emoji.gg/emojis/22123-rocket.gif' },
            { id: '3159-f', name: 'Клавиша F', url: 'https://cdn3.emoji.gg/emojis/3159-f.gif' },
            { id: '26515-gothic-cross', name: 'Gothic Cross', url: 'https://cdn3.emoji.gg/emojis/26515-gothic-cross.gif' },
        ]
    },
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

// --- НАЧАЛО ИЗМЕНЕНИЯ: Создаем полный список Premium-реакций из всех паков ---
// Мы берем все эмодзи из всех паков, кроме первого ("Классика"), так как там есть статические.
// И убираем опцию "Без эмодзи".
export const premiumReactions = emojiPacks
    .slice(1) // Пропускаем пак "Классика"
    .flatMap(pack => pack.emojis) // Объединяем все эмодзи из оставшихся паков в один массив
    .filter(emoji => emoji.id !== 'none'); // Убираем 'Без эмодзи', если он вдруг там окажется
// --- КОНЕЦ ИЗМЕНЕНИЯ ---


export const allEmojiUrls = emojiPacks.flatMap(pack => pack.emojis.map(emoji => emoji.url));
export const allPremiumReactionUrls = premiumReactions.map(r => r.url);