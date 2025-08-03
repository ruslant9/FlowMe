// frontend/src/pages/ArtistPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import useTitle from '../hooks/useTitle';
import { Loader2, Play, ArrowLeft, Shuffle, Info } from 'lucide-react';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import Avatar from '../components/Avatar';
import PlaylistTrackItem from '../components/music/PlaylistTrackItem';
import AlbumCard from '../components/music/AlbumCard';
import { useDynamicAccent } from '../hooks/useDynamicAccent';
import toast from 'react-hot-toast';
import ArtistInfoPanel from '../components/music/ArtistInfoPanel';
import { AnimatePresence } from 'framer-motion';

const API_URL = import.meta.env.VITE_API_URL;
const INITIAL_DISPLAY_LIMIT = 6;

const ArtistPage = () => {
    const { artistId } = useParams();
    const navigate = useNavigate();
    const [artistData, setArtistData] = useState(null);
    const [loading, setLoading] = useState(true);
    const { playTrack, currentTrack, isPlaying, onToggleLike, myMusicTrackIds } = useMusicPlayer();
    
    const [showAllAlbums, setShowAllAlbums] = useState(false);
    const [showAllSingles, setShowAllSingles] = useState(false);
    const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(false);

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

    // --- НАЧАЛО ИСПРАВЛЕНИЯ: Получаем объект с цветами из хука ---
    const { gradient, dominantColor } = useDynamicAccent(artistData?.artist.avatarUrl);
    // --- КОНЕЦ ИСПРАВЛЕНИЯ ---

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

    const { artist, topTracks, albums, featuredOn, singles } = artistData;
    
    const displayedAlbums = showAllAlbums ? albums : albums.slice(0, INITIAL_DISPLAY_LIMIT);
    const displayedSingles = showAllSingles ? singles : singles.slice(0, INITIAL_DISPLAY_LIMIT);


    return (
        <>
            <ArtistInfoPanel
                artist={artist}
                isOpen={isInfoPanelOpen}
                onClose={() => setIsInfoPanelOpen(false)}
            />
            <main className="flex-1 overflow-y-auto">
                <div 
                    className="p-6 md:p-8 pt-20 relative text-white transition-all duration-500 min-h-[300px] flex flex-col justify-end"
                    // --- ИСПРАВЛЕНИЕ: Используем `gradient` ---
                    style={{ backgroundImage: gradient }}
                >
                    <button onClick={() => navigate(-1)} className="absolute top-6 left-6 flex items-center space-x-2 text-sm text-white/80 hover:text-white z-10 transition-colors">
                        <ArrowLeft size={16}/>
                        <span>Назад</span>
                    </button>
                    <div className="flex items-center space-x-6">
                        <div className="flex-shrink-0">
                            <Avatar size="2xl" username={artist.name} avatarUrl={artist.avatarUrl} />
                        </div>
                        <div>
                            <h1 className="text-5xl md:text-7xl font-extrabold" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>{artist.name}</h1>
                        </div>
                    </div>
                </div>

                <div className="p-6 md:p-8">
                    <div className="flex items-center space-x-4 mb-8">
                        {/* --- ИСПРАВЛЕНИЕ: Применяем динамический цвет к кнопке --- */}
                        <button 
                            onClick={() => handlePlayTopTracks(false)} 
                            className="px-8 py-3 text-black font-bold rounded-full flex items-center space-x-2 hover:scale-105 transition-transform"
                            style={{ backgroundColor: dominantColor }}
                        >
                            <Play size={24} fill="currentColor" />
                            <span>Слушать</span>
                        </button>
                        <button onClick={() => handlePlayTopTracks(true)} className="p-3 bg-slate-200 dark:bg-white/10 rounded-full text-slate-600 dark:text-white hover:bg-slate-300 dark:hover:bg-white/20 transition-colors" title="Слушать вперемешку">
                            <Shuffle />
                        </button>
                        <button onClick={() => setIsInfoPanelOpen(true)} className="p-3 bg-slate-200 dark:bg-white/10 rounded-full text-slate-600 dark:text-white hover:bg-slate-300 dark:hover:bg-white/20 transition-colors" title="Об исполнителе">
                            <Info />
                        </button>
                    </div>
                    
                    {topTracks.length > 0 && (
                        <div>
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
                                        // --- ИСПРАВЛЕНИЕ: Передаем цвет в компонент трека ---
                                        accentColor={dominantColor}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {albums.length > 0 && (
                        <div>
                            <hr className="my-12 border-slate-200 dark:border-slate-700/50" />
                            <h2 className="text-2xl font-bold mb-4">Альбомы</h2>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                {displayedAlbums.map(album => (
                                    <AlbumCard key={album._id} album={album} />
                                ))}
                            </div>
                            {albums.length > INITIAL_DISPLAY_LIMIT && (
                                <div className="mt-6 text-center">
                                    <button onClick={() => setShowAllAlbums(prev => !prev)} className="px-6 py-2 bg-slate-200 dark:bg-white/10 text-sm font-semibold rounded-full hover:bg-slate-300 dark:hover:bg-white/20 transition-colors">
                                        {showAllAlbums ? 'Скрыть' : 'Показать еще'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {singles && singles.length > 0 && (
                        <div>
                            <hr className="my-12 border-slate-200 dark:border-slate-700/50" />
                            <h2 className="text-2xl font-bold mb-4">Сольные треки (синглы)</h2>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                {displayedSingles.map(single => {
                                    const singleAsAlbum = {
                                        _id: single._id,
                                        title: single.title,
                                        coverArtUrl: single.albumArtUrl,
                                        artist: single.artist,
                                        releaseYear: single.releaseYear,
                                        isSingle: true 
                                    };
                                    return <AlbumCard key={single._id} album={singleAsAlbum} />;
                                })}
                            </div>
                            {singles.length > INITIAL_DISPLAY_LIMIT && (
                                <div className="mt-6 text-center">
                                    <button onClick={() => setShowAllSingles(prev => !prev)} className="px-6 py-2 bg-slate-200 dark:bg-white/10 text-sm font-semibold rounded-full hover:bg-slate-300 dark:hover:bg-white/20 transition-colors">
                                        {showAllSingles ? 'Скрыть' : 'Показать еще'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {featuredOn && featuredOn.length > 0 && (
                         <div>
                            <hr className="my-12 border-slate-200 dark:border-slate-700/50" />
                            <h2 className="text-2xl font-bold mb-4">Участие в других релизах</h2>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                {featuredOn.map(album => (
                                    <AlbumCard key={album._id} album={album} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </>
    );
};

export default ArtistPage;