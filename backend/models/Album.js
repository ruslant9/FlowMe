// backend/models/Album.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AlbumSchema = new Schema({
    title: { type: String, required: true, index: true },
    artist: { type: Schema.Types.ObjectId, ref: 'Artist', required: true },
    genre: { type: String, index: true },
    releaseDate: { type: Date }, // ИЗМЕНЕНИЕ
    coverArtUrl: { type: String },
    tracks: [{ type: Schema.Types.ObjectId, ref: 'Track' }],
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Album', AlbumSchema);