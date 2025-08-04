// frontend/components/admin/CreateAlbumForm.jsx

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Loader2, Music, Edit, ChevronDown, Trash2, GripVertical } from 'lucide-react';
import { useUser } from '../../context/UserContext';
import GenreSelectorSingle from './GenreSelectorSingle';
import Avatar from '../Avatar';
import { useModal } from '../../hooks/useModal';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useCachedImage } from '../../hooks/useCachedImage'; // ИМПОРТ


const API_URL = import.meta.env.VITE_API_URL;

// Компонент для кешированного изображения
const CachedImage = ({ src }) => {
    const { finalSrc, loading } = useCachedImage(src);
    if (loading) {
        return <div className="w-24 h-24 rounded object-cover flex-shrink-0 bg-slate-200 dark:bg-slate-700 animate-pulse"></div>;
    }
    return <img src={finalSrc} alt="Предпросмотр" className="w-24 h-24 rounded object-cover flex-shrink-0"/>;
};


const ArtistAutocomplete = ({ artists, onSelect, initialArtistId }) => {
    const [query, setQuery] = useState('');
    const [filteredArtists, setFilteredArtists] = useState([]);
    const [isFocused, setIsFocused] = useState(false);
    
    useEffect(() => {
        if(initialArtistId && artists.length > 0) {
            const initialArtist = artists.find(a => a._id === initialArtistId);
            if(initialArtist) setQuery(initialArtist.name);
        }
    }, [initialArtistId, artists]);

    useEffect(() => {
        if (isFocused) {
             setFilteredArtists(
                artists.filter(artist =>
                    artist.name.toLowerCase().includes(query.toLowerCase())
                ).slice(0, 5)
            );
        }
    }, [query, artists, isFocused]);

    const handleSelect = (artist) => {
        setQuery(artist.name);
        onSelect(artist._id);
        setIsFocused(false);
    };
    
    return (
        <div className="relative" onBlur={() => setTimeout(() => setIsFocused(false), 200)}>
            <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setIsFocused(true)}
                placeholder="Начните вводить имя артиста..."
                className="w-full p-2 rounded bg-white dark:bg-slate-700"
                required
            />
            {isFocused && (
                <ul className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg max-h-60 overflow-auto">
                    {filteredArtists.map(artist => (
                        <li
                            key={artist._id}
                            onMouseDown={() => handleSelect(artist)}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer flex items-center space-x-2"
                        >
                            <Avatar size="sm" username={artist.name} avatarUrl={artist.avatarUrl}/>
                            <span>{artist.name}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

// --- НАЧАЛО ИСПРАВЛЕНИЯ: Компонент для перетаскиваемого трека ---
const SortableTrackItem = ({ track, onEditTrack, onDeleteTrack }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: track._id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 'auto',
    };

    return (
        <div ref={setNodeRef} style={style} className={`flex items-center justify-between p-2 bg-slate-200 dark:bg-slate-700 rounded-lg transition-shadow ${isDragging ? 'shadow-xl' : ''}`}>
            <div className="flex items-center space-x-2 min-w-0">
                <div {...attributes} {...listeners} className="cursor-grab touch-none p-1 text-slate-500">
                    <GripVertical size={16} />
                </div>
                <Music size={16} className="text-slate-500 flex-shrink-0" />
                <span className="font-semibold text-sm truncate">{track.title}</span>
                {track.isExplicit && <span className="text-xs font-bold text-slate-500 bg-slate-300 dark:bg-slate-600 px-1.5 py-0.5 rounded-full">E</span>}
            </div>
            <div className="flex items-center space-x-1 flex-shrink-0">
                <button type="button" onClick={() => onEditTrack(track)} className="p-1.5 rounded-full hover:bg-slate-300 dark:hover:bg-slate-600" title="Редактировать трек">
                    <Edit size={14} />
                </button>
                <button type="button" onClick={() => onDeleteTrack(track)} className="p-1.5 rounded-full text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50" title="Удалить трек">
                    <Trash2 size={14} />
                </button>
            </div>
        </div>
    );
};
// --- КОНЕЦ ИСПРАВЛЕНИЯ ---


export const CreateAlbumForm = ({ artists, onSuccess, isEditMode = false, initialData = null, onEditTrack }) => {
    const { currentUser } = useUser();
    const { showConfirmation } = useModal();
    const [title, setTitle] = useState('');
    const [artistId, setArtistId] = useState('');
    const [genre, setGenre] = useState('');
    const [releaseYear, setReleaseYear] = useState('');
    const [coverArt, setCoverArt] = useState(null);
    const [loading, setLoading] = useState(false);
    const [coverPreview, setCoverPreview] = useState('');
    const [albumTracks, setAlbumTracks] = useState([]);
    
    const fileInputRef = useRef(null);

    // --- НАЧАЛО ИСПРАВЛЕНИЯ: Настройка сенсоров для dnd-kit ---
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );
    // --- КОНЕЦ ИСПРАВЛЕНИЯ ---

    const fetchAlbumTracks = useCallback(async () => {
        if (!isEditMode || !initialData?._id) return;
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/api/admin/albums/${initialData._id}/tracks`, { headers: { Authorization: `Bearer ${token}` } });
            setAlbumTracks(res.data);
        } catch (error) { toast.error("Не удалось загрузить треки альбома."); }
    }, [isEditMode, initialData]);

    useEffect(() => {
        if (isEditMode && initialData) {
            setTitle(initialData.title || '');
            setArtistId(initialData.artist?._id || initialData.artist || '');
            setGenre(initialData.genre || '');
            setReleaseYear(initialData.releaseYear || '');
            setCoverPreview(initialData.coverArtUrl || '');
            fetchAlbumTracks();
        }
    }, [isEditMode, initialData, fetchAlbumTracks]);


    const handleCoverChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setCoverArt(file);
            setCoverPreview(URL.createObjectURL(file));
        }
    };

    const handleDeleteTrack = (trackToDelete) => {
        showConfirmation({
            title: `Удалить трек "${trackToDelete.title}"?`,
            message: "Это действие необратимо. Файл трека будет удален навсегда.",
            onConfirm: async () => {
                const toastId = toast.loading('Удаление трека...');
                try {
                    const token = localStorage.getItem('token');
                    await axios.delete(`${API_URL}/api/admin/content/tracks/${trackToDelete._id}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    toast.success('Трек удален!', { id: toastId });
                    fetchAlbumTracks();
                } catch (error) {
                    toast.error('Ошибка удаления трека.', { id: toastId });
                }
            }
        });
    };

    // --- НАЧАЛО ИСПРАВЛЕНИЯ: Логика для сохранения нового порядка треков ---
    const handleDragEnd = async (event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            const oldIndex = albumTracks.findIndex((t) => t._id === active.id);
            const newIndex = albumTracks.findIndex((t) => t._id === over.id);
            const reorderedTracks = arrayMove(albumTracks, oldIndex, newIndex);
            setAlbumTracks(reorderedTracks);

            const toastId = toast.loading('Сохранение порядка...');
            try {
                const token = localStorage.getItem('token');
                const trackIds = reorderedTracks.map(t => t._id);
                await axios.put(`${API_URL}/api/admin/content/albums/${initialData._id}/reorder-tracks`, 
                    { trackIds }, 
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                toast.success('Порядок треков сохранен!', { id: toastId });
            } catch (error) {
                toast.error('Не удалось сохранить порядок.', { id: toastId });
                fetchAlbumTracks(); // Возвращаем к исходному порядку в случае ошибки
            }
        }
    };
    // --- КОНЕЦ ИСПРАВЛЕНИЯ ---


    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!artistId) { toast.error("Пожалуйста, выберите артиста."); return; }
        if (!genre) { toast.error("Пожалуйста, выберите жанр."); return; }
        setLoading(true);
        const formData = new FormData();
        formData.append('title', title);
        formData.append('artistId', artistId);
        formData.append('genre', genre);
        if (releaseYear) formData.append('releaseYear', releaseYear);
        if (coverArt) formData.append('coverArt', coverArt);
        const isAdmin = currentUser.role === 'admin';
        const endpoint = isEditMode
            ? `${API_URL}/api/admin/content/albums/${initialData._id}`
            : isAdmin ? `${API_URL}/api/admin/albums` : `${API_URL}/api/submissions/albums`;
        const method = isEditMode ? 'put' : 'post';
        
        const successMessage = isEditMode ? 'Альбом обновлен!' : (isAdmin ? 'Альбом успешно создан!' : 'Заявка отправлена на модерацию!');
        const toastId = toast.loading("Отправка данных...");

        try {
            const token = localStorage.getItem('token');
            const res = await axios[method](endpoint, formData, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } });
            toast.success(res.data.message || successMessage, { id: toastId });
            if (!isEditMode) {
                setTitle(''); setArtistId(''); setGenre(''); setReleaseYear(''); setCoverArt(null); setCoverPreview('');
                e.target.reset();
            }
            onSuccess();
        } catch (error) {
            toast.error(error.response?.data?.message || "Ошибка при отправке заявки.", { id: toastId });
        } finally { setLoading(false); }
    };

    return (
        <form onSubmit={handleSubmit} className="p-4 rounded-lg bg-slate-100 dark:bg-slate-800 space-y-4">
            <h3 className="font-bold text-lg">{isEditMode ? `Редактирование: ${initialData.title}` : (currentUser.role === 'admin' ? 'Создать Альбом' : 'Предложить новый альбом')}</h3>
            {currentUser.role !== 'admin' && !isEditMode && <p className="text-xs text-slate-500 -mt-3">Альбом будет отправлен на проверку администраторам.</p>}
            
            <div>
                <label className="text-sm font-semibold block mb-1">Исполнитель *</label>
                <ArtistAutocomplete artists={artists} onSelect={setArtistId} initialArtistId={artistId} />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="text-sm font-semibold block mb-1">Название альбома *</label>
                    <input type="text" placeholder="Название" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 rounded bg-white dark:bg-slate-700" required />
                </div>
                 <div>
                    <label className="text-sm font-semibold block mb-1">Год выпуска</label>
                    <input type="number" placeholder="Например: 2024" value={releaseYear} onChange={e => setReleaseYear(e.target.value)} min="1900" max={new Date().getFullYear() + 1} className="w-full p-2 rounded bg-white dark:bg-slate-700" />
                </div>
            </div>
            
            <GenreSelectorSingle selectedGenre={genre} onGenreChange={setGenre} />
            
            <div>
                <label className="text-sm font-semibold block mb-1">Обложка альбома</label>
                <div className="flex items-center space-x-4">
                    <button type="button" onClick={() => fileInputRef.current.click()}
                        className="px-4 py-2 text-sm bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors">
                        Выберите файл
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleCoverChange} className="hidden" />
                    <span className="text-sm text-slate-500">{coverArt?.name || 'Файл не выбран'}</span>
                    {coverPreview && <CachedImage src={coverPreview} />}
                </div>
            </div>

            {isEditMode && albumTracks.length > 0 && (
                <div>
                    <h4 className="font-bold text-md mb-2">Треки в альбоме ({albumTracks.length})</h4>
                    {/* --- НАЧАЛО ИСПРАВЛЕНИЯ: Оборачиваем список в DndContext --- */}
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={albumTracks} strategy={verticalListSortingStrategy}>
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                {albumTracks.map(track => (
                                    <SortableTrackItem 
                                        key={track._id} 
                                        track={track} 
                                        onEditTrack={onEditTrack} 
                                        onDeleteTrack={handleDeleteTrack} 
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                    {/* --- КОНЕЦ ИСПРАВЛЕНИЯ --- */}
                </div>
            )}

            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg flex items-center disabled:opacity-50">
                {loading && <Loader2 className="animate-spin mr-2"/>}
                {isEditMode ? 'Сохранить изменения' : (currentUser.role === 'admin' ? 'Создать альбом' : 'Отправить на проверку')}
            </button>
        </form>
    );
};