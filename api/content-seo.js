// Vercel Serverless Function - CommonJS format required
const fs = require('fs');
const path = require('path');

module.exports = async function handler(req, res) {
    const urlPath = req.url || '';
    let contentId = null;

    // Extract ID from /browse/:id or /watch/:id
    const match = urlPath.match(/\/(browse|watch)\/([^\/?#]+)/);
    if (match && match[2]) {
        contentId = decodeURIComponent(match[2]);
    }

    // Read index.html from the built dist folder
    const indexPath = path.join(process.cwd(), 'dist', 'index.html');
    let html = '';
    try {
        html = fs.readFileSync(indexPath, 'utf8');
    } catch (err) {
        console.error('Failed to read dist/index.html:', err.message);
        res.setHeader('Content-Type', 'text/html');
        res.status(200).send('<!DOCTYPE html><html lang="en"><head><title>My Donkey</title></head><body><div id="root"></div></body></html>');
        return;
    }

    if (contentId) {
        try {
            const projectId = 'my-donkey-ott';
            const firebaseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/content/${contentId}`;

            const fbRes = await fetch(firebaseUrl);
            const fbData = await fbRes.json();

            if (fbData && fbData.fields) {
                const title = fbData.fields.title?.stringValue || 'My Donkey';
                const rawDesc = fbData.fields.overview?.stringValue || 'Stream the latest movies and shows on My Donkey.';
                const description = rawDesc.substring(0, 200);
                const image =
                    fbData.fields.backdrop_path?.stringValue ||
                    fbData.fields.poster_path?.stringValue ||
                    'https://res.cloudinary.com/dpba1gvra/image/upload/v1770155013/logo_mgcysp.png';

                const siteUrl = `https://${req.headers.host || 'mydonkey.in'}${urlPath}`;

                const ogTags = `
  <meta property="og:site_name" content="My Donkey" />
  <meta property="og:title" content="${title} | My Donkey" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${image}" />
  <meta property="og:image:width" content="1280" />
  <meta property="og:image:height" content="720" />
  <meta property="og:url" content="${siteUrl}" />
  <meta property="og:type" content="video.movie" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title} | My Donkey" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${image}" />`;

                // Replace <title>
                html = html.replace(/<title>.*?<\/title>/, `<title>${title} | My Donkey</title>`);

                // Replace the OG tag block between markers
                if (html.includes('<!-- OG_TAGS_START -->') && html.includes('<!-- OG_TAGS_END -->')) {
                    html = html.replace(/<!-- OG_TAGS_START -->[\s\S]*?<!-- OG_TAGS_END -->/, `<!-- OG_TAGS_START -->${ogTags}\n  <!-- OG_TAGS_END -->`);
                } else {
                    // Fallback: inject before </head>
                    html = html.replace('</head>', `${ogTags}\n</head>`);
                }
            }
        } catch (e) {
            console.error('SEO Firebase fetch error:', e.message);
            // Silently fall through — still serve the HTML without dynamic tags
        }
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
    res.status(200).send(html);
};
