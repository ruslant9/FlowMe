// backend/routes/workshop.js

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const authMiddleware = require('../middleware/auth.middleware');
const premiumMiddleware = require('../middleware/premium.middleware');
const ContentPack = require('../models/ContentPack');
const User = require('../models/User');
const { createStorage, cloudinary } = require('../config/cloudinary');
const multer = require('multer');
const sharp = require('sharp');
const ColorThief = require('colorthief');
const { Readable } = require('stream');

const memoryStorage = multer.memoryStorage();
const upload = multer({ storage: memoryStorage });

const processSticker = async (buffer) => {
    try {
        const image = sharp(buffer);
        const resizedImageBuffer = await image
            .resize({
                width: 300,
                height: 300,
                fit: 'inside',
                withoutEnlargement: true
            })
            .toBuffer();
        const finalBuffer = await sharp({
            create: {
                width: 300,
                height: 300,
                channels: 4,
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            }
        })
        .composite([{ input: resizedImageBuffer }])
        .webp({ quality: 90 })
        .toBuffer();
        return finalBuffer;
    } catch (error) {
        console.error("Ошибка обработки стикера:", error);
        return buffer;
    }
};

const processAndUpload = (req, res, next) => {
    if (!req.files || req.files.length === 0) {
        return next();
    }
    const type = req.body.type || 'sticker';
    const uploadPromises = req.files.map(file => new Promise(async (resolve, reject) => {
        let bufferToUpload = file.buffer;
        if (type === 'sticker') {
            bufferToUpload = await processSticker(file.buffer);
        }
        const uploadStream = cloudinary.uploader.upload_stream(
            { folder: 'content_packs', resource_type: 'image' },
            (error, result) => {
                if (error) return reject(error);
                file.path = result.secure_url;
                file.filename = result.public_id;
                resolve();
            }
        );
        Readable.from(bufferToUpload).pipe(uploadStream);
    }));
    Promise.all(uploadPromises)
        .then(() => next())
        .catch(err => {
            console.error("Ошибка загрузки в Cloudinary:", err);
            res.status(500).json({ message: "Ошибка загрузки файлов." });
        });
};

router.post('/packs', authMiddleware, premiumMiddleware, upload.array('items', 20), processAndUpload, async (req, res) => {
    try {
        const { name, type, isPremiumOnly } = req.body;
        if (!name || !type || !['emoji', 'sticker'].includes(type)) {
            return res.status(400).json({ message: 'Неверные данные для создания пака.' });
        }
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'Добавьте хотя бы один файл.' });
        }
        const newPack = new ContentPack({
            name,
            type,
            creator: req.user.userId,
            isPremiumOnly: type === 'emoji' ? (isPremiumOnly === 'true') : false,
            items: req.files.map(file => ({ imageUrl: file.path }))
        });
        await newPack.save();
        res.status(201).json(newPack);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка создания пака.' });
    }
});

router.get('/packs/my', authMiddleware, async (req, res) => {
    try {
        const { type } = req.query;
        const query = { creator: req.user.userId };
        if (type && ['sticker', 'emoji'].includes(type)) {
            query.type = type;
        }
        const packs = await ContentPack.find(query).sort({ createdAt: -1 });
        res.json(packs);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка загрузки созданных паков.' });
    }
});

// --- НАЧАЛО ИЗМЕНЕНИЯ ---
router.get('/packs/added', authMiddleware, async (req, res) => {
    try {
        const { type } = req.query;
        const userId = req.user.userId;

        // 1. Находим паки, которые пользователь добавил
        const user = await User.findById(userId).populate({
            path: 'addedContentPacks',
            populate: { path: 'creator', select: 'username fullName' }
        });
        const addedPacks = user.addedContentPacks;

        // 2. Находим паки, которые пользователь создал
        const createdPacks = await ContentPack.find({ creator: userId })
            .populate('creator', 'username fullName');

        // 3. Объединяем их и убираем дубликаты
        const allPacksMap = new Map();
        [...addedPacks, ...createdPacks].forEach(pack => {
            allPacksMap.set(pack._id.toString(), pack);
        });

        let finalPacks = Array.from(allPacksMap.values());

        // 4. Применяем фильтр по типу, если он есть
        if (type && ['sticker', 'emoji'].includes(type)) {
            finalPacks = finalPacks.filter(pack => pack.type === type);
        }

        // 5. Сортируем (например, по дате создания)
        finalPacks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json(finalPacks);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка загрузки добавленных паков.' });
    }
});
// --- КОНЕЦ ИЗМЕНЕНИЯ ---


router.get('/packs/search', authMiddleware, async (req, res) => {
    const { q = '', page = 1, type } = req.query;
    const limit = 12;
    const skip = (page - 1) * limit;
    try {
        const query = { isPublic: true };
        if (q) {
            query.name = { $regex: q, $options: 'i' };
        }
        if (type && ['sticker', 'emoji'].includes(type)) {
            query.type = type;
        }
        const packs = await ContentPack.find(query)
            .populate('creator', 'username fullName')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        const total = await ContentPack.countDocuments(query);
        res.json({
            packs,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page)
        });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при поиске паков.' });
    }
});

const canModifyPack = async (req, res, next) => {
    try {
        const pack = await ContentPack.findById(req.params.packId).populate('creator');
        if (!pack) {
            return res.status(404).json({ message: 'Пак не найден.' });
        }
        if (pack.creator.email === 'flowme.system@flowme.com') {
            return res.status(403).json({ message: 'Стандартные паки нельзя редактировать или удалять.' });
        }
        if (pack.creator._id.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Нет прав для управления этим паком.' });
        }
        req.pack = pack;
        next();
    } catch (error) {
        res.status(500).json({ message: 'Ошибка проверки прав на пак.' });
    }
};

router.put('/packs/:packId', authMiddleware, premiumMiddleware, canModifyPack, upload.array('newItems', 10), processAndUpload, async (req, res) => {
    try {
        const { name, itemsToDelete, isPremiumOnly } = req.body;
        const pack = req.pack;

        if (name) pack.name = name;
        if (itemsToDelete) {
            const toDelete = JSON.parse(itemsToDelete);
            pack.items = pack.items.filter(item => !toDelete.includes(item._id.toString()));
        }
        if (req.files) {
            const newItems = req.files.map(file => ({ imageUrl: file.path }));
            pack.items.push(...newItems);
        }
        if (isPremiumOnly !== undefined && pack.type === 'emoji') {
            pack.isPremiumOnly = isPremiumOnly === 'true';
        }
        await pack.save();
        res.json(pack);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка обновления пака.' });
    }
});

router.delete('/packs/:packId', authMiddleware, premiumMiddleware, canModifyPack, async (req, res) => {
    try {
        await req.pack.deleteOne();
        await User.updateMany({}, { $pull: { addedContentPacks: req.pack._id } });
        res.json({ message: 'Пак успешно удален.' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка удаления пака.' });
    }
});

router.post('/packs/:packId/add', authMiddleware, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.user.userId, {
            $addToSet: { addedContentPacks: req.params.packId }
        });
        res.json({ message: 'Пак добавлен.' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при добавлении пака.' });
    }
});

router.delete('/packs/:packId/add', authMiddleware, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.user.userId, {
            $pull: { addedContentPacks: req.params.packId }
        });
        res.json({ message: 'Пак удален из вашей библиотеки.' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при удалении пака.' });
    }
});

module.exports = router;