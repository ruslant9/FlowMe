// frontend/src/components/music/TrackList.jsx

import React from 'react';
import PlaylistTrackItem from './PlaylistTrackItem';

const TrackList = ({ 
    tracks, onSelectTrack, currentPlayingTrackId, isPlaying, 
    onToggleSave, myMusicTrackIds, progress, duration, onSeek, 
    loadingTrackId, buffered, onPlayPauseToggle, 
    showDeleteButtons = false, onDeleteFromHistory,
    showRemoveButtons = false, onRemoveFromPlaylist
}) => {
    return (
        <div className="space-y-1">
            {tracks.map((track, index) => (
                <React.Fragment key={track._id || track.youtubeId || index}>
                    <PlaylistTrackItem
                        track={track}
                        index={index + 1}
                        onPlay={() => onSelectTrack(track)}
                        isCurrent={track._id === currentPlayingTrackId}
                        isPlaying={isPlaying}
                        onToggleSave={onToggleSave}
                        isSaved={myMusicTrackIds.has(track.youtubeId || track._id)}
                        onRemoveFromPlaylist={showRemoveButtons ? onRemoveFromPlaylist : null}
                    />
                </React.Fragment>
            ))}
        </div>
    );
};

export default TrackList;