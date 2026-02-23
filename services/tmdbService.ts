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
}

/** Search for movies or TV shows on TMDB */
export async function searchTMDB(
    query: string,
    type: 'movie' | 'tv'
): Promise<TMDBSearchResult[]> {
    if (!API_KEY) throw new Error('VITE_TMDB_API_KEY is not set in .env');
    if (!query.trim()) return [];

    const url = `${TMDB_BASE}/search/${type}?api_key=${API_KEY}&query=${encodeURIComponent(query)}&language=en-US&page=1`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`TMDB search failed: ${res.statusText}`);
    const data = await res.json();
    return (data.results || []).slice(0, 6) as TMDBSearchResult[];
}

/** Fetch full details (cast, genres, runtime) for a TMDB title */
export async function fetchTMDBDetails(
    tmdbId: number,
    type: 'movie' | 'tv'
): Promise<TMDBDetail> {
    if (!API_KEY) throw new Error('VITE_TMDB_API_KEY is not set in .env');

    const appendExtra =
        type === 'movie'
            ? 'credits,release_dates'
            : 'credits,content_ratings';

    const url = `${TMDB_BASE}/${type}/${tmdbId}?api_key=${API_KEY}&language=en-US&append_to_response=${appendExtra}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`TMDB fetch failed: ${res.statusText}`);
    return res.json() as Promise<TMDBDetail>;
}

/** Fetch full details for a TV season, which includes its episodes */
export async function fetchTMDBSeason(
    tmdbId: number,
    seasonNumber: number
): Promise<TMDBSeasonDetail> {
    if (!API_KEY) throw new Error('VITE_TMDB_API_KEY is not set in .env');
    const url = `${TMDB_BASE}/tv/${tmdbId}/season/${seasonNumber}?api_key=${API_KEY}&language=en-US`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`TMDB season fetch failed: ${res.statusText}`);
    return res.json() as Promise<TMDBSeasonDetail>;
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
