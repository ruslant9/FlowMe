// backend/models/Message.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ReactionSchema = new Schema({
    emoji: { type: String, required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { _id: false });

const MessageSchema = new Schema({
    conversation: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true }, // Владелец этой копии сообщения
    uuid: { type: String, required: true, index: true }, // Общий ID для всех копий одного сообщения
    sender: { type: Schema.Types.ObjectId, ref: 'User' }, // Отправитель (может отсутствовать для системных сообщений)
    text: { type: String, trim: true },
    imageUrl: { type: String, default: null },
    attachedTrack: { type: Schema.Types.ObjectId, ref: 'Track', default: null },
    type: { type: String, enum: ['user', 'system'], default: 'user' },
    readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    reactions: [ReactionSchema],
    replyTo: { type: Schema.Types.ObjectId, ref: 'Message', default: null },
    forwardedFrom: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    isDeletedGlobally: { type: Boolean, default: false }, // Новый флаг для удаления у всех
}, { timestamps: true });


MessageSchema.pre('validate', function(next) {
    if (this.type === 'system') { 
        return next();
    }
    if ((!this.text || this.text.trim() === '') && !this.imageUrl && !this.attachedTrack) {
        next(new Error('Сообщение не может быть пустым. Добавьте текст, изображение или трек.'));
    } else {
        next();
    }
});

module.exports = mongoose.model('Message', MessageSchema);