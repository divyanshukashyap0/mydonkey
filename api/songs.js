// Vercel Serverless Function — YouTube Songs Proxy
// Route: GET /api/songs?movie=<movieName>&type=<movie|tv>
// API key is server-side ONLY — never exposed to client.

const https = require('https');

// ------- helpers -------

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve(null); }
      });
    }).on('error', reject);
  });
}

// Simple in-memory dedup lock (per function instance, guards concurrent identical requests)
const inflightRequests = new Map();

// ------- Firestore REST helpers -------
// Project ID from the existing Firestore instance used across the app
const PROJECT_ID = 'my-donkey-ott';
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

async function firestoreGet(collection, docId) {
  const url = `${FIRESTORE_BASE}/${collection}/${encodeURIComponent(docId)}`;
  const data = await httpsGet(url);
  if (!data || data.error) return null;
  return data;
}

async function firestoreSet(collection, docId, fields) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      fields: Object.fromEntries(
        Object.entries(fields).map(([k, v]) => {
          if (typeof v === 'string') return [k, { stringValue: v }];
          if (typeof v === 'number') return [k, { integerValue: v }];
          if (Array.isArray(v)) return [k, { arrayValue: { values: v.map(item =>
            typeof item === 'object'
              ? { mapValue: { fields: Object.fromEntries(Object.entries(item).map(([ik, iv]) => [ik, { stringValue: String(iv ?? '') }])) } }
              : { stringValue: String(item) }
          ) } }];
          return [k, { stringValue: String(v) }];
        })
      )
    });

    const urlObj = new URL(`${FIRESTORE_BASE}/${collection}/${encodeURIComponent(docId)}`);
    const options = {
      hostname: urlObj.hostname,
      path: `${urlObj.pathname}?updateMask.fieldPaths=movieName&updateMask.fieldPaths=slug&updateMask.fieldPaths=results&updateMask.fieldPaths=lastFetched&updateMask.fieldPaths=cacheExpiry&currentDocument.exists=false`,
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    };

    // Use PATCH (create or update) without conditional
    const patchUrl = `${FIRESTORE_BASE}/${collection}/${encodeURIComponent(docId)}`;
    const patchUrlObj = new URL(patchUrl);
    const patchOptions = {
      hostname: patchUrlObj.hostname,
      path: patchUrlObj.pathname,
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    };

    const req = https.request(patchOptions, (res) => {
      let d = '';
      res.on('data', c => { d += c; });
      res.on('end', () => resolve(d));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function parseFirestoreDoc(doc) {
  if (!doc || !doc.fields) return null;
  const f = doc.fields;
  return {
    movieName: f.movieName?.stringValue || '',
    slug: f.slug?.stringValue || '',
    results: (f.results?.arrayValue?.values || []).map(v => {
      const m = v.mapValue?.fields || {};
      return {
        videoId: m.videoId?.stringValue || '',
        title: m.title?.stringValue || '',
        thumbnail: m.thumbnail?.stringValue || '',
        channelTitle: m.channelTitle?.stringValue || '',
      };
    }),
    lastFetched: f.lastFetched?.stringValue || '',
    cacheExpiry: f.cacheExpiry?.stringValue || '',
  };
}

// ------- YouTube Search -------
const CACHE_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

async function searchYouTube(apiKey, query) {
  const params = new URLSearchParams({
    part: 'snippet',
    q: query,
    type: 'video',
    videoDuration: 'medium',
    videoEmbeddable: 'true',
    safeSearch: 'strict',
    regionCode: 'IN',
    maxResults: '15',
    key: apiKey,
  });
  const url = `https://www.googleapis.com/youtube/v3/search?${params}`;
  return httpsGet(url);
}

function mapYouTubeItems(items = []) {
  return items
    .filter(item => item.id?.videoId)
    .map(item => ({
      videoId: item.id.videoId,
      title: item.snippet?.title || '',
      thumbnail:
        item.snippet?.thumbnails?.maxres?.url ||
        item.snippet?.thumbnails?.high?.url ||
        item.snippet?.thumbnails?.medium?.url ||
        `https://i.ytimg.com/vi/${item.id.videoId}/hqdefault.jpg`,
      channelTitle: item.snippet?.channelTitle || '',
    }));
}

// ------- Rate Guard (Firestore-based daily counter) -------
const DAILY_LIMIT = 90; // max unique movie YouTube API calls per calendar day

async function checkAndIncrementQuotaGuard() {
  const today = new Date().toISOString().split('T')[0];
  const docId = `quota_${today}`;
  const doc = await firestoreGet('youtube_quota_guard', docId);
  const current = doc?.fields?.count?.integerValue ? parseInt(doc.fields.count.integerValue, 10) : 0;
  if (current >= DAILY_LIMIT) return false;

  // Increment
  const body = JSON.stringify({ fields: { count: { integerValue: current + 1 }, date: { stringValue: today } } });
  await new Promise((resolve, reject) => {
    const urlObj = new URL(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/youtube_quota_guard/${docId}`);
    const req = https.request({ hostname: urlObj.hostname, path: urlObj.pathname, method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } }, res => { res.resume(); res.on('end', resolve); });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
  return true;
}

// ------- Main Handler -------
module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'GET') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { movie, type = 'movie' } = req.query || {};
  if (!movie || !movie.trim()) {
    return res.status(400).json({ error: 'Missing movie query param' });
  }

  const movieName = movie.trim();
  const slug = slugify(movieName);
  const apiKey = process.env.YOUTUBE_API_KEY;

  // 1. Check Firestore cache first
  try {
    const cachedDoc = await firestoreGet('youtube_songs_cache', slug);
    const cached = parseFirestoreDoc(cachedDoc);

    if (cached && cached.results.length > 0 && cached.cacheExpiry) {
      const expiry = new Date(cached.cacheExpiry);
      if (expiry > new Date()) {
        return res.status(200).json({
          movieName: cached.movieName,
          results: cached.results,
          source: 'cache',
          cachedAt: cached.lastFetched,
        });
      }
    }
  } catch (e) {
    // Cache miss or Firestore error — fall through to YouTube API
  }

  // 2. If no API key, return fallback indicator
  if (!apiKey || apiKey === 'YOUR_YOUTUBE_DATA_API_V3_KEY_HERE') {
    return res.status(200).json({
      movieName,
      results: [],
      source: 'no_api_key',
      fallbackQuery: `${movieName} ${type === 'tv' ? 'soundtrack' : 'official songs'}`,
    });
  }

  // 3. Dedup: prevent concurrent identical requests from hitting YouTube twice
  if (inflightRequests.has(slug)) {
    try {
      const result = await inflightRequests.get(slug);
      return res.status(200).json(result);
    } catch {
      return res.status(500).json({ error: 'Upstream fetch failed' });
    }
  }

  // 4. Check daily quota guard
  const withinQuota = await checkAndIncrementQuotaGuard().catch(() => true);
  if (!withinQuota) {
    return res.status(429).json({
      movieName,
      results: [],
      source: 'quota_exceeded',
      fallbackQuery: `${movieName} ${type === 'tv' ? 'soundtrack' : 'official songs'}`,
      quota_exceeded: true,
    });
  }

  // 5. Call YouTube API — try 3 query strategies, merge unique results
  const queryStrategies = type === 'tv'
    ? [`${movieName} official soundtrack`, `${movieName} OST songs`, `${movieName} theme song`]
    : [`${movieName} official songs`, `${movieName} jukebox full album`, `${movieName} songs`];

  let promise;
  const fetchPromise = (async () => {
    let allResults = [];
    const seenIds = new Set();

    for (const query of queryStrategies) {
      try {
        const data = await searchYouTube(apiKey, query);
        if (data?.error?.code === 403 || data?.error?.status === 'RESOURCE_EXHAUSTED') {
          // YouTube quota hard exceeded
          return {
            movieName,
            results: [],
            source: 'quota_exceeded',
            fallbackQuery: `${movieName} ${type === 'tv' ? 'soundtrack' : 'official songs'}`,
            quota_exceeded: true,
          };
        }
        const items = mapYouTubeItems(data?.items || []);
        for (const item of items) {
          if (!seenIds.has(item.videoId)) {
            seenIds.add(item.videoId);
            allResults.push(item);
          }
        }
        if (allResults.length >= 15) break; // enough results, save quota
      } catch {
        // strategy failed, try next
      }
    }

    const now = new Date();
    const expiry = new Date(now.getTime() + CACHE_TTL_MS);
    const response = {
      movieName,
      results: allResults.slice(0, 20),
      source: 'youtube',
      cachedAt: now.toISOString(),
    };

    // 6. Write to Firestore cache (non-blocking)
    firestoreSet('youtube_songs_cache', slug, {
      movieName,
      slug,
      results: response.results,
      lastFetched: now.toISOString(),
      cacheExpiry: expiry.toISOString(),
    }).catch(() => {/* fire and forget */});

    return response;
  })();

  inflightRequests.set(slug, fetchPromise);
  fetchPromise.finally(() => inflightRequests.delete(slug));

  try {
    const result = await fetchPromise;
    if (result.quota_exceeded) {
      return res.status(429).json(result);
    }
    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json({ error: 'Failed to fetch songs', message: e.message });
  }
};
