// backend/models/ProfileVisit.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ProfileVisitSchema = new Schema({
    visitor: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    visited: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
}, { timestamps: true });

module.exports = mongoose.model('ProfileVisit', ProfileVisitSchema);