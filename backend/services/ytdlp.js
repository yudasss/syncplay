const { exec, spawn } = require('child_process');
const path = require('path');

/**
 * Search YouTube using yt-dlp
 * @param {string} query
 * @param {number} maxResults
 * @returns {Promise<Array>}
 */
// In-memory caches for fast sub-second playback and reduced yt-dlp load
const audioUrlCache = new Map(); // youtubeId -> { url, expiresAt }
const inflightAudioPromises = new Map(); // youtubeId -> Promise<string>
const searchCache = new Map(); // queryKey -> { results, expiresAt }
const AUDIO_CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours
const SEARCH_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Search YouTube using yt-dlp
 * @param {string} query
 * @param {number} maxResults
 * @returns {Promise<Array>}
 */
async function searchYouTube(query, maxResults = 20) {
  const cacheKey = `${query.toLowerCase().trim()}_${maxResults}`;
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.results;
  }

  return new Promise((resolve, reject) => {
    const args = [
      `ytsearch${maxResults}:${query}`,
      '--dump-json',
      '--no-playlist',
      '--flat-playlist',
      '--quiet',
      '--no-warnings',
      '--skip-download',
    ];

    const proc = spawn('yt-dlp', args);
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d) => (stdout += d));
    proc.stderr.on('data', (d) => (stderr += d));

    proc.on('close', (code) => {
      if (code !== 0 && !stdout) {
        return reject(new Error(`yt-dlp search failed: ${stderr}`));
      }
      try {
        const lines = stdout.trim().split('\n').filter(Boolean);
        const results = lines.map((line) => {
          const item = JSON.parse(line);
          return {
            youtube_id: item.id,
            title: item.title || 'Unknown',
            artist: item.uploader || item.channel || 'Unknown',
            duration: item.duration || 0,
            thumbnail_url: item.thumbnail ||
              (item.thumbnails && item.thumbnails[0]?.url) ||
              `https://img.youtube.com/vi/${item.id}/hqdefault.jpg`,
            view_count: item.view_count,
          };
        });
        searchCache.set(cacheKey, {
          results,
          expiresAt: Date.now() + SEARCH_CACHE_TTL_MS,
        });
        resolve(results);
      } catch (err) {
        reject(new Error('Failed to parse yt-dlp output'));
      }
    });
  });
}

/**
 * Get audio stream URL for a YouTube video
 * @param {string} youtubeId
 * @returns {Promise<string>} Direct audio URL
 */
async function getAudioUrl(youtubeId) {
  const cached = audioUrlCache.get(youtubeId);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.url;
  }

  if (inflightAudioPromises.has(youtubeId)) {
    return inflightAudioPromises.get(youtubeId);
  }

  const promise = new Promise((resolve, reject) => {
    const url = `https://www.youtube.com/watch?v=${youtubeId}`;
    const args = [
      url,
      '--format', 'bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio/best',
      '--get-url',
      '--no-playlist',
      '--quiet',
      '--no-warnings',
    ];

    const proc = spawn('yt-dlp', args);
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d) => (stdout += d));
    proc.stderr.on('data', (d) => (stderr += d));

    proc.on('close', (code) => {
      inflightAudioPromises.delete(youtubeId);
      if (code !== 0) return reject(new Error(`yt-dlp failed: ${stderr}`));
      const audioUrl = stdout.trim().split('\n')[0];
      if (!audioUrl) return reject(new Error('No audio URL found'));
      audioUrlCache.set(youtubeId, {
        url: audioUrl,
        expiresAt: Date.now() + AUDIO_CACHE_TTL_MS,
      });
      resolve(audioUrl);
    });
  });

  inflightAudioPromises.set(youtubeId, promise);
  return promise;
}

/**
 * Get video info/metadata
 * @param {string} youtubeId
 * @returns {Promise<object>}
 */
async function getVideoInfo(youtubeId) {
  return new Promise((resolve, reject) => {
    const url = `https://www.youtube.com/watch?v=${youtubeId}`;
    const args = [url, '--dump-json', '--no-playlist', '--quiet', '--no-warnings', '--skip-download'];

    const proc = spawn('yt-dlp', args);
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d) => (stdout += d));
    proc.stderr.on('data', (d) => (stderr += d));

    proc.on('close', (code) => {
      if (code !== 0) return reject(new Error(`yt-dlp info failed: ${stderr}`));
      try {
        const info = JSON.parse(stdout.trim());
        resolve({
          youtube_id: info.id,
          title: info.title,
          artist: info.uploader || info.channel || 'Unknown',
          album: info.album || null,
          duration: info.duration,
          thumbnail_url: info.thumbnail,
        });
      } catch {
        reject(new Error('Failed to parse video info'));
      }
    });
  });
}

module.exports = { searchYouTube, getAudioUrl, getVideoInfo };
