const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

const Track = require('../models/Track');
const Artist = require('../models/Artist'); // Не забываем require для populate

const BATCH_SIZE = 200;
const DELAY_MS = 1000;

const LASTFM_API_KEY = process.env.LASTFM_API_KEY;

// Ваш список жанров (оставляем без изменений)
const musicGenresRu = [
  "Альтернатива", "Джаз", "Инди", "Классическая", "Метал", "Поп", "Панк", "Рок",
  "Рэп / Хип-хоп", "Фолк / Этника", "Шансон", "Электронная", "R&B / Соул", "Амбиент",
  "Афробитс", "Бедрум-поп", "Гиперпоп", "Дрилл", "Драм-н-бейс", "Инди-поп",
  "Инди-рок", "K-Pop", "Латина", "Лоу-фай хип-хоп", "Поп-панк", "Пост-панк",
  "Регги / Дэнсхолл", "Саундтреки / Игровая музыка", "Синт-поп", "Трэп", "Трип-хоп",
  "Фанк", "Фонк", "Дабстеп", "Джерси-клаб", "Техно", "Транс", "Хаус", "Чилаут",
  "Чилвейв", "Детская музыка", "Экспериментальная"
].sort();


// *** НОВАЯ ЛОГИКА: КАРТА СОПОСТАВЛЕНИЯ ***
// Ключ: тег с Last.fm (в нижнем регистре)
// Значение: ваш жанр на русском
const tagToGenreMap = {
  // Поп-музыка
  'pop': 'Поп',
  'russian pop': 'Поп',
  'electropop': 'Синт-поп',
  'indie pop': 'Инди-поп',
  'synthpop': 'Синт-поп',
  'k-pop': 'K-Pop',
  'hyperpop': 'Гиперпоп',
  'bedroom pop': 'Бедрум-поп',

  // Рэп / Хип-хоп
  'rap': 'Рэп / Хип-хоп',
  'hip-hop': 'Рэп / Хип-хоп',
  'russian rap': 'Рэп / Хип-хоп',
  'trap': 'Трэп',
  'drill': 'Дрилл',
  'phonk': 'Фонк',
  'lo-fi hip-hop': 'Лоу-фай хип-хоп',

  // Рок-музыка
  'rock': 'Рок',
  'russian rock': 'Рок',
  'alternative': 'Альтернатива',
  'alternative rock': 'Альтернатива',
  'indie': 'Инди',
  'indie rock': 'Инди-рок',
  'punk': 'Панк',
  'punk rock': 'Панк',
  'pop punk': 'Поп-панк',
  'post-punk': 'Пост-панк',
  'metal': 'Метал',

  // Электроника
  'happy hardcore': 'Хеппи хардкор',
  'electronic': 'Электронная',
  'Rave': 'Рейв',
  'dance': 'Электронная',
  'house': 'Хаус',
  'techno': 'Техно',
  'trance': 'Транс',
  'dubstep': 'Дабстеп',
  'drum and bass': 'Драм-н-бейс',
  'ambient': 'Амбиент',
  'trip-hop': 'Трип-хоп',
  'chillwave': 'Чилвейв',
  'chillout': 'Чилаут',
  
  // Другое
  'funk': 'Фанк',
  'soul': 'R&B / Соул',
  'rnb': 'R&B / Соул',
  'r&b': 'R&B / Соул',
  'jazz': 'Джаз',
  'folk': 'Фолк / Этника',
  'reggae': 'Регги / Дэнсхолл',
  'dancehall': 'Регги / Дэнсхолл',
  'latin': 'Латина',
  'soundtrack': 'Саундтреки / Игровая музыка',
  'experimental': 'Экспериментальная',
};

/**
 * Очищает строку от лишних символов, мешающих поиску
 * @param {string} name
 * @returns {string}
 */
function cleanName(name) {
    return name.replace(/\s*\(.*?\)|\[.*?\]/g, '').trim();
}

/**
 * Сопоставляет массив тегов с Last.fm с нашим списком жанров через карту
 * @param {Array<{name: string}>} tags - массив объектов тегов от API
 * @returns {string[]} - массив уникальных жанров
 */
function mapTagsToGenres(tags) {
    const matchedGenresSet = new Set();
    if (!tags || tags.length === 0) {
        return [];
    }
    
    for (const tag of tags) {
        const tagName = tag.name.toLowerCase();
        const genre = tagToGenreMap[tagName];
        if (genre) {
            matchedGenresSet.add(genre);
        }
        if (matchedGenresSet.size >= 5) break; // Ограничиваем до 5 жанров
    }
    return Array.from(matchedGenresSet);
}


async function getGenres(trackTitle, artistName) {
  let tags = [];
  
  // 1. Пытаемся получить теги для трека
  try {
    const trackResponse = await axios.get('https://ws.audioscrobbler.com/2.0/', {
      params: { method: 'track.getInfo', artist: cleanName(artistName), track: cleanName(trackTitle), api_key: LASTFM_API_KEY, format: 'json' }
    });
    tags = trackResponse.data?.track?.toptags?.tag || [];
    console.log(`     [Track API] Для "${trackTitle}" найдено тегов: ${tags.map(t => t.name).join(', ')}`);
  } catch (error) {
     if (error.response && error.response.status !== 404) {
       console.error(`     [Track API] Error for track "${trackTitle}":`, error.response.data.message);
    }
  }

  // 2. Если у трека нет тегов, ищем для артиста
  if (tags.length === 0) {
      console.log(`     [Fallback] Жанров для трека не найдено, ищем для артиста "${artistName}"...`);
      try {
          const artistResponse = await axios.get('https://ws.audioscrobbler.com/2.0/', {
              params: { method: 'artist.getTopTags', artist: cleanName(artistName), api_key: LASTFM_API_KEY, format: 'json' }
          });
          tags = artistResponse.data?.toptags?.tag || [];
          console.log(`     [Artist API] Для "${artistName}" найдено тегов: ${tags.map(t => t.name).join(', ')}`);
      } catch (error) {
          if (error.response && error.response.status !== 404) {
              console.error(`     [Artist API] Error for artist "${artistName}":`, error.response.data.message);
          }
      }
  }

  // 3. Сопоставляем полученные теги с нашими жанрами
  return mapTagsToGenres(tags);
}


const populateTrackGenres = async () => {
  console.log('\x1b[36m%s\x1b[0m', '--- Запуск скрипта для заполнения жанров (Last.fm) ---');

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('\x1b[32m%s\x1b[0m', '1. Успешно подключено к MongoDB.');

    const tracksToUpdate = await Track.find({
        $or: [ { genre: { $exists: false } }, { genre: { $eq: [] } } ],
        type: 'library_track'
    }).populate('artist', 'name').limit(BATCH_SIZE);

    if (tracksToUpdate.length === 0) {
      console.log('\x1b[32m%s\x1b[0m', '2. Нет треков для обработки. Завершение.');
      return;
    }

    console.log(`2. Найдено ${tracksToUpdate.length} треков для обработки.`);
    console.log('3. Начинаем обработку...');

    let updatedCount = 0;

    for (const track of tracksToUpdate) {
      if (!track.artist || track.artist.length === 0) {
        console.log(`   - Пропускаем трек ID: ${track._id} (нет артиста)`);
        await Track.updateOne({ _id: track._id }, { $set: { genre: ['_пропущено_нет_артиста'] } });
        continue;
      }
      
      const primaryArtistName = track.artist[0].name;
      const allArtists = track.artist.map(a => a.name).join(', ');

      console.log(`   - Обработка: "${track.title}" - ${allArtists}`);

      const genres = await getGenres(track.title, primaryArtistName);

      if (genres.length > 0) {
        await Track.updateOne({ _id: track._id }, { $set: { genre: genres } });
        console.log('\x1b[32m%s\x1b[0m', `     -> Найдены и добавлены жанры: ${genres.join(', ')}`);
        updatedCount++;
      } else {
        await Track.updateOne({ _id: track._id }, { $set: { genre: ['_не_найдено'] } });
        console.log('\x1b[33m%s\x1b[0m', `     -> Жанры не найдены. Помечено.`);
      }

      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }

    console.log('\n\x1b[32m%s\x1b[0m', `--- Скрипт завершен! Обновлено ${updatedCount} из ${tracksToUpdate.length} треков. ---`);
    if (tracksToUpdate.length === BATCH_SIZE) {
      console.log('\x1b[36m%s\x1b[0m', '   Возможно, остались еще треки. Запустите скрипт снова.');
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

populateTrackGenres();