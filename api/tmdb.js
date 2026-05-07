/**
 * api/tmdb.js
 * Server-side proxy for TMDB API calls.
 * Bypasses client-side network blocks and CORS issues.
 */
import https from 'https';

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

    // Try api.tmdb.org first as it is often more accessible in restricted networks
    const domain = 'api.tmdb.org'; 
    const finalParams = { ...params, api_key: apiKey };
    const searchParams = new URLSearchParams(finalParams);
    const url = `https://${domain}/3${path}?${searchParams.toString()}`;

    let responseSent = false;
    const sendResponse = (status, payload) => {
      if (responseSent) return;
      responseSent = true;
      res.status(status).json(payload);
    };

    console.log('[TMDB Proxy] Attempting:', url);

    return new Promise((resolve) => {
      const tmdbReq = https.get(url, (tmdbRes) => {
        let data = '';
        tmdbRes.on('data', (chunk) => { data += chunk; });
        tmdbRes.on('end', () => {
          try {
            if (tmdbRes.statusCode >= 400) {
              sendResponse(tmdbRes.statusCode, { error: 'TMDB returned error', code: tmdbRes.statusCode, details: data });
            } else {
              const json = JSON.parse(data);
              sendResponse(200, json);
            }
            resolve();
          } catch (e) {
            sendResponse(500, { error: 'Failed to parse TMDB response', details: data.substring(0, 100) });
            resolve();
          }
        });
      });

      tmdbReq.on('error', (err) => {
        console.error('[TMDB Proxy Error]:', err.message);
        sendResponse(500, { error: 'Connection failed', message: err.message, domain });
        resolve();
      });

      tmdbReq.setTimeout(8000, () => {
        tmdbReq.destroy();
        sendResponse(504, { error: 'Connection timed out', domain });
        resolve();
      });
    });
  } catch (globalError) {
    res.status(500).json({ error: 'Internal proxy error', message: globalError.message });
  }
}
