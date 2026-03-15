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
    process.exit(1);
}

// Function to fetch collection documents via REST API
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

// Helper to escape XML special characters
function escapeXml(unsafe) {
    if (!unsafe || typeof unsafe !== 'string') return '';
    return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });
}

// Helper to resolve TMDB image URLs
function resolveImageUrl(path) {
    if (!path) return null;
    if (path.startsWith('http')) return escapeXml(path);
    if (path.startsWith('/')) return escapeXml(`https://image.tmdb.org/t/p/original${path}`);
    return escapeXml(`https://image.tmdb.org/t/p/original/${path}`);
}

// Helper to safely extract values from Firestore REST API format
function getStr(field) {
    return field?.stringValue || '';
}
function getNum(field) {
    return field?.integerValue || field?.doubleValue || 0;
}
function getBool(field) {
    return field?.booleanValue || false;
}
function getTimestamp(field) {
    return field?.timestampValue || field?.stringValue || new Date().toISOString();
}
function getArray(field) {
    return field?.arrayValue?.values || [];
}

async function generateSitemap() {
    console.log(`🚀 Starting Ultra Detailed Sitemap Generation`);
    console.log(`Target: ${BASE_URL}`);

    try {
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ';
        xml += 'xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" ';
        xml += 'xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n';

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

        // 2. Fetch Dynamic Content
        console.log('🔄 Fetching content from Firestore...');
        try {
            const documents = await fetchDocuments('content');
            let contentCount = 0;
            let episodeCount = 0;

            if (documents.length === 0) {
                console.warn('⚠️ No content found.');
            } else {
                documents.forEach(doc => {
                    const fields = doc.fields || {};
                    const pathParts = doc.name.split('/');
                    const id = pathParts[pathParts.length - 1];

                    if (getBool(fields.isPublished)) {
                        const type = getStr(fields.type);
                        const title = getStr(fields.title) || 'Unknown Title';
                        const overview = getStr(fields.overview) || title;
                        const posterPath = resolveImageUrl(getStr(fields.poster_path));
                        const backdropPath = resolveImageUrl(getStr(fields.backdrop_path));
                        
                        let lastMod = new Date().toISOString();
                        if (fields.updatedAt) lastMod = getTimestamp(fields.updatedAt);
                        else if (fields.createdAt) lastMod = getTimestamp(fields.createdAt);

                        const mainUrl = `${BASE_URL}/browse/${id}`;
                        const priority = type === 'movie' || type === 'tv' ? '0.8' : '0.6';

                        // Start main URL element
                        xml += '  <url>\n';
                        xml += `    <loc>${mainUrl}</loc>\n`;
                        xml += `    <lastmod>${lastMod}</lastmod>\n`;
                        xml += `    <changefreq>weekly</changefreq>\n`;
                        xml += `    <priority>${priority}</priority>\n`;

                        // Add Images
                        if (posterPath || backdropPath) {
                            if (posterPath) {
                                xml += '    <image:image>\n';
                                xml += `      <image:loc>${posterPath}</image:loc>\n`;
                                xml += `      <image:title>${escapeXml(title + ' Poster')}</image:title>\n`;
                                xml += '    </image:image>\n';
                            }
                            if (backdropPath) {
                                xml += '    <image:image>\n';
                                xml += `      <image:loc>${backdropPath}</image:loc>\n`;
                                xml += `      <image:title>${escapeXml(title + ' Backdrop')}</image:title>\n`;
                                xml += '    </image:image>\n';
                            }
                        }

                        // Add Video block 
                        const youtubeId = getStr(fields.youtubeId);
                        let videoThumbnailUrl = backdropPath || posterPath;
                        if (youtubeId && !videoThumbnailUrl) {
                            videoThumbnailUrl = escapeXml(`https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`);
                        }

                        if (videoThumbnailUrl) {
                            xml += '    <video:video>\n';
                            xml += `      <video:thumbnail_loc>${videoThumbnailUrl}</video:thumbnail_loc>\n`;
                            xml += `      <video:title>${escapeXml(title)}</video:title>\n`;
                            xml += `      <video:description>${escapeXml(overview)}</video:description>\n`;
                            if (fields.release_date && getStr(fields.release_date)) {
                                xml += `      <video:publication_date>${escapeXml(getStr(fields.release_date))}</video:publication_date>\n`;
                            }
                            xml += `      <video:player_loc>${mainUrl}</video:player_loc>\n`;
                            xml += '    </video:video>\n';
                        }

                        xml += '  </url>\n';
                        contentCount++;

                        // Process episodes if TV
                        if (type === 'tv' && fields.seasons) {
                            const seasonsData = getArray(fields.seasons);
                            seasonsData.forEach(seasonItem => {
                                const seasonObj = seasonItem.mapValue?.fields || {};
                                const sNumber = getNum(seasonObj.seasonNumber);
                                const episodesData = getArray(seasonObj.episodes);
                                
                                episodesData.forEach(epItem => {
                                    const epObj = epItem.mapValue?.fields || {};
                                    const epNumber = getNum(epObj.episodeNumber);
                                    let epTitle = getStr(epObj.title);
                                    if (!epTitle) epTitle = `${title} Season ${sNumber} Episode ${epNumber}`;
                                    const epOverview = getStr(epObj.overview) || epTitle;
                                    const epStill = resolveImageUrl(getStr(epObj.stillUrl));
                                    const epYoutubeId = getStr(epObj.youtubeId);

                                    const epUrl = `${mainUrl}?season=${sNumber}&episode=${epNumber}`;
                                    
                                    xml += '  <url>\n';
                                    xml += `    <loc>${escapeXml(epUrl)}</loc>\n`;
                                    xml += `    <lastmod>${lastMod}</lastmod>\n`;
                                    xml += `    <changefreq>monthly</changefreq>\n`;
                                    xml += `    <priority>0.6</priority>\n`;

                                    let epThumb = epStill || backdropPath || posterPath;
                                    if (!epThumb && epYoutubeId) {
                                        epThumb = escapeXml(`https://img.youtube.com/vi/${epYoutubeId}/maxresdefault.jpg`);
                                    }

                                    if (epThumb) {
                                        xml += '    <image:image>\n';
                                        xml += `      <image:loc>${epThumb}</image:loc>\n`;
                                        xml += `      <image:title>${escapeXml(epTitle + ' Image')}</image:title>\n`;
                                        xml += '    </image:image>\n';

                                        xml += '    <video:video>\n';
                                        xml += `      <video:thumbnail_loc>${epThumb}</video:thumbnail_loc>\n`;
                                        xml += `      <video:title>${escapeXml(epTitle)}</video:title>\n`;
                                        xml += `      <video:description>${escapeXml(epOverview)}</video:description>\n`;
                                        xml += `      <video:player_loc>${escapeXml(epUrl)}</video:player_loc>\n`;
                                        xml += '    </video:video>\n';
                                    }

                                    xml += '  </url>\n';
                                    episodeCount++;
                                });
                            });
                        }
                    }
                });
                console.log(`✅ Added ${contentCount} dynamic content pages.`);
                console.log(`✅ Added ${episodeCount} dynamic episode pages.`);
            }
        } catch (e) {
            console.error(`⚠️ Failed to fetch dynamic content: ${e.message}`);
            console.warn('Continuing with static-only sitemap...');
        }

        xml += '</urlset>';

        // 3. Write to public/sitemap.xml
        const publicDir = path.resolve(__dirname, '../public');
        const sitemapPath = path.join(publicDir, 'sitemap.xml');

        if (!fs.existsSync(publicDir)) {
            console.log(`📁 Creating public directory at: ${publicDir}`);
            fs.mkdirSync(publicDir, { recursive: true });
        }

        fs.writeFileSync(sitemapPath, xml);
        console.log(`✨ Ultra Detailed Sitemap generated successfully at: ${sitemapPath}`);

    } catch (error) {
        console.error('❌ Sitemap Generation Failed:', error);
        process.exit(1);
    }
}

generateSitemap();
