// frontend/components/admin/EditContentModal.jsx

import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { CreateArtistForm } from './CreateArtistForm';
import { CreateAlbumForm } from './CreateAlbumForm';
import { UploadTrackForm } from './UploadTrackForm';

const EditContentModal = ({ isOpen, onClose, item, itemType, artists, albums, onSuccess }) => {
    const [editingTrack, setEditingTrack] = useState(null);

    const renderForm = () => {
        if (editingTrack) {
            return <UploadTrackForm artists={artists} albums={albums} onSuccess={onSuccess} isEditMode={true} initialData={editingTrack} />;
        }

        switch (itemType) {
            case 'artists':
                return <CreateArtistForm onSuccess={onSuccess} isEditMode={true} initialData={item} />;
            case 'albums':
                return <CreateAlbumForm artists={artists} onSuccess={onSuccess} isEditMode={true} initialData={item} onEditTrack={setEditingTrack} />;
            case 'tracks':
                return <UploadTrackForm artists={artists} albums={albums} onSuccess={onSuccess} isEditMode={true} initialData={item} />;
            default:
                return null;
        }
    };

    const getModalWidthClass = () => {
        if (editingTrack || itemType === 'albums') {
            return 'max-w-4xl';
        }
        return 'max-w-2xl';
    };

    if (!isOpen) {
        return null;
    }

    return ReactDOM.createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
                    onClick={editingTrack ? () => setEditingTrack(null) : onClose}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className={`ios-glass-final w-full p-6 rounded-3xl flex flex-col text-slate-900 dark:text-white max-h-[90vh] transition-all ${getModalWidthClass()}`}>
                        
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">
                                {editingTrack ? `Редактирование трека: ${editingTrack.title}` : `Редактирование: ${item?.name || item?.title}`}
                            </h2>
                            <button onClick={editingTrack ? () => setEditingTrack(null) : onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10"><X /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 -mr-4">
                           {renderForm()}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.getElementById('modal-root')
    );
};

export default EditContentModal;