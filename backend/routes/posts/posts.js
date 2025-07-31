// backend/routes/posts/posts.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middleware/auth.middleware');
const Post = require('../../models/Post'); 
const Comment = require('../../models/Comment'); 
const User = require('../../models/User'); 
const Notification = require('../../models/Notification'); 
const Community = require('../../models/Community'); 
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getPopulatedPost } = require('../../utils/posts');
const { isAllowedByPrivacy } = require('../../utils/privacy');

const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'image/webp') {
        cb(null, true);
    } else {
        cb(new Error('Недопустимый тип файла, разрешены только JPEG, PNG, WEBP'), false);
    }
};

const postStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '..', '..', 'uploads', 'posts');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, `${req.user.userId}-post-${Date.now()}${path.extname(file.originalname)}`);
    }
});
const uploadPost = multer({ storage: postStorage, fileFilter: fileFilter, limits: { files: 5 } });

router.get('/feed', authMiddleware, async (req, res) => {
    try {
        const currentUser = await User.findById(req.user.userId).select('friends blacklist subscribedCommunities');
        const friendIds = currentUser.friends.map(friend => friend._id);
        const subscribedCommunityIds = currentUser.subscribedCommunities;
        const posts = await Post.find({
            status: 'published',
            $or: [
                { user: { $in: [...friendIds, req.user.userId] }, community: null },
                { community: { $in: subscribedCommunityIds } }
            ]
        })  
            .populate('user', 'username fullName avatar privacySettings friends blacklist premiumCustomization')
            .populate('likes', 'username fullName avatar _id')
            .populate('community', 'name avatar visibility members')
            .populate('attachedTrack')
            .populate({ path: 'poll.options.votes', select: 'username fullName avatar' })
            .sort({ createdAt: -1 })
            .limit(40)
            .lean();

        let combinedPosts = [];
        for (const post of posts) {
            const postObject = post;
            if (postObject.community) {
                const isMember = postObject.community.members.some(memberId => memberId.equals(req.user.userId));
                if (postObject.community.visibility === 'public' || isMember) {
                    // Post is visible
                } else {
                    continue; 
                }
                delete postObject.community.members;
                delete postObject.community.visibility;
            }

            const postOwner = postObject.user;
            delete postObject.isPinned;
            
            if (!postOwner) {
                combinedPosts.push(postObject);
                continue;
            }

            if (postOwner._id.toString() === req.user.userId.toString()) {
                delete postObject.user.privacySettings;
                delete postObject.user.friends;
                delete postObject.user.blacklist;
                combinedPosts.push(postObject);
                continue;
            }            

            const isRequesterBlocked = (postOwner.blacklist || []).map(id => id.toString()).includes(req.user.userId.toString());
            const isRequesterBlocking = (currentUser.blacklist || []).map(id => id.toString()).includes(postOwner._id.toString());
            
            if (isRequesterBlocked || isRequesterBlocking) {
                postObject.user = { _id: postOwner._id, username: 'Заблокированный пользователь', fullName: null, avatar: null };
                postObject.text = 'Контент скрыт'; 
                postObject.imageUrls = []; 
                postObject.likes = []; 
                postObject.commentsDisabled = true; 
            } else {
                if (!isAllowedByPrivacy(postOwner.privacySettings?.viewAvatar, req.user.userId, postOwner)) {
                    postObject.user.avatar = null;
                }
            }
            delete postObject.user.privacySettings;
            delete postObject.user.friends;
            delete postObject.user.blacklist;
            combinedPosts.push(postObject);
        }
        res.json(combinedPosts.slice(0, 20));
    } catch(e) {
        res.status(500).json({ message: "Ошибка загрузки ленты" });
    }
});

router.post('/', authMiddleware, uploadPost.array('images', 5), async (req, res) => {
    try {
        const { text, commentsDisabled, communityId, attachedTrackId, poll: pollJson, scheduledFor } = req.body;
        const imageUrls = req.files ? req.files.map(file => `uploads/posts/${file.filename}`) : [];
        
        let pollData = null;
        if (pollJson) {
            try {
                pollData = JSON.parse(pollJson);
                if (!pollData.question || !Array.isArray(pollData.options) || pollData.options.length < 2) {
                    throw new Error('Некорректные данные для опроса.');
                }
            } catch (e) {
                return res.status(400).json({ message: 'Ошибка в формате данных опроса.' });
            }
        }

        if (!text && imageUrls.length === 0 && !attachedTrackId && !pollData) {
            return res.status(400).json({ message: 'Пост не может быть пустым' });
        }

        let community = null;
        if (communityId) {
            community = await Community.findById(communityId);
            if (!community) return res.status(404).json({ message: 'Сообщество не найдено.' });
            if (!community.members.includes(req.user.userId)) return res.status(403).json({ message: 'Вы не являетесь участником этого сообщества.' });
            if (community.postingPolicy === 'admin_only' && community.owner.toString() !== req.user.userId) {
                return res.status(403).json({ message: 'Публиковать посты в этом сообществе может только администратор.' });
            }
        }
        
        const postStatus = scheduledFor ? 'scheduled' : 'published';

        const newPost = new Post({
            user: req.user.userId,
            text,
            imageUrls,
            commentsDisabled: commentsDisabled === 'true',
            community: communityId || null,
            attachedTrack: attachedTrackId || null,
            poll: pollData,
            status: postStatus,
            scheduledFor: scheduledFor || null
        });
        await newPost.save();

        if (community) {
            community.posts.push(newPost._id);
            await community.save();
        }

        if (postStatus === 'published') {
            const populatedPost = await getPopulatedPost(newPost._id, req.user.userId);
            req.broadcastMessage({ type: 'POST_UPDATED', payload: { postId: newPost._id, fullPost: populatedPost } });
            req.broadcastMessage({ type: 'USER_DATA_UPDATED', userId: req.user.userId });        
        }
        
        res.status(201).json(await getPopulatedPost(newPost._id, req.user.userId));
    } catch (e) {
        if (req.files) req.files.forEach(file => fs.unlink(file.path, (err) => { if (err) console.error("Error deleting file:", err); }));
        res.status(500).json({ message: 'Ошибка создания поста' });
    }
});

router.put('/:postId', authMiddleware, uploadPost.array('images', 5), async (req, res) => {
    try {
        let { text, existingImages, scheduledFor } = req.body; // --- ИЗМЕНЕНИЕ: Получаем scheduledFor
        const post = await Post.findById(req.params.postId);
        if (!post) return res.status(404).json({ message: 'Пост не найден' });
        if (post.user.toString() !== req.user.userId) return res.status(403).json({ message: 'Нет прав на редактирование' });       
        let finalExistingImages = Array.isArray(existingImages) ? existingImages : [existingImages].filter(Boolean);
        const imagesToDelete = post.imageUrls.filter(url => !finalExistingImages.includes(url));
        imagesToDelete.forEach(imageUrl => {
            const imagePath = path.join(__dirname, '..', '..', imageUrl);
            if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
        });  
        const newImageUrls = req.files ? req.files.map(file => `uploads/posts/${file.filename}`) : [];   
        post.text = text;
        post.imageUrls = [...finalExistingImages, ...newImageUrls];

        // --- НАЧАЛО ИЗМЕНЕНИЯ: Логика обновления отложенного поста ---
        if (scheduledFor !== undefined) { // Проверяем, было ли поле вообще отправлено
            if (scheduledFor) { // Если есть дата, значит это все еще отложенный пост
                const scheduleDate = new Date(scheduledFor);
                // Проверяем, что дата в будущем, чтобы случайно не опубликовать
                if (scheduleDate > new Date()) {
                    post.scheduledFor = scheduleDate;
                    post.status = 'scheduled';
                } else {
                    // Если дата в прошлом - публикуем немедленно
                    post.scheduledFor = null;
                    post.status = 'published';
                }
            } else { // Если дата пустая (null или ''), значит публикуем сейчас
                post.scheduledFor = null;
                post.status = 'published';
            }
        }
        // --- КОНЕЦ ИЗМЕНЕНИЯ ---

        await post.save();  
        const populatedPost = await getPopulatedPost(post._id, req.user.userId);
        req.broadcastMessage({ type: 'POST_UPDATED', payload: { postId: post._id, fullPost: populatedPost } });
        res.json({ message: 'Пост обновлен' });
    } catch(e) {
        res.status(500).json({ message: 'Ошибка обновления поста' });
    }
});

router.get('/user/scheduled', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const posts = await Post.find({ user: userId, status: 'scheduled' })
            .populate('user', 'username fullName avatar premiumCustomization')
            .populate('community', 'name avatar')
            .populate('attachedTrack')
            .sort({ scheduledFor: 1 });
        res.json(posts);
    } catch (e) {
        console.error("Error fetching scheduled posts:", e);
        res.status(500).json({ message: 'Ошибка сервера при получении отложенных постов' });
    }
});

router.get('/user/:userId', authMiddleware, async (req, res) => {
    try {
        const targetUser = await User.findById(req.params.userId).select('privacySettings friends blacklist');
        if (!targetUser) return res.status(404).json({ message: 'Пользователь не найден' });
        if ((targetUser.blacklist || []).map(id => id.toString()).includes(req.user.userId.toString())) {
            return res.status(403).json({ message: 'Вы заблокированы этим пользователем, контент недоступен.' });
        }   
        if (!isAllowedByPrivacy(targetUser.privacySettings.viewPosts, req.user.userId, targetUser)) {
            return res.status(200).json([]);
        }
        const posts = await Post.find({ user: req.params.userId, community: null, status: 'published' })
            .populate('user', 'username fullName avatar premiumCustomization')
            .populate('likes', 'username fullName avatar _id')
            .populate('attachedTrack')
            .populate({ path: 'poll.options.votes', select: 'username fullName avatar' })
            .sort({ isPinned: -1, createdAt: -1 });
        res.json(posts);
    } catch (e) {
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

router.get('/:postId', authMiddleware, async (req, res) => {
    try {
        const postObject = await getPopulatedPost(req.params.postId, req.user.userId);
        if (!postObject) return res.status(404).json({ message: 'Пост не найден' });
        if (postObject.community && (postObject.community.isPrivate || postObject.community.isSecret)) {
            return res.status(403).json({ message: 'Вы не являетесь членом этого сообщества. Контент скрыт.' });
        }
        res.json(postObject);
    } catch (e) {
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

router.put('/:postId/pin', authMiddleware, async (req, res) => {
    try {
        const post = await Post.findById(req.params.postId);
        if (post.community) return res.status(400).json({ message: 'Посты сообществ нельзя закреплять.' });
        if (!post || post.user.toString() !== req.user.userId) return res.status(403).json({ message: 'Нет прав' });
        const newPinState = !post.isPinned;
        if (newPinState) await Post.updateMany({ user: req.user.userId, community: null, isPinned: true }, { $set: { isPinned: false } });
        post.isPinned = newPinState;
        await post.save();
        const populatedPost = await getPopulatedPost(post._id, req.user.userId);
        req.broadcastMessage({ type: 'POST_UPDATED', payload: { postId: post._id, fullPost: populatedPost } });
        res.json({ message: newPinState ? 'Пост закреплен' : 'Пост откреплен' });
    } catch (e) {
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

router.put('/:postId/toggle-comments', authMiddleware, async (req, res) => {
    try {
        const post = await Post.findById(req.params.postId);
        if (!post || post.user.toString() !== req.user.userId) return res.status(403).json({ message: 'Нет прав' });
        post.commentsDisabled = !post.commentsDisabled;
        await post.save();
        const populatedPost = await getPopulatedPost(post._id, req.user.userId);
        req.broadcastMessage({ type: 'POST_UPDATED', payload: { postId: post._id, fullPost: populatedPost } });
        res.json({ message: post.commentsDisabled ? 'Комментирование отключено' : 'Комментирование включено' });
    } catch (e) {
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

router.delete('/:postId', authMiddleware, async (req, res) => {
    try {
        const post = await Post.findById(req.params.postId);
        if (!post) return res.status(404).json({ message: 'Пост не найден' });
        if (post.user.toString() !== req.user.userId) return res.status(403).json({ message: 'Нет прав' });    
        if (post.imageUrls?.length > 0) {
            post.imageUrls.forEach(imageUrl => {
                if (imageUrl.includes('uploads')) {
                    const imagePath = path.join(__dirname, '..', '..', imageUrl);
                    if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
                }
            });
        }
        await Comment.deleteMany({ post: req.params.postId });
        await Post.findByIdAndDelete(req.params.postId);     
        if (post.community) await Community.findByIdAndUpdate(post.community, { $pull: { posts: post._id } });
        req.broadcastMessage({ type: 'POST_DELETED', postId: req.params.postId, userId: req.user.userId });
        req.broadcastMessage({ type: 'USER_DATA_UPDATED', userId: req.user.userId });
        res.json({ message: 'Пост успешно удален' });
    } catch (e) {
        res.status(500).json({ message: 'Ошибка сервера при удалении поста' });
    }
});

router.post('/:postId/like', authMiddleware, async (req, res) => {
    try {
        const post = await Post.findById(req.params.postId).populate('community', 'name members bannedUsers visibility');
        if (!post) return res.status(404).json({ message: 'Пост не найден' });
        const userId = req.user.userId;
        
        if (post.community) {
            const community = post.community;
            if (community.bannedUsers.includes(userId)) return res.status(403).json({ message: 'Вы заблокированы и не можете взаимодействовать с контентом.' });
            if (community.visibility !== 'public' && !community.members.includes(userId)) return res.status(403).json({ message: 'Вы должны быть участником, чтобы взаимодействовать с постами.' });
        }
        
        const alreadyLiked = post.likes.includes(userId);
        if (!alreadyLiked) post.likes.push(userId);
        else post.likes.pull(userId);
        await post.save();

        if (post.user.toString() !== req.user.userId) {
            const previewImage = post.imageUrls?.[0] || null;
            if (!alreadyLiked) {
                const existingNotification = await Notification.findOneAndUpdate(
                    { recipient: post.user, type: 'like_post', entityId: post._id },
                    { 
                        $addToSet: { senders: req.user.userId }, 
                        $set: { 
                            lastSender: req.user.userId, 
                            read: false, 
                            link: `/posts/${post._id}`, 
                            previewImage, 
                            previewText: post.text?.substring(0, 50) || null,
                            community: post.community ? { _id: post.community._id, name: post.community.name } : undefined
                        }, 
                        $setOnInsert: { createdAt: new Date() } 
                    },
                    { upsert: true, new: true }
                ).populate('lastSender', 'username fullName avatar');
                req.broadcastToUsers([post.user.toString()], { type: 'NEW_NOTIFICATION', payload: existingNotification });
            } else {
                await Notification.updateOne({ recipient: post.user, type: 'like_post', entityId: post._id }, { $pull: { senders: req.user.userId } });
                await Notification.deleteOne({ recipient: post.user, type: 'like_post', entityId: post._id, senders: { $size: 0 } });
                 req.broadcastToUsers([post.user.toString()], { type: 'NEW_NOTIFICATION' });
            }
        }       
        const populatedPost = await getPopulatedPost(req.params.postId, req.user.userId);
        req.broadcastMessage({ type: 'POST_UPDATED', payload: { postId: req.params.postId, fullPost: populatedPost } });
        req.broadcastMessage({ type: 'USER_DATA_UPDATED', userId: post.user });      
        res.json(post.likes);
    } catch (e) {
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

router.put('/:postId/image', authMiddleware, uploadPost.single('postImage'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'Файл не загружен' });
        const post = await Post.findById(req.params.postId);
        if (!post) return res.status(404).json({ message: 'Пост не найден' });
        if (post.user.toString() !== req.user.userId) return res.status(403).json({ message: 'Нет прав' });
        if (post.imageUrls?.length > 0) {
            const oldPath = path.join(__dirname, '..', '..', post.imageUrls[0]);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
        const newImageUrl = `uploads/posts/${req.file.filename}`;
        post.imageUrls = [newImageUrl];
        await post.save();
        const populatedPost = await getPopulatedPost(post._id, req.user.userId);
        req.broadcastMessage({ type: 'POST_UPDATED', payload: { postId: post._id, fullPost: populatedPost } });
        res.json({ message: 'Изображение обновлено', newImageUrl });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при обновлении изображения' });
    }
});

router.post('/:postId/poll/vote', authMiddleware, async (req, res) => {
    try {
        const { postId } = req.params;
        const { optionId } = req.body;
        const userId = req.user.userId;

        const post = await Post.findById(postId);
        if (!post || !post.poll) {
            return res.status(404).json({ message: 'Опрос не найден.' });
        }
        
        if (post.poll.expiresAt && new Date() > new Date(post.poll.expiresAt)) {
            return res.status(403).json({ message: 'Голосование в этом опросе завершено.' });
        }

        const votedOption = post.poll.options.id(optionId);
        if (!votedOption) {
            return res.status(404).json({ message: 'Вариант ответа не найден.' });
        }
        
        let userHasVotedForThisOption = votedOption.votes.includes(userId);

        post.poll.options.forEach(option => {
            option.votes.pull(userId);
        });

        if (!userHasVotedForThisOption) {
            votedOption.votes.push(userId);
        }

        await post.save();
        
        const populatedPost = await getPopulatedPost(postId, userId);
        req.broadcastMessage({ type: 'POST_UPDATED', payload: { postId, fullPost: populatedPost } });

        res.status(200).json(populatedPost.poll);

    } catch (error) {
        console.error('Ошибка голосования в опросе:', error);
        res.status(500).json({ message: 'Ошибка на сервере при голосовании.' });
    }
});

module.exports = router;