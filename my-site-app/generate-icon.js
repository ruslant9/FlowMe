// generate-icon.js
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, 'favicon.svg');
const outputPath = path.join(__dirname, 'icon.ico');

sharp(inputPath)
  .resize(256, 256)
  .toFile(outputPath)
  .then(() => console.log('Иконка успешно сгенерирована: icon.ico'))
  .catch(err => console.error('Ошибка при генерации .ico:', err));
