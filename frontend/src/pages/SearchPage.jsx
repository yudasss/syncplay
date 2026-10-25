import React, { useState, useCallback, useRef } from 'react';
import { Search, X, AlertCircle, Music, TrendingUp } from 'lucide-react';
import { useSearchStore, usePlayerStore } from '../store';
import { usePlayer } from '../hooks/usePlayer';
import { searchSongs } from '../api';
import SongCard from '../components/Song/SongCard';
import styles from './SearchPage.module.css';

const QUICK_SEARCHES = [
  'Top Hits Indonesia', 'Pop Indo Galau', 'Tulus', 'NIKI',
  'Coldplay', 'Lofi Beats', 'Acoustic Pop', 'R&B Chill',
];

export default function SearchPage() {
  const { query, results, isLoading, error, setQuery, setResults, setLoading, setError } = useSearchStore();
  const { setQueue } = usePlayerStore();
  const { playSong } = usePlayer();
  const debounceRef = useRef(null);

  const doSearch = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    setError(null);
    try {
      const { data } = await searchSongs(q);
      setResults(data.results || []);
    } catch (err) {
      setError('Gagal mencari lagu. Pastikan backend server terhubung.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInput = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 500);
  };

  const handleQuickSearch = (q) => {
    setQuery(q);
    doSearch(q);
  };

  const handlePlay = (song, index) => {
    setQueue(results, index);
    playSong(song);
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Cari Musik</h1>
        <p className={styles.subtitle}>Jelajahi jutaan lagu favorit kalian berdua tanpa jeda iklan.</p>
      </div>

      {/* Floating Search Bar */}
      <div className={styles.searchBar}>
        <Search size={18} className={styles.searchIcon} strokeWidth={2.2} />
        <input
          className={styles.searchInput}
          type="text"
          placeholder="Ketik judul lagu, penyanyi, atau band…"
          value={query}
          onChange={handleInput}
          id="search-input"
        />
        {query && (
          <button 
            className={styles.clearBtn} 
            onClick={() => { setQuery(''); setResults([]); }}
            title="Hapus pencarian"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Quick Search Tags */}
      {!query && (
        <div className={styles.tagsSection}>
          <div className={styles.sectionHeader}>
            <TrendingUp size={16} className={styles.trendIcon} />
            <span className={styles.tagsTitle}>Pencarian Populer</span>
          </div>
          <div className={styles.tagGrid}>
            {QUICK_SEARCHES.map((q) => (
              <button
                key={q}
                className={styles.tagBtn}
                onClick={() => handleQuickSearch(q)}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading Spinner */}
      {isLoading && (
        <div className={styles.centerBox}>
          <div className="spinner" />
          <p className={styles.loadingText}>Mencari audio berkualitas tinggi…</p>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className={styles.errorBox}>
          <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
            <span>{error}</span>
            <span style={{ fontSize: 11, opacity: 0.85 }}>
              Tip: Buka menu Pengaturan &gt; Server &amp; Jaringan untuk memastikan server aktif atau beralih mode.
            </span>
          </div>
        </div>
      )}

      {/* Results List */}
      {results.length > 0 && (
        <div className={styles.resultsSection}>
          <div className={styles.resultsHeader}>
            <h2>Hasil Pencarian</h2>
            <span className={styles.resultsCount}>{results.length} lagu ditemukan</span>
          </div>
          <div className={styles.songList}>
            {results.map((song, i) => (
              <SongCard
                key={song.youtube_id}
                song={song}
                index={i + 1}
                onPlay={() => handlePlay(song, i)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty Result */}
      {query && !isLoading && results.length === 0 && !error && (
        <div className={styles.centerBox}>
          <div className={styles.emptyIconBox}>
            <Music size={32} strokeWidth={1.5} />
          </div>
          <h3>Lagu tidak ditemukan</h3>
          <p>Coba kata kunci lain atau periksa ejaan nama penyanyi.</p>
        </div>
      )}
    </div>
  );
}
