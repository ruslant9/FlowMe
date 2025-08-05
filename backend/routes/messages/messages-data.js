// backend/routes/messages/messages-data.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middleware/auth.middleware');
const Conversation = require('../../models/Conversation');
const Message = require('../../models/Message');
const mongoose = require('mongoose');

// Получение статистики по диалогу
router.get('/:conversationId/stats', authMiddleware, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = new mongoose.Types.ObjectId(req.user.userId);

        const conversation = await Conversation.findOne({ _id: conversationId, participants: userId });
        if (!conversation) return res.status(403).json({ message: 'Доступ запрещен' });

        const otherUserId = conversation.participants.find(p => !p.equals(userId));

        const baseQuery = { conversation: conversation._id, owner: userId };

        const [
            totalMessages,
            sentCount,
            receivedCount,
            reactionsCount,
            photosCount,
            firstMessage,
            lastMessage
        ] = await Promise.all([
            Message.countDocuments(baseQuery),
            Message.countDocuments({ ...baseQuery, sender: userId }),
            Message.countDocuments({ ...baseQuery, sender: otherUserId }),
            Message.aggregate([
                { $match: baseQuery },
                { $project: { reactionsCount: { $size: { $ifNull: ["$reactions", []] } } } },
                { $group: { _id: null, total: { $sum: "$reactionsCount" } } }
            ]),
            Message.countDocuments({ ...baseQuery, imageUrl: { $ne: null } }),
            Message.findOne(baseQuery).sort({ createdAt: 1 }),
            Message.findOne(baseQuery).sort({ createdAt: -1 })
        ]);

        res.json({
            totalMessages,
            sentCount,
            receivedCount,
            reactionsCount: reactionsCount[0]?.total || 0,
            photosCount,
            pinnedCount: conversation.pinnedMessages.length,
            firstMessageDate: firstMessage?.createdAt || null,
            lastMessageDate: lastMessage?.createdAt || null,
        });

    } catch (error) {
        console.error("Error fetching conversation stats:", error);
        res.status(500).json({ message: "Ошибка сервера при получении статистики." });
    }
});

// Получение вложений (фото или музыка) из диалога
router.get('/:conversationId/attachments', authMiddleware, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { type = 'photos' } = req.query; // 'photos' or 'music'
        const userId = new mongoose.Types.ObjectId(req.user.userId);
        const page = parseInt(req.query.page) || 1;
        const limit = 15;
        const skip = (page - 1) * limit;

        const conversation = await Conversation.findOne({ _id: conversationId, participants: userId });
        if (!conversation) return res.status(403).json({ message: 'Доступ запрещен' });

        const baseQuery = {
            conversation: conversation._id,
            owner: userId
        };
        
        const [photoCount, musicCount] = await Promise.all([
            Message.countDocuments({ ...baseQuery, imageUrl: { $ne: null } }),
            Message.countDocuments({ ...baseQuery, attachedTrack: { $ne: null } })
        ]);

        let query = { ...baseQuery };
        let totalForType = 0;

        if (type === 'photos') {
            query.imageUrl = { $ne: null };
            totalForType = photoCount;
        } else if (type === 'music') {
            query.attachedTrack = { $ne: null };
            totalForType = musicCount;
        }

        const attachments = await Message.find(query)
            .select('_id imageUrl attachedTrack createdAt')
            .populate({ path: 'attachedTrack', populate: { path: 'artist', select: 'name' }})
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.json({
            attachments,
            counts: { photos: photoCount, music: musicCount },
            hasMore: (skip + attachments.length) < totalForType
        });

    } catch (error) {
        console.error("Error fetching attachments:", error);
        res.status(500).json({ message: "Ошибка сервера при получении вложений." });
    }
});

router.get('/:conversationId/message-dates', authMiddleware, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = new mongoose.Types.ObjectId(req.user.userId);

        const conversation = await Conversation.findOne({ _id: conversationId, participants: userId });
        if (!conversation) return res.status(403).json({ message: 'Доступ запрещен' });
        
        const dates = await Message.aggregate([
            { $match: { conversation: conversation._id, owner: userId } },
            { $project: { date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } } } },
            { $group: { _id: '$date' } },
            { $sort: { _id: 1 } }
        ]);
        
        res.json(dates.map(d => d._id));

    } catch (error) {
        console.error("Error fetching message dates:", error);
        res.status(500).json({ message: "Ошибка сервера при получении дат сообщений." });
    }
});

module.exports = router;