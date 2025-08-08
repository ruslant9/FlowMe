// frontend/src/main.jsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ModalProvider } from './context/ModalContext.jsx';
import { WebSocketProvider } from './context/WebSocketContext.jsx';
import { UserProvider } from './context/UserContext.jsx';
import { NotificationProvider } from './context/NotificationContext.jsx';
import { MusicPlayerProvider } from './context/MusicPlayerContext.jsx';
import { EmojiPickerProvider } from './context/EmojiPickerProvider.jsx';
import axios from 'axios';

import './index.css';
import 'tippy.js/dist/tippy.css';
import './styles/cropper-custom.css';
import './styles/datepicker-custom.css';
import 'rc-slider/assets/index.css';

axios.defaults.withCredentials = true;

const token = localStorage.getItem('token');
if (token) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      {/* --- ОБАРАЧИВАЕМ ВСЕ ОСТАЛЬНЫЕ ПРОВАЙДЕРЫ --- */}
      <EmojiPickerProvider>
        <UserProvider>
          <NotificationProvider>
            <MusicPlayerProvider> 
              <WebSocketProvider>
                <ModalProvider>
                  <App />
                </ModalProvider>
              </WebSocketProvider>
            </MusicPlayerProvider>
          </NotificationProvider>
        </UserProvider>
      </EmojiPickerProvider>
      <Toaster 
        position="bottom-right"
        toastOptions={{
          className: 'dark:bg-gray-700 dark:text-white',
        }}
      />
    </BrowserRouter>
  </React.StrictMode>,
);