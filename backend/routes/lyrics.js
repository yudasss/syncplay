const express = require('express');
const router = express.Router();
const { getLyrics } = require('../services/lyrics');

// GET /api/lyrics?title=...&artist=...&duration=...
router.get('/', async (req, res) => {
  const { title, artist, duration } = req.query;
  if (!title) return res.status(400).json({ error: 'title is required' });

  try {
    const lyrics = await getLyrics(title, artist || '', parseInt(duration) || 0);
    res.json(lyrics);
  } catch (err) {
    console.error('[Lyrics] Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch lyrics' });
  }
});

module.exports = router;
