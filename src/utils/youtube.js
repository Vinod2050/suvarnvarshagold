// Turns any common YouTube link into a video id and safe, privacy-enhanced embed/thumbnail URLs.
const ID = /^[A-Za-z0-9_-]{11}$/;
const HOSTS = new Set([
  'youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com',
  'youtu.be', 'www.youtu.be', 'youtube-nocookie.com', 'www.youtube-nocookie.com',
]);

// Returns { id, isShort } or null. Accepts watch?v=, youtu.be/, /shorts/, /embed/, /live/, /v/ links and bare ids.
function parseYouTube(input) {
  const s = String(input || '').trim();
  if (ID.test(s)) return { id: s, isShort: false };
  let url;
  try {
    url = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
  } catch {
    return null;
  }
  if (!HOSTS.has(url.hostname.toLowerCase())) return null;
  const parts = url.pathname.split('/').filter(Boolean);
  let id = null;
  let isShort = false;
  if (url.hostname.toLowerCase().endsWith('youtu.be')) {
    id = parts[0];
  } else if (parts[0] === 'watch') {
    id = url.searchParams.get('v');
  } else if (['shorts', 'embed', 'live', 'v'].includes(parts[0])) {
    id = parts[1];
    isShort = parts[0] === 'shorts';
  }
  return id && ID.test(id) ? { id, isShort } : null;
}

const embedUrl = (id) => `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&autoplay=1`;
const thumbnailUrl = (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
const watchUrl = (id) => `https://www.youtube.com/watch?v=${id}`;

// Adds the derived URLs to a row that has youtube_id.
function withVideoUrls(row) {
  if (!row || !ID.test(row.youtube_id || '')) return row;
  return { ...row, embed_url: embedUrl(row.youtube_id), thumbnail_url: thumbnailUrl(row.youtube_id), watch_url: watchUrl(row.youtube_id) };
}

module.exports = { parseYouTube, embedUrl, thumbnailUrl, watchUrl, withVideoUrls };
