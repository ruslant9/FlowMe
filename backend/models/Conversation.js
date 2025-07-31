// backend/models/Conversation.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const WallpaperSettingSchema = new Schema({
    type: { type: String, enum: ['template', 'color', 'custom'], required: true },
    value: { type: String, required: true },
}, { _id: false });


const ConversationSchema = new Schema({
    participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
    lastMessage: { type: Schema.Types.ObjectId, ref: 'Message' },
    pinnedMessages: [{ type: Schema.Types.ObjectId, ref: 'Message', default: [] }],
    mutedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    archivedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    markedAsUnreadBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    deletedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    pinnedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }], // --- НОВАЯ СТРОКА ---
    wallpaper: {
        type: Map,
        of: WallpaperSettingSchema,
        default: {}
    }
}, { timestamps: true });

ConversationSchema.index({ participants: 1 });

module.exports = mongoose.model('Conversation', ConversationSchema);