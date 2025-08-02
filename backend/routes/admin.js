// backend/routes/admin.js

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const authMiddleware = require('../middleware/auth.middleware');
const adminMiddleware = require('../middleware/admin.middleware');

// Модели
const Artist = require('../models/Artist');
const Album = require('../models/Album');
const Track = require('../models/Track');
const Submission = require('../models/Submission');
const User = require('../models/User');

// --- ИЗМЕНЕНИЕ 1: Меняем импорты и настройку Multer ---
const multer = require('multer');
const { createStorage } = require('../config/cloudinary');

// Создаем хранилище для файлов, которые загружает админ.
// Они будут помещены в папку 'music' на Cloudinary.
const adminStorage = createStorage('music');
const upload = multer({ storage: adminStorage });
// --- КОНЕЦ ИЗМЕНЕНИЯ 1 ---


// Защищаем все роуты в этом файле - только для авторизованных админов
router.use(authMiddleware, adminMiddleware);

// --- РОУТЫ ДЛЯ МОДЕРАЦИИ (остаются без изменений) ---

// Получить список всех заявок на проверку
router.get('/submissions', async (req, res) => {
    try {
        const submissions = await Submission.find({ status: 'pending' })
            .populate('submittedBy', 'username')
            .sort({ createdAt: -1 });
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

        if (submission.action === 'create') {
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

// Отклонить заявку
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


// --- РОУТЫ ДЛЯ ПРЯМОГО УПРАВЛЕНИЯ КОНТЕНТОМ (только для админов) ---

// Создать артиста напрямую
router.post('/artists', upload.single('avatar'), async (req, res) => {
    try {
        const { name, description, tags } = req.body;
        const newArtist = new Artist({
            name,
            description,
            tags: tags ? tags.split(',').map(t => t.trim()) : [],
            // --- ИЗМЕНЕНИЕ 2: Используем req.file.path для URL из Cloudinary ---
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
router.post('/tracks', upload.single('trackFile'), async (req, res) => {
     try {
        // --- ИЗМЕНЕНИЕ: Парсим genres из JSON ---
        const { title, artistId, albumId, durationMs, genres } = req.body;
        const parsedGenres = genres ? JSON.parse(genres) : [];
        // --- КОНЕЦ ИЗМЕНЕНИЯ ---

        if (!req.file) {
            return res.status(400).json({ message: 'Аудиофайл не загружен.' });
        }
        
        const newTrack = new Track({
            title,
            artist: artistId,
            album: albumId || null,
            durationMs,
            genres: parsedGenres, // Сохраняем массив
            storageKey: req.file.path,
            status: 'approved',
            createdBy: req.user._id,
            reviewedBy: req.user._id,
        });
        await newTrack.save();

        if (albumId) {
            await Album.updateOne({ _id: albumId }, { $addToSet: { tracks: newTrack._id } });
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
        const { title, artistId } = req.body;
        
        const newAlbum = new Album({
            title,
            artist: artistId,
            // --- ИЗМЕНЕНИЕ 4: Используем req.file.path ---
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
        
        // Ищем только треки, у которых нет альбома (album is null)
        const query = { status: 'approved', album: null };
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
            // TODO: Удалить старый аватар из Cloudinary, если он был
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
        // TODO: Перед удалением артиста нужно решить, что делать с его альбомами и треками
        // Например, удалить их тоже или оставить "без автора". Пока просто удаляем.
        await Artist.findByIdAndDelete(req.params.id);
        res.json({ message: 'Артист удален' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при удалении артиста' });
    }
});


// --- АЛЬБОМЫ ---
router.put('/content/albums/:id', upload.single('coverArt'), async (req, res) => {
    try {
        const { title, artistId, genre } = req.body;
        const updateData = { title, artist: artistId, genre };
        
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

router.delete('/content/albums/:id', async (req, res) => {
    try {
        // TODO: Удалить треки из этого альбома
        await Album.findByIdAndDelete(req.params.id);
        res.json({ message: 'Альбом удален' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при удалении альбома' });
    }
});


// --- ТРЕКИ ---
router.put('/content/tracks/:id', async (req, res) => {
    try {
        const { title, artistId, albumId, genres } = req.body;
        const updateData = { title, artist: artistId, album: albumId || null, genres: genres || [] };

        const updatedTrack = await Track.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!updatedTrack) return res.status(404).json({ message: 'Трек не найден' });
        
        res.json(updatedTrack);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при обновлении трека' });
    }
});

router.delete('/content/tracks/:id', async (req, res) => {
    try {
        // TODO: Удалить файл трека из Cloudinary
        await Track.findByIdAndDelete(req.params.id);
        res.json({ message: 'Трек удален' });
    } catch (error) {
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
            .select('username fullName email createdAt banInfo')
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

// Забанить/разбанить пользователя
router.post('/users/:id/ban', async (req, res) => {
    try {
        const { isBanned, banReason, banExpires } = req.body;
        const updatedUser = await User.findByIdAndUpdate(req.params.id, { $set: { 'banInfo.isBanned': isBanned, 'banInfo.banReason': banReason, 'banInfo.banExpires': banExpires } }, { new: true });
        res.json(updatedUser);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при обновлении статуса пользователя' });
    }
});

module.exports = router;