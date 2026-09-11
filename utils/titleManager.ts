import { FALLBACK_CATALOG } from '../services/fallbackCatalog';
import { Content } from '../types';

const TITLE_CACHE_KEY = 'mydonkey_content_titles';

// Fast in-memory cache mapping content ID -> title
const memoryTitleMap: Record<string, string> = {};

// 1. Pre-seed memory map from static FALLBACK_CATALOG (Instant <0.01ms boot)
try {
    for (const item of FALLBACK_CATALOG) {
        if (item.id && item.title) {
            memoryTitleMap[item.id] = item.title;
            if (item.tmdbId) {
                memoryTitleMap[`tmdb_${item.tmdbId}`] = item.title;
                memoryTitleMap[String(item.tmdbId)] = item.title;
            }
        }
    }
} catch (_) {}

// 2. Hydrate from localStorage
try {
    const stored = localStorage.getItem(TITLE_CACHE_KEY);
    if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
            Object.assign(memoryTitleMap, parsed);
        }
    }
} catch (_) {}

/**
 * Cache single content title in memory and localStorage
 */
export function saveContentTitle(id: string, title: string) {
    if (!id || !title) return;
    memoryTitleMap[id] = title;
    try {
        const stored = localStorage.getItem(TITLE_CACHE_KEY);
        const cache = stored ? JSON.parse(stored) : {};
        if (cache[id] !== title) {
            cache[id] = title;
            localStorage.setItem(TITLE_CACHE_KEY, JSON.stringify(cache));
        }
    } catch (_) {}
}

/**
 * Bulk cache content titles from library or queries
 */
export function bulkSaveContentTitles(items: Array<{ id?: string; tmdbId?: number | string; title?: string }>) {
    if (!Array.isArray(items) || items.length === 0) return;
    let modified = false;
    let cache: Record<string, string> = {};
    try {
        const stored = localStorage.getItem(TITLE_CACHE_KEY);
        cache = stored ? JSON.parse(stored) : {};
    } catch (_) {}

    for (const item of items) {
        if (!item?.title) continue;
        if (item.id && cache[item.id] !== item.title) {
            cache[item.id] = item.title;
            memoryTitleMap[item.id] = item.title;
            modified = true;
        }
        if (item.tmdbId) {
            const tmdbKey = `tmdb_${item.tmdbId}`;
            if (cache[tmdbKey] !== item.title) {
                cache[tmdbKey] = item.title;
                memoryTitleMap[tmdbKey] = item.title;
                modified = true;
            }
        }
    }

    if (modified) {
        try {
            localStorage.setItem(TITLE_CACHE_KEY, JSON.stringify(cache));
        } catch (_) {}
    }
}

/**
 * Update document.title immediately
 */
export function setWebpageTitle(title: string) {
    if (!title) return;
    const formatted = `${title.trim()} | My Donkey`;
    if (document.title !== formatted) {
        document.title = formatted;
    }
}

/**
 * Resolves content title instantly (0ms) from:
 * 1. Navigation state
 * 2. URL search parameters (?title=...)
 * 3. In-memory & localStorage title cache
 * 4. In-memory content list
 * 5. Fallback catalog
 */
export function resolveContentTitleInstant(
    pathname: string,
    search: string,
    locationState?: any,
    activeContentList?: Content[]
): string | null {
    // 1. Direct item passed in navigation state
    if (locationState?.item?.title) {
        return locationState.item.title;
    }

    // 2. Direct query parameter ?title=
    if (search) {
        try {
            const params = new URLSearchParams(search);
            const queryTitle = params.get('title');
            if (queryTitle) {
                return decodeURIComponent(queryTitle);
            }
        } catch (_) {}
    }

    // 3. Extract contentId from /browse/:id or /watch/:id
    const parts = pathname.split('/');
    let contentId = '';
    for (let i = 0; i < parts.length; i++) {
        if (parts[i] === 'browse' || parts[i] === 'watch') {
            contentId = parts[i + 1] ? parts[i + 1].split('?')[0].split('#')[0] : '';
            break;
        }
    }

    if (!contentId) return null;

    // 4. In-memory / localStorage cache
    if (memoryTitleMap[contentId]) {
        return memoryTitleMap[contentId];
    }

    // 5. Active content list (rawContent / content)
    if (activeContentList && activeContentList.length > 0) {
        const found = activeContentList.find(c => c.id === contentId || (c.tmdbId && `tmdb_${c.tmdbId}` === contentId));
        if (found?.title) {
            saveContentTitle(contentId, found.title);
            return found.title;
        }
    }

    // 6. Fallback catalog
    const fallback = FALLBACK_CATALOG.find(c => c.id === contentId || String(c.tmdbId) === contentId.replace('tmdb_', ''));
    if (fallback?.title) {
        saveContentTitle(contentId, fallback.title);
        return fallback.title;
    }

    return null;
}
