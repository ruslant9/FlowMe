// backend/utils/validation.js

function isValidAccentUrl(url) {
    if (!url || typeof url !== 'string') {
        return false;
    }

    // 1. Проверяем, является ли это валидным HEX-цветом
    const hexRegex = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
    if (hexRegex.test(url)) {
        return true;
    }

    // 2. Проверяем, является ли это валидным URL на изображение
    try {
        const parsedUrl = new URL(url);
        // Разрешаем только безопасные протоколы
        if (!['http:', 'https:', 'data:'].includes(parsedUrl.protocol)) {
            return false;
        }

        // Проверяем расширение файла в пути
        const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'];
        const pathname = parsedUrl.pathname.toLowerCase();
        
        return imageExtensions.some(ext => pathname.endsWith(ext));

    } catch (error) {
        // Если new URL() выдает ошибку, значит, это невалидный URL
        return false;
    }
}

module.exports = { isValidAccentUrl };