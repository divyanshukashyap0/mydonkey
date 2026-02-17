const fs = require('fs');
const path = require('path');

// Custom robust environment loader
const loadEnv = (filePath) => {
    if (!fs.existsSync(filePath)) return;
    console.log(`Loading env from ${path.basename(filePath)}`);

    try {
        const buffer = fs.readFileSync(filePath);
        let content;

        // Detect encoding
        if (buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
            content = buffer.toString('utf16le'); // LE BOM
        } else if (buffer.length >= 2 && buffer[0] === 0xFE && buffer[1] === 0xFF) {
            content = buffer.toString('utf16be'); // BE BOM
        } else {
            content = buffer.toString('utf8'); // Default
        }

        content.split(/\r?\n/).forEach(line => {
            line = line.trim();
            if (!line || line.startsWith('#')) return;

            // Split on first = only
            const idx = line.indexOf('=');
            if (idx === -1) return;

            const key = line.substring(0, idx).trim();
            let value = line.substring(idx + 1).trim();

            // Remove quotes
            value = value.replace(/^["']|["']$/g, '');

            if (key && !process.env[key]) {
                process.env[key] = value;
            }
        });
    } catch (e) {
        console.error(`Failed to parse ${path.basename(filePath)}:`, e);
    }
};

// Load environments
loadEnv(path.resolve(__dirname, '../.env.local'));
loadEnv(path.resolve(__dirname, '../.env'));

const BASE_URL = 'https://www.mydonkey.in';
// Use VITE_ keys as they are present
const PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'my-donkey-ott'; // Fallback to grep result if env fails
const API_KEY = process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY;

if (!API_KEY) {
    console.error('❌ Missing Firebase Configuration.');
    console.error('Expected: VITE_FIREBASE_API_KEY');
    // We can try without API key if rules are open, but usually fails.
    // However, I saw API KEY in grep so it SHOULD be loaded.
    process.exit(1);
}

// Function to fetch collection documents via REST API
// https://firebase.google.com/docs/firestore/reference/rest/v1/projects.databases.documents/list
async function fetchDocuments(collection) {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collection}?key=${API_KEY}&pageSize=1000`;
    console.log(`Fetching: ${url}`);

    const response = await fetch(url);
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Firestore API Error ${response.status}: ${text}`);
    }

    const data = await response.json();
    return data.documents || [];
}

async function generateSitemap() {
    console.log(`🚀 Starting Sitemap Generation`);
    console.log(`Target: ${BASE_URL}`);
    console.log(`Project: ${PROJECT_ID}`);

    try {
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

        // 1. Add Static Routes
        const STATIC_ROUTES = [
            '/',
            '/home',
            '/movies',
            '/tv',
            '/login',
            '/register'
        ];

        let staticCount = 0;
        for (const route of STATIC_ROUTES) {
            xml += '  <url>\n';
            xml += `    <loc>${BASE_URL}${route}</loc>\n`;
            xml += `    <changefreq>daily</changefreq>\n`;
            xml += `    <priority>${route === '/' ? '1.0' : '0.8'}</priority>\n`;
            xml += '  </url>\n';
            staticCount++;
        }
        console.log(`✅ Added ${staticCount} static routes.`);

        // 2. Fetch Dynamic Content (Movies/TV Shows)
        console.log('🔄 Fetching content from Firestore REST API...');

        try {
            const documents = await fetchDocuments('content');

            if (documents.length === 0) {
                console.warn('⚠️ No content found.');
            } else {
                let contentCount = 0;

                documents.forEach(doc => {
                    // Structure: { name, fields: { key: { valueType: value } } }
                    const fields = doc.fields || {};
                    const pathParts = doc.name.split('/');
                    const id = pathParts[pathParts.length - 1];

                    // Check isPublished
                    const isPublished = fields.isPublished?.booleanValue;

                    if (isPublished) {
                        const url = `${BASE_URL}/browse/${id}`;

                        // Get updatedAt or createdAt
                        let lastMod = new Date().toISOString();
                        if (fields.updatedAt?.timestampValue) {
                            lastMod = fields.updatedAt.timestampValue;
                        } else if (fields.updatedAt?.stringValue) {
                            lastMod = fields.updatedAt.stringValue;
                        } else if (fields.createdAt?.timestampValue) {
                            lastMod = fields.createdAt.timestampValue;
                        }

                        xml += '  <url>\n';
                        xml += `    <loc>${url}</loc>\n`;
                        xml += `    <lastmod>${lastMod}</lastmod>\n`;
                        xml += `    <changefreq>weekly</changefreq>\n`;
                        xml += `    <priority>0.7</priority>\n`;
                        xml += '  </url>\n';
                        contentCount++;
                    }
                });
                console.log(`✅ Added ${contentCount} dynamic content pages.`);
            }
        } catch (e) {
            console.error(`⚠️ Failed to fetch dynamic content: ${e.message}`);
            console.warn('Continuing with static-only sitemap...');
        }

        xml += '</urlset>';

        // 3. Write to public/sitemap.xml
        const publicDir = path.resolve(__dirname, '../public');
        const sitemapPath = path.join(publicDir, 'sitemap.xml');

        // Ensure public dir exists
        if (!fs.existsSync(publicDir)) {
            console.log(`📁 Creating public directory at: ${publicDir}`);
            fs.mkdirSync(publicDir, { recursive: true });
        }

        fs.writeFileSync(sitemapPath, xml);
        console.log(`✨ Sitemap generated successfully at: ${sitemapPath}`);

    } catch (error) {
        console.error('❌ Sitemap Generation Failed:', error);
        process.exit(1);
    }
}

generateSitemap();
