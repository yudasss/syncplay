require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Init DB on startup
const { getDb } = require('./db/schema');
getDb();

// Routes
app.use('/api/search', require('./routes/search'));
app.use('/api/stream', require('./routes/stream'));
app.use('/api/lyrics', require('./routes/lyrics'));
app.use('/api/playlists', require('./routes/playlists'));
app.use('/api/auth', require('./routes/auth'));

const fs = require('fs');

// App Binary Downloads
app.get('/api/download/android', (req, res) => {
  const dir = path.resolve(__dirname, '..', 'dist-apps');
  const file = path.join(dir, 'SyncPlay-v1.0.apk');
  if (fs.existsSync(file)) {
    res.sendFile('SyncPlay-v1.0.apk', {
      root: dir,
      headers: { 'Content-Disposition': 'attachment; filename="SyncPlay-v1.0.apk"' }
    });
  } else {
    res.status(404).json({ error: 'APK is not bundled in cloud server' });
  }
});

app.get('/api/download/windows', (req, res) => {
  const dir = path.resolve(__dirname, '..', 'dist-apps');
  const file = path.join(dir, 'SyncPlay-Windows-v1.0.zip');
  if (fs.existsSync(file)) {
    res.sendFile('SyncPlay-Windows-v1.0.zip', {
      root: dir,
      headers: { 'Content-Disposition': 'attachment; filename="SyncPlay-Windows-v1.0.zip"' }
    });
  } else {
    res.status(404).json({ error: 'Windows installer is not bundled in cloud server' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() });
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'frontend', 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'dist', 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🎵 Harmonia Backend running at http://localhost:${PORT}`);
  console.log(`   Also accessible on your LAN at http://<your-ip>:${PORT}`);
  console.log(`   API: http://localhost:${PORT}/api/health\n`);
});
