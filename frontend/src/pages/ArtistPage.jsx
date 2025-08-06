// frontend/src/pages/ArtistPage.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import useTitle from '../hooks/useTitle';
import { Loader2, Play, ArrowLeft, Shuffle, Info, Users, UserPlus, Check } from 'lucide-react';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import Avatar from '../components/Avatar';
import PlaylistTrackItem from '../components/music/PlaylistTrackItem';
import AlbumCard from '../components/music/AlbumCard';
import { useDynamicAccent } from '../hooks/useDynamicAccent';
import toast from 'react-hot-toast';
import ArtistInfoPanel from '../components/music/ArtistInfoPanel';
import PageWrapper from '../components/PageWrapper';

const API_URL = import.meta.env.VITE_API_URL;
const INITIAL_DISPLAY_LIMIT = 8;

const ArtistPage = () => {
    const { artistId } = useParams();
    const navigate = useNavigate();
    const [artistData, setArtistData] = useState(null);
    const [loading, setLoading] = useState(true);
    const { playTrack, currentTrack, isPlaying, onToggleLike, myMusicTrackIds } = useMusicPlayer();
    
    const [showAllAlbums, setShowAllAlbums] = useState(false);
    const [showAllSingles, setShowAllSingles] = useState(false);
    const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(false);

    const [isScrolled, setIsScrolled] = useState(false);
    const mainRef = useRef(null);

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

    useTitle(artistData ? artistData.artist.name : 'Артист');

    const { gradient, dominantColor, textColor } = useDynamicAccent(artistData?.artist.avatarUrl);

    const handlePlayTopTracks = (startShuffled = false) => {
        if (artistData && artistData.topTracks.length > 0) {
            playTrack(artistData.topTracks[0], artistData.topTracks, {
                startShuffled: startShuffled
            });
        }
    };
    
    const handleSubscribeToggle = async () => {
        if (!artistData) return;
        const wasSubscribed = artistData.isSubscribed;
        
        setArtistData(prev => ({
            ...prev,
            isSubscribed: !wasSubscribed,
            subscriberCount: wasSubscribed ? prev.subscriberCount - 1 : prev.subscriberCount + 1
        }));

        try {
            const token = localStorage.getItem('token');
            const endpoint = wasSubscribed ? 'unsubscribe' : 'subscribe';
            await axios.post(`${API_URL}/api/music/artist/${artistId}/${endpoint}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (error) {
            toast.error('Не удалось обновить подписку.');
            setArtistData(prev => ({
                ...prev,
                isSubscribed: wasSubscribed,
                subscriberCount: wasSubscribed ? prev.subscriberCount + 1 : prev.subscriberCount - 1
            }));
        }
    };


    if (loading || !artistData) {
        return <div className="flex-1 p-8 flex items-center justify-center"><Loader2 className="w-12 h-12 animate-spin text-slate-400" /></div>;
    }

    const { artist, topTracks, albums, featuredOn, singles, totalPlayCount, subscriberCount, isSubscribed } = artistData;
    
    const displayedAlbums = showAllAlbums ? albums : albums.slice(0, INITIAL_DISPLAY_LIMIT);
    const displayedSingles = showAllSingles ? singles : singles.slice(0, INITIAL_DISPLAY_LIMIT);


    return (
        <PageWrapper>
            <ArtistInfoPanel
                artist={artist}
                isOpen={isInfoPanelOpen}
                onClose={() => setIsInfoPanelOpen(false)}
            />
            <main ref={mainRef} className="flex-1 overflow-y-auto bg-slate-100 dark:bg-slate-900">
                <div 
                    className="sticky top-0 z-20 p-6 md:p-8 pt-20 text-white min-h-[300px] flex flex-col justify-end transition-all duration-300"
                    style={{ backgroundImage: gradient }}
                >
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
                    
                    <div className="relative">
                        <div className="flex flex-col space-y-4">
                            <div className="flex items-center space-x-6">
                                <Avatar size="2xl" username={artist.name} avatarUrl={artist.avatarUrl} />
                                {/* --- НАЧАЛО ИЗМЕНЕНИЯ 1: Добавлен break-words для переноса длинных имён --- */}
                                <h1 className="text-5xl md:text-7xl font-extrabold break-words" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)', color: textColor }}>{artist.name}</h1>
                            </div>
                            {/* --- НАЧАЛО ИЗМЕНЕНИЯ 2: Добавлен flex-wrap для переноса статистики --- */}
                            <div className="flex items-center space-x-4 text-sm font-semibold flex-wrap" style={{ color: textColor }}>
                                <div className="flex items-center space-x-1.5">
                                    <Users size={16} />
                                    <span>{subscriberCount.toLocaleString('ru-RU')} подписчиков</span>
                                </div>
                                <div className="flex items-center space-x-1.5">
                                    <Play size={16} fill="currentColor" />
                                    <span>{totalPlayCount.toLocaleString('ru-RU')} прослушиваний</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 md:p-8 relative bg-slate-100 dark:bg-slate-900">
                    {/* --- НАЧАЛО ИЗМЕНЕНИЯ 3: Добавлен flex-wrap и gap-4 для корректного переноса кнопок --- */}
                    <div className="flex items-center flex-wrap gap-4 mb-8">
                        <button 
                            onClick={() => handlePlayTopTracks(false)} 
                            className="px-8 py-3 font-bold rounded-full flex items-center space-x-2 hover:scale-105 transition-transform"
                            style={{ backgroundColor: dominantColor, color: textColor }}
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
                        <button 
                            onClick={handleSubscribeToggle}
                            className={`px-6 py-3 font-bold rounded-full flex items-center space-x-2 hover:scale-105 transition-all duration-200 text-sm
                                ${isSubscribed 
                                    ? 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-white' 
                                    : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white'
                                }`
                            }
                        >
                            {isSubscribed ? <Check size={18} /> : <UserPlus size={18} />}
                            <span>{isSubscribed ? 'Вы подписаны' : 'Подписаться'}</span>
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
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-8 gap-4">
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
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-8 gap-4">
                                {displayedSingles.map(single => {
                                    const singleAsAlbum = {
                                        _id: single._id,
                                        title: single.title,
                                        coverArtUrl: single.albumArtUrl,
                                        artist: single.artist,
                                        releaseDate: single.releaseDate,
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
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-8 gap-4">
                                {featuredOn.map(album => (
                                    <AlbumCard key={album._id} album={album} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </PageWrapper>
    );
};

export default ArtistPage;