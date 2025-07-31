// backend/routes/user/profile.js
const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const Post = require('../../models/Post');
const Comment = require('../../models/Comment');
const Message = require('../../models/Message');
const Conversation = require('../../models/Conversation');
const Notification = require('../../models/Notification');
const Community = require('../../models/Community');
const Session = require('../../models/Session'); 
const authMiddleware = require('../../middleware/auth.middleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '..', '..', 'uploads', 'avatars');
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, `${req.user.userId}-${Date.now()}${path.extname(file.originalname)}`);
    }
});
const uploadAvatar = multer({ storage: avatarStorage });

// --- НАЧАЛО ИЗМЕНЕНИЯ: Хелпер для подстановки данных активного акцента ---
function populateActiveAccent(userObject) {
    if (!userObject || !userObject.premiumCustomization || !userObject.premiumCustomization.activeCardAccent) {
        return userObject;
    }

    const customAccents = userObject.premiumCustomization.customCardAccents || [];
    const activeAccentId = userObject.premiumCustomization.activeCardAccent.toString();

    // Сначала ищем среди кастомных акцентов по ID
    const activeCustomAccent = customAccents.find(accent => accent._id.toString() === activeAccentId);

    if (activeCustomAccent) {
        // Если нашли, подставляем полный объект
        userObject.premiumCustomization.activeCardAccent = activeCustomAccent;
    }
    
    // Если activeCardAccent - это строка (URL), он останется как есть, что тоже правильно
    return userObject;
}
// --- КОНЕЦ ИЗМЕНЕНИЯ ---

router.get('/profile', authMiddleware, async (req, res) => {
    try {
        let user = await User.findById(req.user.userId).select('-resetPasswordToken -resetPasswordExpires').lean();
        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }
        user.hasPassword = !!user.password; 
        delete user.password; 

        user = populateActiveAccent(user);

        res.json(user);
    } catch (e) {
        res.status(500).json({ message: 'Что-то пошло не так, попробуйте снова' });
    }
});

router.put('/profile', authMiddleware, async (req, res) => {
    try {
        const { fullName, username, dob, gender, interests, country, city, status, premiumCustomization } = req.body;
        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ message: 'Пользователь не найден' });
        if (username && username !== user.username) {
            const existingUser = await User.findOne({ username });
            if (existingUser) return res.status(400).json({ message: 'Это имя пользователя уже занято' });
            user.username = username;
        }
        if (dob) {
            const dateOfBirth = new Date(dob);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (dateOfBirth > today) return res.status(400).json({ message: 'Дата рождения не может быть в будущем.' });
            user.dob = dob;
        } else {
             user.dob = null;
        }
        user.fullName = fullName === '' ? null : fullName || user.fullName;
        if (typeof status !== 'undefined') {
            user.status = status.trim() === '' ? null : status.trim();
        }

        // --- НАЧАЛО ИЗМЕНЕНИЯ: Безопасное обновление кастомизации ---
        if (premiumCustomization) {
            if (user.premium && user.premium.isActive) {
                // Используем Mongoose's .set() для точечного обновления полей.
                // Это предотвращает перезапись всего sub-документа и потерю customCardAccents.
                if (premiumCustomization.avatarBorder) {
                    user.set('premiumCustomization.avatarBorder', premiumCustomization.avatarBorder);
                }
                if (premiumCustomization.usernameEmoji) {
                    user.set('premiumCustomization.usernameEmoji', premiumCustomization.usernameEmoji);
                }
                // activeCardAccent обрабатывается отдельным роутом и здесь не трогается.
            } else {
                return res.status(403).json({ message: 'Premium-подписка неактивна.' });
            }
        }
        // --- КОНЕЦ ИЗМЕНЕНИЯ ---

        user.gender = gender || user.gender;
        if (interests !== undefined) {
            user.interests = Array.isArray(interests) ? interests : [];
        }
        user.country = country === '' ? null : country;
        user.city = city === '' ? null : city;
        await user.save();
        const updatedUser = await User.findById(req.user.userId).select('-password');
        res.json({ message: 'Профиль успешно обновлен', user: updatedUser });
        req.broadcastMessage({ type: 'USER_DATA_UPDATED', userId: req.user.userId });
        req.broadcastFullUserStatus(req.user.userId);
    } catch (e) {
        console.error("Profile update error:", e);
        res.status(500).json({ message: 'Что-то пошло не так, попробуйте снова' });
    }
});


router.post('/avatar', authMiddleware, uploadAvatar.single('avatar'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'Файл не загружен' });
        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ message: 'Пользователь не найден' });
        if (user.avatar) {
            const oldPath = path.join(__dirname, '..', '..', user.avatar);
             if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
        const avatarPath = `uploads/avatars/${req.file.filename}`;
        user.avatar = avatarPath;
        await user.save();
        res.json({ message: 'Аватар успешно обновлен', avatarUrl: avatarPath });
        req.broadcastFullUserStatus(req.user.userId);
    } catch (e) { res.status(500).json({ message: 'Ошибка при загрузке аватара' }); }
});

router.delete('/avatar', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ message: 'Пользователь не найден' });
        if (!user.avatar) return res.status(400).json({ message: 'У пользователя нет аватара для удаления.' });
        const avatarFilePath = path.join(__dirname, '..', '..', user.avatar);
        if (fs.existsSync(avatarFilePath)) fs.unlinkSync(avatarFilePath);
        user.avatar = undefined;
        await user.save();
        res.json({ message: 'Аватар успешно удален' });
        req.broadcastFullUserStatus(req.user.userId);
    } catch (e) { res.status(500).json({ message: 'Ошибка при удалении аватара' }); }
});

router.get('/sessions', authMiddleware, async (req, res) => {
    try {
        const sessions = await Session.find({ user: req.user.userId }).sort({ lastActive: -1 });
        res.json(sessions);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера при получении сессий.' });
    }
});

router.delete('/sessions/:sessionId', authMiddleware, async (req, res) => {
    try {
        const { sessionId } = req.params;
        if (sessionId === req.user.sessionId) {
            return res.status(400).json({ message: 'Нельзя прервать текущую сессию.' });
        }
        await Session.findOneAndDelete({ _id: sessionId, user: req.user.userId });
        res.status(200).json({ message: 'Сессия прервана.' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера при прерывании сессии.' });
    }
});

router.delete('/sessions', authMiddleware, async (req, res) => {
    try {
        await Session.deleteMany({ user: req.user.userId, _id: { $ne: req.user.sessionId } });
        res.status(200).json({ message: 'Все другие сессии прерваны.' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера при прерывании сессий.' });
    }
});


router.delete('/delete-account', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'Пользователь не найден.' });
        const ownedCommunities = await Community.find({ owner: userId });
        for (const community of ownedCommunities) {
            const communityPosts = await Post.find({ community: community._id });
            for (const post of communityPosts) {
                if (post.imageUrls && post.imageUrls.length > 0) {
                    post.imageUrls.forEach(imageUrl => {
                        const imagePath = path.join(__dirname, '..','..', imageUrl);
                        if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
                    });
                }
                await Comment.deleteMany({ post: post._id });
                await Post.findByIdAndDelete(post._id);
            }
            if (community.avatar) {
                const avatarPath = path.join(__dirname, '..', '..', community.avatar);
                if (fs.existsSync(avatarPath)) fs.unlinkSync(avatarPath);
            }
            if (community.coverImage) {
                const coverPath = path.join(__dirname, '..', '..', community.coverImage);
                if (fs.existsSync(coverPath)) fs.unlinkSync(coverPath);
            }
            await User.updateMany({ _id: { $in: community.members } }, { $pull: { subscribedCommunities: community._id } });
            await Community.findByIdAndDelete(community._id);
        }
        const userPosts = await Post.find({ user: userId, community: null });
        for (const post of userPosts) {
            if (post.imageUrls && post.imageUrls.length > 0) {
                 post.imageUrls.forEach(imageUrl => {
                    const imagePath = path.join(__dirname, '..', '..', imageUrl);
                    if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
                });
            }
        }
        await Post.deleteMany({ user: userId });
        await Comment.deleteMany({ user: userId });
        await Comment.deleteMany({ post: { $in: userPosts.map(p => p._id) } });
        await Post.updateMany({}, { $pull: { likes: userId } });
        await Comment.updateMany({}, { $pull: { likes: userId } });
        if (user.avatar) {
            const avatarPath = path.join(__dirname, '..', '..', user.avatar);
            if (fs.existsSync(avatarPath)) fs.unlinkSync(avatarPath);
        }
        await User.updateMany({}, { $pull: { friends: userId, friendRequestsSent: userId, friendRequestsReceived: userId, blacklist: userId, subscribedCommunities: userId } });
        await Community.updateMany({}, { $pull: { members: userId, pendingJoinRequests: userId } });
        await Message.deleteMany({ sender: userId });
        await Message.updateMany({}, { $pull: { readBy: userId, deletedFor: userId }, $unset: { forwardedFrom: userId } });
        
        await Session.deleteMany({ user: userId });

        await User.findByIdAndDelete(userId);
        await Notification.deleteMany({ $or: [{ recipient: userId }, { senders: userId }] });
        res.status(200).json({ message: 'Ваш аккаунт и все связанные данные успешно удалены.' });
        req.broadcastMessage({ type: 'USER_DATA_UPDATED', userId: userId.toString() });
    } catch (e) {
        res.status(500).json({ message: 'Произошла ошибка на сервере при удалении аккаунта.' });
    }
});

module.exports = router;