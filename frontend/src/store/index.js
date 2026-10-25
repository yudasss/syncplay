import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ── Auth Store ────────────────────────────────────────────────────────────────
export const useAuthStore = create(
  persist(
    (set) => ({
      currentUser: null,
      setUser: (user) => set({ currentUser: user }),
      logout: () => set({ currentUser: null }),
    }),
    { name: 'harmonia-auth' }
  )
);

// ── Theme & Color Palettes (Theme & Colors System) ──────────────────────────
export const COLOR_PALETTES = [
  {
    id: 'terracotta',
    name: 'Terracotta & Cream',
    primary: '#c25e38',
    secondary: '#e4d3be',
    primaryHover: '#d96e46',
    previewCardSecondary: '#4ec7d4', // cyan block like in user reference
    textColor: '#ffffff',
  },
  {
    id: 'crimson',
    name: 'Crimson & Peach',
    primary: '#691d2d',
    secondary: '#f4c3a2',
    primaryHover: '#84263b',
    previewCardSecondary: '#f79d71',
    textColor: '#ffffff',
  },
  {
    id: 'burgundy',
    name: 'Burgundy & Lilac',
    primary: '#541935',
    secondary: '#e5bcd5',
    primaryHover: '#6e2348',
    previewCardSecondary: '#e08cb9',
    textColor: '#ffffff',
  },
  {
    id: 'violet',
    name: 'Midnight Violet & Pink',
    primary: '#2d1f47',
    secondary: '#f3bdd8',
    primaryHover: '#3d2c5e',
    previewCardSecondary: '#ec8dbf',
    textColor: '#ffffff',
  },
  {
    id: 'cobalt',
    name: 'Cobalt Navy & Periwinkle',
    primary: '#1c2859',
    secondary: '#c8d0f1',
    primaryHover: '#27387a',
    previewCardSecondary: '#8fa0e6',
    textColor: '#ffffff',
  },
  {
    id: 'mint',
    name: 'Harmonia Mint & Emerald',
    primary: '#00f09a',
    secondary: '#06b6d4',
    primaryHover: '#1ef5a6',
    previewCardSecondary: '#38bdf8',
    textColor: '#05130b',
  },
];

export const THEME_MODES = [
  { id: 'dynamic', label: 'Dynamic Sync' },
  { id: 'light', label: 'Light', color: '#ffffff' },
  { id: 'espresso', label: 'Espresso', color: '#1e1614' },
  { id: 'amoled', label: 'AMOLED', color: '#000000' },
];

export function applyThemeTokens(theme, themeMode, paletteId) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const pal = COLOR_PALETTES.find((p) => p.id === paletteId) || COLOR_PALETTES[0];

  root.setAttribute('data-theme', theme || 'default');
  root.setAttribute('data-theme-mode', themeMode || 'amoled');

  root.style.setProperty('--accent', pal.primary);
  root.style.setProperty('--accent-hover', pal.primaryHover);
  root.style.setProperty('--accent-dim', `${pal.primary}26`);
  root.style.setProperty('--accent-glow', `${pal.primary}45`);
  root.style.setProperty('--accent-text', pal.textColor || '#ffffff');
  root.style.setProperty('--duo-accent', pal.secondary);
  root.style.setProperty('--duo-dim', `${pal.secondary}26`);
  root.style.setProperty('--accent-gradient', `linear-gradient(135deg, ${pal.primary} 0%, ${pal.secondary} 100%)`);
}

export const useThemeStore = create(
  persist(
    (set, get) => ({
      theme: 'default', // 'default' | 'glass'
      themeMode: 'espresso', // 'dynamic' | 'light' | 'espresso' | 'amoled'
      paletteId: 'terracotta', // 'terracotta' | 'crimson' | 'burgundy' | 'violet' | 'cobalt' | 'mint'

      setTheme: (theme) => {
        set({ theme });
        applyThemeTokens(theme, get().themeMode, get().paletteId);
      },
      setThemeMode: (themeMode) => {
        set({ themeMode });
        applyThemeTokens(get().theme, themeMode, get().paletteId);
      },
      setPaletteId: (paletteId) => {
        set({ paletteId });
        applyThemeTokens(get().theme, get().themeMode, paletteId);
      },
    }),
    {
      name: 'harmonia-theme-v2',
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyThemeTokens(state.theme, state.themeMode, state.paletteId);
        }
      },
    }
  )
);

// ── Player Store ──────────────────────────────────────────────────────────────
export const usePlayerStore = create((set, get) => ({
  // Current track
  currentSong: null,
  streamUrl: null,
  isPlaying: false,
  isLoading: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  isMuted: false,

  // Queue
  queue: [],
  queueIndex: -1,
  shuffle: false,
  repeat: 'none', // 'none' | 'all' | 'one'

  // UI State
  isExpanded: false,
  showLyrics: false,

  // Actions
  setSong: (song) => set({ currentSong: song }),
  setStreamUrl: (url) => set({ streamUrl: url }),
  setIsPlaying: (v) => set({ isPlaying: v }),
  setIsLoading: (v) => set({ isLoading: v }),
  setCurrentTime: (t) => set({ currentTime: t }),
  setDuration: (d) => set({ duration: d }),
  setVolume: (v) => set({ volume: v }),
  setMuted: (v) => set({ isMuted: v }),
  setExpanded: (v) => set({ isExpanded: v }),
  setShowLyrics: (v) => set({ showLyrics: v }),

  // Queue management
  setQueue: (songs, startIndex = 0) =>
    set({ queue: songs, queueIndex: startIndex }),
  playNext: () => {
    const { queue, queueIndex, shuffle, repeat } = get();
    if (queue.length === 0) return null;

    let nextIndex;
    if (shuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else if (repeat === 'one') {
      nextIndex = queueIndex;
    } else {
      nextIndex = queueIndex + 1;
      if (nextIndex >= queue.length) {
        if (repeat === 'all') nextIndex = 0;
        else return null;
      }
    }
    set({ queueIndex: nextIndex });
    return queue[nextIndex];
  },
  playPrev: () => {
    const { queue, queueIndex } = get();
    if (queue.length === 0) return null;
    const prevIndex = Math.max(0, queueIndex - 1);
    set({ queueIndex: prevIndex });
    return queue[prevIndex];
  },
  toggleShuffle: () => set((s) => ({ shuffle: !s.shuffle })),
  cycleRepeat: () =>
    set((s) => ({
      repeat: s.repeat === 'none' ? 'all' : s.repeat === 'all' ? 'one' : 'none',
    })),

  addToQueue: (song) =>
    set((s) => ({ queue: [...s.queue, song] })),
  removeFromQueue: (index) =>
    set((s) => ({
      queue: s.queue.filter((_, i) => i !== index),
      queueIndex: s.queueIndex > index ? s.queueIndex - 1 : s.queueIndex,
    })),
  updateSongInQueue: (oldId, updatedSong) =>
    set((s) => ({
      queue: s.queue.map((song) =>
        (song.id === oldId || song.youtube_id === oldId) ? { ...song, ...updatedSong } : song
      ),
      currentSong:
        s.currentSong && (s.currentSong.id === oldId || s.currentSong.youtube_id === oldId)
          ? { ...s.currentSong, ...updatedSong }
          : s.currentSong,
    })),
}));

// ── Lyrics Store ──────────────────────────────────────────────────────────────
export const useLyricsStore = create((set) => ({
  lyrics: null,      // { synced: [...], plain: '...' }
  isLoading: false,
  error: null,
  setLyrics: (l) => set({ lyrics: l }),
  setLoading: (v) => set({ isLoading: v }),
  setError: (e) => set({ error: e }),
  clearLyrics: () => set({ lyrics: null, error: null }),
}));

// ── Search Store ──────────────────────────────────────────────────────────────
export const useSearchStore = create((set) => ({
  query: '',
  results: [],
  isLoading: false,
  error: null,
  setQuery: (q) => set({ query: q }),
  setResults: (r) => set({ results: r }),
  setLoading: (v) => set({ isLoading: v }),
  setError: (e) => set({ error: e }),
  clearResults: () => set({ results: [], query: '' }),
}));
