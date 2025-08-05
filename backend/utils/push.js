// backend/utils/push.js

const webpush = require('web-push');
const User = require('../models/User');

const vapidKeys = {
    publicKey: process.env.VAPID_PUBLIC_KEY,
    privateKey: process.env.VAPID_PRIVATE_KEY,
};

webpush.setVapidDetails(
    'mailto:your-email@example.com', // Укажите вашу почту
    vapidKeys.publicKey,
    vapidKeys.privateKey
);

const sendPushNotification = async (userId, payload) => {
    try {
        const user = await User.findById(userId).select('pushSubscriptions');
        if (!user || !user.pushSubscriptions || user.pushSubscriptions.length === 0) {
            return; // У пользователя нет активных подписок
        }

        const notificationPayload = JSON.stringify(payload);

        const sendPromises = user.pushSubscriptions.map(subscription => 
            webpush.sendNotification(subscription, notificationPayload)
                .catch(error => {
                    // Если подписка просрочена или недействительна (ошибка 410), удаляем её
                    if (error.statusCode === 410) {
                        console.log(`Push subscription for user ${userId} has expired. Removing.`);
                        return User.updateOne({ _id: userId }, { $pull: { pushSubscriptions: { endpoint: subscription.endpoint } } });
                    } else {
                        console.error(`Error sending push notification to ${userId}:`, error.body);
                    }
                })
        );
        
        await Promise.all(sendPromises);

    } catch (error) {
        console.error('Failed to send push notification:', error);
    }
};

module.exports = { sendPushNotification };