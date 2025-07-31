// backend/routes/messages/messages-status-updates.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middleware/auth.middleware');
const Conversation = require('../../models/Conversation');
const Message = require('../../models/Message');
const mongoose = require('mongoose');

// Helper to broadcast to specific users (from server.js context)
const broadcastToUsers = (req, userIds, message) => {
    userIds.forEach(userId => {
        const userSocket = req.clients.get(userId.toString());
        if (userSocket && userSocket.readyState === 1) { // WebSocket.OPEN
            userSocket.send(JSON.stringify(message));
        }
    });
};

// 1. Пометить сообщения как прочитанные
router.post('/read', authMiddleware, async (req, res) => {
    try {
        const { conversationId } = req.body;
        const userId = new mongoose.Types.ObjectId(req.user.userId);

        await Message.updateMany(
            { conversation: conversationId, sender: { $ne: userId }, readBy: { $ne: userId } },
            { $addToSet: { readBy: userId } }
        );
        
        const conversation = await Conversation.findByIdAndUpdate(conversationId, {
            $pull: { markedAsUnreadBy: userId }
        }, { new: true });

        if(conversation) {
            broadcastToUsers(req, conversation.participants, {
                type: 'MESSAGES_READ',
                payload: { conversationId, readerId: userId.toString() }
            });
                broadcastToUsers(req, [userId.toString()], {
                    type: 'CONVERSATION_UPDATED',
                    payload: { conversationId: conversation._id }
                });
        }      
        res.status(200).json({ message: `Диалог помечен как прочитанный.` });
    } catch (error) {
        console.error('Ошибка на сервере при пометке прочитанным:', error);
        res.status(500).json({ message: 'Ошибка на сервере' });
    }
});

// 2. Пометить диалог как непрочитанный
router.post('/unread', authMiddleware, async (req, res) => {
    try {
        const { conversationId } = req.body;
        const userId = new mongoose.Types.ObjectId(req.user.userId);
        
        const conversation = await Conversation.findByIdAndUpdate(
            conversationId,
            { $addToSet: { markedAsUnreadBy: userId } },
            { new: true }
        );

        if (!conversation) {
            return res.status(404).json({ message: "Диалог не найден." });
        }
        
        broadcastToUsers(req, [userId.toString()], {
            type: 'CONVERSATION_UPDATED',
            payload: { conversationId: conversation._id }
        });

        res.status(200).json({ message: 'Диалог помечен как непрочитанный.' });

    } catch (error) {
        console.error("Mark as unread error:", error);
        res.status(500).json({ message: "Ошибка на сервере" });
    }
});

module.exports = router;