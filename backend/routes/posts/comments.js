// backend/routes/posts/comments.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middleware/auth.middleware');
const Post = require('../../models/Post');
const Comment = require('../../models/Comment');
const Notification = require('../../models/Notification');
const Community = require('../../models/Community');
const mongoose = require('mongoose');
const { getPopulatedPost } = require('../../utils/posts');
// --- ИЗМЕНЕНИЕ: Импортируем санитайзер ---
const { sanitize } = require('../../utils/sanitize');

async function getAllChildCommentIds(commentIds) {
    let allIds = [...commentIds];
    let currentIds = [...commentIds];
    while(currentIds.length > 0) {
        const children = await Comment.find({ parent: { $in: currentIds } }).select('_id');
        const childrenIds = children.map(c => c._id);
        if(childrenIds.length === 0) break;
        allIds.push(...childrenIds);
        currentIds = childrenIds;
    }
    return allIds;
}

router.post('/:postId/comments', authMiddleware, async (req, res) => {
    try {
        let { text, parentId, commentAs } = req.body;
        // --- ИЗМЕНЕНИЕ: Очищаем текст комментария ---
        const sanitizedText = sanitize(text);
        if (!sanitizedText) {
            return res.status(400).json({ message: 'Текст комментария не может быть пустым.' });
        }

        const post = await Post.findById(req.params.postId).populate('community', 'members bannedUsers postingPolicy owner visibility joinPolicy name');
        if (!post) return res.status(404).json({ message: 'Пост не найден' });
        if (post.commentsDisabled) return res.status(403).json({ message: 'Комментарии к этому посту отключены' });
        
        if (post.community) {
            const community = post.community;
            const userId = req.user.userId;

            if (community.bannedUsers.includes(userId)) return res.status(403).json({ message: 'Вы заблокированы в этом сообществе.' });
            const isMember = community.members.includes(userId);
            if (community.visibility !== 'public' && !isMember) return res.status(403).json({ message: 'Вы должны быть участником, чтобы комментировать посты.' });
            
            if (community.postingPolicy === 'admin_only') {
                const isOwner = community.owner.toString() === userId;
                const isCommentingAsCommunity = commentAs && commentAs === community._id.toString();

                if (!isOwner && !isCommentingAsCommunity) {
                    return res.status(403).json({ message: 'Комментировать в этом сообществе может только администратор.' });
                }
            }
        }

        let finalParentId = parentId ? new mongoose.Types.ObjectId(parentId) : null;
        if (parentId) {
            const parentComment = await Comment.findById(parentId).select('parent');
            if (parentComment?.parent) finalParentId = parentComment.parent;
        }
        let authorId = req.user.userId, authorModel = 'User';
        if (commentAs) {
            const communityToCommentAs = await Community.findById(commentAs);
            if (!communityToCommentAs || communityToCommentAs.owner.toString() !== req.user.userId) {
                return res.status(403).json({ message: 'Вы не можете комментировать от имени этого сообщества.' });
            }
            authorId = communityToCommentAs._id;
            authorModel = 'Community';
        }
        
        // --- ИЗМЕНЕНИЕ: Используем очищенный текст ---
        const newComment = new Comment({ text: sanitizedText, post: req.params.postId, parent: finalParentId, author: authorId, authorModel });
        await newComment.save();
        
        if (finalParentId) await Comment.findByIdAndUpdate(finalParentId, { $push: { children: newComment._id } });
        else {
            post.comments.push(newComment._id);
            await post.save();
        }
        
        const postAuthorId = post.user.toString();
        const commenterId = req.user.userId;
        let parentCommentAuthorId = null;
        const previewImage = post.imageUrls?.[0] || null;

        if (finalParentId) {
            const parentComment = await Comment.findById(finalParentId).populate('author', 'owner');
            if (parentComment && parentComment.author) {
                let recipientId = null;
                if (parentComment.authorModel === 'Community') {
                    recipientId = parentComment.author.owner.toString();
                } else {
                    recipientId = parentComment.author._id.toString();
                }
                parentCommentAuthorId = recipientId;

                if (recipientId !== commenterId) {
                    const replyNotification = new Notification({
                        recipient: recipientId,
                        senders: [commenterId],
                        lastSender: commenterId,
                        type: 'reply_comment',
                        entityId: newComment._id,
                        link: `/posts/${post._id}`,
                        previewImage,
                        previewText: newComment.text?.substring(0, 50) || null,
                        community: post.community ? { _id: post.community._id, name: post.community.name } : undefined
                    });
                    await replyNotification.save();
                    const populatedReplyNotification = await Notification.findById(replyNotification._id).populate('lastSender', 'username fullName avatar');
                    req.broadcastToUsers([recipientId], { type: 'NEW_NOTIFICATION', payload: populatedReplyNotification });
                }
            }
        }

        if (postAuthorId !== commenterId && postAuthorId !== parentCommentAuthorId) {
            const commentNotification = new Notification({ 
                recipient: postAuthorId, 
                senders: [commenterId], 
                lastSender: commenterId, 
                type: 'new_comment', 
                entityId: newComment._id, 
                link: `/posts/${post._id}`, 
                previewImage, 
                previewText: newComment.text?.substring(0, 50) || null,
                community: post.community ? { _id: post.community._id, name: post.community.name } : undefined
            });
            await commentNotification.save();
            const populatedCommentNotification = await Notification.findById(commentNotification._id).populate('lastSender', 'username fullName avatar');
            req.broadcastToUsers([postAuthorId], { type: 'NEW_NOTIFICATION', payload: populatedCommentNotification });
        }
        
        const populatedPost = await getPopulatedPost(req.params.postId, req.user.userId);
        req.broadcastMessage({ type: 'POST_UPDATED', payload: { postId: req.params.postId, fullPost: populatedPost } });
        res.status(201).json({ message: 'Комментарий успешно добавлен' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// ... (GET /:postId/comments и POST /:postId/comments/:commentId/like без изменений)
router.get('/:postId/comments', authMiddleware, async (req, res) => {
    try {
        const { postId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;
        const skip = (page - 1) * limit;
        const { sort = 'newest' } = req.query;
        const post = await Post.findById(postId).select('comments');
        if (!post) return res.status(404).json({ message: 'Пост не найден' });
        const totalRootComments = await Comment.countDocuments({ post: postId, parent: null });
        const totalComments = await Comment.countDocuments({ post: postId });
        const populationOptions = [
            { path: 'author', select: 'username fullName name avatar premiumCustomization' },
            { path: 'likes', select: 'username fullName avatar _id' },
            {
                path: 'children',
                populate: [
                    { path: 'author', select: 'username fullName name avatar _id premiumCustomization' },
                    { path: 'likes', select: 'username fullName avatar _id' },
                    {
                        path: 'parent', // Populate the parent comment of a reply
                        populate: { path: 'author', select: 'username fullName name premiumCustomization' }  // And populate the author of that parent comment
                    }
                ]
            }
        ];
        let comments;
        if (sort === 'popular') {
            comments = await Comment.aggregate([
                { $match: { post: new mongoose.Types.ObjectId(postId), parent: null } },
                { $addFields: { likesCount: { $size: "$likes" } } },
                { $sort: { likesCount: -1, createdAt: -1 } },
                { $skip: skip },
                { $limit: limit }
            ]);
            await Comment.populate(comments, populationOptions);
        } else {
            comments = await Comment.find({ post: postId, parent: null }).sort(sort === 'oldest' ? { createdAt: 1 } : { createdAt: -1 }).skip(skip).limit(limit).populate(populationOptions);
        }
        res.json({ comments, totalPages: Math.ceil(totalRootComments / limit), currentPage: page, totalComments, totalRootComments });
    } catch (e) {
        res.status(500).json({ message: 'Ошибка при загрузке комментариев' });
    }
});

router.post('/:postId/comments/:commentId/like', authMiddleware, async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.commentId).populate({
            path: 'post',
            populate: {
                path: 'community',
                select: 'name'
            }
        });
        if (!comment) return res.status(404).json({ message: 'Комментарий не найден' });
        const post = comment.post;
        
        const userId = req.user.userId;
        if (post.community) {
            const community = await Community.findById(post.community);
            if (!community) return res.status(404).json({ message: 'Сообщество поста не найдено' });
            if (community.bannedUsers.includes(userId)) return res.status(403).json({ message: 'Вы заблокированы и не можете взаимодействовать с контентом.' });
            if (community.visibility !== 'public' && !community.members.includes(userId)) return res.status(403).json({ message: 'Вы должны быть участником, чтобы взаимодействовать с постами.' });
        }
        const alreadyLiked = comment.likes.includes(userId);
        if (!alreadyLiked) comment.likes.push(userId);
        else comment.likes.pull(userId);
        await comment.save();

        if (comment.author.toString() !== req.user.userId) {
            let recipientId = null;
            if (comment.authorModel === 'Community') {
                const commentAuthorCommunity = await Community.findById(comment.author).select('owner');
                if (commentAuthorCommunity) {
                    recipientId = commentAuthorCommunity.owner.toString();
                }
            } else { 
                recipientId = comment.author.toString();
            }

            if (recipientId && recipientId !== req.user.userId) {
                const previewImage = post?.imageUrls?.[0] || null;
                if (!alreadyLiked) {
                    const notification = await Notification.findOneAndUpdate(
                        { recipient: recipientId, type: 'like_comment', entityId: comment._id },
                        { 
                            $addToSet: { senders: req.user.userId }, 
                            $set: { 
                                lastSender: req.user.userId, 
                                read: false, 
                                link: `/posts/${comment.post._id}`, 
                                previewImage, 
                                previewText: comment.text?.substring(0, 50) || null,
                                community: post.community ? { _id: post.community._id, name: post.community.name } : undefined
                            }, 
                            $setOnInsert: { createdAt: new Date() } 
                        },
                        { upsert: true, new: true }
                    ).populate('lastSender', 'username fullName avatar');
                    req.broadcastToUsers([recipientId], { type: 'NEW_NOTIFICATION', payload: notification });
                } else {
                    await Notification.updateOne({ recipient: recipientId, type: 'like_comment', entityId: comment._id }, { $pull: { senders: req.user.userId } });
                    await Notification.deleteOne({ recipient: recipientId, type: 'like_comment', entityId: comment._id, senders: { $size: 0 } });
                    req.broadcastToUsers([recipientId], { type: 'NEW_NOTIFICATION' });
                }
            }
        }
        
        const populatedPost = await getPopulatedPost(req.params.postId, req.user.userId);
        req.broadcastMessage({ type: 'POST_UPDATED', payload: { postId: req.params.postId, fullPost: populatedPost } });
        res.json({ message: 'Статус лайка комментария обновлен', likes: comment.likes });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Ошибка сервера при изменении лайка комментария' });
    }
});
router.delete('/:postId/comments', authMiddleware, async (req, res) => {
    try {
        const { commentIds } = req.body;
        if (!commentIds?.length) return res.status(400).json({ message: 'Не предоставлены ID комментариев' });
        const post = await Post.findById(req.params.postId);
        if (!post) return res.status(404).json({ message: 'Пост не найден' });
        const commentObjectIds = commentIds.map(id => new mongoose.Types.ObjectId(id));
        const commentsToDeleteCheck = await Comment.find({ _id: { $in: commentObjectIds } });
        const canDeleteAll = commentsToDeleteCheck.every(c => c.author.toString() === req.user.userId || post.user.toString() === req.user.userId);
        if (!canDeleteAll) return res.status(403).json({ message: 'Нет прав для удаления некоторых комментариев' });
        const allIdsToDelete = await getAllChildCommentIds(commentObjectIds);
        const allObjectIdsToDelete = allIdsToDelete.map(id => new mongoose.Types.ObjectId(id));
        await Comment.deleteMany({ _id: { $in: allObjectIdsToDelete } });
        await Post.findByIdAndUpdate(req.params.postId, { $pull: { comments: { $in: commentObjectIds } } });
        await Comment.updateMany({ children: { $in: allObjectIdsToDelete } }, { $pull: { children: { $in: allObjectIdsToDelete } } });
        const populatedPost = await getPopulatedPost(req.params.postId, req.user.userId);
        req.broadcastMessage({ type: 'POST_UPDATED', payload: { postId: req.params.postId, fullPost: populatedPost } });
        res.json({ message: 'Комментарии успешно удалены' });
    } catch (e) {
        res.status(500).json({ message: 'Ошибка сервера при удалении комментариев' });
    }
});

router.delete('/:postId/comments/:commentId', authMiddleware, async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.commentId);
        if (!comment) return res.status(404).json({ message: 'Комментарий не найден' });
        
        const post = await Post.findById(req.params.postId);
        if (!post) return res.status(404).json({ message: 'Пост не найден' });

        const isCommentOwner = comment.author.toString() === req.user.userId;
        const isPostOwner = post.user.toString() === req.user.userId;
        
        let isCommunityOwner = false;
        if (post.community) {
            const community = await Community.findById(post.community);
            if (community && community.owner.toString() === req.user.userId) {
                isCommunityOwner = true;
            }
        }

        if (!isCommentOwner && !isPostOwner && !isCommunityOwner) {
            return res.status(403).json({ message: 'У вас нет прав на удаление этого комментария.' });
        }

        if (post) {
            post.comments.pull(req.params.commentId);
            await post.save();
        }
        if(comment.parent) await Comment.findByIdAndUpdate(comment.parent, { $pull: { children: comment._id } });
        
        const childIds = await getAllChildCommentIds([comment._id]);
        await Comment.deleteMany({ _id: { $in: childIds }});

        const populatedPost = await getPopulatedPost(req.params.postId, req.user.userId);
        req.broadcastMessage({ type: 'POST_UPDATED', payload: { postId: req.params.postId, fullPost: populatedPost } });
        res.json({ message: 'Комментарий успешно удален' });
    } catch (e) {
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

router.put('/:postId/comments/:commentId', authMiddleware, async (req, res) => {
    try {
        const { text } = req.body;
        // --- ИЗМЕНЕНИЕ: Очищаем текст ---
        const sanitizedText = sanitize(text);
        const { commentId } = req.params;
        const userId = req.user.userId;

        if (!sanitizedText || sanitizedText.trim() === '') {
            return res.status(400).json({ message: 'Текст комментария не может быть пустым.' });
        }

        const comment = await Comment.findById(commentId);
        if (!comment) {
            return res.status(404).json({ message: 'Комментарий не найден.' });
        }

        if (comment.author.toString() !== userId) {
            return res.status(403).json({ message: 'У вас нет прав на редактирование этого комментария.' });
        }

        // --- ИЗМЕНЕНИЕ: Сохраняем очищенный текст ---
        comment.text = sanitizedText;
        await comment.save();

        const populatedPost = await getPopulatedPost(req.params.postId, req.user.userId);
        req.broadcastMessage({ type: 'POST_UPDATED', payload: { postId: req.params.postId, fullPost: populatedPost } });

        res.json({ message: 'Комментарий успешно обновлен.' });
    } catch (e) {
        console.error('Ошибка при редактировании комментария:', e);
        res.status(500).json({ message: 'Ошибка на сервере.' });
    }
});

module.exports = router;