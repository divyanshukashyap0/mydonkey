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
    imdb_id?: string;
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

/** Helper to call TMDB via server-side proxy or direct fallback */
async function callTMDB(path: string, params: Record<string, any> = {}) {
    const searchParams = new URLSearchParams(params);
    const proxyUrl = `/api/tmdb?path=${encodeURIComponent(path)}&${searchParams.toString()}`;
    
    try {
        const res = await fetch(proxyUrl);
        if (res.ok) return await res.json();
        
        // If proxy fails (e.g., 404 in local dev), try direct call if we have a client-side key
        if (API_KEY) {
            console.warn(`TMDB Proxy failed with status ${res.status}. Falling back to direct call.`);
            const directUrl = `${TMDB_BASE}${path}?api_key=${API_KEY}&${searchParams.toString()}`;
            const directRes = await fetch(directUrl);
            if (!directRes.ok) throw new Error(`TMDB direct error: ${directRes.statusText}`);
            return await directRes.json();
        }
        
        throw new Error(`TMDB proxy error: ${res.statusText}`);
    } catch (err: any) {
        // Final fallback to direct if proxy fetch itself fails (e.g., network error)
        if (API_KEY) {
            const directUrl = `${TMDB_BASE}${path}?api_key=${API_KEY}&${searchParams.toString()}`;
            const directRes = await fetch(directUrl);
            if (directRes.ok) return await directRes.json();
        }
        throw err;
    }
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
        const results = (data.results || [])
            .filter((r: any) => r.media_type === 'movie' || r.media_type === 'tv')
            .map((r: any) => ({
                ...r,
                type: r.media_type // Ensure internal type field is set
            }));
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
    const params: any = {
        language: 'en-US',
        append_to_response: 'credits,videos,images,external_ids' + (type === 'movie' ? ',release_dates' : ',content_ratings'),
        include_image_language: 'en,null',
        include_video_language: 'en,null'
    };

    return callTMDB(`/${type}/${tmdbId}`, params);
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

export const TMDB_CATEGORY_MAPPING: Record<string, { movieGenreId?: number; tvGenreId?: number; keywordId?: number }> = {
    'Action': { movieGenreId: 28, tvGenreId: 10759 },
    'Adventure': { movieGenreId: 12, tvGenreId: 10759 },
    'Animation': { movieGenreId: 16, tvGenreId: 16 },
    'Biography': { keywordId: 5565, movieGenreId: 36 },
    'Comedy': { movieGenreId: 35, tvGenreId: 35 },
    'Crime': { movieGenreId: 80, tvGenreId: 80 },
    'Documentary': { movieGenreId: 99, tvGenreId: 99 },
    'Drama': { movieGenreId: 18, tvGenreId: 18 },
    'Family': { movieGenreId: 10751, tvGenreId: 10751 },
    'Fantasy': { movieGenreId: 14, tvGenreId: 10765 },
    'History': { movieGenreId: 36, tvGenreId: 10768 },
    'Horror': { movieGenreId: 27, tvGenreId: 9648 },
    'Mystery': { movieGenreId: 9648, tvGenreId: 9648 },
    'Romance': { movieGenreId: 10749, tvGenreId: 10749 },
    'Sci-Fi': { movieGenreId: 878, tvGenreId: 10765 },
    'Sport': { keywordId: 6075 },
    'Thriller': { movieGenreId: 53, tvGenreId: 9648 },
    'War': { movieGenreId: 10752, tvGenreId: 10768 },
};

export const INDIAN_LANGUAGES = ['hi', 'ta', 'te', 'ml', 'kn', 'pa', 'bn', 'mr', 'gu'];

// ── Curated Hero Carousel ─────────────────────────────────────────────────────
// Company IDs: Marvel=420,7505
const MARVEL_COMPANY_IDS = '420,7505';
const MIN_HERO_RATING = 7.5;
const MIN_VOTE_COUNT = 100;

async function fetchUniverseMovies(withCompanies: string, page = 1): Promise<TMDBSearchResult[]> {
    try {
        const data = await callTMDB('/discover/movie', {
            sort_by: 'vote_average.desc',
            'vote_average.gte': MIN_HERO_RATING,
            'vote_count.gte': MIN_VOTE_COUNT,
            with_companies: withCompanies,
            language: 'en-US',
            page,
        });
        return ((data.results || []) as any[]).map(r => ({ ...r, media_type: 'movie' }));
    } catch (e) {
        console.error('fetchUniverseMovies error', e);
        return [];
    }
}

async function fetchIndianMovies(language: string, page = 1): Promise<TMDBSearchResult[]> {
    try {
        const data = await callTMDB('/discover/movie', {
            sort_by: 'vote_average.desc',
            'vote_average.gte': MIN_HERO_RATING,
            'vote_count.gte': MIN_VOTE_COUNT,
            with_origin_country: 'IN',
            with_original_language: language,
            language: 'en-US',
            page,
        });
        return ((data.results || []) as any[]).map(r => ({ ...r, media_type: 'movie' }));
    } catch (e) {
        console.error('fetchIndianMovies error', e);
        return [];
    }
}

async function fetchIndianTVShows(language: string, page = 1): Promise<TMDBSearchResult[]> {
    try {
        const data = await callTMDB('/discover/tv', {
            sort_by: 'vote_average.desc',
            'vote_average.gte': MIN_HERO_RATING,
            'vote_count.gte': 20,
            with_origin_country: 'IN',
            with_original_language: language,
            language: 'en-US',
            page,
        });
        return ((data.results || []) as any[]).map(r => ({ ...r, media_type: 'tv' }));
    } catch (e) {
        console.error('fetchIndianTVShows error', e);
        return [];
    }
}

/**
 * Fetches a curated list of hero banner items:
 * - Indian movies (top-rated IN origin, honoring preferredLanguage if provided)
 * - Indian TV shows / web series (top-rated IN origin)
 * - Marvel Cinematic content (Marvel Studios / Entertainment)
 * All items have vote_average >= 7.5.
 * Results are shuffled with preferred-language content surfaced first.
 */
export async function fetchCuratedHeroContent(preferredLanguage?: string): Promise<TMDBSearchResult[]> {
    const preferredLang = preferredLanguage || 'hi';

    // Pick random pages to widen the candidate pool each session
    const rndPage = () => (Math.random() < 0.5 ? 1 : 2);

    const [
        marvelItems,
        indianMovies,
        indianHindi,
        indianTvShows,
        indianTvHindi,
    ] = await Promise.all([
        fetchUniverseMovies(MARVEL_COMPANY_IDS, rndPage()),
        fetchIndianMovies(preferredLang, rndPage()),
        preferredLang !== 'hi' ? fetchIndianMovies('hi', rndPage()) : Promise.resolve([] as TMDBSearchResult[]),
        fetchIndianTVShows(preferredLang, rndPage()),
        preferredLang !== 'hi' ? fetchIndianTVShows('hi', rndPage()) : Promise.resolve([] as TMDBSearchResult[]),
    ]);

    // Full Fisher-Yates shuffle
    const shuffle = <T>(arr: T[]): T[] => {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    };

    // Deduplicate by id
    const seen = new Set<number>();
    const dedup = (items: TMDBSearchResult[]) =>
        items.filter(i => { if (seen.has(i.id)) return false; seen.add(i.id); return true; });

    // Shuffle each group independently so order is never predictable
    const ordered = [
        ...dedup(shuffle(indianMovies)),
        ...dedup(shuffle(indianTvShows)),
        ...dedup(shuffle(indianHindi)),
        ...dedup(shuffle(indianTvHindi)),
        ...dedup(shuffle(marvelItems)),
    ];

    // Final full shuffle of the merged list for maximum variety
    return shuffle(ordered.filter(i => i.backdrop_path || i.poster_path)).slice(0, 20);
}

export async function fetchTMDBDiscoverByCategory(options: {
    category: string;
    type?: 'all' | 'movie' | 'tv';
    sortBy?: 'popular' | 'rating' | 'newest' | 'title';
    page?: number;
    region?: 'all' | 'indian' | 'global';
    subRegion?: string;
}): Promise<{ results: TMDBSearchResult[]; totalPages: number }> {
    const { 
        category, 
        type = 'all', 
        sortBy = 'popular', 
        page = 1,
        region = 'all',
        subRegion = 'all'
    } = options;
    const mapping = TMDB_CATEGORY_MAPPING[category];

    const getSortString = (mediaType: 'movie' | 'tv') => {
        if (sortBy === 'rating') return 'vote_average.desc';
        if (sortBy === 'newest') return mediaType === 'movie' ? 'primary_release_date.desc' : 'first_air_date.desc';
        if (sortBy === 'title') return mediaType === 'movie' ? 'title.asc' : 'name.asc';
        return 'popularity.desc';
    };

    const fetchEndpoint = async (mediaType: 'movie' | 'tv', p: number) => {
        const params: Record<string, any> = {
            language: 'en-US',
            sort_by: getSortString(mediaType),
            page: p,
            include_adult: false,
        };

        if (sortBy === 'rating') {
            params['vote_count.gte'] = 25;
        }

        // Apply Regional / Language constraints
        if (region === 'indian') {
            if (subRegion && subRegion !== 'all') {
                params.with_original_language = subRegion;
            } else {
                params.with_origin_country = 'IN';
            }
        } else if (region === 'global') {
            if (subRegion && subRegion !== 'all') {
                params.with_original_language = subRegion;
            } else {
                params.without_original_language = INDIAN_LANGUAGES.join('|');
            }
        } else if (subRegion && subRegion !== 'all') {
            params.with_original_language = subRegion;
        }

        // Apply Genre mappings if category is defined and not 'all'
        if (mapping && category.toLowerCase() !== 'all') {
            const genreId = mediaType === 'movie' ? mapping.movieGenreId : mapping.tvGenreId;
            if (genreId) {
                params.with_genres = genreId;
            }
            if (mapping.keywordId) {
                params.with_keywords = mapping.keywordId;
            }
        }

        try {
            const data = await callTMDB(`/discover/${mediaType}`, params);
            return {
                results: (data.results || []).map((r: any) => ({
                    ...r,
                    media_type: mediaType
                })) as TMDBSearchResult[],
                totalPages: data.total_pages || 1
            };
        } catch (e) {
            console.error(`TMDB discover failed for ${mediaType}:`, e);
            return { results: [], totalPages: 1 };
        }
    };

    if (type === 'movie') {
        return fetchEndpoint('movie', page);
    } else if (type === 'tv') {
        return fetchEndpoint('tv', page);
    } else {
        // type === 'all': fetch both movie and tv in parallel
        const [movieRes, tvRes] = await Promise.all([
            fetchEndpoint('movie', page),
            fetchEndpoint('tv', page)
        ]);

        const combined: TMDBSearchResult[] = [];
        const maxLen = Math.max(movieRes.results.length, tvRes.results.length);
        for (let i = 0; i < maxLen; i++) {
            if (movieRes.results[i]) combined.push(movieRes.results[i]);
            if (tvRes.results[i]) combined.push(tvRes.results[i]);
        }

        return {
            results: combined,
            totalPages: Math.min(Math.max(movieRes.totalPages, tvRes.totalPages), 500)
        };
    }
}
