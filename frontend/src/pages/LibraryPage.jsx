import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Play, 
  Plus, 
  Download, 
  Trash2, 
  Music, 
  Users, 
  X, 
  CheckCircle2, 
  AlertCircle,
  FolderPlus
} from 'lucide-react';
import { useAuthStore, usePlayerStore } from '../store';
import { getPlaylists, getPlaylist, createPlaylist, deletePlaylist, importSpotifyPlaylist } from '../api';
import { usePlayer } from '../hooks/usePlayer';
import SongCard from '../components/Song/SongCard';
import styles from './LibraryPage.module.css';

export default function LibraryPage() {
  const { id } = useParams();
  const { currentUser } = useAuthStore();
  const { setQueue } = usePlayerStore();
  const { playSong } = usePlayer();
  const navigate = useNavigate();

  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Create modal / form state
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  
  // Spotify Import state
  const [importing, setImporting] = useState(false);
  const [spotifyUrl, setSpotifyUrl] = useState('');
  const [isShared, setIsShared] = useState(true);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');

  const loadPlaylists = async () => {
    if (!currentUser) return;
    try {
      const { data } = await getPlaylists(currentUser.id);
      setPlaylists(data.playlists || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadPlaylist = async (pid) => {
    try {
      const { data } = await getPlaylist(pid);
      setSelectedPlaylist(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { loadPlaylists(); }, [currentUser]);
  useEffect(() => { if (id) loadPlaylist(id); else setSelectedPlaylist(null); }, [id]);

  const handleCreate = async () => {
    if (!newName.trim() || !currentUser) return;
    await createPlaylist({ name: newName, owner_id: currentUser.id });
    setNewName('');
    setCreating(false);
    loadPlaylists();
  };

  const handleSpotifyImport = async () => {
    if (!spotifyUrl.trim() || !currentUser) return;
    setImportLoading(true);
    setImportError('');
    setImportSuccess('');

    try {
      const { data } = await importSpotifyPlaylist(spotifyUrl.trim(), currentUser.id, isShared);
      setImportSuccess(`Berhasil mengimpor "${data.playlist.name}" (${data.totalTracks} lagu)!`);
      setSpotifyUrl('');
      loadPlaylists();
      setTimeout(() => {
        setImporting(false);
        setImportSuccess('');
        navigate(`/library/${data.playlist.id}`);
      }, 1000);
    } catch (err) {
      let msg = err.response?.data?.error || err.response?.data?.message;
      if (!msg && err.message?.includes('Network Error')) {
        msg = 'Koneksi ke server terputus. Buka menu Pengaturan > Server & Jaringan untuk beralih mode server.';
      }
      setImportError(msg || err.message || 'Gagal mengimpor playlist Spotify. Pastikan link berstatus publik.');
    } finally {
      setImportLoading(false);
    }
  };

  const handleDelete = async (pid) => {
    if (!confirm('Hapus playlist ini?')) return;
    await deletePlaylist(pid);
    loadPlaylists();
    if (id === String(pid)) navigate('/library');
  };

  const handlePlayAll = () => {
    if (!selectedPlaylist?.songs?.length) return;
    setQueue(selectedPlaylist.songs, 0);
    playSong(selectedPlaylist.songs[0]);
  };

  if (selectedPlaylist) {
    const { playlist, songs } = selectedPlaylist;
    return (
      <div className={styles.page}>
        <button className={styles.backBtn} onClick={() => navigate('/library')}>
          <ArrowLeft size={16} />
          <span>Kembali ke Library</span>
        </button>

        <div className={styles.playlistHeroSection}>
          <div className={styles.heroCoverBox}>
            {playlist.cover_url ? (
              <img src={playlist.cover_url} alt={playlist.name} className={styles.heroCoverImg} />
            ) : (
              <div className={styles.heroCoverPlaceholder}>
                <Music size={48} strokeWidth={1.5} />
              </div>
            )}
          </div>

          <div className={styles.heroMetaBox}>
            <div className={styles.badgeRow}>
              {playlist.is_shared ? (
                <span className={styles.sharedBadge}>
                  <Users size={12} />
                  <span>Playlist Berdua</span>
                </span>
              ) : (
                <span className={styles.personalBadge}>Playlist Pribadi</span>
              )}
            </div>

            <h1 className={styles.heroTitle}>{playlist.name}</h1>
            {playlist.description && <p className={styles.heroDesc}>{playlist.description}</p>}
            
            <div className={styles.heroActionRow}>
              <span className={styles.heroSongCount}>{songs?.length || 0} lagu</span>
              {songs?.length > 0 && (
                <button className="btn btn-accent" onClick={handlePlayAll}>
                  <Play size={16} fill="currentColor" strokeWidth={0} />
                  <span>Putar Semua</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className={styles.trackList}>
          {songs?.length === 0 ? (
            <div className={styles.emptyTracks}>
              <p>Playlist masih kosong. Cari lagu dan tambahkan ke sini.</p>
            </div>
          ) : (
            songs.map((song, i) => (
              <SongCard
                key={song.id || song.youtube_id}
                song={song}
                index={i + 1}
                onPlay={() => { setQueue(songs, i); playSong(song); }}
              />
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Koleksi Library</h1>
          <p className={styles.subtitle}>Kelola playlist pribadi dan playlist kolaborasi berdua.</p>
        </div>
        <div className={styles.headerActions}>
          <button 
            className="btn btn-accent"
            onClick={() => { setImporting(true); setCreating(false); }}
          >
            <Download size={16} strokeWidth={2.2} />
            <span>Import Spotify</span>
          </button>

          <button 
            className="btn btn-secondary" 
            onClick={() => { setCreating(true); setImporting(false); }}
          >
            <Plus size={16} strokeWidth={2.2} />
            <span>Buat Playlist</span>
          </button>
        </div>
      </header>

      {/* Form Buat Playlist Biasa */}
      {creating && (
        <div className={styles.modalDrawer}>
          <div className={styles.drawerHeader}>
            <h3>Buat Playlist Baru</h3>
            <button className={styles.closeIconBtn} onClick={() => setCreating(false)}>
              <X size={18} />
            </button>
          </div>
          <div className={styles.inputRow}>
            <input
              className="input"
              placeholder="Beri nama playlist kamu…"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
            <button className="btn btn-primary" onClick={handleCreate}>Simpan</button>
          </div>
        </div>
      )}

      {/* Form Import Spotify Playlist */}
      {importing && (
        <div className={styles.modalDrawer}>
          <div className={styles.drawerHeader}>
            <div className={styles.drawerTitleRow}>
              <Download size={18} className={styles.spotifyColorIcon} />
              <h3>Import Playlist dari Spotify</h3>
            </div>
            <button className={styles.closeIconBtn} onClick={() => setImporting(false)}>
              <X size={18} />
            </button>
          </div>
          <p className={styles.drawerHint}>
            Buka aplikasi Spotify, salin tautan playlist (Copy Link), lalu tempelkan di bawah:
          </p>
          <div className={styles.inputRow}>
            <input
              className="input"
              placeholder="https://open.spotify.com/playlist/..."
              value={spotifyUrl}
              onChange={(e) => setSpotifyUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !importLoading && handleSpotifyImport()}
              disabled={importLoading}
              autoFocus
            />
            <button
              className="btn btn-accent"
              onClick={handleSpotifyImport}
              disabled={importLoading || !spotifyUrl.trim()}
            >
              {importLoading ? 'Mengimpor…' : 'Mulai Import'}
            </button>
          </div>

          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={isShared}
              onChange={(e) => setIsShared(e.target.checked)}
              disabled={importLoading}
            />
            <span>Jadikan playlist bersama (dapat didengar berdua)</span>
          </label>

          {importLoading && (
            <div className={styles.statusBoxLoading}>
              <div className="spinner" style={{ width: 18, height: 18 }} />
              <span>Mengunduh daftar lagu dan menyiapkan metadata audio...</span>
            </div>
          )}

          {importError && (
            <div className={styles.statusBoxError}>
              <AlertCircle size={16} />
              <span>{importError}</span>
            </div>
          )}

          {importSuccess && (
            <div className={styles.statusBoxSuccess}>
              <CheckCircle2 size={16} />
              <span>{importSuccess}</span>
            </div>
          )}
        </div>
      )}

      {/* Playlists Grid */}
      {loading ? (
        <div className={styles.centerBox}><div className="spinner" /></div>
      ) : playlists.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIconBox}>
            <FolderPlus size={36} strokeWidth={1.5} />
          </div>
          <h2>Belum ada playlist</h2>
          <p>Mulai dengan membuat playlist baru atau import lagu favorit kalian dari Spotify.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {playlists.map((pl) => (
            <div 
              key={pl.id} 
              className={styles.card} 
              onClick={() => navigate(`/library/${pl.id}`)}
            >
              <div className={styles.cardCover}>
                {pl.cover_url ? (
                  <img src={pl.cover_url} alt={pl.name} className={styles.cardCoverImg} />
                ) : (
                  <div className={styles.cardPlaceholder}>
                    <Music size={32} strokeWidth={1.5} />
                  </div>
                )}
                {pl.is_shared && (
                  <div className={styles.sharedBadgeTag}>
                    <Users size={10} />
                    <span>Berdua</span>
                  </div>
                )}
                <div className={styles.cardPlayBtn}>
                  <Play size={15} fill="currentColor" strokeWidth={0} />
                </div>
              </div>
              <div className={styles.cardInfo}>
                <span className={styles.cardName}>{pl.name}</span>
                <span className={styles.cardMeta}>
                  {pl.song_count || 0} lagu {pl.is_shared ? '• Berdua' : ''}
                </span>
              </div>
              <button
                className={styles.deleteBtn}
                onClick={(e) => { e.stopPropagation(); handleDelete(pl.id); }}
                title="Hapus playlist"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
