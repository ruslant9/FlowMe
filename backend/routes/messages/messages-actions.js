// backend/routes/messages/messages-actions.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middleware/auth.middleware');
const Message = require('../../models/Message');
const Conversation = require('../../models/Conversation');
const User = require('../../models/User');
const mongoose = require('mongoose');
const crypto = require('crypto');

// Helper to broadcast to specific users (from server.js context)
const broadcastToUsers = (req, userIds, message) => {
    userIds.forEach(userId => {
        const userSocket = req.clients.get(userId.toString());
        if (userSocket && userSocket.readyState === 1) { // WebSocket.OPEN
            userSocket.send(JSON.stringify(message));
        }
    });
};

// 1. Добавить/убрать реакцию
router.post('/:messageId/react', authMiddleware, async (req, res) => {
    try {
        const { messageId } = req.params;
        const { emoji } = req.body;
        const userId = new mongoose.Types.ObjectId(req.user.userId);

        const message = await Message.findById(messageId);
        if (!message) return res.status(404).json({ message: "Сообщение не найдено" });

        const conversation = await Conversation.findById(message.conversation);
        if (!conversation) return res.status(404).json({ message: "Диалог не найден" });
        
        const requester = await User.findById(userId).select('blacklist');
        const otherParticipantId = conversation.participants.find(p => !p.equals(userId));
        const otherParticipant = await User.findById(otherParticipantId).select('blacklist');

        if (!requester || !otherParticipant) {
             return res.status(404).json({ message: 'Один из участников не найден' });
        }

        const isRequesterBlocking = requester.blacklist.some(id => id.equals(otherParticipantId));
        const isRequesterBlocked = otherParticipant.blacklist.some(id => id.equals(userId));

        if (isRequesterBlocking || isRequesterBlocked) {
            return res.status(403).json({ message: 'Действие недоступно из-за блокировки.' });
        }

        const existingReactionIndex = message.reactions.findIndex(r => r.user.equals(userId));
        const currentReactions = [...message.reactions];

        if (existingReactionIndex > -1) {
            if (currentReactions[existingReactionIndex].emoji === emoji) {
                currentReactions.splice(existingReactionIndex, 1);
            } else {
                currentReactions[existingReactionIndex].emoji = emoji;
            }
        } else {
            currentReactions.push({ emoji, user: userId });
        }
        
        await Message.updateMany({ uuid: message.uuid }, { $set: { reactions: currentReactions } });

        const populatedReactions = await Promise.all(
            currentReactions.map(async r => {
                const reactionObject = r.toObject ? r.toObject() : r;
                return {
                    ...reactionObject,
                    user: await User.findById(r.user).select('username fullName').lean()
                };
            })
        );

        broadcastToUsers(req, conversation.participants, {
            type: 'MESSAGE_UPDATED',
            payload: {
                uuid: message.uuid,
                conversationId: message.conversation,
                updates: { reactions: populatedReactions }
            }
        });

        res.status(200).json(populatedReactions);
    } catch (error) {
        console.error("React to message error:", error);
        res.status(500).json({ message: "Ошибка сервера" });
    }
});


// 2. Удалить сообщение
router.delete('/', authMiddleware, async (req, res) => {
    try {
        const { messageIds, forEveryone } = req.body;
        const userId = new mongoose.Types.ObjectId(req.user.userId);
        let conversationId = null;
        let wasLastMessage = false;
        // --- НАЧАЛО ИЗМЕНЕНИЯ: Собираем UUIDы для отправки ---
        const messageUuidsToDelete = [];
        // --- КОНЕЦ ИЗМЕНЕНИЯ ---

        for (const messageId of messageIds) {
            const message = await Message.findById(messageId).populate('conversation');
            if (!message) continue;
            
            conversationId = message.conversation._id;
            if (message.conversation.lastMessage?.equals(message._id)) {
                wasLastMessage = true;
            }

            if (forEveryone) {
                const conversation = message.conversation;
                const requester = await User.findById(userId).select('blacklist');
                const otherParticipantId = conversation.participants.find(p => !p.equals(userId));
                const otherParticipant = await User.findById(otherParticipantId).select('blacklist');
                
                if (requester.blacklist.some(id => id.equals(otherParticipantId)) || otherParticipant.blacklist.some(id => id.equals(userId))) {
                     return res.status(403).json({ message: "Невозможно удалить сообщение для всех при активной блокировке." });
                }

                if (message.sender.equals(userId)) {
                    // --- НАЧАЛО ИЗМЕНЕНИЯ: Добавляем UUID в массив и удаляем по нему ---
                    messageUuidsToDelete.push(message.uuid);
                    await Message.deleteMany({ uuid: message.uuid });
                    // --- КОНЕЦ ИЗМЕНЕНИЯ ---
                } else {
                    return res.status(403).json({ message: "Вы не можете удалить это сообщение для всех" });
                }
            } else {
                await Message.deleteOne({ _id: messageId, owner: userId });
            }
        }
        
        if(conversationId) {
            const conversation = await Conversation.findById(conversationId);
            if (conversation) {
                if (wasLastMessage) {
                     for (const participantId of conversation.participants) {
                        const newLastMessage = await Message.findOne({
                            conversation: conversationId,
                            owner: participantId
                        }).sort({ createdAt: -1 });
                        
                        conversation.lastMessage = newLastMessage ? newLastMessage._id : null;
                        await conversation.save();
                    }
                }
                
                // --- НАЧАЛО ИЗМЕНЕНИЯ: Отправляем UUIDы вместо ID ---
                const payload = {
                    conversationId: conversationId.toString(),
                    messageUuids: forEveryone ? messageUuidsToDelete : null,
                    messageIds: forEveryone ? null : messageIds,
                    forEveryone
                };
                if (!forEveryone) {
                    payload.deletedBy = userId.toString();
                }
                // --- КОНЕЦ ИЗМЕНЕНИЯ ---

                 broadcastToUsers(req, conversation.participants, {
                    type: 'MESSAGES_DELETED',
                    payload
                });
                broadcastToUsers(req, conversation.participants, {
                    type: 'CONVERSATION_UPDATED',
                    payload: { conversationId: conversation._id }
                });
            }
        }

        res.status(200).json({ message: 'Сообщения удалены' });
    } catch (error) {
        console.error("Delete messages error:", error);
        res.status(500).json({ message: "Ошибка сервера" });
    }
});

// 3. Переслать сообщения
router.post('/forward', authMiddleware, async (req, res) => {
    try {
        const { messageIds, targetConversationIds } = req.body;
        const senderId = new mongoose.Types.ObjectId(req.user.userId);

        const originalMessages = await Message.find({ '_id': { $in: messageIds } }).sort({ createdAt: 1 });

        for (const targetConvId of targetConversationIds) {
            const conversation = await Conversation.findById(targetConvId);
            if (!conversation) continue;

            for (const msg of originalMessages) {
                const forwardedFromUser = msg.sender.equals(senderId) ? null : msg.sender;
                const messageUuid = crypto.randomUUID();

                const messageData = {
                    conversation: conversation._id,
                    sender: senderId,
                    uuid: messageUuid,
                    text: msg.text,
                    imageUrl: msg.imageUrl,
                    attachedTrack: msg.attachedTrack,
                    readBy: [senderId],
                    forwardedFrom: forwardedFromUser
                };

                const copies = conversation.participants.map(participantId => ({
                    ...messageData,
                    owner: participantId,
                    readBy: participantId.equals(senderId) ? [senderId] : []
                }));
                
                const savedMessages = await Message.insertMany(copies);
                const senderCopy = savedMessages.find(m => m.owner.equals(senderId));

                conversation.lastMessage = senderCopy._id;
                await conversation.save();

                for(const msgCopy of savedMessages) {
                    const populatedMessage = await Message.findById(msgCopy._id)
                        .populate('sender', 'username fullName avatar')
                        .populate('forwardedFrom', 'username fullName');
                    
                    broadcastToUsers(req, [msgCopy.owner.toString()], {
                        type: 'NEW_MESSAGE',
                        payload: populatedMessage
                    });
                }
            }
             broadcastToUsers(req, conversation.participants, {
                type: 'CONVERSATION_UPDATED',
                payload: { conversationId: conversation._id }
            });
        }
        
        res.status(200).json({ message: 'Сообщения пересланы' });
    } catch (error) {
         console.error('Forward message error:', error);
         res.status(500).json({ message: "Ошибка сервера" });
    }
});

module.exports = router;