import React, { useState } from 'react';
import { Play, Pause, Heart, Plus, Music } from 'lucide-react';
import { usePlayerStore, useAuthStore } from '../../store';
import { likeSong, unlikeSong } from '../../api';
import styles from './SongCard.module.css';

function formatDuration(sec) {
  if (!sec) return '';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function SongCard({ song, index, onPlay, showIndex = true, isLiked: initialLiked = false }) {
  const { currentSong, isPlaying, addToQueue } = usePlayerStore();
  const { currentUser } = useAuthStore();
  const isActive = currentSong?.youtube_id === song.youtube_id;
  const [liked, setLiked] = useState(initialLiked);
  const [likeLoading, setLikeLoading] = useState(false);

  const handleLike = async (e) => {
    e.stopPropagation();
    if (!currentUser) return;
    setLikeLoading(true);
    try {
      if (liked) {
        await unlikeSong(currentUser.id, song.youtube_id);
        setLiked(false);
      } else {
        await likeSong(currentUser.id, song.youtube_id);
        setLiked(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLikeLoading(false);
    }
  };

  const handleAddToQueue = (e) => {
    e.stopPropagation();
    addToQueue(song);
  };

  return (
    <div
      className={`${styles.card} ${isActive ? styles.active : ''}`}
      onClick={onPlay}
    >
      {/* Index or Live Equalizer */}
      <div className={styles.indexCell}>
        {isActive && isPlaying ? (
          <div className="now-playing-bars">
            <span /><span /><span />
          </div>
        ) : (
          <span className={styles.indexNumber}>{showIndex ? index : ''}</span>
        )}
      </div>

      {/* Album Cover & Hover Play Button */}
      <div className={styles.coverFrame}>
        {song.thumbnail_url ? (
          <img className={styles.coverImage} src={song.thumbnail_url} alt={song.title} />
        ) : (
          <div className={styles.coverPlaceholder}>
            <Music size={18} strokeWidth={1.5} />
          </div>
        )}
        <div className={styles.playOverlay}>
          {isActive && isPlaying ? (
            <Pause size={16} fill="currentColor" strokeWidth={0} />
          ) : (
            <Play size={16} fill="currentColor" strokeWidth={0} style={{ marginLeft: 1 }} />
          )}
        </div>
      </div>

      {/* Track Info */}
      <div className={styles.metaCol}>
        <span className={`${styles.songTitle} ${isActive ? styles.titleActive : ''}`}>
          {song.title}
        </span>
        <span className={styles.songArtist}>{song.artist}</span>
      </div>

      {/* Duration */}
      <span className={styles.duration}>{formatDuration(song.duration)}</span>

      {/* Actions */}
      <div className={styles.actions} onClick={(e) => e.stopPropagation()}>
        <button
          className={`${styles.actionBtn} ${liked ? styles.liked : ''}`}
          onClick={handleLike}
          disabled={likeLoading}
          title={liked ? 'Hapus dari Lagu Disukai' : 'Sukai Lagu'}
        >
          <Heart 
            size={16} 
            strokeWidth={liked ? 0 : 2} 
            fill={liked ? 'currentColor' : 'none'} 
          />
        </button>

        <button
          className={styles.actionBtn}
          onClick={handleAddToQueue}
          title="Tambahkan ke Antrean"
        >
          <Plus size={16} strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );
}
