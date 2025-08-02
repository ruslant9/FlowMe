// backend/routes/user/social.js
const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const Notification = require('../../models/Notification');
const Post = require('../../models/Post');
const Comment = require('../../models/Comment');
const Conversation = require('../../models/Conversation');
const Message = require('../../models/Message');
const ProfileVisit = require('../../models/ProfileVisit');
const authMiddleware = require('../../middleware/auth.middleware');
const mongoose = require('mongoose');
const { isAllowedByPrivacy } = require('../../utils/privacy');

const handleFriendshipChange = (req, userIds) => {
    req.broadcastMessage({ type: 'USER_RELATIONSHIP_UPDATE', payload: { users: userIds } });
    userIds.forEach(id => {
        req.broadcastMessage({ type: 'USER_DATA_UPDATED', userId: id });
    });
};

router.post('/send-request/:targetUserId', authMiddleware, async (req, res) => {
    try {
        const targetUserIdString = req.params.targetUserId;
        const senderIdString = req.user.userId.toString();
        if (senderIdString === targetUserIdString) return res.status(400).json({ message: 'Нельзя добавить в друзья самого себя' });
        if (!mongoose.Types.ObjectId.isValid(targetUserIdString)) return res.status(400).json({ message: 'Неверный ID пользователя' });
        const senderObjectId = new mongoose.Types.ObjectId(senderIdString);
        const targetObjectId = new mongoose.Types.ObjectId(targetUserIdString);
        const sender = await User.findById(senderObjectId).select('friends friendRequestsSent friendRequestsReceived blacklist');
        const targetUser = await User.findById(targetObjectId).select('friends friendRequestsSent friendRequestsReceived blacklist privacySettings');
        if (!targetUser || !sender) return res.status(404).json({ message: 'Пользователь не найден' });
        const senderBlacklist = sender.blacklist || [];
        const targetBlacklist = targetUser.blacklist || [];
        if (senderBlacklist.some(id => id.equals(targetObjectId)) || targetBlacklist.some(id => id.equals(senderObjectId))) {
            return res.status(403).json({ message: 'Невозможно отправить запрос этому пользователю.' });
        }
        if (!isAllowedByPrivacy(targetUser.privacySettings?.sendFriendRequest, senderIdString, targetUser)) {
            return res.status(403).json({ message: 'Этот пользователь не принимает запросы в друзья.' });
        }
        const senderFriends = sender.friends || [];
        const senderRequestsSent = sender.friendRequestsSent || [];
        const senderRequestsReceived = sender.friendRequestsReceived || [];

        if (senderFriends.some(friendship => friendship.user.equals(targetObjectId))) {
            return res.status(400).json({ message: 'Вы уже друзья' });
        }
        
        if (senderRequestsSent.some(id => id.equals(targetObjectId))) return res.status(400).json({ message: 'Запрос уже отправлен' });
        if (senderRequestsReceived.some(id => id.equals(targetObjectId))) return res.status(400).json({ message: 'Этот пользователь уже отправил вам запрос' });
        
        await User.updateOne({ _id: senderObjectId }, { $addToSet: { friendRequestsSent: targetObjectId } });
        await User.updateOne({ _id: targetObjectId }, { $addToSet: { friendRequestsReceived: senderObjectId } });
        await Notification.deleteOne({ recipient: targetObjectId, type: 'friend_request', 'senders.0': senderObjectId });
        const newNotification = new Notification({
            recipient: targetObjectId,
            senders: [senderObjectId],
            lastSender: senderObjectId,
            type: 'friend_request',
            entityId: senderObjectId,
            link: `/friends`
        });
        await newNotification.save();
        const populatedNotification = await Notification.findById(newNotification._id).populate('lastSender', 'username fullName avatar');
        req.broadcastToUsers([targetUserIdString], { type: 'NEW_NOTIFICATION', payload: populatedNotification });
        handleFriendshipChange(req, [senderIdString, targetUserIdString]);
        res.status(200).json({ message: 'Запрос в друзья отправлен' });
    } catch (e) {
        console.error("Send request error:", e);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

router.post('/accept-request/:senderId', authMiddleware, async (req, res) => {
    const { senderId } = req.params;
    const receiverId = req.user.userId;
    if (!mongoose.Types.ObjectId.isValid(senderId)) return res.status(400).json({ message: 'Неверный ID отправителя' });
    try {
        const sender = await User.findById(senderId);
        const receiver = await User.findById(receiverId);
        if (!sender) return res.status(404).json({ message: 'Пользователь не найден' });
        const receiverRequestsReceivedIds = (receiver.friendRequestsReceived || []).map(id => id.toString());
        if (!receiverRequestsReceivedIds.includes(senderId)) return res.status(400).json({ message: 'Нет входящего запроса от этого пользователя' });
        await User.updateOne({ _id: receiverId }, { $pull: { friendRequestsReceived: senderId }, $addToSet: { friends: { user: senderId, since: new Date() } } });
        await User.updateOne({ _id: senderId }, { $pull: { friendRequestsSent: receiverId }, $addToSet: { friends: { user: receiverId, since: new Date() } } });
        await Notification.deleteOne({ recipient: receiverId, type: 'friend_request', entityId: senderId });
        handleFriendshipChange(req, [senderId.toString(), receiverId.toString()]);
        res.status(200).json({ message: 'Запрос в друзья принят' });
    } catch (e) {
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

router.post('/decline-request/:senderId', authMiddleware, async (req, res) => {
    const { senderId } = req.params;
    const receiverId = req.user.userId;
    if (!mongoose.Types.ObjectId.isValid(senderId)) return res.status(400).json({ message: 'Неверный ID отправителя' });
    try {
        await User.updateOne({ _id: receiverId }, { $pull: { friendRequestsReceived: senderId } });
        await User.updateOne({ _id: senderId }, { $pull: { friendRequestsSent: receiverId } });
        handleFriendshipChange(req, [senderId.toString(), receiverId.toString()]);
        res.status(200).json({ message: 'Запрос отклонен' });
    } catch (e) {
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

router.post('/cancel-request/:targetUserId', authMiddleware, async (req, res) => {
    const { targetUserId } = req.params;
    const senderId = req.user.userId;
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) return res.status(400).json({ message: 'Неверный ID пользователя' });
    try {
        await User.updateOne({ _id: senderId }, { $pull: { friendRequestsSent: targetUserId } });
        await User.updateOne({ _id: targetUserId }, { $pull: { friendRequestsReceived: senderId } });
        await Notification.deleteOne({ recipient: targetUserId, type: 'friend_request', entityId: senderId });
        req.broadcastToUsers([targetUserId.toString()], { type: 'NEW_NOTIFICATION' });
        handleFriendshipChange(req, [senderId.toString(), targetUserId.toString()]);
        res.status(200).json({ message: 'Запрос отменен' });
    } catch (e) {
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

router.post('/remove-friend/:friendId', authMiddleware, async (req, res) => {
    const { friendId } = req.params;
    const userId = req.user.userId;
    if (!mongoose.Types.ObjectId.isValid(friendId)) return res.status(400).json({ message: 'Неверный ID друга' });
    try {
        await User.updateOne({ _id: userId }, { $pull: { friends: { user: friendId } } });
        await User.updateOne({ _id: friendId }, { $pull: { friends: { user: userId } } });
        handleFriendshipChange(req, [userId.toString(), friendId.toString()]);
        res.status(200).json({ message: 'Пользователь удален из друзей' });
    } catch (e) {
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

router.post('/blacklist/:targetUserId', authMiddleware, async (req, res) => {
    const { targetUserId } = req.params;
    const userId = req.user.userId;
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) return res.status(400).json({ message: 'Неверный ID пользователя' });
    if (userId.toString() === targetUserId) return res.status(400).json({ message: 'Нельзя заблокировать самого себя' });
    try {        
        await User.updateOne({ _id: userId }, { $addToSet: { blacklist: targetUserId }, $pull: { friends: { user: targetUserId }, friendRequestsSent: targetUserId, friendRequestsReceived: targetUserId } });
        await User.updateOne({ _id: targetUserId }, { $pull: { friends: { user: userId }, friendRequestsSent: userId, friendRequestsReceived: userId } });
        handleFriendshipChange(req, [userId.toString(), targetUserId.toString()]);
        res.status(200).json({ message: 'Пользователь добавлен в черный список' });
    } catch (e) {
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

router.post('/unblacklist/:targetUserId', authMiddleware, async (req, res) => {
    const { targetUserId } = req.params;
    const userId = req.user.userId;
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) return res.status(400).json({ message: 'Неверный ID пользователя' });
    try {
        await User.updateOne({ _id: userId }, { $pull: { blacklist: targetUserId } });
        handleFriendshipChange(req, [userId.toString(), targetUserId.toString()]);
        res.status(200).json({ message: 'Пользователь разблокирован' });
    } catch (e) {
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

router.get('/friends', authMiddleware, async (req, res) => {
    try {
        const currentUserId = req.user.userId;
        const user = await User.findById(currentUserId)
            .populate({
                path: 'friends.user',
                select: 'username fullName avatar privacySettings city lastSeen status'
            })
            // --- НАЧАЛО ИЗМЕНЕНИЙ ---
            .populate({ path: 'friendRequestsReceived', select: 'username fullName avatar privacySettings city lastSeen' })
            .populate({ path: 'friendRequestsSent', select: 'username fullName avatar privacySettings city status lastSeen'})
            .populate({ path: 'blacklist', select: 'username fullName avatar status lastSeen'});
            // --- КОНЕЦ ИЗМЕНЕНИЙ ---

        if (!user) return res.status(404).json({ message: "Пользователь не найден" });

        const friendPromises = user.friends.map(async (friendship) => {
            if (!friendship.user) return null;
            const friendId = friendship.user._id;
            let score = 0;

            const likesCount = await Post.countDocuments({ user: friendId, likes: currentUserId });
            score += likesCount * 1;

            const friendPosts = await Post.find({ user: friendId }).select('_id');
            const friendPostIds = friendPosts.map(p => p._id);
            if (friendPostIds.length > 0) {
                const commentsCount = await Comment.countDocuments({ post: { $in: friendPostIds }, author: currentUserId });
                score += commentsCount * 5;
            }

            const conversation = await Conversation.findOne({ participants: { $all: [currentUserId, friendId] } });
            if (conversation) {
                const messageCount = await Message.countDocuments({ conversation: conversation._id });
                score += Math.floor(messageCount / 10) * 1;
            }

            const visitCount = await ProfileVisit.countDocuments({ visitor: currentUserId, visited: friendId });
            score += visitCount * 1;

            return {
                ...friendship.user.toObject(),
                friendshipDate: friendship.since,
                score: score
            };
        });

        const allFriendsWithScores = (await Promise.all(friendPromises)).filter(Boolean);
        allFriendsWithScores.sort((a, b) => b.score - a.score);

        const importantFriends = allFriendsWithScores.slice(0, 5);

        const allRelatedUserIds = [
            ...user.friends.map(f => f.user?._id),
            ...user.friendRequestsReceived.map(u => u._id),
            ...user.friendRequestsSent.map(u => u._id)
        ].filter(Boolean);

        const usersWhoBlockMe = await User.find({ _id: { $in: allRelatedUserIds }, blacklist: req.user.userId }).select('_id');
        const usersWhoBlockMeIds = new Set(usersWhoBlockMe.map(u => u._id.toString()));
        const processList = (list) => list.map(userObject => {
            if (usersWhoBlockMeIds.has(userObject._id.toString())) {
                userObject.status = 'blocked_by_them';
            }
            return userObject;
        });
        res.json({
            importantFriends: processList(importantFriends),
            allFriends: processList(allFriendsWithScores),
            incoming: processList(user.friendRequestsReceived),
            outgoing: processList(user.friendRequestsSent),
            blacklist: user.blacklist,
        });
    } catch (e) {
        console.error("Friends route error:", e);
        res.status(500).json({ message: "Ошибка сервера" });
    }
});

router.post('/users-by-ids', authMiddleware, async (req, res) => {
    try {
        const { userIds } = req.body;
        if (!Array.isArray(userIds) || userIds.length === 0) {
            return res.json([]);
        }
        
        const users = await User.find({ '_id': { $in: userIds } })
            .select('username fullName avatar status');
             
        res.json(users);
    } catch (error) {
        console.error("Error fetching users by IDs:", error);
        res.status(500).json({ message: "Ошибка сервера при получении пользователей." });
    }
});

router.post('/users-by-ids', authMiddleware, async (req, res) => {
    try {
        const { userIds } = req.body;
        if (!Array.isArray(userIds) || userIds.length === 0) {
            return res.json([]);
        }
        
        const users = await User.find({ '_id': { $in: userIds } })
            .select('username fullName avatar');
            
        res.json(users);
    } catch (error) {
        console.error("Error fetching users by IDs:", error);
        res.status(500).json({ message: "Ошибка сервера при получении пользователей." });
    }
});

module.exports = router;