const express = require('express');
const router = express.Router();
const { searchYouTube } = require('../services/ytdlp');
const { getDb } = require('../db/schema');

// GET /api/search?q=query
router.get('/', async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length === 0) {
    return res.status(400).json({ error: 'Query is required' });
  }

  try {
    const results = await searchYouTube(q.trim(), 20);

    // Cache song metadata to DB
    const db = getDb();
    const insertSong = db.prepare(`
      INSERT OR IGNORE INTO songs (youtube_id, title, artist, duration, thumbnail_url)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const song of results) {
      insertSong.run(song.youtube_id, song.title, song.artist, song.duration, song.thumbnail_url);
    }

    res.json({ results });
  } catch (err) {
    console.error('[Search] Error:', err.message);
    res.status(500).json({ error: 'Search failed', message: err.message });
  }
});

module.exports = router;
