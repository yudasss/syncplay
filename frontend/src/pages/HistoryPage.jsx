import React, { useEffect, useState } from 'react';
import { Clock, Play, Music } from 'lucide-react';
import { useAuthStore, usePlayerStore } from '../store';
import { getHistory } from '../api';
import { usePlayer } from '../hooks/usePlayer';
import SongCard from '../components/Song/SongCard';
import styles from './SimplePage.module.css';

export default function HistoryPage() {
  const { currentUser } = useAuthStore();
  const { setQueue } = usePlayerStore();
  const { playSong } = usePlayer();
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    getHistory(currentUser.id)
      .then(({ data }) => setSongs(data.history || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [currentUser]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.heroHistory}>
          <Clock size={56} strokeWidth={1.8} />
        </div>
        <div className={styles.metaBox}>
          <span className={styles.type}>Aktivitas Terkini</span>
          <h1 className={styles.title}>Riwayat Putar</h1>
          <div className={styles.actionRow}>
            <span className={styles.meta}>{songs.length} lagu terakhir didengarkan</span>
            {songs.length > 0 && (
              <button 
                className="btn btn-accent" 
                onClick={() => { setQueue(songs, 0); playSong(songs[0]); }}
              >
                <Play size={16} fill="currentColor" strokeWidth={0} />
                <span>Putar Ulang Semua</span>
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
            <Clock size={36} strokeWidth={1.5} />
          </div>
          <h2>Belum ada riwayat lagu</h2>
          <p>Lagu-lagu yang kamu putar akan otomatis tercatat di sini.</p>
        </div>
      ) : (
        <div className={styles.songList}>
          {songs.map((song, i) => (
            <SongCard
              key={`${song.youtube_id}-${i}`}
              song={song}
              index={i + 1}
              onPlay={() => { setQueue(songs, i); playSong(song); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
