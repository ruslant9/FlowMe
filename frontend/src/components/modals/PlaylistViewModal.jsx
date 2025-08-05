// frontend/src/components/modals/PlaylistViewModal.jsx

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Music, Edit, PlusCircle, Play, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import TrackList from '../music/TrackList';
import { useMusicPlayer } from '../../context/MusicPlayerContext';
import { useUser } from '../../hooks/useUser';
import Avatar from '../Avatar';
import { Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL;

const PlaylistViewModal = ({ 
    isOpen, 
    onClose, 
    playlist, 
    myMusicTrackIds, 
    onToggleSave, 
    onOpenEditModal, 
    onRemoveTrack,
    onOpenAddTracksModal
}) => {
    const { currentUser } = useUser();
    const { playTrack, currentTrack, isPlaying, progress, duration, seekTo, loadingTrackId, buffered, togglePlayPause } = useMusicPlayer();

    if (!playlist) return null;

    const isOwner = currentUser?._id === playlist.user?._id;

    const handleSelectTrack = (youtubeId) => {
        const trackToPlay = playlist.tracks.find(t => t.youtubeId === youtubeId);
        if (trackToPlay) {
            playTrack(trackToPlay, playlist.tracks, playlist._id);
        }
    };
    
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
                    <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="ios-glass-final w-full max-w-2xl p-6 rounded-3xl flex flex-col text-slate-900 dark:text-white max-h-[85vh]">
                        
                        {/* --- НАЧАЛО ИЗМЕНЕНИЙ В ВЕРСТКЕ --- */}
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center space-x-4">
                                <div className="w-24 h-24 rounded-lg bg-slate-200 dark:bg-slate-800 grid grid-cols-2 grid-rows-2 overflow-hidden flex-shrink-0">
                                    {playlist.coverImageUrls && playlist.coverImageUrls.length > 0 ? (
                                        playlist.coverImageUrls.map((url, index) => (
                                            <img key={index} src={url} alt="" className="w-full h-full object-cover"/>
                                        ))
                                    ) : (
                                        <div className="col-span-2 row-span-2 flex items-center justify-center text-slate-400 dark:text-slate-600">
                                            <Music size={48} />
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col items-start">
                                    <h2 className="text-2xl font-bold">{playlist.name}</h2>
                                    <p className="text-sm text-slate-500 dark:text-white/60 mt-1">{playlist.description}</p>
                                    
                                    {/* Блок с автором и датой */}
                                    <div className="mt-1 space-y-1">
                                        <Link to={`/profile/${playlist.user._id}`} onClick={onClose} className="flex items-center space-x-2 group">
                                            <Avatar 
                                                size="sm"
                                                username={playlist.user.username}
                                                fullName={playlist.user.fullName}
                                                avatarUrl={playlist.user.avatar}
                                            />
                                            <div>
                                                <span className="text-sm font-semibold group-hover:underline">{playlist.user.fullName || playlist.user.username}</span>
                                                <span className="text-sm text-slate-500 dark:text-white/60"> (автор)</span>
                                            </div>
                                       </Link>
                                       <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-white/60 pl-1" title="Дата создания">
                                            <Calendar size={12}/>
                                            <span>{format(new Date(playlist.createdAt), 'dd.MM.yyyy')}</span>
                                       </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                {isOwner && (
                                    <>
                                        <button onClick={onOpenAddTracksModal} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10" title="Добавить треки">
                                            <PlusCircle size={20} />
                                        </button>
                                        <button onClick={onOpenEditModal} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10" title="Редактировать">
                                            <Edit size={20} />
                                        </button>
                                    </>
                                )}
                                <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10"><X /></button>
                            </div>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto -mr-2 pr-2 min-h-0">
                            {playlist.tracks && playlist.tracks.length > 0 ? (
                                <TrackList
                                    tracks={playlist.tracks}
                                    onSelectTrack={handleSelectTrack}
                                    currentPlayingTrackId={currentTrack?.youtubeId}
                                    isPlaying={isPlaying}
                                    onToggleSave={onToggleSave}
                                    myMusicTrackIds={myMusicTrackIds || new Set()}
                                    progress={progress}
                                    duration={duration}
                                    onSeek={seekTo}
                                    loadingTrackId={loadingTrackId}
                                    buffered={buffered}
                                    onPlayPauseToggle={togglePlayPause}
                                    showRemoveButtons={isOwner}
                                    onRemoveFromPlaylist={onRemoveTrack}
                                />
                            ) : (
                                <div className="text-center py-10 text-slate-500 dark:text-white/60">
                                    <Music className="mx-auto mb-2" />
                                    <p>В этом плейлисте пока нет треков.</p>
                                </div>
                            )}
                        </div>

                        {/* Футер со счетчиком прослушиваний */}
                        <div className="flex justify-end items-center text-xs text-slate-500 dark:text-white/60 pt-3 mt-auto">
                            <div className="flex items-center space-x-1.5" title="Прослушивания">
                                <Play size={12}/>
                                <span>{playlist.playCount || 0}</span>
                           </div>
                        </div>
                        {/* --- КОНЕЦ ИЗМЕНЕНИЙ В ВЕРСТКЕ --- */}

                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default PlaylistViewModal;