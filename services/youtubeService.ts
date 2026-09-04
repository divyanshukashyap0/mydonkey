/**
 * youtubeService.ts
 * Client-side service for fetching movie/series songs via the secure /api/songs proxy.
 * The YouTube API key NEVER touches the client — all calls go through the serverless function.
 */

export interface YouTubeSongResult {
  videoId: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
}

export interface SongsApiResponse {
  movieName: string;
  results: YouTubeSongResult[];
  source: 'cache' | 'youtube' | 'quota_exceeded' | 'no_api_key';
  cachedAt?: string;
  fallbackQuery?: string;
  quota_exceeded?: boolean;
}

/** In-memory cache to avoid duplicate calls within the same browser session */
const sessionCache = new Map<string, SongsApiResponse>();

/**
 * Dev-mode direct fallback: calls YouTube Data API v3 from the browser when
 * the /api/songs proxy is unavailable (npm run dev without vercel CLI).
 * Uses VITE_YOUTUBE_API_KEY (only available in dev, never in production build).
 * YouTube Data API v3 supports browser CORS requests.
 */
async function callYouTubeDirectly(
  movieName: string,
  type: 'movie' | 'tv',
  cacheKey: string
): Promise<SongsApiResponse> {
  const devKey = import.meta.env.VITE_YOUTUBE_API_KEY as string | undefined;
  if (!devKey) {
    return {
      movieName, results: [], source: 'no_api_key',
      fallbackQuery: `${movieName} ${type === 'tv' ? 'soundtrack' : 'official songs'}`,
    };
  }

  const queries = type === 'tv'
    ? [`${movieName} official soundtrack`, `${movieName} OST songs`, `${movieName} theme song`]
    : [`${movieName} official songs`, `${movieName} jukebox full album`, `${movieName} songs`];

  const allResults: YouTubeSongResult[] = [];
  const seen = new Set<string>();

  for (const query of queries) {
    try {
      const params = new URLSearchParams({
        part: 'snippet', q: query, type: 'video',
        videoDuration: 'medium', videoEmbeddable: 'true',
        safeSearch: 'strict', regionCode: 'IN',
        maxResults: '10', key: devKey,
      });
      const r = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
      if (!r.ok) break;
      const data = await r.json();
      for (const item of (data.items || [])) {
        if (item.id?.videoId && !seen.has(item.id.videoId)) {
          seen.add(item.id.videoId);
          allResults.push({
            videoId: item.id.videoId,
            title: item.snippet?.title || '',
            thumbnail:
              item.snippet?.thumbnails?.high?.url ||
              `https://i.ytimg.com/vi/${item.id.videoId}/hqdefault.jpg`,
            channelTitle: item.snippet?.channelTitle || '',
          });
        }
      }
      if (allResults.length >= 15) break;
    } catch { break; }
  }

  const result: SongsApiResponse = {
    movieName,
    results: allResults,
    source: allResults.length > 0 ? 'youtube' : 'no_api_key',
    cachedAt: new Date().toISOString(),
  };
  sessionCache.set(cacheKey, result);
  return result;
}

/**
 * Fetch songs for a movie or series.
 * 1. Returns session-cached data if available.
 * 2. Tries /api/songs proxy (works on Vercel + local middleware).
 * 3. Falls back to direct browser YouTube call if proxy returns no_api_key (dev mode).
 */
export async function fetchMovieSongs(
  movieName: string,
  type: 'movie' | 'tv' = 'movie'
): Promise<SongsApiResponse> {
  const key = `${movieName.toLowerCase().trim()}::${type}`;

  if (sessionCache.has(key)) {
    return sessionCache.get(key)!;
  }

  const params = new URLSearchParams({ movie: movieName, type });
  let response: Response;

  try {
    response = await fetch(`/api/songs?${params}`);
  } catch {
    // Network error — go straight to direct call
    return callYouTubeDirectly(movieName, type, key);
  }

  // In Vite dev mode the proxy may serve the raw JS file (text/javascript).
  // Guard against that so we never try to JSON.parse a JS comment.
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json') && !contentType.includes('text/json')) {
    return callYouTubeDirectly(movieName, type, key);
  }

  // Handle quota exceeded (HTTP 429)
  if (response.status === 429) {
    const data: SongsApiResponse = await response.json();
    sessionCache.set(key, data);
    return data;
  }

  if (!response.ok) {
    throw new Error(`Songs API error: ${response.status}`);
  }

  let data: SongsApiResponse;
  try {
    data = await response.json();
  } catch {
    return callYouTubeDirectly(movieName, type, key);
  }

  // If proxy ran but had no key configured, try direct call
  if (data.source === 'no_api_key') {
    return callYouTubeDirectly(movieName, type, key);
  }

  if (Array.isArray(data.results)) {
    data.results = data.results.map((r) => ({
      ...r,
      thumbnail: r.thumbnail || (r.videoId ? `https://i.ytimg.com/vi/${r.videoId}/hqdefault.jpg` : ''),
    }));
  }

  sessionCache.set(key, data);
  return data;
}


/**
 * Generate a YouTube search fallback URL for when quota is exceeded or no API key is set.
 */
export function getFallbackSearchUrl(movieName: string, type: 'movie' | 'tv'): string {
  const query = type === 'tv'
    ? `${movieName} soundtrack OST`
    : `${movieName} official songs jukebox`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

/**
 * Simple debounce — useful for wrapping user-triggered search actions.
 */
export function debounce<T extends (...args: any[]) => any>(fn: T, ms = 300) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    return new Promise<ReturnType<T>>((resolve) => {
      timer = setTimeout(() => resolve(fn(...args)), ms);
    });
  };
}
