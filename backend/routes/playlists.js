const express = require('express');
const router = express.Router();
const { getDb } = require('../db/schema');
const { getSpotifyPlaylist } = require('../services/spotify');

// GET /api/playlists?userId=1
router.get('/', (req, res) => {
  const { userId } = req.query;
  const db = getDb();

  let playlists;
  if (userId) {
    playlists = db.prepare(`
      SELECT p.*, u.name as owner_name, u.avatar_color,
             COUNT(ps.song_id) as song_count
      FROM playlists p
      LEFT JOIN users u ON p.owner_id = u.id
      LEFT JOIN playlist_songs ps ON ps.playlist_id = p.id
      WHERE p.owner_id = ? OR p.is_shared = 1
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `).all(parseInt(userId));
  } else {
    playlists = db.prepare(`
      SELECT p.*, u.name as owner_name, u.avatar_color,
             COUNT(ps.song_id) as song_count
      FROM playlists p
      LEFT JOIN users u ON p.owner_id = u.id
      LEFT JOIN playlist_songs ps ON ps.playlist_id = p.id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `).all();
  }

  res.json({ playlists });
});

// GET /api/playlists/:id
router.get('/:id', (req, res) => {
  const db = getDb();
  const playlist = db.prepare('SELECT * FROM playlists WHERE id = ?').get(parseInt(req.params.id));
  if (!playlist) return res.status(404).json({ error: 'Playlist not found' });

  const songs = db.prepare(`
    SELECT s.*, ps.position, ps.added_at, u.name as added_by_name
    FROM playlist_songs ps
    JOIN songs s ON s.id = ps.song_id
    LEFT JOIN users u ON u.id = ps.added_by
    WHERE ps.playlist_id = ?
    ORDER BY ps.position
  `).all(parseInt(req.params.id));

  res.json({ playlist, songs });
});

// POST /api/playlists
router.post('/', (req, res) => {
  const { name, description, owner_id, is_shared, cover_url } = req.body;
  if (!name || !owner_id) return res.status(400).json({ error: 'name and owner_id required' });

  const db = getDb();
  const result = db.prepare(`
    INSERT INTO playlists (name, description, owner_id, is_shared, cover_url)
    VALUES (?, ?, ?, ?, ?)
  `).run(name, description || '', parseInt(owner_id), is_shared ? 1 : 0, cover_url || null);

  const playlist = db.prepare('SELECT * FROM playlists WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ playlist });
});

// POST /api/playlists/import-spotify
router.post('/import-spotify', async (req, res) => {
  const { url, userId, isShared } = req.body;
  if (!url || !userId) {
    return res.status(400).json({ error: 'URL playlist Spotify dan User ID wajib diisi' });
  }

  try {
    const spotifyData = await getSpotifyPlaylist(url);
    const db = getDb();

    // Create playlist record
    const insertPl = db.prepare(`
      INSERT INTO playlists (name, description, owner_id, is_shared, cover_url)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      spotifyData.name,
      spotifyData.description || 'Imported from Spotify',
      parseInt(userId),
      isShared ? 1 : 0,
      spotifyData.coverUrl
    );

    const playlistId = insertPl.lastInsertRowid;

    // Prepare insert statements
    const insertSong = db.prepare(`
      INSERT OR IGNORE INTO songs (youtube_id, title, artist, duration, thumbnail_url)
      VALUES (?, ?, ?, ?, ?)
    `);

    const getSongByYt = db.prepare('SELECT id FROM songs WHERE youtube_id = ?');

    const insertPlSong = db.prepare(`
      INSERT OR IGNORE INTO playlist_songs (playlist_id, song_id, position, added_by)
      VALUES (?, ?, ?, ?)
    `);

    let addedCount = 0;
    for (let i = 0; i < spotifyData.tracks.length; i++) {
      const track = spotifyData.tracks[i];
      const placeholderYtId = `sp_${track.spotify_id}`;

      insertSong.run(placeholderYtId, track.title, track.artist, track.duration, track.thumbnail_url);
      const songRecord = getSongByYt.get(placeholderYtId);

      if (songRecord) {
        insertPlSong.run(playlistId, songRecord.id, i + 1, parseInt(userId));
        addedCount++;
      }
    }

    const playlist = db.prepare('SELECT * FROM playlists WHERE id = ?').get(playlistId);

    res.json({
      success: true,
      playlist,
      totalTracks: addedCount,
    });
  } catch (err) {
    console.error('[Import Spotify] Error:', err.message);
    res.status(500).json({ error: err.message || 'Gagal mengimpor playlist Spotify' });
  }
});

// PUT /api/playlists/:id
router.put('/:id', (req, res) => {
  const { name, description, is_shared, cover_url } = req.body;
  const db = getDb();

  db.prepare(`
    UPDATE playlists SET name = COALESCE(?, name),
    description = COALESCE(?, description),
    is_shared = COALESCE(?, is_shared),
    cover_url = COALESCE(?, cover_url)
    WHERE id = ?
  `).run(name, description, is_shared != null ? (is_shared ? 1 : 0) : null, cover_url, parseInt(req.params.id));

  const playlist = db.prepare('SELECT * FROM playlists WHERE id = ?').get(parseInt(req.params.id));
  res.json({ playlist });
});

// DELETE /api/playlists/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM playlists WHERE id = ?').run(parseInt(req.params.id));
  res.json({ success: true });
});

// POST /api/playlists/:id/songs
router.post('/:id/songs', (req, res) => {
  const { song_id, youtube_id, title, artist, duration, thumbnail_url, added_by } = req.body;
  const db = getDb();

  let songId = song_id;

  // If no song_id, create/find song first
  if (!songId && youtube_id) {
    const existing = db.prepare('SELECT id FROM songs WHERE youtube_id = ?').get(youtube_id);
    if (existing) {
      songId = existing.id;
    } else {
      const result = db.prepare(`
        INSERT INTO songs (youtube_id, title, artist, duration, thumbnail_url)
        VALUES (?, ?, ?, ?, ?)
      `).run(youtube_id, title, artist, duration, thumbnail_url);
      songId = result.lastInsertRowid;
    }
  }

  if (!songId) return res.status(400).json({ error: 'song_id or youtube_id required' });

  // Get current max position
  const maxPos = db.prepare('SELECT MAX(position) as mp FROM playlist_songs WHERE playlist_id = ?').get(parseInt(req.params.id));
  const position = (maxPos.mp || 0) + 1;

  try {
    db.prepare(`
      INSERT OR IGNORE INTO playlist_songs (playlist_id, song_id, position, added_by)
      VALUES (?, ?, ?, ?)
    `).run(parseInt(req.params.id), songId, position, added_by || null);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: 'Song already in playlist' });
  }
});

// DELETE /api/playlists/:id/songs/:songId
router.delete('/:id/songs/:songId', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM playlist_songs WHERE playlist_id = ? AND song_id = ?')
    .run(parseInt(req.params.id), parseInt(req.params.songId));
  res.json({ success: true });
});

module.exports = router;
