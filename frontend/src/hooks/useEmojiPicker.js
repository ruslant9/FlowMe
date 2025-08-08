// frontend/src/hooks/useEmojiPicker.js --- ИСПРАВЛЕННЫЙ ФАЙЛ ---

import { useContext } from 'react';
import { EmojiPickerContext } from '../context/EmojiPickerProvider';

export const useEmojiPicker = () => {
    const context = useContext(EmojiPickerContext);
    if (!context) {
        throw new Error('useEmojiPicker must be used within an EmojiPickerProvider');
    }
    // --- НАЧАЛО ИСПРАВЛЕНИЯ: Добавляем isOpen и hidePicker ---
    const { showPicker, hidePicker, isOpen } = context;
    return { showPicker, hidePicker, isOpen };
    // --- КОНЕЦ ИСПРАВЛЕНИЯ ---
};