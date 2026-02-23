// Vercel Serverless Function - CommonJS
// Generates OG meta tags directly - no filesystem access required

module.exports = async function handler(req, res) {
    const urlPath = req.url || '';
    let contentId = null;

    // Extract ID from /browse/:id or /watch/:id
    const match = urlPath.match(/\/(browse|watch)\/([^\/?#]+)/);
    if (match && match[2]) {
        contentId = decodeURIComponent(match[2]);
    }

    // Default meta values
    let title = 'My Donkey | Premium Streaming';
    let description = 'Stream the latest movies, web series, and anime in HD on My Donkey.';
    let image = 'https://res.cloudinary.com/dpba1gvra/image/upload/v1770155013/logo_mgcysp.png';
    const siteUrl = `https://${req.headers.host || 'mydonkey.in'}${urlPath}`;
    const redirectUrl = urlPath; // The SPA will handle this via client-side routing

    if (contentId) {
        try {
            const projectId = 'my-donkey-ott';
            const firebaseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/content/${contentId}`;
            const fbRes = await fetch(firebaseUrl);

            if (fbRes.ok) {
                const fbData = await fbRes.json();
                if (fbData && fbData.fields) {
                    title = (fbData.fields.title?.stringValue || 'My Donkey') + ' | My Donkey';
                    const raw = fbData.fields.overview?.stringValue || '';
                    description = raw.length > 200 ? raw.substring(0, 200) + '...' : raw || description;
                    image =
                        fbData.fields.backdrop_path?.stringValue ||
                        fbData.fields.poster_path?.stringValue ||
                        image;
                }
            }
        } catch (e) {
            console.error('Firebase fetch error:', e.message);
        }
    }

    // Escape values to prevent XSS in attributes
    const safe = (s) => String(s).replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Return a lightweight HTML shell with OG tags + client-side redirect to SPA
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safe(title)}</title>

  <!-- Open Graph -->
  <meta property="og:site_name" content="My Donkey" />
  <meta property="og:title" content="${safe(title)}" />
  <meta property="og:description" content="${safe(description)}" />
  <meta property="og:image" content="${safe(image)}" />
  <meta property="og:image:width" content="1280" />
  <meta property="og:image:height" content="720" />
  <meta property="og:url" content="${safe(siteUrl)}" />
  <meta property="og:type" content="video.movie" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${safe(title)}" />
  <meta name="twitter:description" content="${safe(description)}" />
  <meta name="twitter:image" content="${safe(image)}" />

  <!-- Redirect real users to the SPA -->
  <script>
    window.location.replace("${safe(redirectUrl)}");
  </script>
  <noscript>
    <meta http-equiv="refresh" content="0; url=${safe(redirectUrl)}" />
  </noscript>
</head>
<body style="background:#141414;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
  <p>Redirecting to My Donkey...</p>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
    res.status(200).send(html);
};
