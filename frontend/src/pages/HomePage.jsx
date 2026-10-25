import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Play, 
  Music, 
  Sparkles,
  Search,
  Disc3,
  Moon,
  Heart,
  Flame,
  Radio,
  ArrowRight,
  Headphones,
  Users
} from 'lucide-react';
import { useAuthStore, usePlayerStore } from '../store';
import { getHistory, getPlaylists } from '../api';
import { usePlayer } from '../hooks/usePlayer';
import SongCard from '../components/Song/SongCard';
import styles from './HomePage.module.css';

const MOOD_STATIONS = [
  { id: 'all', label: 'Semua Suasana', icon: Sparkles },
  { id: 'chill', label: 'Late Night Chill', icon: Moon, query: 'Lofi Chill Beats Indonesia' },
  { id: 'romantic', label: 'Indie & Romantis', icon: Heart, query: 'Indie Romantis Indonesia' },
  { id: 'acoustic', label: 'Akustik Santai', icon: Radio, query: 'Akustik Santai Indonesia' },
  { id: 'energy', label: 'Energi & Fokus', icon: Flame, query: 'Pop Upbeat Hits 2026' },
];

const CURATED_SHOWCASE = [
  {
    id: 'curated-pop',
    title: 'Viral & Pop Indo 2026',
    subtitle: 'Lagu terpopuler minggu ini dengan aransemen studio premium.',
    tag: 'STUDIO HI-FI',
    cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop&q=80',
    query: 'Lagu Viral Indonesia 2026',
    gradient: 'linear-gradient(135deg, rgba(6, 182, 212, 0.4) 0%, rgba(16, 185, 129, 0.2) 100%)',
  },
  {
    id: 'curated-chill',
    title: 'Late Night Lofi Beats',
    subtitle: 'Irama instrumen santai untuk istirahat malam atau kerja berdua.',
    tag: 'CHILL VIBES',
    cover: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=400&auto=format&fit=crop&q=80',
    query: 'Lofi Chill Beats Night',
    gradient: 'linear-gradient(135deg, rgba(139, 92, 246, 0.4) 0%, rgba(59, 130, 246, 0.2) 100%)',
  },
  {
    id: 'curated-romantic',
    title: 'Indie & Romantis Berdua',
    subtitle: 'Nada-nada intim dan penuh memori manis untuk kalian berdua.',
    tag: 'DUO SPECIAL',
    cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&auto=format&fit=crop&q=80',
    query: 'Lagu Romantis Indonesia Terbaik',
    gradient: 'linear-gradient(135deg, rgba(244, 63, 94, 0.4) 0%, rgba(251, 113, 133, 0.2) 100%)',
  },
  {
    id: 'curated-acoustic',
    title: 'Sesi Akustik Hangat',
    subtitle: 'Petikan gitar jernih, vokal intim, dan suasana hangat.',
    tag: 'PURE ACOUSTIC',
    cover: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&auto=format&fit=crop&q=80',
    query: 'Akustik Santai Indonesia Pop',
    gradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.4) 0%, rgba(217, 119, 6, 0.2) 100%)',
  },
];

export default function HomePage() {
  const { currentUser } = useAuthStore();
  const { setQueue, isPlaying, currentSong } = usePlayerStore();
  const { playSong } = usePlayer();
  const navigate = useNavigate();

  const [recentSongs, setRecentSongs] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeMood, setActiveMood] = useState('all');

  useEffect(() => {
    if (!currentUser) return;
    Promise.all([
      getHistory(currentUser.id).catch(() => ({ data: { history: [] } })),
      getPlaylists(currentUser.id).catch(() => ({ data: { playlists: [] } })),
    ]).then(([histRes, playRes]) => {
      setRecentSongs(histRes.data.history.slice(0, 8));
      setPlaylists(playRes.data.playlists || []);
    }).finally(() => setLoading(false));
  }, [currentUser]);

  // Dynamic time greeting
  const greetingHour = new Date().getHours();
  const greeting = 
    greetingHour >= 4 && greetingHour < 12 ? 'Selamat Pagi' :
    greetingHour >= 12 && greetingHour < 17 ? 'Selamat Siang' :
    greetingHour >= 17 && greetingHour < 20 ? 'Selamat Sore' : 'Selamat Malam';

  // Featured Spotlight Hero Item (picks top playlist, recent song, or curated special)
  const spotlightItem = useMemo(() => {
    if (playlists.length > 0) {
      const topPl = playlists[0];
      return {
        id: topPl.id,
        isPlaylist: true,
        title: topPl.name,
        subtitle: topPl.description || `${topPl.song_count || 0} lagu pilihan untuk sesi santai berdua hari ini.`,
        cover: topPl.cover_url || CURATED_SHOWCASE[0].cover,
        tag: topPl.is_shared ? 'KOLEKSI BERDUA' : 'PLAYLIST FAVORIT',
        item: topPl,
      };
    }
    return {
      id: 'default-hero',
      isPlaylist: false,
      title: 'Harmonia Curated Mix 2026',
      subtitle: 'Streaming audio murni kualitas studio tanpa jeda iklan, dipersonalisasi khusus untuk kalian.',
      cover: CURATED_SHOWCASE[0].cover,
      tag: 'HARMONIA SPECIAL',
      query: 'Lagu Pop Indonesia Terbaik',
    };
  }, [playlists]);

  const handleSpotlightAction = () => {
    if (spotlightItem.isPlaylist) {
      navigate(`/library/${spotlightItem.id}`);
    } else {
      navigate('/search');
    }
  };

  const handlePlaySong = (song, index, list) => {
    setQueue(list, index);
    playSong(song);
  };

  const handleMoodClick = (mood) => {
    setActiveMood(mood.id);
    if (mood.query) {
      navigate(`/search?q=${encodeURIComponent(mood.query)}`);
    }
  };

  return (
    <div className={styles.page}>
      {/* ── Editorial Header ── */}
      <header className={styles.editorialHeader}>
        <div className={styles.headerTitleGroup}>
          <div className={styles.brandRow}>
            <span className={styles.studioBeacon}>
              <span className={styles.beaconPing} />
              <span className={styles.beaconCore} />
            </span>
            <span className={styles.brandBadge}>SYNC PLAY STUDIO HI-FI</span>
          </div>

          <h1 className={styles.headlineTitle}>
            {greeting}, <span className={styles.userHighlight}>{currentUser?.name || 'Sobat'}</span>
          </h1>
          <p className={styles.headlineSubtitle}>
            Sesi audio murni tanpa iklan untuk menemani aktivitas berdua.
          </p>
        </div>

        {/* Duo Status Capsule */}
        <div 
          className={styles.duoStatusCapsule} 
          onClick={() => navigate('/settings')}
          role="button"
          tabIndex={0}
          title="Pengaturan Akun & Profil Berdua"
        >
          <div className={styles.avatarStack}>
            <div 
              className={styles.duoAvatar} 
              style={{ backgroundColor: currentUser?.avatar_color || '#00f09a' }}
            >
              {currentUser?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className={styles.duoHeartBadge}>
              <Heart size={11} fill="#ffffff" strokeWidth={0} />
            </div>
          </div>
          <div className={styles.duoTextMeta}>
            <span className={styles.duoStatusTitle}>Duo Session</span>
            <span className={styles.duoStatusSub}>Terhubung</span>
          </div>
        </div>
      </header>

      {/* ── Mood & Vibe Stations ── */}
      <section className={styles.moodBarSection}>
        <div className={styles.moodScrollRow}>
          {MOOD_STATIONS.map((m) => {
            const Icon = m.icon;
            const isActive = activeMood === m.id;
            return (
              <button
                key={m.id}
                type="button"
                className={`${styles.moodPill} ${isActive ? styles.moodPillActive : ''}`}
                onClick={() => handleMoodClick(m)}
              >
                <Icon size={14} className={styles.moodIcon} />
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Featured Spotlight Hero (Vinyl Showcase) ── */}
      <section className={styles.spotlightSection}>
        <div className={styles.spotlightCard}>
          {/* Ambient Lighting Glow behind card */}
          <div className={styles.spotlightAmbientGlow} />

          {/* Left: Interactive Vinyl Sleeve */}
          <div className={styles.vinylShowcase}>
            {/* Peeking Vinyl Record */}
            <div className={`${styles.vinylDisc} ${isPlaying ? styles.vinylSpinning : ''}`}>
              <div className={styles.vinylGrooves}>
                <div className={styles.vinylCenterLabel}>
                  <Disc3 size={18} className={styles.vinylIcon} />
                </div>
              </div>
            </div>

            {/* Gatefold Sleeve Cover */}
            <div className={styles.sleeveFrame}>
              <img 
                src={spotlightItem.cover} 
                alt={spotlightItem.title} 
                className={styles.sleeveImage} 
              />
              <div className={styles.sleeveShine} />
            </div>
          </div>

          {/* Right: Editorial Information */}
          <div className={styles.spotlightContent}>
            <div className={styles.spotlightTagRow}>
              <span className={styles.spotlightTag}>{spotlightItem.tag}</span>
              <div className={styles.equalizerMini}>
                <span /><span /><span />
              </div>
            </div>

            <h2 className={styles.spotlightTitle}>{spotlightItem.title}</h2>
            <p className={styles.spotlightDesc}>{spotlightItem.subtitle}</p>

            <div className={styles.spotlightActions}>
              <button 
                type="button"
                className="btn btn-accent"
                onClick={handleSpotlightAction}
              >
                <Play size={16} fill="currentColor" strokeWidth={0} />
                <span>{spotlightItem.isPlaylist ? 'Dengarkan' : 'Mulai'}</span>
              </button>

              <button 
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate('/search')}
              >
                <Search size={15} />
                <span>Jelajahi</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Koleksi Berdua (Shared Duo Playlists) ── */}
      {playlists.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionHeaderLeft}>
              <h2 className={styles.sectionTitle}>Koleksi Berdua & Playlist</h2>
              <span className={styles.sectionSubtitle}>Kurasi lagu tersimpan untuk didengarkan bersama</span>
            </div>
            <button className={styles.seeAllBtn} onClick={() => navigate('/library')}>
              <span>Buka Library</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div className={styles.shelfScrollRow}>
            {playlists.map((pl) => (
              <div
                key={pl.id}
                className={styles.luxuryCard}
                onClick={() => navigate(`/library/${pl.id}`)}
                role="button"
                tabIndex={0}
              >
                <div className={styles.luxuryCoverFrame}>
                  {pl.cover_url ? (
                    <img src={pl.cover_url} alt={pl.name} className={styles.luxuryCoverImg} />
                  ) : (
                    <div className={styles.luxuryPlaceholder}>
                      <Music size={32} strokeWidth={1.5} />
                    </div>
                  )}

                  {/* Badge */}
                  <div className={styles.cardTopBadge}>
                    {pl.is_shared ? (
                      <span className={styles.duoCardBadge}>
                        <Users size={11} />
                        <span>Berdua</span>
                      </span>
                    ) : (
                      <span className={styles.personalCardBadge}>Pribadi</span>
                    )}
                  </div>

                  {/* Elegant Floating Play Button */}
                  <div className={styles.luxuryPlayBtn}>
                    <Play size={15} fill="currentColor" strokeWidth={0} />
                  </div>
                </div>

                <div className={styles.luxuryCardMeta}>
                  <span className={styles.luxuryTitle}>{pl.name}</span>
                  <span className={styles.luxurySub}>
                    {pl.song_count || 0} lagu {pl.is_shared ? '• Bersama' : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Eksplorasi Suasana & Mood Channels ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionHeaderLeft}>
            <h2 className={styles.sectionTitle}>Kurasi Suasana</h2>
            <span className={styles.sectionSubtitle}>Pilihan atmosfer musik sesuai mood hari ini</span>
          </div>
        </div>

        <div className={styles.curatedGrid}>
          {CURATED_SHOWCASE.map((item) => (
            <div
              key={item.id}
              className={styles.channelCard}
              style={{ background: item.gradient }}
              onClick={() => navigate(`/search?q=${encodeURIComponent(item.query)}`)}
              role="button"
              tabIndex={0}
            >
              <div className={styles.channelContent}>
                <span className={styles.channelTag}>{item.tag}</span>
                <h3 className={styles.channelTitle}>{item.title}</h3>
                <p className={styles.channelDesc}>{item.subtitle}</p>
                <div className={styles.channelPlayRow}>
                  <span className={styles.channelPlayLink}>Dengarkan Sekarang</span>
                  <ArrowRight size={14} className={styles.channelArrow} />
                </div>
              </div>
              <div className={styles.channelArtworkBox}>
                <img src={item.cover} alt={item.title} className={styles.channelArtwork} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Baru Saja Diputar (Recent Tracks) ── */}
      {recentSongs.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionHeaderLeft}>
              <h2 className={styles.sectionTitle}>Baru Saja Diputar</h2>
              <span className={styles.sectionSubtitle}>Daftar putar terakhir kalian</span>
            </div>
            <button className={styles.seeAllBtn} onClick={() => navigate('/history')}>
              <span>Riwayat Lengkap</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div className={styles.songListCard}>
            {recentSongs.map((song, i) => (
              <SongCard
                key={`${song.youtube_id || song.id}-${i}`}
                song={song}
                index={i + 1}
                onPlay={() => handlePlaySong(song, i, recentSongs)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Empty State ── */}
      {!loading && recentSongs.length === 0 && playlists.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIconBox}>
            <Headphones size={36} strokeWidth={1.5} />
          </div>
          <h2>Selamat Datang di Sync Play</h2>
          <p>Mulai dengan mencari lagu kesukaan kalian atau import playlist berdua dari Spotify.</p>
          <button className="btn btn-accent" onClick={() => navigate('/search')}>
            <Search size={16} />
            <span>Cari Lagu Pertama</span>
          </button>
        </div>
      )}
    </div>
  );
}
