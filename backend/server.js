// backend/server.js

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const passport = require('passport');
const path = require('path');
const http = require('http');
const { WebSocketServer, WebSocket } = require('ws');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

require('dotenv').config();

// Import models
const User = require('./models/User');
const Conversation = require('./models/Conversation');
const Community = require('./models/Community');
const Submission = require('./models/Submission');
const Post = require('./models/Post');
const { getPopulatedPost } = require('./utils/posts');

// Import configurations and routes
const passportSetup = require('./config/passport-setup');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user'); 
const banMiddleware = require('./middleware/ban.middleware'); // <-- НОВЫЙ ИМПОРТ
const postsRouter = require('./routes/posts-router');
const messagesRouter = require('./routes/messages-router');
const communityRoutes = require('./routes/communities');
const authMiddleware = require('./middleware/auth.middleware');
const premiumRoutes = require('./routes/premium'); 
const musicRoutes = require('./routes/music');
const wallpaperRoutes = require('./routes/wallpapers');
const playlistRoutes = require('./routes/playlists');
const submissionsRoutes = require('./routes/submissions'); // <-- Этот роут для обычных пользователей
const adminRoutes = require('./routes/admin'); // <-- А этот для админов
const app = express();
const server = http.createServer(app);

app.set('trust proxy', 1);

const allowedOrigins = [process.env.CLIENT_URL, process.env.CORS_ORIGIN].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        // Разрешаем запросы без origin (например, от мобильных приложений или Postman)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true 
}));

// Middleware
app.use(passport.initialize());
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// WebSocket server
const wss = new WebSocketServer({ server });
const clients = new Map();

const broadcastMessage = (message) => {
    clients.forEach((wsClient) => {
        if (wsClient.readyState === WebSocket.OPEN) {
            wsClient.send(JSON.stringify(message));
        }
    });
};

const broadcastFullUserStatus = async (userId, isOnline, clientsMap) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            console.warn('broadcastFullUserStatus: Received invalid userId:', userId);
            return;
        }

        // --- НАЧАЛО ИЗМЕНЕНИЯ 1: Добавляем username и fullName в выборку ---
        const user = await User.findById(userId).select('username fullName lastSeen privacySettings avatar premium premiumCustomization');
        if (!user) return;
        
        const message = {
            type: 'FULL_USER_STATUS_UPDATE',
            payload: {
                userId: userId.toString(),
                // --- НАЧАЛО ИЗМЕНЕНИЯ 2: Добавляем username и fullName в отправляемые данные ---
                username: user.username,
                fullName: user.fullName,
                // --- КОНЕЦ ИЗМЕНЕНИЯ 2 ---
                isOnline: isOnline,
                lastSeen: user.lastSeen,
                privacySettings: user.privacySettings,
                avatar: user.avatar,
                premium: user.premium,
                premiumCustomization: user.premiumCustomization,
            }
        };
        // --- КОНЕЦ ИЗМЕНЕНИЯ 1 ---

        clientsMap.forEach((wsClient) => {
            if (wsClient.readyState === WebSocket.OPEN) {
                wsClient.send(JSON.stringify(message));
            }
        });
    } catch (error) {
        console.error('Error in broadcastFullUserStatus:', error);
    }
};

const broadcastToUsers = (clientsMap, userIds, message) => {
    userIds.forEach(userId => {
        const userSocket = clientsMap.get(userId.toString());
        if (userSocket && userSocket.readyState === 1) { // WebSocket.OPEN
            userSocket.send(JSON.stringify(message));
        }
    });
};

wss.on('connection', (ws) => {
    ws.on('message', async (message) => {
        let data;
        try { data = JSON.parse(message); } catch (e) { ws.close(); return; }

        if (data.type === 'auth' && data.token) {
            try {
                const decoded = jwt.verify(data.token, process.env.JWT_SECRET);
                const userIdStr = decoded.userId.toString();
                clients.set(userIdStr, ws);
                ws.userId = userIdStr;
                
                const onlineUsersData = [];
                for (const [id, clientSocket] of clients.entries()) {
                    if (id !== userIdStr && clientSocket.readyState === WebSocket.OPEN) {
                        // --- НАЧАЛО ИЗМЕНЕНИЯ 3: Добавляем username и fullName в выборку при инициализации ---
                        const user = await User.findById(id).select('username fullName lastSeen privacySettings avatar premium premiumCustomization');
                        if (user) {
                            onlineUsersData.push({ 
                                userId: id, 
                                // --- НАЧАЛО ИЗМЕНЕНИЯ 4: Добавляем username и fullName в начальные данные ---
                                username: user.username,
                                fullName: user.fullName,
                                // --- КОНЕЦ ИЗМЕНЕНИЯ 4 ---
                                isOnline: true, 
                                lastSeen: user.lastSeen, 
                                privacySettings: user.privacySettings, 
                                avatar: user.avatar,
                                premium: user.premium,
                                premiumCustomization: user.premiumCustomization
                            });
                        }
                        // --- КОНЕЦ ИЗМЕНЕНИЯ 3 ---
                    }
                }
                ws.send(JSON.stringify({ type: 'INITIAL_STATUS', payload: onlineUsersData }));
                broadcastFullUserStatus(userIdStr, true, clients);

            } catch (jwtError) { ws.close(); }
        }

        if (data.type === 'TYPING' && ws.userId) {
            const conversation = await Conversation.findById(data.payload.conversationId);
            if (conversation) {
                const otherParticipants = conversation.participants.filter(p => p.toString() !== ws.userId);
                otherParticipants.forEach(participantId => {
                    const recipientSocket = clients.get(participantId.toString());
                    if (recipientSocket && recipientSocket.readyState === WebSocket.OPEN) {
                        recipientSocket.send(JSON.stringify({ type: 'TYPING', payload: { conversationId: data.payload.conversationId, userId: ws.userId, isTyping: data.payload.isTyping } }));
                    }
                });
            }
        }
    });

    ws.on('close', async () => {
        if (ws.userId) {
            try { await User.findByIdAndUpdate(ws.userId, { lastSeen: new Date() }); } catch (dbError) { console.error(dbError); }
            clients.delete(ws.userId);
            broadcastFullUserStatus(ws.userId, false, clients);
        }
    });

    ws.on('error', (err) => console.error('Server WebSocket error:', err));
});

app.use((req, res, next) => {
    req.clients = clients;
    req.broadcastMessage = broadcastMessage;
    req.broadcastToUsers = (userIds, message) => broadcastToUsers(clients, userIds, message);
    req.broadcastFullUserStatus = (userId) => broadcastFullUserStatus(userId, req.clients.has(userId.toString()), req.clients);
    next();
});

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false, message: { message: 'Слишком много попыток. Пожалуйста, попробуйте снова через 15 минут.' } });
const codeLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false, message: { message: 'Слишком много запросов на отправку кода. Попробуйте позже.' } });

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/verify-email', authLimiter);
app.use('/api/auth/forgot-password', codeLimiter);
app.use('/api/auth/register', codeLimiter);
app.use('/api/auth', authRoutes); // Роуты входа/регистрации не должны проверяться на бан
app.use('/api/user', authMiddleware, banMiddleware, userRoutes);
app.use('/api/posts', authMiddleware, banMiddleware, postsRouter); 
app.use('/api/messages', authMiddleware, banMiddleware, messagesRouter);
app.use('/api/communities', authMiddleware, banMiddleware, communityRoutes);
app.use('/api/music', authMiddleware, banMiddleware, musicRoutes);
app.use('/api/wallpapers', authMiddleware, banMiddleware, wallpaperRoutes);
app.use('/api/premium', authMiddleware, banMiddleware, premiumRoutes(wss, clients));
app.use('/api/playlists', authMiddleware, banMiddleware, playlistRoutes);
app.use('/api/submissions', authMiddleware, banMiddleware, submissionsRoutes); 
app.use('/api/admin', adminRoutes); // Админ-роуты защищены своим middleware

const PORT = process.env.PORT || 5000;

const startScheduledPostPublisher = (clientsMap) => {
    setInterval(async () => {
        try {
            const now = new Date();
            const postsToPublish = await Post.find({
                status: 'scheduled',
                scheduledFor: { $lte: now }
            });

            for (const post of postsToPublish) {
                post.status = 'published';
                post.publishedAt = new Date();
                await post.save();
                
                const populatedPost = await getPopulatedPost(post._id, post.user);
                
                const broadcastMessage = (message) => {
                    clientsMap.forEach((wsClient) => {
                        if (wsClient.readyState === 1) { // WebSocket.OPEN
                            wsClient.send(JSON.stringify(message));
                        }
                    });
                };

                broadcastMessage({ type: 'POST_UPDATED', payload: { postId: post._id, fullPost: populatedPost } });
                broadcastMessage({ type: 'USER_DATA_UPDATED', userId: post.user.toString() });
                console.log(`Published scheduled post: ${post._id}`);
            }
        } catch (error) {
            console.error('Error in scheduled post publisher:', error);
        }
    }, 60 * 1000);
};

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Successfully connected to MongoDB');
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      startScheduledPostPublisher(clients);
    });
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error.message);
  });