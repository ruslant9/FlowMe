// backend/routes/submissions.js

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const Submission = require('../models/Submission');
const multer = require('multer');
const { createStorage } = require('../config/cloudinary');
const submissionStorage = createStorage('submissions'); 
const upload = multer({ storage: submissionStorage });
const Artist = require('../models/Artist');
const { sanitize } = require('../utils/sanitize');

// 1. Создать заявку на нового артиста
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

// --- НАЧАЛО ИСПРАВЛЕНИЯ ---
// 2. Создать заявку на новый альбом
router.post('/albums', upload.single('coverArt'), async (req, res) => {
    try {
        const { title, artistId, genre, releaseDate } = req.body;
        if (!title || !artistId || !genre) {
            return res.status(400).json({ message: 'Название альбома, артист и жанр обязательны.' });
        }
        
        const submission = new Submission({
            entityType: 'Album',
            action: 'create',
            submittedBy: req.user.userId,
            data: {
                title,
                artist: artistId,
                genre,
                releaseDate: releaseDate || null,
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
// --- КОНЕЦ ИСПРАВЛЕНИЯ ---


// 3. Создать заявку на новый трек
router.post('/tracks', upload.fields([{ name: 'trackFile', maxCount: 1 }, { name: 'coverArt', maxCount: 1 }]), async (req, res) => {
    try {
        const { title, artistIds, albumId, durationMs, genres, releaseDate, isExplicit } = req.body;
        const parsedArtistIds = artistIds ? JSON.parse(artistIds) : [];
        const parsedGenres = genres ? JSON.parse(genres) : [];
        
        if (!title || !parsedArtistIds || parsedArtistIds.length === 0) {
            return res.status(400).json({ message: 'Название трека и исполнитель обязательны.' });
        }
        if (!req.files || !req.files.trackFile) {
            return res.status(400).json({ message: 'Аудиофайл не загружен.' });
        }

        const submission = new Submission({
            entityType: 'Track',
            action: 'create',
            submittedBy: req.user.userId,
            data: {
                title,
                artist: parsedArtistIds,
                album: albumId || null,
                durationMs: durationMs || 0,
                genres: parsedGenres,
                isExplicit: isExplicit === 'true',
                releaseDate: releaseDate || null,
                storageKey: req.files.trackFile[0].path,
                albumArtUrl: albumId ? null : (req.files.coverArt?.[0]?.path || null)
            }
        });
        await submission.save();
        res.status(201).json({ message: 'Заявка на добавление трека отправлена на проверку.' });
    } catch (error) {
        console.error("Ошибка при создании заявки на трек:", error);
        res.status(500).json({ message: 'Ошибка сервера при создании заявки.' });
    }
});

router.post('/appeal', async (req, res) => {
    try {
        const { appealText } = req.body;
        const sanitizedAppealText = sanitize(appealText);

        if (!sanitizedAppealText || sanitizedAppealText.trim().length < 10) {
            return res.status(400).json({ message: 'Текст жалобы должен содержать не менее 10 символов.' });
        }

        const userId = req.user.userId;

        const existingAppeal = await Submission.findOne({
            submittedBy: userId,
            entityType: 'BanAppeal',
            status: 'pending'
        });

        if (existingAppeal) {
            return res.status(400).json({ message: 'Вы уже подали жалобу. Ожидайте решения администратора.' });
        }

        const submission = new Submission({
            entityType: 'BanAppeal',
            action: 'appeal',
            submittedBy: userId,
            data: {
                appealText: sanitizedAppealText,
            }
        });

        await submission.save();
        res.status(201).json({ message: 'Ваша жалоба отправлена на рассмотрение.' });

    } catch (error) {
        console.error("Ошибка при подаче жалобы:", error.message, error.stack);
        res.status(500).json({ message: 'Ошибка сервера при отправке жалобы.' });
    }
});

module.exports = router;