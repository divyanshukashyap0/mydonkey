const fs = require('fs');
const path = require('path');

// Custom robust environment loader
const loadEnv = (filePath) => {
    if (!fs.existsSync(filePath)) return;
    console.log(`Loading env from ${path.basename(filePath)}`);

    try {
        const buffer = fs.readFileSync(filePath);
        let content;

        if (buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
            content = buffer.toString('utf16le');
        } else if (buffer.length >= 2 && buffer[0] === 0xFE && buffer[1] === 0xFF) {
            content = buffer.toString('utf16be');
        } else {
            content = buffer.toString('utf8');
        }

        content.split(/\r?\n/).forEach(line => {
            line = line.trim();
            if (!line || line.startsWith('#')) return;

            const idx = line.indexOf('=');
            if (idx === -1) return;

            const key = line.substring(0, idx).trim();
            let value = line.substring(idx + 1).trim().replace(/^["']|["']$/g, '');

            if (key && !process.env[key]) {
                process.env[key] = value;
            }
        });
    } catch (e) {
        console.error(`Failed to parse ${path.basename(filePath)}:`, e);
    }
};

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

function cleanText(text) {
    if (!text || typeof text !== 'string') return '';
    return text.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function resolveImageUrl(imgUrl) {
    if (!imgUrl) return null;
    const trimmed = imgUrl.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return escapeXml(trimmed);
    if (trimmed.startsWith('/')) return escapeXml(`https://image.tmdb.org/t/p/original${trimmed}`);
    return escapeXml(`https://image.tmdb.org/t/p/original/${trimmed}`);
}

function getStr(field) { return field?.stringValue || ''; }
function getNum(field) { return field?.integerValue || field?.doubleValue || 0; }
function getBool(field) { return field?.booleanValue || false; }
function getTimestamp(field) { return field?.timestampValue || field?.stringValue || new Date().toISOString(); }
function getArray(field) { return field?.arrayValue?.values || []; }

function isMarvelContent(title, overview, genres, tags) {
    const text = `${title} ${overview} ${(genres || []).join(' ')} ${(tags || []).join(' ')}`.toLowerCase();
    const marvelKeywords = ['marvel', 'avengers', 'iron man', 'spider-man', 'spiderman', 'thor', 'captain america', 'hulk', 'loki', 'deadpool', 'wolverine', 'guardians of the galaxy', 'black panther', 'ant-man', 'thanos', 'mcu'];
    return marvelKeywords.some(kw => text.includes(kw));
}

function isAnimeContent(title, overview, genres, tags) {
    const text = `${title} ${overview} ${(genres || []).join(' ')} ${(tags || []).join(' ')}`.toLowerCase();
    return text.includes('anime') || text.includes('animation') || text.includes('manga');
}

function isEnglishContent(title, overview, genres, tags, cast) {
    const text = `${title} ${overview} ${(genres || []).join(' ')} ${(tags || []).join(' ')} ${(cast || []).join(' ')}`.toLowerCase();
    const nonEnglishMarkers = ['hindi', 'bollywood', 'tamil', 'telugu', 'malayalam', 'kannada', 'punjabi', 'marathi', 'bengali'];
    return !nonEnglishMarkers.some(m => text.includes(m));
}

function formatVideoPubDate(releaseDateStr, fallbackDate) {
    const todayStr = new Date().toISOString().split('T')[0];
    const fallback = (fallbackDate && fallbackDate.length >= 10 && !isNaN(Date.parse(fallbackDate))) 
        ? fallbackDate.substring(0, 10) 
        : todayStr;

    if (!releaseDateStr || typeof releaseDateStr !== 'string') return fallback;

    const trimmed = releaseDateStr.trim();
    const match = trimmed.match(/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?/);
    if (!match) return fallback;

    const year = parseInt(match[1], 10);
    const month = match[2] || '01';
    const day = match[3] || '01';

    const currentYear = new Date().getFullYear();
    if (year < 1970 || year > currentYear) return fallback;

    const formatted = `${year}-${month}-${day}`;
    if (isNaN(Date.parse(formatted))) return fallback;
    return formatted > todayStr ? todayStr : formatted;
}

// Convert a content item into an XML <url> block
function buildContentUrlXml(item, today) {
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

    // Keep video title under 65 chars to satisfy Bing & Google Search Console
    let videoTitle = `Watch ${rawTitle}`;
    if (year) videoTitle += ` (${year})`;
    videoTitle += ` | My Donkey`;
    if (videoTitle.length > 65) {
        videoTitle = `${rawTitle.substring(0, 48)} | My Donkey`;
    }

    let seoDescription = `Stream ${rawTitle} (${year}) online free in HD on My Donkey. Watch full movies, TV shows, anime, and Marvel movies without subscription. ${rawOverview}`;
    if (seoDescription.length > 1000) {
        seoDescription = seoDescription.substring(0, 997) + '...';
    }

    const videoTagsSet = new Set();
    videoTagsSet.add('my donkey');
    videoTagsSet.add('watch free movies');
    videoTagsSet.add('free movies');
    videoTagsSet.add('hd streaming');

    if (type === 'tv') {
        videoTagsSet.add('tv shows');
        videoTagsSet.add('web series');
    } else {
        videoTagsSet.add('movies');
        videoTagsSet.add('full movie online');
    }

    if (isAnime) videoTagsSet.add('anime');
    if (isMarvel) videoTagsSet.add('marvel');
    if (isEnglish) videoTagsSet.add('hollywood');
    else videoTagsSet.add('bollywood');

    videoTagsSet.add(rawTitle.toLowerCase());
    genres.slice(0, 3).forEach(g => videoTagsSet.add(g.toLowerCase()));
    cast.slice(0, 2).forEach(c => { if (c.length < 25) videoTagsSet.add(c.toLowerCase()); });

    const videoTags = Array.from(videoTagsSet).slice(0, 20);

    let categoryStr = 'Movies';
    if (isAnime) categoryStr = 'Anime';
    else if (type === 'tv') categoryStr = 'TV Shows';
    else if (genres.length > 0) categoryStr = `${genres[0]} Movies`;

    let videoThumbnailUrl = backdropPath || posterPath;
    if (!videoThumbnailUrl && youtubeId) {
        videoThumbnailUrl = escapeXml(`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`);
    }

    let xml = '  <url>\n';
    xml += `    <loc>${escapeXml(mainUrl)}</loc>\n`;
    xml += `    <lastmod>${lastMod}</lastmod>\n`;
    xml += '    <changefreq>weekly</changefreq>\n';
    xml += `    <priority>${priority}</priority>\n`;

    if (posterPath) {
        xml += '    <image:image>\n';
        xml += `      <image:loc>${posterPath}</image:loc>\n`;
        xml += `      <image:title>${escapeXml(`Watch ${rawTitle} (${year}) Free Online - My Donkey`)}</image:title>\n`;
        xml += `      <image:caption>${escapeXml(`Stream ${rawTitle} in HD on My Donkey.`)}</image:caption>\n`;
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
    return xml;
}

function wrapUrlset(urlsXml) {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
    xml += '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"\n';
    xml += '        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n';
    xml += urlsXml;
    xml += '</urlset>\n';
    return xml;
}

async function generateStructuredSitemaps() {
    console.log(`🚀 Starting Structured, Multi-Tier Sitemap Generation for Google & Bing`);
    console.log(`Target Base URL: ${BASE_URL}\n`);

    const publicDir = path.resolve(__dirname, '../public');
    if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
    }

    const today = new Date().toISOString().split('T')[0];
    const generatedSitemaps = [];

    // 1. CORE MAIN SITEMAP (sitemap-main.xml)
    // Only 200 OK non-redirecting, non-auth canonical foundation pages
    const CORE_ROUTES = [
        { path: '/',           priority: '1.00', changefreq: 'daily',  title: 'My Donkey | Watch Free Movies, TV Shows & Anime in HD' },
        { path: '/movies',     priority: '0.95', changefreq: 'daily',  title: 'Watch Free Movies Online in HD | My Donkey' },
        { path: '/tv',         priority: '0.95', changefreq: 'daily',  title: 'Watch Free TV Shows & Web Series Online | My Donkey' },
        { path: '/anime',      priority: '0.95', changefreq: 'daily',  title: 'Watch Free Anime Online in HD | My Donkey' },
        { path: '/categories', priority: '0.90', changefreq: 'daily',  title: 'Browse Movies & TV Categories | My Donkey' },
        { path: '/exclusive',  priority: '0.85', changefreq: 'weekly', title: 'My Donkey Originals & Exclusive Movies' },
        { path: '/adblocker',  priority: '0.80', changefreq: 'weekly', title: 'Adblocker & Mobile DNS Setup Guide | My Donkey' },
        { path: '/sound-enhancements', priority: '0.80', changefreq: 'weekly', title: 'Sound Enhancements & Audio Booster | My Donkey' },
        { path: '/support',    priority: '0.80', changefreq: 'weekly', title: 'Help & Support Hub — Guides & FAQs | My Donkey' },
        { path: '/community-chat', priority: '0.80', changefreq: 'daily', title: 'Community Help Chat & Q&A Discussion | My Donkey' },
        { path: '/devices',    priority: '0.70', changefreq: 'monthly', title: 'Supported Devices — Smart TV, Mobile & PC | My Donkey' },
        { path: '/theatre-help', priority: '0.70', changefreq: 'monthly', title: '3D Virtual Cinema Theatre Guide | My Donkey' },
    ];

    let mainXml = '';
    for (const route of CORE_ROUTES) {
        mainXml += '  <url>\n';
        mainXml += `    <loc>${BASE_URL}${route.path}</loc>\n`;
        mainXml += `    <lastmod>${today}</lastmod>\n`;
        mainXml += `    <changefreq>${route.changefreq}</changefreq>\n`;
        mainXml += `    <priority>${route.priority}</priority>\n`;
        mainXml += '    <image:image>\n';
        mainXml += `      <image:loc>https://res.cloudinary.com/dpba1gvra/image/upload/v1770155013/logo_mgcysp.png</image:loc>\n`;
        mainXml += `      <image:title>${escapeXml(route.title)}</image:title>\n`;
        mainXml += `      <image:caption>${escapeXml('Stream on My Donkey - Free movies, TV shows, and anime streaming in HD.')}</image:caption>\n`;
        mainXml += '    </image:image>\n';
        mainXml += '  </url>\n';
    }

    const mainSitemapFile = 'sitemap-main.xml';
    fs.writeFileSync(path.join(publicDir, mainSitemapFile), wrapUrlset(mainXml), 'utf8');
    generatedSitemaps.push(mainSitemapFile);
    console.log(`✅ [1/5] Generated ${mainSitemapFile} (${CORE_ROUTES.length} core canonical URLs)`);

    // 2. CATEGORIES & GENRES SITEMAP (sitemap-categories.xml)
    // Matches high-volume keywords from Bing Keyword Research
    const CATEGORY_GENRES = [
        'Action', 'Adventure', 'Animation', 'Comedy', 'Crime',
        'Documentary', 'Drama', 'Family', 'Fantasy', 'Horror',
        'Mystery', 'Romance', 'Sci-Fi', 'Sports', 'Thriller'
    ];
    const REGIONS = ['indian', 'global', 'all'];

    let catXml = '';
    for (const reg of REGIONS) {
        catXml += '  <url>\n';
        catXml += `    <loc>${BASE_URL}/categories?region=${reg}</loc>\n`;
        catXml += `    <lastmod>${today}</lastmod>\n`;
        catXml += '    <changefreq>daily</changefreq>\n';
        catXml += '    <priority>0.85</priority>\n';
        catXml += '  </url>\n';
    }

    for (const genre of CATEGORY_GENRES) {
        catXml += '  <url>\n';
        catXml += `    <loc>${BASE_URL}/categories?genre=${encodeURIComponent(genre)}</loc>\n`;
        catXml += `    <lastmod>${today}</lastmod>\n`;
        catXml += '    <changefreq>daily</changefreq>\n';
        catXml += '    <priority>0.85</priority>\n';
        catXml += '  </url>\n';
    }

    const catSitemapFile = 'sitemap-categories.xml';
    fs.writeFileSync(path.join(publicDir, catSitemapFile), wrapUrlset(catXml), 'utf8');
    generatedSitemaps.push(catSitemapFile);
    console.log(`✅ [2/5] Generated ${catSitemapFile} (${REGIONS.length + CATEGORY_GENRES.length} category URLs)`);

    // 3. FETCH & FILTER CONTENT FROM FIRESTORE
    console.log('\n🔄 Fetching catalog documents from Firestore...');
    const documents = await fetchAllDocuments('content');
    console.log(`📥 Total Firestore documents retrieved: ${documents.length}`);

    const titleGroups = new Map();
    let skippedUnpublished = 0;
    let skippedInvalid = 0;

    documents.forEach(doc => {
        const fields = doc.fields || {};
        const pathParts = doc.name.split('/');
        const id = pathParts[pathParts.length - 1];

        if (!getBool(fields.isPublished)) {
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

        if (!posterPath && !backdropPath && !videoUrl && !youtubeId && !movieYoutubeId && seasons.length === 0) {
            skippedInvalid++;
            return;
        }

        const normTitle = rawTitle.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
        if (!titleGroups.has(normTitle)) {
            titleGroups.set(normTitle, []);
        }

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

    const canonicalDocs = [];
    titleGroups.forEach((entries) => {
        entries.sort((a, b) => b.score - a.score);
        canonicalDocs.push(entries[0]);
    });

    console.log(`🎯 Retained ${canonicalDocs.length} unique, canonical, indexable content items.`);

    // 4. PARTITION CONTENT INTO TV, ANIME, AND MOVIES CHUNKS
    const tvDocs = [];
    const animeDocs = [];
    const movieDocs = [];

    canonicalDocs.forEach(item => {
        const type = getStr(item.fields.type) || 'movie';
        const genres = getArray(item.fields.genres).map(v => cleanText(v?.stringValue)).filter(Boolean);
        const tags = getArray(item.fields.tags).map(v => cleanText(v?.stringValue)).filter(Boolean);
        const isAnime = isAnimeContent(item.rawTitle, cleanText(getStr(item.fields.overview)), genres, tags);

        if (isAnime) {
            animeDocs.push(item);
        } else if (type === 'tv' || item.seasons?.length > 0) {
            tvDocs.push(item);
        } else {
            movieDocs.push(item);
        }
    });

    console.log(`📊 Catalog Breakdown: Movies=${movieDocs.length}, TV & Web Series=${tvDocs.length}, Anime=${animeDocs.length}`);

    // Generate TV & Web Series Sitemap (sitemap-tv.xml)
    let tvXml = '';
    tvDocs.forEach(item => { tvXml += buildContentUrlXml(item, today); });
    const tvSitemapFile = 'sitemap-tv.xml';
    fs.writeFileSync(path.join(publicDir, tvSitemapFile), wrapUrlset(tvXml), 'utf8');
    generatedSitemaps.push(tvSitemapFile);
    console.log(`✅ [3/5] Generated ${tvSitemapFile} (${tvDocs.length} TV Shows & Web Series)`);

    // Generate Anime Sitemap (sitemap-anime.xml)
    let animeXml = '';
    animeDocs.forEach(item => { animeXml += buildContentUrlXml(item, today); });
    const animeSitemapFile = 'sitemap-anime.xml';
    fs.writeFileSync(path.join(publicDir, animeSitemapFile), wrapUrlset(animeXml), 'utf8');
    generatedSitemaps.push(animeSitemapFile);
    console.log(`✅ [4/5] Generated ${animeSitemapFile} (${animeDocs.length} Anime items)`);

    // Generate Partitioned Movie Sitemaps (sitemap-movies-1.xml, sitemap-movies-2.xml, ...)
    // Partition into chunks of 2,000 for rapid crawl efficiency & 0 crawl budget timeouts
    const MOVIE_CHUNK_SIZE = 2000;
    const movieChunks = [];
    for (let i = 0; i < movieDocs.length; i += MOVIE_CHUNK_SIZE) {
        movieChunks.push(movieDocs.slice(i, i + MOVIE_CHUNK_SIZE));
    }

    movieChunks.forEach((chunk, idx) => {
        let chunkXml = '';
        chunk.forEach(item => { chunkXml += buildContentUrlXml(item, today); });
        const fileName = movieChunks.length === 1 ? 'sitemap-movies.xml' : `sitemap-movies-${idx + 1}.xml`;
        fs.writeFileSync(path.join(publicDir, fileName), wrapUrlset(chunkXml), 'utf8');
        generatedSitemaps.push(fileName);
        console.log(`✅ [5/5] Generated ${fileName} (${chunk.length} Movie titles)`);
    });

    // 5. MASTER SITEMAP INDEX (sitemap.xml)
    // Sitemaps.org official <sitemapindex> specification
    let indexXml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    indexXml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    for (const smFile of generatedSitemaps) {
        indexXml += '  <sitemap>\n';
        indexXml += `    <loc>${BASE_URL}/${smFile}</loc>\n`;
        indexXml += `    <lastmod>${today}</lastmod>\n`;
        indexXml += '  </sitemap>\n';
    }
    indexXml += '</sitemapindex>\n';

    const masterSitemapPath = path.join(publicDir, 'sitemap.xml');
    fs.writeFileSync(masterSitemapPath, indexXml, 'utf8');

    const totalIndexedUrls = CORE_ROUTES.length + REGIONS.length + CATEGORY_GENRES.length + tvDocs.length + animeDocs.length + movieDocs.length;

    console.log('\n======================================================');
    console.log(`🏆 MASTER SITEMAP INDEX GENERATED at: ${masterSitemapPath}`);
    console.log(`📁 Total Sub-Sitemaps: ${generatedSitemaps.length}`);
    console.log(`📈 Total Canonical Content URLs: ${totalIndexedUrls}`);
    console.log('Sub-Sitemaps registered:');
    generatedSitemaps.forEach(sm => console.log(`   👉 ${BASE_URL}/${sm}`));
    console.log('======================================================\n');
}

generateStructuredSitemaps().catch(err => {
    console.error('❌ Sitemap Generation Failed:', err);
    process.exit(1);
});
