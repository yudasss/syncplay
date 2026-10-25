import React, { useEffect, useRef, useState } from 'react';
import { 
  ChevronDown, 
  Mic2, 
  X,
  Shuffle, 
  SkipBack, 
  Play, 
  Pause, 
  SkipForward, 
  Repeat, 
  Repeat1, 
  Volume2, 
  Volume1, 
  VolumeX, 
  Music 
} from 'lucide-react';
import { usePlayerStore, useLyricsStore } from '../../store';
import { usePlayer } from '../../hooks/usePlayer';
import { fetchLyrics } from '../../api';
import styles from './FullscreenPlayer.module.css';

function formatTime(sec) {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function FullscreenPlayer() {
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

  const { lyrics, isLoading: lyricsLoading, setLyrics, setLoading: setLyricsLoading, clearLyrics } = useLyricsStore();
  const { togglePlay, seekByPercent, handleNext, handlePrev } = usePlayer();
  const lyricsContainerRef = useRef(null);
  const progressRef = useRef(null);
  const mobileLyricsProgressRef = useRef(null);
  const [activeLyricIndex, setActiveLyricIndex] = useState(-1);

  // Fetch lyrics when song changes
  useEffect(() => {
    if (!currentSong) return;
    clearLyrics();
    setLyricsLoading(true);

    fetchLyrics(currentSong.title, currentSong.artist, currentSong.duration)
      .then(({ data }) => setLyrics(data))
      .catch((err) => {
        console.error('Failed to load lyrics:', err);
        setLyrics(null);
      })
      .finally(() => setLyricsLoading(false));
  }, [currentSong?.youtube_id, currentSong?.id, currentSong?.title]);

  // Sync active lyric line strictly inside the container (NEVER scroll the window or header)
  useEffect(() => {
    if (!lyrics?.synced) return;
    let idx = -1;
    for (let i = 0; i < lyrics.synced.length; i++) {
      if (lyrics.synced[i].time <= currentTime) idx = i;
      else break;
    }
    if (idx !== activeLyricIndex) {
      setActiveLyricIndex(idx);
      const container = lyricsContainerRef.current;
      if (container && idx >= 0) {
        const lines = container.querySelectorAll('[data-lyric-line]');
        const activeLine = lines[idx];
        if (activeLine) {
          // Precise mathematical scroll that touches ONLY the lyrics scrollbox
          const lineRect = activeLine.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          const relativeTop = lineRect.top - containerRect.top + container.scrollTop;
          const targetScroll = relativeTop - (container.clientHeight / 2) + (activeLine.clientHeight / 2);
          container.scrollTo({
            top: Math.max(0, targetScroll),
            behavior: 'smooth'
          });
        }
      }
    }
  }, [currentTime, lyrics]);

  const handleProgressClick = (e, barRef) => {
    const bar = barRef?.current || progressRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const percent = ((e.clientX - rect.left) / rect.width) * 100;
    seekByPercent(Math.max(0, Math.min(100, percent)));
  };

  const handleClose = () => {
    setExpanded(false);
    setShowLyrics(false);
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!isExpanded || !currentSong) return null;

  return (
    <div className={styles.overlay}>
      {/* Ambient Artwork Backdrop */}
      <div
        className={styles.ambientBackdrop}
        style={{
          backgroundImage: currentSong.thumbnail_url
            ? `url(${currentSong.thumbnail_url})`
            : 'none',
        }}
      />
      <div className={styles.backdropOverlay} />

      <div className={styles.container}>
        {/* Top Header - Always Fixed at Top */}
        <header className={styles.header}>
          <button 
            className={styles.headerIconBtn} 
            onClick={handleClose}
            title="Tutup Layar Penuh"
          >
            <ChevronDown size={22} strokeWidth={2.2} />
          </button>

          <div className={styles.headerTitleBox}>
            <span className={styles.headerLabel}>
              {showLyrics ? 'Lirik Sinkron' : 'Sedang Diputar'}
            </span>
            <span className={styles.headerSub}>
              {currentSong.title} • {currentSong.artist}
            </span>
          </div>

          <button
            className={`${styles.lyricsToggleBtn} ${showLyrics ? styles.lyricsActive : ''}`}
            onClick={() => setShowLyrics(!showLyrics)}
            title={showLyrics ? 'Kembali ke Cover' : 'Tampilkan Lirik'}
          >
            {showLyrics ? (
              <>
                <X size={15} strokeWidth={2.4} />
                <span>Tutup</span>
              </>
            ) : (
              <>
                <Mic2 size={15} strokeWidth={2} />
                <span>Lirik</span>
              </>
            )}
          </button>
        </header>

        {/* Main Stage */}
        <div className={`${styles.mainStage} ${showLyrics ? styles.mainStageWithLyrics : ''}`}>
          {/* Album Art & Details Section */}
          <div className={`${styles.artSection} ${showLyrics ? styles.artSectionHiddenMobile : ''}`}>
            <div className={styles.artFrame}>
              {currentSong.thumbnail_url ? (
                <img
                  src={currentSong.thumbnail_url}
                  alt={currentSong.title}
                  className={styles.artImage}
                />
              ) : (
                <div className={styles.artPlaceholder}>
                  <Music size={64} strokeWidth={1.2} />
                </div>
              )}
            </div>

            <div className={styles.trackDetails}>
              <h2 className={styles.titleText}>{currentSong.title}</h2>
              <p className={styles.artistText}>{currentSong.artist}</p>
            </div>

            {/* Timeline */}
            <div className={styles.timelineBox}>
              <div
                ref={progressRef}
                className={styles.progressBar}
                onClick={(e) => handleProgressClick(e, progressRef)}
              >
                <div className={styles.progressTrack}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
              <div className={styles.timeMarkers}>
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Playback Controls */}
            <div className={styles.controlsRow}>
              <button
                className={`${styles.controlIconBtn} ${shuffle ? styles.iconActive : ''}`}
                onClick={toggleShuffle}
                title="Acak Lagu"
              >
                <Shuffle size={18} strokeWidth={shuffle ? 2.5 : 1.8} />
              </button>

              <button 
                className={styles.controlIconBtn} 
                onClick={handlePrev}
                title="Lagu Sebelumnya"
              >
                <SkipBack size={22} fill="currentColor" strokeWidth={0} />
              </button>

              <button
                className={styles.mainPlayBtn}
                onClick={togglePlay}
                disabled={isLoading}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isLoading ? (
                  <div className="spinner" style={{ width: 22, height: 22, borderWidth: 2 }} />
                ) : isPlaying ? (
                  <Pause size={22} fill="currentColor" strokeWidth={0} />
                ) : (
                  <Play size={22} fill="currentColor" strokeWidth={0} style={{ marginLeft: 3 }} />
                )}
              </button>

              <button 
                className={styles.controlIconBtn} 
                onClick={handleNext}
                title="Lagu Berikutnya"
              >
                <SkipForward size={22} fill="currentColor" strokeWidth={0} />
              </button>

              <button
                className={`${styles.controlIconBtn} ${repeat !== 'none' ? styles.iconActive : ''}`}
                onClick={cycleRepeat}
                title="Ulangi Lagu"
              >
                {repeat === 'one' ? (
                  <Repeat1 size={20} strokeWidth={2.4} />
                ) : (
                  <Repeat size={18} strokeWidth={repeat === 'all' ? 2.4 : 1.8} />
                )}
              </button>
            </div>

            {/* Desktop Volume Slider */}
            <div className={styles.volumeRow}>
              <button 
                className={styles.volIconBtn} 
                onClick={() => setMuted(!isMuted)}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX size={18} strokeWidth={1.8} />
                ) : volume < 0.5 ? (
                  <Volume1 size={18} strokeWidth={1.8} />
                ) : (
                  <Volume2 size={18} strokeWidth={1.8} />
                )}
              </button>
              <input
                type="range"
                className={styles.volSlider}
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
          </div>

          {/* Synced Lyrics Section */}
          {showLyrics && (
            <div className={styles.lyricsSection}>
              {lyricsLoading ? (
                <div className={styles.lyricsLoading}>
                  <div className="spinner" />
                  <span>Memuat lirik lagu...</span>
                </div>
              ) : lyrics?.synced && lyrics.synced.length > 0 ? (
                <div className={styles.lyricsScroll} ref={lyricsContainerRef}>
                  {lyrics.synced.map((line, i) => (
                    <p
                      key={i}
                      data-lyric-line={i}
                      className={`${styles.lyricLine} ${
                        i === activeLyricIndex ? styles.lyricActive : ''
                      } ${i < activeLyricIndex ? styles.lyricPast : ''}`}
                      onClick={() => seekByPercent((line.time / duration) * 100)}
                    >
                      {line.text}
                    </p>
                  ))}
                </div>
              ) : lyrics?.plain ? (
                <div className={styles.lyricsScroll}>
                  {lyrics.plain.split('\n').map((line, i) => (
                    <p key={i} className={styles.lyricLinePlain}>
                      {line || '\u00A0'}
                    </p>
                  ))}
                </div>
              ) : (
                <div className={styles.noLyrics}>
                  <p>Lirik belum tersedia untuk lagu ini.</p>
                </div>
              )}

              {/* Mobile Only: Compact Bottom Playback Bar inside Lyrics View */}
              <div className={styles.mobileLyricsBar}>
                <div
                  ref={mobileLyricsProgressRef}
                  className={styles.mobileMiniProgress}
                  onClick={(e) => handleProgressClick(e, mobileLyricsProgressRef)}
                >
                  <div className={styles.progressTrack}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                <div className={styles.mobileLyricsControlsRow}>
                  <span className={styles.mobileLyricsTime}>{formatTime(currentTime)}</span>

                  <div className={styles.mobileLyricsBtnGroup}>
                    <button className={styles.controlIconBtn} onClick={handlePrev}>
                      <SkipBack size={18} fill="currentColor" strokeWidth={0} />
                    </button>

                    <button
                      className={styles.mobileLyricsPlayBtn}
                      onClick={togglePlay}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                      ) : isPlaying ? (
                        <Pause size={18} fill="currentColor" strokeWidth={0} />
                      ) : (
                        <Play size={18} fill="currentColor" strokeWidth={0} style={{ marginLeft: 2 }} />
                      )}
                    </button>

                    <button className={styles.controlIconBtn} onClick={handleNext}>
                      <SkipForward size={18} fill="currentColor" strokeWidth={0} />
                    </button>
                  </div>

                  <span className={styles.mobileLyricsTime}>{formatTime(duration)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
