const fetch = require('node-fetch');
const spotifyUrlInfo = require('spotify-url-info')(fetch);

/**
 * Extract playlist ID from various Spotify URL formats
 * e.g., https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=abc
 * or spotify:playlist:37i9dQZF1DXcBWIGoYBM5M
 */
function extractPlaylistId(input) {
  if (!input) return null;
  const match = input.match(/playlist[\/:]([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

async function fetchTrackThumbnail(spotifyId, fallbackUrl) {
  if (!spotifyId || spotifyId.startsWith('tr_')) return fallbackUrl;
  try {
    const oembedUrl = `https://open.spotify.com/oembed?url=https://open.spotify.com/track/${spotifyId}`;
    const res = await fetch(oembedUrl, { timeout: 3000 });
    if (res.ok) {
      const data = await res.json();
      if (data.thumbnail_url) return data.thumbnail_url;
    }
  } catch (e) {
    // ignore
  }
  return fallbackUrl;
}

/**
 * Fetch Spotify playlist details and tracks
 * Uses spotify-url-info as Primary (modern, maintained)
 * Falls back to Embed HTML scraper and then Web API.
 */
async function getSpotifyPlaylist(urlOrId) {
  const cleanInput = (urlOrId || '').trim();
  const playlistId = extractPlaylistId(cleanInput) || cleanInput;
  if (!playlistId || !/^[a-zA-Z0-9]+$/.test(playlistId)) {
    throw new Error('Link playlist Spotify tidak valid. Pastikan format: https://open.spotify.com/playlist/...');
  }

  const standardUrl = `https://open.spotify.com/playlist/${playlistId}`;

  // ── Strategy 1: spotify-url-info (Handles public playlists, albums, charts) ──
  try {
    const previewPromise = spotifyUrlInfo.getPreview(standardUrl).catch(() => null);
    const tracksPromise = spotifyUrlInfo.getTracks(standardUrl).catch(() => null);

    const [preview, rawTracks] = await Promise.all([previewPromise, tracksPromise]);

    if (rawTracks && Array.isArray(rawTracks) && rawTracks.length > 0) {
      const coverUrl = preview?.image || null;
      const tracks = rawTracks.map((item, idx) => {
        const trackUri = item.uri || '';
        const trackId = trackUri.replace('spotify:track:', '') || `tr_${idx}_${Date.now()}`;
        return {
          spotify_id: trackId,
          title: item.name || item.title || 'Untitled',
          artist: item.artist || item.artists?.[0]?.name || 'Unknown Artist',
          duration: item.duration ? Math.round(item.duration / 1000) : (item.duration_ms ? Math.round(item.duration_ms / 1000) : 0),
          thumbnail_url: coverUrl,
        };
      });

      // Enrich first batch of tracks with individual cover art if available
      const ENRICH_LIMIT = Math.min(tracks.length, 30);
      const toEnrich = tracks.slice(0, ENRICH_LIMIT);
      await Promise.all(
        toEnrich.map(async (t) => {
          if (t.spotify_id && !t.spotify_id.startsWith('tr_')) {
            t.thumbnail_url = await fetchTrackThumbnail(t.spotify_id, coverUrl);
          }
        })
      );

      return {
        name: preview?.title || 'Spotify Playlist',
        description: preview?.description || 'Imported from Spotify',
        coverUrl,
        tracks,
      };
    }
  } catch (suiErr) {
    console.warn('[Spotify] spotify-url-info strategy failed, trying embed:', suiErr.message);
  }

  // ── Strategy 2: Embed Scraper ───────────────────────────────────────────────
  try {
    const embedUrl = `https://open.spotify.com/embed/playlist/${playlistId}`;
    const res = await fetch(embedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      timeout: 6000,
    });

    if (res.ok) {
      const html = await res.text();
      const nextMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
      if (nextMatch) {
        const parsed = JSON.parse(nextMatch[1]);
        const entity = parsed?.props?.pageProps?.state?.data?.entity;
        if (entity && entity.trackList && entity.trackList.length > 0) {
          const coverUrl = entity.coverArt?.sources?.[0]?.url || null;
          const tracks = entity.trackList.map((item, idx) => {
            const trackUri = item.uri || '';
            const trackId = trackUri.replace('spotify:track:', '') || `tr_${idx}_${Date.now()}`;
            return {
              spotify_id: trackId,
              title: item.title || 'Untitled',
              artist: item.subtitle || 'Unknown Artist',
              duration: item.duration ? Math.round(item.duration / 1000) : 0,
              thumbnail_url: coverUrl,
            };
          });

          return {
            name: entity.name || entity.title || 'Spotify Playlist',
            description: entity.subtitle || 'Imported from Spotify',
            coverUrl,
            tracks,
          };
        }
      }
    }
  } catch (embedErr) {
    console.warn('[Spotify] Embed scrape failed:', embedErr.message);
  }

  // ── Strategy 3: Web API with Client ID / Secret (if valid) ──────────────────
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (clientId && clientSecret) {
    try {
      const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
        timeout: 5000,
      });

      if (tokenRes.ok) {
        const { access_token } = await tokenRes.json();
        const plRes = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
          headers: { Authorization: `Bearer ${access_token}` },
          timeout: 6000,
        });

        if (plRes.ok) {
          const pl = await plRes.json();
          const coverUrl = pl.images?.[0]?.url || null;
          const tracks = (pl.tracks?.items || [])
            .filter((i) => i && i.track)
            .map((i) => ({
              spotify_id: i.track.id,
              title: i.track.name,
              artist: i.track.artists?.map((a) => a.name).join(', ') || 'Unknown Artist',
              duration: i.track.duration_ms ? Math.round(i.track.duration_ms / 1000) : 0,
              thumbnail_url: i.track.album?.images?.[0]?.url || coverUrl,
            }));

          return {
            name: pl.name,
            description: pl.description || 'Imported from Spotify',
            coverUrl,
            tracks,
          };
        }
      }
    } catch (apiErr) {
      console.warn('[Spotify] Web API fallback failed:', apiErr.message);
    }
  }

  throw new Error('Playlist Spotify tidak ditemukan atau berstatus privat. Pastikan playlist disetel ke Publik di aplikasi Spotify.');
}

module.exports = { extractPlaylistId, getSpotifyPlaylist };
