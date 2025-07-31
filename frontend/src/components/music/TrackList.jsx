// frontend/src/components/music/TrackList.jsx

import React from 'react';
import TrackItem from './TrackItem';

const TrackList = ({ 
    tracks, onSelectTrack, currentPlayingTrackId, isPlaying, 
    onToggleSave, myMusicTrackIds, progress, duration, onSeek, 
    loadingTrackId, buffered, onPlayPauseToggle, 
    showDeleteButtons = false, onDeleteFromHistory,
    showRemoveButtons = false, onRemoveFromPlaylist
}) => {
    return (
        <div className="space-y-1"> {/* Уменьшаем отступ для плотности */}
            {tracks.map((track, index) => (
                // Используем React.Fragment, чтобы добавить разделитель
                <React.Fragment key={track.youtubeId}>
                    {/* --- ИЗМЕНЕНИЕ: Добавляем разделитель перед каждым элементом, кроме первого --- */}
                    {index > 0 && (
                        <hr className="border-slate-200/50 dark:border-slate-700/50 my-1" />
                    )}
                    <TrackItem
                        track={track}
                        onSelectTrack={onSelectTrack}
                        isCurrent={track.youtubeId === currentPlayingTrackId}
                        isPlaying={isPlaying}
                        onToggleSave={onToggleSave}
                        isSaved={myMusicTrackIds.has(track.youtubeId)}
                        progress={progress}
                        duration={duration}
                        onSeek={onSeek}
                        loadingTrackId={loadingTrackId}
                        buffered={buffered}
                        onPlayPauseToggle={onPlayPauseToggle}
                        showDeleteButton={showDeleteButtons}
                        onDeleteFromHistory={onDeleteFromHistory}
                        showRemoveButton={showRemoveButtons}
                        onRemoveFromPlaylist={onRemoveFromPlaylist}
                    />
                </React.Fragment>
            ))}
        </div>
    );
};

export default TrackList;