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
const Playlist = require('../models/Playlist');
const Conversation = require('../models/Conversation'); 

const multer = require('multer');
const { createStorage, cloudinary } = require('../config/cloudinary');

// Создаем хранилище для файлов, которые загружает админ.
const adminStorage = createStorage('music');
const upload = multer({ storage: adminStorage });


// Защищаем все роуты в этом файле - только для авторизованных админов
router.use(authMiddleware, adminMiddleware);

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
// --- КОНЕЦ ИСПРАВЛЕНИЯ ---


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
        
        if (updatedUser) {
            req.broadcastToUsers([updatedUser._id.toString()], {
                type: 'ACCOUNT_STATUS_CHANGED',
                payload: { banInfo: updatedUser.banInfo }
            });
        }

        res.json(updatedUser);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при обновлении статуса пользователя' });
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