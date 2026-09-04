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
    return true; // Default to English / Global
}

async function generateSitemap() {
    console.log(`🚀 Starting SEO & Keyword-Enriched Sitemap Generation`);
    console.log(`Target Base URL: ${BASE_URL}`);

    try {
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
        xml += '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"\n';
        xml += '        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n';

        const today = new Date().toISOString().split('T')[0];
        let totalUrls = 0;

        // 1. Core Top-Level Routes with keyword-rich titles and metadata
        const CORE_ROUTES = [
            { path: '/',           priority: '1.00', changefreq: 'daily',   title: 'My Donkey | Watch Free Movies, TV Shows, Anime & Marvel Movies Online in HD' },
            { path: '/home',       priority: '1.00', changefreq: 'daily',   title: 'My Donkey Home — Stream Free Movies, Shows & Anime' },
            { path: '/movies',     priority: '0.95', changefreq: 'daily',   title: 'Watch Free Movies Online | Bollywood, Hollywood & English Movies - My Donkey' },
            { path: '/tv',         priority: '0.95', changefreq: 'daily',   title: 'Watch Free TV Shows & Web Series Online | All Seasons - My Donkey' },
            { path: '/anime',      priority: '0.95', changefreq: 'daily',   title: 'Watch Free Anime Online in HD | Anime Series & Movies - My Donkey' },
            { path: '/categories', priority: '0.90', changefreq: 'daily',   title: 'Browse All Movies & TV Series Categories | My Donkey' },
            { path: '/search',     priority: '0.90', changefreq: 'daily',   title: 'Search Free Movies, TV Shows, Anime & Marvel Movies | My Donkey' },
            { path: '/exclusive',  priority: '0.85', changefreq: 'weekly',  title: 'My Donkey Originals & Exclusive Movies' },
            { path: '/adblocker',  priority: '0.80', changefreq: 'weekly',  title: 'Adblocker & Mobile DNS Setup Guide | My Donkey' },
            { path: '/my-list',    priority: '0.75', changefreq: 'weekly',  title: 'My Watchlist — Save and Watch Free Movies Online' },
            { path: '/about',      priority: '0.70', changefreq: 'monthly', title: 'About My Donkey — Free Online Movie & Series Streaming Platform' },
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
        console.log(`✅ Added ${CORE_ROUTES.length} core static routes.`);

        // 2. All 18 Genre Category Landing URLs
        const GENRES = [
            { id: 'Action',      name: 'Action',      desc: 'Watch Free Action Movies, Thrillers & Combat Series Online' },
            { id: 'Adventure',   name: 'Adventure',   desc: 'Watch Free Adventure Movies & Quests Online' },
            { id: 'Animation',   name: 'Animation',   desc: 'Watch Free Animated Movies, Anime & Cartoons Online' },
            { id: 'Biography',   name: 'Biography',   desc: 'Watch Real Life Biographies, Legends & True Stories Free' },
            { id: 'Comedy',      name: 'Comedy',      desc: 'Watch Free Comedy Movies, Standup & Fun Shows Online' },
            { id: 'Crime',       name: 'Crime',       desc: 'Watch Free Crime Movies, Gangster Dramas & Heists Online' },
            { id: 'Documentary', name: 'Documentary', desc: 'Watch Free Documentaries & Real World Revelations Online' },
            { id: 'Drama',       name: 'Drama',       desc: 'Watch Free Drama Movies, Emotional Stories & Series Online' },
            { id: 'Family',      name: 'Family',      desc: 'Watch Free Family Movies for Kids and All Ages Online' },
            { id: 'Fantasy',     name: 'Fantasy',     desc: 'Watch Free Fantasy Movies, Mythical Beasts & Magic Online' },
            { id: 'History',     name: 'History',     desc: 'Watch Free Historic War & Historical Movies Online' },
            { id: 'Horror',      name: 'Horror',      desc: 'Watch Free Horror Movies, Haunted Stories & Thrillers Online' },
            { id: 'Mystery',     name: 'Mystery',     desc: 'Watch Free Mystery Movies, Detective Stories & Whodunits' },
            { id: 'Romance',     name: 'Romance',     desc: 'Watch Free Romantic Movies & Love Stories Online' },
            { id: 'Sci-Fi',      name: 'Sci-Fi',      desc: 'Watch Free Sci-Fi Movies, Space & Futuristic Series Online' },
            { id: 'Sport',       name: 'Sport',       desc: 'Watch Free Sports Movies, Matches & Cricket Highlights' },
            { id: 'Thriller',    name: 'Thriller',    desc: 'Watch Free Suspense Thrillers & Edge-of-Seat Movies Online' },
            { id: 'War',         name: 'War',         desc: 'Watch Free War Movies, Battlefields & Military Dramas' },
        ];

        for (const genre of GENRES) {
            const genreUrl = `${BASE_URL}/categories?genre=${encodeURIComponent(genre.id)}`;
            xml += '  <url>\n';
            xml += `    <loc>${escapeXml(genreUrl)}</loc>\n`;
            xml += `    <lastmod>${today}</lastmod>\n`;
            xml += '    <changefreq>daily</changefreq>\n';
            xml += '    <priority>0.88</priority>\n';
            xml += '    <image:image>\n';
            xml += `      <image:loc>https://res.cloudinary.com/dpba1gvra/image/upload/v1770155013/logo_mgcysp.png</image:loc>\n`;
            xml += `      <image:title>${escapeXml(`${genre.name} Movies & TV Shows - Watch Free on My Donkey`)}</image:title>\n`;
            xml += `      <image:caption>${escapeXml(genre.desc)}</image:caption>\n`;
            xml += '    </image:image>\n';
            xml += '  </url>\n';
            totalUrls++;
        }
        console.log(`✅ Added ${GENRES.length} genre category landing routes.`);

        // 3. Regional & Language Subcategory Landing URLs
        const REGIONAL_CATEGORIES = [
            { region: 'global', subRegion: 'en', label: 'English Movies & Hollywood Hits', emoji: '🗽' },
            { region: 'indian', subRegion: 'hi', label: 'Hindi Movies & Bollywood Hits', emoji: '🎬' },
            { region: 'indian', subRegion: 'te', label: 'Telugu Movies & Tollywood Hits', emoji: '⚡' },
            { region: 'indian', subRegion: 'ta', label: 'Tamil Movies & Kollywood Hits', emoji: '⚡' },
            { region: 'indian', subRegion: 'ml', label: 'Malayalam Movies & Mollywood Hits', emoji: '🌊' },
            { region: 'indian', subRegion: 'kn', label: 'Kannada Movies & Sandalwood Hits', emoji: '👑' },
            { region: 'indian', subRegion: 'pa', label: 'Punjabi Movies & Pollywood Hits', emoji: '🌾' },
            { region: 'indian', subRegion: 'bn', label: 'Bengali Movies & Series', emoji: '🎭' },
            { region: 'indian', subRegion: 'mr', label: 'Marathi Movies & Regional Hits', emoji: '🏔️' },
            { region: 'global', subRegion: 'ko', label: 'Korean Drama & K-Drama Series', emoji: '🇰🇷' },
            { region: 'global', subRegion: 'ja', label: 'Japanese Anime & J-Drama', emoji: '🎌' },
            { region: 'global', subRegion: 'es', label: 'Spanish Movies & Latino Hits', emoji: '🇪🇸' },
            { region: 'global', subRegion: 'fr', label: 'French Cinema & European Hits', emoji: '🇫🇷' },
        ];

        for (const reg of REGIONAL_CATEGORIES) {
            const regUrl = `${BASE_URL}/categories?region=${reg.region}&subRegion=${reg.subRegion}`;
            xml += '  <url>\n';
            xml += `    <loc>${escapeXml(regUrl)}</loc>\n`;
            xml += `    <lastmod>${today}</lastmod>\n`;
            xml += '    <changefreq>daily</changefreq>\n';
            xml += '    <priority>0.88</priority>\n';
            xml += '    <image:image>\n';
            xml += `      <image:loc>https://res.cloudinary.com/dpba1gvra/image/upload/v1770155013/logo_mgcysp.png</image:loc>\n`;
            xml += `      <image:title>${escapeXml(`Watch ${reg.label} Free Online | My Donkey`)}</image:title>\n`;
            xml += `      <image:caption>${escapeXml(`Stream ${reg.label} in HD. Watch free movies and series on My Donkey.`)}</image:caption>\n`;
            xml += '    </image:image>\n';
            xml += '  </url>\n';
            totalUrls++;
        }
        console.log(`✅ Added ${REGIONAL_CATEGORIES.length} regional and language landing routes.`);

        // 4. Keyword Search Landing URLs (directly targeted for Google Search queries)
        const KEYWORD_SEARCHES = [
            { q: 'donkey',                     title: 'Donkey Movies & Shows — Watch Free Online on My Donkey' },
            { q: 'my',                         title: 'My Donkey Free Streaming — Movies, Series & Anime' },
            { q: 'my donkey',                  title: 'My Donkey — Watch Free Movies, TV Shows & Anime Online' },
            { q: 'my donkey movies',           title: 'My Donkey Movies — Unlimited Free HD Streaming' },
            { q: 'movies',                     title: 'Watch Free Movies Online in HD | My Donkey' },
            { q: 'tv shows',                   title: 'Watch Free TV Shows & Web Series Online | My Donkey' },
            { q: 'anime',                      title: 'Watch Free Anime Online — Subbed & Dubbed | My Donkey' },
            { q: 'marvel movies',              title: 'Watch Marvel Movies Online Free in HD | My Donkey' },
            { q: 'english movies',             title: 'Watch English Movies & Hollywood Hits Online Free | My Donkey' },
            { q: 'watch free movies',          title: 'Watch Free Movies Online — No Subscription Needed | My Donkey' },
            { q: 'online free movies',         title: 'Online Free Movies Streaming in Full HD | My Donkey' },
            { q: 'free movies',                title: 'Free Movies Online — Thousands of Films Streaming Free | My Donkey' },
            { q: 'free movies online',         title: 'Free Movies Online — Watch Anywhere on Mobile, TV & PC' },
            { q: 'hindi movies',               title: 'Watch Hindi Movies Online Free | Bollywood Hits | My Donkey' },
            { q: 'bollywood movies',           title: 'Watch Bollywood Movies Online Free | My Donkey' },
            { q: 'hollywood movies',           title: 'Watch Hollywood Movies Online Free in HD | My Donkey' },
            { q: 'web series',                 title: 'Watch Web Series Online Free — All Seasons & Episodes | My Donkey' },
            { q: 'action movies',              title: 'Watch Free Action Movies Online | My Donkey' },
            { q: 'comedy movies',              title: 'Watch Free Comedy Movies Online | My Donkey' },
            { q: 'horror movies',              title: 'Watch Free Horror Movies Online | My Donkey' },
            { q: 'romantic movies',            title: 'Watch Free Romantic Movies Online | My Donkey' },
            { q: 'sci fi movies',              title: 'Watch Free Sci-Fi Movies Online | My Donkey' },
            { q: 'thriller movies',            title: 'Watch Free Thriller & Suspense Movies Online | My Donkey' },
            { q: 'south indian movies',        title: 'Watch South Indian Movies Hindi Dubbed Free | My Donkey' },
            { q: 'avengers movies',            title: 'Watch Avengers & Superhero Movies Online Free | My Donkey' },
            { q: 'dc movies',                  title: 'Watch DC Superhero Movies Online Free | My Donkey' },
            { q: 'watch anime online free',    title: 'Watch Anime Online Free in High Definition | My Donkey' },
            { q: 'watch series online',        title: 'Watch Series Online Free — HD Streaming | My Donkey' },
            { q: 'hd movies online',           title: 'HD Movies Online — Stream Free in 1080p & 4K | My Donkey' },
            { q: 'latest movies 2026',         title: 'Latest Movies 2026 — Watch New Releases Online Free | My Donkey' },
            { q: 'free streaming movies',      title: 'Free Streaming Movies & TV Shows | My Donkey OTT' },
            { q: 'korean drama',               title: 'Watch Korean Dramas Online Free with Subtitles | My Donkey' },
        ];

        for (const item of KEYWORD_SEARCHES) {
            const searchUrl = `${BASE_URL}/search?q=${encodeURIComponent(item.q)}`;
            xml += '  <url>\n';
            xml += `    <loc>${escapeXml(searchUrl)}</loc>\n`;
            xml += `    <lastmod>${today}</lastmod>\n`;
            xml += '    <changefreq>daily</changefreq>\n';
            xml += '    <priority>0.85</priority>\n';
            xml += '    <image:image>\n';
            xml += `      <image:loc>https://res.cloudinary.com/dpba1gvra/image/upload/v1770155013/logo_mgcysp.png</image:loc>\n`;
            xml += `      <image:title>${escapeXml(item.title)}</image:title>\n`;
            xml += `      <image:caption>${escapeXml(`Search results for ${item.q} on My Donkey. Stream online free movies, TV shows, and anime in HD.`)}</image:caption>\n`;
            xml += '    </image:image>\n';
            xml += '  </url>\n';
            totalUrls++;
        }
        console.log(`✅ Added ${KEYWORD_SEARCHES.length} keyword search landing routes.`);

        // 5. Fetch Dynamic Content from Firestore
        console.log('🔄 Fetching all content from Firestore...');
        const documents = await fetchAllDocuments('content');
        console.log(`📥 Total Firestore documents retrieved: ${documents.length}`);

        let contentCount = 0;
        let episodeCount = 0;

        documents.forEach(doc => {
            const fields = doc.fields || {};
            const pathParts = doc.name.split('/');
            const id = pathParts[pathParts.length - 1];

            if (getBool(fields.isPublished)) {
                const type = getStr(fields.type) || 'movie';
                const rawTitle = cleanText(getStr(fields.title)) || 'Featured Title';
                const rawOverview = cleanText(getStr(fields.overview)) || `${rawTitle} available to stream free in HD on My Donkey.`;
                const posterPath = resolveImageUrl(getStr(fields.poster_path));
                const backdropPath = resolveImageUrl(getStr(fields.backdrop_path));
                const releaseDate = getStr(fields.release_date) || '';
                const year = getNum(fields.year) || (releaseDate ? parseInt(releaseDate.split('-')[0]) : new Date().getFullYear());
                const youtubeId = getStr(fields.youtubeId);
                const videoUrl = getStr(fields.videoUrl);

                // Extract genres and cast
                const genres = getArray(fields.genres).map(v => cleanText(v?.stringValue)).filter(Boolean);
                const cast = getArray(fields.cast).map(v => cleanText(v?.stringValue)).filter(Boolean);
                const tags = getArray(fields.tags).map(v => cleanText(v?.stringValue)).filter(Boolean);

                let lastMod = today;
                if (fields.updatedAt) lastMod = getTimestamp(fields.updatedAt);
                else if (fields.createdAt) lastMod = getTimestamp(fields.createdAt);
                if (lastMod.includes('T')) lastMod = lastMod.split('T')[0];

                const mainUrl = `${BASE_URL}/browse/${id}`;
                const priority = (type === 'movie' || type === 'tv') ? '0.85' : '0.70';

                // Categorization & Keywords detection
                const isMarvel = isMarvelContent(rawTitle, rawOverview, genres, tags);
                const isAnime = isAnimeContent(rawTitle, rawOverview, genres, tags);
                const isEnglish = isEnglishContent(rawTitle, rawOverview, genres, tags, cast);

                // SEO-optimized video title (Google Video max: 100 characters)
                let videoTitle = `Watch ${rawTitle}`;
                if (year) videoTitle += ` (${year})`;
                videoTitle += ` Online Free | My Donkey`;
                if (videoTitle.length > 100) {
                    videoTitle = `Watch ${rawTitle} Online Free | My Donkey`;
                    if (videoTitle.length > 100) {
                        videoTitle = videoTitle.substring(0, 97) + '...';
                    }
                }

                // SEO-optimized video description (Google Video max: 2048 characters)
                let seoDescription = `Stream ${rawTitle} (${year}) online free in HD on My Donkey. Watch full movies, TV shows, anime, and Marvel movies without subscription. ${rawOverview}`;
                if (seoDescription.length > 2040) {
                    seoDescription = seoDescription.substring(0, 2037) + '...';
                }

                // Construct Video Tags (Google allows up to 32 tags per video)
                const videoTagsSet = new Set();

                // Core mandatory keywords
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

                // Add title itself and title-specific search query
                videoTagsSet.add(rawTitle.toLowerCase());
                if (rawTitle.length < 24) {
                    videoTagsSet.add(`watch ${rawTitle.toLowerCase()}`);
                }

                // Add genres (up to 4)
                genres.slice(0, 4).forEach(g => {
                    videoTagsSet.add(g.toLowerCase());
                    videoTagsSet.add(`${g.toLowerCase()} movies`);
                });

                // Add main cast (up to 3)
                cast.slice(0, 3).forEach(actor => {
                    if (actor && actor.length < 30) {
                        videoTagsSet.add(actor.toLowerCase());
                    }
                });

                // Convert to array and limit to 32 tags
                const videoTags = Array.from(videoTagsSet).slice(0, 32);

                // Determine category string
                let categoryStr = 'Movies';
                if (isAnime) categoryStr = 'Anime';
                else if (type === 'tv') categoryStr = 'TV Shows';
                else if (genres.length > 0) categoryStr = `${genres[0]} Movies`;

                // Thumbnail URL
                let videoThumbnailUrl = backdropPath || posterPath;
                if (!videoThumbnailUrl && youtubeId) {
                    videoThumbnailUrl = escapeXml(`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`);
                }

                // Start building URL element
                xml += '  <url>\n';
                xml += `    <loc>${escapeXml(mainUrl)}</loc>\n`;
                xml += `    <lastmod>${lastMod}</lastmod>\n`;
                xml += '    <changefreq>weekly</changefreq>\n';
                xml += `    <priority>${priority}</priority>\n`;

                // Add Google Image Sitemaps
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

                // Add Google Video Sitemap
                if (videoThumbnailUrl) {
                    xml += '    <video:video>\n';
                    xml += `      <video:thumbnail_loc>${videoThumbnailUrl}</video:thumbnail_loc>\n`;
                    xml += `      <video:title>${escapeXml(videoTitle)}</video:title>\n`;
                    xml += `      <video:description>${escapeXml(seoDescription)}</video:description>\n`;
                    if (releaseDate) {
                        xml += `      <video:publication_date>${escapeXml(releaseDate)}</video:publication_date>\n`;
                    }
                    if (youtubeId) {
                        xml += `      <video:player_loc allow_embed="yes" autoplay="ap=1">${escapeXml(`https://www.youtube.com/embed/${youtubeId}`)}</video:player_loc>\n`;
                    } else if (videoUrl && videoUrl.startsWith('http')) {
                        xml += `      <video:player_loc allow_embed="yes">${escapeXml(videoUrl)}</video:player_loc>\n`;
                    }
                    xml += `      <video:category>${escapeXml(categoryStr)}</video:category>\n`;
                    xml += '      <video:family_friendly>yes</video:family_friendly>\n';
                    xml += '      <video:uploader info="https://www.mydonkey.in">My Donkey</video:uploader>\n';
                    xml += '      <video:platform relationship="allow">web mobile tv</video:platform>\n';

                    // Inject video tags
                    for (const tag of videoTags) {
                        xml += `      <video:tag>${escapeXml(tag)}</video:tag>\n`;
                    }

                    xml += '    </video:video>\n';
                }

                xml += '  </url>\n';
                contentCount++;
                totalUrls++;

                // Process Episodes if TV Show has seasons embedded
                if (type === 'tv' && fields.seasons) {
                    const seasonsData = getArray(fields.seasons);
                    seasonsData.forEach(seasonItem => {
                        const seasonObj = seasonItem.mapValue?.fields || {};
                        const sNumber = getNum(seasonObj.seasonNumber) || 1;
                        const episodesData = getArray(seasonObj.episodes);

                        episodesData.forEach(epItem => {
                            const epObj = epItem.mapValue?.fields || {};
                            const epNumber = getNum(epObj.episodeNumber) || 1;
                            let epTitle = cleanText(getStr(epObj.title));
                            if (!epTitle) epTitle = `${rawTitle} Season ${sNumber} Episode ${epNumber}`;
                            const epOverview = cleanText(getStr(epObj.overview)) || `Watch ${epTitle} online free in HD on My Donkey.`;
                            const epStill = resolveImageUrl(getStr(epObj.stillUrl));
                            const epYoutubeId = getStr(epObj.youtubeId);

                            const epUrl = `${mainUrl}?season=${sNumber}&episode=${epNumber}`;
                            let epThumb = epStill || backdropPath || posterPath;
                            if (!epThumb && epYoutubeId) {
                                epThumb = escapeXml(`https://img.youtube.com/vi/${epYoutubeId}/hqdefault.jpg`);
                            }

                            xml += '  <url>\n';
                            xml += `    <loc>${escapeXml(epUrl)}</loc>\n`;
                            xml += `    <lastmod>${lastMod}</lastmod>\n`;
                            xml += '    <changefreq>monthly</changefreq>\n';
                            xml += '    <priority>0.70</priority>\n';

                            if (epThumb) {
                                xml += '    <image:image>\n';
                                xml += `      <image:loc>${epThumb}</image:loc>\n`;
                                xml += `      <image:title>${escapeXml(`Watch ${epTitle} Free Online - My Donkey`)}</image:title>\n`;
                                xml += `      <image:caption>${escapeXml(`Stream ${epTitle} in HD on My Donkey.`)}</image:caption>\n`;
                                xml += '    </image:image>\n';

                                xml += '    <video:video>\n';
                                xml += `      <video:thumbnail_loc>${epThumb}</video:thumbnail_loc>\n`;
                                xml += `      <video:title>${escapeXml(`Watch ${epTitle} Online Free | My Donkey`)}</video:title>\n`;
                                xml += `      <video:description>${escapeXml(`Stream ${epTitle} free on My Donkey. Watch full TV episodes and web series online in HD. ${epOverview}`)}</video:description>\n`;
                                if (epYoutubeId) {
                                    xml += `      <video:player_loc allow_embed="yes">${escapeXml(`https://www.youtube.com/embed/${epYoutubeId}`)}</video:player_loc>\n`;
                                }
                                xml += `      <video:category>${escapeXml(categoryStr)}</video:category>\n`;
                                xml += '      <video:family_friendly>yes</video:family_friendly>\n';
                                xml += '      <video:uploader info="https://www.mydonkey.in">My Donkey</video:uploader>\n';
                                xml += '      <video:platform relationship="allow">web mobile tv</video:platform>\n';
                                xml += '      <video:tag>donkey</video:tag>\n';
                                xml += '      <video:tag>my donkey</video:tag>\n';
                                xml += '      <video:tag>watch free movies</video:tag>\n';
                                xml += '      <video:tag>online free movies</video:tag>\n';
                                xml += '      <video:tag>tv shows</video:tag>\n';
                                xml += '      <video:tag>web series</video:tag>\n';
                                xml += `      <video:tag>${escapeXml(rawTitle.toLowerCase())}</video:tag>\n`;
                                xml += '    </video:video>\n';
                            }

                            xml += '  </url>\n';
                            episodeCount++;
                            totalUrls++;
                        });
                    });
                }
            }
        });

        console.log(`✅ Added ${contentCount} dynamic content pages.`);
        if (episodeCount > 0) {
            console.log(`✅ Added ${episodeCount} dynamic episode pages.`);
        }

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
        console.log(`✨ Ultra Detailed Sitemap generated successfully at: ${sitemapPath}`);
        console.log(`📊 Total URLs in sitemap: ${totalUrls}`);
        console.log(`📦 File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB (${stats.size} bytes)`);

    } catch (error) {
        console.error('❌ Sitemap Generation Failed:', error);
        process.exit(1);
    }
}

generateSitemap();
