// frontend/components/admin/EditContentModal.jsx

import React, { useState } from 'react';
import ReactDOM from 'react-dom'; // <-- 1. Импортируем ReactDOM
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { CreateArtistForm } from './CreateArtistForm';
import { CreateAlbumForm } from './CreateAlbumForm';
import { UploadTrackForm } from './UploadTrackForm';

const EditContentModal = ({ isOpen, onClose, item, itemType, artists, albums, onSuccess }) => {
    const [editingTrack, setEditingTrack] = useState(null);

    const renderForm = () => {
        switch (itemType) {
            case 'artists':
                return <CreateArtistForm onSuccess={onSuccess} isEditMode={true} initialData={item} />;
            case 'albums':
                return <CreateAlbumForm 
                    artists={artists} 
                    onSuccess={onSuccess} 
                    isEditMode={true} 
                    initialData={item}
                    onEditTrack={setEditingTrack} // Передаем функцию для открытия редактора трека
                />;
            case 'tracks':
                // Если мы редактируем трек из альбома, используем editingTrack, иначе - основной item
                return <UploadTrackForm artists={artists} albums={albums} onSuccess={onSuccess} isEditMode={true} initialData={editingTrack || item} />;
            default:
                return null;
        }
    };

    const currentItem = editingTrack || item;

    // 2. Если модальное окно не открыто, ничего не рендерим
    if (!isOpen) {
        return null;
    }

    // 3. Используем ReactDOM.createPortal для рендеринга в другой DOM-узел
    return ReactDOM.createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }} 
                    // Если открыт редактор трека, клик по фону закроет только его, а не всё окно
                    onClick={editingTrack ? () => setEditingTrack(null) : onClose}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        // Динамически меняем ширину модального окна
                        className={`ios-glass-final w-full max-w-2xl p-6 rounded-3xl flex flex-col text-slate-900 dark:text-white max-h-[90vh] transition-all ${editingTrack ? 'max-w-4xl' : 'max-w-2xl'}`}>
                        
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">
                                {editingTrack ? `Редактирование трека: ${editingTrack.title}` : `Редактирование: ${item?.name || item?.title}`}
                            </h2>
                            <button 
                                onClick={editingTrack ? () => setEditingTrack(null) : onClose} 
                                className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10"
                            ><X /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 -mr-4">
                           {renderForm()}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.getElementById('modal-root') // 4. Указываем, куда "телепортировать"
    );
};

export default EditContentModal;