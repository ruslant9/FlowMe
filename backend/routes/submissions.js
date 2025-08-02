// backend/routes/submissions.js

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const Submission = require('../models/Submission');
const multer = require('multer');

// Импортируем нашу новую конфигурацию Cloudinary
const { createStorage } = require('../config/cloudinary');

// Создаем хранилище для файлов, которые отправляются на модерацию.
// Они будут помещены в папку 'submissions' на вашем Cloudinary.
const submissionStorage = createStorage('submissions'); 
const upload = multer({ storage: submissionStorage });

// Все роуты в этом файле требуют только авторизации пользователя (не админа)
router.use(authMiddleware);

// 1. Создать заявку на нового артиста
// Middleware upload.single('avatar') перехватывает файл из поля 'avatar'
router.post('/artists', upload.single('avatar'), async (req, res) => {
    try {
        const { name, description, tags } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Имя артиста обязательно для заполнения.' });
        }

        const existingArtist = await Artist.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
        if (existingArtist) {
            return res.status(400).json({ message: 'Артист с таким именем уже существует.' });
        }
        
        const submission = new Submission({
            entityType: 'Artist',
            action: 'create',
            submittedBy: req.user.userId,
            data: {
                name,
                description,
                tags: tags ? tags.split(',').map(t => t.trim()) : [],
                // req.file.path содержит полный HTTPS URL от Cloudinary
                avatarUrl: req.file ? req.file.path : null 
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
                coverArtUrl: req.file ? req.file.path : null
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
                // Для аудиофайлов Cloudinary также вернет URL в req.file.path
                storageKey: req.file.path 
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