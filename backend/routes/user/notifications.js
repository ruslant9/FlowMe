// backend/routes/user/notifications.js
const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const Post = require('../../models/Post');
const Comment = require('../../models/Comment');
const Message = require('../../models/Message');
const Conversation = require('../../models/Conversation');
const Notification = require('../../models/Notification');
const authMiddleware = require('../../middleware/auth.middleware');
const mongoose = require('mongoose');

// --- НАЧАЛО ИЗМЕНЕНИЯ: Переработанный роут для получения уведомлений ---
router.get('/', authMiddleware, async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.user.userId);

        const allNotifications = await Notification.find({ recipient: userId })
            .populate('lastSender', 'username fullName avatar')
            .populate('senders', 'username fullName avatar')
            .sort({ updatedAt: -1 })
            .lean();

        const communityNotificationTypes = [
            'community_join_request', 'community_request_approved', 'community_request_denied',
            'community_invite', 'community_invite_accepted', 'community_invite_declined'
        ];

        const entityIds = allNotifications.map(n => n.entityId);
        
        const [relatedPosts, relatedComments] = await Promise.all([
            Post.find({ _id: { $in: entityIds } }).select('community').lean(),
            Comment.find({ _id: { $in: entityIds } }).populate({ path: 'post', select: 'community' }).select('post').lean()
        ]);

        const entityIsCommunityMap = new Map();
        relatedPosts.forEach(p => {
            if (p.community) entityIsCommunityMap.set(p._id.toString(), true);
        });
        relatedComments.forEach(c => {
            if (c.post && c.post.community) entityIsCommunityMap.set(c._id.toString(), true);
        });

        const personalNotifications = [];
        const communityNotifications = [];

        allNotifications.forEach(notif => {
            let isCommunityNotification = false;
            if (communityNotificationTypes.includes(notif.type)) {
                isCommunityNotification = true;
            } else if (entityIsCommunityMap.has(notif.entityId.toString())) {
                isCommunityNotification = true;
            }
            
            if (isCommunityNotification) {
                communityNotifications.push(notif);
            } else {
                personalNotifications.push(notif);
            }
        });

        res.json({
            personal: {
                list: personalNotifications,
                unreadCount: personalNotifications.filter(n => !n.read).length
            },
            community: {
                list: communityNotifications,
                unreadCount: communityNotifications.filter(n => !n.read).length
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка на сервере при получении уведомлений' });
    }
});
// --- КОНЕЦ ИЗМЕНЕНИЯ ---


router.post('/mark-read', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        await Notification.updateMany({ recipient: userId, read: false }, { $set: { read: true } });
        res.status(200).json({ message: 'Все уведомления помечены как прочитанные.' });
        req.broadcastToUsers([userId.toString()], { type: 'NEW_NOTIFICATION' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка на сервере.' });
    }
});

router.delete('/:notificationId', authMiddleware, async (req, res) => {
    try {
        const { notificationId } = req.params;
        const userId = req.user.userId;
        const result = await Notification.findOneAndDelete({ _id: notificationId, recipient: userId });
        if (!result) return res.status(404).json({ message: 'Уведомление не найдено или у вас нет прав на его удаление.' });
        res.status(200).json({ message: 'Уведомление удалено.' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка на сервере.' });
    }
});

router.delete('/clear', authMiddleware, async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.user.userId);
        const { type } = req.query;
        const allUserNotifications = await Notification.find({ recipient: userId }).select('_id entityId type').lean();
        if (allUserNotifications.length === 0) {
            return res.status(200).json({ message: 'Нет уведомлений для удаления.' });
        }
        const communityNotificationTypes = [
            'community_join_request', 'community_request_approved', 'community_request_denied',
            'community_invite', 'community_invite_accepted', 'community_invite_declined'
        ];
        const entityIds = allUserNotifications.map(n => n.entityId);
        const [relatedPosts, relatedComments] = await Promise.all([
            Post.find({_id: { $in: entityIds }}).select('_id community').lean(),
            Comment.find({_id: { $in: entityIds }}).populate('post', 'community').select('post').lean()
        ]);
        const entityIsCommunityMap = new Map();
        relatedPosts.forEach(p => {
            if (p.community) entityIsCommunityMap.set(p._id.toString(), true);
        });
        relatedComments.forEach(c => {
            if (c.post && c.post.community) entityIsCommunityMap.set(c._id.toString(), true);
        });
        const idsToDelete = allUserNotifications.filter(notif => {
            let isCommunityNotification = communityNotificationTypes.includes(notif.type) || entityIsCommunityMap.get(notif.entityId.toString());
            return (type === 'personal' && !isCommunityNotification) || (type === 'community' && isCommunityNotification);
        }).map(notif => notif._id);
        if (idsToDelete.length > 0) {
            await Notification.deleteMany({ _id: { $in: idsToDelete } });
        }
        res.status(200).json({ message: 'Уведомления были удалены.' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка на сервере.' });
    }
});

router.get('/summary', authMiddleware, async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.user.userId);
        const unreadNotificationsCount = await Notification.countDocuments({ recipient: userId, read: false });
        const user = await User.findById(userId).select('friendRequestsReceived');
        const friendRequestsCount = user ? user.friendRequestsReceived.length : 0;
        const userConversations = await Conversation.find({ participants: userId, 'deletedBy.user': { $ne: userId }, mutedBy: { $ne: userId }, archivedBy: { $ne: userId } }).select('_id');
        const conversationIds = userConversations.map(c => c._id);
        const convosWithUnreadMessages = await Message.distinct("conversation", {
            conversation: { $in: conversationIds },
            sender: { $ne: userId },
            readBy: { $nin: [userId] }
        });
        const convosMarkedAsUnread = await Conversation.distinct("_id", {
            _id: { $in: conversationIds },
            markedAsUnreadBy: userId
        });
        const allUnreadConversationIds = new Set([...convosWithUnreadMessages.map(id => id.toString()), ...convosMarkedAsUnread.map(id => id.toString())]);
        const unreadConversationsCount = allUnreadConversationIds.size;
        res.json({ unreadNotificationsCount, friendRequestsCount, unreadConversationsCount });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;