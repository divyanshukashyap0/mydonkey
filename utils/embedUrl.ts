import { SiteSettings, StreamServerKey } from '../types';
export type { StreamServerKey };

export const DEFAULT_EMBED_PROXY_BASE = 'https://proxy.garageband.rocks';
export const DEFAULT_MOVIE_TYPE = 'movie';
export const DEFAULT_TV_TYPE = 'tv';

/**
 * Gets the configured base content provider server key or falls back to 'bingr'.
 */
export const getBaseContentServer = (settings?: Partial<SiteSettings>): StreamServerKey => {
    if (settings?.baseContentServer && STREAM_SERVERS.some(s => s.key === settings.baseContentServer)) {
        return settings.baseContentServer;
    }
    return 'bingr';
};

/**
 * Builds an embed proxy URL using configured settings or defaults.
 * e.g. https://proxy.garageband.rocks/embed/movie/tt1234567
 *      https://proxy.garageband.rocks/embed/tv/tt0903747
 */
export const buildEmbedUrl = (
    imdbId: string | number,
    type: 'movie' | 'tv' | string = 'movie',
    settings?: Partial<SiteSettings>,
    seasonNumber?: number,
    episodeNumber?: number
): string => {
    if (imdbId === undefined || imdbId === null || imdbId === '') return '';
    const cleanId = String(imdbId).trim();
    if (!cleanId) return '';
    const base = (settings?.embedProxyBaseUrl || DEFAULT_EMBED_PROXY_BASE).replace(/\/+$/, '');

    let typeSegment = type;
    if (type === 'movie') {
        typeSegment = settings?.embedMovieType || DEFAULT_MOVIE_TYPE;
    } else if (type === 'tv') {
        typeSegment = settings?.embedTvType || DEFAULT_TV_TYPE;
    }

    let url = `${base}/embed/${typeSegment}/${cleanId}`;
    if (type === 'tv' && seasonNumber !== undefined && episodeNumber !== undefined) {
        url += `/${seasonNumber}/${episodeNumber}`;
    }
    return url;
};

/**
 * Parses the content type segment (/embed/{contentType}/) from a URL, if present.
 */
export const parseEmbedContentType = (url: string): string | null => {
    if (!url) return null;
    const match = url.match(/\/embed\/([a-zA-Z0-9_-]+)(?:\/|$)/);
    return match ? match[1] : null;
};

/**
 * Replaces the embed content type segment in an existing embed URL with a new one,
 * or formats raw IMDb IDs / links into the desired embed URL.
 * e.g. https://proxy.garageband.rocks/embed/movie/tt123 -> https://proxy.garageband.rocks/embed/tv/tt123
 */
export const switchEmbedContentType = (
    url: string,
    newType: string,
    settings?: Partial<SiteSettings>
): string => {
    if (!url) return '';
    const trimmed = url.trim();
    const base = (settings?.embedProxyBaseUrl || DEFAULT_EMBED_PROXY_BASE).replace(/\/+$/, '');

    // If it already has /embed/xyz/
    if (/\/embed\/[a-zA-Z0-9_-]+\//.test(trimmed)) {
        return trimmed.replace(/\/embed\/[a-zA-Z0-9_-]+\//, `/embed/${newType}/`);
    }

    // If it's a raw IMDb ID or imdb.com link
    const match = trimmed.match(/(tt\d+)/);
    if (match) {
        return `${base}/embed/${newType}/${match[1]}`;
    }

    return trimmed;
};

/**
 * Robustly extracts a Google Drive file ID from URLs or raw IDs.
 * Supports /file/d/ID, ?id=ID, uc?id=ID, and raw 25+ char alphanumeric IDs.
 */
export const extractDriveId = (url: string): string => {
    if (!url) return '';
    const trimmed = String(url).trim();
    if (!trimmed) return '';
    if (
        trimmed.includes('youtube.com') ||
        trimmed.includes('youtu.be') ||
        trimmed.includes('proxy.garageband.rocks') ||
        trimmed.includes('imdb.com')
    ) {
        return '';
    }

    // Google Drive direct file path: /file/d/{id}
    const driveUrlMatch = trimmed.match(/\/file\/d\/([-\w]{25,})/);
    if (driveUrlMatch) return driveUrlMatch[1];

    // Google Drive URL query param: ?id={id} or &id={id}
    const driveOpenMatch = trimmed.match(/[?&]id=([-\w]{25,})/);
    if (driveOpenMatch) return driveOpenMatch[1];

    // If host is explicitly google drive or docs and contains a drive token
    if (trimmed.includes('drive.google.com') || trimmed.includes('docs.google.com')) {
        const tokenMatch = trimmed.match(/[-\w]{25,}/);
        if (tokenMatch) return tokenMatch[0];
    }

    // Raw Google Drive ID: length >= 25, no slashes, not an IMDb tt id, not a protocol
    if (/^[-\w]{25,}$/.test(trimmed) && !trimmed.startsWith('tt') && !trimmed.startsWith('http')) {
        return trimmed;
    }

    return '';
};

/**
 * Checks whether content or episode has a Google Drive link or ID configured.
 */
export const hasDriveSource = (item?: { movieDriveId?: string; videoUrl?: string; driveId?: string } | null): boolean => {
    if (!item) return false;
    if (item.movieDriveId && extractDriveId(item.movieDriveId)) return true;
    if (item.driveId && extractDriveId(item.driveId)) return true;
    if (item.videoUrl && extractDriveId(item.videoUrl)) return true;
    return false;
};

/**
 * Checks whether a URL is an external stream embed URL.
 */
export const isExternalEmbedUrl = (url?: string, embedBaseHost?: string): boolean => {
    if (!url) return false;
    const lower = url.toLowerCase();
    if (lower.includes('/api/stream')) return false;
    if (lower.includes('.r2.dev') || lower.includes('.cloudflarestorage.com')) return false;
    if (lower.includes('proxy.garageband.rocks')) return true;
    if (
        lower.includes('vidstuck.xyz') ||
        lower.includes('zxcstream.xyz') ||
        lower.includes('bingr.one') ||
        lower.includes('nxsha.space') ||
        lower.includes('vidlink.pro') ||
        lower.includes('vidnest.fun') ||
        lower.includes('megaplay.buzz') ||
        lower.includes('4animo.xyz') ||
        lower.includes('zokoanime.video')
    ) {
        return true;
    }
    if (embedBaseHost && lower.includes(embedBaseHost.toLowerCase())) return true;
    if (lower.includes('/embed/movie/') || lower.includes('/embed/tv/')) return true;
    if (lower.includes('imdb.com')) return true;
    return false;
};

/**
 * Checks whether a URL is a direct video link (MP4, MKV, WebM, HLS, or Cloudflare R2 bucket).
 */
export const isDirectVideoUrl = (url?: string): boolean => {
    if (!url) return false;
    const trimmed = url.trim();
    if (!trimmed) return false;
    const lower = trimmed.toLowerCase();
    const urlWithoutQuery = lower.split('?')[0];

    // Standard video extensions
    const videoExtensions = ['.mp4', '.webm', '.mkv', '.ogg', '.mov', '.avi', '.ts', '.flv', '.m3u8'];
    if (videoExtensions.some(ext => urlWithoutQuery.endsWith(ext) || urlWithoutQuery.includes(ext))) {
        return true;
    }

    // Cloudflare R2 or direct storage buckets
    if (lower.includes('.r2.dev') || lower.includes('.cloudflarestorage.com') || lower.includes('/api/stream')) {
        return true;
    }

    return false;
};

/**
 * Resolves a video source URL to ensure it is playable in-browser.
 * URLs on Cloudflare R2 that lack CORS headers are wrapped in the /api/stream proxy.
 */
export const getPlayableStreamUrl = (url?: string): string => {
    if (!url) return '';
    const trimmed = url.trim();
    if (!trimmed) return '';
    if (trimmed.includes('/api/stream')) return trimmed;

    const lower = trimmed.toLowerCase();
    if (lower.includes('.r2.dev') || lower.includes('.cloudflarestorage.com')) {
        return `/api/stream?url=${encodeURIComponent(trimmed)}`;
    }

    return trimmed;
};

// ── Multi-Server Content Access (My Donkey Stream Hub) ───────────────────────

export type StreamServerKey =
    | 'vidstuck'
    | 'nxsha'
    | 'bingr'
    | 'zxc'
    | 'vidlink'
    | 'vidnest'
    | 'megaplay'
    | 'recloud'
    | 'zokoanime'
    | 'default';

export interface StreamServerOption {
    key: StreamServerKey;
    name: string;
    tag: string;
    description: string;
    isAnime?: boolean;
    supports4K?: boolean;
    hasSubtitles?: boolean;
}

export const STREAM_SERVERS: StreamServerOption[] = [
    { key: 'bingr', name: 'Bingr', tag: '4K Ultra', description: 'Crystal-clear 4K / UHD resolution', supports4K: true },
    { key: 'nxsha', name: 'Nxsha', tag: 'HD + Subs', description: 'High definition with multilingual subtitles', hasSubtitles: true },
    { key: 'vidstuck', name: 'VidStuck', tag: 'Fast 1080p', description: 'Ultra-fast bufferless streaming' },
    { key: 'zxc', name: 'ZXC', tag: 'Instant', description: 'Low-latency direct player' },
    { key: 'vidlink', name: 'VidLink', tag: 'Multi-CDN', description: 'Redundant high-availability CDN' },
    { key: 'vidnest', name: 'VidNest', tag: 'Alt HD', description: 'Reliable secondary mirror' },
    { key: 'megaplay', name: 'MegaPlay', tag: 'Anime Fast', description: 'Dedicated high-speed anime server', isAnime: true },
    { key: 'recloud', name: 'ReCloud', tag: 'Anime HD', description: 'Multi-audio Japanese & English dubs', isAnime: true },
    { key: 'zokoanime', name: 'Zokoanime', tag: 'Anime Sub/Dub', description: 'Extensive anime catalog with audio switcher', isAnime: true },
    { key: 'default', name: 'Default Proxy', tag: 'GarageBand', description: 'Legacy streaming fallback' },
];

export const STANDARD_SERVER_FALLBACK_ORDER: StreamServerKey[] = [
    'bingr',
    'nxsha',
    'vidstuck',
    'zxc',
    'vidlink',
    'vidnest',
    'default'
];

export const ANIME_SERVER_FALLBACK_ORDER: StreamServerKey[] = [
    'bingr',
    'nxsha',
    'megaplay',
    'recloud',
    'zokoanime',
    'vidstuck',
    'default'
];

export interface ServerEmbedOptions {
    season?: number;
    episode?: number;
    audioTrack?: 'sub' | 'dub';
    recloudSource?: 'hd-1' | 'hd-2';
    animeId?: number | null;
    animeMalId?: number | null;
    settings?: Partial<SiteSettings>;
}

/**
 * Returns the fallback server order prioritized with the base content server first.
 */
export const getFallbackOrder = (
    baseServer: StreamServerKey = 'bingr',
    isAnime: boolean = false
): StreamServerKey[] => {
    const list = isAnime ? ANIME_SERVER_FALLBACK_ORDER : STANDARD_SERVER_FALLBACK_ORDER;
    if (!baseServer || !list.includes(baseServer)) return list;
    return [baseServer, ...list.filter(s => s !== baseServer)];
};

/**
 * Builds an embed URL for a chosen server key.
 * Accepts either a numeric TMDB ID or IMDb ID (tt...) or content ID.
 * Defaults to the configured base content provider server if not specified.
 */
export const buildServerEmbedUrl = (
    id: string | number,
    type: 'movie' | 'tv' | string = 'movie',
    serverKey?: StreamServerKey,
    options: ServerEmbedOptions = {}
): string => {
    const rawId = String(id || '').trim();
    if (!rawId) return '';

    const baseServer = getBaseContentServer(options.settings);
    const targetKey: StreamServerKey = serverKey || baseServer;

    const cleanNumeric = rawId.replace(/^(tmdb_|imdb_)/, '');
    const numId = parseInt(cleanNumeric, 10);
    const hasNum = !isNaN(numId) && numId > 0;
    const imdbId = rawId.startsWith('tt') ? rawId : (rawId.startsWith('imdb_') ? rawId.replace('imdb_', '') : '');

    const s = Math.max(1, options.season || 1);
    const e = Math.max(1, options.episode || 1);
    const audio = options.audioTrack || 'sub';
    const source = options.recloudSource || 'hd-1';

    // Check for custom server base URL override
    const customBase = options.settings?.serverBaseUrls?.[targetKey] || 
        (targetKey === baseServer && options.settings?.baseContentServerUrl ? options.settings.baseContentServerUrl.trim().replace(/\/+$/, '') : '');

    // 1. Anime dedicated servers
    if (targetKey === 'zokoanime') {
        const mal = options.animeMalId;
        const ani = options.animeId || (hasNum ? numId : null);
        const zkBase = customBase || 'https://zokoanime.video';
        if (mal) return `${zkBase}/stream/mal/${mal}/${e}/${audio}?color=ffffff`;
        if (ani) return `${zkBase}/stream/anilist/${ani}/${e}/${audio}?color=ffffff`;
    }
    if (targetKey === 'megaplay') {
        const ani = options.animeId || (hasNum ? numId : null);
        const mpBase = customBase || 'https://megaplay.buzz';
        if (ani) return `${mpBase}/stream/ani/${ani}/${e}/${audio}`;
    }
    if (targetKey === 'recloud') {
        const ani = options.animeId || (hasNum ? numId : null);
        const rcBase = customBase || 'https://cdn.4animo.xyz';
        if (ani) return `${rcBase}/embed/${source}/ani/${ani}/${e}/${audio}?k=1`;
    }

    // 2. Standard multi-servers (Use TMDB numeric ID if available, otherwise raw or IMDb ID)
    const targetId = hasNum ? numId : (imdbId || rawId);

    switch (targetKey) {
        case 'vidstuck': {
            const vsBase = customBase || 'https://vidstuck.xyz';
            // VidStuck backend expects numeric TMDB ID. If only IMDb ID is available, route to VidLink
            if (typeof targetId === 'string' && targetId.startsWith('tt')) {
                return type === 'tv'
                    ? `https://vidlink.pro/tv/${targetId}/${s}/${e}?autoplay=true`
                    : `https://vidlink.pro/movie/${targetId}?autoplay=true`;
            }
            return type === 'tv'
                ? `${vsBase}/embed/tv/${targetId}/${s}/${e}?color=ffffff`
                : `${vsBase}/embed/movie/${targetId}?color=ffffff`;
        }

        case 'nxsha': {
            const nxBase = customBase || 'https://nxsha.space';
            return type === 'tv'
                ? `${nxBase}/embed/tv/${targetId}/${s}/${e}?autoplay=true`
                : `${nxBase}/embed/movie/${targetId}?autoplay=true`;
        }

        case 'bingr': {
            const bgBase = customBase || 'https://bingr.one';
            return type === 'tv'
                ? `${bgBase}/watch/tv/${targetId}/${s}/${e}`
                : `${bgBase}/watch/movie/${targetId}`;
        }

        case 'zxc': {
            const zxcBase = customBase || 'https://zxcstream.xyz';
            return type === 'tv'
                ? `${zxcBase}/player/tv/${targetId}?season=${s}&episode=${e}`
                : `${zxcBase}/player/movie/${targetId}`;
        }

        case 'vidlink': {
            const vlBase = customBase || 'https://vidlink.pro';
            return type === 'tv'
                ? `${vlBase}/tv/${targetId}/${s}/${e}?autoplay=true`
                : `${vlBase}/movie/${targetId}?autoplay=true`;
        }

        case 'vidnest': {
            const vnBase = customBase || 'https://vidnest.fun';
            return type === 'tv'
                ? `${vnBase}/tv/${targetId}/${s}/${e}`
                : `${vnBase}/movie/${targetId}`;
        }

        case 'default':
        default:
            return buildEmbedUrl(imdbId || targetId, type, options.settings, s, e);
    }
};

/**
 * Returns the next available server in the fallback chain that hasn't failed yet.
 */
export const getNextFallbackServer = (
    currentServer: StreamServerKey,
    isAnime: boolean,
    failedServers: Set<StreamServerKey>,
    baseServer: StreamServerKey = 'bingr'
): StreamServerKey | null => {
    const list = getFallbackOrder(baseServer, isAnime);
    for (const server of list) {
        if (server !== currentServer && !failedServers.has(server)) {
            return server;
        }
    }
    return null;
};

/**
 * Generates direct high-speed download links (from My Donkey hub resolvers).
 */
export const getMovieDownloadUrl = (
    id: number | string,
    type: 'movie' | 'tv' = 'movie',
    season = 1,
    episode = 1
): string => {
    const cleanId = String(id).replace(/^(tmdb_|imdb_)/, '');
    return type === 'movie'
        ? `https://nxsha.space/dl/movie/${cleanId}`
        : `https://nxsha.space/dl/tv/${cleanId}/${season}/${episode}`;
};

export const getAnimeDownloadUrl = (
    anilistId: number | null,
    episode = 1,
    audio: 'sub' | 'dub' = 'sub',
    malId?: number | null
): string | null => {
    const ep = Math.max(1, Math.floor(episode));
    const track = audio === 'dub' ? 'dub' : 'sub';
    if (Number.isInteger(malId) && malId && malId > 0) {
        return `https://zokoanime.video/download/mal/${malId}/${ep}/${track}`;
    }
    if (Number.isInteger(anilistId) && anilistId && anilistId > 0) {
        return `https://zokoanime.video/download/anilist/${anilistId}/${ep}/${track}`;
    }
    return null;
};
