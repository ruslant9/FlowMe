// backend/routes/admin.js

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const authMiddleware = require('../middleware/auth.middleware');
const adminMiddleware = require('../middleware/admin.middleware');
const superAdminMiddleware = require('../middleware/superAdmin.middleware');

// Модели
const Artist = require('../models/Artist');
const Album = require('../models/Album');
const Track = require('../models/Track');
const Submission = require('../models/Submission');
const User = require('../models/User');
const Playlist = require('../models/Playlist');
const Conversation = require('../models/Conversation'); 

const multer = require('multer');
const { createStorage, cloudinary } = require('../config/cloudinary');

// Создаем хранилище для файлов, которые загружает админ.
const adminStorage = createStorage('music');
const upload = multer({ storage: adminStorage });
router.use(authMiddleware, adminMiddleware);


// Получить список всех администраторов
router.get('/administrators', async (req, res) => {
    try {
        const admins = await User.find({ role: { $in: ['junior_admin', 'super_admin'] } })
            .select('username fullName email role avatar')
            .sort({ role: -1, createdAt: 1 });
        res.json(admins);
    } catch (error) {
        res.status(500).json({ message: "Ошибка загрузки администраторов" });
    }
});

// Поиск пользователей для назначения админом (только для super_admin)
router.get('/search-users', superAdminMiddleware, async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.json([]);

        const users = await User.find({
            username: { $regex: q, $options: 'i' },
            role: 'user' // Ищем только среди обычных пользователей
        }).select('username fullName avatar').limit(10);
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: "Ошибка поиска пользователей" });
    }
});

// Назначить младшего админа (только для super_admin)
router.post('/grant-junior-admin/:userId', superAdminMiddleware, async (req, res) => {
    try {
        const userToPromote = await User.findById(req.params.userId);
        if (!userToPromote) return res.status(404).json({ message: 'Пользователь не найден' });
        if (userToPromote.role !== 'user') return res.status(400).json({ message: 'Пользователь уже является администратором.' });
        
        userToPromote.role = 'junior_admin';
        await userToPromote.save();
        res.json({ message: `Пользователь ${userToPromote.username} назначен младшим администратором.` });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка назначения администратора' });
    }
});

// Снять права администратора (только для super_admin)
router.post('/revoke-admin/:userId', superAdminMiddleware, async (req, res) => {
    try {
        const userToDemote = await User.findById(req.params.userId);
        if (!userToDemote) return res.status(404).json({ message: 'Администратор не найден' });
        if (userToDemote.role === 'super_admin' && userToDemote._id.equals(req.user._id)) {
            return res.status(403).json({ message: 'Нельзя снять права с самого себя.' });
        }
        
        userToDemote.role = 'user';
        await userToDemote.save();
        res.json({ message: `Права администратора для ${userToDemote.username} сняты.` });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка снятия прав администратора' });
    }
});


// --- НАЧАЛО ИСПРАВЛЕНИЯ ---
router.get('/all-pinned-chats', async (req, res) => {
    try {
        const userId = req.user._id;
        const conversations = await Conversation.find({ pinnedBy: userId })
            .populate({
                path: 'participants',
                select: 'username fullName avatar',
                // Убираем match, чтобы получить всех участников и отфильтровать на сервере
            })
            .lean();
        
        const results = conversations.map(conv => {
            // Правильно определяем "Избранное": это чат, где только один участник - сам пользователь
            const isSavedMessages = conv.participants.length === 1 && conv.participants[0]._id.equals(userId);
            
            // Находим собеседника, если это не "Избранное"
            const interlocutor = !isSavedMessages
                ? conv.participants.find(p => p && !p._id.equals(userId))
                : null;
            
            return {
                _id: conv._id,
                isSavedMessages: isSavedMessages,
                interlocutor: interlocutor || null, // Если собеседник не найден (удален), будет null
                isArchivedForAdmin: conv.archivedBy.some(id => id.equals(userId))
            };
        }).filter(conv => {
            // Фильтруем "призрачные" чаты:
            // Оставляем чат, если это "Избранное" ИЛИ если у него есть действительный собеседник
            return conv.isSavedMessages || conv.interlocutor;
        });

        res.json(results);
    } catch (error) {
        console.error("Ошибка при получении всех закрепленных чатов:", error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// --- РОУТЫ ДЛЯ МОДЕРАЦИИ ---

router.get('/submissions', async (req, res) => {
    try {
        const submissions = await Submission.find({ status: 'pending' })
            .populate('submittedBy', 'username fullName avatar')
            .sort({ createdAt: -1 })
            .lean(); 

        for (const sub of submissions) {
            if (sub.entityType === 'Track' && sub.data.artist && Array.isArray(sub.data.artist)) {
                try {
                    const artistIds = sub.data.artist.map(id => new mongoose.Types.ObjectId(id));
                    const artists = await Artist.find({ '_id': { $in: artistIds } }).select('name').lean();
                    sub.data.populatedArtists = artists;
                } catch (e) {
                    console.error("Ошибка при ручной популяции артистов в заявке:", e);
                    sub.data.populatedArtists = [];
                }
            }
        }

        res.json(submissions);
    } catch (error) {
        console.error("Ошибка загрузки заявок:", error);
        res.status(500).json({ message: 'Ошибка загрузки заявок' });
    }
});


// Одобрить заявку
router.post('/submissions/:id/approve', async (req, res) => {
    try {
        const submission = await Submission.findById(req.params.id);
        if (!submission || submission.status !== 'pending') {
            return res.status(404).json({ message: 'Заявка не найдена или уже обработана.' });
        }

        if (submission.entityType === 'BanAppeal') {
            const userToUnban = await User.findById(submission.submittedBy);
            if (userToUnban) {
                userToUnban.banInfo = {
                    isBanned: false,
                    banReason: null,
                    banExpires: null
                };
                await userToUnban.save();
                
                req.broadcastToUsers([userToUnban._id.toString()], {
                    type: 'ACCOUNT_STATUS_CHANGED',
                    payload: { banInfo: userToUnban.banInfo }
                });
            }
        } else if (submission.action === 'create') {
            const Model = mongoose.model(submission.entityType);
            const newEntity = new Model({
                ...submission.data,
                status: 'approved',
                createdBy: submission.submittedBy,
                reviewedBy: req.user._id,
            });
            await newEntity.save();
        } else if (submission.action === 'edit') {
            const Model = mongoose.model(submission.entityType);
            await Model.updateOne(
                { _id: submission.entityId },
                { $set: { ...submission.data, status: 'approved', reviewedBy: req.user._id } }
            );
        }

        submission.status = 'approved';
        submission.reviewedBy = req.user._id;
        await submission.save();

        res.json({ message: 'Заявка одобрена.' });
    } catch (error) {
        console.error("Ошибка при одобрении заявки:", error);
        res.status(500).json({ message: 'Ошибка при одобрении заявки' });
    }
});

router.post('/submissions/:id/reject', async (req, res) => {
    try {
        const { reason } = req.body;
        const submission = await Submission.findById(req.params.id);
        if (!submission || submission.status !== 'pending') {
            return res.status(404).json({ message: 'Заявка не найдена или уже обработана.' });
        }

        submission.status = 'rejected';
        submission.rejectionReason = reason;
        submission.reviewedBy = req.user._id;
        await submission.save();
        
        if (submission.action === 'edit') {
            const Model = mongoose.model(submission.entityType);
            await Model.updateOne({ _id: submission.entityId }, { $set: { status: 'approved' } });
        }

        res.json({ message: 'Заявка отклонена.' });
    } catch (error) {
        console.error("Ошибка при отклонении заявки:", error);
        res.status(500).json({ message: 'Ошибка при отклонении заявки' });
    }
});

// Создать артиста напрямую
router.post('/artists', upload.single('avatar'), async (req, res) => {
    try {
        const { name, description, tags } = req.body;
        // --- НАЧАЛО ИСПРАВЛЕНИЯ: Проверка на существующего артиста ---
        if (!name) {
            return res.status(400).json({ message: 'Имя артиста не может быть пустым.' });
        }
        const existingArtist = await Artist.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
        if (existingArtist) {
            return res.status(400).json({ message: 'Артист с таким именем уже существует.' });
        }
        // --- КОНЕЦ ИСПРАВЛЕНИЯ ---

        const newArtist = new Artist({
            name,
            description,
            tags: tags ? tags.split(',').map(t => t.trim()) : [],
            avatarUrl: req.file ? req.file.path : null,
            status: 'approved',
            createdBy: req.user._id,
            reviewedBy: req.user._id,
        });
        await newArtist.save();
        res.status(201).json({ message: 'Артист успешно создан.' });
    } catch (error) {
        console.error("Ошибка создания артиста:", error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Загрузить трек напрямую
router.post('/tracks', upload.fields([{ name: 'trackFile', maxCount: 1 }, { name: 'coverArt', maxCount: 1 }]), async (req, res) => {
     try {
        const { title, artistIds, albumId, durationMs, genres, releaseDate, isExplicit } = req.body;
        
        const parsedGenres = genres ? JSON.parse(genres) : [];
        const parsedArtistIds = artistIds ? JSON.parse(artistIds) : [];

        // --- НАЧАЛО ИСПРАВЛЕНИЯ: Проверка на существующий трек ---
        if (!title || parsedArtistIds.length === 0) {
            return res.status(400).json({ message: 'Название и исполнитель являются обязательными полями.' });
        }
        const existingTrack = await Track.findOne({
            title: { $regex: new RegExp(`^${title}$`, 'i') },
            artist: { $all: parsedArtistIds, $size: parsedArtistIds.length }
        });
        if (existingTrack) {
            return res.status(400).json({ message: 'Такой трек у этого исполнителя (или группы исполнителей) уже существует.' });
        }
        // --- КОНЕЦ ИСПРАВЛЕНИЯ ---

        if (!req.files || !req.files.trackFile) {
            return res.status(400).json({ message: 'Аудиофайл не загружен.' });
        }
        
        const newTrack = new Track({
            title,
            artist: parsedArtistIds,
            album: albumId || null,
            durationMs,
            genres: parsedGenres,
            isExplicit: isExplicit === 'true',
            releaseDate: releaseDate || null,
            albumArtUrl: albumId ? null : (req.files.coverArt?.[0]?.path || null),
            storageKey: req.files.trackFile[0].path,
            status: 'approved',
            createdBy: req.user._id,
            reviewedBy: req.user._id,
            type: 'library_track'
        });
        await newTrack.save();

        if (albumId) {
            await Album.updateOne({ _id: albumId }, { $push: { tracks: newTrack._id } });
        }
        
        res.status(201).json({ message: 'Трек успешно загружен и опубликован.' });
    } catch (error) {
        console.error("Ошибка загрузки трека:", error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Создать альбом напрямую
router.post('/albums', upload.single('coverArt'), async (req, res) => {
    try {
        const { title, artistId, genre, releaseDate } = req.body;
        const parsedGenre = genre ? JSON.parse(genre) : [];
    
        // --- НАЧАЛО ИСПРАВЛЕНИЯ: Проверка на существующий альбом ---
        if (!title || !artistId) {
            return res.status(400).json({ message: 'Название альбома и исполнитель обязательны.' });
        }
        const existingAlbum = await Album.findOne({
            title: { $regex: new RegExp(`^${title}$`, 'i') },
            artist: artistId
        });
        if (existingAlbum) {
            return res.status(400).json({ message: 'Альбом с таким названием у этого исполнителя уже существует.' });
        }
        // --- КОНЕЦ ИСПРАВЛЕНИЯ ---
    
        const newAlbum = new Album({
            title,
            artist: artistId,
            genre: parsedGenre,
            releaseDate: releaseDate || null,
            coverArtUrl: req.file ? req.file.path : null,
            status: 'approved',
            createdBy: req.user._id,
            reviewedBy: req.user._id,
        });
        await newAlbum.save();
        res.status(201).json({ message: 'Альбом успешно создан.' });
    } catch (error) {
        console.error("Ошибка создания альбома:", error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});


// 1. Получить список всех артистов с фильтрацией и сортировкой
router.get('/content/artists', async (req, res) => {
    try {
        const { page = 1, limit = 15, search = '', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
        
        const query = { status: 'approved' };
        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }
        
        const sortOptions = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
        
        const artists = await Artist.find(query)
            .sort(sortOptions)
            .skip((page - 1) * limit)
            .limit(parseInt(limit));
            
        const total = await Artist.countDocuments(query);
        
        res.json({
            items: artists,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page)
        });
    } catch (error) {
        res.status(500).json({ message: "Ошибка загрузки артистов" });
    }
});

// 2. Получить список всех альбомов с фильтрацией и сортировкой
router.get('/content/albums', async (req, res) => {
    try {
        const { page = 1, limit = 15, search = '', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
        
        const query = { status: 'approved' };
        if (search) {
            query.title = { $regex: search, $options: 'i' };
        }

        const sortOptions = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
        
        const albums = await Album.find(query)
            .populate('artist', 'name')
            .sort(sortOptions)
            .skip((page - 1) * limit)
            .limit(parseInt(limit));
            
        const total = await Album.countDocuments(query);

        res.json({
            items: albums,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page)
        });
    } catch (error) {
        res.status(500).json({ message: "Ошибка загрузки альбомов" });
    }
});

// 3. Получить список всех СОЛЬНЫХ треков с фильтрацией и сортировкой
router.get('/content/tracks', async (req, res) => {
    try {
        const { page = 1, limit = 15, search = '', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
        
        const query = { status: 'approved', album: null, type: 'library_track' };
        if (search) {
            query.title = { $regex: search, $options: 'i' };
        }

        const sortOptions = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
        
        const tracks = await Track.find(query)
            .populate('artist', 'name')
            .sort(sortOptions)
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Track.countDocuments(query);

        res.json({
            items: tracks,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page)
        });
    } catch (error) {
        res.status(500).json({ message: "Ошибка загрузки треков" });
    }
});

// --- АРТИСТЫ ---
router.put('/content/artists/:id', upload.single('avatar'), async (req, res) => {
    try {
        const { name, description, tags } = req.body;
        const updateData = { name, description, tags: tags ? tags.split(',').map(t => t.trim()) : [] };

        if (req.file) {
            updateData.avatarUrl = req.file.path;
        }

        const updatedArtist = await Artist.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!updatedArtist) return res.status(404).json({ message: 'Артист не найден' });
        
        res.json(updatedArtist);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при обновлении артиста' });
    }
});

router.delete('/content/artists/:id', async (req, res) => {
    try {
        await Artist.findByIdAndDelete(req.params.id);
        res.json({ message: 'Артист удален' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при удалении артиста' });
    }
});


// --- АЛЬБОМЫ ---
router.put('/content/albums/:id', upload.single('coverArt'), async (req, res) => {
    try {
        const { title, artistId, genre, releaseDate } = req.body;
        const parsedGenre = genre ? JSON.parse(genre) : [];
        const updateData = { title, artist: artistId, genre: parsedGenre, releaseDate: releaseDate || null };
        
        if (req.file) {
            updateData.coverArtUrl = req.file.path;
        }

        const updatedAlbum = await Album.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!updatedAlbum) return res.status(404).json({ message: 'Альбом не найден' });
        
        res.json(updatedAlbum);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при обновлении альбома' });
    }
});

router.put('/content/albums/:id/reorder-tracks', async (req, res) => {
    try {
        const { trackIds } = req.body;
        await Album.findByIdAndUpdate(req.params.id, { tracks: trackIds });
        res.json({ message: 'Порядок треков обновлен.' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при обновлении порядка треков.' });
    }
});


router.delete('/content/albums/:id', async (req, res) => {
    try {
        await Album.findByIdAndDelete(req.params.id);
        res.json({ message: 'Альбом удален' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при удалении альбома' });
    }
});


// --- ТРЕКИ ---
const formParser = multer();
router.put('/content/tracks/:id', formParser.none(), async (req, res) => {
    try {
        const { title, artistIds, albumId, genres, isExplicit, releaseDate } = req.body;
        
        const parsedArtistIds = typeof artistIds === 'string' ? JSON.parse(artistIds) : (artistIds || []);
        
        const parsedGenres = typeof genres === 'string' ? JSON.parse(genres) : (genres || []);

        const updateData = { 
            title, 
            artist: parsedArtistIds, 
            album: albumId || null, 
            genres: parsedGenres,
            isExplicit: isExplicit === 'true',
            releaseDate: releaseDate || null,
            status: 'approved',
            type: 'library_track'
        };

        const updatedTrack = await Track.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!updatedTrack) return res.status(404).json({ message: 'Трек не найден' });
        
        res.json(updatedTrack);
    } catch (error) {
        console.error("Ошибка при обновлении трека:", error);
        res.status(500).json({ message: 'Ошибка при обновлении трека' });
    }
});


router.delete('/content/tracks/:id', async (req, res) => {
    try {
        const track = await Track.findById(req.params.id);
        if (!track) {
            return res.status(404).json({ message: 'Трек не найден' });
        }

        if (track.storageKey) {
            const urlParts = track.storageKey.split('/');
            const publicIdWithFormat = urlParts.slice(urlParts.indexOf('upload') + 2).join('/');
            const publicId = publicIdWithFormat.substring(0, publicIdWithFormat.lastIndexOf('.'));
            await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
        }

        if (track.albumArtUrl && !track.album) {
            const urlParts = track.albumArtUrl.split('/');
            const publicIdWithFormat = urlParts.slice(urlParts.indexOf('upload') + 2).join('/');
            const publicId = publicIdWithFormat.substring(0, publicIdWithFormat.lastIndexOf('.'));
            await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
        }

        if (track.album) {
            await Album.updateOne({ _id: track.album }, { $pull: { tracks: track._id } });
        }
        
        await Playlist.updateMany({}, { $pull: { tracks: track._id } });
        
        await Track.findByIdAndDelete(req.params.id);

        res.json({ message: 'Трек удален' });
    } catch (error) {
        console.error("Ошибка при удалении трека:", error);
        res.status(500).json({ message: 'Ошибка при удалении трека' });
    }
});

// Получить список всех пользователей
router.get('/users', async (req, res) => {
    try {
        const { page = 1, limit = 15, search = '' } = req.query;
        const query = {};
        if (search) {
            query.$or = [
                { username: { $regex: search, $options: 'i' } },
                { fullName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const users = await User.find(query)
            .select('username fullName email createdAt banInfo role') // Добавили role
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await User.countDocuments(query);

        res.json({
            items: users,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page)
        });
    } catch (error) {
        res.status(500).json({ message: "Ошибка загрузки пользователей" });
    }
});

router.post('/users/:id/ban', async (req, res) => {
    try {
        const userToBan = await User.findById(req.params.id);
        if (!userToBan) return res.status(404).json({ message: 'Пользователь не найден.' });
        
        if (['junior_admin', 'super_admin'].includes(userToBan.role)) {
            return res.status(403).json({ message: 'Нельзя забанить другого администратора.' });
        }

        const { isBanned, banReason, banExpires } = req.body;
        userToBan.banInfo = { isBanned, banReason, banExpires };
        await userToBan.save();
        
        if (userToBan) {
            req.broadcastToUsers([userToBan._id.toString()], {
                type: 'ACCOUNT_STATUS_CHANGED',
                payload: { banInfo: userToBan.banInfo }
            });
        }

        res.json({ message: isBanned ? 'Пользователь заблокирован' : 'Блокировка снята', user: userToBan });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при обновлении статуса пользователя' });
    }
});

router.delete('/users/:id', superAdminMiddleware, async (req, res) => {
    try {
        const userToDelete = await User.findById(req.params.id);
        if (!userToDelete) return res.status(404).json({ message: "Пользователь не найден." });
        
        // Здесь должна быть ваша полная логика по очистке связанных данных
        await Post.deleteMany({ user: userToDelete._id });
        await Comment.deleteMany({ author: userToDelete._id });
        
        await userToDelete.deleteOne();

        res.json({ message: `Аккаунт пользователя ${userToDelete.username} был удален.` });
    } catch (error) {
        console.error("Ошибка удаления аккаунта:", error);
        res.status(500).json({ message: "Ошибка сервера при удалении аккаунта." });
    }
});

router.post('/users/:id/grant-premium', superAdminMiddleware, async (req, res) => {
    try {
        const { durationMonths } = req.body;
        if (![1, 3, 6, 12].includes(durationMonths)) {
            return res.status(400).json({ message: 'Неверный срок подписки.' });
        }
        
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'Пользователь не найден.' });

        const now = new Date();
        const currentExpiresAt = user.premium?.expiresAt;
        const startDate = (currentExpiresAt && currentExpiresAt > now) ? currentExpiresAt : now;
        
        const newExpiresAt = new Date(startDate);
        newExpiresAt.setMonth(newExpiresAt.getMonth() + durationMonths);

        user.premium = {
            isActive: true,
            expiresAt: newExpiresAt,
            plan: `${durationMonths}_month_admin_grant`
        };

        await user.save();
        
        req.broadcastToUsers([user._id.toString()], {
            type: 'PREMIUM_STATUS_UPDATED',
            payload: user.premium
        });

        res.json({ message: `Premium выдан пользователю ${user.username} до ${newExpiresAt.toLocaleDateString('ru-RU')}.` });

    } catch (error) {
        console.error("Ошибка выдачи Premium:", error);
        res.status(500).json({ message: "Ошибка сервера при выдаче Premium." });
    }
});

router.post('/albums/:albumId/batch-upload-tracks', upload.array('trackFiles', 20), async (req, res) => {
    try {
        const { albumId } = req.params;
        const { tracksMetadata } = req.body;

        const album = await Album.findById(albumId);
        if (!album) {
            return res.status(404).json({ message: 'Альбом не найден.' });
        }

        const parsedMetadata = JSON.parse(tracksMetadata);

        const newTracks = await Promise.all(req.files.map(async (file, index) => {
            const meta = parsedMetadata[index];
            const newTrack = new Track({
                title: meta.title,
                artist: meta.artistIds,
                album: albumId,
                durationMs: meta.durationMs,
                isExplicit: meta.isExplicit,
                releaseDate: album.releaseDate || new Date(),
                storageKey: file.path,
                status: 'approved',
                createdBy: req.user._id,
                reviewedBy: req.user._id,
                type: 'library_track'
            });
            return newTrack.save();
        }));

        const newTrackIds = newTracks.map(track => track._id);
        await Album.updateOne({ _id: albumId }, { $push: { tracks: { $each: newTrackIds } } });

        res.status(201).json({ message: `${newTracks.length} треков успешно добавлены в альбом.` });
    } catch (error) {
        console.error("Ошибка при пакетной загрузке треков:", error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});


router.get('/albums/:albumId/tracks', async (req, res) => {
    try {
        const { albumId } = req.params;
        const album = await Album.findById(albumId)
            .populate({
                path: 'tracks',
                populate: { path: 'artist', select: 'name premium premiumCustomization' }
            });
        
        if (!album) {
            return res.status(404).json({ message: "Альбом не найден" });
        }
        res.json(album.tracks);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при загрузке треков альбома.' });
    }
});

module.exports = router;