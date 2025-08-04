// frontend/src/pages/AlbumPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import useTitle from '../hooks/useTitle';
import { Loader2, Play, Music, Clock, ArrowLeft, Shuffle } from 'lucide-react';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import { useUser } from '../context/UserContext';
import Avatar from '../components/Avatar';
import PlaylistTrackItem from '../components/music/PlaylistTrackItem';
import { useDynamicAccent } from '../hooks/useDynamicAccent';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL;

const AlbumPage = () => {
    const { albumId } = useParams();
    const navigate = useNavigate();
    const [album, setAlbum] = useState(null);
    const [loading, setLoading] = useState(true);
    const { playTrack, currentTrack, isPlaying, onToggleLike, myMusicTrackIds } = useMusicPlayer();

    const fetchAlbum = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/api/music/album/${albumId}`, { headers: { Authorization: `Bearer ${token}` } });
            setAlbum(res.data);
        } catch (error) {
            toast.error("Не удалось загрузить альбом.");
            navigate('/music');
        } finally {
            setLoading(false);
        }
    }, [albumId, navigate]);

    useEffect(() => {
        fetchAlbum();
    }, [fetchAlbum]);

    useTitle(album ? `${album.title} - ${album.artist.name}` : 'Альбом');

    const { gradient, dominantColor, textColor } = useDynamicAccent(album?.coverArtUrl);


    const handlePlayAlbum = (startShuffled = false) => {
        if (album && album.tracks.length > 0) {
            playTrack(album.tracks[0], album.tracks, {
                startShuffled: startShuffled
            });
        }
    };

    if (loading || !album) {
        return <div className="flex-1 p-8 flex items-center justify-center"><Loader2 className="w-12 h-12 animate-spin text-slate-400" /></div>;
    }

    const totalDurationMs = album.tracks.reduce((acc, track) => acc + (track.durationMs || 0), 0);
    const totalMinutes = Math.floor(totalDurationMs / 60000);

    return (
        <main className="flex-1 overflow-y-auto">
            <div className="relative">
                <div 
className="p-6 md:p-8 pt-32 pb-32 transition-all duration-500"
                    style={{ backgroundImage: gradient }}
                >
                    <button onClick={() => navigate(-1)} className="absolute top-10 left-6 flex items-center space-x-2 text-sm text-white/80 hover:text-white z-10 transition-colors">
                        <ArrowLeft size={16}/>
                        <span>Назад</span>
                    </button>

                    <div className="flex flex-col md:flex-row items-center md:items-center space-y-4 md:space-y-0 md:space-x-6">
                        <div className="w-48 h-48 md:w-56 md:h-56 rounded-lg bg-slate-800 overflow-hidden flex-shrink-0 shadow-2xl md:ml-8">
                            <img src={album.coverArtUrl} alt={album.title} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex flex-col items-center md:items-start text-center md:text-left">
                            <span className="text-sm font-bold" style={{ color: textColor, opacity: 0.8 }}>Альбом</span>
                            <h1 className="text-4xl md:text-6xl font-extrabold break-words mt-1" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)', color: textColor }}>{album.title}</h1>
                            <div className="flex items-center space-x-2 mt-4 text-sm" style={{ color: textColor }}>
                                <Link to={`/artist/${album.artist._id}`}>
                                    <Avatar size="sm" username={album.artist.name} avatarUrl={album.artist.avatarUrl} />
                                </Link>
                                <Link to={`/artist/${album.artist._id}`} className="font-bold hover:underline" style={{ color: textColor }}>{album.artist.name}</Link>
                                <span className="opacity-70">• {album.releaseYear} • {album.tracks.length} треков, {totalMinutes} мин.</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-100 dark:from-slate-900 to-transparent pointer-events-none" />
            </div>

            <div className="p-6 md:p-8 relative z-[1] bg-slate-100 dark:bg-slate-900">
                <div className="flex items-center space-x-4 mb-8">
                    <button 
                        onClick={() => handlePlayAlbum(false)} 
                        className="px-8 py-3 font-bold rounded-full flex items-center space-x-2 hover:scale-105 transition-transform"
                        style={{ backgroundColor: dominantColor, color: textColor }}
                    >
                        <Play size={24} fill="currentColor" />
                        <span>Слушать</span>
                    </button>
                    <button onClick={() => handlePlayAlbum(true)} className="p-3 bg-slate-200 dark:bg-white/10 rounded-full text-slate-600 dark:text-white hover:bg-slate-300 dark:hover:bg-white/20 transition-colors" title="Слушать вперемешку">
                        <Shuffle />
                    </button>
                </div>

                <div className="space-y-1">
                    <div className="grid grid-cols-[auto_1fr_auto] gap-x-4 px-4 text-sm text-slate-500 dark:text-slate-400 border-b border-slate-300 dark:border-white/10 pb-2">
                        <div className="text-center">#</div>
                        <div>Название</div>
                        <div className="flex justify-end"><Clock size={16} /></div>
                    </div>
                    {album.tracks.map((track, index) => (
                        <PlaylistTrackItem
                            key={track._id}
                            track={track}
                            index={index + 1}
                            onPlay={() => playTrack(track, album.tracks)}
                            isCurrent={track._id === currentTrack?._id}
                            isPlaying={isPlaying}
                            isSaved={myMusicTrackIds?.has(track._id)}
                            onToggleSave={onToggleLike}
                            accentColor={dominantColor}
                        />
                    ))}
                </div>
            </div>
        </main>
    );
};

export default AlbumPage;