// backend/routes/messages/messages-main.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middleware/auth.middleware');
const Message = require('../../models/Message');
const crypto = require('crypto');
const Conversation = require('../../models/Conversation');
const User = require('../../models/User');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { isAllowedByPrivacy } = require('../../utils/privacy');
const { getPopulatedConversation } = require('../../utils/getPopulatedConversation');
const { createStorage, cloudinary } = require('../../config/cloudinary');
const { sanitize } = require('../../utils/sanitize');

const messageImageStorage = createStorage('messages');
const uploadMessageImage = multer({ storage: messageImageStorage });

const broadcastToUsers = (req, userIds, message) => {
    userIds.forEach(userId => {
        const userSocket = req.clients.get(userId.toString());
        if (userSocket && userSocket.readyState === 1) { // WebSocket.OPEN
            userSocket.send(JSON.stringify(message));
        }
    });
};

router.post('/', authMiddleware, uploadMessageImage.single('image'), async (req, res) => {
    try {
        const senderId = new mongoose.Types.ObjectId(req.user.userId);
        let { recipientId, text, replyToMessageId, conversationId, attachedTrackId, uuid } = req.body;
        const sanitizedText = sanitize(text);
        const recipientObjectId = new mongoose.Types.ObjectId(recipientId);
        
        if (attachedTrackId === 'null') {
            attachedTrackId = null;
        }

        // --- НАЧАЛО ИСПРАВЛЕНИЯ ---
        let finalAttachedTrackId = null;
        if (attachedTrackId) {
            // Находим трек, который прислал клиент (это может быть 'saved' копия)
            const trackFromClient = await Track.findById(attachedTrackId).select('sourceId type').lean();
            if (trackFromClient) {
                // Если у трека есть sourceId, значит это копия. Берем ID оригинала.
                // Если sourceId нет, значит это уже и есть оригинальный трек.
                finalAttachedTrackId = trackFromClient.sourceId || trackFromClient._id;
            }
        }
        // --- КОНЕЦ ИСПРАВЛЕНИЯ ---

        let conversation;
        if (senderId.equals(recipientObjectId)) {
            conversation = await Conversation.findOne({ participants: { $eq: [senderId] } });
        } else {
            const recipient = await User.findById(recipientObjectId).select('blacklist privacySettings friends');
            if (recipient && recipient.blacklist.includes(senderId)) {
                return res.status(403).json({ message: 'Вы не можете отправлять сообщения этому пользователю.' });
            }
            if (!isAllowedByPrivacy(recipient.privacySettings?.messageMe, senderId, recipient)) {
                return res.status(403).json({ message: 'Пользователь ограничил круг лиц, которые могут ему писать.' });
            }

            if (conversationId) {
                conversation = await Conversation.findById(conversationId);
            } else {
                conversation = await Conversation.findOne({
                    participants: { $all: [senderId, recipientObjectId], $size: 2 }
                });
     
                if (!conversation) {
                    conversation = new Conversation({ participants: [senderId, recipientObjectId] });
                    await conversation.save();
                }
            }
        }
 
        conversation.deletedBy = [];
 
        const messageUuid = uuid || crypto.randomUUID();
 
        const messageData = {
            conversation: conversation._id,
            sender: senderId,
            uuid: messageUuid,
            text: sanitizedText || '',
            replyTo: replyToMessageId || null,
            imageUrl: req.file ? req.file.path : null,
            attachedTrack: finalAttachedTrackId, // <-- Используем исправленный ID
        };
        
        let savedMessage;

        if (senderId.equals(recipientObjectId)) {
            const savedMessagesChat = new Message({
                ...messageData,
                owner: senderId,
                readBy: [senderId],
            });
            savedMessage = await savedMessagesChat.save();

            conversation.lastMessage = savedMessage._id;
            await conversation.save();
            
            const populatedMessage = await Message.findById(savedMessage._id)
                .populate('sender', 'username fullName avatar')
                .populate({ path: 'replyTo', populate: { path: 'sender', select: 'username fullName premium premiumCustomization' } })
                .populate('attachedTrack');
            
            broadcastToUsers(req, [senderId.toString()], {
                type: 'NEW_MESSAGE',
                payload: populatedMessage
            });

        } else {
            const senderMessage = new Message({ ...messageData, owner: senderId, readBy: [senderId] });
            const recipientMessage = new Message({ ...messageData, owner: recipientObjectId, readBy: [] });
            
            const [savedSenderMessage] = await Message.insertMany([senderMessage, recipientMessage]);
            savedMessage = savedSenderMessage;

            conversation.lastMessage = savedMessage._id;
            await conversation.save();

            const populatedSenderMessage = await Message.findById(savedMessage._id)
                .populate('sender', 'username fullName avatar')
                .populate({ path: 'replyTo', populate: { path: 'sender', select: 'username fullName premium premiumCustomization' } })
                .populate('attachedTrack');
                
            const populatedRecipientMessage = await Message.findById(recipientMessage._id)
                .populate('sender', 'username fullName avatar')
                .populate({ path: 'replyTo', populate: { path: 'sender', select: 'username fullName premium premiumCustomization' } })
                .populate('attachedTrack');
            
            const payloadForSender = populatedSenderMessage.toObject();
            payloadForSender.conversationParticipants = conversation.participants;
            const payloadForRecipient = populatedRecipientMessage.toObject();

            broadcastToUsers(req, [senderId.toString()], { type: 'NEW_MESSAGE', payload: payloadForSender });
            broadcastToUsers(req, [recipientObjectId.toString()], { type: 'NEW_MESSAGE', payload: payloadForRecipient });
        }
        
        for (const participantId of conversation.participants) {
            const updatedConv = await getPopulatedConversation(conversation._id, participantId);
            if (updatedConv) {
                broadcastToUsers(req, [participantId.toString()], {
                    type: 'CONVERSATION_UPDATED',
                    payload: { conversation: updatedConv }
                });
            }
        }

        res.status(201).json(savedMessage);
    } catch (error) {
        if (req.file) {
            cloudinary.uploader.destroy(req.file.filename);
        }
        console.error('Error sending message:', error);
        res.status(500).json({ message: 'Ошибка на сервере' });
    }
});

router.put('/:messageId', authMiddleware, async (req, res) => {
    try {
        const { text } = req.body;
        const sanitizedText = sanitize(text);
        const { messageId } = req.params;
        const userId = req.user.userId;

        if (!sanitizedText || sanitizedText.trim() === '') {
            return res.status(400).json({ message: "Текст не может быть пустым" });
        }

        const message = await Message.findById(messageId);

        if (!message) {
            return res.status(404).json({ message: "Сообщение не найдено" });
        }

        if (message.sender.toString() !== userId) {
            return res.status(403).json({ message: "Вы не можете редактировать это сообщение" });
        }

        await Message.updateMany({ uuid: message.uuid }, { $set: { text: sanitizedText } });

        const conversation = await Conversation.findById(message.conversation);
        if (conversation) {
            const activeParticipants = conversation.participants.filter(pId => 
                !(conversation.deletedBy || []).some(deletedId => deletedId.equals(pId))
            );
            broadcastToUsers(req, activeParticipants, {
                type: 'MESSAGE_UPDATED',
                payload: {
                    messageId: message._id,
                    uuid: message.uuid,
                    conversationId: message.conversation,
                    updates: { text: sanitizedText } 
                }
            });
             broadcastToUsers(req, activeParticipants, { type: 'CONVERSATION_UPDATED', payload: { conversationId: conversation._id } });
        }

        res.status(200).json({ message: "Сообщение успешно изменено" });
    } catch (error) {
        console.error('Edit message error:', error);
        res.status(500).json({ message: "Ошибка на сервере" });
    }
});

router.get('/:messageId/context', authMiddleware, async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = new mongoose.Types.ObjectId(req.user.userId);
        const limit = 30;

        const anyMessageCopy = await Message.findById(messageId).select('uuid createdAt conversation').lean();
        if (!anyMessageCopy) {
            return res.status(404).json({ message: 'Исходное сообщение не найдено.' });
        }
        
        const targetMessage = await Message.findOne({ uuid: anyMessageCopy.uuid, owner: userId });
        
        const finalMessageIdToHighlight = targetMessage ? targetMessage._id.toString() : messageId;

        const conversationId = anyMessageCopy.conversation;
        const createdAt = anyMessageCopy.createdAt;

        const newerMessagesCount = await Message.countDocuments({
            conversation: conversationId,
            owner: userId,
            createdAt: { $gt: createdAt }
        });

        const page = Math.floor(newerMessagesCount / limit) + 1;
        const skip = (page - 1) * limit;

        const messages = await Message.find({ conversation: conversationId, owner: userId })
            .populate('sender', 'username fullName avatar')
            .populate({
                path: 'replyTo',
                populate: { path: 'sender', select: 'username fullName premium premiumCustomization' }
            })
            .populate('forwardedFrom', 'username fullName')
             // --- НАЧАЛО ИСПРАВЛЕНИЯ ---
            .populate({
                path: 'attachedTrack',
                 populate: [
                    { path: 'artist', select: 'name' },
                    { path: 'album', select: 'coverArtUrl' }
                ]
            })
            // --- КОНЕЦ ИСПРАВЛЕНИЯ ---
            .populate({ path: 'reactions.user', select: 'username fullName' })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalMessages = await Message.countDocuments({ conversation: conversationId, owner: userId });
        const hasMore = (skip + messages.length) < totalMessages;

        res.json({
            messages: messages.reverse(),
            page,
            hasMore,
            highlightId: finalMessageIdToHighlight 
        });

    } catch (error) {
        console.error("Error fetching message context:", error);
        res.status(500).json({ message: "Ошибка сервера при загрузке контекста сообщения." });
    }
});

router.get('/conversations/:conversationId/messages-by-date', authMiddleware, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { date } = req.query; // date in "YYYY-MM-DD" format
        const userId = new mongoose.Types.ObjectId(req.user.userId);

        if (!date) {
            return res.status(400).json({ message: 'Дата не указана.' });
        }
        
        const startOfDay = new Date(date);
        startOfDay.setUTCHours(0, 0, 0, 0);

        const firstMessageOnDate = await Message.findOne({
            conversation: conversationId,
            owner: userId,
            createdAt: { $gte: startOfDay }
        }).sort({ createdAt: 1 });

        if (!firstMessageOnDate) {
            return res.status(404).json({ message: 'Сообщений за эту дату не найдено.' });
        }

        const limit = 30;
        const newerMessagesCount = await Message.countDocuments({
            conversation: conversationId,
            owner: userId,
            createdAt: { $gt: firstMessageOnDate.createdAt }
        });

        const page = Math.floor(newerMessagesCount / limit) + 1;
        const skip = (page - 1) * limit;

        const messages = await Message.find({ conversation: conversationId, owner: userId })
            .populate('sender', 'username fullName avatar')
            .populate({ path: 'replyTo', populate: { path: 'sender', select: 'username fullName premium premiumCustomization' } })
            .populate('forwardedFrom', 'username fullName')
            // --- НАЧАЛО ИСПРАВЛЕНИЯ ---
            .populate({
                path: 'attachedTrack',
                 populate: [
                    { path: 'artist', select: 'name' },
                    { path: 'album', select: 'coverArtUrl' }
                ]
            })
            // --- КОНЕЦ ИСПРАВЛЕНИЯ ---
            .populate({ path: 'reactions.user', select: 'username fullName' })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalMessages = await Message.countDocuments({ conversation: conversationId, owner: userId });
        const hasMore = (skip + messages.length) < totalMessages;

        res.json({
            messages: messages.reverse(),
            page,
            hasMore
        });
    } catch (error) {
        console.error("Error fetching messages by date:", error);
        res.status(500).json({ message: "Ошибка сервера при загрузке сообщений по дате." });
    }
});

router.get('/:messageId', authMiddleware, async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = new mongoose.Types.ObjectId(req.user.userId);

        const anyMessageCopy = await Message.findById(messageId).select('uuid conversation').lean();
        if (!anyMessageCopy) {
            return res.status(404).json({ message: 'Сообщение не найдено' });
        }

        const conversation = await Conversation.findById(anyMessageCopy.conversation).select('participants').lean();
        if (!conversation || !conversation.participants.some(p => p.equals(userId))) {
            return res.status(403).json({ message: 'Доступ запрещен к этому сообщению' });
        }
        
        const message = await Message.findOne({ uuid: anyMessageCopy.uuid, owner: userId })
            .populate('sender', 'username fullName avatar')
            .populate({
                path: 'replyTo',
                populate: { path: 'sender', select: 'username fullName premium premiumCustomization' }
            })
            .populate('forwardedFrom', 'username fullName')
             // --- НАЧАЛО ИСПРАВЛЕНИЯ ---
            .populate({
                path: 'attachedTrack',
                 populate: [
                    { path: 'artist', select: 'name' },
                    { path: 'album', select: 'coverArtUrl' }
                ]
            });
            // --- КОНЕЦ ИСПРАВЛЕНИЯ ---
            
        if (!message) {
            return res.status(404).json({ message: 'Копия сообщения для данного пользователя не найдена.' });
        }

        res.json(message);
    } catch (error) {
        console.error('Error fetching single message:', error);
        res.status(500).json({ message: 'Ошибка на сервере' });
    }
});

module.exports = router;