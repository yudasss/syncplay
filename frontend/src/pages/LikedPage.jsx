import React, { useEffect, useState } from 'react';
import { Heart, Play, Music } from 'lucide-react';
import { useAuthStore, usePlayerStore } from '../store';
import { getLikedSongs } from '../api';
import { usePlayer } from '../hooks/usePlayer';
import SongCard from '../components/Song/SongCard';
import styles from './SimplePage.module.css';

export default function LikedPage() {
  const { currentUser } = useAuthStore();
  const { setQueue } = usePlayerStore();
  const { playSong } = usePlayer();
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    getLikedSongs(currentUser.id)
      .then(({ data }) => setSongs(data.songs || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [currentUser]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.heroLiked}>
          <Heart size={56} strokeWidth={2} fill="currentColor" />
        </div>
        <div className={styles.metaBox}>
          <span className={styles.type}>Koleksi Favorit</span>
          <h1 className={styles.title}>Lagu Disukai</h1>
          <div className={styles.actionRow}>
            <span className={styles.meta}>{songs.length} lagu tersimpan</span>
            {songs.length > 0 && (
              <button 
                className="btn btn-accent" 
                onClick={() => { setQueue(songs, 0); playSong(songs[0]); }}
              >
                <Play size={16} fill="currentColor" strokeWidth={0} />
                <span>Putar Semua</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className={styles.center}><div className="spinner" /></div>
      ) : songs.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>
            <Heart size={36} strokeWidth={1.5} />
          </div>
          <h2>Belum ada lagu disukai</h2>
          <p>Klik ikon hati pada lagu apa saja untuk menyimpannya di koleksi ini.</p>
        </div>
      ) : (
        <div className={styles.songList}>
          {songs.map((song, i) => (
            <SongCard
              key={song.youtube_id}
              song={song}
              index={i + 1}
              isLiked={true}
              onPlay={() => { setQueue(songs, i); playSong(song); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
