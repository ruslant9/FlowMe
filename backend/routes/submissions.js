// backend/routes/submissions.js

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const Submission = require('../models/Submission');

// Настройка Multer для Cloudflare R2
const multer = require('multer');
const { S3Client } = require('@aws-sdk/client-s3');
const multerS3 = require('multer-s3');

const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

// Middleware для загрузки файлов. Заявки храним в отдельной папке 'submissions' в R2, чтобы отличать от финальных файлов.
const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.R2_BUCKET_NAME,
        acl: 'public-read', // Файлы будут доступны по прямой ссылке
        metadata: function (req, file, cb) {
            cb(null, { fieldName: file.fieldname });
        },
        key: function (req, file, cb) {
            const safeFilename = file.originalname.replace(/\s+/g, '-');
            cb(null, `submissions/${Date.now().toString()}-${safeFilename}`);
        }
    })
});

// Все роуты в этом файле требуют только авторизации пользователя (не админа)
router.use(authMiddleware);

// 1. Создать заявку на нового артиста
router.post('/artists', upload.single('avatar'), async (req, res) => {
    try {
        const { name, description, tags } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Имя артиста обязательно для заполнения.' });
        }

        const submission = new Submission({
            entityType: 'Artist',
            action: 'create',
            submittedBy: req.user.userId,
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
        console.error("Ошибка при создании заявки на артиста:", error);
        res.status(500).json({ message: 'Ошибка сервера при создании заявки.' });
    }
});

// 2. Создать заявку на новый альбом
router.post('/albums', upload.single('coverArt'), async (req, res) => {
    try {
        const { title, artistId } = req.body;
        if (!title || !artistId) {
            return res.status(400).json({ message: 'Название альбома и артист обязательны.' });
        }
        
        const submission = new Submission({
            entityType: 'Album',
            action: 'create',
            submittedBy: req.user.userId,
            data: {
                title,
                artist: artistId,
                coverArtUrl: req.file ? req.file.key : null
            }
        });
        await submission.save();
        res.status(201).json({ message: 'Заявка на создание альбома отправлена на проверку.' });
    } catch (error) {
        console.error("Ошибка при создании заявки на альбом:", error);
        res.status(500).json({ message: 'Ошибка сервера при создании заявки.' });
    }
});

// 3. Создать заявку на новый трек
router.post('/tracks', upload.single('trackFile'), async (req, res) => {
    try {
        const { title, artistId, albumId, durationMs } = req.body;
        
        if (!title || !artistId) {
            return res.status(400).json({ message: 'Название трека и артист обязательны.' });
        }
        if (!req.file) {
            return res.status(400).json({ message: 'Аудиофайл не загружен.' });
        }

        const submission = new Submission({
            entityType: 'Track',
            action: 'create',
            submittedBy: req.user.userId,
            data: {
                title,
                artist: artistId,
                album: albumId || null,
                durationMs: durationMs || 0,
                storageKey: req.file.key // .key из multer-s3
            }
        });
        await submission.save();
        res.status(201).json({ message: 'Заявка на добавление трека отправлена на проверку.' });
    } catch (error) {
        console.error("Ошибка при создании заявки на трек:", error);
        res.status(500).json({ message: 'Ошибка сервера при создании заявки.' });
    }
});


// TODO: В будущем можно добавить роуты для заявок на редактирование
// router.post('/artists/:id/edit', upload.single('avatar'), async (req, res) => { ... });

module.exports = router;