// backend/models/Session.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SessionSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    token: { type: String, required: true },
    ipAddress: { type: String },
    userAgent: { type: String },
    device: { type: String },
    os: { type: String },
    browser: { type: String },
    countryCode: { type: String },
    lastActive: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Session', SessionSchema);