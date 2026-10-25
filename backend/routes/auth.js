const express = require('express');
const router = express.Router();
const { getDb } = require('../db/schema');

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { pin } = req.body;
  if (!pin) return res.status(400).json({ error: 'PIN required' });

  const db = getDb();
  const user = db.prepare('SELECT id, name, avatar_color, created_at FROM users WHERE pin = ?').get(pin);

  if (!user) return res.status(401).json({ error: 'Invalid PIN' });
  res.json({ user });
});

// GET /api/auth/users (for profile select screen)
router.get('/users', (req, res) => {
  const db = getDb();
  const users = db.prepare('SELECT id, name, avatar_color FROM users').all();
  res.json({ users });
});

// PUT /api/auth/users/:id
router.put('/users/:id', (req, res) => {
  const { name, avatar_color, pin } = req.body;
  const db = getDb();

  db.prepare(`
    UPDATE users SET
      name = COALESCE(?, name),
      avatar_color = COALESCE(?, avatar_color),
      pin = COALESCE(?, pin)
    WHERE id = ?
  `).run(name, avatar_color, pin, parseInt(req.params.id));

  const user = db.prepare('SELECT id, name, avatar_color FROM users WHERE id = ?').get(parseInt(req.params.id));
  res.json({ user });
});

// POST /api/auth/liked
router.post('/liked', (req, res) => {
  const { user_id, youtube_id } = req.body;
  const db = getDb();

  const song = db.prepare('SELECT id FROM songs WHERE youtube_id = ?').get(youtube_id);
  if (!song) return res.status(404).json({ error: 'Song not found' });

  try {
    db.prepare('INSERT OR IGNORE INTO liked_songs (user_id, song_id) VALUES (?, ?)').run(parseInt(user_id), song.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/auth/liked
router.delete('/liked', (req, res) => {
  const { user_id, youtube_id } = req.body;
  const db = getDb();

  const song = db.prepare('SELECT id FROM songs WHERE youtube_id = ?').get(youtube_id);
  if (!song) return res.status(404).json({ error: 'Song not found' });

  db.prepare('DELETE FROM liked_songs WHERE user_id = ? AND song_id = ?').run(parseInt(user_id), song.id);
  res.json({ success: true });
});

// GET /api/auth/liked/:userId
router.get('/liked/:userId', (req, res) => {
  const db = getDb();
  const songs = db.prepare(`
    SELECT s.*, ls.liked_at FROM liked_songs ls
    JOIN songs s ON s.id = ls.song_id
    WHERE ls.user_id = ?
    ORDER BY ls.liked_at DESC
  `).all(parseInt(req.params.userId));

  res.json({ songs });
});

// GET /api/auth/history/:userId
router.get('/history/:userId', (req, res) => {
  const db = getDb();
  const history = db.prepare(`
    SELECT s.*, ph.played_at, ph.duration_listened FROM play_history ph
    JOIN songs s ON s.id = ph.song_id
    WHERE ph.user_id = ?
    ORDER BY ph.played_at DESC
    LIMIT 50
  `).all(parseInt(req.params.userId));

  res.json({ history });
});

// GET /api/auth/stats/:userId
router.get('/stats/:userId', (req, res) => {
  const db = getDb();

  const totalPlays = db.prepare('SELECT COUNT(*) as count FROM play_history WHERE user_id = ?').get(parseInt(req.params.userId));
  const topSongs = db.prepare(`
    SELECT s.*, COUNT(ph.id) as play_count FROM play_history ph
    JOIN songs s ON s.id = ph.song_id
    WHERE ph.user_id = ?
    GROUP BY ph.song_id
    ORDER BY play_count DESC
    LIMIT 10
  `).all(parseInt(req.params.userId));
  const topArtists = db.prepare(`
    SELECT s.artist, COUNT(ph.id) as play_count FROM play_history ph
    JOIN songs s ON s.id = ph.song_id
    WHERE ph.user_id = ?
    GROUP BY s.artist
    ORDER BY play_count DESC
    LIMIT 10
  `).all(parseInt(req.params.userId));

  res.json({ totalPlays: totalPlays.count, topSongs, topArtists });
});

module.exports = router;
