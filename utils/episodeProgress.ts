import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Content } from '../types';

export interface SeriesEpisodeProgress {
    seriesId: string;
    lastSeason: number;
    lastEpisode: number;
    lastEpisodeTitle?: string;
    lastStillUrl?: string;
    watchedEpisodes: string[];
    updatedAt: string;
}

const STORAGE_KEY = 'mydonkey_tv_episode_progress_v1';

export const episodeKey = (season: number, episode: number): string => `s${season}e${episode}`;

/**
 * Resolves a consistent set of lookup keys for a TV series across id, tmdbId, and imdbId.
 */
const getSeriesKeys = (item?: Partial<Content> | null): string[] => {
    if (!item) return [];
    const keys: string[] = [];
    if (item.tmdbId) keys.push(`tmdb_${item.tmdbId}`);
    if (item.id) keys.push(String(item.id).toLowerCase());
    if (item.imdbId) keys.push(String(item.imdbId).toLowerCase());
    return Array.from(new Set(keys.filter(Boolean)));
};

const getCanonicalSeriesKey = (item?: Partial<Content> | null): string => {
    if (!item) return '';
    if (item.tmdbId) return `tmdb_${item.tmdbId}`;
    if (item.id) return String(item.id).replace(/[^a-zA-Z0-9_-]/g, '_');
    if (item.imdbId) return String(item.imdbId).replace(/[^a-zA-Z0-9_-]/g, '_');
    return '';
};

const readAllLocalProgress = (): Record<string, SeriesEpisodeProgress> => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
};

const writeAllLocalProgress = (map: Record<string, SeriesEpisodeProgress>) => {
    try {
        // Keep the 120 most recently updated series to avoid bloating localStorage
        const entries = Object.entries(map).sort(
            (a, b) => new Date(b[1].updatedAt || 0).getTime() - new Date(a[1].updatedAt || 0).getTime()
        );
        const trimmed = Object.fromEntries(entries.slice(0, 120));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch { }
};

export const getSeriesEpisodeProgress = (item?: Partial<Content> | null): SeriesEpisodeProgress | null => {
    const keys = getSeriesKeys(item);
    if (keys.length === 0) return null;
    const all = readAllLocalProgress();
    for (const k of keys) {
        if (all[k]) return all[k];
    }
    return null;
};

export const isEpisodeWatched = (
    progress: SeriesEpisodeProgress | null | undefined,
    season: number,
    episode: number
): boolean => {
    if (!progress || !Array.isArray(progress.watchedEpisodes)) return false;
    return progress.watchedEpisodes.includes(episodeKey(season, episode));
};

export const recordEpisodeWatched = (
    content: Content,
    season: number,
    episode: number,
    episodeTitle?: string,
    stillUrl?: string,
    uid?: string
): SeriesEpisodeProgress => {
    const canonical = getCanonicalSeriesKey(content);
    const keys = getSeriesKeys(content);
    const all = readAllLocalProgress();
    const existing = getSeriesEpisodeProgress(content);

    const epKey = episodeKey(season, episode);
    const watchedSet = new Set<string>(existing?.watchedEpisodes || []);
    watchedSet.add(epKey);

    const next: SeriesEpisodeProgress = {
        seriesId: canonical || content.id,
        lastSeason: season,
        lastEpisode: episode,
        lastEpisodeTitle: episodeTitle || `Episode ${episode}`,
        lastStillUrl: stillUrl || existing?.lastStillUrl,
        watchedEpisodes: Array.from(watchedSet),
        updatedAt: new Date().toISOString(),
    };

    if (canonical) all[canonical] = next;
    for (const k of keys) {
        all[k] = next;
    }
    writeAllLocalProgress(all);

    // Also tag the local Continue Watching watch history entry with lastSeason & lastEpisode
    try {
        const raw = localStorage.getItem('my_donkey_watch_history');
        const list = raw ? JSON.parse(raw) : [];
        if (Array.isArray(list)) {
            const idx = list.findIndex(
                (i: any) =>
                    i?.movieId === content.id ||
                    (content.tmdbId && (i?.movieId === `tmdb_${content.tmdbId}` || String(i?.content?.tmdbId) === String(content.tmdbId)))
            );
            if (idx !== -1) {
                list[idx] = {
                    ...list[idx],
                    lastSeason: season,
                    lastEpisode: episode,
                    lastWatchedAt: next.updatedAt,
                };
                localStorage.setItem('my_donkey_watch_history', JSON.stringify(list));
            }
        }
        window.dispatchEvent(new CustomEvent('mydonkey_watch_updated', { detail: { movieId: content.id, season, episode } }));
    } catch { }

    // Best-effort Firestore cross-device sync for signed-in users
    if (uid && canonical) {
        void setDoc(
            doc(db, 'users', uid, 'episodeProgress', canonical),
            {
                seriesId: next.seriesId,
                lastSeason: next.lastSeason,
                lastEpisode: next.lastEpisode,
                lastEpisodeTitle: next.lastEpisodeTitle || '',
                lastStillUrl: next.lastStillUrl || '',
                watchedEpisodes: next.watchedEpisodes,
                updatedAt: next.updatedAt,
            },
            { merge: true }
        ).catch(() => { });
    }

    return next;
};

export const syncSeriesProgressFromCloud = async (
    content: Content,
    uid?: string
): Promise<SeriesEpisodeProgress | null> => {
    const local = getSeriesEpisodeProgress(content);
    const canonical = getCanonicalSeriesKey(content);
    if (!uid || !canonical) return local;

    try {
        const snap = await getDoc(doc(db, 'users', uid, 'episodeProgress', canonical));
        if (!snap.exists()) return local;
        const cloud = snap.data() as Partial<SeriesEpisodeProgress>;
        if (!cloud || !cloud.lastSeason || !cloud.lastEpisode) return local;

        const mergedWatched = Array.from(
            new Set<string>([
                ...(local?.watchedEpisodes || []),
                ...(Array.isArray(cloud.watchedEpisodes) ? cloud.watchedEpisodes : []),
            ])
        );

        const localTime = local?.updatedAt ? new Date(local.updatedAt).getTime() : 0;
        const cloudTime = cloud.updatedAt ? new Date(cloud.updatedAt).getTime() : 0;
        const useCloudLatest = cloudTime >= localTime;

        const merged: SeriesEpisodeProgress = {
            seriesId: canonical,
            lastSeason: useCloudLatest ? Number(cloud.lastSeason) : (local?.lastSeason || Number(cloud.lastSeason)),
            lastEpisode: useCloudLatest ? Number(cloud.lastEpisode) : (local?.lastEpisode || Number(cloud.lastEpisode)),
            lastEpisodeTitle: useCloudLatest ? (cloud.lastEpisodeTitle || local?.lastEpisodeTitle) : local?.lastEpisodeTitle,
            lastStillUrl: useCloudLatest ? (cloud.lastStillUrl || local?.lastStillUrl) : local?.lastStillUrl,
            watchedEpisodes: mergedWatched,
            updatedAt: useCloudLatest ? (cloud.updatedAt || new Date().toISOString()) : (local?.updatedAt || new Date().toISOString()),
        };

        const all = readAllLocalProgress();
        all[canonical] = merged;
        for (const k of getSeriesKeys(content)) {
            all[k] = merged;
        }
        writeAllLocalProgress(all);
        return merged;
    } catch {
        return local;
    }
};
