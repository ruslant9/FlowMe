// backend/routes/premium.js

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const User = require('../models/User');
const Payment = require('../models/Payment');
const YooKassa = require('yookassa');
const crypto = require('crypto');
const ipRangeCheck = require('ip-range-check');

// Экспортируем функцию, которая принимает инстансы WebSocket сервера и карты клиентов
module.exports = (wss, clients) => {

    const yooKassa = new YooKassa({
      shopId: process.env.YOO_KASSA_SHOP_ID,
      secretKey: process.env.YOO_KASSA_SECRET_KEY,
    });

    const plans = {
        '1_month': { 
            name: '1 месяц', 
            amount: '169.00', 
            durationDays: 30, 
            description: 'Идеально, чтобы попробовать',
            features: [
                'Анимированное оформление профиля',
                'Уникальный значок Premium',
                'Эмодзи у ника',
                'Кастомные обои в чатах',
                'Закрепление до 8 диалогов',
            ]
        },
        '3_months': { 
            name: '3 месяца', 
            amount: '269.00', 
            durationDays: 90, 
            description: 'Оптимальный выбор', 
            popular: true,
            features: [
                'Анимированное оформление профиля',
                'Уникальный значок Premium',
                'Эмодзи у ника',
                'Кастомные обои в чатах',
                'Закрепление до 8 диалогов',
            ]
        },
        '6_months': { 
            name: '6 месяцев', 
            amount: '469.00', 
            durationDays: 180, 
            description: 'Максимальная выгода',
            features: [
                'Анимированное оформление профиля',
                'Уникальный значок Premium',
                'Эмодзи у ника',
                'Кастомные обои в чатах',
                'Закрепление до 8 диалогов',
            ]
        },
    };
    
    // Роут для фронтенда, чтобы запрашивать актуальные тарифы
    router.get('/plans', authMiddleware, (req, res) => {
        res.json(plans);
    });

    // Middleware для проверки IP-адресов YooKassa
    const yookassaIps = [
        '185.71.76.0/27', '185.71.77.0/27', '77.75.153.0/25', '77.75.154.128/25', 
        '77.75.156.11', '77.75.156.35',
        '2a02:5180:0:1::/64', '2a02:5180:0:2::/64',
        '2a02:5180:0:3::/64'
    ];
    
    const verifyYookassaIp = (req, res, next) => {
        const reqIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        if (!reqIp) {
             console.error(`[SECURITY] Не удалось определить IP-адрес для webhook.`);
             return res.status(403).send('Forbidden: IP Address cannot be determined.');
        }

        const isAllowed = ipRangeCheck(reqIp, yookassaIps);

        if (!isAllowed) {
            console.error(`[SECURITY] Запрещенный запрос на webhook с IP-адреса: ${reqIp}`);
            return res.status(403).send('Forbidden: Invalid IP Address');
        }
        
        next();
    };
    
    // Роут для создания платежа
    router.post('/create-payment', authMiddleware, async (req, res) => {
        try {
            const { planId } = req.body;
            const plan = plans[planId];
            if (!plan) {
                return res.status(400).json({ message: 'Неверный тарифный план.' });
            }

            const newPayment = new Payment({
                user: req.user.userId,
                planId: planId,
                amount: plan.amount,
                status: 'pending'
            });
            await newPayment.save();

            const idempotenceKey = newPayment._id.toString();

            const payment = await yooKassa.createPayment({
                amount: { value: plan.amount, currency: 'RUB' },
                confirmation: { type: 'redirect', return_url: 'http://localhost:5173/profile' },
                description: `Подписка Flow PREMIUM - ${plan.name}`,
                metadata: { ourPaymentId: idempotenceKey },
                capture: true
            });

            newPayment.yookassaPaymentId = payment.id;
            await newPayment.save();

            res.json({ confirmationUrl: payment.confirmation.confirmation_url });
        } catch (error) {
            console.error('Ошибка создания платежа YooKassa:', error);
            res.status(500).json({ message: 'Не удалось создать сессию оплаты.' });
        }
    });

    // Роут для Webhook от YooKassa
    router.post('/webhook', express.json(), verifyYookassaIp, async (req, res) => {
        const notification = req.body;

        if (notification.event !== 'payment.succeeded' || notification.object.status !== 'succeeded') {
            return res.status(200).send('OK. Event ignored.');
        }

        try {
            const payment = notification.object;
            const ourPaymentId = payment.metadata.ourPaymentId;

            const existingPayment = await Payment.findById(ourPaymentId);

            if (!existingPayment) {
                console.error(`[Webhook] Получено уведомление для неизвестного платежа: ${ourPaymentId}`);
                return res.status(404).send('Payment record not found');
            }
            if (existingPayment.status === 'succeeded') {
                console.log(`[Webhook] Повторное уведомление для уже обработанного платежа: ${ourPaymentId}. Игнорируем.`);
                return res.status(200).send('OK. Already processed.');
            }
            if (existingPayment.amount !== payment.amount.value) {
                 console.error(`[Webhook SECURITY] Несовпадение суммы платежа! ID: ${ourPaymentId}. Ожидалось: ${existingPayment.amount}, получено: ${payment.amount.value}`);
                 return res.status(400).send('Amount mismatch.');
            }

            const user = await User.findById(existingPayment.user);
            const plan = plans[existingPayment.planId];

            if (user && plan) {
                const now = new Date();
                const currentExpiresAt = user.premium?.expiresAt;
                
                const startDate = (currentExpiresAt && currentExpiresAt > now) ? currentExpiresAt : now;
                const newExpiresAt = new Date(startDate);
                newExpiresAt.setDate(newExpiresAt.getDate() + plan.durationDays);

                user.premium = {
                    isActive: true,
                    expiresAt: newExpiresAt,
                    plan: existingPayment.planId,
                };
                await user.save();

                existingPayment.status = 'succeeded';
                await existingPayment.save();
                
                const userSocket = clients.get(user._id.toString());
                if (userSocket && userSocket.readyState === 1) { // 1 === WebSocket.OPEN
                    userSocket.send(JSON.stringify({ type: 'PREMIUM_STATUS_UPDATED', payload: user.premium }));
                }

                console.log(`[Webhook] Успешно активирована подписка для пользователя ${user.username}`);
            } else {
                 console.error(`[Webhook] Пользователь ${existingPayment.user} или план ${existingPayment.planId} не найден для платежа ${ourPaymentId}`);
            }

        } catch (error) {
            console.error('[Webhook] Критическая ошибка при обработке уведомления:', error);
            return res.status(500).send('Internal Server Error');
        }
        
        res.status(200).send('OK');
    });

    // Роут для отмены подписки
    router.delete('/cancel', authMiddleware, async (req, res) => {
        try {
            const user = await User.findById(req.user.userId);
            if (!user) {
                return res.status(404).json({ message: 'Пользователь не найден.' });
            }

            if (!user.premium || !user.premium.isActive) {
                return res.status(400).json({ message: 'У вас нет активной подписки.' });
            }

            user.premium.isActive = false;
            user.premium.expiresAt = null;
            user.premium.plan = null;
            await user.save();

            const userSocket = clients.get(user._id.toString());
            if (userSocket && userSocket.readyState === 1) {
                userSocket.send(JSON.stringify({ type: 'PREMIUM_STATUS_UPDATED', payload: user.premium }));
            }

            res.status(200).json({ message: 'Подписка Premium успешно отменена.' });

        } catch (error) {
            console.error('Ошибка при отмене подписки:', error);
            res.status(500).json({ message: 'Не удалось отменить подписку.' });
        }
    });
    
    return router;
};