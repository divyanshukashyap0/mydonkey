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
    imdbId: string,
    type: 'movie' | 'tv' | string = 'movie',
    settings?: Partial<SiteSettings>,
    seasonNumber?: number,
    episodeNumber?: number
): string => {
    if (!imdbId) return '';
    const cleanId = imdbId.trim();
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
