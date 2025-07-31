// backend/models/Comment.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CommentSchema = new Schema({
    post: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
    // --- ИЗМЕНЕНИЕ: Заменяем 'user' на полиморфную связь 'author' ---
    author: { type: Schema.Types.ObjectId, required: true, refPath: 'authorModel' },
    authorModel: {
      type: String,
      required: true,
      enum: ['User', 'Community']
    },
    // --- КОНЕЦ ИЗМЕНЕНИЯ ---
    text: { type: String, required: true },
    likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    parent: { type: Schema.Types.ObjectId, ref: 'Comment', default: null },
    children: [{ type: Schema.Types.ObjectId, ref: 'Comment' }]
}, { timestamps: true });

module.exports = mongoose.model('Comment', CommentSchema);