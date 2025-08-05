// frontend/src/components/music/FullScreenPlayer.jsx --- ИСПРАВЛЕННЫЙ ФАЙЛ ---

import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, Play, Pause, SkipBack, SkipForward, Heart, Shuffle, Repeat, List, MoreHorizontal, PlusCircle, Volume2, VolumeX } from 'lucide-react';
import Slider from 'rc-slider';
import { Link } from 'react-router-dom';
import { useMusicPlayer } from '../../context/MusicPlayerContext';
import { useDynamicAccent } from '../../hooks/useDynamicAccent';
import Tippy from '@tippyjs/react/headless';
import AddToPlaylistModal from '../modals/AddToPlaylistModal';
import { useCachedImage } from '../../hooks/useCachedImage';

const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds < 0) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
};

const CachedImage = ({ src, alt, style, className, key, initial, animate, transition }) => {
    const { finalSrc, loading } = useCachedImage(src);
    if (loading) {
        return <div className={`${className} bg-slate-800 animate-pulse`} style={style}></div>;
    }
    return <motion.img src={finalSrc} alt={alt} className={className} style={style} key={key} initial={initial} animate={animate} transition={transition} />;
};

const cleanTitle = (title) => {
    if (!title) return '';
    return title.replace(
        /\s*[\(\[](?:\s*(?:official\s*)?(?:video|music\s*video|lyric\s*video|audio|live|performance|visualizer|explicit|single|edit|remix|radio\s*edit|clean|dirty|HD|HQ|full|album\s*version|version|clip|demo|teaser|cover|karaoke|instrumental|extended|rework|reedit|re-cut|reissue|bonus\s*track|unplugged|mood\s*video|concert|show|feat\.?|ft\.?|featuring|\d{4}|(?:\d{2,3}\s?kbps))\s*)[^)\]]*[\)\]]\s*$/i,
        ''
    ).trim();
};

const formatArtistName = (artistData) => {
    if (!artistData) return '';
    if (Array.isArray(artistData)) {
        return artistData.map((artist, index) => (
            <React.Fragment key={artist._id || index}>
                <Link to={`/artist/${artist._id}`} className="hover:underline" onClick={(e) => e.stopPropagation()}>
                    {(artist.name || '').replace(' - Topic', '').trim()}
                </Link>
                {index < artistData.length - 1 && ', '}
            </React.Fragment>
        ));
    }
    if (typeof artistData === 'object' && artistData.name) {
        return (
            <Link to={`/artist/${artistData._id}`} className="hover:underline" onClick={(e) => e.stopPropagation()}>
                {artistData.name.replace(' - Topic', '').trim()}
            </Link>
        );
    }
    return <span>{artistData.toString()}</span>;
};

const FullScreenPlayer = () => {
    const {
        currentTrack: track,
        isPlaying,
        progress,
        duration,
        volume,
        isShuffle,
        isRepeat,
        isLiked,
        togglePlayPause,
        seekTo,
        setVolume,
        prevTrack,
        nextTrack,
        toggleShuffle,
        toggleRepeat,
        onToggleLike,
        closeFullScreenPlayer
    } = useMusicPlayer();

    const [isMenuOpen, setMenuOpen] = useState(false);
    const [isAddToPlaylistModalOpen, setAddToPlaylistModalOpen] = useState(false);
    
    const [rotate, setRotate] = useState({ x: 0, y: 0 });
    const parallaxRef = useRef(null);

    const handleMouseMove = (e) => {
        if (!parallaxRef.current) return;
        const rect = parallaxRef.current.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const xPct = mouseX / width - 0.5;
        const yPct = mouseY / height - 0.5;
        
        setRotate({
            x: yPct * -30,
            y: xPct * 30
        });
    };

    const handleMouseLeave = () => {
        setRotate({ x: 0, y: 0 });
    };

    const { gradient } = useDynamicAccent(track?.albumArtUrl);

    if (!track) return null;

    return (
        <>
            <AddToPlaylistModal 
                isOpen={isAddToPlaylistModalOpen}
                onClose={() => setAddToPlaylistModalOpen(false)}
                trackToAdd={track}
            />

            <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 400, damping: 40 }}
                className="fixed inset-0 z-50 flex flex-col p-4 md:p-8 text-white"
                style={{ backgroundImage: gradient }}
            >
                <div className="absolute inset-0 bg-black/30 backdrop-blur-2xl"></div>

                <div className="relative z-10 flex flex-col items-center h-full">
                    {/* --- НАЧАЛО ИЗМЕНЕНИЙ В ВЕРСТКЕ --- */}
                    <div className="w-full flex justify-end">
                        <button onClick={closeFullScreenPlayer} className="p-2 bg-black/20 rounded-full">
                            <ChevronDown size={28} />
                        </button>
                    </div>

                    <div className="flex-1 flex items-center justify-center w-full my-4 overflow-hidden">
                        <motion.div
                            ref={parallaxRef}
                            onMouseMove={handleMouseMove}
                            onMouseLeave={handleMouseLeave}
                            style={{ perspective: '1000px' }}
                             className="w-full h-full flex items-center justify-center"
                        >
                            <motion.div
                                animate={{
                                    scale: isPlaying ? [1, 1.03, 1] : 1,
                                    rotateX: rotate.x,
                                    rotateY: rotate.y
                                }}
                                transition={{
                                    scale: { duration: 1.2, repeat: isPlaying ? Infinity : 0, ease: "easeInOut" },
                                    rotateX: { type: 'spring', stiffness: 400, damping: 30 },
                                    rotateY: { type: 'spring', stiffness: 400, damping: 30 }
                                }}
                                style={{ transformStyle: 'preserve-3d' }}
                                className="w-full max-w-[70vw] md:max-w-md"
                            >
                                <CachedImage 
                                    key={track._id}
                                    src={track.albumArtUrl} 
                                    alt={track.title} 
                                    className="w-full aspect-square rounded-2xl object-cover" 
                                    style={{
                                        filter: 'drop-shadow(0 25px 25px rgb(0 0 0 / 0.5))'
                                    }}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.5, ease: 'easeOut' }}
                                />
                            </motion.div>
                        </motion.div>
                    </div>
                    
                    <div className="w-full max-w-md pb-4">
                        <div className="text-center mb-6">
                            <h2 className="text-2xl md:text-3xl font-bold truncate">{cleanTitle(track.title)}</h2>
                            <div className="text-base md:text-lg opacity-70 truncate">{formatArtistName(track.artist)}</div>
                        </div>
                        
                        <div className="w-full">
                            <Slider min={0} max={duration} value={progress} onChange={seekTo} step={0.1} />
                            <div className="flex justify-between text-xs font-semibold opacity-70 mt-1">
                                <span>{formatTime(progress)}</span>
                                <span>-{formatTime(duration - progress)}</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between my-4 px-2">
                            <button onClick={toggleShuffle} className={`p-3 transition-colors ${isShuffle ? 'text-yellow-400' : 'opacity-70 hover:opacity-100'}`}><Shuffle size={20}/></button>
                            <button onClick={prevTrack} className="p-3 opacity-90 hover:opacity-100"><SkipBack size={28}/></button>
                            <button 
                                onClick={togglePlayPause} 
                                className="w-16 h-16 md:w-20 md:h-20 bg-white text-black rounded-full flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform flex-shrink-0"
                            >
                                {isPlaying ? <Pause size={32} fill="currentColor"/> : <Play size={32} fill="currentColor" className="ml-1"/>}
                            </button>
                            <button onClick={nextTrack} className="p-3 opacity-90 hover:opacity-100"><SkipForward size={28}/></button>
                            <button onClick={toggleRepeat} className={`p-3 transition-colors ${isRepeat ? 'text-yellow-400' : 'opacity-70 hover:opacity-100'}`}><Repeat size={20}/></button>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex-1 flex justify-start">
                                <Tippy
                                    interactive
                                    placement="top-start"
                                    visible={isMenuOpen}
                                    onClickOutside={() => setMenuOpen(false)}
                                    render={attrs => (
                                        <div className="ios-glass-popover w-52 rounded-xl shadow-lg p-1" {...attrs}>
                                            <button 
                                                onClick={() => { setAddToPlaylistModalOpen(true); setMenuOpen(false); }}
                                                className="w-full text-left flex items-center space-x-2 px-3 py-1.5 text-sm rounded-lg text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700"
                                            >
                                                <PlusCircle size={16}/> <span>Добавить в плейлист</span>
                                            </button>
                                            <div className="tippy-arrow" data-popper-arrow></div>
                                        </div>
                                    )}
                                >
                                    <button onClick={() => setMenuOpen(v => !v)} className="p-3 opacity-70 hover:opacity-100"><MoreHorizontal size={24}/></button>
                                </Tippy>
                            </div>
                            
                            <div className="flex-1 flex justify-center">
                                <button className="p-3 opacity-70 hover:opacity-100"><List size={24}/></button>
                            </div>

                            <div className="flex-1 flex justify-end items-center space-x-2 md:space-x-4">
                                <div className="hidden md:flex items-center space-x-2 w-32">
                                    <button onClick={() => setVolume(volume > 0 ? 0 : 0.5)} className="p-2 opacity-70 hover:opacity-100">
                                        {volume > 0 ? <Volume2 size={20} /> : <VolumeX size={20} />}
                                    </button>
                                    <Slider min={0} max={1} step={0.01} value={volume} onChange={setVolume} className="w-full" />
                                </div>
                                <button onClick={() => onToggleLike(track)} className={`p-3 transition-colors ${isLiked ? 'text-red-500 opacity-100' : 'opacity-70 hover:opacity-100'}`}>
                                    <Heart size={24} fill={isLiked ? 'currentColor' : 'none'}/>
                                </button>
                            </div>
                        </div>
                    </div>
                    {/* --- КОНЕЦ ИЗМЕНЕНИЙ В ВЕРСТКЕ --- */}
                </div>
            </motion.div>
        </>
    );
};

export default FullScreenPlayer;