// backend/models/Track.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TrackSchema = new Schema({
    title: { type: String, required: true, index: true },
    artist: [{ type: Schema.Types.ObjectId, ref: 'Artist', required: true }],
    album: { type: Schema.Types.ObjectId, ref: 'Album' },
    genres: [{ type: String, index: true }],
    isExplicit: { type: Boolean, default: false },
    releaseDate: { type: Date }, // ИЗМЕНЕНИЕ
    storageKey: { type: String, required: true },
    albumArtUrl: { type: String },
    durationMs: { type: Number },  
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    playCount: { type: Number, default: 0, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    youtubeId: { type: String },
    spotifyId: { type: String },
    type: { type: String, enum: ['saved', 'recent', 'library_track'], index: true },
    savedAt: { type: Date },
    playedAt: { type: Date }
}, { timestamps: true });

TrackSchema.index(
    { user: 1, youtubeId: 1, type: 1 },
    {
        unique: true,
        partialFilterExpression: {
            type: { $in: ['saved', 'recent'] }
        }
    }
);

module.exports = mongoose.model('Track', TrackSchema);