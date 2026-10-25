const express = require('express');
const router = express.Router();
const { getAudioUrl, getVideoInfo, searchYouTube } = require('../services/ytdlp');
const { getDb } = require('../db/schema');
const fetch = require('node-fetch');

// Helper to score and pick the cleanest studio/ad-free track
function pickCleanestTrack(results, targetTitle, targetArtist, targetDuration) {
  if (!results || results.length === 0) return null;

  const scored = results.map((item) => {
    let score = 100;
    const title = (item.title || '').toLowerCase();
    const channel = (item.artist || '').toLowerCase();

    // 1. Duration closeness (crucial to avoid 20-30s music video skits/sponsors)
    if (targetDuration && item.duration) {
      const diff = Math.abs(item.duration - targetDuration);
      score -= Math.min(diff * 3, 60);
    }

    // 2. Bonus for clean studio audio indicators
    if (title.includes('audio') || title.includes('visualizer') || title.includes('official audio')) score += 30;
    if (channel.includes('- topic') || channel.includes('topic')) score += 35;
    if (title.includes('lyric') || title.includes('lirik')) score += 20;

    // 3. Penalty for video intros, skits, and music videos with spoken sponsor segments
    if (title.includes('music video') || title.includes('official video') || title.includes('mv')) score -= 25;
    if (title.includes('teaser') || title.includes('trailer') || title.includes('behind')) score -= 70;
    if (title.includes('live') || title.includes('concert')) score -= 40;
    if (title.includes('reaction') || title.includes('review')) score -= 60;
    if (title.includes('karaoke') || title.includes('instrumental')) score -= 50;

    return { ...item, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0];
}

// In-memory cache for resolved Spotify placeholders
const resolvedSpCache = new Map(); // sp_id -> realYtId
const inflightResolvePromises = new Map();

function ensureMappingsTable() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS spotify_mappings (
      sp_id TEXT PRIMARY KEY,
      youtube_id TEXT NOT NULL,
      title TEXT,
      artist TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

// Helper to resolve Spotify placeholder songs to real YouTube IDs
async function resolveRealYoutubeId(idOrSpId) {
  if (!idOrSpId) return idOrSpId;
  ensureMappingsTable();
  const db = getDb();

  if (resolvedSpCache.has(idOrSpId)) {
    return resolvedSpCache.get(idOrSpId);
  }

  // Check persistent mapping table
  const mapped = db.prepare('SELECT youtube_id FROM spotify_mappings WHERE sp_id = ?').get(idOrSpId);
  if (mapped && mapped.youtube_id) {
    resolvedSpCache.set(idOrSpId, mapped.youtube_id);
    return mapped.youtube_id;
  }

  if (inflightResolvePromises.has(idOrSpId)) {
    return inflightResolvePromises.get(idOrSpId);
  }

  const promise = (async () => {
    let song = db.prepare('SELECT * FROM songs WHERE youtube_id = ?').get(idOrSpId);

    if (idOrSpId.startsWith('sp_') && song) {
      console.log(`[Stream] Resolving clean studio audio for: "${song.title} - ${song.artist}"...`);
      
      const query = `${song.title} ${song.artist || ''} audio`;
      const ytResults = await searchYouTube(query, 6);
      const best = pickCleanestTrack(ytResults, song.title, song.artist, song.duration);

      if (best) {
        console.log(`[Stream] Selected cleanest track: "${best.title}" (dur: ${best.duration}s, id: ${best.youtube_id})`);
        const realYtId = best.youtube_id;
        resolvedSpCache.set(idOrSpId, realYtId);

        try {
          db.prepare(`
            INSERT OR REPLACE INTO spotify_mappings (sp_id, youtube_id, title, artist)
            VALUES (?, ?, ?, ?)
          `).run(idOrSpId, realYtId, song.title, song.artist);
        } catch (mErr) {
          // ignore
        }

        try {
          db.prepare('UPDATE songs SET youtube_id = ? WHERE id = ?').run(realYtId, song.id);
          return realYtId;
        } catch (err) {
          const existing = db.prepare('SELECT id FROM songs WHERE youtube_id = ?').get(realYtId);
          if (existing) {
            db.prepare('UPDATE playlist_songs SET song_id = ? WHERE song_id = ?').run(existing.id, song.id);
            db.prepare('DELETE FROM songs WHERE id = ?').run(song.id);
            return realYtId;
          }
        }
      }
    }
    return idOrSpId;
  })();

  inflightResolvePromises.set(idOrSpId, promise);
  try {
    const res = await promise;
    if (res && res !== idOrSpId) resolvedSpCache.set(idOrSpId, res);
    return res;
  } finally {
    inflightResolvePromises.delete(idOrSpId);
  }
}

// GET /api/stream/:youtubeId
router.get('/:youtubeId', async (req, res) => {
  let { youtubeId } = req.params;
  const { userId } = req.query;

  try {
    youtubeId = await resolveRealYoutubeId(youtubeId);

    if (!youtubeId || youtubeId.startsWith('sp_') || !/^[a-zA-Z0-9_-]{11}$/.test(youtubeId)) {
      return res.status(400).json({ error: 'Lagu tidak dapat ditemukan atau diputar dari sumber.' });
    }

    const audioUrl = await getAudioUrl(youtubeId);

    const db = getDb();
    let song = db.prepare('SELECT * FROM songs WHERE youtube_id = ?').get(youtubeId);

    if (!song) {
      const info = await getVideoInfo(youtubeId);
      db.prepare(`
        INSERT OR REPLACE INTO songs (youtube_id, title, artist, duration, thumbnail_url)
        VALUES (?, ?, ?, ?, ?)
      `).run(info.youtube_id, info.title, info.artist, info.duration, info.thumbnail_url);
      song = db.prepare('SELECT * FROM songs WHERE youtube_id = ?').get(youtubeId);
    }

    if (userId && song) {
      db.prepare(`
        INSERT INTO play_history (user_id, song_id) VALUES (?, ?)
      `).run(parseInt(userId), song.id);
    }

    const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const proxyUrl = `${proto}://${host}/api/stream/${youtubeId}/proxy`;

    res.json({ url: proxyUrl, directUrl: audioUrl, song, resolvedYoutubeId: youtubeId });
  } catch (err) {
    console.error('[Stream] Error:', err.message);
    res.status(500).json({ error: 'Failed to get stream URL', message: err.message });
  }
});

// GET /api/stream/:youtubeId/proxy
router.get('/:youtubeId/proxy', async (req, res) => {
  let { youtubeId } = req.params;

  try {
    youtubeId = await resolveRealYoutubeId(youtubeId);

    if (!youtubeId || youtubeId.startsWith('sp_') || !/^[a-zA-Z0-9_-]{11}$/.test(youtubeId)) {
      return res.status(400).json({ error: 'Audio proxy: invalid YouTube ID' });
    }

    const audioUrl = await getAudioUrl(youtubeId);

    const response = await fetch(audioUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Range': req.headers.range || 'bytes=0-',
      },
    });

    res.setHeader('Content-Type', response.headers.get('content-type') || 'audio/webm');
    res.setHeader('Accept-Ranges', 'bytes');

    const contentRange = response.headers.get('content-range');
    const contentLength = response.headers.get('content-length');

    if (contentRange) res.setHeader('Content-Range', contentRange);
    if (contentLength) res.setHeader('Content-Length', contentLength);

    res.status(response.status);
    response.body.pipe(res);
  } catch (err) {
    console.error('[Stream Proxy] Error:', err.message);
    res.status(500).json({ error: 'Proxy stream failed' });
  }
});

module.exports = router;
