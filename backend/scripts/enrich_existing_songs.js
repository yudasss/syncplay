const fetch = require('node-fetch');
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'harmonia.db'));

async function fetchThumbnail(spotifyId, currentThumbnail) {
  try {
    const oembedUrl = `https://open.spotify.com/oembed?url=https://open.spotify.com/track/${spotifyId}`;
    const res = await fetch(oembedUrl, { timeout: 4000 });
    if (res.ok) {
      const data = await res.json();
      if (data.thumbnail_url) {
        return data.thumbnail_url;
      }
    }
  } catch (err) {
    // Keep current if fails
  }
  return currentThumbnail;
}

async function run() {
  console.log('Fetching Spotify songs from database...');
  const songs = db.prepare('SELECT id, youtube_id, title, artist, thumbnail_url FROM songs WHERE youtube_id LIKE ?').all('sp_%');
  console.log(`Found ${songs.length} Spotify tracks to enrich.`);

  const updateStmt = db.prepare('UPDATE songs SET thumbnail_url = ? WHERE id = ?');

  const BATCH_SIZE = 10;
  let updatedCount = 0;

  for (let i = 0; i < songs.length; i += BATCH_SIZE) {
    const batch = songs.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (song) => {
        const trackId = song.youtube_id.replace('sp_', '');
        const newThumbnail = await fetchThumbnail(trackId, song.thumbnail_url);
        if (newThumbnail && newThumbnail !== song.thumbnail_url) {
          updateStmt.run(newThumbnail, song.id);
          updatedCount++;
        }
      })
    );
    process.stdout.write(`Processed ${Math.min(i + BATCH_SIZE, songs.length)} / ${songs.length} songs...\r`);
  }

  console.log(`\nSuccessfully updated ${updatedCount} songs with their unique original album art!`);
}

run();
