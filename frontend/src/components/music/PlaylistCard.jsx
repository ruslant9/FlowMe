// frontend/src/components/music/PlaylistCard.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { Music, Trash2, Play, Edit } from 'lucide-react';
import { useModal } from '../../hooks/useModal';
import { useCachedImage } from '../../hooks/useCachedImage'; // ИМПОРТ

// Компонент для кешированного изображения
const CachedImage = ({ src, alt, className }) => {
    const { finalSrc, loading } = useCachedImage(src);
    if (loading) {
        return <div className={`${className} bg-slate-200 dark:bg-slate-800 animate-pulse`}></div>;
    }
    return <img src={finalSrc} alt={alt} className={className} />;
};


const PlaylistCard = ({ playlist, onClick, onDelete, onEdit }) => {
    const { showConfirmation } = useModal();

    const handleDeleteClick = (e) => {
        e.stopPropagation();
        showConfirmation({
            title: `Удалить плейлист "${playlist.name}"?`,
            message: "Это действие нельзя отменить.",
            onConfirm: () => onDelete(playlist._id)
        });
    };
    
    const handleEditClick = (e) => {
        e.stopPropagation();
        onEdit(playlist);
    };

    const renderCover = () => {
        const images = playlist.coverImageUrls;
        if (!images || images.length === 0) {
            return (
                <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-slate-600">
                    <Music size={64} />
                </div>
            );
        }

        const imgClass = "w-full h-full object-cover";

        switch (images.length) {
            case 1:
                return <CachedImage src={images[0]} alt="" className={imgClass} />;
            case 2:
                return (
                    <div className="w-full h-full grid grid-cols-2">
                        <CachedImage src={images[0]} alt="" className={imgClass} />
                        <CachedImage src={images[1]} alt="" className={imgClass} />
                    </div>
                );
            case 3:
                return (
                    <div className="w-full h-full grid grid-cols-2 grid-rows-2">
                        <div className="row-span-2">
                            <CachedImage src={images[0]} alt="" className={imgClass} />
                        </div>
                        <div>
                            <CachedImage src={images[1]} alt="" className={imgClass} />
                        </div>
                        <div>
                            <CachedImage src={images[2]} alt="" className={imgClass} />
                        </div>
                    </div>
                );
            default: // 4 or more
                return (
                    <div className="w-full h-full grid grid-cols-2 grid-rows-2">
                        {images.slice(0, 4).map((url, index) => (
                            <CachedImage key={index} src={url} alt="" className={imgClass} />
                        ))}
                    </div>
                );
        }
    };

    return (
        <motion.div
            onClick={onClick}
            className="flex-shrink-0 w-full rounded-2xl relative overflow-hidden group aspect-square cursor-pointer bg-slate-200 dark:bg-slate-800"
            whileHover={{ scale: 1.02, y: -5 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        >
            <div className="w-full h-full">
                {renderCover()}
            </div>
            
            {/* --- НАЧАЛО ИЗМЕНЕНИЯ --- */}
            <div className="absolute top-2 right-2 z-20 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {onEdit && (
                     <button 
                        onClick={handleEditClick} 
                        className="p-2 bg-black/40 text-white rounded-full hover:bg-blue-500 transition-colors"
                        title="Редактировать плейлист"
                    >
                        <Edit size={16} />
                    </button>
                )}
                {onDelete && (
                    <button 
                        onClick={handleDeleteClick} 
                        className="p-2 bg-black/40 text-white rounded-full hover:bg-red-500 transition-colors"
                        title="Удалить плейлист"
                    >
                        <Trash2 size={16} />
                    </button>
                )}
            </div>
            {/* --- КОНЕЦ ИЗМЕНЕНИЯ --- */}
            
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 via-black/50 to-transparent">
                <div className="flex justify-between items-end">
                    <div className="text-white min-w-0">
                        <h3 className="text-base font-bold truncate">{playlist.name}</h3>
                        <p className="text-xs opacity-80 truncate">{playlist.tracks.length} треков</p>
                    </div>
                    <div className="flex items-center space-x-1 text-white text-xs opacity-80 flex-shrink-0 ml-2">
                        <Play size={12} />
                        <span>{playlist.playCount || 0}</span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default PlaylistCard;