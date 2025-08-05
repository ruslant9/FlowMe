// backend/routes/messages/messages-management.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middleware/auth.middleware');
const Conversation = require('../../models/Conversation');
const Message = require('../../models/Message');
const User = require('../../models/User');
const mongoose = require('mongoose');
const crypto = require('crypto');
const { getPopulatedConversation } = require('../../utils/getPopulatedConversation');
const { sanitize } = require('../../utils/sanitize');

const broadcastToUsers = (req, userIds, message) => {
    userIds.forEach(userId => {
        const userIdStr = userId.toString();
        const userSocket = req.clients.get(userIdStr);
        if (userSocket && userSocket.readyState === 1) { // WebSocket.OPEN
            userSocket.send(JSON.stringify(message));
        }
    });
};

const createAndBroadcastSystemMessage = async (req, conversation, text) => {
    const systemMessageUuid = crypto.randomUUID();
    
    const sanitizedText = sanitize(text);

    const systemMessageDocs = conversation.participants.map(participantId => ({
        conversation: conversation._id,
        owner: participantId,
        uuid: systemMessageUuid,
        text: sanitizedText,
        type: 'system',
        readBy: [], 
    }));

    const savedMessages = await Message.insertMany(systemMessageDocs);
    const newSystemMessage = savedMessages[0];
    
    conversation.lastMessage = newSystemMessage._id;
    await conversation.save();

    const payloadForBroadcast = newSystemMessage.toObject();
    payloadForBroadcast.conversationParticipants = conversation.participants;
    
    broadcastToUsers(req, conversation.participants, {
        type: 'NEW_MESSAGE',
        payload: payloadForBroadcast
    });
};

router.post('/:conversationId/pin/:messageId', authMiddleware, async (req, res) => {
    try {
        const { conversationId, messageId } = req.params;
        const userId = req.user.userId;
        const user = await User.findById(userId).select('username');

        const conversation = await Conversation.findOne({ _id: conversationId, participants: userId });
        if (!conversation) return res.status(404).json({ message: "Диалог не найден." });

        const messageToPin = await Message.findOne({ _id: messageId, conversation: conversationId, owner: userId });
        if (!messageToPin) return res.status(404).json({ message: "Сообщение не найдено в этом диалоге." });

        const messageObjectId = new mongoose.Types.ObjectId(messageId);
        const isAlreadyPinned = conversation.pinnedMessages.some(id => id.equals(messageObjectId));
        
        let systemMessageText = '';
        let successMessage = '';

        if (isAlreadyPinned) {
            conversation.pinnedMessages.pull(messageObjectId);
            systemMessageText = `${user.username} открепил(а) сообщение.`;
            successMessage = 'Сообщение откреплено.';
        } else {
            conversation.pinnedMessages.addToSet(messageObjectId);
            const messageSnippet = (messageToPin.text || 'Вложение').substring(0, 40);
            systemMessageText = `${user.username} закрепил(а) сообщение: "${messageSnippet}..."`;
            successMessage = 'Сообщение закреплено.';
        }
        
        await createAndBroadcastSystemMessage(req, conversation, systemMessageText);
        
        for (const participantId of conversation.participants) {
            const updatedConvForParticipant = await getPopulatedConversation(conversation._id, participantId);
            if (updatedConvForParticipant) {
                broadcastToUsers(req, [participantId], {
                    type: 'CONVERSATION_UPDATED',
                    payload: { conversation: updatedConvForParticipant }
                });
            }
        }

        res.status(200).json({ message: successMessage });
    } catch (error) {
        console.error("Pin/Unpin message error:", error);
        res.status(500).json({ message: "Ошибка сервера." });
    }
});

router.post('/:conversationId/mute', authMiddleware, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user.userId;
        const conversation = await Conversation.findOne({ _id: conversationId, participants: userId });
        if (!conversation) return res.status(404).json({ message: "Диалог не найден." });

        const isMuted = conversation.mutedBy.includes(userId);
        if (isMuted) {
            await Conversation.updateOne({ _id: conversationId }, { $pull: { mutedBy: userId } });
        } else {
            await Conversation.updateOne({ _id: conversationId }, { $addToSet: { mutedBy: userId } });
        }
        
        const updatedConv = await getPopulatedConversation(conversation._id, userId);
        broadcastToUsers(req, [userId], {
            type: 'CONVERSATION_UPDATED',
            payload: { conversation: updatedConv }
        });

        res.status(200).json({ message: isMuted ? 'Уведомления включены' : 'Уведомления отключены' });
    } catch (error) {
        res.status(500).json({ message: "Ошибка сервера" });
    }
});

router.post('/:conversationId/archive', authMiddleware, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user.userId;
        const conversation = await Conversation.findOne({ _id: conversationId, participants: userId });
        if (!conversation) return res.status(404).json({ message: "Диалог не найден." });
        const isArchived = conversation.archivedBy.includes(userId);

        // --- НАЧАЛО ИСПРАВЛЕНИЯ ---
        if (isArchived) {
            // Если чат уже в архиве, просто убираем его оттуда
            await Conversation.updateOne({ _id: conversationId }, { $pull: { archivedBy: userId } });
        } else {
            // Если чат не в архиве, добавляем его в архив И УБИРАЕМ ИЗ ЗАКРЕПЛЕННЫХ
            await Conversation.updateOne(
                { _id: conversationId },
                { 
                    $addToSet: { archivedBy: userId },
                    $pull: { pinnedBy: userId } // <-- Вот ключевое исправление
                }
            );
        }
        // --- КОНЕЦ ИСПРАВЛЕНИЯ ---
        
        const updatedConv = await getPopulatedConversation(conversation._id, userId);
        broadcastToUsers(req, [userId], {
            type: 'CONVERSATION_UPDATED',
            payload: { conversation: updatedConv }
        });
        res.status(200).json({ message: isArchived ? 'Чат разархивирован' : 'Чат заархивирован' });
    } catch (error) {
        res.status(500).json({ message: "Ошибка сервера" });
    }
});
router.post('/:conversationId/wallpaper', authMiddleware, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { type, value, applyFor, name } = req.body;
        const userId = req.user.userId;
        const user = await User.findById(userId).select('username fullName premium');

        if (type === 'color' || type === 'custom') {
            if (!user.premium || !user.premium.isActive) {
                return res.status(403).json({ message: "Создание и установка кастомных обоев доступна только для Premium-пользователей." });
            }
        }

        const conversation = await Conversation.findOne({ _id: conversationId, participants: userId });
        if (!conversation) return res.status(404).json({ message: "Диалог не найден." });

        const wallpaperData = { type, value };
        const shouldSendSystemMessage = applyFor === 'both' && conversation.participants.length > 1;

        if (applyFor === 'both') {
            conversation.participants.forEach(participantId => {
                conversation.wallpaper.set(participantId.toString(), wallpaperData);
            });
        } else {
            conversation.wallpaper.set(userId, wallpaperData);
        }

        if (shouldSendSystemMessage) {
            const systemMessageUuid = crypto.randomUUID();
            const sanitizedName = sanitize(name);
            const systemMessageText = sanitizedName 
                ? `${user.fullName || user.username} установил(а) обои «${sanitizedName}».`
                : `${user.fullName || user.username} изменил(а) обои в этом чате.`;

            const systemMessageDocs = conversation.participants.map(participantId => ({
                conversation: conversation._id,
                owner: participantId,
                uuid: systemMessageUuid,
                text: systemMessageText,
                type: 'system',
                readBy: [],
            }));
            const savedMessages = await Message.insertMany(systemMessageDocs);
            const newSystemMessage = savedMessages[0];
            
            conversation.lastMessage = newSystemMessage._id;

            const payloadForBroadcast = newSystemMessage.toObject();
            payloadForBroadcast.conversationParticipants = conversation.participants;
            
            broadcastToUsers(req, conversation.participants, { type: 'NEW_MESSAGE', payload: payloadForBroadcast });
        }

        await conversation.save();

        for (const participantId of conversation.participants) {
            const updatedConv = await getPopulatedConversation(conversation._id, participantId);
            if (updatedConv) {
                broadcastToUsers(req, [participantId], {
                    type: 'CONVERSATION_UPDATED',
                    payload: { conversation: updatedConv }
                });
            }
        }

        res.status(200).json({ message: 'Обои успешно установлены.' });

    } catch (error) {
        console.error("Set wallpaper error:", error);
        res.status(500).json({ message: "Ошибка сервера при установке обоев." });
    }
});

router.delete('/:conversationId/wallpaper', authMiddleware, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user.userId;

        const conversation = await Conversation.findOne({ _id: conversationId, participants: userId });
        if (!conversation) return res.status(404).json({ message: "Диалог не найден." });

        conversation.wallpaper.set(userId, undefined);
        await conversation.save();

        const updatedConv = await getPopulatedConversation(conversation._id, userId);
        if (updatedConv) {
            broadcastToUsers(req, [userId], {
                type: 'CONVERSATION_UPDATED',
                payload: { conversation: updatedConv }
            });
        }

        res.status(200).json({ message: 'Обои успешно сброшены.' });
    } catch (error) {
        console.error("Reset wallpaper error:", error);
        res.status(500).json({ message: "Ошибка сервера при сбросе обоев." });
    }
});

router.post('/:conversationId/pin', authMiddleware, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user.userId;
        
        const user = await User.findById(userId).select('premium');
        if (!user) return res.status(404).json({ message: "Пользователь не найден." });

        const conversation = await Conversation.findOne({ _id: conversationId, participants: userId });
        if (!conversation) return res.status(404).json({ message: "Диалог не найден." });

        const isPinned = conversation.pinnedBy.includes(userId);

        if (!isPinned) {
            const pinLimit = user.premium?.isActive ? 8 : 4;
            const currentPinnedCount = await Conversation.countDocuments({ pinnedBy: userId });

            if (currentPinnedCount >= pinLimit) {
                const message = user.premium?.isActive 
                    ? `Достигнут лимит в ${pinLimit} закрепленных чатов.`
                    : `Лимит в ${pinLimit} чата достигнут. Premium-пользователи могут закреплять до 8.`;
                return res.status(403).json({ message });
            }
        }
        
        if (isPinned) {
            await Conversation.updateOne({ _id: conversationId }, { $pull: { pinnedBy: userId } });
        } else {
            await Conversation.updateOne({ _id: conversationId }, { $addToSet: { pinnedBy: userId } });
        }
        
        const updatedConv = await getPopulatedConversation(conversation._id, userId);
        broadcastToUsers(req, [userId], {
            type: 'CONVERSATION_UPDATED',
            payload: { conversation: updatedConv }
        });

        res.status(200).json({ message: isPinned ? 'Чат откреплен' : 'Чат закреплен' });
    } catch (error) {
        console.error("Pin chat error:", error);
        res.status(500).json({ message: "Ошибка сервера при закреплении чата" });
    }
});


module.exports = router;