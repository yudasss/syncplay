import React, { useEffect, useState } from 'react';
import { BarChart3, Flame, Users, Headphones, Disc } from 'lucide-react';
import { useAuthStore } from '../store';
import { getStats } from '../api';
import styles from './StatsPage.module.css';

export default function StatsPage() {
  const { currentUser } = useAuthStore();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    getStats(currentUser.id)
      .then(({ data }) => setStats(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [currentUser]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Statistik Mendengarkan</h1>
        <p className={styles.sub}>Aktivitas dan selera musik kamu bersama Sync Play</p>
      </div>

      {loading ? (
        <div className={styles.center}><div className="spinner" /></div>
      ) : !stats || stats.totalPlays === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>
            <BarChart3 size={36} strokeWidth={1.5} />
          </div>
          <h2>Belum ada data aktivitas</h2>
          <p>Putar beberapa lagu terlebih dahulu untuk melihat grafik musik favorit kamu.</p>
        </div>
      ) : (
        <>
          {/* Key Metric Card */}
          <div className={styles.metricBanner}>
            <div className={styles.metricItem}>
              <div className={styles.metricIconBox}>
                <Headphones size={22} className={styles.metricIcon} />
              </div>
              <div className={styles.metricInfo}>
                <span className={styles.bigStatNum}>{stats.totalPlays}</span>
                <span className={styles.bigStatLabel}>Total Lagu Diputar</span>
              </div>
            </div>
          </div>

          <div className={styles.grid}>
            {/* Top Songs */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <Flame size={18} className={styles.cardIconSong} />
                <h2 className={styles.cardTitle}>Lagu Paling Sering Diputar</h2>
              </div>
              <div className={styles.list}>
                {stats.topSongs.map((song, i) => (
                  <div key={song.youtube_id || i} className={styles.listItem}>
                    <span className={styles.rankBadge}>{i + 1}</span>
                    {song.thumbnail_url ? (
                      <img src={song.thumbnail_url} className={styles.thumb} alt="" />
                    ) : (
                      <div className={styles.thumbPlaceholder}>
                        <Disc size={16} />
                      </div>
                    )}
                    <div className={styles.itemInfo}>
                      <span className={styles.itemTitle}>{song.title}</span>
                      <span className={styles.itemSub}>{song.artist}</span>
                    </div>
                    <span className={styles.playsCount}>{song.play_count} kali</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Artists */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <Users size={18} className={styles.cardIconArtist} />
                <h2 className={styles.cardTitle}>Penyanyi / Musisi Favorit</h2>
              </div>
              <div className={styles.list}>
                {stats.topArtists.map((artist, i) => (
                  <div key={artist.artist || i} className={styles.listItem}>
                    <span className={styles.rankBadge}>{i + 1}</span>
                    <div className={styles.artistAvatar}>
                      {artist.artist?.[0]?.toUpperCase() || 'A'}
                    </div>
                    <div className={styles.itemInfo}>
                      <span className={styles.itemTitle}>{artist.artist || 'Unknown'}</span>
                    </div>
                    <span className={styles.playsCount}>{artist.play_count} kali</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
