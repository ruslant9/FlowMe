// backend/models/Track.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TrackSchema = new Schema({
    title: { type: String, required: true, index: true },
    artist: [{ type: Schema.Types.ObjectId, ref: 'Artist', required: true }],
    album: { type: Schema.Types.ObjectId, ref: 'Album' },
    genres: [{ type: String, index: true }],
    isExplicit: { type: Boolean, default: false },
    releaseYear: { type: Number },
    storageKey: { type: String, required: true },
    albumArtUrl: { type: String },
    durationMs: { type: Number },  
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    playCount: { type: Number, default: 0, index: true },
    // Поля для пользовательской музыки (из Spotify/YT)
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    youtubeId: { type: String }, // Добавляем это поле, так как на него ссылается старый индекс
    spotifyId: { type: String }, // И это тоже
    type: { type: String, enum: ['saved', 'recent', 'library_track'], index: true },
    savedAt: { type: Date },
    playedAt: { type: Date }
}, { timestamps: true });

// --- ИЗМЕНЕНИЕ: Заменяем старый индекс на правильный частичный индекс ---
// Удаляем эту строку, если она у вас есть: TrackSchema.index({ user: 1, type: 1 });
// И добавляем эту логику:
TrackSchema.index(
    { user: 1, youtubeId: 1, type: 1 },
    {
        unique: true,
        // Этот индекс будет применяться ТОЛЬКО к документам, где type - 'saved' или 'recent'.
        // Для 'library_track' он будет проигнорирован, что решает нашу проблему.
        partialFilterExpression: {
            type: { $in: ['saved', 'recent'] }
        }
    }
);


module.exports = mongoose.model('Track', TrackSchema);