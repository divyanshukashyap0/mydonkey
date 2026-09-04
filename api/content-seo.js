import https from 'https';

const TMDB_API_KEY = process.env.VITE_TMDB_API_KEY || '5d44293e1177a6fb42010456a8c6b4ff';

function httpsGet(url) {
  return new Promise((resolve) => {
    const req = https.get(url, { headers: { 'User-Agent': 'MyDonkey-SEO/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(4000, () => {
      req.destroy();
      resolve(null);
    });
  });
}

function normalizeImageUrl(path, size = 'w1280') {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (path.startsWith('/')) return `https://image.tmdb.org/t/p/${size}${path}`;
  return `https://image.tmdb.org/t/p/${size}/${path}`;
}

const safe = (s) => String(s || '')
  .replace(/&/g, '&amp;')
  .replace(/"/g, '&quot;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

export default async function handler(req, res) {
  const urlPath = req.url || '';
  let contentId = req.query?.id || null;
  let pageType = req.query?.type || 'browse';

  if (!contentId) {
    const match = urlPath.match(/\/(browse|watch)\/([^\/?#]+)/i);
    if (match) {
      pageType = match[1].toLowerCase();
      contentId = decodeURIComponent(match[2]);
    }
  }

  // Fallback defaults
  let title = 'My Donkey | Watch Free Movies, TV Shows & Anime Online in HD';
  let description = 'Stream unlimited movies, web series, anime, and Marvel movies in HD on My Donkey with authentic audio and zero subscription fees.';
  let image = 'https://res.cloudinary.com/dpba1gvra/image/upload/v1770155013/logo_mgcysp.png';
  let posterImage = null;
  let isVideo = false;

  const host = req.headers?.['x-forwarded-host'] || req.headers?.host || 'www.mydonkey.in';
  const protocol = req.headers?.['x-forwarded-proto'] || 'https';
  const targetAppUrl = `${protocol}://${host}/${pageType}/${contentId || ''}`;

  if (contentId) {
    try {
      let foundData = null;

      // 1. Check if TMDB direct ID (e.g. tmdb_126400 or numeric ID)
      const isTmdbPrefix = typeof contentId === 'string' && contentId.startsWith('tmdb_');
      const isNumeric = /^\d+$/.test(contentId);
      
      if (isTmdbPrefix || isNumeric) {
        const rawId = isTmdbPrefix ? contentId.replace('tmdb_', '') : contentId;
        // Try Movie first
        let tmdbRes = await httpsGet(`https://api.themoviedb.org/3/movie/${rawId}?api_key=${TMDB_API_KEY}`);
        if (!tmdbRes || tmdbRes.status_code || !tmdbRes.title) {
          // Try TV show
          tmdbRes = await httpsGet(`https://api.themoviedb.org/3/tv/${rawId}?api_key=${TMDB_API_KEY}`);
        }

        if (tmdbRes && (tmdbRes.title || tmdbRes.name)) {
          foundData = {
            title: tmdbRes.title || tmdbRes.name,
            overview: tmdbRes.overview,
            backdrop_path: normalizeImageUrl(tmdbRes.backdrop_path, 'w1280'),
            poster_path: normalizeImageUrl(tmdbRes.poster_path, 'w780'),
            release_date: tmdbRes.release_date || tmdbRes.first_air_date,
            type: tmdbRes.name ? 'tv' : 'movie'
          };
        }
      }

      // 2. Check if IMDb ID (e.g. imdb_tt1375666 or tt1375666)
      if (!foundData && (contentId.startsWith('imdb_') || /^tt\d+$/i.test(contentId))) {
        const rawId = contentId.replace('imdb_', '');
        const findRes = await httpsGet(`https://api.themoviedb.org/3/find/${rawId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`);
        const item = findRes?.movie_results?.[0] || findRes?.tv_results?.[0];
        if (item) {
          foundData = {
            title: item.title || item.name,
            overview: item.overview,
            backdrop_path: normalizeImageUrl(item.backdrop_path, 'w1280'),
            poster_path: normalizeImageUrl(item.poster_path, 'w780'),
            release_date: item.release_date || item.first_air_date,
            type: item.name ? 'tv' : 'movie'
          };
        }
      }

      // 3. Check Firestore content collection directly
      if (!foundData) {
        const firebaseUrl = `https://firestore.googleapis.com/v1/projects/my-donkey-ott/databases/(default)/documents/content/${encodeURIComponent(contentId)}`;
        const fbRes = await httpsGet(firebaseUrl);
        if (fbRes && fbRes.fields) {
          const f = fbRes.fields;
          foundData = {
            title: f.title?.stringValue,
            overview: f.overview?.stringValue,
            backdrop_path: normalizeImageUrl(f.backdrop_path?.stringValue, 'w1280'),
            poster_path: normalizeImageUrl(f.poster_path?.stringValue, 'w780'),
            release_date: f.release_date?.stringValue || (f.year?.integerValue ? String(f.year.integerValue) : ''),
            type: f.type?.stringValue || 'movie'
          };
        }
      }

      // 4. Fallback check: Firestore catalogs/global
      if (!foundData) {
        const catalogUrl = `https://firestore.googleapis.com/v1/projects/my-donkey-ott/databases/(default)/documents/catalogs/global`;
        const catRes = await httpsGet(catalogUrl);
        const items = catRes?.fields?.items?.arrayValue?.values || [];
        for (const it of items) {
          const m = it.mapValue?.fields;
          if (m && m.id?.stringValue === contentId) {
            foundData = {
              title: m.title?.stringValue,
              overview: m.overview?.stringValue,
              backdrop_path: normalizeImageUrl(m.backdrop_path?.stringValue, 'w1280'),
              poster_path: normalizeImageUrl(m.poster_path?.stringValue, 'w780'),
              release_date: m.release_date?.stringValue,
              type: m.type?.stringValue || 'movie'
            };
            break;
          }
        }
      }

      // If data was resolved, build rich preview parameters
      if (foundData && foundData.title) {
        isVideo = true;
        const year = foundData.release_date ? foundData.release_date.split('-')[0] : '';
        const mediaLabel = foundData.type === 'tv' ? 'TV Series' : 'Movie';
        title = `Watch ${foundData.title} ${year ? `(${year}) ` : ''}Online Free | My Donkey`;

        if (foundData.overview) {
          description = foundData.overview.length > 200
            ? foundData.overview.substring(0, 200) + '...'
            : foundData.overview;
        } else {
          description = `Stream ${foundData.title} in HD for free on My Donkey. Watch full ${mediaLabel} with zero ads and authentic audio.`;
        }

        // Prefer 16:9 backdrop for wide chat preview card, fallback to poster
        if (foundData.backdrop_path) {
          image = foundData.backdrop_path;
        } else if (foundData.poster_path) {
          image = foundData.poster_path;
        }

        if (foundData.poster_path) {
          posterImage = foundData.poster_path;
        }
      }
    } catch {
      // Keep defaults on any error
    }
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safe(title)}</title>
  <meta name="description" content="${safe(description)}" />

  <!-- Open Graph / WhatsApp / Facebook / Telegram / Discord / Messenger -->
  <meta property="og:site_name" content="My Donkey" />
  <meta property="og:type" content="${isVideo ? 'video.movie' : 'website'}" />
  <meta property="og:title" content="${safe(title)}" />
  <meta property="og:description" content="${safe(description)}" />
  <meta property="og:url" content="${safe(targetAppUrl)}" />

  <!-- High Quality Thumbnail for Chatbox Previews (WhatsApp, Telegram, Discord, iMessage) -->
  <meta property="og:image" content="${safe(image)}" />
  <meta property="og:image:secure_url" content="${safe(image)}" />
  <meta property="og:image:type" content="image/jpeg" />
  <meta property="og:image:width" content="1280" />
  <meta property="og:image:height" content="720" />
  <meta property="og:image:alt" content="${safe(title)}" />
  <link rel="image_src" href="${safe(image)}" />
${posterImage && posterImage !== image ? `
  <meta property="og:image" content="${safe(posterImage)}" />
  <meta property="og:image:secure_url" content="${safe(posterImage)}" />
  <meta property="og:image:type" content="image/jpeg" />
  <meta property="og:image:width" content="780" />
  <meta property="og:image:height" content="1170" />
` : ''}

  <!-- Twitter / X Cards -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@mydonkey" />
  <meta name="twitter:title" content="${safe(title)}" />
  <meta name="twitter:description" content="${safe(description)}" />
  <meta name="twitter:image" content="${safe(image)}" />
  <meta name="twitter:image:alt" content="${safe(title)}" />

  <!-- Schema.org Structured Data -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "${isVideo ? 'Movie' : 'WebPage'}",
    "name": "${safe(title)}",
    "image": "${safe(image)}",
    "description": "${safe(description)}",
    "url": "${safe(targetAppUrl)}"
  }
  </script>

  <!-- Redirect non-bot visitors directly to the SPA app -->
  <script>
    if (!/bot|crawler|spider|facebook|whatsapp|telegram|discord|slack|preview|twitter|applebot|bingbot|googlebot/i.test(navigator.userAgent)) {
      window.location.replace("${safe(targetAppUrl)}");
    }
  </script>
  <noscript><meta http-equiv="refresh" content="0; url=${safe(targetAppUrl)}" /></noscript>
</head>
<body style="background:#0a0a0a;color:#fff;font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px;box-sizing:border-box;text-align:center;">
  <div style="max-width:440px;background:#141414;border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:24px;box-shadow:0 12px 36px rgba(0,0,0,0.8);">
    <img src="${safe(image)}" alt="${safe(title)}" style="width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:12px;margin-bottom:16px;" />
    <h2 style="margin:0 0 10px 0;font-size:20px;font-weight:bold;line-height:1.3;">${safe(title)}</h2>
    <p style="color:#aaa;font-size:13px;line-height:1.5;margin:0 0 20px 0;">${safe(description)}</p>
    <a href="${safe(targetAppUrl)}" style="display:block;background:#e50914;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold;font-size:15px;box-shadow:0 4px 14px rgba(229,9,20,0.4);">Watch Free on My Donkey</a>
  </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=3600');
  res.status(200).send(html);
}
