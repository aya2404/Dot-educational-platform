// Safe video embedding: only whitelisted providers (YouTube, Vimeo) are ever
// turned into an <iframe> src, and only after extracting a validated video id.
// Arbitrary/untrusted URLs never become an embed — callers fall back to a plain
// external link (target="_blank" rel="noopener noreferrer").

const YOUTUBE_ID = /^[a-zA-Z0-9_-]{6,15}$/;
const VIMEO_ID = /^\d{6,12}$/;

const parseUrl = (value) => {
  const clean = typeof value === 'string' ? value.trim() : '';
  if (!/^https?:\/\//i.test(clean)) return null;
  try {
    return new URL(clean);
  } catch {
    return null;
  }
};

// Returns a safe provider embed URL for a known video host, or null.
export const getVideoEmbed = (value) => {
  const url = parseUrl(value);
  if (!url) return null;

  const host = url.hostname.replace(/^www\./i, '').toLowerCase();

  // YouTube (youtube.com/watch?v=, youtu.be/<id>, youtube.com/embed/<id>)
  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
    let id = url.searchParams.get('v');
    if (!id && /^\/embed\//.test(url.pathname)) id = url.pathname.split('/')[2];
    if (id && YOUTUBE_ID.test(id)) {
      return { provider: 'youtube', src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` };
    }
  }
  if (host === 'youtu.be') {
    const id = url.pathname.slice(1).split('/')[0];
    if (id && YOUTUBE_ID.test(id)) {
      return { provider: 'youtube', src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` };
    }
  }

  // Vimeo (vimeo.com/<id>, player.vimeo.com/video/<id>)
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const parts = url.pathname.split('/').filter(Boolean);
    const id = parts[parts.length - 1];
    if (id && VIMEO_ID.test(id)) {
      return { provider: 'vimeo', src: `https://player.vimeo.com/video/${encodeURIComponent(id)}` };
    }
  }

  return null;
};

// Finds the first embeddable video URL for a content item: checks its `body`
// (if it is a URL) and its attachments. Returns { url, embed } or null.
export const getContentVideo = (content) => {
  const candidates = [];
  if (content?.body) candidates.push(content.body);
  (content?.attachments || []).forEach((a) => {
    if (a && typeof a.url === 'string') candidates.push(a.url);
  });

  for (const candidate of candidates) {
    const embed = getVideoEmbed(candidate);
    if (embed) return { url: candidate.trim(), embed };
  }
  return null;
};
