// frontend/src/components/chat/AttachmentsPanel.jsx
import React, { useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Loader2, X, Image as ImageIcon, Music } from 'lucide-react';
import { useCachedImage } from '../../hooks/useCachedImage';
import AttachedTrack from '../music/AttachedTrack';

const API_URL = import.meta.env.VITE_API_URL;

const CachedImage = ({ src, alt, onClick }) => {
    const { finalSrc, loading } = useCachedImage(src);
    if (loading) {
        return <div className="w-full h-full object-cover bg-slate-200 dark:bg-slate-700 animate-pulse"></div>;
    }
    return <img src={finalSrc} alt={alt} className="w-full h-full object-cover" onClick={onClick} />;
};

const TabButton = ({ active, onClick, children, count }) => (
    <button
        onClick={onClick}
        className={`flex items-center space-x-2 px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors ${
            active
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 dark:text-white/70 hover:bg-slate-200 dark:hover:bg-white/10'
        }`}
    >
        {children}
        <span className={`px-2 py-0.5 rounded-full text-xs ${active ? 'bg-white/20' : 'bg-slate-200 dark:bg-white/10'}`}>{count}</span>
    </button>
);

const AttachmentsPanel = ({ activeTab, setActiveTab, attachments, counts, loading, hasMore, onLoadMore, onClose, onImageClick }) => {
    const observer = useRef();
    const lastAttachmentElementRef = useCallback(node => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                onLoadMore();
            }
        });
        if (node) observer.current.observe(node);
    }, [loading, hasMore, onLoadMore]);
    
    return (
        <motion.div
             initial={{ x: '100%' }}
             animate={{ x: 0 }}
             exit={{ x: '100%' }}
             transition={{ type: 'spring', stiffness: 300, damping: 30 }}
             className="absolute top-0 right-0 h-full w-full md:w-[380px] bg-slate-100 dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700/50 flex flex-col z-20"
        >
            <header className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-700/50 flex-shrink-0">
                <h3 className="font-bold text-lg">Вложения</h3>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"><X size={20} /></button>
            </header>
            <div className="flex items-center space-x-2 p-2 border-b border-slate-200 dark:border-slate-700/50">
                <TabButton active={activeTab === 'photos'} onClick={() => setActiveTab('photos')} count={counts.photos}>
                    <ImageIcon size={16} /><span>Фото</span>
                </TabButton>
                <TabButton active={activeTab === 'music'} onClick={() => setActiveTab('music')} count={counts.music}>
                    <Music size={16} /><span>Музыка</span>
                </TabButton>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
                {loading && attachments.length === 0 ? (
                    <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-slate-400" /></div>
                ) : attachments.length > 0 ? (
                    activeTab === 'photos' ? (
                        <div className="grid grid-cols-3 gap-1">
                            {attachments.map((att, index) => (
                                <div key={att._id} ref={attachments.length === index + 1 ? lastAttachmentElementRef : null} className="aspect-square bg-slate-200 dark:bg-slate-700 rounded-md overflow-hidden cursor-pointer">
                                    <CachedImage src={att.imageUrl} alt="attachment" onClick={() => onImageClick(index)} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-2 p-2">
                            {attachments.map((att, index) => <div key={att._id} ref={attachments.length === index + 1 ? lastAttachmentElementRef : null}><AttachedTrack track={att.attachedTrack} /></div>)}
                        </div>
                    )
                ) : (
                     <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400">
                        {activeTab === 'photos' ? <ImageIcon size={48} className="mb-2" /> : <Music size={48} className="mb-2" />}
                        <p>Вложений нет</p>
                    </div>
                )}
                {loading && attachments.length > 0 && <div className="flex justify-center py-4"><Loader2 className="animate-spin text-slate-400" /></div>}
            </div>
        </motion.div>
    );
};

export default AttachmentsPanel;