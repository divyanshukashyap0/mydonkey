import type { AudioTrack, CatalogTitle, EmbedMedia, EmbedSelection, ServerKey, ServerPreferences } from './types';

export const STD_SERVERS = [
  { key: 'nxsha', name: 'Nxsha', tag: 'HD + Subs', movie: (id: number) => `https://nxsha.space/embed/movie/${id}?autoplay=true`, tv: (id: number, s: number, e: number) => `https://nxsha.space/embed/tv/${id}/${s}/${e}?autoplay=true`, highlight: true },
] as const;

export const MP_BASE = '';
export const RC_BASE = '';
export const ZK_BASE = 'https://zokoanime.video';
export const ZK_COLOR = '?color=ffffff';
export const RC_SOURCES = ['hd-1', 'hd-2'] as const;
export const RC_DEFAULT_SOURCE = 'hd-1';
export const ANIME_SERVERS: readonly { key: ServerKey; name: string; tag: string }[] = [];

export const DEFAULT_PREFERENCES: ServerPreferences = { audio: 'sub', source: RC_DEFAULT_SOURCE, zokoTemplate: '', sandbox: true };
const PREF_KEY = 'mydonkey-server-preferences-v1';
const LEGACY_PREF_KEY = 'aethoflix-server-preferences-v1';

export function serversFor(_anime: boolean): { key: ServerKey; name: string; tag: string; number: number }[] {
  return STD_SERVERS.map((server, index) => ({ key: server.key, name: server.name, tag: server.tag, number: index + 1 }));
}

export function readServerPreferences(key: ServerKey): ServerPreferences {
  try {
    const raw = localStorage.getItem(PREF_KEY) ?? localStorage.getItem(LEGACY_PREF_KEY);
    const all = JSON.parse(raw ?? '{}') as Record<string, Partial<ServerPreferences>>;
    const value = all[key];
    return { audio: value?.audio === 'dub' ? 'dub' : 'sub', source: value?.source === 'hd-2' ? 'hd-2' : RC_DEFAULT_SOURCE,
      zokoTemplate: typeof value?.zokoTemplate === 'string' ? value.zokoTemplate.slice(0, 2000) : '',
      sandbox: value?.sandbox !== undefined ? Boolean(value.sandbox) : true };
  } catch { return { ...DEFAULT_PREFERENCES }; }
}

export function saveServerPreferences(key: ServerKey, value: ServerPreferences) {
  try {
    const raw = localStorage.getItem(PREF_KEY) ?? localStorage.getItem(LEGACY_PREF_KEY);
    const previous: unknown = JSON.parse(raw ?? '{}');
    const all = previous && typeof previous === 'object' && !Array.isArray(previous) ? previous : {};
    localStorage.setItem(PREF_KEY, JSON.stringify({ ...all, [key]: value }));
  } catch { /* Keep using the selected preferences if storage is unavailable. */ }
}

export function serverName(key: ServerKey): string {
  return [...ANIME_SERVERS, ...STD_SERVERS].find((server) => server.key === key)?.name ?? 'Provider';
}

// Download hand-offs. Neither provider publishes a documented public download
// API, so these open the provider's own download hub for the title rather than
// inventing a direct-file route. Nxsha's hub is the `/dl/` path referenced in
// the original My Donkey site; Zokoanime is used for anime.
export function movieDownloadUrl(id: number, mediaType: 'movie' | 'tv' = 'movie', season = 1, episode = 1): string {
  return mediaType === 'movie'
    ? `https://nxsha.space/dl/movie/${id}`
    : `https://nxsha.space/dl/tv/${id}/${season}/${episode}`;
}

export function animeDownloadUrl(anilistId: number | null, episode: number, audio: AudioTrack, malId?: number | null): string | null {
  const ep = Math.max(1, Math.floor(episode));
  const track = audio === 'dub' ? 'dub' : 'sub';
  // Exact Zokoanime download routes: https://zokoanime.video/download/mal/... and /download/anilist/...
  if (Number.isInteger(malId) && malId && malId > 0) return `https://zokoanime.video/download/mal/${malId}/${ep}/${track}`;
  if (Number.isInteger(anilistId) && anilistId && anilistId > 0) return `https://zokoanime.video/download/anilist/${anilistId}/${ep}/${track}`;
  return null;
}

export function makeEmbed(title: CatalogTitle, selection: EmbedSelection): EmbedMedia {
  if (!Number.isInteger(title.id) || title.id <= 0 || title.id > 2147483647 || !['movie', 'tv'].includes(title.mediaType) || typeof title.title !== 'string' || typeof selection.anime !== 'boolean'
    || !Number.isInteger(selection.season) || selection.season < 0 || selection.season > 10000 || !Number.isInteger(selection.episode) || selection.episode < 1 || selection.episode > 100000) throw new Error('Choose a valid title, season, and episode.');
  const { preferences } = selection;
  if (!preferences || !['sub', 'dub'].includes(preferences.audio) || !RC_SOURCES.includes(preferences.source) || typeof preferences.zokoTemplate !== 'string' || typeof preferences.sandbox !== 'boolean') throw new Error('Choose valid audio, source, and sandbox settings.');
  const nxsha = STD_SERVERS[0];
  const url = title.mediaType === 'movie' ? nxsha.movie(title.id) : nxsha.tv(title.id, selection.season, selection.episode);
  const normalizedSelection: EmbedSelection = { ...selection, server: 'nxsha' };
  const suffix = title.mediaType === 'tv' ? ` / S${selection.season} E${selection.episode}` : '';
  return { id: `embed-${title.id}-nxsha-${Date.now()}`, kind: 'embed', title: `${title.title}${suffix}`.slice(0, 295), url, catalog: title, selection: normalizedSelection };
}

export function validateEmbed(media: EmbedMedia): boolean {
  if (!media || media.kind !== 'embed' || !media.catalog || !media.selection || !media.selection.preferences || typeof media.url !== 'string' || media.url.length > 3000) return false;
  try {
    const expected = makeEmbed(media.catalog, media.selection);
    return expected.url === media.url && typeof media.title === 'string' && media.title.length <= 300;
  } catch { return false; }
}