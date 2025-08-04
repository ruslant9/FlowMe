// backend/utils/posts_.js

const mongoose = require('mongoose');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const User = require('../models/User');
const Community = require('../models/Community');
const { isAllowedByPrivacy } = require('./privacy');

async function getPopulatedPost(postId, requesterId) {
    const post = await Post.findById(postId)
        .populate('user', 'username fullName avatar privacySettings friends blacklist')
        .populate('likes', 'username fullName avatar _id')
        .populate('community', 'name avatar visibility members postingPolicy owner')
        // --- НАЧАЛО ИСПРАВЛЕНИЯ ---
        .populate({
            path: 'attachedTrack',
            populate: [
                { path: 'artist', select: 'name _id' },
                { path: 'album', select: 'title coverArtUrl' }
            ]
        })
        // --- КОНЕЦ ИСПРАВЛЕНИЯ ---
        .populate({ path: 'poll.options.votes', select: 'username fullName avatar' })
        .lean();

    if (!post) return null;
    
    // --- НАЧАЛО ИСПРАВЛЕНИЯ ---
    // Добавляем обложку альбома, если у трека нет своей
    if (post.attachedTrack && post.attachedTrack.album && post.attachedTrack.album.coverArtUrl && !post.attachedTrack.albumArtUrl) {
        post.attachedTrack.albumArtUrl = post.attachedTrack.album.coverArtUrl;
    }
    // --- КОНЕЦ ИСПРАВЛЕНИЯ ---

    const commentIds = await Comment.find({ post: postId }).select('_id').lean();
    const allCommentIds = commentIds.map(c => c._id);

    if (allCommentIds.length > 0) {
        let allComments = await Comment.find({ _id: { $in: allCommentIds } })
            .populate('likes', 'username fullName avatar _id')
            .populate({
                path: 'parent',
                select: 'author authorModel text',
                populate: [
                    { path: 'author', select: 'username fullName name' }
                ]
            })
            .lean();

        const userAuthorIds = allComments.filter(c => (c.authorModel || 'User') === 'User').map(c => c.author);
        const communityAuthorIds = allComments.filter(c => c.authorModel === 'Community').map(c => c.author);

        const userAuthors = await User.find({ _id: { $in: userAuthorIds } }).select('username fullName avatar').lean();
        const communityAuthors = await Community.find({ _id: { $in: communityAuthorIds } }).select('name avatar').lean();

        const userAuthorMap = new Map(userAuthors.map(u => [u._id.toString(), u]));
        const communityAuthorMap = new Map(communityAuthors.map(c => [c._id.toString(), c]));

        allComments.forEach(comment => {
            const authorModel = comment.authorModel || 'User';
            const authorId = comment.author?.toString();
            if (authorModel === 'User') {
                comment.author = userAuthorMap.get(authorId);
            } else {
                comment.author = communityAuthorMap.get(authorId);
            }
        });
        
        const commentMap = new Map(allComments.map(c => [c._id.toString(), c]));
        const rootComments = [];

        allComments.forEach(comment => {
            if (comment.parent) {
                const parentIdString = comment.parent._id.toString();
                const parent = commentMap.get(parentIdString);
                if (parent) {
                    if (!parent.children) parent.children = [];
                    parent.children.push(comment);
                    parent.children.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                }
            } else {
                rootComments.push(comment);
            }
        });

        post.comments = rootComments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else {
        post.comments = [];
    }

    const postOwner = post.user;
    const postCommunity = post.community;

    if (postCommunity) {
        const isMember = postCommunity.members.some(memberId => memberId.equals(requesterId));
        if ((postCommunity.visibility === 'private' || postCommunity.visibility === 'secret') && !isMember) {
            post.text = 'Контент этого сообщества скрыт.';
            post.imageUrls = [];
            post.likes = [];
            post.comments = [];
            post.commentsDisabled = true;
            post.community = { _id: postCommunity._id, name: postCommunity.name, avatar: postCommunity.avatar, isPrivate: true, visibility: postCommunity.visibility }; 
            return post; 
        }
        delete post.community.members;
    }
    
    if (postOwner) {
        if (postOwner._id.toString() !== requesterId.toString()) {
            const postOwnerBlacklistIds = (postOwner.blacklist || []).map(id => id.toString());
            const isRequesterBlockedByPostOwner = postOwnerBlacklistIds.includes(requesterId.toString());
            const requesterUser = await User.findById(requesterId).select('blacklist').lean();
            const isRequesterBlockingPostOwner = (requesterUser.blacklist || []).map(id => id.toString()).includes(postOwner._id.toString());

            if (isRequesterBlockedByPostOwner || isRequesterBlockedByPostOwner) {
                post.user = { _id: postOwner._id, username: 'Заблокированный пользователь', fullName: null, avatar: null };
                post.text = 'Контент скрыт'; 
                post.imageUrls = []; 
                post.likes = []; 
                post.comments = [];
                post.commentsDisabled = true; 
            } else {
                if (!isAllowedByPrivacy(postOwner.privacySettings?.viewAvatar, requesterId, postOwner)) {
                    post.user.avatar = null;
                }
            }
        }
        delete post.user.privacySettings;
        delete post.user.friends;
        delete post.user.blacklist;
    }

    return post;
}

module.exports = { getPopulatedPost };