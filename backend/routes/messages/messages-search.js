// backend/routes/messages/messages-search.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middleware/auth.middleware');
const Message = require('../../models/Message');
const Conversation = require('../../models/Conversation');
const mongoose = require('mongoose');

router.get('/:conversationId/search', authMiddleware, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { q } = req.query;
        const userId = req.user.userId;

        const conversation = await Conversation.findOne({ _id: conversationId, participants: userId });
        if (!conversation) return res.status(403).json({ message: 'Доступ запрещен' });
        if (!q) return res.json([]);

        // Создаем безопасное регулярное выражение
        const escapedQuery = q.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        
        const messages = await Message.find({
            conversation: conversationId,
            owner: userId,
            type: 'user', // Искать только среди сообщений, отправленных пользователями
            text: { $regex: escapedQuery, $options: 'i' }
        }).select('_id').sort({ createdAt: -1 });
        
        res.json(messages.map(m => m._id));
    } catch (error) {
        console.error("Search messages error:", error);
        res.status(500).json({ message: "Ошибка сервера" });
    }
});

module.exports = router;