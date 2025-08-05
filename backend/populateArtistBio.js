// backend/populateArtistBio.js

const mongoose = require('mongoose');
const axios =require('axios');
require('dotenv').config();

const Artist = require('./models/Artist'); // Нам нужна только модель Артиста

const BATCH_SIZE = 200; // Можно обрабатывать больше артистов за раз, т.к. запросы проще
const DELAY_MS = 1000; // 1 секунда задержки между запросами для безопасности

const LASTFM_API_KEY = process.env.LASTFM_API_KEY;

/**
 * Удаляет HTML-теги и лишние фразы из текста биографии
 * @param {string} text 
 * @returns {string} - очищенный текст
 */
function cleanBio(text) {
    if (!text) return '';
    // Удаляем стандартную ссылку "Read more on Last.fm"
    let cleanedText = text.replace(/<a href=.*>Read more on Last.fm<\/a>/, '').trim();
    // Можно добавить и другие правила очистки, если потребуется
    cleanedText = cleanedText.replace(/"/g, '"'); // Заменяем HTML-сущности кавычек
    return cleanedText;
}

/**
 * Получаем биографию артиста через Last.fm API
 * @param {string} artistName
 * @returns {Promise<string|null>} - строка с биографией или null, если не найдено
 */
async function getArtistBio(artistName) {
    try {
        const response = await axios.get('https://ws.audioscrobbler.com/2.0/', {
            params: {
                method: 'artist.getInfo',
                artist: artistName.trim(),
                api_key: LASTFM_API_KEY,
                format: 'json',
                lang: 'ru' // Запрашиваем биографию на русском языке, если она есть
            }
        });

        let bioSummary = response.data?.artist?.bio?.summary;

        if (!bioSummary || bioSummary.trim() === '') {
             // Если русская биография пуста, попробуем запросить на английском
            console.log(`     [Fallback] Русская биография для "${artistName}" не найдена, пробуем английскую...`);
            const enResponse = await axios.get('https://ws.audioscrobbler.com/2.0/', {
                params: {
                    method: 'artist.getInfo',
                    artist: artistName.trim(),
                    api_key: LASTFM_API_KEY,
                    format: 'json'
                    // без параметра lang
                }
            });
            bioSummary = enResponse.data?.artist?.bio?.summary;
        }

        if (!bioSummary || bioSummary.includes("We don't have a wiki for this artist")) {
            return null; // Явный признак отсутствия биографии
        }

        return cleanBio(bioSummary);

    } catch (error) {
        if (error.response) {
            console.error(`     [API Error] Last.fm API error (${error.response.status}) for "${artistName}":`, error.response.data.message);
        } else {
            console.error(`     [Request Error] Last.fm error for "${artistName}":`, error.message);
        }
        return null;
    }
}


const populateArtistBios = async () => {
    console.log('\x1b[36m%s\x1b[0m', '--- Запуск скрипта для заполнения биографий артистов (Last.fm) ---');

    try {
        console.log('1. Подключение к MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('\x1b[32m%s\x1b[0m', '   Успешно подключено.');

        console.log('2. Поиск артистов без биографии...');
        // Ищем артистов, у которых поле `bio` либо отсутствует, либо пустое
        const artistsToUpdate = await Artist.find({
            $or: [
                { bio: { $exists: false } },
                { bio: { $eq: '' } }
            ]
        }).limit(BATCH_SIZE);

        if (artistsToUpdate.length === 0) {
            console.log('\x1b[32m%s\x1b[0m', '   Нет артистов для обработки. Завершение.');
            return;
        }

        console.log(`   Найдено ${artistsToUpdate.length} артистов для обработки.`);
        let updatedCount = 0;

        for (const artist of artistsToUpdate) {
            console.log(`   - Обработка: "${artist.name}"`);

            const bio = await getArtistBio(artist.name);

            if (bio) {
                await Artist.updateOne({ _id: artist._id }, { $set: { bio: bio } });
                console.log('\x1b[32m%s\x1b[0m', `     -> Найдена и добавлена биография.`);
                // console.log(`       ${bio.substring(0, 100)}...`); // Для отладки можно выводить часть био
                updatedCount++;
            } else {
                // Помечаем, чтобы не обрабатывать повторно
                await Artist.updateOne({ _id: artist._id }, { $set: { bio: '_не_найдено' } });
                console.log('\x1b[33m%s\x1b[0m', `     -> Биография не найдена. Помечено.`);
            }

            await new Promise(resolve => setTimeout(resolve, DELAY_MS));
        }

        console.log('\n\x1b[32m%s\x1b[0m', `--- Скрипт завершен! Обновлено ${updatedCount} из ${artistsToUpdate.length} артистов. ---`);

        if (artistsToUpdate.length === BATCH_SIZE) {
            console.log('\x1b[36m%s\x1b[0m', '   Возможно, остались еще артисты. Запустите скрипт снова для обработки следующей партии.');
        }

    } catch (error) {
        console.error('\x1b[31m%s\x1b[0m', 'Произошла критическая ошибка:', error);
    } finally {
        if (mongoose.connection.readyState === 1) {
            await mongoose.disconnect();
            console.log('4. Отключено от MongoDB.');
        }
    }
};

populateArtistBios();