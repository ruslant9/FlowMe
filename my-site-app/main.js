// main.js
const { app, BrowserWindow } = require('electron');
const path = require('path');
const createWindow = () => {
  const win = new BrowserWindow({
    width: 1280, 
    height: 720,

    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      devTools: false, 
      preload: path.join(__dirname, 'preload.js') 
    },
 
    icon: path.join(__dirname, 'icon.ico') 
  });

  win.loadURL('https://flowme-dfaj.onrender.com/profile');
  win.removeMenu();
  win.webContents.on('context-menu', (e) => {
    e.preventDefault();
  });
};
app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});