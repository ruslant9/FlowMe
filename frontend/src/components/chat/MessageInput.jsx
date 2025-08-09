// frontend/src/components/chat/MessageInput.jsx --- ИСПРАВЛЕННЫЙ ФАЙЛ ---

import React, { useState, useRef, useEffect } from 'react';
import { Send, Smile, X, Paperclip, Check, Loader2, Music } from 'lucide-react';
import { useWebSocket } from '../../context/WebSocketContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import AttachTrackModal from '../music/AttachTrackModal';
import AttachedTrack from '../music/AttachedTrack';
import EmojiPickerPopover from '../EmojiPickerPopover';
import useMediaQuery from '../../hooks/useMediaQuery'; // 1. Импортируем хук

const API_URL = import.meta.env.VITE_API_URL;

const MessageInput = ({ conversationId, recipientId, onMessageSent, replyingTo, onClearReply, onFileSelect, editingMessage, onCancelEdit, onSaveEdit, onOptimisticSend, onSendFail, currentUser }) => {
    const [text, setText] = useState('');
    const [isPickerVisible, setPickerVisible] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [attachedTrack, setAttachedTrack] = useState(null);
    const [isAttachTrackModalOpen, setIsAttachTrackModalOpen] = useState(false);
    const fileInputRef = useRef(null);
    const inputRef = useRef(null);
    const smileButtonRef = useRef(null);
    const { ws } = useWebSocket();
    const typingTimeoutRef = useRef(null);
    
    // 2. Используем хук для определения мобильного устройства
    const isMobile = useMediaQuery('(max-width: 768px)');

    useEffect(() => {
        if (editingMessage) {
            setText(editingMessage.text);
        } else {
            setText('');
        }
    }, [editingMessage]);

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
            return;
        }
        
        const optimisticMessage = {
            uuid: crypto.randomUUID(),
            text: text.trim(),
            sender: {
                _id: currentUser._id,
                username: currentUser.username,
                fullName: currentUser.fullName,
                avatar: currentUser.avatar
            },
            createdAt: new Date().toISOString(),
            owner: currentUser._id,
            conversation: conversationId,
            isSending: true,
            replyTo: replyingTo,
            attachedTrack,
        };

        onOptimisticSend(optimisticMessage);

        setText('');
        onClearReply();
        setPickerVisible(false);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        sendTypingStatus(false);
        setAttachedTrack(null);
        
        try {
            const token = localStorage.getItem('token');
            const formData = new FormData();
            formData.append('recipientId', recipientId);
            formData.append('text', optimisticMessage.text);
            formData.append('uuid', optimisticMessage.uuid); 
            if (replyingTo) formData.append('replyToMessageId', replyingTo._id);
            if (attachedTrack) formData.append('attachedTrackId', attachedTrack._id);

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
            onSendFail(optimisticMessage.uuid); 
        } finally {
            setIsSending(false);
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
            <EmojiPickerPopover
                isOpen={isPickerVisible}
                targetRef={smileButtonRef}
                onEmojiClick={(emojiObject) => setText(prev => prev + emojiObject.emoji)}
                onClose={() => setPickerVisible(false)}
            />
            
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
                    
                    {/* 3. Оборачиваем кнопку в условный рендеринг */}
                    {!isMobile && (
                        <button
                            ref={smileButtonRef}
                            type="button"
                            onClick={(e) => { e.preventDefault(); setPickerVisible(v => !v); }}
                            disabled={isSending}
                            className="p-2 rounded-full text-slate-500 hover:text-blue-500 dark:text-slate-400 dark:hover:text-blue-400 disabled:opacity-50"
                        >
                            <Smile size={20} />
                        </button>
                    )}
                    
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