import { useCallback, useEffect } from 'react';
import { registerPlugin } from '@capacitor/core';
import { usePlayerStore, useAuthStore } from '../store';
import { getStreamUrl, getActiveServerUrl, API_BASE } from '../api';

const MediaNotification = registerPlugin('MediaNotification');

// ── Global Audio Singleton ──────────────────────────────────────────────────
// Single Audio element shared across all components and pages
const audio = typeof window !== 'undefined' ? new Audio() : null;
if (audio) {
  audio.preload = 'auto';
}

let isInitialized = false;
let currentPlayRequestId = 0;
let isSwitchingTrack = false;
let prefetchTimeout = null;

function updateMediaSession(song, isPlaying = true) {
  if (!song) return;

  // 1. Browser MediaSession (Desktop / Web)
  if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
    try {
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: song.title || 'Sync Play Track',
        artist: song.artist || 'Sync Play',
        album: song.album || 'Sync Play Collection',
        artwork: song.thumbnail_url
          ? [
              { src: song.thumbnail_url, sizes: '96x96', type: 'image/jpeg' },
              { src: song.thumbnail_url, sizes: '192x192', type: 'image/jpeg' },
              { src: song.thumbnail_url, sizes: '512x512', type: 'image/jpeg' },
            ]
          : [],
      });
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    } catch (_) {}
  }

  // 2. Native Android Lock Screen & Notification Bar
  try {
    MediaNotification.updateMetadata({
      title: song.title || 'Sync Play Track',
      artist: song.artist || 'Sync Play',
      isPlaying: Boolean(isPlaying),
      artwork: song.thumbnail_url || '',
    }).catch(() => {});
  } catch (_) {}
}

function prefetchNextInQueue() {
  if (prefetchTimeout) clearTimeout(prefetchTimeout);
  prefetchTimeout = setTimeout(() => {
    try {
      const { queue, queueIndex, shuffle, repeat } = usePlayerStore.getState();
      if (!queue || queue.length === 0) return;
      if (shuffle || repeat === 'one') return;

      let nextIndex = queueIndex + 1;
      if (nextIndex >= queue.length) {
        if (repeat === 'all') nextIndex = 0;
        else return;
      }

      const nextSong = queue[nextIndex];
      if (nextSong && nextSong.youtube_id) {
        const auth = useAuthStore.getState();
        getStreamUrl(nextSong.youtube_id, auth.currentUser?.id).catch(() => {});
      }
    } catch (_) {}
  }, 2000);
}

function handleNextGlobal() {
  const { playNext } = usePlayerStore.getState();
  const nextSong = playNext();
  if (nextSong) {
    playSongGlobal(nextSong);
  }
}

function handlePrevGlobal() {
  if (audio && audio.currentTime > 3) {
    audio.currentTime = 0;
    usePlayerStore.getState().setCurrentTime(0);
    return;
  }
  const { playPrev } = usePlayerStore.getState();
  const prevSong = playPrev();
  if (prevSong) {
    playSongGlobal(prevSong);
  }
}

function togglePlayGlobal() {
  if (!audio) return;
  const { currentSong, isLoading } = usePlayerStore.getState();
  if (isLoading || isSwitchingTrack) return;

  if (!audio.src || audio.src === '' || audio.src === window.location.href) {
    if (currentSong) {
      playSongGlobal(currentSong);
    }
    return;
  }

  if (audio.paused) {
    audio.play().catch(console.error);
  } else {
    audio.pause();
  }
}

function initGlobalAudioListeners() {
  if (!audio || isInitialized) return;
  isInitialized = true;

  audio.addEventListener('timeupdate', () => {
    if (!isSwitchingTrack) {
      usePlayerStore.getState().setCurrentTime(audio.currentTime);
    }
  });

  audio.addEventListener('durationchange', () => {
    if (!isSwitchingTrack && audio.duration) {
      usePlayerStore.getState().setDuration(audio.duration);
    }
  });

  audio.addEventListener('play', () => {
    if (!isSwitchingTrack) {
      usePlayerStore.getState().setIsPlaying(true);
      const { currentSong } = usePlayerStore.getState();
      updateMediaSession(currentSong, true);
    }
  });

  audio.addEventListener('pause', () => {
    // Only set isPlaying = false if this was not an intentional unload during song switch
    if (isSwitchingTrack || !audio.src || audio.src === '' || audio.src === window.location.href) {
      return;
    }
    usePlayerStore.getState().setIsPlaying(false);
    const { currentSong } = usePlayerStore.getState();
    updateMediaSession(currentSong, false);
  });

  audio.addEventListener('waiting', () => {
    usePlayerStore.getState().setIsLoading(true);
  });

  audio.addEventListener('playing', () => {
    isSwitchingTrack = false;
    usePlayerStore.getState().setIsPlaying(true);
    usePlayerStore.getState().setIsLoading(false);
    const { currentSong } = usePlayerStore.getState();
    updateMediaSession(currentSong, true);
  });

  audio.addEventListener('canplay', () => {
    if (!isSwitchingTrack) {
      usePlayerStore.getState().setIsLoading(false);
    }
  });

  audio.addEventListener('ended', () => {
    // Crucial: Ignore ended event if switching tracks or src is empty/data
    if (isSwitchingTrack || !audio.src || audio.src === '' || audio.src.startsWith('data:')) return;

    // Ignore phantom ended events when track hasn't actually played
    if (!audio.duration || audio.duration < 1 || audio.currentTime < 1) return;

    const { repeat, playNext } = usePlayerStore.getState();
    if (repeat === 'one') {
      audio.currentTime = 0;
      audio.play().catch(console.error);
      return;
    }

    const nextSong = playNext();
    if (nextSong) {
      playSongGlobal(nextSong);
    } else {
      usePlayerStore.getState().setIsPlaying(false);
    }
  });

  audio.addEventListener('error', (e) => {
    // Ignore error if audio was deliberately cleared during track switch
    if (isSwitchingTrack) return;
    console.error('[Audio Error]:', e);
    usePlayerStore.getState().setIsLoading(false);
  });

  // Setup MediaSession handlers for mobile lockscreen, notifications & Bluetooth headphones
  if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
    try {
      navigator.mediaSession.setActionHandler('play', togglePlayGlobal);
      navigator.mediaSession.setActionHandler('pause', togglePlayGlobal);
      navigator.mediaSession.setActionHandler('nexttrack', handleNextGlobal);
      navigator.mediaSession.setActionHandler('previoustrack', handlePrevGlobal);
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (audio && details.seekTime !== undefined) {
          audio.currentTime = details.seekTime;
          usePlayerStore.getState().setCurrentTime(details.seekTime);
        }
      });
    } catch (_) {}
  }

  // Setup Native Android Lock Screen & Notification Action Listener
  try {
    MediaNotification.addListener('mediaAction', ({ action }) => {
      if (action === 'play') {
        if (audio && audio.paused) audio.play().catch(console.error);
      } else if (action === 'pause') {
        if (audio && !audio.paused) audio.pause();
      } else if (action === 'next') {
        handleNextGlobal();
      } else if (action === 'prev') {
        handlePrevGlobal();
      } else if (action === 'stop') {
        if (audio) audio.pause();
      }
    });
  } catch (_) {}
}

// Global play function accessible inside event listeners & click handlers
async function playSongGlobal(song) {
  if (!audio || !song) return;
  const requestId = ++currentPlayRequestId;
  const store = usePlayerStore.getState();
  const auth = useAuthStore.getState();

  isSwitchingTrack = true;

  // 1. Immediately update UI state to the clicked track
  store.setSong(song);
  store.setIsLoading(true);
  store.setIsPlaying(true);
  store.setCurrentTime(0);
  store.setDuration(song.duration || 0);

  // 2. STOP and UNLOAD previous audio completely
  // Removing src and calling load() ensures the previous song stops 100% and cannot replay
  try {
    audio.pause();
  } catch (_) {}
  audio.removeAttribute('src');
  audio.load();

  try {
    // 3. Fetch the real audio stream URL (uses fast backend cache when available)
    const { data } = await getStreamUrl(song.youtube_id, auth.currentUser?.id);

    // Stale check: if user clicked Next again while waiting, discard this request
    if (requestId !== currentPlayRequestId) {
      console.log(`[Player] Stale play request #${requestId} discarded for "${song.title}"`);
      return;
    }

    const url = data.url;
    store.setStreamUrl(url);

    // Update song with resolved YouTube ID if it was converted from sp_ placeholder
    if (data.resolvedYoutubeId && data.resolvedYoutubeId !== song.youtube_id) {
      store.updateSongInQueue(song.youtube_id, {
        ...song,
        youtube_id: data.resolvedYoutubeId,
        ...(data.song || {}),
      });
    }

    // 5. Load and play new track
    audio.src = url;
    audio.currentTime = 0;
    audio.volume = store.isMuted ? 0 : store.volume;

    isSwitchingTrack = false;
    await audio.play();

    if (requestId === currentPlayRequestId) {
      store.setIsPlaying(true);
      store.setIsLoading(false);
      updateMediaSession(song);
      prefetchNextInQueue();
    }
  } catch (err) {
    if (requestId !== currentPlayRequestId) return;

    console.warn('[Player] Direct stream failed, attempting proxy:', err.message);
    try {
      const proxyUrl = `${getActiveServerUrl()}/stream/${song.youtube_id}/proxy`;
      audio.src = proxyUrl;
      audio.currentTime = 0;
      audio.volume = store.isMuted ? 0 : store.volume;

      isSwitchingTrack = false;
      await audio.play();

      if (requestId === currentPlayRequestId) {
        store.setIsPlaying(true);
        store.setIsLoading(false);
        updateMediaSession(song);
        prefetchNextInQueue();
      }
    } catch (proxyErr) {
      if (requestId !== currentPlayRequestId) return;
      console.error('[Player] All stream attempts failed:', proxyErr);
      isSwitchingTrack = false;
      store.setIsLoading(false);
      store.setIsPlaying(false);
    }
  }
}

export function usePlayer() {
  const { volume, isMuted } = usePlayerStore();

  // Initialize listeners once
  useEffect(() => {
    initGlobalAudioListeners();
  }, []);

  // Sync volume & mute
  useEffect(() => {
    if (!audio) return;
    audio.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  const playSong = useCallback((song) => {
    return playSongGlobal(song);
  }, []);

  const togglePlay = useCallback(() => {
    togglePlayGlobal();
  }, []);

  const seek = useCallback((time) => {
    if (!audio) return;
    audio.currentTime = time;
    usePlayerStore.getState().setCurrentTime(time);
  }, []);

  const seekByPercent = useCallback((percent) => {
    if (!audio) return;
    if (audio.duration) {
      const time = (percent / 100) * audio.duration;
      audio.currentTime = time;
      usePlayerStore.getState().setCurrentTime(time);
    }
  }, []);

  const handleNext = useCallback(() => {
    handleNextGlobal();
  }, []);

  const handlePrev = useCallback(() => {
    handlePrevGlobal();
  }, []);

  return {
    playSong,
    togglePlay,
    seek,
    seekByPercent,
    handleNext,
    handlePrev,
    audio,
  };
}
