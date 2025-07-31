// backend/models/Notification.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const NotificationSchema = new Schema({
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    senders: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
    lastSender: { type: Schema.Types.ObjectId, ref: 'User' },
    type: {
        type: String,
        enum: [
            'like_post', 'like_comment', 'new_comment', 'reply_comment', 
            'friend_request', 
            'community_join_request', 'community_request_approved', 'community_request_denied',
            'community_invite', 'community_invite_accepted', 'community_invite_declined' // --- NEW TYPES ---
        ],
        required: true,
    },
    entityId: { type: Schema.Types.ObjectId, required: true }, 
    link: { type: String, required: true },
    previewImage: { type: String, default: null },
    previewText: { type: String, default: null },
    read: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Notification', NotificationSchema);