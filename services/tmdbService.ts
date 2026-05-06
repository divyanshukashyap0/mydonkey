// TMDB API Service
// Requires VITE_TMDB_API_KEY in your .env file
// Get a free key at: https://www.themoviedb.org/settings/api

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';
const API_KEY = import.meta.env.VITE_TMDB_API_KEY;

export const tmdbPosterUrl = (path: string | null, size: 'w342' | 'w500' | 'w780' | 'original' = 'w500') =>
    path ? `${TMDB_IMAGE_BASE}/${size}${path}` : '';

export const tmdbBackdropUrl = (path: string | null, size: 'w780' | 'w1280' | 'original' = 'w1280') =>
    path ? `${TMDB_IMAGE_BASE}/${size}${path}` : '';

export const tmdbStillUrl = (path: string | null, size: 'w300' | 'original' = 'w300') =>
    path ? `${TMDB_IMAGE_BASE}/${size}${path}` : '';

export interface TMDBSearchResult {
    id: number;
    title: string; // movie
    name: string;  // tv
    poster_path: string | null;
    backdrop_path: string | null;
    release_date?: string;      // movie
    first_air_date?: string;    // tv
    vote_average: number;
    overview: string;
    media_type?: string;
    genre_ids: number[];
}

export interface TMDBDetail {
    id: number;
    title?: string;          // movie
    name?: string;           // tv
    overview: string;
    poster_path: string | null;
    backdrop_path: string | null;
    release_date?: string;
    first_air_date?: string;
    vote_average: number;
    runtime?: number;         // movie (minutes)
    episode_run_time?: number[]; // tv
    number_of_seasons?: number;
    seasons?: {
        air_date: string;
        episode_count: number;
        id: number;
        name: string;
        overview: string;
        poster_path: string;
        season_number: number;
        vote_average: number;
    }[];
    videos?: {
        results: {
            id: string;
            iso_639_1: string;
            iso_3166_1: string;
            key: string;
            name: string;
            site: string;
            size: number;
            type: string;
        }[];
    };
    images?: {
        backdrops: { file_path: string }[];
        posters: { file_path: string }[];
    };
    genres: { id: number; name: string }[];
    credits?: {
        cast: { name: string; order: number }[];
    };
    adult?: boolean;
    certification?: string;
    content_ratings?: {
        results: { iso_3166_1: string; rating: string }[];
    };
    release_dates?: {
        results: { iso_3166_1: string; release_dates: { certification: string }[] }[];
    };
    external_ids?: {
        imdb_id?: string;
    };
}

export interface TMDBEpisodeDetail {
    id: number;
    episode_number: number;
    name: string;
    overview: string;
    still_path: string | null;
    air_date: string;
    runtime: number; // minutes
}

export interface TMDBSeasonDetail {
    _id: string;
    id: number;
    air_date: string;
    name: string;
    overview: string;
    poster_path: string | null;
    season_number: number;
    episodes: TMDBEpisodeDetail[];
    videos?: {
        results: {
            key: string;
            site: string;
            type: string;
        }[];
    };
}

/** Helper to call TMDB via server-side proxy to avoid network blocks/timeouts */
async function callTMDB(path: string, params: Record<string, any> = {}) {
    const searchParams = new URLSearchParams(params);
    const url = `/api/tmdb?path=${encodeURIComponent(path)}&${searchParams.toString()}`;
    
    const res = await fetch(url);
    if (!res.ok) throw new Error(`TMDB proxy error: ${res.statusText}`);
    return res.json();
}

export async function fetchTMDBEpisode(
    tmdbId: number,
    seasonNumber: number,
    episodeNumber: number
): Promise<TMDBEpisodeDetail & { videos?: { results: any[] } }> {
    return callTMDB(`/tv/${tmdbId}/season/${seasonNumber}/episode/${episodeNumber}`, {
        language: 'en-US',
        append_to_response: 'videos'
    });
}

/** Search for movies or TV shows on TMDB */
export async function searchTMDB(
    query: string,
    type: 'movie' | 'tv'
): Promise<TMDBSearchResult[]> {
    if (!query.trim()) return [];
    const data = await callTMDB(`/search/${type}`, {
        query: query,
        language: 'en-US',
        page: 1
    });
    return (data.results || []).slice(0, 6) as TMDBSearchResult[];
}

/** Multi-search for movies and TV shows on TMDB */
export async function searchTMDBMulti(query: string): Promise<TMDBSearchResult[]> {
    if (!query.trim()) return [];

    try {
        const data = await callTMDB('/search/multi', {
            query: query,
            language: 'en-US',
            page: 1
        });
        
        // Filter out person results, keep only movie/tv
        const results = (data.results || []).filter((r: any) => r.media_type === 'movie' || r.media_type === 'tv');
        return results.slice(0, 24) as TMDBSearchResult[];
    } catch (error) {
        console.error("TMDB Multi-Search Proxy Error:", error);
        return [];
    }
}

/** Fetch full details (cast, genres, runtime) for a TMDB title */
export async function fetchTMDBDetails(
    tmdbId: number,
    type: 'movie' | 'tv'
): Promise<TMDBDetail> {
    const appendExtra =
        type === 'movie'
            ? 'credits,release_dates,videos,images,external_ids&include_image_language=en,null&include_video_language=en,null'
            : 'credits,content_ratings,videos,images,external_ids&include_image_language=en,null&include_video_language=en,null';

    return callTMDB(`/${type}/${tmdbId}`, {
        language: 'en-US',
        append_to_response: appendExtra
    });
}

/** Fetch full details for a TV season, which includes its episodes */
export async function fetchTMDBSeason(
    tmdbId: number,
    seasonNumber: number
): Promise<TMDBSeasonDetail> {
    return callTMDB(`/tv/${tmdbId}/season/${seasonNumber}`, {
        language: 'en-US',
        append_to_response: 'videos'
    });
}

/** Extract the first official YouTube trailer from TMDB detail */
export function extractTMDBTrailer(detail: TMDBDetail | TMDBSeasonDetail): string | undefined {
    if (!detail.videos || !detail.videos.results) return undefined;
    const items = detail.videos.results;
    
    // Priority: Trailer -> Teaser -> Clip -> Opening -> Any YouTube
    const trailer = items.find(v => v.type === 'Trailer' && v.site === 'YouTube');
    if (trailer) return trailer.key;
    
    const teaser = items.find(v => v.type === 'Teaser' && v.site === 'YouTube');
    if (teaser) return teaser.key;
    
    const clip = items.find(v => (v.type === 'Clip' || v.type === 'Featurette') && v.site === 'YouTube');
    if (clip) return clip.key;

    const opening = items.find(v => v.type === 'Opening Credits' && v.site === 'YouTube');
    if (opening) return opening.key;

    return items.find(v => v.site === 'YouTube')?.key;
}

/** Extract the best available video for an episode */
export function extractTMDBEpisodeVideo(detail: { videos?: { results: any[] } }): string | undefined {
    if (!detail.videos || !detail.videos.results) return undefined;
    const items = detail.videos.results;
    
    // For episodes, Clips are most common
    const clip = items.find(v => (v.type === 'Clip' || v.type === 'Teaser' || v.type === 'Trailer' || v.type === 'Opening Credits' || v.type === 'Featurette') && v.site === 'YouTube');
    return clip?.key || items.find(v => v.site === 'YouTube')?.key;
}

// TMDB genre IDs → app genre names (shared subset)
const GENRE_MAP: Record<number, string> = {
    28: 'Action',
    12: 'Adventure',
    16: 'Animation',
    35: 'Comedy',
    80: 'Drama',
    99: 'Documentary',
    18: 'Drama',
    10751: 'Kids',
    9648: 'Mystery',
    10749: 'Romance',
    878: 'Sci-Fi',
    53: 'Thriller',
    27: 'Horror',
    10752: 'Action',
    10759: 'Action',
    10765: 'Sci-Fi',
    10768: 'Documentary',
};

export function mapTMDBGenres(genreIds: number[], genreObjects?: { id: number; name: string }[]): string[] {
    const source = genreObjects
        ? genreObjects.map(g => GENRE_MAP[g.id] || g.name)
        : genreIds.map(id => GENRE_MAP[id]).filter(Boolean) as string[];
    return [...new Set(source)]; // dedupe
}

/**
 * Derive a censor rating string from TMDB release_dates or content_ratings.
 * Falls back to 'U/A 13+' if not found.
 */
export function mapTMDBRating(detail: TMDBDetail, type: 'movie' | 'tv'): string {
    if (type === 'movie' && detail.release_dates) {
        const india = detail.release_dates.results.find(r => r.iso_3166_1 === 'IN');
        const us = detail.release_dates.results.find(r => r.iso_3166_1 === 'US');
        const cert = (india || us)?.release_dates.find(d => d.certification)?.certification;
        if (cert) {
            if (cert === 'U' || cert === 'G') return 'U';
            if (cert === 'U/A' || cert === 'PG') return 'U/A 13+';
            if (cert === 'A' || cert === 'R' || cert === 'NC-17') return 'A (18+)';
            if (cert === 'PG-13') return 'U/A 13+';
        }
    }
    if (type === 'tv' && detail.content_ratings) {
        const india = detail.content_ratings.results.find(r => r.iso_3166_1 === 'IN');
        const us = detail.content_ratings.results.find(r => r.iso_3166_1 === 'US');
        const cert = (india || us)?.rating;
        if (cert) {
            if (cert === 'U' || cert === 'TV-G' || cert === 'TV-Y') return 'U';
            if (cert === 'TV-14' || cert === 'PG-13') return 'U/A 13+';
            if (cert === 'TV-MA' || cert === 'R') return 'A (18+)';
            if (cert === 'TV-PG' || cert === 'PG' || cert === 'U/A') return 'U/A 13+';
        }
    }
    return 'U/A 13+';
}

/** Format movie runtime (minutes) to readable string e.g. "2h 18m" */
export function formatRuntime(minutes?: number): string {
    if (!minutes) return '';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** Find TMDB details by IMDb ID */
export async function findByIMDbId(imdbId: string): Promise<TMDBDetail | null> {
    // Extract the exact ttXXXXXXX ID from a full URL if necessary
    const match = imdbId.match(/(tt\d+)/);
    if (!match) throw new Error('Invalid IMDb ID');
    const id = match[1];

    const data = await callTMDB(`/find/${id}`, {
        external_source: 'imdb_id'
    });

    // Check movie results first, then tv results
    if (data.movie_results && data.movie_results.length > 0) {
        return fetchTMDBDetails(data.movie_results[0].id, 'movie');
    }
    if (data.tv_results && data.tv_results.length > 0) {
        return fetchTMDBDetails(data.tv_results[0].id, 'tv');
    }
    
    return null;
}
