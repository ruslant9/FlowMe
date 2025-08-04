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
            {tracks.map((track, index) => {
                const isSaved = track.type === 'saved' || myMusicTrackIds.has(track.sourceId || track._id);
                return (
                    <React.Fragment key={track._id || track.youtubeId || index}>
                        <PlaylistTrackItem
                            track={track}
                            index={index + 1}
                            onPlay={() => onSelectTrack(track)}
                            isCurrent={track._id === currentPlayingTrackId}
                            isPlaying={isPlaying}
                            onToggleSave={onToggleSave}
                            isSaved={isSaved} 
                            onRemoveFromPlaylist={showRemoveButtons ? onRemoveFromPlaylist : null}
                        />
                    </React.Fragment>
                );
            })}
        </div>
    );
};

export default TrackList;