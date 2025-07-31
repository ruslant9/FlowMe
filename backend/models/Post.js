// backend/models/Post.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const pollOptionSchema = new Schema({
    text: { type: String, required: true },
    votes: [{ type: Schema.Types.ObjectId, ref: 'User' }]
});

const pollSchema = new Schema({
    question: { type: String, required: true },
    options: [pollOptionSchema],
    // --- НАЧАЛО ИЗМЕНЕНИЯ: Новые поля для опроса ---
    isAnonymous: { type: Boolean, default: false },
    expiresAt: { type: Date, default: null }
    // --- КОНЕЦ ИЗМЕНЕНИЯ ---
});

const PostSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, trim: true },
    imageUrls: [{ type: String }],
    attachedTrack: { type: Schema.Types.ObjectId, ref: 'Track', default: null },
    poll: { type: pollSchema, default: null },
    status: { type: String, enum: ['published', 'scheduled'], default: 'published' },
    scheduledFor: { type: Date, default: null },
    publishedAt: { type: Date, default: null },
    isPinned: { type: Boolean, default: false },
    commentsDisabled: { type: Boolean, default: false },
    likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    comments: [{ type: Schema.Types.ObjectId, ref: 'Comment' }],
    community: { type: Schema.Types.ObjectId, ref: 'Community', default: null }
}, {
    timestamps: true,
    validate: {
        validator: function(v) {
            return (this.text && this.text.length > 0) || (this.imageUrls && this.imageUrls.length > 0) || this.attachedTrack || (this.poll && this.poll.question);
        },
        message: 'Пост не может быть пустым. Добавьте текст, изображение, трек или опрос.'
    }
});
module.exports = mongoose.model('Post', PostSchema);