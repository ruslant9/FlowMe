// frontend/src/hooks/useEmojiPicker.js --- НОВЫЙ ФАЙЛ ---

import { useContext } from 'react';
import { EmojiPickerContext } from '../context/EmojiPickerProvider';

export const useEmojiPicker = () => {
    const context = useContext(EmojiPickerContext);
    if (!context) {
        throw new Error('useEmojiPicker must be used within an EmojiPickerProvider');
    }
    return context;
};