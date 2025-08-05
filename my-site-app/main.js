// main.js

// Подключаем необходимые модули из Electron
const { app, BrowserWindow } = require('electron');
const path = require('path');

// Функция для создания главного окна приложения
const createWindow = () => {
  // Создаем новое окно браузера
  const win = new BrowserWindow({
    width: 1280, 
    height: 720,

    minWidth: 800,
    minHeight: 600,

    // 2. Настройки для веб-содержимого
    webPreferences: {
      // Отключаем инструменты разработчика (F12)
      devTools: false, 
      // Дополнительные меры безопасности
      preload: path.join(__dirname, 'preload.js') // Мы создадим этот файл позже
    },
 
    icon: path.join(__dirname, 'icon.ico') 
  });

  win.loadURL('https://flowme-dfaj.onrender.com/profile');

  // Убираем стандартное меню приложения (Файл, Правка и т.д.)
  win.removeMenu();
  
  // 3. Отключаем контекстное меню (вызываемое правой кнопкой мыши)
  win.webContents.on('context-menu', (e) => {
    e.preventDefault();
  });
};

// Запускаем функцию createWindow, когда приложение будет готово
app.whenReady().then(() => {
  createWindow();

  // Обработчик для macOS
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Закрываем приложение, когда все окна закрыты (кроме macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});