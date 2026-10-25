const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'harmonia.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      pin TEXT NOT NULL,
      avatar_color TEXT DEFAULT '#A78BFA',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS songs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      youtube_id TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      artist TEXT,
      album TEXT,
      duration INTEGER,
      thumbnail_url TEXT,
      cached_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS playlists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      cover_url TEXT,
      owner_id INTEGER REFERENCES users(id),
      is_shared INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS playlist_songs (
      playlist_id INTEGER REFERENCES playlists(id) ON DELETE CASCADE,
      song_id INTEGER REFERENCES songs(id) ON DELETE CASCADE,
      position INTEGER DEFAULT 0,
      added_by INTEGER REFERENCES users(id),
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (playlist_id, song_id)
    );

    CREATE TABLE IF NOT EXISTS liked_songs (
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      song_id INTEGER REFERENCES songs(id) ON DELETE CASCADE,
      liked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, song_id)
    );

    CREATE TABLE IF NOT EXISTS play_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      song_id INTEGER REFERENCES songs(id),
      played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      duration_listened INTEGER DEFAULT 0
    );
  `);

  // Seed default users if none exist
  const count = db.prepare('SELECT COUNT(*) as c FROM users').get();
  if (count.c === 0) {
    db.prepare(`INSERT INTO users (name, pin, avatar_color) VALUES (?, ?, ?)`).run('User 1', '1234', '#A78BFA');
    db.prepare(`INSERT INTO users (name, pin, avatar_color) VALUES (?, ?, ?)`).run('User 2', '5678', '#F472B6');
    console.log('[DB] Default users created (PIN: 1234 / 5678)');
  }
}

module.exports = { getDb };
