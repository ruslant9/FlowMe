// frontend/src/components/music/TrackList.jsx

import React from 'react';
import TrackItem from './TrackItem';

const TrackList = ({ 
    tracks, onSelectTrack, currentPlayingTrackId, isPlaying, 
    onToggleSave, myMusicTrackIds, progress, duration, onSeek, 
    loadingTrackId, buffered, onPlayPauseToggle, 
    showDeleteButtons = false, onDeleteFromHistory,
    showRemoveButtons = false, onRemoveFromPlaylist,
    useSpotifyIdForSaving = false
}) => {
    return (
        <div className="space-y-1">
            {tracks.map((track, index) => (
                <React.Fragment key={track._id || track.youtubeId || index}>
                    {index > 0 && (
                        <hr className="border-slate-200/50 dark:border-slate-700/50 my-1" />
                    )}
                    <TrackItem
                        track={track}
                        // --- ИЗМЕНЕНИЕ: Передаем весь объект трека, а не только ID ---
                        onSelectTrack={() => onSelectTrack(track)}
                        isCurrent={track.youtubeId === currentPlayingTrackId}
                        isPlaying={isPlaying}
                        onToggleSave={onToggleSave}
                        isSaved={myMusicTrackIds.has(useSpotifyIdForSaving ? track.spotifyId : track._id)}
                        progress={progress}
                        duration={duration}
                        onSeek={onSeek}
                        loadingTrackId={loadingTrackId}
                        buffered={buffered}
                        onPlayPauseToggle={onPlayPauseToggle}
                        showDeleteButton={showDeleteButtons}
                        onDeleteFromHistory={onDeleteFromHistory}
                        showRemoveButton={showRemoveButtons}
                    />
                </React.Fragment>
            ))}
        </div>
    );
};

export default TrackList;