// backend/models/Community.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const CommunitySchema = new Schema({
name: { type: String, required: true, unique: true, trim: true },
description: { type: String, default: '' },
owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
avatar: { type: String, default: null },
coverImage: { type: String, default: null },
topic: {
type: String,
enum: ['General', 'Gaming', 'Art', 'Technology', 'Music', 'Sports', 'Science', 'Books', 'Food', 'Travel', 'Fashion', 'Photography', 'Health', 'Education', 'Business', 'Finance', 'Nature', 'Pets', 'DIY', 'Cars', 'Movies', 'TV Shows', 'Anime & Manga', 'Comics', 'History', 'Philosophy', 'Politics', 'News', 'Humor', 'Fitness', 'Other'],
default: 'General'
},
visibility: {
type: String,
enum: ['public', 'private', 'secret'],
default: 'public'
},
joinPolicy: {
type: String,
enum: ['open', 'approval_required', 'invite_only'],
default: 'open'
},
members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
pendingJoinRequests: [{ type: Schema.Types.ObjectId, ref: 'User' }],
posts: [{ type: Schema.Types.ObjectId, ref: 'Post' }],
pinnedPost: { type: Schema.Types.ObjectId, ref: 'Post', default: null },
// --- NEW FIELDS ---
bannedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
postingPolicy: {
type: String,
enum: ['everyone', 'admin_only'],
default: 'everyone'
},
adminVisibility: {
type: String,
enum: ['everyone', 'members_only', 'none'], // ИЗМЕНЕНИЕ: Добавлена опция 'none'
default: 'everyone'
},
memberListVisibility: {
type: String,
enum: ['everyone', 'members_only', 'none'], // ИЗМЕНЕНИЕ: Добавлена опция 'none'
default: 'everyone'
}
}, { timestamps: true });
CommunitySchema.pre('save', function(next) {
if (this.isNew) {
this.members.push(this.owner);
}
next();
});
module.exports = mongoose.model('Community', CommunitySchema);