// cleanupComments.js

const mongoose = require('mongoose');
const Post = require('./models/Post');
const Comment = require('./models/Comment');
require('dotenv').config();

const cleanup = async () => {
  try {
    console.log('Подключение к MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Успешное подключение.');

    console.log('Удаление всех комментариев из коллекции Comment...');
    const deleteResult = await Comment.deleteMany({});
    console.log(`Удалено ${deleteResult.deletedCount} комментариев.`);

    console.log('Очистка ссылок на комментарии в постах...');
    const postUpdateResult = await Post.updateMany({}, { $set: { comments: [] } });
    console.log(`Обновлено ${postUpdateResult.modifiedCount} постов.`);
    
    console.log('Очистка ссылок на дочерние комментарии у других комментариев (на всякий случай)...');
    const parentCommentUpdateResult = await Comment.updateMany({}, { $set: { children: [] } });
    console.log(`Обновлено ${parentCommentUpdateResult.modifiedCount} родительских комментариев.`);

    console.log('\nОчистка завершена успешно!');
  } catch (error) {
    console.error('Произошла ошибка во время очистки:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Отключено от MongoDB.');
  }
};

cleanup();