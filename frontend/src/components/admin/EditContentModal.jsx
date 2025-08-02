// frontend/components/admin/EditContentModal.jsx

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { CreateArtistForm } from './CreateArtistForm'; // Мы переиспользуем формы!
import { CreateAlbumForm } from './CreateAlbumForm';
import { UploadTrackForm } from './UploadTrackForm';

const EditContentModal = ({ isOpen, onClose, item, itemType, artists, albums, onSuccess }) => {

    const renderForm = () => {
        switch (itemType) {
            case 'artists':
                return <CreateArtistForm onSuccess={onSuccess} isEditMode={true} initialData={item} />;
            case 'albums':
                return <CreateAlbumForm artists={artists} onSuccess={onSuccess} isEditMode={true} initialData={item} />;
            case 'tracks':
                return <UploadTrackForm artists={artists} albums={albums} onSuccess={onSuccess} isEditMode={true} initialData={item} />;
            default:
                return null;
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="ios-glass-final w-full max-w-2xl p-6 rounded-3xl flex flex-col text-slate-900 dark:text-white max-h-[90vh]">
                        
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Редактировать {itemType.slice(0, -1)}</h2>
                            <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10"><X /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 -mr-4">
                           {renderForm()}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default EditContentModal;