// frontend/src/pages/AlbumPage.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import useTitle from '../hooks/useTitle';
import { Loader2, Play, Music, Clock, ArrowLeft, Shuffle } from 'lucide-react';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import Avatar from '../components/Avatar';
import PlaylistTrackItem from '../components/music/PlaylistTrackItem';
import { useDynamicAccent } from '../hooks/useDynamicAccent';
import toast from 'react-hot-toast';
import { useCachedImage } from '../hooks/useCachedImage';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import RecommendationCard from '../components/music/RecommendationCard';

const API_URL = import.meta.env.VITE_API_URL;

const CachedImage = ({ src, alt }) => {
    const { finalSrc, loading } = useCachedImage(src);
    if (loading) {
        return <div className="w-full h-full object-cover bg-slate-800 animate-pulse"></div>;
    }
    return <img src={finalSrc} alt={alt} className="w-full h-full object-cover" />;
};

const AlbumPage = () => {
    const { albumId } = useParams();
    const navigate = useNavigate();
    const [album, setAlbum] = useState(null);
    const [loading, setLoading] = useState(true);
    const [recommendations, setRecommendations] = useState([]);
    const [loadingRecs, setLoadingRecs] = useState(false);
    const { playTrack, currentTrack, isPlaying, onToggleLike, myMusicTrackIds, loadingTrackId, togglePlayPause } = useMusicPlayer();
    
    // --- НАЧАЛО ИЗМЕНЕНИЙ ---
    const [isScrolled, setIsScrolled] = useState(false);
    const mainRef = useRef(null);
    // --- КОНЕЦ ИЗМЕНЕНИЙ ---

    const fetchAlbum = useCallback(async () => {
        setLoading(true);
        setRecommendations([]);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/api/music/album/${albumId}`, { headers: { Authorization: `Bearer ${token}` } });
            setAlbum(res.data);
            
            setLoadingRecs(true);
            try {
                const recsRes = await axios.get(`${API_URL}/api/music/album/${albumId}/recommendations`, { headers: { Authorization: `Bearer ${token}` } });
                setRecommendations(recsRes.data);
            } catch (recError) {
                console.error("Не удалось загрузить рекомендации:", recError);
            } finally {
                setLoadingRecs(false);
            }

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

    // --- НАЧАЛО ИЗМЕНЕНИЙ: Добавляем отслеживание скролла для эффекта "залипания" шапки ---
    useEffect(() => {
        const mainEl = mainRef.current;
        if (!mainEl) return;
        const handleScroll = () => {
            setIsScrolled(mainEl.scrollTop > 10);
        };
        mainEl.addEventListener('scroll', handleScroll);
        return () => {
            mainEl.removeEventListener('scroll', handleScroll);
        };
    }, []);
    // --- КОНЕЦ ИЗМЕНЕНИЙ ---

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

    const isSingle = album.tracks.length === 1;

    const totalDurationMs = album.tracks.reduce((acc, track) => acc + (track.durationMs || 0), 0);
    const totalMinutes = Math.floor(totalDurationMs / 60000);

    return (
        // --- НАЧАЛО ИСПРАВЛЕНИЯ ---
        <main ref={mainRef} className="flex-1 overflow-y-auto bg-slate-100 dark:bg-slate-900">
            {/* Новая "липкая" шапка */}
            <div 
                className="sticky top-0 z-20 p-6 md:p-8 pt-20 text-white min-h-[350px] flex flex-col justify-end transition-all duration-300"
                style={{ backgroundImage: gradient }}
            >
                {/* Эффект размытия при скролле */}
                <div 
                    className={`absolute inset-0 -z-10 bg-slate-900/50 backdrop-blur-lg transition-opacity duration-300 ${isScrolled ? 'opacity-100' : 'opacity-0'}`}
                />
                <button 
                    onClick={() => navigate(-1)} 
                    className="absolute top-10 left-6 flex items-center space-x-2 text-sm z-10 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-lg hover:scale-105 hover:bg-white transition-all font-semibold"
                    style={{ color: dominantColor }}
                >
                    <ArrowLeft size={16} strokeWidth={2.5} />
                    <span>Назад</span>
                </button>
                
                {/* Основная информация в шапке */}
                <div className="relative flex flex-col md:flex-row items-center md:items-end space-y-4 md:space-y-0 md:space-x-6">
                    <div className="w-48 h-48 md:w-56 md:h-56 rounded-lg bg-slate-800 overflow-hidden flex-shrink-0 shadow-2xl">
                        <CachedImage src={album.coverArtUrl} alt={album.title} />
                    </div>
                    <div className="flex flex-col items-center md:items-start text-center md:text-left">
                        <span className="text-sm font-bold opacity-80" style={{ color: textColor }}>
                            {isSingle ? 'Сингл' : 'Альбом'}
                        </span>
                        <h1 className="text-4xl md:text-6xl font-extrabold break-words mt-1" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)', color: textColor }}>{album.title}</h1>
                        <div className="flex items-center space-x-2 mt-3 md:mt-4 text-sm flex-wrap justify-center md:justify-start" style={{ color: textColor, opacity: 0.9 }}>
                            <Link to={`/artist/${album.artist._id}`} className="hover:underline">
                                <div className="flex items-center space-x-2">
                                    <Avatar size="sm" username={album.artist.name} avatarUrl={album.artist.avatarUrl} />
                                    <span className="font-bold">{album.artist.name}</span>
                                </div>
                            </Link>
                            <span className="opacity-80">• {album.releaseDate ? format(new Date(album.releaseDate), 'LLLL yyyy', { locale: ru }) : ''} • {album.tracks.length} треков, {totalMinutes} мин.</span>
                            {album.totalPlayCount > 0 && (
                                <span className="opacity-80 flex items-center space-x-1">
                                    <span>•</span>
                                    <Play size={14} fill="currentColor" />
                                    <span>{album.totalPlayCount.toLocaleString('ru-RU')}</span>
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Контент страницы */}
            <div className="p-6 md:p-8 relative bg-slate-100 dark:bg-slate-900">
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
                {(loadingRecs || recommendations.length > 0) && (
                    <div className="mt-12">
                        <h2 className="text-2xl font-bold mb-4">Похожие треки</h2>
                        {loadingRecs ? (
                            <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-slate-400"/></div>
                        ) : (
                            <div className="flex space-x-4 overflow-x-auto pb-4 -mx-6 px-6">
                                {recommendations.map((recTrack) => (
                                    <div key={recTrack._id} className="w-1/5 sm:w-1/6 lg:w-1/12 flex-shrink-0">
                                        <RecommendationCard
                                            track={recTrack}
                                            onSelectTrack={() => playTrack(recTrack, recommendations)}
                                            isCurrent={recTrack._id === currentTrack?._id}
                                            isPlaying={isPlaying && recTrack._id === currentTrack?._id}
                                            isLoading={loadingTrackId === recTrack._id}
                                            onPlayPause={togglePlayPause}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </main>
        // --- КОНЕЦ ИСПРАВЛЕНИЯ ---
    );
};

export default AlbumPage;