// Vercel Serverless Function - CommonJS
// Uses Node.js built-in https module (compatible with all Node versions)

import https from 'https';

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { resolve(null); }
      });
    }).on('error', reject);
  });
}

export default async function handler(req, res) {
  const urlPath = req.url || '';
  let contentId = null;

  const match = urlPath.match(/\/(browse|watch)\/([^\/?#]+)/);
  if (match && match[2]) {
    contentId = decodeURIComponent(match[2]);
  }

  // Default meta values
  let title = 'My Donkey | Premium Streaming';
  let description = 'Stream the latest movies, web series and anime in HD on My Donkey.';
  let image = 'https://res.cloudinary.com/dpba1gvra/image/upload/v1770155013/logo_mgcysp.png';
  const host = req.headers.host || 'mydonkey.in';
  const siteUrl = `https://${host}${urlPath}`;

  if (contentId) {
    try {
      const firebaseUrl = `https://firestore.googleapis.com/v1/projects/my-donkey-ott/databases/(default)/documents/content/${contentId}`;
      const fbData = await httpsGet(firebaseUrl);

      if (fbData && fbData.fields) {
        const rawTitle = fbData.fields.title?.stringValue;
        if (rawTitle) title = rawTitle + ' | My Donkey';

        const rawDesc = fbData.fields.overview?.stringValue || '';
        if (rawDesc) description = rawDesc.length > 200 ? rawDesc.substring(0, 200) + '...' : rawDesc;

        image =
          fbData.fields.backdrop_path?.stringValue ||
          fbData.fields.poster_path?.stringValue ||
          image;
      }
    } catch (e) {
      console.error('Firebase fetch error:', e.message);
    }
  }

  const safe = (s) => String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safe(title)}</title>
  <meta property="og:site_name" content="My Donkey" />
  <meta property="og:title" content="${safe(title)}" />
  <meta property="og:description" content="${safe(description)}" />
  <meta property="og:image" content="${safe(image)}" />
  <meta property="og:image:width" content="1280" />
  <meta property="og:image:height" content="720" />
  <meta property="og:url" content="${safe(siteUrl)}" />
  <meta property="og:type" content="video.movie" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${safe(title)}" />
  <meta name="twitter:description" content="${safe(description)}" />
  <meta name="twitter:image" content="${safe(image)}" />
  <script>window.location.replace("${safe(urlPath)}");</script>
  <noscript><meta http-equiv="refresh" content="0; url=${safe(urlPath)}" /></noscript>
</head>
<body style="background:#141414;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
  <p>Redirecting to My Donkey...</p>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
  res.status(200).send(html);
};
