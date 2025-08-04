// frontend/components/admin/UploadTrackForm.jsx

import React, { useState, useMemo, useEffect, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Loader2, Trash2, X, GripVertical } from 'lucide-react';
import { useUser } from '../../context/UserContext';
import GenreSelector from './GenreSelector';
import Avatar from '../Avatar';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const API_URL = import.meta.env.VITE_API_URL;

const AlbumAutocomplete = ({ albums, onSelect, initialAlbumId }) => {
    const [query, setQuery] = useState('');
    const [filteredAlbums, setFilteredAlbums] = useState([]);
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        if (initialAlbumId && albums.length > 0) {
            const initialAlbum = albums.find(a => a._id === initialAlbumId);
            if (initialAlbum) {
                setQuery(`${initialAlbum.title} - ${initialAlbum.artist.name}`);
            }
        }
    }, [initialAlbumId, albums]);

    const handleSelect = (album) => {
        setQuery(album ? `${album.title} - ${album.artist.name}` : '');
        onSelect(album ? album._id : '');
        setIsFocused(false);
    };

    useEffect(() => {
        if (isFocused) {
            const lowerQuery = query.toLowerCase();
            setFilteredAlbums(
                albums.filter(album =>
                    album.title.toLowerCase().includes(lowerQuery) ||
                    album.artist.name.toLowerCase().includes(lowerQuery)
                ).slice(0, 5)
            );
        } else {
            setFilteredAlbums([]);
        }
    }, [query, albums, isFocused]);
    
    return (
        <div className="relative" onBlur={() => setTimeout(() => setIsFocused(false), 200)}>
            <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setIsFocused(true)}
                placeholder="-- Сольный трек (сингл) --"
                className="w-full p-2 rounded bg-white dark:bg-slate-700"
            />
            {isFocused && (
                <ul className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg max-h-60 overflow-auto">
                    <li onMouseDown={() => handleSelect(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer italic">
                        -- Сольный трек (сингл) --
                    </li>
                    {filteredAlbums.map(album => (
                        <li key={album._id} onMouseDown={() => handleSelect(album)}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer flex items-center space-x-2">
                            <img src={album.coverArtUrl} alt={album.title} className="w-8 h-8 rounded-sm object-cover" />
                            <div>
                                <p>{album.title}</p>
                                <p className="text-sm text-slate-500">{album.artist.name}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

const MultiArtistAutocomplete = ({ artists, selectedIds, onSelectionChange, excludeIds = [] }) => {
    const [query, setQuery] = useState('');
    const [isFocused, setIsFocused] = useState(false);

    const availableArtists = useMemo(() =>
        artists.filter(a => !selectedIds.includes(a._id) && !excludeIds.includes(a._id))
    , [artists, selectedIds, excludeIds]);
    
    const filteredArtists = useMemo(() => {
        if (!isFocused || !query) return [];
        return availableArtists.filter(artist =>
            artist.name.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 5);
    }, [query, availableArtists, isFocused]);

    const selectedArtists = useMemo(() =>
        selectedIds.map(id => artists.find(a => a._id === id)).filter(Boolean)
    , [selectedIds, artists]);

    const handleSelect = (artist) => {
        onSelectionChange([...selectedIds, artist._id]);
        setQuery('');
    };

    const handleRemove = (artistId) => {
        onSelectionChange(selectedIds.filter(id => id !== artistId));
    };

    return (
        <div className="relative" onBlur={() => setTimeout(() => setIsFocused(false), 200)}>
            <div className="flex flex-wrap gap-2 p-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 min-h-[44px]">
                {selectedArtists.map(artist => (
                    <div key={artist._id} className="flex items-center space-x-1 bg-blue-100 dark:bg-blue-900/50 rounded-full pl-1 pr-2">
                        <Avatar size="sm" username={artist.name} avatarUrl={artist.avatarUrl} />
                        <span className="text-sm">{artist.name}</span>
                        <button type="button" onClick={() => handleRemove(artist._id)}><X size={14}/></button>
                    </div>
                ))}
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    placeholder={selectedIds.length === 0 ? "Добавьте исполнителей..." : "Добавить еще..."}
                    className="flex-grow bg-transparent outline-none p-1"
                />
            </div>
             {isFocused && filteredArtists.length > 0 && (
                <ul className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg max-h-60 overflow-auto">
                    {filteredArtists.map(artist => (
                        <li key={artist._id} onMouseDown={() => handleSelect(artist)}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer flex items-center space-x-2">
                            <Avatar size="md" username={artist.name} avatarUrl={artist.avatarUrl} />
                            <span>{artist.name}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

const ToggleSwitch = ({ checked, onChange, label }) => (
    <label className="flex items-center space-x-2 cursor-pointer text-sm">
        <div className="relative">
            <input type="checkbox" className="sr-only" checked={checked} onChange={e => onChange(e.target.checked)} />
            <div className={`block w-10 h-6 rounded-full transition ${checked ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
            <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${checked ? 'transform translate-x-full' : ''}`}></div>
        </div>
        <span>{label}</span>
    </label>
);

const BatchTrackItem = ({ track, index, artists, mainArtistId, onUpdate, onRemove }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: track.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 'auto',
    };
    
    return (
        <div ref={setNodeRef} style={style} className={`flex items-start space-x-3 transition-shadow ${isDragging ? 'shadow-lg' : ''}`}>
            <div className="flex flex-col items-center pt-3 flex-shrink-0">
                <span className="font-bold text-lg text-slate-500 dark:text-slate-400 select-none">{index + 1}</span>
                <div {...attributes} {...listeners} className="cursor-grab touch-none p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white">
                    <GripVertical size={20}/>
                </div>
            </div>
            <div className="p-3 bg-slate-200 dark:bg-slate-700/50 rounded-lg space-y-3 w-full">
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Название трека"
                        value={track.title}
                        onChange={(e) => onUpdate(index, 'title', e.target.value)}
                        className="w-full p-2 pr-10 rounded bg-white dark:bg-slate-700 font-semibold"
                        required
                    />
                    <button
                        type="button"
                        onClick={onRemove}
                        className="absolute top-1/2 right-2 -translate-y-1/2 p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full z-10"
                        title="Удалить трек"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
                <div>
                    <label className="text-sm font-semibold block mb-1">Дополнительные исполнители (фит)</label>
                    <MultiArtistAutocomplete artists={artists} selectedIds={track.artistIds}
                        onSelectionChange={(ids) => onUpdate(index, 'artistIds', ids)} excludeIds={[mainArtistId]} />
                </div>
                <ToggleSwitch checked={track.isExplicit} onChange={(checked) => onUpdate(index, 'isExplicit', checked)} label="Explicit (ненормативная лексика)" />
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
            <select value={selectedMonth} onChange={handleMonthChange} className="w-full p-2 rounded bg-white dark:bg-slate-700">
                {months.map(month => (
                    <option key={month.value} value={month.value}>{month.name}</option>
                ))}
            </select>
            <select value={selectedYear} onChange={handleYearChange} className="w-full p-2 rounded bg-white dark:bg-slate-700">
                {years.map(year => (
                    <option key={year} value={year}>{year}</option>
                ))}
            </select>
        </div>
    );
};

export const UploadTrackForm = ({ artists, albums, onSuccess, isEditMode = false, initialData = null }) => {
    const { currentUser } = useUser();
    const [albumId, setAlbumId] = useState('');
    const [loading, setLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [trackList, setTrackList] = useState([]);
    const [singleTrackData, setSingleTrackData] = useState({
        title: '', artistIds: [], genres: [], trackFile: null, isExplicit: false,
        durationMs: 0, coverArt: null, coverPreview: '', releaseDate: new Date()
    });
    const abortControllerRef = useRef(null);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const mainAlbumArtistId = useMemo(() => {
        if (!albumId) return null;
        const album = albums.find(a => a._id === albumId);
        return album?.artist?._id || album?.artist || null;
    }, [albumId, albums]);

    useEffect(() => {
        if (isEditMode && initialData) {
            const currentAlbumId = initialData.album?._id || initialData.album || null;
            setAlbumId(currentAlbumId);
            
            const mainArtistOfAlbum = currentAlbumId ? albums.find(a => a._id === currentAlbumId)?.artist?._id : null;
            
            const featureArtistIds = (initialData.artist || [])
                .map(a => a._id)
                .filter(id => id !== mainArtistOfAlbum);

            setSingleTrackData({
                title: initialData.title || '',
                artistIds: featureArtistIds,
                genres: initialData.genres || [],
                isExplicit: initialData.isExplicit || false,
                releaseDate: initialData.releaseDate ? new Date(initialData.releaseDate) : new Date(),
                trackFile: null, coverArt: null,
                coverPreview: initialData.albumArtUrl || '',
                durationMs: initialData.durationMs || 0,
            });
        }
    }, [isEditMode, initialData, albums]);


    useEffect(() => { if (!isEditMode) setTrackList([]); }, [albumId, isEditMode]);

    const handleSingleTrackChange = (field, value) => setSingleTrackData(prev => ({ ...prev, [field]: value }));

    const handleSingleFileChange = (e, type) => {
        const file = e.target.files[0];
        if (!file) return;
        if (type === 'track') {
            handleSingleTrackChange('trackFile', file);
            const audio = new Audio(URL.createObjectURL(file));
            audio.onloadedmetadata = () => handleSingleTrackChange('durationMs', Math.round(audio.duration * 1000));
        } else if (type === 'cover') {
            handleSingleTrackChange('coverArt', file);
            handleSingleTrackChange('coverPreview', URL.createObjectURL(file));
        }
    };
    
    const handleBatchFileChange = (e) => {
        const files = Array.from(e.target.files);
        const newTracks = files.map(file => {
            const trackId = crypto.randomUUID();
            const audio = new Audio(URL.createObjectURL(file));
            audio.onloadedmetadata = () => {
                const duration = Math.round(audio.duration * 1000);
                setTrackList(currentList => currentList.map(t => t.id === trackId ? { ...t, durationMs: duration } : t));
            };
            return { id: trackId, file, title: file.name.replace(/\.[^/.]+$/, ""), artistIds: [], isExplicit: false, durationMs: 0 };
        });
        setTrackList(prev => [...prev, ...newTracks]);
    };

    const updateTrackInList = (index, field, value) => {
        setTrackList(currentList => {
            const newList = [...currentList];
            newList[index] = { ...newList[index], [field]: value };
            return newList;
        });
    };
    
    const removeTrackFromList = (indexToRemove) => {
        setTrackList(currentList => currentList.filter((_, i) => i !== indexToRemove));
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            setTrackList((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const handleCancelUpload = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setUploadProgress(0);
        abortControllerRef.current = new AbortController();
        const toastId = toast.loading('Подготовка к загрузке...');
        const axiosConfig = {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'multipart/form-data' },
            signal: abortControllerRef.current.signal,
            onUploadProgress: (progressEvent) => {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                setUploadProgress(percentCompleted);
                toast.loading(
                    (t) => (
                        <div className="flex items-center">
                            <span>Загрузка... {percentCompleted}%</span>
                            <button onClick={() => { handleCancelUpload(); toast.dismiss(t.id); }} className="ml-2 text-red-400 font-bold text-xs">Отмена</button>
                        </div>
                    ),
                    { id: toastId }
                );
            }
        };

        try {
            const isAdmin = currentUser.role === 'admin';
            if (isEditMode) {
                // --- НАЧАЛО ИСПРАВЛЕНИЯ: Логика объединения исполнителей при редактировании ---
                const finalArtistIds = albumId && mainAlbumArtistId
                    ? [...new Set([mainAlbumArtistId, ...singleTrackData.artistIds])]
                    : singleTrackData.artistIds;

                if (finalArtistIds.length === 0) {
                    toast.error("Трек должен иметь хотя бы одного исполнителя.");
                    setLoading(false);
                    return;
                }
                // --- КОНЕЦ ИСПРАВЛЕНИЯ ---

                const formData = new FormData();
                formData.append('title', singleTrackData.title);
                formData.append('artistIds', JSON.stringify(finalArtistIds)); // <-- Используем finalArtistIds
                formData.append('albumId', albumId || '');
                formData.append('genres', JSON.stringify(singleTrackData.genres || []));
                formData.append('isExplicit', singleTrackData.isExplicit);
                // --- НАЧАЛО ИСПРАВЛЕНИЯ: Отправляем дату только для синглов ---
                if (!albumId) {
                    formData.append('releaseDate', singleTrackData.releaseDate.toISOString());
                }
                // --- КОНЕЦ ИСПРАВЛЕНИЯ ---
                await axios.put(`${API_URL}/api/admin/content/tracks/${initialData._id}`, formData, { headers: axiosConfig.headers });
                toast.success("Трек успешно обновлен!", { id: toastId });
                onSuccess();
                return;
            }

            if (albumId) {
                if (trackList.length === 0) throw new Error("Выберите аудиофайлы для загрузки.");
                const formData = new FormData();
                const metadata = trackList.map(t => ({
                    title: t.title, artistIds: [mainAlbumArtistId, ...t.artistIds].filter(Boolean),
                    isExplicit: t.isExplicit, durationMs: t.durationMs
                }));
                formData.append('tracksMetadata', JSON.stringify(metadata));
                trackList.forEach(t => formData.append('trackFiles', t.file));
                await axios.post(`${API_URL}/api/admin/albums/${albumId}/batch-upload-tracks`, formData, axiosConfig);
            } else {
                if (!singleTrackData.trackFile || singleTrackData.artistIds.length === 0) throw new Error("Исполнитель и аудиофайл обязательны.");
                const formData = new FormData();
                formData.append('title', singleTrackData.title);
                formData.append('artistIds', JSON.stringify(singleTrackData.artistIds));
                formData.append('genres', JSON.stringify(singleTrackData.genres));
                formData.append('isExplicit', singleTrackData.isExplicit);
                formData.append('trackFile', singleTrackData.trackFile);
                if (singleTrackData.coverArt) formData.append('coverArt', singleTrackData.coverArt);
                formData.append('durationMs', singleTrackData.durationMs);
                formData.append('releaseDate', singleTrackData.releaseDate.toISOString());
                const endpoint = isAdmin ? `${API_URL}/api/admin/tracks` : `${API_URL}/api/submissions/tracks`;
                await axios.post(endpoint, formData, axiosConfig);
            }
            toast.success(isAdmin ? "Треки успешно загружены!" : "Заявка на добавление трека отправлена!", { id: toastId });
            onSuccess();
            setAlbumId('');
            setTrackList([]);
            setSingleTrackData({ title: '', artistIds: [], genres: [], trackFile: null, isExplicit: false, durationMs: 0, coverArt: null, coverPreview: '', releaseDate: new Date() });
            e.target.reset();
        } catch (error) {
            if (axios.isCancel(error)) {
                 toast.success('Загрузка отменена.', { id: toastId });
            } else {
                toast.error(error.message || error.response?.data?.message || "Ошибка при загрузке.", { id: toastId });
            }
        } finally { 
            setLoading(false); 
            setUploadProgress(0); 
            abortControllerRef.current = null;
        }
    };

    return (
        <form onSubmit={handleSubmit} className="p-4 rounded-lg bg-slate-100 dark:bg-slate-800 space-y-4">
            <h3 className="font-bold text-lg">
                {isEditMode ? `Редактирование: ${initialData.title}` : 
                 (currentUser.role === 'admin' ? 'Загрузить трек' : 'Предложить новый трек')}
            </h3>
            {currentUser.role !== 'admin' && !isEditMode && (
                <p className="text-xs text-slate-500 -mt-3">Ваша заявка будет рассмотрена администратором.</p>
            )}
            
            <div>
                <label className="text-sm font-semibold block mb-1">Альбом (необязательно)</label>
                <AlbumAutocomplete albums={albums} onSelect={setAlbumId} initialAlbumId={albumId}/>
            </div>

            {albumId && !isEditMode ? (
                 <div className="space-y-4">
                    <div>
                        <label className="text-sm font-semibold block mb-1">Аудиофайлы *</label>
                        <div className="flex items-center space-x-4">
                            <label htmlFor="batch-file-upload" className="cursor-pointer px-4 py-2 text-sm bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors">Выбрать файлы</label>
                             <input id="batch-file-upload" type="file" multiple accept="audio/*" onChange={handleBatchFileChange} className="hidden" />
                            {trackList.length > 0 && <span className="text-sm text-slate-500 dark:text-slate-400">Выбрано файлов: {trackList.length}</span>}
                        </div>
                    </div>
                    {trackList.length > 0 && (
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={trackList.map(t => t.id)} strategy={verticalListSortingStrategy}>
                                <div className="space-y-3">
                                    {trackList.map((track, index) => (
                                        <BatchTrackItem 
                                            key={track.id} 
                                            id={track.id}
                                            track={track} 
                                            index={index} 
                                            artists={artists}
                                            mainArtistId={mainAlbumArtistId} 
                                            onUpdate={updateTrackInList} 
                                            onRemove={() => removeTrackFromList(index)} 
                                        />
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                     <div>
                        {/* --- НАЧАЛО ИСПРАВЛЕНИЯ: Динамический заголовок --- */}
                        <label className="text-sm font-semibold block mb-1">
                            {albumId ? 'Дополнительные исполнители (фит)' : 'Исполнитель *'}
                        </label>
                        {/* --- КОНЕЦ ИСПРАВЛЕНИЯ --- */}
                        <MultiArtistAutocomplete artists={artists} selectedIds={singleTrackData.artistIds} onSelectionChange={(ids) => handleSingleTrackChange('artistIds', ids)} excludeIds={mainAlbumArtistId ? [mainAlbumArtistId] : []}/>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-semibold block mb-1">Название трека *</label>
                            <input type="text" placeholder="Название" value={singleTrackData.title} onChange={e => handleSingleTrackChange('title', e.target.value)} className="w-full p-2 rounded bg-white dark:bg-slate-700" required />
                        </div>
                        {!albumId && (
                            <div>
                                <label className="text-sm font-semibold block mb-1">Дата выпуска</label>
                                <MonthYearPicker value={singleTrackData.releaseDate} onChange={(date) => handleSingleTrackChange('releaseDate', date)} />
                            </div>
                        )}
                    </div>

                    <div className="p-4 rounded-lg bg-slate-200 dark:bg-slate-900/50 space-y-4">
                        <GenreSelector selectedGenres={singleTrackData.genres} onGenreChange={(genres) => handleSingleTrackChange('genres', genres)} />
                        <ToggleSwitch 
                            checked={singleTrackData.isExplicit} 
                            onChange={(checked) => handleSingleTrackChange('isExplicit', checked)} 
                            label="Explicit (ненормативная лексика)" 
                        />
                    </div>
                    
                    {!isEditMode && (
                        <>
                            <div>
                                <label className="text-sm font-semibold block mb-1">Обложка сингла</label>
                                <input type="file" accept="image/*" onChange={(e) => handleSingleFileChange(e, 'cover')} className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/50 dark:file:text-blue-300 dark:hover:file:bg-blue-900" />
                                {singleTrackData.coverPreview && <img src={singleTrackData.coverPreview} alt="Предпросмотр обложки" className="mt-2 w-24 h-24 rounded object-cover"/>}
                            </div>
                            <div>
                                <label className="text-sm font-semibold block mb-1">Аудиофайл *</label>
                                <input type="file" accept="audio/*" onChange={(e) => handleSingleFileChange(e, 'track')} className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/50 dark:file:text-blue-300 dark:hover:file:bg-blue-900" required={!isEditMode} />
                            </div>
                        </>
                    )}
                </div>
            )}
            {loading && (
                <div className="flex items-center space-x-4">
                    <div className="flex-grow bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                        <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
                    </div>
                    <button type="button" onClick={handleCancelUpload} className="text-sm font-semibold text-red-500 hover:underline">
                        Отмена
                    </button>
                </div>
            )}
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg flex items-center disabled:opacity-50">
                {loading ? <Loader2 className="animate-spin mr-2"/> : null}
                {isEditMode ? 'Сохранить изменения' : (currentUser.role === 'admin' ? `Загрузить трек(и)` : 'Отправить на проверку')}
            </button>
        </form>
    );
};