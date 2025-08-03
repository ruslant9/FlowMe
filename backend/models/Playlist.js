// backend/models/Playlist.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PlaylistSchema = new Schema({
    name: { type: String, required: true },
    description: { type: String },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tracks: [{ type: Schema.Types.ObjectId, ref: 'Track' }],
    coverImageUrls: [{ type: String }],
    visibility: {
        type: String,
        enum: ['public', 'unlisted', 'private'],
        default: 'public'
    },
    // --- НОВОЕ ПОЛЕ ---
    playCount: { type: Number, default: 0 }
}, { timestamps: true });

PlaylistSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Playlist', PlaylistSchema);