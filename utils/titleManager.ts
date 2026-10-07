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
    if (!title || title === 'undefined' || title === 'null') return;
    const clean = title.trim();
    if (!clean || clean === 'undefined' || clean === 'null') return;
    // Keep titles strictly under 60 characters to satisfy Google & Bing Search Console (Bing flags > 65)
    let formatted = `${clean} | My Donkey`;
    if (formatted.length > 60) {
        const maxLen = 60 - ' | My Donkey'.length;
        formatted = `${clean.substring(0, maxLen).trim()} | My Donkey`;
    }
    if (document.title !== formatted) {
        document.title = formatted;
    }
}

/**
 * Update document.title for 3D Virtual Cinema
 */
export function setTheatreTitle(contentTitle?: string | null) {
    const clean = contentTitle && contentTitle.trim() && contentTitle.trim() !== 'undefined' && contentTitle.trim() !== 'null' && contentTitle.trim() !== 'Afterlight'
        ? contentTitle.trim()
        : null;
    const formatted = clean
        ? `3D - ${clean}  | MyDonkey`
        : '3D - Virtual Cinema  | MyDonkey';
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
    const stateItemTitle = locationState?.item?.title || locationState?.content?.title;
    if (stateItemTitle && stateItemTitle !== 'undefined' && stateItemTitle !== 'null' && stateItemTitle.trim() !== '') {
        return stateItemTitle.trim();
    }

    // 2. Direct query parameter ?title=
    if (search) {
        try {
            const params = new URLSearchParams(search);
            const queryTitle = params.get('title');
            if (queryTitle && queryTitle !== 'undefined' && queryTitle !== 'null' && queryTitle.trim() !== '') {
                const decoded = decodeURIComponent(queryTitle).trim();
                if (decoded && decoded !== 'undefined' && decoded !== 'null') {
                    return decoded;
                }
            }
        } catch (_) {}
    }

    // 3. Extract contentId from /browse/:id, /watch/:id, or ?id=
    const parts = pathname.split('/');
    let contentId = '';
    for (let i = 0; i < parts.length; i++) {
        if (parts[i] === 'browse' || parts[i] === 'watch') {
            contentId = parts[i + 1] ? parts[i + 1].split('?')[0].split('#')[0] : '';
            break;
        }
    }

    if (!contentId && search) {
        try {
            const params = new URLSearchParams(search);
            const queryId = params.get('id');
            if (queryId) {
                contentId = queryId;
            }
        } catch (_) {}
    }

    if (!contentId) return null;

    // 4. In-memory / localStorage cache
    const cached = memoryTitleMap[contentId];
    if (cached && cached !== 'undefined' && cached !== 'null' && cached.trim() !== '') {
        return cached.trim();
    }

    // 5. Active content list (rawContent / content)
    if (activeContentList && activeContentList.length > 0) {
        const found = activeContentList.find(c => c.id === contentId || (c.tmdbId && `tmdb_${c.tmdbId}` === contentId));
        if (found?.title && found.title !== 'undefined' && found.title !== 'null' && found.title.trim() !== '') {
            saveContentTitle(contentId, found.title.trim());
            return found.title.trim();
        }
    }

    // 6. Fallback catalog
    const fallback = FALLBACK_CATALOG.find(c => c.id === contentId || String(c.tmdbId) === contentId.replace('tmdb_', ''));
    if (fallback?.title && fallback.title !== 'undefined' && fallback.title !== 'null' && fallback.title.trim() !== '') {
        saveContentTitle(contentId, fallback.title.trim());
        return fallback.title.trim();
    }

    return null;
}
