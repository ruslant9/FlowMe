// backend/models/User.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const privacySettingsSchema = new Schema({
    messageMe: { type: String, enum: ['everyone', 'friends', 'private'], default: 'everyone' },
    sendFriendRequest: { type: String, enum: ['everyone', 'private'], default: 'everyone' },
    viewDOB: { type: String, enum: ['everyone', 'friends', 'private'], default: 'everyone' },
    hideDOBYear: { type: Boolean, default: false },
    viewAvatar: { type: String, enum: ['everyone', 'friends', 'private'], default: 'everyone' },
    viewPosts: { type: String, enum: ['everyone', 'friends', 'private'], default: 'everyone' },
    viewEmail: { type: String, enum: ['everyone', 'friends', 'private'], default: 'friends' },
    viewOnlineStatus: { type: String, enum: ['everyone', 'friends', 'private'], default: 'everyone' },
    viewInterests: { type: String, enum: ['everyone', 'friends', 'private'], default: 'everyone' },
    viewFriends: { type: String, enum: ['everyone', 'friends', 'private'], default: 'friends' },
    viewSubscribers: { type: String, enum: ['everyone', 'friends', 'private'], default: 'friends' },
    viewSubscribedCommunities: { type: String, enum: ['everyone', 'friends', 'private'], default: 'everyone' },
    viewLocation: { type: String, enum: ['everyone', 'friends', 'private'], default: 'friends' },
    inviteToCommunity: { type: String, enum: ['everyone', 'friends', 'private'], default: 'everyone' },
    viewMusic: { type: String, enum: ['everyone', 'friends', 'private'], default: 'everyone' },
    disableToasts: { type: Boolean, default: false },
}, { _id: false });

const premiumInfoSchema = new Schema({
    isActive: { type: Boolean, default: false },
    expiresAt: { type: Date, default: null },
    plan: { type: String, enum: ['1_month', '3_months', '6_months'], default: null },
}, { _id: false });

const customAccentSchema = new Schema({
    _id: { type: Schema.Types.ObjectId, auto: true },
    name: { type: String, required: true },
    backgroundUrl: { type: String, required: true },
    emojis: [{ type: String, required: true }]
});

const premiumCustomizationSchema = new Schema({
    avatarBorder: {
        id: { type: String, default: 'none' },
// --- НАЧАЛО ИСПРАВЛЕНИЯ: Добавляем новые типы рамок в список разрешенных ---
        type: { type: String, enum: ['none', 'static', 'animated-1', 'animated-2', 'animated-hearts', 'animated-neon', 'animated-orbit'], default: 'none' },
// --- КОНЕЦ ИСПРАВЛЕНИЯ ---
        value: { type: String, default: null } // for static color hex value
    },
    usernameEmoji: {
        id: { type: String, default: null },
        url: { type: String, default: null }
    },
    activeCardAccent: { type: Schema.Types.Mixed, default: null },
    customCardAccents: [customAccentSchema]
}, { _id: false });

const banInfoSchema = new Schema({
    isBanned: { type: Boolean, default: false, index: true },
    banReason: { type: String, default: null },
    banExpires: { type: Date, default: null }
}, { _id: false });

const UserSchema = new Schema({
    username: { type: String, required: true, unique: true, trim: true },
    fullName: { type: String, trim: true, default: null },
    email: { type: String, required: true, unique: true, trim: true },
    password: { type: String, trim: true },
    avatar: { type: String },
    dob: { type: Date },
    gender: { type: String, enum: ['Мужской', 'Женский', 'Не указан'], default: 'Не указан' },
    interests: [{ type: String }],
    friends: [{
        user: { type: Schema.Types.ObjectId, ref: 'User' },
        since: { type: Date, default: Date.now }
    }],
    status: { type: String, trim: true, maxlength: 100, default: null },
    premium: { type: premiumInfoSchema, default: () => ({}) },
    premiumCustomization: { type: premiumCustomizationSchema, default: () => ({}) },
    friendRequestsSent: [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }],
    friendRequestsReceived: [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }],
    blacklist: [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }],
    privacySettings: { type: privacySettingsSchema, default: () => ({}) },
    country: { type: String, trim: true, default: null },
    city: { type: String, trim: true, default: null },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    lastSeen: { type: Date, default: Date.now },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    subscribedCommunities: [{ type: Schema.Types.ObjectId, ref: 'Community' }],
    // --- НАЧАЛО ИЗМЕНЕНИЯ ---
    addedContentPacks: [{ type: Schema.Types.ObjectId, ref: 'ContentPack' }]
    // --- КОНЕЦ ИЗМЕНЕНИЯ ---
}, { timestamps: true });
UserSchema.add({ banInfo: { type: banInfoSchema, default: () => ({}) } });

module.exports = mongoose.model('User', UserSchema);
