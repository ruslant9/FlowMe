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
        const { title, artistId, albumId, durationMs } = req.body;
        if (!req.file) {
            return res.status(400).json({ message: 'Аудиофайл не загружен.' });
        }
        
        const newTrack = new Track({
            title,
            artist: artistId,
            album: albumId || null,
            durationMs,
            // --- ИЗМЕНЕНИЕ 3: Используем req.file.path ---
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

// TODO: Роуты для редактирования сущностей админом
// router.put('/artists/:id', upload.single('avatar'), async (req, res) => { ... });

module.exports = router;