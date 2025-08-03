// frontend/src/pages/ArtistPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import useTitle from '../hooks/useTitle';
import { Loader2, Play, ArrowLeft, Shuffle } from 'lucide-react';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import Avatar from '../components/Avatar';
import PlaylistTrackItem from '../components/music/PlaylistTrackItem';
import AlbumCard from '../components/music/AlbumCard';
import { useDynamicAccent } from '../hooks/useDynamicAccent';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL;

const ArtistPage = () => {
    const { artistId } = useParams();
    const navigate = useNavigate();
    const [artistData, setArtistData] = useState(null);
    const [loading, setLoading] = useState(true);
    const { playTrack, currentTrack, isPlaying, onToggleLike, myMusicTrackIds } = useMusicPlayer();

    const fetchArtistData = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/api/music/artist/${artistId}`, { headers: { Authorization: `Bearer ${token}` } });
            setArtistData(res.data);
        } catch (error) {
            toast.error("Не удалось загрузить данные артиста.");
            navigate('/music');
        } finally {
            setLoading(false);
        }
    }, [artistId, navigate]);

    useEffect(() => {
        fetchArtistData();
    }, [fetchArtistData]);

    useTitle(artistData ? artistData.artist.name : 'Артист');

    const accentGradient = useDynamicAccent(artistData?.artist.avatarUrl);

    const handlePlayTopTracks = (startShuffled = false) => {
        if (artistData && artistData.topTracks.length > 0) {
            playTrack(artistData.topTracks[0], artistData.topTracks, {
                startShuffled: startShuffled
            });
        }
    };

    if (loading || !artistData) {
        return <div className="flex-1 p-8 flex items-center justify-center"><Loader2 className="w-12 h-12 animate-spin text-slate-400" /></div>;
    }

    // <<<--- НАЧАЛО ИЗМЕНЕНИЯ 1: Извлекаем новые данные ---
    const { artist, topTracks, albums, featuredOn, singles } = artistData;
    // <<<--- КОНЕЦ ИЗМЕНЕНИЯ 1 ---

    return (
        <main className="flex-1 overflow-y-auto">
            <div 
                className="p-6 md:p-8 pt-20 relative text-white transition-all duration-500 min-h-[300px] flex flex-col justify-end"
                style={{ backgroundImage: accentGradient }}
            >
                <button onClick={() => navigate(-1)} className="absolute top-6 left-6 flex items-center space-x-2 text-sm text-white/80 hover:text-white z-10 transition-colors">
                    <ArrowLeft size={16}/>
                    <span>Назад</span>
                </button>
                <div className="flex items-center space-x-6">
                    <div className="flex-shrink-0">
                        <Avatar size="xl" username={artist.name} avatarUrl={artist.avatarUrl} />
                    </div>
                    <div>
                        <h1 className="text-5xl md:text-7xl font-extrabold" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>{artist.name}</h1>
                    </div>
                </div>
            </div>

            <div className="p-6 md:p-8">
                <div className="flex items-center space-x-4 mb-8">
                    <button onClick={() => handlePlayTopTracks(false)} className="px-8 py-3 bg-yellow-400 text-black font-bold rounded-full flex items-center space-x-2 hover:scale-105 transition-transform">
                        <Play size={24} fill="currentColor" />
                        <span>Слушать</span>
                    </button>
                    <button onClick={() => handlePlayTopTracks(true)} className="p-3 bg-slate-200 dark:bg-white/10 rounded-full text-slate-600 dark:text-white hover:bg-slate-300 dark:hover:bg-white/20 transition-colors" title="Слушать вперемешку">
                        <Shuffle />
                    </button>
                </div>
                
                {topTracks.length > 0 && (
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Популярные треки</h2>
                        <div className="space-y-1">
                            {topTracks.slice(0, 5).map((track, index) => (
                                <PlaylistTrackItem
                                    key={track._id}
                                    track={track}
                                    index={index + 1}
                                    onPlay={() => playTrack(track, topTracks)}
                                    isCurrent={track._id === currentTrack?._id}
                                    isPlaying={isPlaying}
                                    isSaved={myMusicTrackIds?.has(track._id)}
                                    onToggleSave={onToggleLike}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {albums.length > 0 && (
                     <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Альбомы</h2>
                        {/* <<<--- НАЧАЛО ИЗМЕНЕНИЯ 2: Уменьшаем размер карточек --- */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {/* <<<--- КОНЕЦ ИЗМЕНЕНИЯ 2 --- */}
                            {albums.map(album => (
                                <AlbumCard key={album._id} album={album} />
                            ))}
                        </div>
                    </div>
                )}
                
                {/* <<<--- НАЧАЛО ИЗМЕНЕНИЯ 3: Новый блок для синглов --- */}
                {singles && singles.length > 0 && (
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Сольные треки (синглы)</h2>
                        <div className="space-y-1">
                            {singles.map((track, index) => (
                                <PlaylistTrackItem
                                    key={track._id}
                                    track={track}
                                    index={index + 1}
                                    onPlay={() => playTrack(track, singles)}
                                    isCurrent={track._id === currentTrack?._id}
                                    isPlaying={isPlaying}
                                    isSaved={myMusicTrackIds?.has(track._id)}
                                    onToggleSave={onToggleLike}
                                />
                            ))}
                        </div>
                    </div>
                )}
                {/* <<<--- КОНЕЦ ИЗМЕНЕНИЯ 3 --- */}

                {/* <<<--- НАЧАЛО ИЗМЕНЕНИЯ 4: Новый блок для участия в релизах --- */}
                {featuredOn && featuredOn.length > 0 && (
                     <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-4">Участие в других релизах</h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {featuredOn.map(album => (
                                <AlbumCard key={album._id} album={album} />
                            ))}
                        </div>
                    </div>
                )}
                {/* <<<--- КОНЕЦ ИЗМЕНЕНИЯ 4 --- */}
            </div>
        </main>
    );
};

export default ArtistPage;