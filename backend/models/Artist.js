// backend/models/Artist.js --- НОВЫЙ ФАЙЛ ---

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ArtistSchema = new Schema({
    name: { type: String, required: true, unique: true, index: true },
    description: { type: String },
    avatarUrl: { type: String }, // URL на обложку в Cloudflare R2
    tags: [{ type: String, index: true }], // Теги для умного поиска
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Artist', ArtistSchema);
