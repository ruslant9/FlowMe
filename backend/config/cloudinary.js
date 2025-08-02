// backend/config/cloudinary.js
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const createStorage = (folderName) => {
    return new CloudinaryStorage({
        cloudinary: cloudinary,
        params: {
            folder: folderName, // Папка на Cloudinary, куда будут загружаться файлы
            resource_type: 'auto', // Автоматически определять тип файла (image, video, raw для mp3)
            allowed_formats: ['jpeg', 'png', 'jpg', 'webp', 'mp3', 'wav'],
        }
    });
};

module.exports = {
    cloudinary,
    createStorage
};