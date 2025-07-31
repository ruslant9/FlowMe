// backend/utils/privacy.js
const mongoose = require('mongoose');

const isAllowedByPrivacy = (privacySetting, requesterId, targetUser) => {
    if (!privacySetting || !['everyone', 'friends', 'private'].includes(privacySetting)) {
        privacySetting = 'everyone';
    }
    const targetUserIdString = targetUser._id.toString();
    const requesterIdString = requesterId.toString();
    if (requesterIdString === targetUserIdString) {
        return true;
    }
    if (privacySetting === 'everyone') {
        return true;
    }
    if (privacySetting === 'private') {
        return false;
    }
    if (privacySetting === 'friends') {
        // --- НАЧАЛО ИЗМЕНЕНИЯ 2: Добавляем фильтрацию некорректных данных ---
        const targetUserFriendIds = (targetUser.friends || [])
            .filter(friendship => friendship && friendship.user) // Отсеиваем null или некорректные записи
            .map(friendship => friendship.user.toString());
        // --- КОНЕЦ ИЗМЕНЕНИЯ 2 ---
        return targetUserFriendIds.includes(requesterIdString);
    }
    return false;
};

module.exports = { isAllowedByPrivacy };