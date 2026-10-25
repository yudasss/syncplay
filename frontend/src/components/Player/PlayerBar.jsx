import React, { useCallback, useRef } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Shuffle, 
  Repeat, 
  Repeat1, 
  Mic2, 
  Volume2, 
  Volume1, 
  VolumeX, 
  Maximize2,
  Music
} from 'lucide-react';
import { usePlayerStore } from '../../store';
import { usePlayer } from '../../hooks/usePlayer';
import styles from './Player.module.css';

function formatTime(sec) {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function PlayerBar() {
  const {
    currentSong,
    isPlaying,
    isLoading,
    currentTime,
    duration,
    volume,
    isMuted,
    shuffle,
    repeat,
    isExpanded,
    showLyrics,
    setExpanded,
    setShowLyrics,
    setVolume,
    setMuted,
    toggleShuffle,
    cycleRepeat,
  } = usePlayerStore();

  const { togglePlay, seekByPercent, handleNext, handlePrev } = usePlayer();
  const progressRef = useRef(null);

  const handleProgressClick = useCallback((e) => {
    const bar = progressRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const percent = ((e.clientX - rect.left) / rect.width) * 100;
    seekByPercent(Math.max(0, Math.min(100, percent)));
  }, [seekByPercent]);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!currentSong) return null;

  return (
    <div className={`${styles.playerBar} ${isExpanded ? styles.hidden : ''}`}>
      {/* Mobile Hairline Progress Bar */}
      <div className={styles.mobileProgressLine}>
        <div 
          className={styles.mobileProgressFill} 
          style={{ width: `${progressPercent}%` }} 
        />
      </div>

      {/* Left: Song Meta */}
      <div 
        className={styles.songInfo} 
        onClick={() => {
          setShowLyrics(false);
          setExpanded(true);
        }}
      >
        <div className={styles.cover}>
          {currentSong.thumbnail_url ? (
            <img src={currentSong.thumbnail_url} alt={currentSong.title} />
          ) : (
            <div className={styles.coverPlaceholder}>
              <Music size={18} strokeWidth={1.5} />
            </div>
          )}
          {isPlaying && (
            <div className={styles.playingOverlay}>
              <div className="now-playing-bars">
                <span /><span /><span />
              </div>
            </div>
          )}
        </div>
        <div className={styles.meta}>
          <span className={styles.songTitle} title={currentSong.title}>
            {currentSong.title}
          </span>
          <span className={styles.songArtist} title={currentSong.artist}>
            {currentSong.artist}
          </span>
        </div>
      </div>

      {/* Desktop Center: Controls & Timeline */}
      <div className={`${styles.controls} ${styles.desktopOnly}`}>
        <div className={styles.controlButtons}>
          <button
            className={`${styles.ctrlBtn} ${shuffle ? styles.active : ''}`}
            onClick={toggleShuffle}
            title={shuffle ? 'Shuffle Aktif' : 'Acak Lagu'}
          >
            <Shuffle size={16} strokeWidth={shuffle ? 2.5 : 1.8} />
          </button>

          <button 
            className={styles.ctrlBtn} 
            onClick={handlePrev} 
            title="Lagu Sebelumnya"
          >
            <SkipBack size={18} fill="currentColor" strokeWidth={0} />
          </button>

          <button
            className={styles.playBtn}
            onClick={togglePlay}
            disabled={isLoading}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isLoading ? (
              <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
            ) : isPlaying ? (
              <Pause size={18} fill="currentColor" strokeWidth={0} />
            ) : (
              <Play size={18} fill="currentColor" strokeWidth={0} style={{ marginLeft: 2 }} />
            )}
          </button>

          <button 
            className={styles.ctrlBtn} 
            onClick={handleNext} 
            title="Lagu Berikutnya"
          >
            <SkipForward size={18} fill="currentColor" strokeWidth={0} />
          </button>

          <button
            className={`${styles.ctrlBtn} ${repeat !== 'none' ? styles.active : ''}`}
            onClick={cycleRepeat}
            title={`Ulangi: ${repeat === 'one' ? 'Lagu Ini' : repeat === 'all' ? 'Semua' : 'Mati'}`}
          >
            {repeat === 'one' ? (
              <Repeat1 size={17} strokeWidth={2.4} />
            ) : (
              <Repeat size={16} strokeWidth={repeat === 'all' ? 2.4 : 1.8} />
            )}
          </button>
        </div>

        {/* Progress Bar */}
        <div className={styles.progressRow}>
          <span className={styles.time}>{formatTime(currentTime)}</span>
          <div
            ref={progressRef}
            className={styles.progressBar}
            onClick={handleProgressClick}
          >
            <div className={styles.progressTrack}>
              <div 
                className={styles.progressFill} 
                style={{ width: `${progressPercent}%` }} 
              />
            </div>
          </div>
          <span className={styles.time}>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Desktop Right: Actions */}
      <div className={`${styles.actions} ${styles.desktopOnly}`}>
        <button
          className={`${styles.actionBtn} ${showLyrics ? styles.lyricsActive : ''}`}
          onClick={() => {
            setShowLyrics(true);
            setExpanded(true);
          }}
          title="Tampilkan Lirik Sinkron"
        >
          <Mic2 size={17} strokeWidth={showLyrics ? 2.2 : 1.8} />
          <span className={styles.actionText}>Lirik</span>
        </button>

        <div className={styles.volumeGroup}>
          <button
            className={styles.volumeBtn}
            onClick={() => setMuted(!isMuted)}
            title={isMuted ? 'Bunyikan' : 'Bisukan'}
          >
            {isMuted || volume === 0 ? (
              <VolumeX size={17} strokeWidth={1.8} />
            ) : volume < 0.5 ? (
              <Volume1 size={17} strokeWidth={1.8} />
            ) : (
              <Volume2 size={17} strokeWidth={1.8} />
            )}
          </button>
          <input
            type="range"
            className={styles.volumeSlider}
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={(e) => {
              setVolume(parseFloat(e.target.value));
              if (parseFloat(e.target.value) > 0) setMuted(false);
            }}
          />
        </div>

        <button
          className={styles.actionBtn}
          onClick={() => setExpanded(true)}
          title="Tampilan Layar Penuh"
        >
          <Maximize2 size={16} strokeWidth={1.8} />
        </button>
      </div>

      {/* Mobile Only Quick Actions */}
      <div className={styles.mobileActions}>
        <button
          className={styles.mobilePlayBtn}
          onClick={(e) => {
            e.stopPropagation();
            togglePlay();
          }}
          disabled={isLoading}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isLoading ? (
            <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
          ) : isPlaying ? (
            <Pause size={18} fill="currentColor" strokeWidth={0} />
          ) : (
            <Play size={18} fill="currentColor" strokeWidth={0} style={{ marginLeft: 2 }} />
          )}
        </button>

        <button
          className={styles.mobileNextBtn}
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
          title="Lagu Berikutnya"
        >
          <SkipForward size={18} fill="currentColor" strokeWidth={0} />
        </button>
      </div>
    </div>
  );
}
