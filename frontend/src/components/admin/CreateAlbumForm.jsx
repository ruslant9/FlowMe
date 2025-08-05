import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Loader2, Music, Edit, ChevronDown, Trash2, GripVertical, PlusCircle } from 'lucide-react';
import { useUser } from '../../context/UserContext';
import GenreSelector from './GenreSelector';
import Avatar from '../Avatar';
import { useModal } from '../../hooks/useModal';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay, defaultDropAnimationSideEffects } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useCachedImage } from '../../hooks/useCachedImage';


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

    const handleBlur = () => {
        setTimeout(() => {
            const match = artists.some(artist => artist.name.toLowerCase() === query.toLowerCase());
            if (!match && query !== '') {
                setQuery('');
                onSelect('');
                toast.error("Исполнитель не найден. Поле очищено.", { duration: 2000 });
            }
            setIsFocused(false);
        }, 200); 
    };
    
    return (
        <div className="relative" onBlur={handleBlur}>
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

const SortableTrackItem = ({ track, index, onEditTrack, onDeleteTrack }) => {
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
        <div ref={setNodeRef} style={style} className={`flex items-center justify-between p-2 bg-slate-200 dark:bg-slate-700 rounded-lg transition-shadow ${isDragging ? 'shadow-xl opacity-50' : ''}`}>
            <div className="flex items-center space-x-2 min-w-0">
                <span className="font-bold text-slate-500 w-6 text-center">{index}</span>
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

// Статичный компонент для DragOverlay
// Этот компонент используется для визуального представления перетаскиваемого элемента
const TrackItem = ({ track, index }) => {
    return (
        <div className="flex items-center justify-between p-2 bg-slate-200 dark:bg-slate-700 rounded-lg shadow-xl">
            <div className="flex items-center space-x-2 min-w-0">
                <span className="font-bold text-slate-500 w-6 text-center">{index}</span>
                <div className="cursor-grabbing touch-none p-1 text-slate-500">
                    <GripVertical size={16} />
                </div>
                <Music size={16} className="text-slate-500 flex-shrink-0" />
                <span className="font-semibold text-sm truncate">{track.title}</span>
                {track.isExplicit && <span className="text-xs font-bold text-slate-500 bg-slate-300 dark:bg-slate-600 px-1.5 py-0.5 rounded-full">E</span>}
            </div>
            <div className="flex items-center space-x-1 flex-shrink-0">
                <div className="p-1.5"><Edit size={14} /></div>
                <div className="p-1.5 text-red-500"><Trash2 size={14} /></div>
            </div>
        </div>
    );
};


const MonthYearPicker = ({ value, onChange }) => {
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: currentYear - 1899 }, (_, i) => currentYear - i);
    const months = [
        { value: 0, name: 'Январь' }, { value: 1, name: 'Февраль' }, { value: 2, name: 'Март' },
        { value: 3, name: 'Апрель' }, { value: 4, name: 'Май' }, { value: 5, name: 'Июнь' },
        { value: 6, name: 'Июль' }, { value: 7, name: 'Август' }, { value: 8, name: 'Сентябрь' },
        { value: 9, name: 'Октябрь' }, { value: 10, name: 'Ноябрь' }, { value: 11, name: 'Декабрь' }
    ];

    const selectedDate = value ? new Date(value) : new Date();
    const selectedYear = selectedDate.getFullYear();
    const selectedMonth = selectedDate.getMonth();

    const handleYearChange = (e) => {
        const newYear = parseInt(e.target.value, 10);
        onChange(new Date(newYear, selectedMonth, 1));
    };

    const handleMonthChange = (e) => {
        const newMonth = parseInt(e.target.value, 10);
        onChange(new Date(selectedYear, newMonth, 1));
    };

    return (
        <div className="grid grid-cols-2 gap-2">
            <div className="relative">
                <select value={selectedMonth} onChange={handleMonthChange} className="w-full p-2 pr-8 rounded bg-white dark:bg-slate-700 appearance-none">
                    {months.map(month => (
                        <option key={month.value} value={month.value}>{month.name}</option>
                    ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-700 dark:text-slate-300">
                    <ChevronDown size={16} />
                </div>
            </div>
            <div className="relative">
                <select value={selectedYear} onChange={handleYearChange} className="w-full p-2 pr-8 rounded bg-white dark:bg-slate-700 appearance-none">
                    {years.map(year => (
                        <option key={year} value={year}>{year}</option>
                    ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-700 dark:text-slate-300">
                    <ChevronDown size={16} />
                </div>
            </div>
        </div>
    );
};


export const CreateAlbumForm = ({ artists, onSuccess, isEditMode = false, initialData = null, onEditTrack }) => {
    const { currentUser } = useUser();
    const { showConfirmation } = useModal();
    const [title, setTitle] = useState('');
    const [artistId, setArtistId] = useState('');
    const [genre, setGenre] = useState([]);
    const [releaseDate, setReleaseDate] = useState(new Date());
    const [coverArt, setCoverArt] = useState(null);
    const [loading, setLoading] = useState(false);
    const [coverPreview, setCoverPreview] = useState('');
    const [albumTracks, setAlbumTracks] = useState([]);
    const [activeTrack, setActiveTrack] = useState(null);
    
    const fileInputRef = useRef(null);
    const batchFileInputRef = useRef(null);

     const dropAnimation = {
        sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: "0.5" } } }),
    };

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

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
            setGenre(initialData.genre || []);
            setReleaseDate(initialData.releaseDate ? new Date(initialData.releaseDate) : new Date());
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

    const handleDragStart = (event) => {
        const { active } = event;
        const track = albumTracks.find(t => t._id === active.id);
        const index = albumTracks.findIndex(t => t._id === active.id);
        setActiveTrack({ ...track, originalIndex: index });
    };

    const handleDragEnd = async (event) => {
        setActiveTrack(null);
        const { active, over } = event;
        if (over && active.id !== over.id) {
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
                fetchAlbumTracks();
            }
        }
    };
    
    const handleBatchUpload = async (e) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        
        const toastId = toast.loading(`Загрузка ${files.length} треков...`);
        setLoading(true);

        const formData = new FormData();
        const metadata = [];
        
        const mainArtist = artists.find(a => a._id === artistId);

        for (const file of files) {
            formData.append('trackFiles', file);
            const duration = await new Promise(resolve => {
                const audio = document.createElement('audio');
                audio.src = URL.createObjectURL(file);
                audio.onloadedmetadata = () => resolve(Math.round(audio.duration * 1000));
            });
            metadata.push({
                title: file.name.replace(/\.[^/.]+$/, ""),
                artistIds: [artistId],
                isExplicit: false,
                durationMs: duration
            });
        }
        
        formData.append('tracksMetadata', JSON.stringify(metadata));

        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/api/admin/albums/${initialData._id}/batch-upload-tracks`, formData, {
                headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` }
            });
            toast.success('Треки успешно добавлены!', { id: toastId });
            fetchAlbumTracks();
        } catch (error) {
            toast.error('Ошибка при загрузке треков.', { id: toastId });
        } finally {
            setLoading(false);
            if (batchFileInputRef.current) {
                batchFileInputRef.current.value = "";
            }
        }
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!artistId) { toast.error("Пожалуйста, выберите артиста."); return; }
        if (genre.length === 0) { toast.error("Пожалуйста, выберите хотя бы один жанр."); return; } 
        setLoading(true);
        const formData = new FormData();
        formData.append('title', title);
        formData.append('artistId', artistId);
        formData.append('genre', JSON.stringify(genre));
        if (releaseDate) formData.append('releaseDate', releaseDate.toISOString());
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
                setTitle(''); setArtistId(''); setGenre([]); setReleaseDate(new Date()); setCoverArt(null); setCoverPreview(''); 
                e.target.reset();
            }
            onSuccess();
        } catch (error) {
            toast.error(error.response?.data?.message || "Ошибка при отправке заявки.", { id: toastId });
        } finally { setLoading(false); }
    };

    return (
        <form onSubmit={handleSubmit} className="p-4 rounded-lg bg-slate-100 dark:bg-slate-800">
            <div>
                <h3 className="font-bold text-lg">{isEditMode ? `Редактирование: ${initialData.title}` : (currentUser.role === 'admin' ? 'Создать Альбом' : 'Предложить новый альбом')}</h3>
                {currentUser.role !== 'admin' && !isEditMode && <p className="text-xs text-slate-500 -mt-3">Альбом будет отправлен на проверку администраторам.</p>}
            </div>

            <div className={`flex flex-col ${isEditMode ? 'md:flex-row md:space-x-6' : ''} mt-6`}>
                <div className={`space-y-4 ${isEditMode ? 'md:w-1/2 flex-shrink-0' : 'w-full'}`}>
                    <div>
                        <label className="text-sm font-semibold block mb-1">Исполнитель *</label>
                        <ArtistAutocomplete artists={artists} onSelect={setArtistId} initialArtistId={artistId} />
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-semibold block mb-1">Название альбома *</label>
                            <input type="text" placeholder="Название" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 rounded bg-white dark:bg-slate-700" required />
                        </div>
                        <div>
                            <label className="text-sm font-semibold block mb-1">Дата выпуска</label>
                            <MonthYearPicker value={releaseDate} onChange={setReleaseDate} />
                        </div>
                    </div>
                    
                    <GenreSelector selectedGenres={genre} onGenreChange={setGenre} />
                    
                    <div>
                        <label className="text-sm font-semibold block mb-1">Обложка альбома</label>
                        <div className="flex items-center space-x-4">
                            <button type="button" onClick={() => fileInputRef.current.click()}
                                className="px-4 py-2 text-sm bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors">
                                Выберите файл
                            </button>
                            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleCoverChange} className="hidden" />
                            <span className="flex-1 min-w-0 text-sm text-slate-500 truncate">
                                {coverArt?.name || 'Файл не выбран'}
                            </span>
                            {coverPreview && <CachedImage src={coverPreview} />}
                        </div>
                    </div>
                </div>
                
                {isEditMode && (
                    <>
                        <div className="hidden md:block border-l border-slate-200 dark:border-slate-700 mx-2"></div>
                        <div className="flex flex-col md:w-1/2 mt-6 md:mt-0">
                    
                        <div className="space-y-2 flex flex-col flex-1">
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="font-bold text-md">Треки в альбоме ({albumTracks.length})</h4>
                                <button 
                                    type="button" 
                                    onClick={() => batchFileInputRef.current?.click()}
                                    className="flex items-center space-x-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-500/20 dark:text-green-300 dark:hover:bg-green-500/30"
                                >
                                <PlusCircle size={14} /> <span>Добавить еще треки</span>
                                </button>
                                <input ref={batchFileInputRef} type="file" accept="audio/*" multiple onChange={handleBatchUpload} className="hidden" />
                            </div>
                            {albumTracks.length > 0 ? (
                                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                                    <SortableContext items={albumTracks} strategy={verticalListSortingStrategy}>
                                        <div className="space-y-2 overflow-y-auto pr-2 flex-1">
                                            {albumTracks.map((track, index) => (
                                                <SortableTrackItem 
                                                    key={track._id} 
                                                    track={track}
                                                    index={index + 1}
                                                    onEditTrack={onEditTrack} 
                                                    onDeleteTrack={handleDeleteTrack} 
                                                />
                                            ))}
                                        </div>
                                    </SortableContext>
                                    <DragOverlay dropAnimation={dropAnimation}>
                                        {activeTrack ? (
                                            <TrackItem track={activeTrack} index={activeTrack.originalIndex + 1} />
                                        ) : null}
                                    </DragOverlay>
                                </DndContext>
                            ) : (
                                <p className="text-center text-sm text-slate-500 py-4">В этом альбоме пока нет треков.</p>
                            )}
                        </div>
                        </div>
                    </>
                )}
            </div>

            <div className="flex justify-end pt-6 mt-6 border-t border-slate-200 dark:border-slate-700">
                <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg flex items-center disabled:opacity-50">
                    {loading && <Loader2 className="animate-spin mr-2"/>}
                    {isEditMode ? 'Сохранить изменения' : (currentUser.role === 'admin' ? 'Создать альбом' : 'Отправить на проверку')}
                </button>
            </div>
        </form>
    );
};