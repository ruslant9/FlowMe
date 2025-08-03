// backend/models/ContentPack.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PackItemSchema = new Schema({
    name: { type: String, trim: true },
    imageUrl: { type: String, required: true },
}, { _id: true });

const ContentPackSchema = new Schema({
    name: { type: String, required: true, trim: true, index: true },
    creator: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['emoji', 'sticker'], required: true, index: true },
    items: [PackItemSchema],
    isPublic: { type: Boolean, default: true, index: true },
    // --- НАЧАЛО ИЗМЕНЕНИЯ ---
    isPremiumOnly: { type: Boolean, default: false, index: true } // Для эксклюзивных паков
    // --- КОНЕЦ ИЗМЕНЕНИЯ ---
}, { timestamps: true });

module.exports = mongoose.model('ContentPack', ContentPackSchema);