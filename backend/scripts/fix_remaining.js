const fetch = require('node-fetch');
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'harmonia.db'));

const remaining = db.prepare('SELECT id, title, artist, youtube_id FROM songs WHERE thumbnail_url LIKE ?').all('%5fd9e8b67af93b71955bc46d%');

async function fixRemaining() {
  console.log(`Fixing ${remaining.length} remaining songs...`);
  const updateStmt = db.prepare('UPDATE songs SET thumbnail_url = ? WHERE id = ?');

  for (const song of remaining) {
    let cleanTitle = song.title.replace(/\s*\(visualizer\)|\s*\(official audio\)|\s*\(audio\)|\s*\(lirik\)/gi, '').trim();
    let cleanArtist = song.artist.split(',')[0].trim();
    let query = `${cleanArtist} ${cleanTitle}`;

    // First try iTunes
    try {
      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=1`, { timeout: 4000 });
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          const art = data.results[0].artworkUrl100.replace('100x100bb', '600x600bb');
          updateStmt.run(art, song.id);
          console.log(`[iTunes OK] ${song.title} -> ${art}`);
          continue;
        }
      }
    } catch (e) {
      console.log(`[iTunes ERR] ${query}: ${e.message}`);
    }

    // If Spotify track ID
    if (song.youtube_id && song.youtube_id.startsWith('sp_')) {
      const trackId = song.youtube_id.replace('sp_', '');
      try {
        const res = await fetch(`https://open.spotify.com/oembed?url=https://open.spotify.com/track/${trackId}`, { timeout: 4000 });
        if (res.ok) {
          const data = await res.json();
          if (data.thumbnail_url) {
            updateStmt.run(data.thumbnail_url, song.id);
            console.log(`[Spotify OK] ${song.title} -> ${data.thumbnail_url}`);
            continue;
          }
        }
      } catch (e) {}
    }

    // Fallback: YouTube hqdefault thumbnail if youtube_id is an 11-char ID
    if (song.youtube_id && song.youtube_id.length === 11 && !song.youtube_id.startsWith('sp_')) {
      const ytArt = `https://i.ytimg.com/vi/${song.youtube_id}/hqdefault.jpg`;
      updateStmt.run(ytArt, song.id);
      console.log(`[YouTube OK] ${song.title} -> ${ytArt}`);
    }
  }

  console.log('Finished updating remaining songs!');
}

fixRemaining();
