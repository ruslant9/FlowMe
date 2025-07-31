// backend/models/Track.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TrackSchema = new Schema({
    // ИЗМЕНЕНИЕ 1: Поле user теперь не является обязательным.
    // Это нужно, чтобы мы могли хранить глобальные кешированные треки, не привязанные к пользователю.
    // Для типов 'saved' и 'recent' мы по-прежнему будем его указывать в коде.
    user: { type: Schema.Types.ObjectId, ref: 'User', index: true }, 
    
    youtubeId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    artist: { type: String, required: true },
    album: { type: String },
    albumArtUrl: { type: String },
    previewUrl: { type: String },
    durationMs: { type: Number },

    // ИЗМЕНЕНИЕ 2: Добавляем 'search_cache' в список разрешенных типов.
    type: { type: String, enum: ['saved', 'recent', 'search_cache'], required: true, index: true },
    
    savedAt: { type: Date },
    playedAt: { type: Date }
}, { timestamps: true });

// Этот индекс по-прежнему полезен для обеспечения уникальности треков в "Моей музыке" и "Истории" для каждого пользователя.
TrackSchema.index({ user: 1, youtubeId: 1, type: 1 }, { unique: true });

// ИЗМЕНЕНИЕ 3: Добавляем текстовый индекс для полей title и artist.
// Это позволит MongoDB эффективно выполнять полнотекстовый поиск по этим полям,
// что критически важно для нашего механизма кеширования.
TrackSchema.index({ title: 'text', artist: 'text' });


module.exports = mongoose.model('Track', TrackSchema);