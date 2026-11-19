import https from 'https';

const TMDB_API_KEY = process.env.VITE_TMDB_API_KEY || '5d44293e1177a6fb42010456a8c6b4ff';

function httpsGet(url) {
  return new Promise((resolve) => {
    const req = https.get(url, { headers: { 'User-Agent': 'MyDonkey-SEO/2.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(4500, () => {
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

// In-memory catalog cache for high performance serverless execution
let cachedCatalog = null;
let catalogCacheTime = 0;

async function getGlobalCatalog() {
  const now = Date.now();
  if (cachedCatalog && now - catalogCacheTime < 300000) { // 5-minute cache
    return cachedCatalog;
  }
  try {
    const catalogUrl = `https://firestore.googleapis.com/v1/projects/my-donkey-ott/databases/(default)/documents/catalogs/global`;
    const catRes = await httpsGet(catalogUrl);
    const items = (catRes?.fields?.items?.arrayValue?.values || []).map(it => {
      const m = it.mapValue?.fields || {};
      return {
        id: m.id?.stringValue || '',
        title: m.title?.stringValue || '',
        overview: m.overview?.stringValue || '',
        backdrop_path: normalizeImageUrl(m.backdrop_path?.stringValue, 'w1280'),
        poster_path: normalizeImageUrl(m.poster_path?.stringValue, 'w500'),
        release_date: m.release_date?.stringValue || '',
        year: m.year?.integerValue || (m.release_date?.stringValue ? m.release_date.stringValue.split('-')[0] : ''),
        type: m.type?.stringValue || 'movie',
        genres: (m.genres?.arrayValue?.values || []).map(g => g.stringValue).filter(Boolean),
        isPublished: m.isPublished?.booleanValue !== false
      };
    }).filter(item => item.id && item.title && item.isPublished);

    if (items.length > 0) {
      cachedCatalog = items;
      catalogCacheTime = now;
    }
    return cachedCatalog || [];
  } catch {
    return cachedCatalog || [];
  }
}

export default async function handler(req, res) {
  const urlPath = req.url || '';
  let contentId = req.query?.id || null;
  let pageType = (req.query?.type || '').toLowerCase();

  const host = req.headers?.['x-forwarded-host'] || req.headers?.host || 'www.mydonkey.in';
  const protocol = req.headers?.['x-forwarded-proto'] || 'https';
  const baseUrl = `${protocol}://${host}`;

  // Parse path for /browse/:id or /watch/:id
  if (!contentId && !pageType) {
    const matchBrowse = urlPath.match(/\/(browse|watch)\/([^\/?#]+)/i);
    if (matchBrowse) {
      pageType = matchBrowse[1].toLowerCase();
      contentId = decodeURIComponent(matchBrowse[2]);
    } else {
      const matchHub = urlPath.match(/\/(movies|tv|anime|categories|exclusive)/i);
      if (matchHub) {
        pageType = matchHub[1].toLowerCase();
      }
    }
  }

  // Load catalog for hubs and related links
  const catalog = await getGlobalCatalog();

  // -------------------------------------------------------------------------
  // 1. HUB PAGES: /movies, /tv, /anime, /categories, /exclusive
  // -------------------------------------------------------------------------
  if (!contentId && ['movies', 'tv', 'anime', 'categories', 'exclusive'].includes(pageType)) {
    let hubTitle = 'Watch Free Movies Online in HD | My Donkey';
    let hubDescription = 'Stream unlimited free movies in HD with authentic audio and zero fees on My Donkey.';
    let hubHeading = 'Free Movies Online in HD';
    let canonicalUrl = `${baseUrl}/${pageType}`;
    let filteredItems = [];

    if (pageType === 'movies') {
      hubTitle = 'Watch Free Movies Online in HD | Bollywood & Hollywood Hits - My Donkey';
      hubDescription = 'Stream the latest Bollywood movies, Hollywood blockbusters, action, romance, comedy, and thrillers in HD for free on My Donkey. No subscription required.';
      hubHeading = 'Watch Free Movies Online';
      filteredItems = catalog.filter(i => i.type === 'movie');
    } else if (pageType === 'tv') {
      hubTitle = 'Watch Free TV Shows & Web Series Online in HD - My Donkey';
      hubDescription = 'Binge watch full seasons, latest episodes, and trending web series online for free in HD on My Donkey. Fast bufferless streaming.';
      hubHeading = 'Watch Free TV Shows & Web Series';
      filteredItems = catalog.filter(i => i.type === 'tv');
    } else if (pageType === 'anime') {
      hubTitle = 'Watch Free Anime Online in HD | English Sub & Dub - My Donkey';
      hubDescription = 'Stream top anime series, movies, and episodes in HD with English subtitles and dubbing on My Donkey. Unlimited free streaming.';
      hubHeading = 'Watch Free Anime in HD';
      filteredItems = catalog.filter(i => {
        const text = `${i.title} ${i.overview} ${i.genres.join(' ')}`.toLowerCase();
        return text.includes('anime') || text.includes('animation') || text.includes('manga');
      });
      if (filteredItems.length === 0) filteredItems = catalog.slice(0, 30);
    } else if (pageType === 'categories') {
      hubTitle = 'Browse Movies & TV Shows by Category & Genre | My Donkey';
      hubDescription = 'Explore movies and TV series by genre: Action, Comedy, Drama, Horror, Romance, Sci-Fi, Thriller, and Family on My Donkey.';
      hubHeading = 'Browse Movies & TV Shows by Category';
      filteredItems = catalog.slice(0, 60);
    } else if (pageType === 'exclusive') {
      hubTitle = 'My Donkey Originals & Exclusive Movies - Watch Free in HD';
      hubDescription = 'Watch exclusive releases, original movies, and premium HD content for free on My Donkey.';
      hubHeading = 'My Donkey Originals & Exclusives';
      filteredItems = catalog.slice(0, 40);
    }

    if (filteredItems.length === 0) filteredItems = catalog.slice(0, 40);
    const displayItems = filteredItems.slice(0, 48);

    const itemListJsonLd = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": hubHeading,
      "description": hubDescription,
      "url": canonicalUrl,
      "numberOfItems": displayItems.length,
      "itemListElement": displayItems.map((item, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "url": `${baseUrl}/browse/${item.id}`,
        "name": item.title,
        "image": item.poster_path || item.backdrop_path || undefined
      }))
    };

    const breadcrumbJsonLd = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": baseUrl },
        { "@type": "ListItem", "position": 2, "name": hubHeading, "item": canonicalUrl }
      ]
    };

    const hubHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safe(hubTitle)}</title>
  <meta name="description" content="${safe(hubDescription)}" />
  <link rel="canonical" href="${safe(canonicalUrl)}" />

  <meta property="og:site_name" content="My Donkey" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${safe(hubTitle)}" />
  <meta property="og:description" content="${safe(hubDescription)}" />
  <meta property="og:url" content="${safe(canonicalUrl)}" />
  <meta property="og:image" content="https://res.cloudinary.com/dpba1gvra/image/upload/v1770155013/logo_mgcysp.png" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${safe(hubTitle)}" />
  <meta name="twitter:description" content="${safe(hubDescription)}" />
  <meta name="twitter:image" content="https://res.cloudinary.com/dpba1gvra/image/upload/v1770155013/logo_mgcysp.png" />

  <script type="application/ld+json">${JSON.stringify(itemListJsonLd)}</script>
  <script type="application/ld+json">${JSON.stringify(breadcrumbJsonLd)}</script>

  <script>
    const isBot = /bot|crawler|spider|facebookexternalhit|Facebot|TelegramBot|Twitterbot|Slackbot|Discordbot|preview|applebot|bingbot|googlebot/i.test(navigator.userAgent);
    if (!isBot) {
      window.location.replace("${safe(canonicalUrl)}");
    }
  </script>
  <style>
    body { background: #0a0a0b; color: #fff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 0; line-height: 1.5; }
    header { background: #141416; border-bottom: 1px solid rgba(255,255,255,0.08); padding: 16px 24px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
    .logo { font-size: 20px; font-weight: 800; color: #ef4444; text-decoration: none; display: flex; align-items: center; gap: 8px; }
    nav a { color: #d1d5db; text-decoration: none; margin-left: 18px; font-weight: 500; font-size: 14px; }
    nav a:hover, nav a.active { color: #fff; border-bottom: 2px solid #ef4444; padding-bottom: 4px; }
    main { max-width: 1200px; margin: 0 auto; padding: 32px 20px; }
    h1 { font-size: 28px; font-weight: 800; margin: 0 0 10px 0; }
    p.lead { color: #9ca3af; font-size: 15px; margin: 0 0 28px 0; max-width: 800px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 20px; }
    .card { background: #18181b; border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; text-decoration: none; color: inherit; transition: transform 0.2s ease; }
    .card:hover { transform: translateY(-4px); }
    .poster { width: 100%; aspect-ratio: 2/3; object-fit: cover; background: #27272a; }
    .info { padding: 12px; display: flex; flex-direction: column; gap: 4px; flex: 1; }
    .title { font-weight: 700; font-size: 14px; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .meta { font-size: 12px; color: #9ca3af; display: flex; justify-content: space-between; }
    footer { border-top: 1px solid rgba(255,255,255,0.08); background: #111113; padding: 32px 20px; text-align: center; color: #6b7280; font-size: 13px; margin-top: 60px; }
    footer a { color: #9ca3af; text-decoration: none; margin: 0 10px; }
  </style>
</head>
<body>
  <header>
    <a href="${baseUrl}/" class="logo">My Donkey</a>
    <nav>
      <a href="${baseUrl}/">Home</a>
      <a href="${baseUrl}/movies" class="${pageType === 'movies' ? 'active' : ''}">Movies</a>
      <a href="${baseUrl}/tv" class="${pageType === 'tv' ? 'active' : ''}">TV Shows</a>
      <a href="${baseUrl}/anime" class="${pageType === 'anime' ? 'active' : ''}">Anime</a>
      <a href="${baseUrl}/categories" class="${pageType === 'categories' ? 'active' : ''}">Categories</a>
      <a href="${baseUrl}/theatre">3D Theatre</a>
    </nav>
  </header>

  <main>
    <h1>${safe(hubHeading)}</h1>
    <p class="lead">${safe(hubDescription)}</p>

    <div class="grid">
      ${displayItems.map(item => `
        <a href="${baseUrl}/browse/${safe(item.id)}" class="card">
          <img src="${safe(item.poster_path || item.backdrop_path || 'https://res.cloudinary.com/dpba1gvra/image/upload/v1770155013/logo_mgcysp.png')}" alt="${safe(item.title)}" class="poster" loading="lazy" />
          <div class="info">
            <span class="title">${safe(item.title)}</span>
            <div class="meta">
              <span>${safe(item.year || 'HD')}</span>
              <span>${safe(item.type === 'tv' ? 'Series' : 'Movie')}</span>
            </div>
          </div>
        </a>
      `).join('')}
    </div>
  </main>

  <footer>
    <p>Stream free movies, series, and anime online in HD on My Donkey.</p>
    <div>
      <a href="${baseUrl}/">Home</a>
      <a href="${baseUrl}/movies">Movies</a>
      <a href="${baseUrl}/tv">TV Shows</a>
      <a href="${baseUrl}/anime">Anime</a>
      <a href="${baseUrl}/categories">Categories</a>
      <a href="${baseUrl}/exclusive">Exclusives</a>
      <a href="${baseUrl}/theatre">3D Cinema</a>
      <a href="${baseUrl}/support">Support</a>
      <a href="${baseUrl}/contact">Contact</a>
    </div>
    <p style="margin-top:16px;">&copy; ${new Date().getFullYear()} My Donkey. All rights reserved.</p>
  </footer>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=3600');
    return res.status(200).send(hubHtml);
  }

  // -------------------------------------------------------------------------
  // 2. MOVIE / TV SHOW DETAIL PAGE: /browse/:id or /watch/:id
  // -------------------------------------------------------------------------
  if (!pageType || pageType === '$1' || (pageType !== 'browse' && pageType !== 'watch')) {
    pageType = 'browse';
  }
  const targetAppUrl = `${baseUrl}/${pageType}/${contentId || ''}`;
  const canonicalUrl = `${baseUrl}/browse/${contentId || ''}`;

  let title = 'My Donkey | Watch Free Movies, TV Shows & Anime Online in HD';
  let description = 'Stream unlimited movies, web series, anime, and Marvel movies in HD on My Donkey with authentic audio and zero subscription fees.';
  let image = 'https://res.cloudinary.com/dpba1gvra/image/upload/v1770155013/logo_mgcysp.png';
  let posterImage = null;
  let isVideo = false;
  let year = '';
  let mediaLabel = 'Movie';
  let genres = [];

  if (contentId) {
    try {
      let foundData = null;

      // 1. Check if TMDB direct ID
      const isTmdbPrefix = typeof contentId === 'string' && contentId.startsWith('tmdb_');
      const isNumeric = /^\d+$/.test(contentId);
      if (isTmdbPrefix || isNumeric) {
        const rawId = isTmdbPrefix ? contentId.replace('tmdb_', '') : contentId;
        let tmdbRes = await httpsGet(`https://api.themoviedb.org/3/movie/${rawId}?api_key=${TMDB_API_KEY}`);
        if (!tmdbRes || tmdbRes.status_code || !tmdbRes.title) {
          tmdbRes = await httpsGet(`https://api.themoviedb.org/3/tv/${rawId}?api_key=${TMDB_API_KEY}`);
        }
        if (tmdbRes && (tmdbRes.title || tmdbRes.name)) {
          foundData = {
            title: tmdbRes.title || tmdbRes.name,
            overview: tmdbRes.overview,
            backdrop_path: normalizeImageUrl(tmdbRes.backdrop_path, 'w1280'),
            poster_path: normalizeImageUrl(tmdbRes.poster_path, 'w780'),
            release_date: tmdbRes.release_date || tmdbRes.first_air_date,
            type: tmdbRes.name ? 'tv' : 'movie',
            genres: (tmdbRes.genres || []).map(g => g.name).filter(Boolean)
          };
        }
      }

      // 2. Check if IMDb ID
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
            type: item.name ? 'tv' : 'movie',
            genres: []
          };
        }
      }

      // 3. Check in cached global catalog
      if (!foundData) {
        const catMatch = catalog.find(i => i.id === contentId);
        if (catMatch) {
          foundData = {
            title: catMatch.title,
            overview: catMatch.overview,
            backdrop_path: catMatch.backdrop_path,
            poster_path: catMatch.poster_path,
            release_date: catMatch.release_date,
            year: catMatch.year,
            type: catMatch.type,
            genres: catMatch.genres
          };
        }
      }

      // 4. Fallback check: Firestore content collection directly
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
            type: f.type?.stringValue || 'movie',
            genres: (f.genres?.arrayValue?.values || []).map(g => g.stringValue).filter(Boolean)
          };
        }
      }

      if (foundData && foundData.title) {
        isVideo = true;
        year = foundData.year || (foundData.release_date ? foundData.release_date.split('-')[0] : '');
        mediaLabel = foundData.type === 'tv' ? 'TV Series' : 'Movie';
        genres = foundData.genres || [];
        title = `Watch ${foundData.title} ${year ? `(${year}) ` : ''}Online Free in HD | My Donkey`;

        if (foundData.overview) {
          description = foundData.overview.length > 220
            ? foundData.overview.substring(0, 220) + '...'
            : foundData.overview;
        } else {
          description = `Stream ${foundData.title} in HD for free on My Donkey. Watch full ${mediaLabel} with authentic audio and zero subscription.`;
        }

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

  // Get related titles from catalog so Googlebot can crawl the entire graph
  const relatedItems = catalog
    .filter(i => i.id !== contentId)
    .slice(0, 8);

  const detailBreadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": baseUrl },
      { "@type": "ListItem", "position": 2, "name": mediaLabel === 'TV Series' ? 'TV Shows' : 'Movies', "item": `${baseUrl}/${mediaLabel === 'TV Series' ? 'tv' : 'movies'}` },
      { "@type": "ListItem", "position": 3, "name": title, "item": canonicalUrl }
    ]
  };

  const videoJsonLd = {
    "@context": "https://schema.org",
    "@type": isVideo ? (mediaLabel === 'TV Series' ? 'TVSeries' : 'Movie') : 'WebPage',
    "name": title,
    "image": image,
    "description": description,
    "url": canonicalUrl,
    "genre": genres.length > 0 ? genres : ["Action", "Drama", "Entertainment"],
    "inLanguage": "Hindi, English",
    "isFamilyFriendly": true
  };

  const detailHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safe(title)}</title>
  <meta name="description" content="${safe(description)}" />
  <link rel="canonical" href="${safe(canonicalUrl)}" />

  <meta property="og:site_name" content="My Donkey" />
  <meta property="og:type" content="${isVideo ? 'video.movie' : 'website'}" />
  <meta property="og:title" content="${safe(title)}" />
  <meta property="og:description" content="${safe(description)}" />
  <meta property="og:url" content="${safe(canonicalUrl)}" />
  <meta property="og:image" content="${safe(image)}" />
  <meta property="og:image:secure_url" content="${safe(image)}" />
  <meta property="og:image:width" content="1280" />
  <meta property="og:image:height" content="720" />
  <meta property="og:image:alt" content="${safe(title)}" />
  <link rel="image_src" href="${safe(image)}" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${safe(title)}" />
  <meta name="twitter:description" content="${safe(description)}" />
  <meta name="twitter:image" content="${safe(image)}" />

  <script type="application/ld+json">${JSON.stringify(videoJsonLd)}</script>
  <script type="application/ld+json">${JSON.stringify(detailBreadcrumbJsonLd)}</script>

  <script>
    const isBot = /bot|crawler|spider|facebookexternalhit|Facebot|TelegramBot|Twitterbot|Slackbot|Discordbot|preview|applebot|bingbot|googlebot/i.test(navigator.userAgent);
    if (!isBot) {
      window.location.replace("${safe(targetAppUrl)}");
    }
  </script>
  <style>
    body { background: #0a0a0b; color: #fff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 0; line-height: 1.5; }
    header { background: #141416; border-bottom: 1px solid rgba(255,255,255,0.08); padding: 16px 24px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
    .logo { font-size: 20px; font-weight: 800; color: #ef4444; text-decoration: none; }
    nav a { color: #d1d5db; text-decoration: none; margin-left: 18px; font-weight: 500; font-size: 14px; }
    nav a:hover { color: #fff; }
    .breadcrumbs { font-size: 13px; color: #9ca3af; margin-bottom: 20px; }
    .breadcrumbs a { color: #ef4444; text-decoration: none; }
    main { max-width: 1100px; margin: 0 auto; padding: 28px 20px; }
    .hero { display: flex; gap: 28px; background: #141417; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 24px; box-shadow: 0 12px 36px rgba(0,0,0,0.6); flex-wrap: wrap; }
    .poster-box { width: 280px; flex-shrink: 0; }
    .poster-img { width: 100%; border-radius: 12px; aspect-ratio: 2/3; object-fit: cover; }
    .details { flex: 1; min-width: 280px; display: flex; flex-direction: column; justify-content: center; }
    h1 { font-size: 26px; font-weight: 800; margin: 0 0 12px 0; }
    .tags { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }
    .tag { background: rgba(239,68,68,0.15); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); border-radius: 6px; padding: 3px 10px; font-size: 12px; font-weight: 600; }
    .desc { color: #d1d5db; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0; }
    .play-btn { display: inline-block; background: #ef4444; color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 700; font-size: 16px; text-align: center; box-shadow: 0 4px 16px rgba(239,68,68,0.4); }
    .section-title { font-size: 20px; font-weight: 700; margin: 40px 0 16px 0; }
    .related-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 16px; }
    .related-card { background: #18181b; border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; overflow: hidden; text-decoration: none; color: inherit; }
    .related-poster { width: 100%; aspect-ratio: 2/3; object-fit: cover; }
    .related-title { padding: 8px; font-size: 12px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }
    footer { border-top: 1px solid rgba(255,255,255,0.08); background: #111113; padding: 32px 20px; text-align: center; color: #6b7280; font-size: 13px; margin-top: 60px; }
    footer a { color: #9ca3af; text-decoration: none; margin: 0 10px; }
  </style>
</head>
<body>
  <header>
    <a href="${baseUrl}/" class="logo">My Donkey</a>
    <nav>
      <a href="${baseUrl}/">Home</a>
      <a href="${baseUrl}/movies">Movies</a>
      <a href="${baseUrl}/tv">TV Shows</a>
      <a href="${baseUrl}/anime">Anime</a>
      <a href="${baseUrl}/categories">Categories</a>
      <a href="${baseUrl}/theatre">3D Cinema</a>
    </nav>
  </header>

  <main>
    <div class="breadcrumbs">
      <a href="${baseUrl}/">Home</a> &rsaquo;
      <a href="${baseUrl}/${mediaLabel === 'TV Series' ? 'tv' : 'movies'}">${mediaLabel === 'TV Series' ? 'TV Shows' : 'Movies'}</a> &rsaquo;
      <span>${safe(title)}</span>
    </div>

    <div class="hero">
      <div class="poster-box">
        <img src="${safe(posterImage || image)}" alt="${safe(title)}" class="poster-img" />
      </div>
      <div class="details">
        <h1>${safe(title)}</h1>
        <div class="tags">
          ${year ? `<span class="tag">${safe(year)}</span>` : ''}
          <span class="tag">${safe(mediaLabel)}</span>
          <span class="tag">Free in HD</span>
          ${genres.slice(0, 3).map(g => `<span class="tag">${safe(g)}</span>`).join('')}
        </div>
        <p class="desc">${safe(description)}</p>
        <div>
          <a href="${safe(targetAppUrl)}" class="play-btn">&#9658; Watch Free on My Donkey</a>
        </div>
      </div>
    </div>

    ${relatedItems.length > 0 ? `
      <div class="section-title">More Trending Movies & Shows</div>
      <div class="related-grid">
        ${relatedItems.map(item => `
          <a href="${baseUrl}/browse/${safe(item.id)}" class="related-card">
            <img src="${safe(item.poster_path || item.backdrop_path || image)}" alt="${safe(item.title)}" class="related-poster" loading="lazy" />
            <span class="related-title">${safe(item.title)}</span>
          </a>
        `).join('')}
      </div>
    ` : ''}
  </main>

  <footer>
    <p>Stream free movies, series, and anime online in HD on My Donkey.</p>
    <div>
      <a href="${baseUrl}/">Home</a>
      <a href="${baseUrl}/movies">Movies</a>
      <a href="${baseUrl}/tv">TV Shows</a>
      <a href="${baseUrl}/anime">Anime</a>
      <a href="${baseUrl}/categories">Categories</a>
      <a href="${baseUrl}/exclusive">Exclusives</a>
      <a href="${baseUrl}/theatre">3D Cinema</a>
      <a href="${baseUrl}/support">Support</a>
      <a href="${baseUrl}/contact">Contact</a>
    </div>
    <p style="margin-top:16px;">&copy; ${new Date().getFullYear()} My Donkey. All rights reserved.</p>
  </footer>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=3600');
  res.status(200).send(detailHtml);
}
