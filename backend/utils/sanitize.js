// backend/utils/sanitize.js
const sanitizeHtml = require('sanitize-html');

// Настраиваем нашу функцию очистки.
// По умолчанию она удаляет ВСЕ HTML-теги, что является самым безопасным вариантом.
const sanitize = (dirty) => {
    if (!dirty) return dirty;
    return sanitizeHtml(dirty, {
        allowedTags: [],
        allowedAttributes: {},
    });
};

module.exports = { sanitize };