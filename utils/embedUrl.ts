import { SiteSettings } from '../types';

export const DEFAULT_EMBED_PROXY_BASE = 'https://proxy.garageband.rocks';
export const DEFAULT_MOVIE_TYPE = 'movie';
export const DEFAULT_TV_TYPE = 'tv';

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
    if (lower.includes('proxy.garageband.rocks')) return true;
    if (embedBaseHost && lower.includes(embedBaseHost.toLowerCase())) return true;
    if (lower.includes('/embed/movie/') || lower.includes('/embed/tv/')) return true;
    if (lower.includes('imdb.com')) return true;
    return false;
};

