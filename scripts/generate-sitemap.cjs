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

            const idx = line.indexOf('=');
            if (idx === -1) return;

            const key = line.substring(0, idx).trim();
            let value = line.substring(idx + 1).trim();

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
const PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'my-donkey-ott';
const API_KEY = process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY;

if (!API_KEY) {
    console.error('❌ Missing Firebase Configuration. Expected: VITE_FIREBASE_API_KEY');
    process.exit(1);
}

// Function to fetch all collection documents via REST API with pagination support
async function fetchAllDocuments(collection) {
    let allDocuments = [];
    let pageToken = '';

    do {
        let url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collection}?key=${API_KEY}&pageSize=1000`;
        if (pageToken) {
            url += `&pageToken=${encodeURIComponent(pageToken)}`;
        }
        console.log(`Fetching: ${url}`);

        const response = await fetch(url);
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Firestore API Error ${response.status}: ${text}`);
        }

        const data = await response.json();
        if (data.documents && data.documents.length > 0) {
            allDocuments = allDocuments.concat(data.documents);
        }
        pageToken = data.nextPageToken || '';
    } while (pageToken);

    return allDocuments;
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

// Clean text for SEO titles and tags (strip control chars and excessive whitespace)
function cleanText(text) {
    if (!text || typeof text !== 'string') return '';
    return text.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
}

// Helper to resolve image URLs
function resolveImageUrl(imgUrl) {
    if (!imgUrl) return null;
    const trimmed = imgUrl.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return escapeXml(trimmed);
    if (trimmed.startsWith('/')) return escapeXml(`https://image.tmdb.org/t/p/original${trimmed}`);
    return escapeXml(`https://image.tmdb.org/t/p/original/${trimmed}`);
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

// Check if a title or genre represents Marvel/superhero
function isMarvelContent(title, overview, genres, tags) {
    const text = `${title} ${overview} ${(genres || []).join(' ')} ${(tags || []).join(' ')}`.toLowerCase();
    const marvelKeywords = ['marvel', 'avengers', 'iron man', 'spider-man', 'spiderman', 'thor', 'captain america', 'hulk', 'loki', 'deadpool', 'wolverine', 'guardians of the galaxy', 'black panther', 'ant-man', 'thanos', 'mcu'];
    return marvelKeywords.some(kw => text.includes(kw));
}

// Check if content is Anime
function isAnimeContent(title, overview, genres, tags) {
    const text = `${title} ${overview} ${(genres || []).join(' ')} ${(tags || []).join(' ')}`.toLowerCase();
    return text.includes('anime') || text.includes('animation') || text.includes('manga');
}

// Check if content is English / Hollywood
function isEnglishContent(title, overview, genres, tags, cast) {
    const text = `${title} ${overview} ${(genres || []).join(' ')} ${(tags || []).join(' ')} ${(cast || []).join(' ')}`.toLowerCase();
    const nonEnglishMarkers = ['hindi', 'bollywood', 'tamil', 'telugu', 'malayalam', 'kannada', 'punjabi', 'marathi', 'bengali'];
    const hasNonEnglish = nonEnglishMarkers.some(m => text.includes(m));
    if (hasNonEnglish) return false;
    return true;
}

// Helper to ensure video:publication_date complies with Google Video Sitemap specifications
function formatVideoPubDate(releaseDateStr, fallbackDate) {
    const todayStr = new Date().toISOString().split('T')[0];
    const fallback = (fallbackDate && fallbackDate.length >= 10 && !isNaN(Date.parse(fallbackDate))) 
        ? fallbackDate.substring(0, 10) 
        : todayStr;

    if (!releaseDateStr || typeof releaseDateStr !== 'string') {
        return fallback;
    }

    const trimmed = releaseDateStr.trim();
    const match = trimmed.match(/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?/);
    if (!match) {
        return fallback;
    }

    const year = parseInt(match[1], 10);
    const month = match[2] || '01';
    const day = match[3] || '01';

    const currentYear = new Date().getFullYear();
    if (year < 1970 || year > currentYear) {
        return fallback;
    }

    const formatted = `${year}-${month}-${day}`;
    if (isNaN(Date.parse(formatted))) {
        return fallback;
    }

    if (formatted > todayStr) {
        return todayStr;
    }

    return formatted;
}

async function generateSitemap() {
    console.log(`🚀 Starting Clean, Canonical, Index-Optimized Sitemap Generation`);
    console.log(`Target Base URL: ${BASE_URL}`);

    try {
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
        xml += '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"\n';
        xml += '        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n';

        const today = new Date().toISOString().split('T')[0];
        let totalUrls = 0;

        // 1. Core High-Value Canonical Static Routes (Zero query strings to prevent canonical mismatch warnings)
        const CORE_ROUTES = [
            { path: '/',           priority: '1.00', changefreq: 'daily',   title: 'My Donkey | Watch Free Movies, TV Shows, Anime & Marvel Movies Online in HD' },
            { path: '/movies',     priority: '0.95', changefreq: 'daily',   title: 'Watch Free Movies Online | Bollywood, Hollywood & English Movies - My Donkey' },
            { path: '/tv',         priority: '0.95', changefreq: 'daily',   title: 'Watch Free TV Shows & Web Series Online | All Seasons - My Donkey' },
            { path: '/anime',      priority: '0.95', changefreq: 'daily',   title: 'Watch Free Anime Online in HD | Anime Series & Movies - My Donkey' },
            { path: '/categories', priority: '0.90', changefreq: 'daily',   title: 'Browse All Movies & TV Series Categories | My Donkey' },
            { path: '/exclusive',  priority: '0.85', changefreq: 'weekly',  title: 'My Donkey Originals & Exclusive Movies' },
            { path: '/adblocker',  priority: '0.80', changefreq: 'weekly',  title: 'Adblocker & Mobile DNS Setup Guide | My Donkey' },
            { path: '/sound-enhancements', priority: '0.80', changefreq: 'weekly', title: 'Sound Enhancements & Audio Booster Guide | My Donkey' },
            { path: '/my-list',    priority: '0.75', changefreq: 'weekly',  title: 'My Watchlist — Save and Watch Free Movies Online' },
            { path: '/about',      priority: '0.70', changefreq: 'monthly', title: 'About My Donkey — Free Online Movie & Series Streaming Platform' },
            { path: '/support',    priority: '0.85', changefreq: 'weekly',  title: 'Help & Support Hub — Guides, Tools & FAQs | My Donkey' },
            { path: '/community-chat', priority: '0.85', changefreq: 'daily', title: 'Community Help Chat & Q&A Discussion Forum | My Donkey' },
            { path: '/help',       priority: '0.70', changefreq: 'monthly', title: 'Help & FAQ Center | My Donkey Streaming' },
            { path: '/contact',    priority: '0.70', changefreq: 'monthly', title: 'Contact Us | My Donkey' },
            { path: '/careers',    priority: '0.65', changefreq: 'monthly', title: 'Careers at My Donkey' },
            { path: '/press',      priority: '0.65', changefreq: 'monthly', title: 'Press Room & News | My Donkey' },
            { path: '/blog',       priority: '0.65', changefreq: 'weekly',  title: 'The Donkey Blog — Movie News & Guides' },
            { path: '/investors',  priority: '0.60', changefreq: 'monthly', title: 'Investor Relations | My Donkey' },
            { path: '/devices',    priority: '0.65', changefreq: 'monthly', title: 'Supported Devices — Smart TV, Mobile & PC | My Donkey' },
            { path: '/terms',      priority: '0.50', changefreq: 'yearly',  title: 'Terms of Use & Privacy | My Donkey' },
            { path: '/login',      priority: '0.60', changefreq: 'monthly', title: 'Sign In | My Donkey' },
        ];

        for (const route of CORE_ROUTES) {
            xml += '  <url>\n';
            xml += `    <loc>${BASE_URL}${route.path}</loc>\n`;
            xml += `    <lastmod>${today}</lastmod>\n`;
            xml += `    <changefreq>${route.changefreq}</changefreq>\n`;
            xml += `    <priority>${route.priority}</priority>\n`;
            xml += '    <image:image>\n';
            xml += `      <image:loc>https://res.cloudinary.com/dpba1gvra/image/upload/v1770155013/logo_mgcysp.png</image:loc>\n`;
            xml += `      <image:title>${escapeXml(route.title)}</image:title>\n`;
            xml += `      <image:caption>${escapeXml('Stream on My Donkey - Watch free movies, TV shows, anime, and marvel movies online in HD.')}</image:caption>\n`;
            xml += '    </image:image>\n';
            xml += '  </url>\n';
            totalUrls++;
        }
        console.log(`✅ Added ${CORE_ROUTES.length} core canonical static routes.`);

        // 2. Fetch and strictly validate all documents from Firestore
        console.log('🔄 Fetching all content from Firestore...');
        let documents = await fetchAllDocuments('content');
        console.log(`📥 Total Firestore documents retrieved: ${documents.length}`);

        // Group by normalized title to eliminate duplicate content pages
        const titleGroups = new Map();
        let skippedUnpublished = 0;
        let skippedInvalid = 0;

        documents.forEach(doc => {
            const fields = doc.fields || {};
            const pathParts = doc.name.split('/');
            const id = pathParts[pathParts.length - 1];

            const isPublished = getBool(fields.isPublished);
            if (!isPublished) {
                skippedUnpublished++;
                return;
            }

            const rawTitle = cleanText(getStr(fields.title));
            if (!rawTitle || rawTitle.length < 2 || rawTitle.toLowerCase() === 'untitled' || rawTitle.toLowerCase() === 'featured title' || id.includes('undefined')) {
                skippedInvalid++;
                return;
            }

            const posterPath = resolveImageUrl(getStr(fields.poster_path));
            const backdropPath = resolveImageUrl(getStr(fields.backdrop_path));
            const youtubeId = getStr(fields.youtubeId);
            const movieYoutubeId = getStr(fields.movieYoutubeId);
            const videoUrl = getStr(fields.videoUrl);
            const seasons = getArray(fields.seasons);

            // Must have some valid media or seasons
            if (!posterPath && !backdropPath && !videoUrl && !youtubeId && !movieYoutubeId && seasons.length === 0) {
                skippedInvalid++;
                return;
            }

            // Normalization key for title (strips special characters & extra spaces)
            const normTitle = rawTitle.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
            if (!titleGroups.has(normTitle)) {
                titleGroups.set(normTitle, []);
            }

            // Quality score to pick the best canonical entry when duplicate documents exist
            let score = 0;
            if (videoUrl && videoUrl.startsWith('http')) score += 5;
            if (youtubeId || movieYoutubeId) score += 3;
            if (posterPath) score += 3;
            if (backdropPath) score += 2;
            const overview = cleanText(getStr(fields.overview));
            if (overview && overview.length > 30) score += 2;
            if (seasons.length > 0) score += 6;
            if (fields.updatedAt) score += 1;

            titleGroups.get(normTitle).push({ doc, id, rawTitle, score, posterPath, backdropPath, youtubeId, movieYoutubeId, videoUrl, seasons, fields });
        });

        // Pick top canonical document for each unique title
        const canonicalDocs = [];
        let duplicateTitlesRemoved = 0;

        titleGroups.forEach((entries) => {
            entries.sort((a, b) => b.score - a.score);
            canonicalDocs.push(entries[0]);
            if (entries.length > 1) {
                duplicateTitlesRemoved += (entries.length - 1);
            }
        });

        console.log(`🧹 Filtered out ${skippedUnpublished} unpublished documents.`);
        console.log(`🧹 Filtered out ${skippedInvalid} invalid/broken/empty documents.`);
        console.log(`🧹 Eliminated ${duplicateTitlesRemoved} duplicate content documents.`);
        console.log(`🎯 Retained ${canonicalDocs.length} unique, canonical, indexable content items.`);

        // 3. Generate clean canonical /browse/{id} URLs with rich Video and Image schemas
        canonicalDocs.forEach(item => {
            const { id, rawTitle, posterPath, backdropPath, youtubeId, videoUrl, fields } = item;
            const type = getStr(fields.type) || 'movie';
            const rawOverview = cleanText(getStr(fields.overview)) || `${rawTitle} available to stream free in HD on My Donkey.`;
            const releaseDate = getStr(fields.release_date) || '';
            const year = getNum(fields.year) || (releaseDate ? parseInt(releaseDate.split('-')[0]) : new Date().getFullYear());

            const genres = getArray(fields.genres).map(v => cleanText(v?.stringValue)).filter(Boolean);
            const cast = getArray(fields.cast).map(v => cleanText(v?.stringValue)).filter(Boolean);
            const tags = getArray(fields.tags).map(v => cleanText(v?.stringValue)).filter(Boolean);

            let lastMod = today;
            if (fields.updatedAt) lastMod = getTimestamp(fields.updatedAt);
            else if (fields.createdAt) lastMod = getTimestamp(fields.createdAt);
            if (lastMod.includes('T')) lastMod = lastMod.split('T')[0];

            const mainUrl = `${BASE_URL}/browse/${id}`;
            const priority = (type === 'movie' || type === 'tv') ? '0.85' : '0.70';

            const isMarvel = isMarvelContent(rawTitle, rawOverview, genres, tags);
            const isAnime = isAnimeContent(rawTitle, rawOverview, genres, tags);
            const isEnglish = isEnglishContent(rawTitle, rawOverview, genres, tags, cast);

            let videoTitle = `Watch ${rawTitle}`;
            if (year) videoTitle += ` (${year})`;
            videoTitle += ` Online Free | My Donkey`;
            if (videoTitle.length > 100) {
                videoTitle = `Watch ${rawTitle} Online Free | My Donkey`;
                if (videoTitle.length > 100) {
                    videoTitle = videoTitle.substring(0, 97) + '...';
                }
            }

            let seoDescription = `Stream ${rawTitle} (${year}) online free in HD on My Donkey. Watch full movies, TV shows, anime, and Marvel movies without subscription. ${rawOverview}`;
            if (seoDescription.length > 2040) {
                seoDescription = seoDescription.substring(0, 2037) + '...';
            }

            const videoTagsSet = new Set();
            videoTagsSet.add('donkey');
            videoTagsSet.add('my donkey');
            videoTagsSet.add('watch free movies');
            videoTagsSet.add('online free movies');
            videoTagsSet.add('free movies');
            videoTagsSet.add('hd streaming');

            if (type === 'tv') {
                videoTagsSet.add('tv shows');
                videoTagsSet.add('web series');
                videoTagsSet.add('watch series online');
            } else {
                videoTagsSet.add('movies');
                videoTagsSet.add('full movie online');
            }

            if (isAnime) {
                videoTagsSet.add('anime');
                videoTagsSet.add('watch anime free');
            }

            if (isMarvel) {
                videoTagsSet.add('marvel movies');
                videoTagsSet.add('mcu');
                videoTagsSet.add('superhero');
            }

            if (isEnglish) {
                videoTagsSet.add('english movies');
                videoTagsSet.add('hollywood movies');
            } else {
                videoTagsSet.add('hindi movies');
                videoTagsSet.add('bollywood movies');
            }

            videoTagsSet.add(rawTitle.toLowerCase());
            if (rawTitle.length < 24) {
                videoTagsSet.add(`watch ${rawTitle.toLowerCase()}`);
            }

            genres.slice(0, 4).forEach(g => {
                videoTagsSet.add(g.toLowerCase());
                videoTagsSet.add(`${g.toLowerCase()} movies`);
            });

            cast.slice(0, 3).forEach(actor => {
                if (actor && actor.length < 30) {
                    videoTagsSet.add(actor.toLowerCase());
                }
            });

            const videoTags = Array.from(videoTagsSet).slice(0, 32);

            let categoryStr = 'Movies';
            if (isAnime) categoryStr = 'Anime';
            else if (type === 'tv') categoryStr = 'TV Shows';
            else if (genres.length > 0) categoryStr = `${genres[0]} Movies`;

            let videoThumbnailUrl = backdropPath || posterPath;
            if (!videoThumbnailUrl && youtubeId) {
                videoThumbnailUrl = escapeXml(`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`);
            }

            xml += '  <url>\n';
            xml += `    <loc>${escapeXml(mainUrl)}</loc>\n`;
            xml += `    <lastmod>${lastMod}</lastmod>\n`;
            xml += '    <changefreq>weekly</changefreq>\n';
            xml += `    <priority>${priority}</priority>\n`;

            if (posterPath) {
                xml += '    <image:image>\n';
                xml += `      <image:loc>${posterPath}</image:loc>\n`;
                xml += `      <image:title>${escapeXml(`Watch ${rawTitle} (${year}) Free Online - My Donkey Movies`)}</image:title>\n`;
                xml += `      <image:caption>${escapeXml(`Stream ${rawTitle} in HD on My Donkey. Free movies, TV shows, and anime streaming.`)}</image:caption>\n`;
                xml += '    </image:image>\n';
            }
            if (backdropPath && backdropPath !== posterPath) {
                xml += '    <image:image>\n';
                xml += `      <image:loc>${backdropPath}</image:loc>\n`;
                xml += `      <image:title>${escapeXml(`${rawTitle} HD Wallpaper & Backdrop - My Donkey`)}</image:title>\n`;
                xml += `      <image:caption>${escapeXml(`High definition backdrop for ${rawTitle} on My Donkey streaming platform.`)}</image:caption>\n`;
                xml += '    </image:image>\n';
            }

            if (videoThumbnailUrl) {
                const videoPubDate = formatVideoPubDate(releaseDate, lastMod);
                xml += '    <video:video>\n';
                xml += `      <video:thumbnail_loc>${videoThumbnailUrl}</video:thumbnail_loc>\n`;
                xml += `      <video:title>${escapeXml(videoTitle)}</video:title>\n`;
                xml += `      <video:description>${escapeXml(seoDescription)}</video:description>\n`;
                xml += `      <video:publication_date>${escapeXml(videoPubDate)}</video:publication_date>\n`;
                if (youtubeId) {
                    xml += `      <video:player_loc allow_embed="yes" autoplay="ap=1">${escapeXml(`https://www.youtube.com/embed/${youtubeId}`)}</video:player_loc>\n`;
                } else if (videoUrl && videoUrl.startsWith('http')) {
                    xml += `      <video:player_loc allow_embed="yes">${escapeXml(videoUrl)}</video:player_loc>\n`;
                }
                xml += `      <video:category>${escapeXml(categoryStr)}</video:category>\n`;
                xml += '      <video:family_friendly>yes</video:family_friendly>\n';
                xml += '      <video:uploader info="https://www.mydonkey.in">My Donkey</video:uploader>\n';
                xml += '      <video:platform relationship="allow">web mobile tv</video:platform>\n';

                for (const tag of videoTags) {
                    xml += `      <video:tag>${escapeXml(tag)}</video:tag>\n`;
                }

                xml += '    </video:video>\n';
            }

            xml += '  </url>\n';
            totalUrls++;
        });

        xml += '</urlset>\n';

        // Write to public/sitemap.xml
        const publicDir = path.resolve(__dirname, '../public');
        const sitemapPath = path.join(publicDir, 'sitemap.xml');

        if (!fs.existsSync(publicDir)) {
            console.log(`📁 Creating public directory at: ${publicDir}`);
            fs.mkdirSync(publicDir, { recursive: true });
        }

        fs.writeFileSync(sitemapPath, xml, 'utf8');
        const stats = fs.statSync(sitemapPath);
        console.log(`✨ Final Index-Optimized Sitemap generated successfully at: ${sitemapPath}`);
        console.log(`📊 Total Clean Canonical URLs in sitemap: ${totalUrls}`);
        console.log(`📦 File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB (${stats.size} bytes)`);

    } catch (error) {
        console.error('❌ Sitemap Generation Failed:', error);
        process.exit(1);
    }
}

generateSitemap();
