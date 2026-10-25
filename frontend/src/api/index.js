import axios from 'axios';

// Detect if running inside a native hybrid container (Capacitor/Electron) or standalone app
export const isNative = typeof window !== 'undefined' && (
  window.location.protocol === 'capacitor:' || 
  window.location.protocol === 'file:' ||
  (window.location.hostname === 'localhost' && window.location.port === '')
);

// Default endpoints
export const DEFAULT_PUBLIC_SERVER = 'https://proposal-inquiries-cake-workstation.trycloudflare.com/api';
export const DEFAULT_LAN_SERVER = 'http://192.168.1.11:3001/api';

/**
 * Normalizes any server URL input to end with /api
 */
export function normalizeServerUrl(url) {
  if (!url || typeof url !== 'string') return '';
  let clean = url.trim().replace(/\/+$/, '');
  if (!clean.endsWith('/api')) {
    clean += '/api';
  }
  return clean;
}

/**
 * Returns the currently active API Base URL
 */
export function getActiveServerUrl() {
  if (typeof window === 'undefined') return 'http://localhost:3001/api';

  // 1. Check user custom / active server URL in localStorage
  const active = localStorage.getItem('harmonia_active_server_url');
  if (active && active.trim()) {
    return normalizeServerUrl(active);
  }

  const custom = localStorage.getItem('harmonia_custom_server_url');
  if (custom && custom.trim()) {
    return normalizeServerUrl(custom);
  }

  // 2. Build-time environment variable
  if (import.meta.env.VITE_API_URL) {
    return normalizeServerUrl(import.meta.env.VITE_API_URL);
  }

  // 3. Native APK / Electron container defaults to the Public Online Tunnel
  if (isNative) {
    return DEFAULT_PUBLIC_SERVER;
  }

  // 4. Default web browser: use relative /api proxy
  return '/api';
}

export const getApiBase = getActiveServerUrl;
export const API_BASE = getActiveServerUrl();

/**
 * Sets the active server URL and notifies listeners
 */
export function setActiveServerUrl(url) {
  if (typeof window === 'undefined') return;
  const clean = normalizeServerUrl(url);
  localStorage.setItem('harmonia_active_server_url', clean);
  window.dispatchEvent(new CustomEvent('harmonia:server-changed', { detail: { url: clean } }));
}

/**
 * Ping / test connection to any given server URL
 */
export async function testServerConnection(url) {
  const clean = normalizeServerUrl(url);
  const startTime = Date.now();
  try {
    const res = await axios.get(`${clean}/health`, {
      timeout: 5000,
      headers: { 'Cache-Control': 'no-cache' },
    });
    const latency = Date.now() - startTime;
    return { ok: res.status >= 200 && res.status < 300, latency, error: null };
  } catch (err) {
    const latency = Date.now() - startTime;
    return { ok: false, latency, error: err.message || 'Connection failed' };
  }
}

const api = axios.create({
  baseURL: getActiveServerUrl(),
  timeout: 18000,
});

// Dynamic Request Interceptor: Always update baseURL to active server
api.interceptors.request.use((config) => {
  config.baseURL = getActiveServerUrl();
  return config;
});

// Resilient Response Interceptor: Smart Auto-Failover
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only attempt auto-failover if not already retried and request failed with network/timeout issue
    const isNetworkError = !error.response || error.code === 'ECONNABORTED' || error.message.includes('Network Error');
    const isServerError = error.response && error.response.status >= 502;

    if (originalRequest && !originalRequest._isRetry && (isNetworkError || isServerError)) {
      originalRequest._isRetry = true;
      const currentUrl = getActiveServerUrl();

      // Determine alternative target
      let fallbackUrl = null;
      if (currentUrl.includes('trycloudflare.com') || currentUrl === DEFAULT_PUBLIC_SERVER) {
        fallbackUrl = DEFAULT_LAN_SERVER;
      } else if (currentUrl.includes('192.168.1.11') || currentUrl === DEFAULT_LAN_SERVER) {
        fallbackUrl = DEFAULT_PUBLIC_SERVER;
      }

      if (fallbackUrl && fallbackUrl !== currentUrl) {
        console.warn(`[Harmonia API] Connection to ${currentUrl} failed. Auto-failing over to ${fallbackUrl}...`);
        
        // Fast ping to see if fallback is alive before committing
        try {
          const test = await testServerConnection(fallbackUrl);
          if (test.ok) {
            setActiveServerUrl(fallbackUrl);
            originalRequest.baseURL = fallbackUrl;
            return api(originalRequest);
          }
        } catch (e) {
          // fallback ping failed, continue with original error
        }
      }
    }

    return Promise.reject(error);
  }
);

// ── Search ──────────────────────────────────────────────────────────────────
export const searchSongs = (query) => api.get('/search', { params: { q: query } });

// ── Stream ───────────────────────────────────────────────────────────────────
export const getStreamUrl = (youtubeId, userId) =>
  api.get(`/stream/${youtubeId}`, { params: { userId } });

// ── Lyrics ───────────────────────────────────────────────────────────────────
export const fetchLyrics = (title, artist, duration) =>
  api.get('/lyrics', { params: { title, artist, duration } });

// ── Playlists ────────────────────────────────────────────────────────────────
export const getPlaylists = (userId) => api.get('/playlists', { params: { userId } });
export const getPlaylist = (id) => api.get(`/playlists/${id}`);
export const createPlaylist = (data) => api.post('/playlists', data);
export const updatePlaylist = (id, data) => api.put(`/playlists/${id}`, data);
export const deletePlaylist = (id) => api.delete(`/playlists/${id}`);
export const addSongToPlaylist = (playlistId, data) =>
  api.post(`/playlists/${playlistId}/songs`, data);
export const removeSongFromPlaylist = (playlistId, songId) =>
  api.delete(`/playlists/${playlistId}/songs/${songId}`);
export const importSpotifyPlaylist = (url, userId, isShared = false) =>
  api.post('/playlists/import-spotify', { url, userId, isShared });

// ── Auth / Users ─────────────────────────────────────────────────────────────
export const getUsers = () => api.get('/auth/users');
export const loginWithPin = (pin) => api.post('/auth/login', { pin });
export const updateUser = (id, data) => api.put(`/auth/users/${id}`, data);

// ── Liked Songs ───────────────────────────────────────────────────────────────
export const getLikedSongs = (userId) => api.get(`/auth/liked/${userId}`);
export const likeSong = (userId, youtubeId) =>
  api.post('/auth/liked', { user_id: userId, youtube_id: youtubeId });
export const unlikeSong = (userId, youtubeId) =>
  api.delete('/auth/liked', { data: { user_id: userId, youtube_id: youtubeId } });

// ── History & Stats ───────────────────────────────────────────────────────────
export const getHistory = (userId) => api.get(`/auth/history/${userId}`);
export const getStats = (userId) => api.get(`/auth/stats/${userId}`);

export default api;
