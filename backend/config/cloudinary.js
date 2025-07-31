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
            folder: folderName,
            allowed_formats: ['jpeg', 'png', 'jpg', 'webp'],
            // Можно добавить трансформации, например, для аватаров
            // transformation: [{ width: 500, height: 500, crop: 'limit' }]
        }
    });
};

module.exports = {
    cloudinary,
    createStorage
};