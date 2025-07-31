// frontend/src/components/YouTubePlayer.jsx

import React, { useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';

const YouTubePlayer = forwardRef(({ 
    videoId, 
    autoPlay, 
    onPlayPauseChange, 
    onProgressChange, 
    onDurationChange, 
    onVolumeChange, 
    onVideoEnd, 
    onBufferChange,
    onPlaybackError 
}, ref) => {
  const playerRef = useRef(null);
  const youtubePlayerInstance = useRef(null);
  const isPlayerReady = useRef(false);
  const currentVideoIdInPlayer = useRef(null);
  const progressIntervalRef = useRef(null);
  
  const autoPlayRef = useRef(autoPlay);
  useEffect(() => {
    autoPlayRef.current = autoPlay;
  }, [autoPlay]);

  const onVideoEndRef = useRef(onVideoEnd);
  useEffect(() => {
    onVideoEndRef.current = onVideoEnd;
  }, [onVideoEnd]);
  
  const onPlaybackErrorRef = useRef(onPlaybackError);
  useEffect(() => {
    onPlaybackErrorRef.current = onPlaybackError;
  }, [onPlaybackError]);

  const stopProgressInterval = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  const startProgressInterval = useCallback(() => {
    stopProgressInterval();
    progressIntervalRef.current = setInterval(() => {
      if (youtubePlayerInstance.current && typeof youtubePlayerInstance.current.getPlayerState === 'function') {
        const playerState = youtubePlayerInstance.current.getPlayerState();
        if (playerState === window.YT.PlayerState.PLAYING) {
          if (onProgressChange) onProgressChange(youtubePlayerInstance.current.getCurrentTime());
          if (onDurationChange) onDurationChange(youtubePlayerInstance.current.getDuration());
          if (onVolumeChange) onVolumeChange(youtubePlayerInstance.current.getVolume() / 100);
          if (onBufferChange) onBufferChange(youtubePlayerInstance.current.getVideoLoadedFraction());
        }
      } else {
        stopProgressInterval();
      }
    }, 1000);
  }, [onProgressChange, onDurationChange, onVolumeChange, stopProgressInterval, onBufferChange]);
  
  const startProgressIntervalRef = useRef(startProgressInterval);
  useEffect(() => {
    startProgressIntervalRef.current = startProgressInterval;
  }, [startProgressInterval]);

  useImperativeHandle(ref, () => ({
    playVideo: () => youtubePlayerInstance.current?.playVideo(),
    pauseVideo: () => youtubePlayerInstance.current?.pauseVideo(),
    seekTo: (seconds) => youtubePlayerInstance.current?.seekTo(seconds, true),
    setVolume: (vol) => youtubePlayerInstance.current?.setVolume(Math.round(vol * 100)),
    loadVideo: (newVideoId, startSeconds = 0) => {
      if (youtubePlayerInstance.current && isPlayerReady.current) {
        youtubePlayerInstance.current.loadVideoById(newVideoId, startSeconds);
        currentVideoIdInPlayer.current = newVideoId;
      }
    },
    stopVideo: () => youtubePlayerInstance.current?.stopVideo(),
  }));

  useEffect(() => {
    const createPlayer = () => {
      if (window.YT && window.YT.Player && playerRef.current) {
        youtubePlayerInstance.current = new window.YT.Player(playerRef.current, {
          height: '0',
          width: '0',
          playerVars: { 
            autoplay: 0,
            controls: 0,
            origin: window.location.origin,
          },
          events: {
            onReady: () => {
              isPlayerReady.current = true;
            },
            onStateChange: (event) => {
              const playerState = event.data;
              const YTPlayerState = window.YT.PlayerState;

              if (onPlayPauseChange) {
                onPlayPauseChange(playerState === YTPlayerState.PLAYING);
              }

              if (playerState === YTPlayerState.PLAYING) {
                startProgressIntervalRef.current();
              } else {
                stopProgressInterval();
              }
              
              if (playerState === YTPlayerState.CUED && autoPlayRef.current) {
                  youtubePlayerInstance.current.playVideo();
              }
              
              if (playerState === YTPlayerState.ENDED && onVideoEndRef.current) {
                onVideoEndRef.current(currentVideoIdInPlayer.current);
              }
            },
            onError: (event) => {
              const errorCode = event.data;
              console.error(`[Music Debug] YouTube Player Error Code: ${errorCode}`);
              if ((errorCode === 101 || errorCode === 150) && onPlaybackErrorRef.current) {
                  onPlaybackErrorRef.current(currentVideoIdInPlayer.current);
              }
            }
          },
        });
      }
    };
    
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      window.onYouTubeIframeAPIReady = createPlayer;
    } else {
      createPlayer();
    }

    return () => {
      stopProgressInterval();
      if (youtubePlayerInstance.current) {
        youtubePlayerInstance.current.destroy();
      }
    };
  }, [stopProgressInterval]); 

  useEffect(() => {
    if (!isPlayerReady.current || !youtubePlayerInstance.current) {
        return;
    }
    
    if (videoId && videoId !== currentVideoIdInPlayer.current) {
        youtubePlayerInstance.current.cueVideoById(videoId);
        currentVideoIdInPlayer.current = videoId;
    } else if (!videoId && currentVideoIdInPlayer.current) {
        youtubePlayerInstance.current.stopVideo();
        currentVideoIdInPlayer.current = null;
    } else if (videoId) {
        const playerState = youtubePlayerInstance.current.getPlayerState();
        const isCurrentlyPlaying = playerState === window.YT.PlayerState.PLAYING;
        
        if (autoPlay && !isCurrentlyPlaying) {
            youtubePlayerInstance.current.playVideo();
        } else if (!autoPlay && isCurrentlyPlaying) {
            youtubePlayerInstance.current.pauseVideo();
        }
    }
  }, [videoId, autoPlay]);

  return <div ref={playerRef} id="youtube-player"></div>;
});

YouTubePlayer.displayName = 'YouTubePlayer';
export default YouTubePlayer;