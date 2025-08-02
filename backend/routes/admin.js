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

// Настройка Multer для загрузки в Cloudflare R2
const multer = require('multer');
const { S3Client } = require('@aws-sdk/client-s3');
const multerS3 = require('multer-s3');

// Инициализация S3 клиента для R2
const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

// Middleware для загрузки файлов
const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.R2_BUCKET_NAME,
        acl: 'public-read', // Файлы будут доступны по прямой ссылке
        metadata: function (req, file, cb) {
            cb(null, { fieldName: file.fieldname });
        },
        key: function (req, file, cb) {
            // Уникальное имя файла: music/1678886400000-cool-song.mp3
            cb(null, `music/${Date.now().toString()}-${file.originalname.replace(/\s+/g, '-')}`);
        }
    })
});

// Защищаем все роуты в этом файле - только для авторизованных админов
router.use(authMiddleware, adminMiddleware);

// --- РОУТЫ ДЛЯ МОДЕРАЦИИ ---

// 1. Получить список всех заявок на проверку
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

// 2. Одобрить заявку
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

// 3. Отклонить заявку
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

        // Если это была заявка на редактирование, нужно откатить статус у самой сущности
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


// --- РОУТЫ ДЛЯ СОЗДАНИЯ ЗАЯВОК ---

// Создать артиста (создает заявку)
router.post('/artists', upload.single('avatar'), async (req, res) => {
    try {
        const { name, description, tags } = req.body;
        const submission = new Submission({
            entityType: 'Artist',
            action: 'create',
            submittedBy: req.user._id,
            data: {
                name,
                description,
                tags: tags ? tags.split(',').map(t => t.trim()) : [],
                avatarUrl: req.file ? req.file.key : null // .key из multer-s3
            }
        });
        await submission.save();
        res.status(201).json({ message: 'Заявка на создание артиста отправлена на проверку.' });
    } catch (error) {
        console.error("Ошибка создания заявки на артиста:", error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Загрузить трек (создает заявку)
router.post('/tracks', upload.single('trackFile'), async (req, res) => {
    try {
        const { title, artistId, albumId, durationMs } = req.body;
        if (!req.file) {
            return res.status(400).json({ message: 'Аудиофайл не загружен.' });
        }

        const submission = new Submission({
            entityType: 'Track',
            action: 'create',
            submittedBy: req.user._id,
            data: {
                title,
                artist: artistId,
                album: albumId || null,
                durationMs,
                storageKey: req.file.key
            }
        });
        await submission.save();
        res.status(201).json({ message: 'Заявка на добавление трека отправлена на проверку.' });
    } catch (error) {
        console.error("Ошибка создания заявки на трек:", error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Создать альбом (создает заявку)
router.post('/albums', upload.single('coverArt'), async (req, res) => {
    try {
        const { title, artistId } = req.body;
        const submission = new Submission({
            entityType: 'Album',
            action: 'create',
            submittedBy: req.user._id,
            data: {
                title,
                artist: artistId,
                coverArtUrl: req.file ? req.file.key : null
            }
        });
        await submission.save();
        res.status(201).json({ message: 'Заявка на создание альбома отправлена.' });
    } catch (error) {
        console.error("Ошибка создания заявки на альбом:", error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

module.exports = router;