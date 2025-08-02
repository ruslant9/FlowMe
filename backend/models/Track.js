// backend/models/Track.js --- СУЩЕСТВЕННЫЕ ИЗМЕНЕНИЯ ---

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TrackSchema = new Schema({
    title: { type: String, required: true, index: true },
    artist: { type: Schema.Types.ObjectId, ref: 'Artist', required: true },
    album: { type: Schema.Types.ObjectId, ref: 'Album' }, // Необязательно
    
    storageKey: { type: String, required: true }, // Ключ файла в Cloudflare R2
    albumArtUrl: { type: String }, // Обложка, если это сингл
    durationMs: { type: Number },
    
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    
    playCount: { type: Number, default: 0, index: true }, // Индекс для быстрой сортировки
    user: { type: Schema.Types.ObjectId, ref: 'User' }, 
    type: { type: String, enum: ['saved', 'recent', 'library_track'], index: true },
    savedAt: { type: Date },
    playedAt: { type: Date }
}, { timestamps: true });

// Индекс для пользовательских треков
TrackSchema.index({ user: 1, type: 1 });

module.exports = mongoose.model('Track', TrackSchema);