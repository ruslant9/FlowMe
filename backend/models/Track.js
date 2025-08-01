// backend/models/Track.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TrackSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', index: true }, 
    
    // --- ИЗМЕНЕНИЯ ЗДЕСЬ ---
    spotifyId: { type: String, index: true }, // Новый идентификатор от Spotify
    youtubeId: { type: String, required: true, index: true },
    // --- КОНЕЦ ИЗМЕНЕНИЙ ---

    title: { type: String, required: true },
    artist: { type: String, required: true },
    album: { type: String },
    albumArtUrl: { type: String },
    previewUrl: { type: String },
    durationMs: { type: Number },
    
    type: { type: String, enum: ['saved', 'recent', 'search_cache'], required: true, index: true },
    
    savedAt: { type: Date },
    playedAt: { type: Date }
}, { timestamps: true });

// --- ИЗМЕНЕНИЕ: Обновляем уникальный индекс, чтобы он работал со spotifyId ---
TrackSchema.index({ user: 1, spotifyId: 1, type: 1 }, { unique: true, sparse: true });
// --- КОНЕЦ ИЗМЕНЕНИЯ ---

TrackSchema.index({ title: 'text', artist: 'text' });

module.exports = mongoose.model('Track', TrackSchema);