// backend/routes/communities.js

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const Community = require('../models/Community');
const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { isAllowedByPrivacy } = require('../utils/privacy');
const { createStorage, cloudinary } = require('../config/cloudinary'); // ИЗМЕНЕНИЕ: Импорт Cloudinary

// --- ИЗМЕНЕНИЕ: Используем Cloudinary Storage ---
const communityImageStorage = createStorage('communities');
const uploadCommunityImages = multer({ storage: communityImageStorage });

const canManageCommunity = async (req, res, next) => {
    try {
        const community = await Community.findById(req.params.communityId);
        if (!community) {
            return res.status(404).json({ message: 'Сообщество не найдено.' });
        }
        if (community.owner.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'У вас нет прав на управление этим сообществом.' });
        }
        req.community = community;
        next();
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера при проверке прав.' });
    }
};

router.post('/', authMiddleware, uploadCommunityImages.fields([{ name: 'avatar', maxCount: 1 }, { name: 'coverImage', maxCount: 1 }]), async (req, res) => {
    try {
        const { name, description, topic, visibility, joinPolicy } = req.body;
        if (!name) {
            return res.status(400).json({ message: 'Название сообщества обязательно.' });
        }
        const existingCommunity = await Community.findOne({ name });
        if (existingCommunity) {
            return res.status(400).json({ message: 'Сообщество с таким названием уже существует.' });
        }

        const newCommunity = new Community({
            name,
            description: description || '',
            owner: req.user.userId,
            topic: topic || 'General',
            visibility: visibility || 'public',
            joinPolicy: joinPolicy || 'open',
            avatar: req.files?.avatar?.[0]?.path || null,
            coverImage: req.files?.coverImage?.[0]?.path || null,
        });

        await newCommunity.save();

        await User.findByIdAndUpdate(req.user.userId, {
            $addToSet: { subscribedCommunities: newCommunity._id }
        });

        res.status(201).json({ message: 'Сообщество успешно создано!', community: newCommunity });
    } catch (error) {
        console.error('Ошибка при создании сообщества:', error);
        if (req.files) {
            if (req.files.avatar) cloudinary.uploader.destroy(req.files.avatar[0].filename);
            if (req.files.coverImage) cloudinary.uploader.destroy(req.files.coverImage[0].filename);
        }
        res.status(500).json({ message: 'Ошибка на сервере при создании сообщества.' });
    }
});

// --- ИЗМЕНЕНИЕ: Полностью переработанный роут обновления ---
router.put('/:communityId', authMiddleware, canManageCommunity, uploadCommunityImages.fields([{ name: 'avatar', maxCount: 1 }, { name: 'coverImage', maxCount: 1 }]), async (req, res) => {
    try {
        const { name, description, topic, visibility, joinPolicy, postingPolicy, adminVisibility, memberListVisibility, removeAvatar, removeCoverImage } = req.body;
        const community = req.community;

        if (name && name !== community.name) {
            const existing = await Community.findOne({ name });
            if (existing) {
                return res.status(400).json({ message: 'Сообщество с таким названием уже существует.' });
            }
            community.name = name;
        }

        community.description = description || '';
        community.topic = topic;
        community.visibility = visibility;
        community.joinPolicy = joinPolicy;
        community.postingPolicy = postingPolicy;
        community.adminVisibility = adminVisibility;
        community.memberListVisibility = memberListVisibility;
        
        // Обработка аватара
        if (req.files?.avatar) {
            if (community.avatar) {
                const publicId = getPublicIdFromUrl(community.avatar);
                if (publicId) cloudinary.uploader.destroy(publicId);
            }
            community.avatar = req.files.avatar[0].path;
        } else if (removeAvatar === 'true') {
            if (community.avatar) {
                const publicId = getPublicIdFromUrl(community.avatar);
                if (publicId) cloudinary.uploader.destroy(publicId);
            }
            community.avatar = null;
        }

        // Обработка обложки
        if (req.files?.coverImage) {
            if (community.coverImage) {
                const publicId = getPublicIdFromUrl(community.coverImage);
                if (publicId) cloudinary.uploader.destroy(publicId);
            }
            community.coverImage = req.files.coverImage[0].path;
        } else if (removeCoverImage === 'true') {
            if (community.coverImage) {
                const publicId = getPublicIdFromUrl(community.coverImage);
                if (publicId) cloudinary.uploader.destroy(publicId);
            }
            community.coverImage = null;
        }
        
        await community.save();
        req.broadcastMessage({
            type: 'COMMUNITY_UPDATED',
            payload: { communityId: community._id }
        });
        res.status(200).json({ message: 'Сообщество успешно обновлено!', community });
    } catch (error) {
        console.error('Ошибка при обновлении сообщества:', error);
        res.status(500).json({ message: 'Ошибка сервера при обновлении сообщества.' });
    }
});
// --- КОНЕЦ ИЗМЕНЕНИЯ ---

router.delete('/:communityId', authMiddleware, canManageCommunity, async (req, res) => {
    try {
        const community = req.community;
        const postsToDelete = await Post.find({ community: community._id });
        const postIds = postsToDelete.map(p => p._id);

        const commentsToDelete = await Comment.find({ post: { $in: postIds } }).select('_id');
        const commentIds = commentsToDelete.map(c => c._id);

        await Notification.deleteMany({
            $or: [
                { entityId: community._id },
                { entityId: { $in: postIds } },
                { entityId: { $in: commentIds } }
            ]
        });

        await Comment.deleteMany({ post: { $in: postIds } });

        postsToDelete.forEach(post => {
            if (post.imageUrls && post.imageUrls.length > 0) {
                post.imageUrls.forEach(url => {
                    const filePath = path.join(__dirname, '..', url);
                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                });
            }
        });

        await Post.deleteMany({ community: community._id });

        if (community.avatar) {
            const filePath = path.join(__dirname, '..', community.avatar);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
        if (community.coverImage) {
            const filePath = path.join(__dirname, '..', community.coverImage);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }

        await User.updateMany(
            { subscribedCommunities: community._id },
            { $pull: { subscribedCommunities: community._id } }
        );

        await community.deleteOne();

        res.status(200).json({ message: 'Сообщество и все связанные данные удалены.' });
    } catch (error) {
        console.error('Ошибка при удалении сообщества:', error);
        res.status(500).json({ message: 'Ошибка сервера при удалении сообщества.' });
    }
});
router.get('/my', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId)
            .populate({
                path: 'subscribedCommunities',
                select: 'name avatar description members owner visibility joinPolicy topic pendingJoinRequests postingPolicy'
            })
            .lean();
        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден.' });
        }
        const communities = user.subscribedCommunities.map(community => ({
            ...community,
            isOwner: community.owner.toString() === req.user.userId,
            isPending: community.pendingJoinRequests?.some(id => id.toString() === req.user.userId) || false
        }));
        res.json(communities);
    } catch (error) {
        console.error('Ошибка при получении моих сообществ:', error);
        res.status(500).json({ message: 'Ошибка на сервере.' });
    }
});

router.get('/created', authMiddleware, async (req, res) => {
    try {
        const communities = await Community.find({ owner: req.user.userId })
            .select('name avatar description members owner visibility joinPolicy topic pendingJoinRequests')
            .lean();
        const communitiesWithOwnerFlag = communities.map(community => ({
            ...community,
            isOwner: true,
            isPending: community.pendingJoinRequests?.some(id => id.toString() === req.user.userId) || false
        }));
        res.json(communitiesWithOwnerFlag);
    } catch (error) {
        console.error('Ошибка при получении созданных сообществ:', error);
        res.status(500).json({ message: 'Ошибка на сервере.' });
    }
});

router.get('/recommended', authMiddleware, async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.user.userId);
        const searchQuery = req.query.q;

        let query = { visibility: 'public' };

        if (searchQuery) {
            query.$or = [
                { name: { $regex: searchQuery, $options: 'i' } },
                { description: { $regex: searchQuery, $options: 'i' } },
                { topic: { $regex: searchQuery, $options: 'i' } }
            ];
        }

        const communities = await Community.find(query)
            .select('name avatar description members owner topic visibility joinPolicy pendingJoinRequests')
            .populate('owner', 'username fullName')
            .limit(20)
            .lean();

        const processedCommunities = communities.map(community => {
            const userIdString = userId.toString();
            return {
                ...community,
                isOwner: community.owner._id.toString() === userIdString,
                isMember: community.members.some(memberId => memberId.toString() === userIdString),
                isPending: community.pendingJoinRequests.some(pendingId => pendingId.toString() === userIdString),
            };
        });

        res.json(processedCommunities);

    } catch (error) {
        console.error('Ошибка при получении рекомендованных сообществ:', error);
        res.status(500).json({ message: 'Ошибка на сервере.' });
    }
});

router.post('/:communityId/join', authMiddleware, async (req, res) => {
    try {
        const { communityId } = req.params;
        const userId = req.user.userId;
        const community = await Community.findById(communityId);
        if (!community) return res.status(404).json({ message: 'Сообщество не найдено.' });
        if (community.bannedUsers.includes(userId)) {
            return res.status(403).json({ message: 'Вы заблокированы в этом сообществе.' });
        }
        if (community.members.includes(userId)) return res.status(400).json({ message: 'Вы уже являетесь участником этого сообщества.' });
        if (community.owner.toString() === userId) return res.status(400).json({ message: 'Вы являетесь владельцем этого сообщества.' });
        if (community.pendingJoinRequests.includes(userId)) community.pendingJoinRequests.pull(userId);

        if (community.joinPolicy === 'open') {
            community.members.push(userId);
            await community.save();
            await User.findByIdAndUpdate(userId, { $addToSet: { subscribedCommunities: communityId } });
            res.status(200).json({ message: 'Вы успешно вступили в сообщество.', status: 'joined' });
        } else if (community.joinPolicy === 'approval_required') {
            if (community.pendingJoinRequests.includes(userId)) return res.status(400).json({ message: 'Ваша заявка уже на рассмотрении.' });
            community.pendingJoinRequests.push(userId);
            await community.save();

            const notification = new Notification({
                recipient: community.owner,
                senders: [userId],
                lastSender: userId,
                type: 'community_join_request',
                entityId: community._id,
                link: `/communities/${community._id}/manage`,
                previewText: community.name
            });
            await notification.save();
            const populatedNotification = await Notification.findById(notification._id).populate('lastSender', 'username fullName avatar');
            req.broadcastToUsers([community.owner.toString()], { type: 'NEW_NOTIFICATION', payload: populatedNotification });

            res.status(200).json({ message: 'Заявка на вступление отправлена.', status: 'pending' });
        } else if (community.joinPolicy === 'invite_only') {
            return res.status(403).json({ message: 'В это сообщество можно вступить только по приглашению.' });
        }
    } catch (error) {
        console.error('Ошибка при попытке вступить в сообщество:', error);
        res.status(500).json({ message: 'Ошибка на сервере.' });
    }
});

router.post('/:communityId/leave', authMiddleware, async (req, res) => {
    try {
        const { communityId } = req.params;
        const userId = req.user.userId;
        const community = await Community.findById(communityId);
        if (!community) return res.status(404).json({ message: 'Сообщество не найдено.' });
        if (community.owner.toString() === userId) return res.status(400).json({ message: 'Владелец не может покинуть свое сообщество.' });
        if (!community.members.includes(userId)) return res.status(400).json({ message: 'Вы не являетесь участником этого сообщества.' });

        community.members.pull(userId);
        await community.save();
        await User.findByIdAndUpdate(userId, { $pull: { subscribedCommunities: communityId } });
        res.status(200).json({ message: 'Вы успешно покинули сообщество.' });
    } catch (error) {
        console.error('Ошибка при попытке покинуть сообщество:', error);
        res.status(500).json({ message: 'Ошибка на сервере.' });
    }
});

router.post('/:communityId/requests/:requestingUserId/approve', authMiddleware, canManageCommunity, async (req, res) => {
    try {
        const { requestingUserId } = req.params;
        const community = req.community;
        if (!community.pendingJoinRequests.includes(requestingUserId)) return res.status(400).json({ message: 'Этот пользователь не подавал заявку.' });
        community.pendingJoinRequests.pull(requestingUserId);
        community.members.push(requestingUserId);
        await community.save();
        await User.findByIdAndUpdate(requestingUserId, { $addToSet: { subscribedCommunities: community._id } });
        await Notification.deleteOne({ recipient: community.owner, type: 'community_join_request', entityId: community._id, senders: requestingUserId });
        req.broadcastToUsers([community.owner.toString()], { type: 'NEW_NOTIFICATION' });
        const notification = await Notification.findOneAndUpdate(
            { recipient: requestingUserId, type: 'community_request_approved', entityId: community._id },
            { $set: { senders: [community.owner], lastSender: community.owner, link: `/communities/${community._id}`, previewText: community.name, previewImage: community.avatar, read: false, updatedAt: new Date() }},
            { upsert: true, new: true }
        ).populate('lastSender', 'username fullName avatar');
        req.broadcastToUsers([requestingUserId.toString()], { type: 'NEW_NOTIFICATION', payload: notification });
        req.broadcastMessage({ type: 'COMMUNITY_UPDATED', payload: { communityId: community._id } });
        res.status(200).json({ message: 'Заявка принята. Пользователь добавлен в сообщество.' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка на сервере.' });
    }
});

router.post('/:communityId/requests/:requestingUserId/deny', authMiddleware, canManageCommunity, async (req, res) => {
    try {
        const { requestingUserId } = req.params;
        const community = req.community;
        if (!community.pendingJoinRequests.includes(requestingUserId)) return res.status(400).json({ message: 'Этот пользователь не подавал заявку.' });
        
        community.pendingJoinRequests.pull(requestingUserId);
        await community.save();
        
        await Notification.deleteOne({ recipient: community.owner, type: 'community_join_request', entityId: community._id, senders: requestingUserId });
        req.broadcastToUsers([community.owner.toString()], { type: 'NEW_NOTIFICATION' });
        
        const notification = await Notification.findOneAndUpdate(
            { recipient: requestingUserId, type: 'community_request_denied', entityId: community._id },
            { 
                $set: { 
                    senders: [community.owner], 
                    lastSender: community.owner, 
                    link: `/communities/${community._id}`, 
                    previewText: community.name, 
                    previewImage: community.avatar,
                    read: false,
                    updatedAt: new Date()
                }
            },
            { upsert: true, new: true }
        ).populate('lastSender', 'username fullName avatar');

        req.broadcastToUsers([requestingUserId.toString()], { type: 'NEW_NOTIFICATION', payload: notification });
        req.broadcastMessage({ type: 'COMMUNITY_UPDATED', payload: { communityId: community._id } });
        
        res.status(200).json({ message: 'Заявка отклонена.' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка на сервере.' });
    }
});

router.put('/:communityId/pin-post', authMiddleware, canManageCommunity, async (req, res) => {
    try {
        const { postId } = req.body;
        const community = req.community;
        if (postId) {
            const post = await Post.findOne({ _id: postId, community: community._id });
            if (!post) return res.status(404).json({ message: 'Пост не найден в этом сообществе.' });
            if (community.pinnedPost && community.pinnedPost.equals(postId)) {
                community.pinnedPost = null;
            } else {
                community.pinnedPost = postId;
            }
        } else {
            community.pinnedPost = null;
        }
        await community.save();
        res.status(200).json({ message: 'Статус закрепления поста обновлен.', community });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера при закреплении поста.' });
    }
});

router.post('/:communityId/members/:memberId/remove', authMiddleware, canManageCommunity, async (req, res) => {
    try {
        const { memberId } = req.params;
        const community = req.community;
        if (community.owner.toString() === memberId) return res.status(400).json({ message: 'Нельзя удалить владельца сообщества.' });
        community.members.pull(memberId);
        await community.save();
        await User.findByIdAndUpdate(memberId, { $pull: { subscribedCommunities: community._id } });
        req.broadcastMessage({ type: 'COMMUNITY_UPDATED', payload: { communityId: community._id } });
        res.status(200).json({ message: 'Участник удален.' });
    } catch (error) { res.status(500).json({ message: 'Ошибка сервера.' }); }
});

router.post('/:communityId/members/:memberId/ban', authMiddleware, canManageCommunity, async (req, res) => {
    try {
        const { memberId } = req.params;
        const community = req.community;
        if (community.owner.toString() === memberId) return res.status(400).json({ message: 'Нельзя забанить владельца сообщества.' });
        community.members.pull(memberId);
        community.bannedUsers.addToSet(memberId);
        await community.save();
        await User.findByIdAndUpdate(memberId, { $pull: { subscribedCommunities: community._id } });
        req.broadcastMessage({ type: 'COMMUNITY_UPDATED', payload: { communityId: community._id } });
        res.status(200).json({ message: 'Участник забанен.' });
    } catch (error) { res.status(500).json({ message: 'Ошибка сервера.' }); }
});

router.post('/:communityId/members/:memberId/unban', authMiddleware, canManageCommunity, async (req, res) => {
    try {
        const { memberId } = req.params;
        const community = req.community;
        community.bannedUsers.pull(memberId);
        await community.save();
        req.broadcastMessage({ type: 'COMMUNITY_UPDATED', payload: { communityId: community._id } });
        res.status(200).json({ message: 'Пользователь разбанен.' });
    } catch (error) { res.status(500).json({ message: 'Ошибка сервера.' }); }
});

router.get('/:communityId', authMiddleware, async (req, res) => {
    try {
        const { communityId } = req.params;
        const requesterId = req.user.userId;
        
        const community = await Community.findById(communityId)
            .populate('owner', 'username fullName avatar')
            .populate('members', 'username fullName avatar') 
            .populate('pendingJoinRequests', 'username fullName avatar')
            .populate('bannedUsers', 'username fullName avatar')
            .lean();

        if (!community) return res.status(404).json({ message: 'Сообщество не найдено.' });

        const isOwner = community.owner._id.toString() === requesterId;
        const isMember = community.members.some(member => member._id.toString() === requesterId);
        const isPending = community.pendingJoinRequests.some(pendingUser => pendingUser._id.toString() === requesterId);
        const isBanned = community.bannedUsers.some(bannedUser => bannedUser._id.toString() === requesterId);

        if ((community.visibility === 'private' || community.visibility === 'secret') && !isMember && !isOwner) {
            return res.status(403).json({ message: 'Это приватное/секретное сообщество.' });
        }
        
        community.memberCount = community.members.length;
        community.isOwner = isOwner;
        community.isMember = isMember;
        community.isPending = isPending;
        community.isBanned = isBanned;

        if (!isOwner) {
            if ((community.memberListVisibility === 'members_only' && !isMember) || community.memberListVisibility === 'none') {
                delete community.members;
            }
            if ((community.adminVisibility === 'members_only' && !isMember) || community.adminVisibility === 'none') {
                delete community.owner;
            }
            delete community.bannedUsers;
        }

        res.json(community);
    } catch (error) {
        if (error.name === 'CastError') return res.status(400).json({ message: 'Неверный ID сообщества.' });
        res.status(500).json({ message: 'Ошибка на сервере.' });
    }
});

router.get('/:communityId/members', authMiddleware, async (req, res) => {
    try {
        const { communityId } = req.params;
        const requesterId = req.user.userId;

        const community = await Community.findById(communityId)
            .select('members owner memberListVisibility')
            .lean();

        if (!community) {
            return res.status(404).json({ message: 'Сообщество не найдено.' });
        }

        const isOwner = community.owner.toString() === requesterId;
        const isMember = community.members.some(memberId => memberId.toString() === requesterId);
        
        if (!isOwner) {
            if (community.memberListVisibility === 'none') {
                return res.status(403).json({ message: 'Владелец скрыл список участников этого сообщества.' });
            }
            if (community.memberListVisibility === 'members_only' && !isMember) {
                return res.status(403).json({ message: 'Список участников доступен только членам этого сообщества.' });
            }
        }
        
        const detailedCommunity = await Community.findById(communityId)
            .populate('members', 'username fullName avatar')
            .select('members');

        res.json(detailedCommunity.members);

    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера при получении списка участников.' });
    }
});
router.get('/:communityId/posts', authMiddleware, async (req, res) => {
    try {
        const { communityId } = req.params;
        const requesterId = req.user.userId;
        const community = await Community.findById(communityId).select('visibility members owner pinnedPost').lean();
        if (!community) return res.status(404).json({ message: 'Сообщество не найдено.' });

        const isOwner = community.owner.toString() === requesterId;
        const isMember = community.members.some(member => member.toString() === requesterId);
 
        if ((community.visibility === 'private' || community.visibility === 'secret') && !isMember && !isOwner) {
            return res.status(403).json({ message: 'У вас нет доступа к постам этого сообщества.' });
        }

        let posts = await Post.find({ community: communityId })
            .populate('user', 'username fullName avatar')
            .populate('community', 'name avatar')
            .populate('likes', 'username fullName avatar _id')
            .populate({ path: 'poll.options.votes', select: 'username fullName avatar' })
            .sort({ createdAt: -1 })
            .lean();

        const pinnedPostId = community.pinnedPost ? community.pinnedPost.toString() : null;
        posts = posts.map(post => ({ ...post, isPinned: post._id.toString() === pinnedPostId }));
        
        if (pinnedPostId) {
            posts.sort((a, b) => {
                if (a.isPinned) return -1;
                if (b.isPinned) return 1;
                return 0;
            });
        }

        res.json(posts);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка на сервере.' });
    }
});

router.post('/:communityId/invite', authMiddleware, canManageCommunity, async (req, res) => {
    try {
        const { targetUserId } = req.body;
        const community = req.community;
        const inviterId = req.user.userId;

        const targetUser = await User.findById(targetUserId).select('privacySettings friends');
        if (!targetUser) return res.status(404).json({ message: "Пользователь для приглашения не найден." });

        if (!isAllowedByPrivacy(targetUser.privacySettings?.inviteToCommunity, inviterId, targetUser)) {
            return res.status(403).json({ message: "Пользователь ограничил круг лиц, которые могут приглашать его в сообщества." });
        }

        if (community.members.includes(targetUserId)) return res.status(400).json({ message: "Пользователь уже является участником." });
        if (community.bannedUsers.includes(targetUserId)) return res.status(400).json({ message: "Пользователь заблокирован в этом сообществе." });
        if (community.pendingJoinRequests.includes(targetUserId)) return res.status(400).json({ message: "У пользователя уже есть активная заявка на вступление." });

        const existingInvite = await Notification.findOne({
            recipient: targetUserId,
            type: 'community_invite',
            entityId: community._id
        });

        if (existingInvite) {
            return res.status(400).json({ message: "Приглашение этому пользователю уже было отправлено." });
        }

        const notification = new Notification({
            recipient: targetUserId,
            senders: [inviterId],
            lastSender: inviterId,
            type: 'community_invite',
            entityId: community._id,
            link: `/communities/${community._id}`,
            previewText: community.name,
            previewImage: community.avatar
        });
        await notification.save();

        const populatedNotification = await Notification.findById(notification._id).populate('lastSender', 'username fullName avatar');
        req.broadcastToUsers([targetUserId.toString()], { type: 'NEW_NOTIFICATION', payload: populatedNotification });

        res.status(200).json({ message: 'Приглашение отправлено.' });

    } catch (error) {
        console.error("Error sending community invite:", error);
        res.status(500).json({ message: 'Ошибка на сервере.' });
    }
});

router.post('/invites/accept', authMiddleware, async (req, res) => {
    try {
        const { notificationId } = req.body;
        const userId = req.user.userId;

        const notification = await Notification.findById(notificationId);
        if (!notification || notification.type !== 'community_invite' || notification.recipient.toString() !== userId) {
            return res.status(404).json({ message: "Приглашение не найдено или недействительно." });
        }

        const community = await Community.findById(notification.entityId);
        if (!community) return res.status(404).json({ message: "Сообщество не найдено." });

        community.members.addToSet(userId);
        await community.save();
        await User.findByIdAndUpdate(userId, { $addToSet: { subscribedCommunities: community._id } });

        const inviterId = notification.senders[0];
        const acceptedNotification = new Notification({
            recipient: inviterId,
            senders: [userId],
            lastSender: userId,
            type: 'community_invite_accepted',
            entityId: community._id,
            link: `/communities/${community._id}`,
            previewText: community.name,
            previewImage: community.avatar
        });
        await acceptedNotification.save();
        const populatedAccepted = await Notification.findById(acceptedNotification._id).populate('lastSender', 'username fullName avatar');
        req.broadcastToUsers([inviterId.toString()], { type: 'NEW_NOTIFICATION', payload: populatedAccepted });
        
        await Notification.findByIdAndDelete(notificationId);
        req.broadcastToUsers([userId.toString()], { type: 'NEW_NOTIFICATION' });

    
        res.status(200).json({ message: 'Вы вступили в сообщество.' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка на сервере.' });
    }
});

router.post('/invites/decline', authMiddleware, async (req, res) => {
    try {
        const { notificationId } = req.body;
        const userId = req.user.userId;

        const notification = await Notification.findById(notificationId);
        if (!notification || notification.type !== 'community_invite' || notification.recipient.toString() !== userId) {
            return res.status(404).json({ message: "Приглашение не найдено или недействительно." });
        }
        
        const community = await Community.findById(notification.entityId);
        const inviterId = notification.senders[0];

        if (community) {
             const declinedNotification = new Notification({
                recipient: inviterId,
                senders: [userId],
                lastSender: userId,
                type: 'community_invite_declined',
                entityId: community._id,
                link: `/profile/${userId}`,
                previewText: community.name,
                previewImage: community.avatar
            });
            await declinedNotification.save();
            const populatedDeclined = await Notification.findById(declinedNotification._id).populate('lastSender', 'username fullName avatar');
            req.broadcastToUsers([inviterId.toString()], { type: 'NEW_NOTIFICATION', payload: populatedDeclined });
        }

        await Notification.findByIdAndDelete(notificationId);
        req.broadcastToUsers([userId.toString()], { type: 'NEW_NOTIFICATION' });

        req.broadcastMessage({ type: 'COMMUNITY_UPDATED', payload: { communityId: community._id } });
        
        res.status(200).json({ message: 'Приглашение отклонено.' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка на сервере.' });
    }
});

router.post('/:communityId/invite', authMiddleware, canManageCommunity, async (req, res) => {
    try {
        const { targetUserId } = req.body;
        const community = req.community;
        const inviterId = req.user.userId;

        const targetUser = await User.findById(targetUserId).select('privacySettings friends');
        if (!targetUser) return res.status(404).json({ message: "Пользователь для приглашения не найден." });

        if (!isAllowedByPrivacy(targetUser.privacySettings?.inviteToCommunity, inviterId, targetUser)) {
            return res.status(403).json({ message: "Пользователь ограничил круг лиц, которые могут приглашать его в сообщества." });
        }

        if (community.members.includes(targetUserId)) return res.status(400).json({ message: "Пользователь уже является участником." });
        if (community.bannedUsers.includes(targetUserId)) return res.status(400).json({ message: "Пользователь заблокирован в этом сообществе." });
        if (community.pendingJoinRequests.includes(targetUserId)) return res.status(400).json({ message: "У пользователя уже есть активная заявка на вступление." });

        const notification = new Notification({
            recipient: targetUserId,
            senders: [inviterId],
            lastSender: inviterId,
            type: 'community_invite',
            entityId: community._id,
            link: `/communities/${community._id}`,
            previewText: community.name,
            previewImage: community.avatar
        });
        await notification.save();

        const populatedNotification = await Notification.findById(notification._id).populate('lastSender', 'username fullName avatar');
        req.broadcastToUsers([targetUserId.toString()], { type: 'NEW_NOTIFICATION', payload: populatedNotification });

        res.status(200).json({ message: 'Приглашение отправлено.' });

    } catch (error) {
        console.error("Error sending community invite:", error);
        res.status(500).json({ message: 'Ошибка на сервере.' });
    }
});

router.post('/invites/accept', authMiddleware, async (req, res) => {
    try {
        const { notificationId } = req.body;
        const userId = req.user.userId;

        const notification = await Notification.findById(notificationId);
        if (!notification || notification.type !== 'community_invite' || notification.recipient.toString() !== userId) {
            return res.status(404).json({ message: "Приглашение не найдено или недействительно." });
        }

        const community = await Community.findById(notification.entityId);
        if (!community) return res.status(404).json({ message: "Сообщество не найдено." });

        community.members.addToSet(userId);
        await community.save();
        await User.findByIdAndUpdate(userId, { $addToSet: { subscribedCommunities: community._id } });

        const inviterId = notification.senders[0];
        const acceptedNotification = new Notification({
            recipient: inviterId,
            senders: [userId],
            lastSender: userId,
            type: 'community_invite_accepted',
            entityId: community._id,
            link: `/communities/${community._id}`,
            previewText: community.name,
            previewImage: community.avatar
        });
        await acceptedNotification.save();
        const populatedAccepted = await Notification.findById(acceptedNotification._id).populate('lastSender', 'username fullName avatar');
        req.broadcastToUsers([inviterId.toString()], { type: 'NEW_NOTIFICATION', payload: populatedAccepted });
        
        await Notification.findByIdAndDelete(notificationId);
        req.broadcastToUsers([userId.toString()], { type: 'NEW_NOTIFICATION' });
    
        res.status(200).json({ message: 'Вы вступили в сообщество.' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка на сервере.' });
    }
});

router.post('/invites/decline', authMiddleware, async (req, res) => {
    try {
        const { notificationId } = req.body;
        const userId = req.user.userId;

        const notification = await Notification.findById(notificationId);
        if (!notification || notification.type !== 'community_invite' || notification.recipient.toString() !== userId) {
            return res.status(404).json({ message: "Приглашение не найдено или недействительно." });
        }
        
        const community = await Community.findById(notification.entityId);
        const inviterId = notification.senders[0];

        if (community) {
             const declinedNotification = new Notification({
                recipient: inviterId,
                senders: [userId],
                lastSender: userId,
                type: 'community_invite_declined',
                entityId: community._id,
                link: `/profile/${userId}`,
                previewText: community.name,
                previewImage: community.avatar
            });
            await declinedNotification.save();
            const populatedDeclined = await Notification.findById(declinedNotification._id).populate('lastSender', 'username fullName avatar');
            req.broadcastToUsers([inviterId.toString()], { type: 'NEW_NOTIFICATION', payload: populatedDeclined });
        }

        await Notification.findByIdAndDelete(notificationId);
        req.broadcastToUsers([userId.toString()], { type: 'NEW_NOTIFICATION' });

        req.broadcastMessage({ type: 'COMMUNITY_UPDATED', payload: { communityId: community._id } });
        
        res.status(200).json({ message: 'Приглашение отклонено.' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка на сервере.' });
    }
});

module.exports = router;