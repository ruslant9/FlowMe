// frontend/src/pages/SinglePage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import useTitle from '../hooks/useTitle';
import { Loader2, Play, Clock, ArrowLeft, Shuffle } from 'lucide-react';
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

// Компонент для кешированного изображения
const CachedImage = ({ src, alt }) => {
    const { finalSrc, loading } = useCachedImage(src);
    if (loading) {
        return <div className="w-full h-full object-cover bg-slate-800 animate-pulse"></div>;
    }
    return <img src={finalSrc} alt={alt} className="w-full h-full object-cover" />;
};

const renderArtistLinks = (artists) => {
    if (!artists || artists.length === 0) return null;
    return artists.map((artist, index) => (
        <React.Fragment key={artist._id}>
            <Link to={`/artist/${artist._id}`} className="font-bold hover:underline">
                {artist.name}
            </Link>
            {index < artists.length - 1 && ', '}
        </React.Fragment>
    ));
};

const SinglePage = () => {
    const { trackId } = useParams();
    const navigate = useNavigate();
    const [track, setTrack] = useState(null);
    const [loading, setLoading] = useState(true);
    const [recommendations, setRecommendations] = useState([]);
    const [loadingRecs, setLoadingRecs] = useState(false);
    const { playTrack, currentTrack, isPlaying, onToggleLike, myMusicTrackIds, loadingTrackId, togglePlayPause } = useMusicPlayer();

    const fetchTrack = useCallback(async () => {
        setLoading(true);
        setRecommendations([]);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/api/music/track/${trackId}`, { headers: { Authorization: `Bearer ${token}` } });
            setTrack(res.data);
            
            setLoadingRecs(true);
            try {
                const recsRes = await axios.get(`${API_URL}/api/music/track/${trackId}/recommendations`, { headers: { Authorization: `Bearer ${token}` } });
                setRecommendations(recsRes.data);
            } catch (recError) {
                console.error("Could not load recommendations:", recError);
            } finally {
                setLoadingRecs(false);
            }

        } catch (error) {
            toast.error("Не удалось загрузить трек.");
            navigate('/music');
        } finally {
            setLoading(false);
        }
    }, [trackId, navigate]);

    useEffect(() => {
        fetchTrack();
    }, [fetchTrack]);

    const primaryArtist = track?.artist?.[0];

    useTitle(track ? `${track.title} - ${primaryArtist?.name}` : 'Сингл');

    const { gradient, dominantColor, textColor } = useDynamicAccent(track?.albumArtUrl);

    const handlePlaySingle = () => {
        if (track) {
            playTrack(track, [track]);
        }
    };

    if (loading || !track || !primaryArtist) {
        return <div className="flex-1 p-8 flex items-center justify-center"><Loader2 className="w-12 h-12 animate-spin text-slate-400" /></div>;
    }

    const totalMinutes = Math.floor((track.durationMs || 0) / 60000);

    return (
        <main className="flex-1 overflow-y-auto">
            <div className="relative">
                <div 
                    className="p-6 md:p-8 pt-32 pb-32 transition-all duration-500"
                    style={{ backgroundImage: gradient }}
                >
                    <button 
                        onClick={() => navigate(-1)} 
                        className="absolute top-10 left-6 flex items-center space-x-2 text-sm z-10 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-lg hover:scale-105 hover:bg-white transition-all font-semibold"
                        style={{ color: dominantColor }}
                    >
                        <ArrowLeft size={16} strokeWidth={2.5} />
                        <span>Назад</span>
                    </button>

                    <div className="flex flex-col md:flex-row items-center md:items-center space-y-4 md:space-y-0 md:space-x-6">
                        <div className="w-48 h-48 md:w-56 md:h-56 rounded-lg bg-slate-800 overflow-hidden flex-shrink-0 shadow-2xl md:ml-24">
                            <CachedImage src={track.albumArtUrl} alt={track.title} />
                        </div>
                        <div className="flex flex-col items-center md:items-start text-center md:text-left">
                            <span className="text-sm font-bold" style={{ color: textColor, opacity: 0.8 }}>Сингл</span>
                            <h1 className="text-4xl md:text-6xl font-extrabold break-words mt-1" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)', color: textColor }}>{track.title}</h1>
                            <div className="flex items-center space-x-2 mt-4 text-sm" style={{ color: textColor }}>
                                <Link to={`/artist/${primaryArtist._id}`}>
                                    <Avatar size="sm" username={primaryArtist.name} avatarUrl={primaryArtist.avatarUrl} />
                                </Link>
                                <div style={{ color: textColor }}>{renderArtistLinks(track.artist)}</div>
                                <span className="opacity-70">• {track.releaseDate ? format(new Date(track.releaseDate), 'LLLL yyyy', { locale: ru }) : ''} • 1 трек, {totalMinutes} мин.</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-100 dark:from-slate-900 to-transparent pointer-events-none" />
            </div>

            <div className="p-6 md:p-8 relative z-[1] bg-slate-100 dark:bg-slate-900">
                <div className="flex items-center space-x-4 mb-8">
                    <button 
                        onClick={handlePlaySingle} 
                        className="px-8 py-3 text-black font-bold rounded-full flex items-center space-x-2 hover:scale-105 transition-transform"
                        style={{ backgroundColor: dominantColor, color: textColor }}
                    >
                        <Play size={24} fill="currentColor" />
                        <span>Слушать</span>
                    </button>
                     <button onClick={() => playTrack(track, [track], { startShuffled: true })} className="p-3 bg-slate-200 dark:bg-white/10 rounded-full text-slate-600 dark:text-white hover:bg-slate-300 dark:hover:bg-white/20 transition-colors" title="Слушать вперемешку">
                        <Shuffle />
                    </button>
                </div>

                <div className="space-y-1">
                    <div className="grid grid-cols-[auto_1fr_auto] gap-x-4 px-4 text-sm text-slate-500 dark:text-slate-400 border-b border-slate-300 dark:border-white/10 pb-2">
                        <div className="text-center">#</div>
                        <div>Название</div>
                        <div className="flex justify-end"><Clock size={16} /></div>
                    </div>
                    <PlaylistTrackItem
                        key={track._id}
                        track={track}
                        index={1}
                        onPlay={handlePlaySingle}
                        isCurrent={track._id === currentTrack?._id}
                        isPlaying={isPlaying}
                        isSaved={myMusicTrackIds?.has(track._id)}
                        onToggleSave={onToggleLike}
                        accentColor={dominantColor}
                    />
                </div>
                {(loadingRecs || recommendations.length > 0) && (
                    <div className="mt-12">
                        <h2 className="text-2xl font-bold mb-4">Похожие треки</h2>
                        {loadingRecs ? (
                            <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-slate-400"/></div>
                        ) : (
                            // --- НАЧАЛО ИСПРАВЛЕНИЯ: Обновляем классы для размера карточек ---
                            <div className="flex space-x-4 overflow-x-auto pb-4 -mx-6 px-6">
                                {recommendations.map((recTrack) => (
                                    <div key={recTrack._id} className="w-1/6 sm:w-[12.5%] md:w-[10%] lg:w-1/12 flex-shrink-0">
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
                            // --- КОНЕЦ ИСПРАВЛЕНИЯ ---
                        )}
                    </div>
                )}
            </div>
        </main>
    );
};

export default SinglePage;