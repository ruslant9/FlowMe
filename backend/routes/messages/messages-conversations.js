// backend/routes/messages/messages-conversations.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middleware/auth.middleware');
const Conversation = require('../../models/Conversation');
const Message = require('../../models/Message');
const User = require('../../models/User');
const mongoose = require('mongoose');
const { isAllowedByPrivacy } = require('../../utils/privacy');
const { getPopulatedConversation } = require('../../utils/getPopulatedConversation');

// Helper to broadcast to specific users (from server.js context)
const broadcastToUsers = (req, userIds, message) => {
    userIds.forEach(userId => {
        const userSocket = req.clients.get(userId.toString());
        if (userSocket && userSocket.readyState === 1) { // WebSocket.OPEN
            userSocket.send(JSON.stringify(message));
        }
    });
};

router.get('/:conversationId', authMiddleware, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user.userId;

        const conversation = await Conversation.findOne({ _id: conversationId, participants: userId });
        if (!conversation) {
            return res.status(403).json({ message: 'Доступ к диалогу запрещен.' });
        }

        const populatedConversation = await getPopulatedConversation(conversationId, userId);
        if (!populatedConversation) {
            return res.status(404).json({ message: 'Диалог не найден.' });
        }
        
        res.json(populatedConversation);
    } catch (error) {
        console.error('Error fetching single conversation:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});


// 1. Получить список всех диалогов пользователя
router.get('/', authMiddleware, async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.user.userId);
        
        await Conversation.findOneAndUpdate(
            { participants: { $eq: [userId] } },
            { $setOnInsert: { participants: [userId] } },
            { upsert: true, new: true }
        );

        const conversations = await Conversation.aggregate([
            { $match: { participants: userId, deletedBy: { $ne: userId } } },
            { $addFields: { isSavedMessages: { $eq: [{ $size: '$participants' }, 1] } } },
            {
                $lookup: {
                    from: 'users',
                    let: { participants: '$participants' },
                    pipeline: [
                        { $match: { $expr: { $and: [ { $in: ['$_id', '$$participants'] }, { $ne: ['$_id', userId] } ] } } },
                        { $project: { _id: 1, username: 1, fullName: 1, avatar: 1, lastSeen: 1, privacySettings: 1, blacklist: 1, friends: 1, premium: 1, premiumCustomization: 1 } }
                    ],
                    as: 'interlocutor'
                }
            },
            { $unwind: { path: "$interlocutor", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'messages',
                    let: { conversationId: '$_id' },
                    pipeline: [
                        { $match: { $expr: { $and: [ 
                            { $eq: ['$conversation', '$$conversationId'] }, 
                            { $eq: ['$owner', userId] }
                        ] } } },
                        { $sort: { createdAt: -1 } },
                        { $limit: 1 }
                    ],
                    as: 'lastMessageDetails'
                }
            },
            { $unwind: { path: "$lastMessageDetails", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'lastMessageDetails.sender',
                    foreignField: '_id',
                    as: 'lastMessageSenderInfo'
                }
            },
            { $unwind: { path: "$lastMessageSenderInfo", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'tracks',
                    localField: 'lastMessageDetails.attachedTrack',
                    foreignField: '_id',
                    as: 'lastMessageTrackInfo'
                }
            },
            { $unwind: { path: "$lastMessageTrackInfo", preserveNullAndEmptyArrays: true } },
            
            {
                $lookup: {
                    from: 'messages',
                    localField: 'pinnedMessages',
                    foreignField: '_id',
                    as: 'pinnedMessageOriginals',
                    pipeline: [{ $project: { uuid: 1 } }]
                }
            },
            {
                $addFields: {
                    pinnedMessageUuids: {
                        $map: {
                            input: "$pinnedMessageOriginals",
                            as: "msg",
                            in: "$$msg.uuid"
                        }
                    }
                }
            },
            {
                $lookup: {
                    from: 'messages',
                    let: { uuids: '$pinnedMessageUuids' },
                    pipeline: [
                        { $match: { $expr: { $and: [ { $in: ['$uuid', '$$uuids'] }, { $eq: ['$owner', userId] } ] } } },
                        { $lookup: { from: 'users', localField: 'sender', foreignField: '_id', as: 'senderInfo' } },
                        { $unwind: { path: '$senderInfo', preserveNullAndEmptyArrays: true } },
                        { $lookup: { from: 'tracks', localField: 'attachedTrack', foreignField: '_id', as: 'trackInfo' } },
                        { $unwind: { path: '$trackInfo', preserveNullAndEmptyArrays: true } },
                        { $project: { _id: 1, text: 1, imageUrl: 1, attachedTrack: '$trackInfo', sender: '$senderInfo' } }
                    ],
                    as: 'pinnedMessageDetailsForUser'
                }
            },

            {
                $lookup: {
                    from: 'messages',
                    let: { conversationId: '$_id' },
                    pipeline: [
                        { $match: { $expr: { $and: [ { $eq: ['$conversation', '$$conversationId'] }, { $eq: ['$owner', userId] }, { $ne: ['$sender', userId] }, { $not: { $in: [userId, { $ifNull: ['$readBy', []] }] } } ] } } },
                        { $count: 'unreadCount' }
                    ],
                    as: 'unreadInfo'
                }
            },
            {
                $project: {
                    _id: 1,
                    isSavedMessages: 1,
                    interlocutor: 1,
                    pinnedMessages: '$pinnedMessageDetailsForUser',
                    lastMessage: {
                        _id: '$lastMessageDetails._id',
                        text: '$lastMessageDetails.text',
                        imageUrl: '$lastMessageDetails.imageUrl',
                        attachedTrack: '$lastMessageTrackInfo',
                        sender: {
                            _id: '$lastMessageSenderInfo._id',
                            username: '$lastMessageSenderInfo.username',
                            fullName: '$lastMessageSenderInfo.fullName',
                            avatar: '$lastMessageSenderInfo.avatar'
                        },
                        createdAt: '$lastMessageDetails.createdAt',
                        readBy: { $ifNull: ['$lastMessageDetails.readBy', []] },
                        reactions: '$lastMessageDetails.reactions'
                    },
                    isMuted: { $in: [userId, { $ifNull: ['$mutedBy', []] }] },
                    isArchived: { $in: [userId, { $ifNull: ['$archivedBy', []] }] },
                    isPinned: { $in: [userId, { $ifNull: ['$pinnedBy', []] }] },
                    isMarkedAsUnread: { $in: [userId, { $ifNull: ['$markedAsUnreadBy', []] }] },
                    updatedAt: 1,
                    unreadCount: { $ifNull: [{ $arrayElemAt: ['$unreadInfo.unreadCount', 0] }, 0] },
                    wallpaper: 1,
                }
            }
        ]);

        const processedConversations = conversations.map(conv => {
            if (conv.interlocutor) {
                const interlocutorUser = conv.interlocutor;
                const currentUserId = userId;

                const interlocutorBlacklist = (interlocutorUser.blacklist || []).filter(mongoose.Types.ObjectId.isValid);
                const interlocutorFriends = (interlocutorUser.friends || []).map(f => f.user?.toString()).filter(Boolean);

                if (interlocutorFriends.includes(currentUserId.toString())) {
                    conv.friendshipStatus = 'friend';
                } else {
                    conv.friendshipStatus = 'none';
                }

                const interlocutorBlacklistIds = interlocutorBlacklist.map(id => id.toString());
                const isRequesterBlockedByInterlocutor = interlocutorBlacklistIds.includes(currentUserId.toString());
                conv.interlocutor.isBlockedByThem = isRequesterBlockedByInterlocutor;

                const privacySource = interlocutorUser.privacySettings || {};

                if (isRequesterBlockedByInterlocutor) {
                    conv.interlocutor.avatar = null;
                } else {
                    if (!isAllowedByPrivacy(privacySource.viewAvatar, currentUserId, interlocutorUser)) {
                        conv.interlocutor.avatar = null;
                    }
                }
            }
            return conv;
        });
        
        processedConversations.sort((a, b) => {
            if (a.isPinned !== b.isPinned) {
                return a.isPinned ? -1 : 1;
            }
            if (a.isSavedMessages) return -1;
            if (b.isSavedMessages) return 1;
            const dateA = a.lastMessage?.createdAt || a.updatedAt || 0;
            const dateB = b.lastMessage?.createdAt || b.updatedAt || 0;
            return new Date(dateB) - new Date(dateA);
        });


        res.json(processedConversations);
    } catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({ message: 'Ошибка на сервере' });
    }
});

router.get('/:conversationId/messages', authMiddleware, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = new mongoose.Types.ObjectId(req.user.userId);
        const page = parseInt(req.query.page) || 1;
        const limit = 30;
        const skip = (page - 1) * limit;

        const conversation = await Conversation.findOne({ _id: conversationId, participants: userId });
        if (!conversation) {
            return res.status(403).json({ message: 'Доступ запрещен' });
        }
        
        const query = {
            conversation: new mongoose.Types.ObjectId(conversationId),
            owner: userId,
        };

        const messages = await Message.find(query)
            .populate('sender', 'username fullName avatar')
            .populate({
                path: 'replyTo',
                populate: { 
                    path: 'sender', 
                    select: 'username fullName premium premiumCustomization' 
                }
            })
            .populate('forwardedFrom', 'username fullName')
            .populate('attachedTrack')
            .populate({
                path: 'reactions.user',
                select: 'username fullName'
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const processedMessages = messages.map(msg => {
            if (msg.replyTo && msg.replyTo.sender && msg.replyTo.sender.premiumCustomization) {
                const sender = msg.replyTo.sender;
                const accentRef = sender.premiumCustomization.activeCardAccent;

                if (accentRef && typeof accentRef.toString === 'function') { 
                    const accentId = accentRef.toString();
                    const customAccents = sender.premiumCustomization.customCardAccents || [];
                    const activeCustomAccent = customAccents.find(
                        accent => accent._id.toString() === accentId
                    );
                    if (activeCustomAccent) {
                        sender.premiumCustomization.activeCardAccent = activeCustomAccent;
                    }
                }
            }
            return msg;
        });

        res.json(processedMessages.reverse());
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ message: 'Ошибка на сервере' });
    }
});


router.get('/with/:interlocutorId', authMiddleware, async (req, res) => {
    try {
        const { interlocutorId } = req.params;
        const selfId = new mongoose.Types.ObjectId(req.user.userId);
        
        if (interlocutorId === selfId.toString()) {
            const savedConv = await Conversation.findOneAndUpdate(
                { participants: { $eq: [selfId] } },
                { $setOnInsert: { participants: [selfId] } },
                { upsert: true, new: true }
            );
            const populatedSavedConv = await getPopulatedConversation(savedConv._id, selfId);
            return res.json(populatedSavedConv);
        }

        const interlocutorObjectId = new mongoose.Types.ObjectId(interlocutorId);
        let isNewConversation = false;
 
        let conversation = await Conversation.findOne({
            participants: { $all: [selfId, interlocutorObjectId], $size: 2 }
        });
 
        if (!conversation) {
            const interlocutor = await User.findById(interlocutorObjectId);
             if (!interlocutor) {
                return res.status(404).json({ message: 'Собеседник не найден.' });
            }
            conversation = new Conversation({ participants: [selfId, interlocutorObjectId] });
            await conversation.save();
            isNewConversation = true;
        }
        
        const populatedConversation = await getPopulatedConversation(conversation._id, selfId);

        if (!populatedConversation) {
            return res.status(404).json({ message: 'Не удалось загрузить диалог.' });
        }

        const messages = await Message.find({
            conversation: conversation._id,
            owner: selfId,
        })
            .populate('sender', 'username fullName avatar')
            .populate({
                path: 'replyTo',
                populate: {
                    path: 'sender',
                    select: 'username fullName premium premiumCustomization'
                }
            })
            .populate('forwardedFrom', 'username fullName')
            .populate('attachedTrack')
            .populate({
                path: 'reactions.user',
                select: 'username fullName'
            })
            .sort({ createdAt: -1 })
            .limit(30)
            .lean();
        
        populatedConversation.initialMessages = messages.reverse();

        populatedConversation.isNew = isNewConversation;
        const lastMessageForUser = await Message.findOne({ conversation: conversation._id, owner: selfId }).sort({ createdAt: -1 }).lean();
        populatedConversation.historyCleared = !lastMessageForUser;


        res.json(populatedConversation);

    } catch (error) {
        console.error('Find/Create Conversation Error:', error);
        res.status(500).json({ message: "Ошибка сервера при поиске/создании чата." });
    }
});

// --- НАЧАЛО ИЗМЕНЕНИЯ: Добавляем обработку addToBlacklist ---
router.delete('/:conversationId', authMiddleware, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { forEveryone, addToBlacklist } = req.body;
        const userId = new mongoose.Types.ObjectId(req.user.userId);
        
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ message: "Диалог не найден." });
        }

        if (addToBlacklist && conversation.participants.length > 1) {
            const interlocutorId = conversation.participants.find(p => !p.equals(userId));
            if (interlocutorId) {
                await User.updateOne({ _id: userId }, { $addToSet: { blacklist: interlocutorId } });
                
                // Отправляем уведомления обоим пользователям об изменении их "статуса отношений"
                const userIdsToNotify = [userId.toString(), interlocutorId.toString()];
                userIdsToNotify.forEach(id => {
                    req.broadcastMessage({ type: 'USER_DATA_UPDATED', userId: id });
                });
            }
        }
        
        if (conversation.participants.length === 1 && conversation.participants[0].equals(userId)) {
            await Message.deleteMany({ conversation: conversationId, owner: userId });
            
            conversation.lastMessage = null;
            await conversation.save();
            
            broadcastToUsers(req, [userId.toString()], {
                type: 'HISTORY_CLEARED',
                payload: { conversationId: conversation._id.toString(), clearedBy: userId.toString() }
            });

            return res.status(200).json({ message: 'История "Избранного" очищена' });
        }

        if (forEveryone) {
            await Message.deleteMany({ conversation: conversationId });
            await Conversation.findByIdAndDelete(conversationId);
            
            broadcastToUsers(req, conversation.participants, {
                type: 'CONVERSATION_DELETED',
                payload: { conversationId: conversationId }
            });
            res.status(200).json({ message: 'Диалог удален для всех участников' });
        } else {
            await Message.deleteMany({ conversation: conversationId, owner: userId });
            
            await Conversation.findByIdAndUpdate(conversationId, { $addToSet: { deletedBy: userId } });

            const updatedConv = await Conversation.findById(conversationId);
            if (updatedConv.deletedBy.length === updatedConv.participants.length) {
                await Conversation.findByIdAndDelete(conversationId);
            }
             
            broadcastToUsers(req, [userId.toString()], {
                type: 'HISTORY_CLEARED',
                payload: { conversationId: conversation._id.toString(), clearedBy: userId.toString() }
            });

            res.status(200).json({ message: 'История чата очищена' });
        }
    } catch (error) {
        console.error("Delete conversation error:", error);
        res.status(500).json({ message: "Ошибка сервера" });
    }
});
// --- КОНЕЦ ИЗМЕНЕНИЯ ---

module.exports = router;