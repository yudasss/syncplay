const fetch = require('node-fetch');
const { getDb } = require('../db/schema');

const LRCLIB_BASE = 'https://lrclib.net/api';

// Known channel/label names to strip when detecting artists
const LABEL_PATTERNS = [
  /aquarius\s*musikindo/i,
  /musica\s*studios?/i,
  /trinity\s*optima/i,
  /warner\s*music/i,
  /sony\s*music/i,
  /universal\s*music/i,
  /nagaswara/i,
  /hits\s*records/i,
  /indo\s*semar/i,
  /emotion\s*ent/i,
  /gp\s*records/i,
  /rpm\s*musik/i,
  /-?\s*topic/i,
  /vevo/i,
  /official\s*(channel|video|audio)?/i,
];

function ensureLyricsTable() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS lyrics_cache (
      query_key TEXT PRIMARY KEY,
      synced_json TEXT,
      plain_text TEXT,
      track_name TEXT,
      artist_name TEXT,
      source TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

/**
 * Intelligent decomposition of raw YouTube title and artist channel
 */
function parseTrackAndArtist(rawTitle, rawArtist) {
  let title = (rawTitle || '').trim();
  let artist = (rawArtist || '').trim();

  // Strip common noisy video tags
  title = title
    .replace(/[\(\[][^\)\]]*(official|video|audio|lyric|lirik|mv|remaster|explicit|hd|4k|visualizer|clip|audio|hq)[^\)\]]*[\)\]]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  // If title has "Artist - Title" format (most common on YouTube Music & record label uploads)
  if (title.includes(' - ')) {
    const parts = title.split(' - ');
    const candidateArtist = parts[0].trim();
    const candidateTitle = parts.slice(1).join(' - ').trim();

    // If channel name looks like a record label or generic channel, prioritize title parts
    const isLabelChannel = LABEL_PATTERNS.some((pat) => pat.test(artist));
    if (isLabelChannel || !artist) {
      artist = candidateArtist;
      title = candidateTitle;
    } else {
      // If candidate title is clean, keep it
      title = candidateTitle;
    }
  }

  // Clean artist from topic/vevo tags
  for (const pat of LABEL_PATTERNS) {
    artist = artist.replace(pat, '').trim();
  }

  // Remove feat. tags from track title for cleaner lyrics lookup
  title = title.replace(/\s*(feat\.?|ft\.?)\s+.*$/i, '').trim();

  return { title, artist };
}

/**
 * Parse standard LRC format into timed line array
 */
function parseLRC(lrc) {
  if (!lrc || typeof lrc !== 'string') return null;
  const lines = lrc.split('\n');
  const result = [];

  for (const line of lines) {
    const match = line.match(/\[(\d{1,2}):(\d{1,2}(?:\.\d{1,3})?)\](.*)/);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseFloat(match[2]);
      const time = minutes * 60 + seconds;
      const text = match[3].trim();
      if (text) {
        result.push({ time, text });
      }
    }
  }

  return result.length > 0 ? result.sort((a, b) => a.time - b.time) : null;
}

/**
 * Provider 1: LRCLIB Direct Get
 */
async function fetchFromLrclibGet(title, artist) {
  if (!title) return null;
  try {
    const url = `${LRCLIB_BASE}/get?track_name=${encodeURIComponent(title)}&artist_name=${encodeURIComponent(artist || '')}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'SyncPlay/1.0 (https://github.com/syncplay)' },
      timeout: 4000,
    });
    if (res.ok) {
      const data = await res.json();
      if (data && (data.syncedLyrics || data.plainLyrics)) {
        return {
          synced: parseLRC(data.syncedLyrics),
          plain: data.plainLyrics || null,
          track: data.trackName,
          artist: data.artistName,
          source: 'lrclib_direct',
        };
      }
    }
  } catch (_) {}
  return null;
}

/**
 * Provider 2: LRCLIB Search
 */
async function fetchFromLrclibSearch(queries) {
  for (const q of queries) {
    if (!q || !q.trim()) continue;
    try {
      const url = `${LRCLIB_BASE}/search?q=${encodeURIComponent(q.trim())}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'SyncPlay/1.0 (https://github.com/syncplay)' },
        timeout: 4000,
      });
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list) && list.length > 0) {
          const match = list.find((i) => i.syncedLyrics) || list.find((i) => i.plainLyrics) || list[0];
          if (match && (match.syncedLyrics || match.plainLyrics)) {
            return {
              synced: parseLRC(match.syncedLyrics),
              plain: match.plainLyrics || null,
              track: match.trackName,
              artist: match.artistName,
              source: 'lrclib_search',
            };
          }
        }
      }
    } catch (_) {}
  }
  return null;
}

/**
 * Provider 3: NetEase Cloud Music (Massive synced LRC database)
 */
async function fetchFromNetEase(queries) {
  for (const q of queries) {
    if (!q || !q.trim()) continue;
    try {
      const sUrl = `http://music.163.com/api/search/get?s=${encodeURIComponent(q.trim())}&type=1&limit=4`;
      const sRes = await fetch(sUrl, { timeout: 4000 });
      if (sRes.ok) {
        const sData = await sRes.json();
        const songs = sData?.result?.songs;
        if (Array.isArray(songs) && songs.length > 0) {
          const songId = songs[0].id;
          const lUrl = `http://music.163.com/api/song/lyric?id=${songId}&lv=1&kv=1&tv=-1`;
          const lRes = await fetch(lUrl, { timeout: 4000 });
          if (lRes.ok) {
            const lData = await lRes.json();
            const lrcText = lData?.lrc?.lyric;
            if (lrcText && lrcText.includes('[')) {
              const parsed = parseLRC(lrcText);
              if (parsed && parsed.length > 0) {
                return {
                  synced: parsed,
                  plain: parsed.map((p) => p.text).join('\n'),
                  track: songs[0].name,
                  artist: songs[0].artists?.[0]?.name,
                  source: 'netease',
                };
              }
            }
          }
        }
      }
    } catch (_) {}
  }
  return null;
}

/**
 * Provider 4: Open Lyrics API (Plain text fallback)
 */
async function fetchFromLyricsOvh(title, artist) {
  if (!title || !artist) return null;
  try {
    const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`;
    const res = await fetch(url, { timeout: 3500 });
    if (res.ok) {
      const data = await res.json();
      if (data && data.lyrics) {
        return {
          synced: null,
          plain: data.lyrics.trim(),
          track: title,
          artist: artist,
          source: 'lyrics_ovh',
        };
      }
    }
  } catch (_) {}
  return null;
}

/**
 * Main Get Lyrics with Caching & Multi-tiered Strategy
 */
async function getLyrics(rawTitle, rawArtist, duration = 0) {
  ensureLyricsTable();
  const db = getDb();

  const { title, artist } = parseTrackAndArtist(rawTitle, rawArtist);
  const cacheKey = `${title.toLowerCase()}:::${artist.toLowerCase()}`;

  // 1. Check SQLite Cache
  try {
    const cached = db.prepare('SELECT * FROM lyrics_cache WHERE query_key = ?').get(cacheKey);
    if (cached) {
      return {
        synced: cached.synced_json ? JSON.parse(cached.synced_json) : null,
        plain: cached.plain_text || null,
        track: cached.track_name || title,
        artist: cached.artist_name || artist,
        source: cached.source || 'cache',
      };
    }
  } catch (_) {}

  // 2. Multi-tier lookup
  const searchQueries = [
    `${title} ${artist}`.trim(),
    `${artist} ${title}`.trim(),
    title,
    rawTitle,
  ].filter(Boolean);

  let result = null;

  // Tier 1: LRCLIB Direct Get
  result = await fetchFromLrclibGet(title, artist);

  // Tier 2: LRCLIB Search
  if (!result || (!result.synced && !result.plain)) {
    result = await fetchFromLrclibSearch(searchQueries);
  }

  // Tier 3: NetEase Cloud Music (Synced LRC)
  if (!result || !result.synced) {
    const neteaseResult = await fetchFromNetEase(searchQueries);
    if (neteaseResult && neteaseResult.synced) {
      result = neteaseResult;
    }
  }

  // Tier 4: Plain Text Fallback
  if (!result || (!result.synced && !result.plain)) {
    result = await fetchFromLyricsOvh(title, artist);
  }

  // 3. Save to cache
  if (result && (result.synced || result.plain)) {
    try {
      db.prepare(`
        INSERT OR REPLACE INTO lyrics_cache (query_key, synced_json, plain_text, track_name, artist_name, source)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        cacheKey,
        result.synced ? JSON.stringify(result.synced) : null,
        result.plain || null,
        result.track || title,
        result.artist || artist,
        result.source || 'web'
      );
    } catch (_) {}

    return result;
  }

  return { synced: null, plain: null, track: title, artist };
}

module.exports = {
  getLyrics,
  parseLRC,
  parseTrackAndArtist,
};
