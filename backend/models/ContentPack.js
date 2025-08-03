// backend/models/ContentPack.js --- НОВЫЙ ФАЙЛ ---

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PackItemSchema = new Schema({
    // Имя нужно только для эмодзи, для стикеров может быть пустым
    name: { type: String, trim: true },
    // URL изображения на Cloudinary
    imageUrl: { type: String, required: true },
}, { _id: true }); // Включаем _id для легкого удаления

const ContentPackSchema = new Schema({
    name: { type: String, required: true, trim: true, index: true },
    creator: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['emoji', 'sticker'], required: true, index: true },
    items: [PackItemSchema],
    isPublic: { type: Boolean, default: true, index: true }, // Для поиска
    // --- ИСПРАВЛЕНИЕ: Добавлено поле для Premium-статуса ---
    isPremium: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('ContentPack', ContentPackSchema);