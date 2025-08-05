// backend/routes/user/public.js
const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const Post = require('../../models/Post');
const Community = require('../../models/Community');
const authMiddleware = require('../../middleware/auth.middleware');
const ProfileVisit = require('../../models/ProfileVisit');
const { isAllowedByPrivacy } = require('../../utils/privacy');
const Playlist = require('../../models/Playlist');
const mongoose = require('mongoose');

// --- НАЧАЛО ИЗМЕНЕНИЯ: Копируем хелпер-функцию сюда ---
function populateActiveAccent(userObject) {
    if (!userObject || !userObject.premiumCustomization || !userObject.premiumCustomization.activeCardAccent) {
        return userObject;
    }

    const customAccents = userObject.premiumCustomization.customCardAccents || [];
    const activeAccentValue = userObject.premiumCustomization.activeCardAccent;

    if (typeof activeAccentValue === 'object' && activeAccentValue !== null) {
        return userObject;
    }
    
    const activeAccentId = activeAccentValue.toString();
    const activeCustomAccent = customAccents.find(accent => accent._id.toString() === activeAccentId);

    if (activeCustomAccent) {
        userObject.premiumCustomization.activeCardAccent = activeCustomAccent;
    }
    
    return userObject;
}
// --- КОНЕЦ ИЗМЕНЕНИЯ ---


router.get('/search', authMiddleware, async (req, res) => {
    try {
        const { q: query, city, interests: interestsQuery } = req.query;

        if (!query && !city && !interestsQuery) {
            return res.json([]);
        }

        const currentUser = await User.findById(req.user.userId).select('friends friendRequestsSent friendRequestsReceived blacklist');
        if (!currentUser) return res.status(401).json({ message: "Пользователь не найден" });

        const interests = interestsQuery ? interestsQuery.split(',').filter(Boolean) : [];
        const currentUserId = new mongoose.Types.ObjectId(req.user.userId);

        let pipeline = [];
        
        const initialMatch = { _id: { $ne: currentUserId } };
        if (query) {
            initialMatch.$or = [
                { username: { $regex: query, $options: 'i' } },
                { fullName: { $regex: query, $options: 'i' } }
            ];
        }
        pipeline.push({ $match: initialMatch });

        pipeline.push({
            $addFields: {
                interestMatchCount: interests.length > 0 ? {
                    $size: { $ifNull: [{ $setIntersection: ["$interests", interests] }, []] }
                } : 0
            }
        });

        const filterMatch = {};
        if (city) {
            filterMatch.city = city;
        }
        if (interests.length > 0) {
            filterMatch.interests = { $in: interests };
        }
        if (Object.keys(filterMatch).length > 0) {
            pipeline.push({ $match: filterMatch });
        }

        pipeline.push({
            $sort: {
                interestMatchCount: -1,
                username: 1
            }
        });

        pipeline.push({ $limit: 20 });
        
        pipeline.push({
             $project: {
                username: 1, fullName: 1, avatar: 1, privacySettings: 1,
                friends: 1, blacklist: 1, city: 1, status: 1, lastSeen: 1 
            }
        });
        const users = await User.aggregate(pipeline);
        const resultsWithStatus = users.map(user => {
            let status = 'none';
            let finalUser = { ...user };
            const userBlacklistIds = (user.blacklist || []).map(id => id.toString());
            const currentUserBlacklistIds = (currentUser.blacklist || []).map(id => id.toString());
            const currentUserFriendsIds = (currentUser.friends || []).map(f => f.user.toString());
            const currentUserRequestsSentIds = (currentUser.friendRequestsSent || []).map(id => id.toString());
            const currentUserRequestsReceivedIds = (currentUser.friendRequestsReceived || []).map(id => id.toString());       
            const targetUserIdString = user._id.toString();
            if (userBlacklistIds.includes(req.user.userId.toString())) status = 'blocked_by_them';
            else if (currentUserBlacklistIds.includes(targetUserIdString)) status = 'blocked';
            else if (currentUserFriendsIds.includes(targetUserIdString)) status = 'friend';
            else if (currentUserRequestsSentIds.includes(targetUserIdString)) status = 'outgoing';
            else if (currentUserRequestsReceivedIds.includes(targetUserIdString)) status = 'incoming';
            if (status === 'blocked_by_them' || !isAllowedByPrivacy(user.privacySettings?.viewAvatar, req.user.userId, user)) {
                finalUser.avatar = null;
            }
            delete finalUser.blacklist;
            delete finalUser.friends;
            finalUser.status = status;
            return finalUser;
        });

        res.json(resultsWithStatus);
    } catch (e) {
        console.error("Search error:", e);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

router.get('/:userId/stats', authMiddleware, async (req, res) => {
    try {
        const { userId } = req.params;
        const requesterId = req.user.userId;
        const targetUser = await User.findById(userId).select('username fullName dob gender interests blacklist lastSeen createdAt avatar privacySettings friends email subscribedCommunities country city status');
        if (!targetUser) return res.status(404).json({ message: 'Пользователь не найден' });
        
        const isOwner = targetUser._id.toString() === requesterId.toString();

        const friendsCount = (targetUser.friends || []).filter(friendship => 
            friendship.user && friendship.user.toString() !== targetUser._id.toString()
        ).length;

        if (isOwner) {
            const posts = await Post.find({ user: userId, community: null, status: 'published' }).select('likes');
            return res.json({
                posts: posts.length,
                friends: friendsCount, 
                subscribers: targetUser.friendRequestsReceived ? targetUser.friendRequestsReceived.length : 0,
                likes: posts.reduce((sum, post) => sum + post.likes.length, 0),
                subscribedCommunities: targetUser.subscribedCommunities.length,
            });
        }
        
        const targetUserBlacklistIds = (targetUser.blacklist || []).map(id => id.toString());
        if (targetUserBlacklistIds.includes(requesterId.toString())) {
            return res.status(403).json({ message: 'Вы заблокированы этим пользователем, статистика недоступна.' });
        }
        
        const canViewPosts = isAllowedByPrivacy(targetUser.privacySettings?.viewPosts, requesterId, targetUser);
        let postCount = 0;
        let totalLikes = 0;
        
        if (canViewPosts) {
            const posts = await Post.find({ user: userId, community: null, status: 'published' }).select('likes');
            postCount = posts.length;
            totalLikes = posts.reduce((sum, post) => sum + post.likes.length, 0);
        }

        res.json({
            posts: postCount,
            friends: friendsCount, 
            subscribers: targetUser.friendRequestsReceived ? targetUser.friendRequestsReceived.length : 0,
            likes: totalLikes,
            subscribedCommunities: targetUser.subscribedCommunities.length,
        });
    } catch (e) {
        res.status(500).json({ message: 'Ошибка при получении статистики' });
    }
});

router.get('/:userId/friends-list', authMiddleware, async (req, res) => {
    try {
        const targetUserId = req.params.userId;
        const requesterId = req.user.userId;
        const targetUser = await User.findById(targetUserId).select('friends privacySettings blacklist');
        if (!targetUser) return res.status(404).json({ message: 'Пользователь не найден.' });
        const targetUserBlacklistIds = (targetUser.blacklist || []).map(id => id.toString());
        if (targetUserBlacklistIds.includes(requesterId.toString())) {
            return res.status(403).json({ message: 'Вы заблокированы этим пользователем, список друзей недоступен.' });
        }
        if (!isAllowedByPrivacy(targetUser.privacySettings?.viewFriends, requesterId, targetUser)) {
            return res.status(403).json({ message: 'Доступ к списку друзей ограничен настройками приватности.' });
        }
        const friendsData = await User.findById(targetUserId)
            // --- ИЗМЕНЕНИЕ ЗДЕСЬ ---
            .populate({ path: 'friends.user', select: 'username fullName avatar premium premiumCustomization' })
            .select('friends');
        if (!friendsData) return res.status(404).json({ message: 'Пользователь не найден.' });
        res.json(friendsData.friends.map(f => f.user).filter(Boolean));
    } catch (e) {
        res.status(500).json({ message: 'Ошибка сервера при получении списка друзей.' });
    }
});

router.get('/:userId/subscribers-list', authMiddleware, async (req, res) => {
    try {
        const targetUserId = req.params.userId;
        const requesterId = req.user.userId;
        const targetUser = await User.findById(targetUserId).select('friendRequestsReceived friends privacySettings blacklist');
        if (!targetUser) return res.status(404).json({ message: 'Пользователь не найден.' });
        const targetUserBlacklistIds = (targetUser.blacklist || []).map(id => id.toString());
        if (targetUserBlacklistIds.includes(requesterId.toString())) {
            return res.status(403).json({ message: 'Вы заблокированы этим пользователем, список подписчиков недоступен.' });
        }
        if (!isAllowedByPrivacy(targetUser.privacySettings?.viewSubscribers, requesterId, targetUser)) {
            return res.status(403).json({ message: 'Доступ к списку подписчиков ограничен настройками приватности.' });
        }
        const subscribersData = await User.findById(targetUserId)
            // --- ИЗМЕНЕНИЕ ЗДЕСЬ ---
            .populate('friendRequestsReceived', 'username fullName avatar premium premiumCustomization')
            .select('friendRequestsReceived');
        if (!subscribersData) return res.status(404).json({ message: 'Пользователь не найден.' });
        res.json(subscribersData.friendRequestsReceived);
    } catch (e) {
        res.status(500).json({ message: 'Ошибка сервера при получении списка подписчиков.' });
    }
});


router.get('/:userId/communities-list', authMiddleware, async (req, res) => {
    try {
        const targetUserId = req.params.userId;
        const requesterId = req.user.userId;
        const targetUser = await User.findById(targetUserId).select('subscribedCommunities privacySettings blacklist');
        if (!targetUser) return res.status(404).json({ message: 'Пользователь не найден.' });
        const targetUserBlacklistIds = (targetUser.blacklist || []).map(id => id.toString());
        if (targetUserBlacklistIds.includes(requesterId.toString())) {
            return res.status(403).json({ message: 'Вы заблокированы этим пользователем, список сообществ недоступен.' });
        }
        if (!isAllowedByPrivacy(targetUser.privacySettings?.viewSubscribedCommunities, requesterId, targetUser)) {
            return res.status(403).json({ message: 'Доступ к списку сообществ ограничен настройками приватности.' });
        }
        const communitiesData = await User.findById(targetUserId).populate('subscribedCommunities', 'name avatar description').select('subscribedCommunities');
        if (!communitiesData) return res.status(404).json({ message: 'Пользователь не найден.' });
        res.json(communitiesData.subscribedCommunities);
    } catch (e) {
        res.status(500).json({ message: 'Ошибка сервера при получении списка сообществ.' });
    }
});

router.get('/:userId', authMiddleware, async (req, res) => {
    try {
        const { userId } = req.params;
        const requesterId = req.user.userId;
        const targetUser = await User.findById(userId).select('username fullName dob gender interests blacklist lastSeen createdAt avatar privacySettings friends email subscribedCommunities country city status premium premiumCustomization');
        const requester = await User.findById(requesterId).select('blacklist friends friendRequestsSent friendRequestsReceived');
        if (!targetUser) return res.status(404).json({ message: 'Пользователь не найден' });
        if (targetUser._id.toString() === requesterId.toString()) {
            let userToSend = targetUser.toObject();
            delete userToSend.blacklist;
            delete userToSend.friends;
            userToSend = populateActiveAccent(userToSend);
            return res.json({ user: userToSend, friendshipStatus: 'self', isBlockedByThem: false, mutualFriendsCount: 0 });
        }
        
        const requesterFriendIds = new Set((requester.friends || []).filter(f => f && f.user).map(f => f.user.toString()));
        const targetFriendIds = (targetUser.friends || []).filter(f => f && f.user).map(f => f.user.toString());
        const mutualFriendsCount = targetFriendIds.filter(id => requesterFriendIds.has(id)).length;
        
        const targetUserBlacklistIds = (targetUser.blacklist || []).map(id => id.toString());
        const requesterBlacklistIds = (requester.blacklist || []).map(id => id.toString());
        const requesterFriendsIds = (requester.friends || []).map(f => f.user.toString());
        const targetUserIdString = userId.toString();
        const isRequesterBlockedByTarget = targetUserBlacklistIds.includes(requesterId.toString());
        const isRequesterBlockingTarget = requesterBlacklistIds.includes(targetUserIdString);
        if (isRequesterBlockedByTarget) {
            return res.json({ isBlockedByThem: true, user: { _id: targetUser._id, username: targetUser.username, fullName: targetUser.fullName, avatar: null }, friendshipStatus: 'blocked_by_them', mutualFriendsCount: 0 });
        }
        let friendshipStatus = 'none';
        if (isRequesterBlockingTarget) friendshipStatus = 'blocked';
        else if (requesterFriendsIds.includes(targetUserIdString)) friendshipStatus = 'friend';
        else if ((requester.friendRequestsSent || []).map(id => id.toString()).includes(targetUserIdString)) friendshipStatus = 'outgoing';
        else if ((requester.friendRequestsReceived || []).map(id => id.toString()).includes(targetUserIdString)) friendshipStatus = 'incoming';
        
        let userToSend = targetUser.toObject();
        delete userToSend.blacklist;
        delete userToSend.friends;
        if (!isAllowedByPrivacy(userToSend.privacySettings?.viewAvatar, requesterId, targetUser)) userToSend.avatar = null;
        if (!isAllowedByPrivacy(userToSend.privacySettings?.viewDOB, requesterId, targetUser)) userToSend.dob = null;
        else if (userToSend.privacySettings?.hideDOBYear && userToSend.dob) {
            const dobDate = new Date(userToSend.dob);
            userToSend.dob = new Date(1970, dobDate.getMonth(), dobDate.getDate());
        }
        if (!isAllowedByPrivacy(userToSend.privacySettings?.viewEmail, requesterId, targetUser)) userToSend.email = 'Скрыт';
        if (!isAllowedByPrivacy(userToSend.privacySettings?.viewInterests, requesterId, targetUser)) userToSend.interests = [];
        if (!isAllowedByPrivacy(userToSend.privacySettings?.viewSubscribedCommunities, requesterId, targetUser)) delete userToSend.subscribedCommunities;
        if (!isAllowedByPrivacy(userToSend.privacySettings?.viewLocation, requesterId, targetUser)) {
            userToSend.country = null;
            userToSend.city = null;
        }
        
        // --- НАЧАЛО ИЗМЕНЕНИЯ: Применяем хелпер-функцию ---
        userToSend = populateActiveAccent(userToSend);
        // --- КОНЕЦ ИЗМЕНЕНИЯ ---
        
        res.json({ user: userToSend, friendshipStatus, isBlockedByThem: false, mutualFriendsCount });

    } catch(e) {
        console.error('Error fetching user profile:', e);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

router.get('/:userId/mutual-friends', authMiddleware, async (req, res) => {
    try {
        const targetUserId = req.params.userId;
        const requesterId = req.user.userId;

        if (targetUserId === requesterId) {
            return res.json([]);
        }

        const [requester, targetUser] = await Promise.all([
            User.findById(requesterId).select('friends').lean(),
            User.findById(targetUserId).select('friends').lean()
        ]);

        if (!requester || !targetUser) {
            return res.status(404).json({ message: "Один из пользователей не найден." });
        }

        const requesterFriendIds = new Set((requester.friends || []).map(f => f.user.toString()));
        const targetFriendIds = (targetUser.friends || []).map(f => f.user.toString());

        const mutualFriendIds = targetFriendIds.filter(id => requesterFriendIds.has(id));
        
        if (mutualFriendIds.length === 0) {
            return res.json([]);
        }

        const mutualFriends = await User.find({ _id: { $in: mutualFriendIds } })
            .select('username fullName avatar')
            .lean();

        res.json(mutualFriends);

    } catch (error) {
        console.error("Ошибка при получении общих друзей:", error);
        res.status(500).json({ message: 'Ошибка сервера при получении общих друзей.' });
    }
});

router.post('/:userId/visit', authMiddleware, async (req, res) => {
    try {
        const { userId: visitedId } = req.params;
        const visitorId = req.user.userId;

        if (visitorId.toString() === visitedId) {
            return res.status(200).json({ message: 'Self-visit ignored.' });
        }
        
        const visit = new ProfileVisit({ visitor: visitorId, visited: visitedId });
        await visit.save();

        res.status(201).json({ message: 'Visit logged.' });
    } catch (error) {
        console.error("Error logging profile visit:", error);
        res.status(200).json({ message: 'Visit logging failed silently.' });
    }
});

router.get('/:userId/mutual-subscribers', authMiddleware, async (req, res) => {
    try {
        const targetUserId = req.params.userId;
        const requesterId = req.user.userId;

        const [requester, targetUser] = await Promise.all([
            User.findById(requesterId).select('friends').lean(),
            User.findById(targetUserId).select('friendRequestsReceived').lean()
        ]);

        if (!requester || !targetUser) return res.status(404).json({ message: "Один из пользователей не найден." });

        const requesterFriendIds = new Set((requester.friends || []).map(f => f.user.toString()));
        const targetSubscriberIds = (targetUser.friendRequestsReceived || []).map(id => id.toString());

        const mutualSubscriberIds = targetSubscriberIds.filter(id => requesterFriendIds.has(id));

        if (mutualSubscriberIds.length === 0) return res.json([]);

        const mutualSubscribers = await User.find({ _id: { $in: mutualSubscriberIds } })
            .select('username fullName avatar')
            .lean();

        res.json(mutualSubscribers);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера при получении общих подписчиков.' });
    }
});

router.get('/:userId/mutual-communities', authMiddleware, async (req, res) => {
    try {
        const targetUserId = req.params.userId;
        const requesterId = req.user.userId;

        const [requester, targetUser] = await Promise.all([
            User.findById(requesterId).select('subscribedCommunities').lean(),
            User.findById(targetUserId).select('subscribedCommunities').lean()
        ]);

        if (!requester || !targetUser) return res.status(404).json({ message: "Один из пользователей не найден." });

        const requesterCommunityIds = new Set((requester.subscribedCommunities || []).map(id => id.toString()));
        const targetCommunityIds = (targetUser.subscribedCommunities || []).map(id => id.toString());
        
        const mutualCommunityIds = targetCommunityIds.filter(id => requesterCommunityIds.has(id));

        if (mutualCommunityIds.length === 0) return res.json([]);

        const mutualCommunities = await Community.find({ _id: { $in: mutualCommunityIds } })
            .select('name avatar')
            .lean();

        res.json(mutualCommunities);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера при получении общих сообществ.' });
    }
});

// --- НОВЫЙ РОУТ ---
router.get('/:userId/playlists', authMiddleware, async (req, res) => {
    try {
        const { userId } = req.params;
        const requesterId = req.user.userId;

        const isOwner = userId === requesterId;
        
        let query;
        if (isOwner) {
            // Владелец видит все свои плейлисты
            query = { user: userId };
        } else {
            // Другие видят только публичные и "не в поиске"
            query = { user: userId, visibility: { $in: ['public', 'unlisted'] } };
        }
        
        const playlists = await Playlist.find(query)
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();
            
        res.json(playlists);

    } catch (error) {
        console.error("Ошибка при получении плейлистов пользователя:", error);
        res.status(500).json({ message: "Ошибка сервера" });
    }
});

module.exports = router;