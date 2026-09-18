// ══════════════════════════════════════════════════════════════════════
// RELEASE SCHEDULE → TMDB
// Powers the site's Schedule page: upcoming movie release dates plus the
// next air dates of TV shows and anime episodes. Everything is derived
// live from TMDB (no manual upkeep):
//   • Movies  — /movie/upcoming merged with dated discover results
//   • TV      — airing-today / on-the-air / returning shows, probed for
//               their `next_episode_to_air` (season, episode, air date)
//   • Anime   — same probing over Japanese animation (genre 16 + JP)
// Responses are cached for a few minutes and episode probes run with
// bounded concurrency so TMDB rate limits are respected.
// ══════════════════════════════════════════════════════════════════════

import { BYPASS_BASE, TMDB_API_KEY, TMDB_BASE, type TmdbEndpoint } from './config';

export type UpcomingMovie = {
  id: number;
  title: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string; // YYYY-MM-DD
  rating: number;
};

export type UpcomingEpisode = {
  showId: number;
  showTitle: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  rating: number;
  season: number;
  episode: number;
  episodeName: string;
  airDate: string; // YYYY-MM-DD
  anime: boolean;
};

type RawMovie = {
  id: number; title?: string; overview?: string; poster_path?: string | null;
  backdrop_path?: string | null; release_date?: string; vote_average?: number; adult?: boolean;
};

type RawShow = {
  id: number; name?: string; overview?: string; poster_path?: string | null;
  backdrop_path?: string | null; vote_average?: number; popularity?: number;
  original_language?: string; origin_country?: string[]; genre_ids?: number[]; adult?: boolean;
};

type ShowDetails = RawShow & {
  next_episode_to_air?: {
    air_date?: string | null; episode_number?: number; season_number?: number; name?: string; overview?: string;
  } | null;
};

const cache = new Map<string, { data: unknown; expires: number }>();
const SCHEDULE_TTL_MS = 5 * 60 * 1000;
const PROBE_CONCURRENCY = 6;
const MAX_PROBES = 30;

async function request<T>(path: string, params: Record<string, string>, endpoint: TmdbEndpoint, signal: AbortSignal, force = false): Promise<T> {
  if (!TMDB_API_KEY) throw new Error('TMDB is not configured. Add VITE_TMDB_API_KEY to .env.local and restart the app.');
  const cacheKey = `schedule:${endpoint}:${path}:${JSON.stringify(params)}`;
  if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
  if (!force) {
    const cached = cache.get(cacheKey);
    if (cached && cached.expires > Date.now()) return cached.data as T;
  }
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal.addEventListener('abort', cancel, { once: true });
  const timeout = window.setTimeout(() => controller.abort(), 12000);
  const url = new URL(`${endpoint === 'alternate' ? BYPASS_BASE : TMDB_BASE}${path}`);
  url.search = new URLSearchParams({ api_key: TMDB_API_KEY, language: 'en-US', ...params }).toString();
  try {
    const response = await fetch(url, { signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer', headers: { Accept: 'application/json' } });
    if (response.status === 401 || response.status === 403) throw new Error('TMDB rejected the API key or access to this endpoint. Check the key and try the other metadata endpoint.');
    if (response.status === 429) throw new Error('TMDB is receiving too many requests. Please wait a moment, then retry.');
    if (!response.ok) throw new Error(response.status === 404 ? 'TMDB could not find this schedule entry.' : `TMDB is unavailable (HTTP ${response.status}). Try again or choose the other metadata endpoint.`);
    const data: unknown = await response.json();
    if (!data || typeof data !== 'object') throw new Error('TMDB returned an unexpected response. Please retry.');
    if (cache.size >= 80) cache.delete(cache.keys().next().value!);
    cache.set(cacheKey, { data, expires: Date.now() + SCHEDULE_TTL_MS });
    return data as T;
  } catch (error) {
    if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
    if (controller.signal.aborted) throw new Error('This TMDB endpoint timed out. Try the alternate metadata endpoint below.');
    if (error instanceof TypeError) throw new Error('Cannot reach this TMDB endpoint. Your network or ISP may block it. Try the alternate endpoint below.');
    throw error;
  } finally { clearTimeout(timeout); signal.removeEventListener('abort', cancel); }
}

// Runs `fn` over `items` with at most `limit` in flight at once.
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += limit) {
    const chunk = await Promise.all(items.slice(i, i + limit).map(fn));
    results.push(...chunk);
  }
  return results;
}

function isAnimeShow(show: RawShow) {
  return (show.genre_ids ?? []).includes(16) && (show.original_language === 'ja' || !!show.origin_country?.includes('JP'));
}

function toISODate(value: unknown): string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : '';
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── Upcoming movies ────────────────────────────────────────────────────

export async function getUpcomingMovies(endpoint: TmdbEndpoint, signal: AbortSignal, force = false): Promise<UpcomingMovie[]> {
  const today = todayISO();
  const [upcoming, discover] = await Promise.all([
    request<{ results: RawMovie[] }>('/movie/upcoming', { page: '1' }, endpoint, signal, force),
    request<{ results: RawMovie[] }>('/discover/movie', {
      'primary_release_date.gte': today, sort_by: 'popularity.desc', include_adult: 'false', page: '1',
    }, endpoint, signal, force),
  ]);
  const seen = new Set<number>();
  const out: UpcomingMovie[] = [];
  for (const raw of [...(upcoming.results || []), ...(discover.results || [])]) {
    if (!Number.isInteger(raw.id) || raw.adult || seen.has(raw.id)) continue;
    const releaseDate = toISODate(raw.release_date);
    if (!releaseDate || releaseDate < today) continue;
    seen.add(raw.id);
    out.push({
      id: raw.id,
      title: (raw.title ?? 'Untitled').slice(0, 250),
      overview: raw.overview ?? '',
      posterPath: raw.poster_path ?? null,
      backdropPath: raw.backdrop_path ?? null,
      releaseDate,
      rating: raw.vote_average ?? 0,
    });
  }
  return out.sort((a, b) => a.releaseDate.localeCompare(b.releaseDate)).slice(0, 60);
}

// ── Upcoming episodes (TV + anime) ─────────────────────────────────────

async function candidateShows(kind: 'tv' | 'anime', endpoint: TmdbEndpoint, signal: AbortSignal, force: boolean): Promise<RawShow[]> {
  if (kind === 'anime') {
    const [page1, page2] = await Promise.all([
      request<{ results: RawShow[] }>('/discover/tv', {
        with_genres: '16', with_origin_country: 'JP', with_status: '0', sort_by: 'popularity.desc', include_adult: 'false', page: '1',
      }, endpoint, signal, force),
      request<{ results: RawShow[] }>('/discover/tv', {
        with_genres: '16', with_origin_country: 'JP', with_status: '0', sort_by: 'popularity.desc', include_adult: 'false', page: '2',
      }, endpoint, signal, force),
    ]);
    return [...(page1.results || []), ...(page2.results || [])];
  }
  const [airingToday, onTheAir, returning] = await Promise.all([
    request<{ results: RawShow[] }>('/tv/airing_today', { page: '1' }, endpoint, signal, force),
    request<{ results: RawShow[] }>('/tv/on_the_air', { page: '1' }, endpoint, signal, force),
    request<{ results: RawShow[] }>('/discover/tv', {
      with_status: '0', sort_by: 'popularity.desc', include_adult: 'false', page: '1',
    }, endpoint, signal, force),
  ]);
  return [...(airingToday.results || []), ...(onTheAir.results || []), ...(returning.results || [])];
}

export async function getUpcomingEpisodes(kind: 'tv' | 'anime', endpoint: TmdbEndpoint, signal: AbortSignal, force = false): Promise<UpcomingEpisode[]> {
  const today = todayISO();
  const seen = new Set<number>();
  const candidates = (await candidateShows(kind, endpoint, signal, force))
    .filter((show) => {
      if (!Number.isInteger(show.id) || show.adult || seen.has(show.id)) return false;
      const anime = isAnimeShow(show);
      if (kind === 'anime' && !anime) return false;
      if (kind === 'tv' && anime) return false;
      seen.add(show.id);
      return true;
    })
    .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
    .slice(0, MAX_PROBES);

  const probed = await mapLimit(candidates, PROBE_CONCURRENCY, async (show) => {
    try {
      return await request<ShowDetails>(`/tv/${show.id}`, {}, endpoint, signal, force);
    } catch {
      return null; // One unreachable show must not sink the whole schedule.
    }
  });

  const out: UpcomingEpisode[] = [];
  for (const details of probed) {
    if (!details || !Number.isInteger(details.id)) continue;
    const next = details.next_episode_to_air;
    const airDate = toISODate(next?.air_date);
    if (!next || !airDate || airDate < today) continue;
    const season = Number(next.season_number) || 1;
    const episode = Number(next.episode_number) || 1;
    out.push({
      showId: details.id,
      showTitle: (details.name ?? 'Untitled').slice(0, 250),
      overview: next.overview || details.overview || '',
      posterPath: details.poster_path ?? null,
      backdropPath: details.backdrop_path ?? null,
      rating: details.vote_average ?? 0,
      season,
      episode,
      episodeName: (next.name || `Episode ${episode}`).slice(0, 250),
      airDate,
      anime: kind === 'anime',
    });
  }
  return out.sort((a, b) => a.airDate.localeCompare(b.airDate) || b.rating - a.rating);
}

// ── Date presentation ──────────────────────────────────────────────────

export function daysUntil(isoDate: string): number | null {
  if (!toISODate(isoDate)) return null;
  const [y, m, d] = isoDate.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 86400000);
}

export function formatScheduleDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function countdownLabel(isoDate: string): string {
  const days = daysUntil(isoDate);
  if (days === null) return 'TBA';
  if (days <= 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days < 7) return `In ${days} days`;
  if (days < 14) return 'In 1 week';
  if (days < 30) return `In ${Math.floor(days / 7)} weeks`;
  if (days < 60) return 'In 1 month';
  return `In ${Math.floor(days / 30)} months`;
}

export function dayGroupLabel(isoDate: string): string {
  const days = daysUntil(isoDate);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return isoDate;
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString(undefined, sameYear
    ? { weekday: 'long', month: 'long', day: 'numeric' }
    : { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}
