// frontend/src/components/chat/MessageInput.jsx

import React, { useState, useRef, useEffect } from 'react';
import { Send, Smile, X, Paperclip, Check, Loader2, Music, XCircle } from 'lucide-react';
import Picker from 'emoji-picker-react';
import { useWebSocket } from '../../context/WebSocketContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import AttachTrackModal from '../music/AttachTrackModal';
import AttachedTrack from '../music/AttachedTrack';

const API_URL = import.meta.env.VITE_API_URL;

const MessageInput = ({ conversationId, recipientId, onMessageSent, replyingTo, onClearReply, onFileSelect, editingMessage, onCancelEdit, onSaveEdit }) => {
    const [text, setText] = useState('');
    const [isPickerVisible, setPickerVisible] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [attachedTrack, setAttachedTrack] = useState(null);
    const [isAttachTrackModalOpen, setIsAttachTrackModalOpen] = useState(false);
    const pickerRef = useRef(null);
    const fileInputRef = useRef(null);
    const inputRef = useRef(null);
    const smileButtonRef = useRef(null);
    const { ws } = useWebSocket();
    const typingTimeoutRef = useRef(null);

    useEffect(() => {
        if (editingMessage) {
            setText(editingMessage.text);
        } else {
            setText('');
        }
    }, [editingMessage]);

    useEffect(() => {
        function handleClickOutside(event) {
            if (smileButtonRef.current && smileButtonRef.current.contains(event.target)) {
                return;
            }
            if (pickerRef.current && !pickerRef.current.contains(event.target)) {
                setPickerVisible(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const sendTypingStatus = (isTyping) => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'TYPING', payload: { conversationId, isTyping } }));
        }
    };

    const handleTextChange = (e) => {
        setText(e.target.value);
        if (editingMessage || isSending) return;
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        sendTypingStatus(true);
        typingTimeoutRef.current = setTimeout(() => { sendTypingStatus(false); }, 2000);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSending || (!text.trim() && !attachedTrack)) {
            if (!text.trim() && editingMessage && !attachedTrack) onCancelEdit();
            return;
        }

        setIsSending(true);

        if (editingMessage) {
            try {
                await onSaveEdit(editingMessage._id, text);
                setTimeout(() => inputRef.current?.focus(), 0);
            } finally {
                setIsSending(false);
            }
        } else {
            const messageText = text;
            const replyToId = replyingTo ? replyingTo._id : null;
            const trackId = attachedTrack ? attachedTrack._id : null;

            setText('');
            onClearReply();
            setPickerVisible(false);
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            setAttachedTrack(null);
            sendTypingStatus(false);
            
            try {
                const formData = new FormData();
                formData.append('recipientId', recipientId);
                formData.append('text', messageText);
                if (replyToId) { formData.append('replyToMessageId', replyToId); }
                if (trackId) { formData.append('attachedTrackId', trackId); }

                const token = localStorage.getItem('token');
                await axios.post(`${API_URL}/api/messages`, formData, { 
                    headers: { 
                        Authorization: `Bearer ${token}`, 
                        'Content-Type': 'multipart/form-data' 
                    } 
                });
                onMessageSent();
                setTimeout(() => inputRef.current?.focus(), 0);
            } catch (error) {
                toast.error("Не удалось отправить сообщение.");
                setText(messageText); // Возвращаем текст в поле ввода в случае ошибки
            } finally {
                setIsSending(false);
            }
        }
    };
    
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) { onFileSelect(file); }
        e.target.value = null; 
    };
    
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey && (text.trim() || attachedTrack)) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    return (
        <div className="p-2 border-t border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/50 relative">
            <AttachTrackModal
                isOpen={isAttachTrackModalOpen}
                onClose={() => setIsAttachTrackModalOpen(false)}
                onSelectTrack={(track) => {
                    setAttachedTrack(track);
                    setIsAttachTrackModalOpen(false);
                }}
            />
            <div ref={pickerRef} className="absolute bottom-full right-4 mb-2 z-20">
                {isPickerVisible && (
                    <Picker onEmojiClick={(emojiObject) => setText(prev => prev + emojiObject.emoji)} theme={document.documentElement.classList.contains('dark') ? "dark" : "light"} />
                )}
            </div>
            
            <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-2">
                {editingMessage && (
                    <div className="flex items-center text-sm px-2 pb-2">
                         <div className="w-0 flex-1 border-l-2 border-blue-500 pl-2">
                            <p className="font-semibold text-blue-500">Редактирование</p>
                            <p className="text-slate-500 dark:text-slate-400 truncate">{editingMessage.text || "Изображение"}</p>
                        </div>
                        <button onClick={onCancelEdit} className="p-1 text-slate-400 hover:text-slate-600"><X size={16}/></button>
                    </div>
                )}
                {replyingTo && !editingMessage && (
                    <div className="flex items-center text-sm px-2 pb-2">
                         <div className="w-0 flex-1 border-l-2 border-blue-500 pl-2 flex items-center space-x-2">
                            <div className="flex flex-col min-w-0">
                                <p className="font-semibold text-blue-500">Ответ на сообщение</p>
                                <p className="text-slate-500 dark:text-slate-400 truncate">
                                    {replyingTo.imageUrl && (
                                        <img 
                                            src={`${API_URL}/${replyingTo.imageUrl}`} 
                                            alt="Reply thumbnail" 
                                            className="inline-block w-8 h-8 object-cover rounded-md mr-2 align-middle" 
                                        />
                                    )}
                                    {replyingTo.text || (replyingTo.imageUrl ? "Изображение" : "Нет сообщений")}
                                </p>
                            </div>
                        </div>
                        <button onClick={onClearReply} className="p-1 text-slate-400 hover:text-slate-600"><X size={16}/></button>
                    </div>
                )}
                {attachedTrack && !editingMessage && (
                     <div className="px-2 pb-2">
                        <div className="p-2 bg-slate-200 dark:bg-slate-700/50 rounded-lg relative">
                             <AttachedTrack track={attachedTrack} />
                             <button onClick={() => setAttachedTrack(null)} className="absolute top-1 right-1 p-1 text-slate-400 hover:text-red-500 rounded-full bg-white/50 dark:bg-slate-800/50">
                                 <X size={16}/>
                             </button>
                        </div>
                    </div>
                )}
                
                <form onSubmit={handleSubmit} className="flex items-center space-x-2">
                    <button
                        type="button"
                        onClick={() => fileInputRef.current.click()}
                        disabled={!!editingMessage || isSending}
                        className="p-2 rounded-full text-slate-500 hover:text-blue-500 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                    >
                        <Paperclip size={20} />
                    </button>
                    <input
                        type="file" ref={fileInputRef} hidden
                        accept="image/*" onChange={handleFileChange}
                    />
                    <button
                        type="button"
                        onClick={() => setIsAttachTrackModalOpen(true)}
                        disabled={!!editingMessage || isSending || !!attachedTrack}
                        className="p-2 rounded-full text-slate-500 hover:text-purple-500 dark:text-slate-400 dark:hover:text-purple-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                    >
                        <Music size={20} />
                    </button>
                    
                    <input
                        ref={inputRef}
                        type="text"
                        value={text}
                        onChange={handleTextChange}
                        onKeyDown={handleKeyDown}
                        placeholder={editingMessage ? "Введите новый текст..." : "Напишите сообщение..."}
                        className="flex-1 bg-transparent px-2 py-1 text-sm focus:outline-none placeholder-slate-500 dark:placeholder-slate-400"
                        autoFocus={!!editingMessage}
                        disabled={isSending}
                    />

                    <button
                        ref={smileButtonRef}
                        type="button"
                        onClick={() => setPickerVisible(v => !v)}
                        disabled={isSending}
                        className="p-2 rounded-full text-slate-500 hover:text-blue-500 dark:text-slate-400 dark:hover:text-blue-400 disabled:opacity-50"
                    >
                        <Smile size={20} />
                    </button>
                    
                    <button
                        type="submit"
                        disabled={(!text.trim() && !attachedTrack) || isSending}
                        className="p-2.5 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 transition-colors flex-shrink-0"
                    >
                        {isSending ? <Loader2 size={20} className="animate-spin" /> : (editingMessage ? <Check size={20} /> : <Send size={20} />)}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default MessageInput;