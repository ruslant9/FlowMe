// frontend/src/pages/PlaylistPage.jsx

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import useTitle from '../hooks/useTitle';
import { Loader2, Play, Music, Clock, ArrowLeft, PlusCircle, Edit, Trash2, Shuffle, Repeat } from 'lucide-react';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import { useUser } from '../context/UserContext';
import Avatar from '../components/Avatar';
import PlaylistTrackItem from '../components/music/PlaylistTrackItem';
import EditPlaylistModal from '../components/modals/EditPlaylistModal';
import AddTracksToPlaylistModal from '../components/modals/AddTracksToPlaylistModal';
import { useModal } from '../hooks/useModal';
import toast from 'react-hot-toast';
import ColorThief from 'colorthief';
import { useCachedImage } from '../hooks/useCachedImage';

const API_URL = import.meta.env.VITE_API_URL;

const CachedImage = ({ src, alt, className, ...props }) => {
    const { finalSrc, loading } = useCachedImage(src);
    if (loading) {
        return <div className={`${className} bg-slate-200 dark:bg-slate-800 animate-pulse`}></div>;
    }
    return <img src={finalSrc} alt={alt} className={className} {...props} />;
};


const PlaylistPage = () => {
    const { playlistId } = useParams();
    const navigate = useNavigate();
    const [playlist, setPlaylist] = useState(null);
    const [loading, setLoading] = useState(true);
    const { currentUser } = useUser();
    const { playTrack, currentTrack, isPlaying, onToggleLike, myMusicTrackIds } = useMusicPlayer();
    const { showConfirmation } = useModal();

    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [isAddTracksModalOpen, setAddTracksModalOpen] = useState(false);

    const imageRef = useRef(null);
    const [accentColors, setAccentColors] = useState(['#1f2937', '#111827']);

    const [isShuffle, setIsShuffle] = useState(false);
    const [isRepeat, setIsRepeat] = useState(false);

    const fetchPlaylist = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/api/playlists/${playlistId}`, { headers: { Authorization: `Bearer ${token}` } });
            setPlaylist(res.data);
        } catch (error) {
            toast.error("Не удалось загрузить плейлист.");
            navigate('/music', { state: { defaultTab: 'playlists' } });
        } finally {
            setLoading(false);
        }
    }, [playlistId, navigate]);

    useEffect(() => {
        fetchPlaylist();
    }, [fetchPlaylist]);

    useTitle(playlist ? playlist.name : 'Плейлист');
    
    const extractColorsFromImage = () => {
        const img = imageRef.current;
        if (img && img.complete && img.src) {
            try {
                const colorThief = new ColorThief();
                const palette = colorThief.getPalette(img, 5);
                const vibrantColors = palette.filter(rgb => {
                    const [r, g, b] = rgb;
                    if (r > 230 && g > 230 && b > 230) return false;
                    if (Math.abs(r - g) < 20 && Math.abs(g - b) < 20 && Math.abs(r - b) < 20) return false;
                    return true;
                });
                let mainColor = vibrantColors.length > 0 ? vibrantColors[0] : palette[0];
                if (mainColor) {
                    const vibrantRgb = `rgb(${mainColor[0]}, ${mainColor[1]}, ${mainColor[2]})`;
                    const darkRgb = `rgb(${Math.floor(mainColor[0] * 0.3)}, ${Math.floor(mainColor[1] * 0.3)}, ${Math.floor(mainColor[2] * 0.3)})`;
                    setAccentColors([vibrantRgb, darkRgb]);
                }
            } catch (e) {
                console.error('Ошибка извлечения цветов', e);
            }
        }
    };

    const handlePlayPlaylist = () => {
        if (playlist && playlist.tracks.length > 0) {
            playTrack(playlist.tracks[0], playlist.tracks, {
                playlistId: playlist._id,
                startShuffled: isShuffle,
                startRepeat: isRepeat
            });
        }
    };

    const handleSelectTrack = (track) => {
        playTrack(track, playlist.tracks, {
            playlistId: playlist._id,
            startShuffled: isShuffle,
            startRepeat: isRepeat
        });
    };
    
    const handleToggleShuffle = () => {
        const newShuffleState = !isShuffle;
        setIsShuffle(newShuffleState);
        if (newShuffleState) {
            setIsRepeat(false);
        }
    };

    const handleToggleRepeat = () => {
        const newRepeatState = !isRepeat;
        setIsRepeat(newRepeatState);
        if (newRepeatState) {
            setIsShuffle(false);
        }
    };

    const handleAddTracks = async (trackIds) => {
        const toastId = toast.loading("Добавление треков...");
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_URL}/api/playlists/${playlistId}/tracks`, { trackIds }, { headers: { Authorization: `Bearer ${token}` } });
            toast.success("Треки добавлены!", { id: toastId });
            setPlaylist(res.data);
        } catch(e) {
            toast.error("Ошибка при добавлении треков.", { id: toastId });
        }
    };
    
    const handleRemoveTrack = async (trackId) => {
        const toastId = toast.loading("Удаление трека...");
        try {
            const token = localStorage.getItem('token');
            const res = await axios.delete(`${API_URL}/api/playlists/${playlistId}/tracks/${trackId}`, { headers: { Authorization: `Bearer ${token}` } });
            toast.success("Трек удален!", { id: toastId });
            setPlaylist(res.data);
        } catch(e) {
            toast.error("Ошибка при удалении трека.", { id: toastId });
        }
    };

    const totalDurationMs = playlist?.tracks.reduce((acc, track) => acc + (track.durationMs || 0), 0) || 0;
    const totalMinutes = Math.floor(totalDurationMs / 60000);
    const isOwner = currentUser?._id === playlist?.user._id;
    
    const handlePlaylistUpdated = (updatedData) => {
        setPlaylist(prev => ({...prev, ...updatedData}));
        fetchPlaylist(); 
    };
    
    const handleDeletePlaylist = () => {
        showConfirmation({
            title: "Удалить плейлист?",
            message: "Это действие необратимо.",
            onConfirm: async () => {
                 const toastId = toast.loading('Удаление...');
                try {
                    const token = localStorage.getItem('token');
                    await axios.delete(`${API_URL}/api/playlists/${playlistId}`, { headers: { Authorization: `Bearer ${token}` }});
                    toast.success("Плейлист удален", {id: toastId});
                    navigate('/music', { state: { defaultTab: 'playlists' } });
                } catch(e) {
                    toast.error("Ошибка удаления", {id: toastId});
                }
            }
        });
    };
    
    const getCoverGridClass = () => {
        const count = playlist?.coverImageUrls?.length || 0;
        switch (count) {
            case 1: return '';
            case 2: return 'grid grid-cols-2';
            case 3: return 'grid grid-cols-2 grid-rows-2';
            default: return 'grid grid-cols-2 grid-rows-2';
        }
    };

    const renderPlaylistCover = () => {
        const images = playlist.coverImageUrls;
        if (!images || images.length === 0) {
            return (
                <div className="col-span-2 row-span-2 flex items-center justify-center text-slate-400 dark:text-slate-600">
                    <Music size={64} />
                </div>
            );
        }

        const imgClass = "w-full h-full object-cover";
        const firstImageProps = (index) => index === 0 ? {
            ref: imageRef,
            onLoad: extractColorsFromImage,
            crossOrigin: "anonymous"
        } : {};
       
        switch (images.length) {
            case 1:
                return <CachedImage src={images[0]} alt="" className={imgClass} {...firstImageProps(0)} />;
            case 2:
                return (
                    <>
                        <CachedImage src={images[0]} alt="" className={imgClass} {...firstImageProps(0)} />
                        <CachedImage src={images[1]} alt="" className={imgClass} />
                    </>
                );
            case 3:
                return (
                    <>
                        <div className="row-span-2"><CachedImage src={images[0]} alt="" className={imgClass} {...firstImageProps(0)} /></div>
                        <div><CachedImage src={images[1]} alt="" className={imgClass} /></div>
                        <div><CachedImage src={images[2]} alt="" className={imgClass} /></div>
                    </>
                );
            default:
                return images.slice(0, 4).map((url, index) => (
                    <CachedImage key={index} src={url} alt="" className={imgClass} {...firstImageProps(index)} />
                ));
        }
    };


    if (loading || !playlist) {
        return <div className="flex-1 p-8 flex items-center justify-center"><Loader2 className="w-12 h-12 animate-spin text-slate-400" /></div>;
    }

    return (
        <>
            <EditPlaylistModal isOpen={isEditModalOpen} onClose={() => setEditModalOpen(false)} playlist={playlist} onPlaylistUpdated={handlePlaylistUpdated} />
            <AddTracksToPlaylistModal isOpen={isAddTracksModalOpen} onClose={() => setAddTracksModalOpen(false)} onAddTracks={handleAddTracks} existingTrackIds={new Set(playlist.tracks.map(t=>t._id))} />

            <main className="flex-1 p-4 md:p-8">
                <div 
                    className="ios-glass-final rounded-3xl w-full max-w-6xl mx-auto p-6 relative dark:dynamic-gradient"
                    style={{
                        '--color1': accentColors[0],
                        '--color2': accentColors[1]
                    }}
                >
                    <button onClick={() => navigate(-1)} className="absolute top-6 left-6 flex items-center space-x-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white z-10 transition-colors">
                        <ArrowLeft size={16}/>
                        <span>Назад</span>
                    </button>

                    <div className="flex flex-col items-center space-y-4 mb-8">
                        <div className={`w-40 h-40 rounded-lg bg-slate-200 dark:bg-slate-800 overflow-hidden flex-shrink-0 shadow-2xl ${getCoverGridClass()}`}>
                            {renderPlaylistCover()}
                        </div>
                        <div className="flex flex-col items-center text-center mt-2">
                            <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Плейлист</span>
                            <h1 className="text-4xl font-extrabold break-words mt-1 text-slate-900 dark:text-white">{playlist.name}</h1>
                            <div className="flex items-center space-x-2 mt-3 text-sm">
                                <Link to={`/profile/${playlist.user._id}`}>
                                    <Avatar size="sm" username={playlist.user.username} fullName={playlist.user.fullName} avatarUrl={playlist.user.avatar} />
                                </Link>
                                <Link to={`/profile/${playlist.user._id}`} className="font-bold hover:underline text-slate-800 dark:text-white">{playlist.user.fullName || playlist.user.username}</Link>
                                <span className="text-slate-500 dark:text-slate-400">• {playlist.tracks.length} треков, {totalMinutes} мин.</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center justify-center flex-wrap gap-2 mb-8">
                        <button onClick={handlePlayPlaylist} className="px-6 py-3 bg-yellow-400 text-black font-bold rounded-full flex items-center space-x-2 hover:scale-105 transition-transform">
                            <Play size={24} fill="currentColor" />
                            <span>Слушать</span>
                        </button>
                        {isOwner && (
                            <>
                                <button onClick={() => setAddTracksModalOpen(true)} className="p-3 bg-slate-200 dark:bg-white/10 rounded-full text-slate-600 dark:text-white hover:bg-slate-300 dark:hover:bg-white/20 transition-colors" title="Добавить треки"><PlusCircle /></button>
                                <button onClick={() => setEditModalOpen(true)} className="p-3 bg-slate-200 dark:bg-white/10 rounded-full text-slate-600 dark:text-white hover:bg-slate-300 dark:hover:bg-white/20 transition-colors" title="Редактировать"><Edit /></button>
                                <button onClick={handleDeletePlaylist} className="p-3 bg-slate-200 dark:bg-white/10 rounded-full text-slate-600 dark:text-white hover:bg-slate-300 dark:hover:bg-white/20 transition-colors" title="Удалить плейлист"><Trash2 /></button>
                            </>
                        )}
                        <button 
                            onClick={handleToggleShuffle}
                            className={`p-3 rounded-full transition-colors ${isShuffle ? 'bg-yellow-400/80 text-black' : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-white hover:bg-slate-300 dark:hover:bg-white/20'}`} 
                            title="Перемешать"
                        >
                            <Shuffle />
                        </button>
                        <button 
                            onClick={handleToggleRepeat}
                            className={`p-3 rounded-full transition-colors ${isRepeat ? 'bg-yellow-400/80 text-black' : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-white hover:bg-slate-300 dark:hover:bg-white/20'}`} 
                            title="Повторять"
                        >
                            <Repeat />
                        </button>
                    </div>

                    <div className="space-y-1">
                        <div className="grid grid-cols-[auto_1fr_auto] gap-x-4 px-4 text-sm text-slate-500 dark:text-slate-400 border-b border-slate-300 dark:border-white/10 pb-2">
                            <div className="text-center">#</div>
                            <div>Название</div>
                            <div className="flex justify-end"><Clock size={16} /></div>
                        </div>
                        {playlist.tracks.map((track, index) => (
                            <PlaylistTrackItem
                                key={track._id}
                                track={track}
                                index={index + 1}
                                onPlay={() => handleSelectTrack(track)}
                                isCurrent={track._id === currentTrack?._id}
                                isPlaying={isPlaying}
                                isSaved={myMusicTrackIds?.has(track.sourceId || track._id)}
                                onToggleSave={onToggleLike}
                                onRemoveFromPlaylist={isOwner ? handleRemoveTrack : null}
                            />
                        ))}
                    </div>
                </div>
            </main>
        </>
    );
};

export default PlaylistPage;