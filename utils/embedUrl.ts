import { SiteSettings, StreamServerKey } from '../types';
export type { StreamServerKey };

export const DEFAULT_EMBED_PROXY_BASE = 'https://proxy.garageband.rocks';
export const DEFAULT_MOVIE_TYPE = 'movie';
export const DEFAULT_TV_TYPE = 'tv';

/**
 * Gets the configured base content provider server key or falls back to 'nxsha'.
 */
export const getBaseContentServer = (_settings?: Partial<SiteSettings>): StreamServerKey => {
    return 'nxsha';
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

// ── Stream Server Access (My Donkey — Nxsha Only) ────────────────────────────

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
    { key: 'nxsha', name: 'Nxsha', tag: 'HD + Subs', description: 'High definition with multilingual subtitles', hasSubtitles: true },
];

export const STANDARD_SERVER_FALLBACK_ORDER: StreamServerKey[] = ['nxsha'];

export const ANIME_SERVER_FALLBACK_ORDER: StreamServerKey[] = ['nxsha'];

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
 * Returns the fallback server order (Nxsha only).
 */
export const getFallbackOrder = (
    _baseServer: StreamServerKey = 'nxsha',
    _isAnime: boolean = false
): StreamServerKey[] => {
    return ['nxsha'];
};

/**
 * Builds an embed URL using the Nxsha streaming server.
 * Accepts either a numeric TMDB ID or IMDb ID (tt...) or content ID.
 */
export const buildServerEmbedUrl = (
    id: string | number,
    type: 'movie' | 'tv' | string = 'movie',
    _serverKey?: StreamServerKey,
    options: ServerEmbedOptions = {}
): string => {
    const rawId = String(id || '').trim();
    if (!rawId) return '';

    const cleanNumeric = rawId.replace(/^(tmdb_|imdb_)/, '');
    const numId = parseInt(cleanNumeric, 10);
    const hasNum = !isNaN(numId) && numId > 0;
    const imdbId = rawId.startsWith('tt') ? rawId : (rawId.startsWith('imdb_') ? rawId.replace('imdb_', '') : '');

    const s = Math.max(1, options.season || 1);
    const e = Math.max(1, options.episode || 1);

    // Check for custom Nxsha base URL override in site settings
    const customBase =
        options.settings?.serverBaseUrls?.nxsha ||
        (options.settings?.baseContentServerUrl ? options.settings.baseContentServerUrl.trim().replace(/\/+$/, '') : '');

    const targetId = hasNum ? numId : (imdbId || rawId);
    const nxBase = customBase || 'https://nxsha.space';

    return type === 'tv'
        ? `${nxBase}/embed/tv/${targetId}/${s}/${e}?autoplay=true`
        : `${nxBase}/embed/movie/${targetId}?autoplay=true`;
};

/**
 * Returns the next available fallback server (none — Nxsha is the sole server).
 */
export const getNextFallbackServer = (
    _currentServer: StreamServerKey,
    _isAnime: boolean,
    _failedServers: Set<StreamServerKey>,
    _baseServer: StreamServerKey = 'nxsha'
): StreamServerKey | null => {
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
