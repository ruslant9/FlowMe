// backend/models/Wallpaper.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const WallpaperSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['color'], required: true, default: 'color' },
    // Для 'color' value будет строкой JSON: { background, header, myBubble, theirBubble, text }
    value: { type: String, required: true }, 
    name: { type: String, required: true }, // Название, которое дает пользователь
}, { timestamps: true });

module.exports = mongoose.model('Wallpaper', WallpaperSchema);