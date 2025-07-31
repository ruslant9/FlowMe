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

PlaylistSchema.pre('save', async function(next) {
    if (this.isModified('tracks') || this.isNew) {
        if (this.tracks.length > 0) {
            const populated = await this.populate({
                path: 'tracks',
                select: 'albumArtUrl',
                options: { limit: 4 }
            });
            this.coverImageUrls = populated.tracks
                .map(track => track.albumArtUrl)
                .filter(Boolean);
        } else {
            this.coverImageUrls = [];
        }
    }
    next();
});

PlaylistSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Playlist', PlaylistSchema);