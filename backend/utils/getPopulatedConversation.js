// backend/utils/getPopulatedConversation.js
const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const { isAllowedByPrivacy } = require('./privacy');

async function getPopulatedConversation(conversationId, forUserId) {
    const userId = new mongoose.Types.ObjectId(forUserId);
    const conversations = await Conversation.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(conversationId) } },
        {
            $addFields: {
                isSavedMessages: { $eq: [{ $size: '$participants' }, 1] },
                interlocutorId: {
                    $cond: {
                        if: { $eq: [{ $size: '$participants' }, 1] },
                        then: { $arrayElemAt: ['$participants', 0] },
                        else: { $arrayElemAt: [{ $filter: { input: '$participants', as: 'p', cond: { $ne: ['$$p', userId] } } }, 0] }
                    }
                }
            }
        },
        {
            $lookup: {
                from: 'users',
                localField: 'interlocutorId',
                foreignField: '_id',
                as: 'interlocutor'
            }
        },
        { $unwind: '$interlocutor' },
        {
            $lookup: {
                from: 'messages',
                localField: 'lastMessage',
                foreignField: '_id',
                pipeline: [
                    {
                        $lookup: {
                            from: 'users',
                            localField: 'sender',
                            foreignField: '_id',
                            as: 'senderInfo'
                        }
                    },
                    { $unwind: { path: '$senderInfo', preserveNullAndEmptyArrays: true } },
                    // --- НАЧАЛО ИСПРАВЛЕНИЯ ---
                    {
                        $lookup: {
                            from: 'tracks',
                            localField: 'attachedTrack',
                            foreignField: '_id',
                            pipeline: [
                                {
                                    $lookup: {
                                        from: 'artists',
                                        localField: 'artist',
                                        foreignField: '_id',
                                        as: 'artistInfo'
                                    }
                                },
                                {
                                    $lookup: {
                                        from: 'albums',
                                        localField: 'album',
                                        foreignField: '_id',
                                        as: 'albumInfo'
                                    }
                                },
                                { $unwind: { path: '$albumInfo', preserveNullAndEmptyArrays: true } }
                            ],
                            as: 'trackInfo'
                        }
                    },
                    { $unwind: { path: '$trackInfo', preserveNullAndEmptyArrays: true } }
                    // --- КОНЕЦ ИСПРАВЛЕНИЯ ---
                ],
                as: 'lastMessageDetails'
            }
        },
        { $unwind: { path: "$lastMessageDetails", preserveNullAndEmptyArrays: true } },
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
                    { 
                        $match: { 
                            $expr: { 
                                $and: [
                                    { $in: ['$uuid', '$$uuids'] },
                                    { $eq: ['$owner', userId] } 
                                ]
                            } 
                        } 
                    },
                    { $lookup: { from: 'users', localField: 'sender', foreignField: '_id', as: 'senderInfo' } },
                    { $unwind: { path: '$senderInfo', preserveNullAndEmptyArrays: true } },
                    { $lookup: { from: 'tracks', localField: 'attachedTrack', foreignField: '_id', as: 'trackInfo' } },
                    { $unwind: { path: '$trackInfo', preserveNullAndEmptyArrays: true } },
                    { $project: { _id: 1, text: 1, imageUrl: 1, attachedTrack: '$trackInfo', sender: '$senderInfo' } }
                ],
                as: 'pinnedMessageDetailsForUser'
            }
        },

        { $lookup: { from: 'messages', let: { cId: '$_id' }, pipeline: [ { $match: { $expr: { $and: [ { $eq: ['$conversation', '$$cId'] }, { $eq: ['$owner', userId] }, { $ne: ['$sender', userId] }, { $not: { $in: [userId, { $ifNull: ['$readBy', []] }] } } ] } } }, { $count: 'unreadCount' } ], as: 'unreadInfo' } },
        {
            $project: {
                _id: 1,
                isSavedMessages: 1,
                interlocutor: 1,
                lastMessage: {
                    _id: '$lastMessageDetails._id',
                    text: '$lastMessageDetails.text',
                    imageUrl: '$lastMessageDetails.imageUrl',
                    type: '$lastMessageDetails.type',
                    createdAt: '$lastMessageDetails.createdAt',
                    // --- НАЧАЛО ИСПРАВЛЕНИЯ ---
                    attachedTrack: {
                        $cond: {
                            if: { $eq: [{ $ifNull: ["$lastMessageDetails.trackInfo", null] }, null] },
                            then: null,
                            else: {
                                $mergeObjects: [
                                    "$lastMessageDetails.trackInfo",
                                    { 
                                        albumArtUrl: { $ifNull: ["$lastMessageDetails.trackInfo.albumArtUrl", "$lastMessageDetails.trackInfo.albumInfo.coverArtUrl"] },
                                        artist: "$lastMessageDetails.trackInfo.artistInfo", // Ensure artist data is passed correctly
                                        album: "$lastMessageDetails.trackInfo.albumInfo"    // Ensure album data is passed correctly
                                    }
                                ]
                            }
                        }
                    },
                    // --- КОНЕЦ ИСПРАВЛЕНИЯ ---
                    sender: {
                        _id: '$lastMessageDetails.senderInfo._id',
                        username: '$lastMessageDetails.senderInfo.username',
                        fullName: '$lastMessageDetails.senderInfo.fullName',
                        avatar: '$lastMessageDetails.senderInfo.avatar'
                    },
                    readBy: { $ifNull: ['$lastMessageDetails.readBy', []] },
                    reactions: '$lastMessageDetails.reactions'
                },
                pinnedMessages: '$pinnedMessageDetailsForUser',
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
    if (!conversations || conversations.length === 0) return null;
    const conv = conversations[0];
     
    if (conv.interlocutor && !conv.isSavedMessages) {
        const interlocutorUser = conv.interlocutor;
        const interlocutorFriends = (interlocutorUser.friends || []).map(f => f.user?.toString());
        conv.friendshipStatus = interlocutorFriends.includes(userId.toString()) ? 'friend' : 'none';
        conv.interlocutor.isBlockedByThem = (interlocutorUser.blacklist || []).some(id => id.equals(userId));
        if (conv.interlocutor.isBlockedByThem || !isAllowedByPrivacy(interlocutorUser.privacySettings?.viewAvatar, userId, interlocutorUser)) {
            conv.interlocutor.avatar = null;
        }
    }
    return conv;
}

module.exports = { getPopulatedConversation };