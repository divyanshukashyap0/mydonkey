/**
 * api/tmdb.js
 * Server-side proxy for TMDB API calls.
 * Bypasses client-side network blocks and CORS issues.
 * Includes IPv4 forcing, browser headers, dual-domain fallback, and in-memory TTL caching.
 */
import https from 'https';

// In-memory cache for repeated queries (e.g. discover, trailers, popular)
// Attached to globalThis so it persists across Vite dev dynamic re-imports
const cache = globalThis.__tmdb_cache || (globalThis.__tmdb_cache = new Map());
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function getCached(key) {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() - item.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return item.data;
}

function setCache(key, data) {
  if (cache.size > 500) {
    // Evict first 100 oldest entries if cache grows large
    const keys = Array.from(cache.keys()).slice(0, 100);
    keys.forEach(k => cache.delete(k));
  }
  cache.set(key, { timestamp: Date.now(), data });
}

function fetchWithDomain(domain, path, searchParamsStr, timeoutMs = 4500) {
  return new Promise((resolve, reject) => {
    const url = `https://${domain}/3${path}?${searchParamsStr}`;
    const options = {
      family: 4, // Force IPv4 to bypass broken/hanging IPv6 routes on Windows/ISPs
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    };

    const req = https.get(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve({ ok: true, status: res.statusCode, json: JSON.parse(data) });
          } catch (e) {
            reject(new Error('Invalid JSON from TMDB'));
          }
        } else {
          resolve({ ok: false, status: res.statusCode, details: data });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject(new Error(`Timeout connecting to ${domain}`));
    });
  });
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { path, ...params } = req.query || {};

    if (!path) {
      return res.status(400).json({ error: 'Missing TMDB path' });
    }

    const apiKey = process.env.VITE_TMDB_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'TMDB API key not configured' });
    }

    const finalParams = { ...params, api_key: apiKey };
    const searchParams = new URLSearchParams(finalParams);
    const searchParamsStr = searchParams.toString();
    const cacheKey = `${path}?${searchParamsStr}`;

    // Return cached response if available
    const cached = getCached(cacheKey);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      return res.status(200).json(cached);
    }

    // Try api.tmdb.org first, then fallback to api.themoviedb.org
    const domains = ['api.tmdb.org', 'api.themoviedb.org'];
    let lastError = null;

    for (const domain of domains) {
      try {
        const result = await fetchWithDomain(domain, path, searchParamsStr, 4500);
        if (result.ok && result.json) {
          setCache(cacheKey, result.json);
          res.setHeader('X-Cache', 'MISS');
          return res.status(200).json(result.json);
        } else if (result.status && result.status < 500) {
          // Client error like 404 or 401: return as is
          return res.status(result.status).json({ error: 'TMDB client error', status: result.status });
        }
      } catch (err) {
        lastError = err;
      }
    }

    // If both domains failed or timed out, return a clean fallback rather than 504 to prevent client console error storms
    return res.status(200).json({
      results: [],
      page: 1,
      total_pages: 0,
      total_results: 0,
      fallback: true,
      message: lastError ? lastError.message : 'TMDB offline or unreachable'
    });
  } catch (globalError) {
    res.status(200).json({
      results: [],
      fallback: true,
      error: 'Internal proxy fallback',
      message: globalError.message
    });
  }
}
