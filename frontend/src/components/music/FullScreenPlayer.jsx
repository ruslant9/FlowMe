// frontend/src/components/music/FullScreenPlayer.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, Play, Pause, SkipBack, SkipForward, Heart, Shuffle, Repeat, List, MoreHorizontal, PlusCircle } from 'lucide-react';
import Slider from 'rc-slider';
import { Link } from 'react-router-dom';
import { useMusicPlayer } from '../../context/MusicPlayerContext';
import { useDynamicAccent } from '../../hooks/useDynamicAccent';
import Tippy from '@tippyjs/react/headless';
import AddToPlaylistModal from '../modals/AddToPlaylistModal';

const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds < 0) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
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
        isShuffle,
        isRepeat,
        isLiked,
        togglePlayPause,
        seekTo,
        prevTrack,
        nextTrack,
        toggleShuffle,
        toggleRepeat,
        onToggleLike,
        closeFullScreenPlayer
    } = useMusicPlayer();

    const [isMenuOpen, setMenuOpen] = useState(false);
    const [isAddToPlaylistModalOpen, setAddToPlaylistModalOpen] = useState(false);

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
                className="fixed inset-0 z-50 flex flex-col p-8 text-white"
                style={{ backgroundImage: gradient }}
            >
                <div className="absolute inset-0 bg-black/30 backdrop-blur-2xl"></div>

                <div className="relative z-10 flex flex-col items-center justify-between h-full">
                    <div className="w-full flex justify-end">
                        <button onClick={closeFullScreenPlayer} className="p-2 bg-black/20 rounded-full">
                            <ChevronDown size={28} />
                        </button>
                    </div>

                    <div className="flex-1 flex items-center justify-center w-full max-w-md">
                        <motion.div
                            animate={{ scale: isPlaying ? [1, 1.03, 1] : 1 }}
                            transition={{
                                duration: 1.2,
                                repeat: isPlaying ? Infinity : 0,
                                ease: "easeInOut"
                            }}
                        >
                            <motion.img 
                                key={track._id}
                                src={track.albumArtUrl} 
                                alt={track.title} 
                                className="w-full aspect-square rounded-2xl object-cover shadow-2xl" 
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.5, ease: 'easeOut' }}
                            />
                        </motion.div>
                    </div>
                    
                    <div className="w-full max-w-md">
                        <div className="text-center mb-6">
                            <h2 className="text-3xl font-bold truncate">{cleanTitle(track.title)}</h2>
                            <div className="text-lg opacity-70 truncate">{formatArtistName(track.artist)}</div>
                        </div>
                        
                        <div className="w-full">
                            <Slider min={0} max={duration} value={progress} onChange={seekTo} step={0.1} />
                            <div className="flex justify-between text-xs font-semibold opacity-70 mt-1">
                                <span>{formatTime(progress)}</span>
                                <span>{formatTime(duration)}</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-center space-x-6 my-6">
                            <button onClick={toggleShuffle} className={`p-3 transition-colors ${isShuffle ? 'text-yellow-400' : 'opacity-70 hover:opacity-100'}`}><Shuffle size={24}/></button>
                            <button onClick={prevTrack} className="p-3 opacity-90 hover:opacity-100"><SkipBack size={32}/></button>
                            <button onClick={togglePlayPause} className="w-20 h-20 bg-white text-black rounded-full flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform">
                                {isPlaying ? <Pause size={40} fill="currentColor"/> : <Play size={40} fill="currentColor" className="ml-1"/>}
                            </button>
                            <button onClick={nextTrack} className="p-3 opacity-90 hover:opacity-100"><SkipForward size={32}/></button>
                            <button onClick={toggleRepeat} className={`p-3 transition-colors ${isRepeat ? 'text-yellow-400' : 'opacity-70 hover:opacity-100'}`}><Repeat size={24}/></button>
                        </div>

                        <div className="flex items-center justify-between">
                            <Tippy
                                interactive
                                placement="top-start"
                                visible={isMenuOpen}
                                onClickOutside={() => setMenuOpen(false)}
                                render={attrs => (
                                    <div className="ios-glass-popover w-52 rounded-xl shadow-lg p-1" {...attrs}>
                                        <button 
                                            onClick={() => { setAddToPlaylistModalOpen(true); setMenuOpen(false); }}
                                            className="w-full text-left flex items-center space-x-2 px-3 py-1.5 text-sm rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                                        >
                                            <PlusCircle size={16}/> <span>Добавить в плейлист</span>
                                        </button>
                                        <div className="tippy-arrow" data-popper-arrow></div>
                                    </div>
                                )}
                            >
                                <button onClick={() => setMenuOpen(v => !v)} className="p-3 opacity-70 hover:opacity-100"><MoreHorizontal size={24}/></button>
                            </Tippy>
                            
                            <button className="p-3 opacity-70 hover:opacity-100"><List size={24}/></button>
                            <button onClick={() => onToggleLike(track)} className={`p-3 transition-colors ${isLiked ? 'text-red-500 opacity-100' : 'opacity-70 hover:opacity-100'}`}>
                                <Heart size={24} fill={isLiked ? 'currentColor' : 'none'}/>
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </>
    );
};

export default FullScreenPlayer;