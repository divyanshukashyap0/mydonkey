/**
 * api/stream.js
 * High-performance streaming proxy with full HTTP Range request and CORS support.
 * Enables in-browser playback of direct video URLs (e.g. Cloudflare R2, MKV, MP4)
 * that lack Access-Control-Allow-Origin headers or require range request proxying.
 */
import http from 'http';
import https from 'https';
import net from 'net';
import dns from 'dns';

// In-memory cache for reachable IPs per hostname to ensure fast zero-latency streaming
const workingIpCache = new Map();

function probeIp(ip, port = 443, timeoutMs = 1200) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: ip, port, timeout: timeoutMs }, () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      resolve(false);
    });
  });
}

function smartLookup(hostname, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  const cached = workingIpCache.get(hostname);
  if (cached) {
    if (options && options.all) {
      return callback(null, [{ address: cached, family: 4 }]);
    }
    return callback(null, cached, 4);
  }

  dns.lookup(hostname, { all: true, family: 4 }, async (err, addresses) => {
    if (err || !addresses || addresses.length === 0) {
      return dns.lookup(hostname, options, callback);
    }
    if (addresses.length === 1) {
      workingIpCache.set(hostname, addresses[0].address);
      if (options && options.all) {
        return callback(null, addresses);
      }
      return callback(null, addresses[0].address, 4);
    }

    // Multiple IPs returned (e.g. Cloudflare Anycast pool where one IP drops packets)
    // Probe concurrently and pick the first that connects
    const ips = addresses.map((a) => a.address);
    let chosen = null;
    for (const ip of ips) {
      const ok = await probeIp(ip, 443, 1000);
      if (ok) {
        chosen = ip;
        break;
      }
    }

    const finalIp = chosen || ips[0];
    workingIpCache.set(hostname, finalIp);
    if (options && options.all) {
      return callback(null, [{ address: finalIp, family: 4 }]);
    }
    return callback(null, finalIp, 4);
  });
}

export default async function handler(req, res) {
  // 1. CORS Preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Accept-Encoding, Accept, Content-Type, Authorization, *');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges, Content-Type, Content-Disposition');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  // 2. Extract target URL from query
  let targetUrl = '';
  const urlParamMatch = req.url ? req.url.match(/[?&]url=([^#]+)/) : null;
  if (urlParamMatch) {
    const rawMatch = urlParamMatch[1];
    try {
      targetUrl = decodeURIComponent(rawMatch);
    } catch {
      targetUrl = rawMatch;
    }
  } else if (req.query && req.query.url) {
    targetUrl = req.query.url;
  } else {
    try {
      const parsed = new URL(req.url, 'http://localhost');
      targetUrl = parsed.searchParams.get('url') || '';
    } catch {
      targetUrl = '';
    }
  }

  // Prevent recursive self-proxying by unwrapping any nested /api/stream?url=
  while (targetUrl.includes('/api/stream?url=')) {
    try {
      const innerMatch = targetUrl.match(/[?&]url=([^#]+)/);
      if (innerMatch) {
        targetUrl = decodeURIComponent(innerMatch[1]);
      } else {
        break;
      }
    } catch {
      break;
    }
  }

  if (!targetUrl) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Missing "url" query parameter' }));
    return;
  }

  let parsedTarget;
  try {
    parsedTarget = new URL(targetUrl);
    if (parsedTarget.protocol !== 'http:' && parsedTarget.protocol !== 'https:') {
      throw new Error('Unsupported protocol');
    }
  } catch (err) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Invalid URL parameter', details: err.message }));
    return;
  }

  // 3. Prepare headers to forward
  const forwardHeaders = {
    'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Accept-Encoding': 'identity', // Avoid gzip so byte ranges map 1:1
  };

  if (req.headers['range']) {
    forwardHeaders['Range'] = req.headers['range'];
  }
  if (req.headers['if-range']) {
    forwardHeaders['If-Range'] = req.headers['if-range'];
  }

  const clientLib = parsedTarget.protocol === 'https:' ? https : http;

  // Custom agent with IPv4 forced and smart lookup to bypass dead Anycast nodes
  const agent = new clientLib.Agent({
    family: 4,
    keepAlive: true,
    keepAliveMsecs: 10000,
    timeout: 30000,
    lookup: smartLookup,
  });

  const requestOptions = {
    method: req.method || 'GET',
    headers: forwardHeaders,
    agent,
    lookup: smartLookup,
    timeout: 30000,
  };

  const upstreamReq = clientLib.request(targetUrl, requestOptions, (upstreamRes) => {
    // Determine content type
    let contentType = upstreamRes.headers['content-type'] || 'application/octet-stream';
    const pathLower = parsedTarget.pathname.toLowerCase();
    if (contentType === 'application/octet-stream' || !contentType) {
      if (pathLower.endsWith('.mkv') || upstreamRes.headers['content-disposition']?.includes('.mkv')) {
        contentType = 'video/x-matroska';
      } else if (pathLower.endsWith('.mp4')) {
        contentType = 'video/mp4';
      } else if (pathLower.endsWith('.webm')) {
        contentType = 'video/webm';
      } else if (pathLower.endsWith('.m3u8')) {
        contentType = 'application/vnd.apple.mpegurl';
      } else {
        contentType = 'video/x-matroska'; // Default to matroska for raw streams
      }
    }

    res.statusCode = upstreamRes.statusCode || 200;
    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', 'bytes');

    if (upstreamRes.headers['content-range']) {
      res.setHeader('Content-Range', upstreamRes.headers['content-range']);
    }
    if (upstreamRes.headers['content-length']) {
      res.setHeader('Content-Length', upstreamRes.headers['content-length']);
    }
    if (upstreamRes.headers['content-disposition']) {
      res.setHeader('Content-Disposition', upstreamRes.headers['content-disposition']);
    }
    if (upstreamRes.headers['etag']) {
      res.setHeader('ETag', upstreamRes.headers['etag']);
    }
    if (upstreamRes.headers['last-modified']) {
      res.setHeader('Last-Modified', upstreamRes.headers['last-modified']);
    }

    // Cache range requests briefly to avoid re-fetching the same header chunks
    res.setHeader('Cache-Control', 'public, max-age=604800');

    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    upstreamRes.pipe(res);
  });

  upstreamReq.on('error', (err) => {
    console.error('[Stream Proxy Error]:', err.message);
    workingIpCache.delete(parsedTarget.hostname);
    if (!res.headersSent) {
      res.statusCode = 502;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Failed to stream from remote source', details: err.message }));
    } else {
      res.end();
    }
  });

  upstreamReq.on('timeout', () => {
    upstreamReq.destroy();
    if (!res.headersSent) {
      res.statusCode = 504;
      res.end(JSON.stringify({ error: 'Gateway timeout streaming from remote source' }));
    }
  });

  // If client disconnects, abort upstream request immediately to save bandwidth
  req.on('close', () => {
    upstreamReq.destroy();
  });

  upstreamReq.end();
}
