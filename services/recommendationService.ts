import { Content, ContinueWatchingItem, Profile } from '../types';

export interface GenreDefinition {
    id: string;
    name: string;
    emoji: string;
    gradient: string;
    description: string;
}

export const AVAILABLE_GENRES: GenreDefinition[] = [
    { id: 'Action', name: 'Action', emoji: '💥', gradient: 'from-red-600 to-amber-600', description: 'High-octane fights, chases & explosions' },
    { id: 'Adventure', name: 'Adventure', emoji: '🧭', gradient: 'from-emerald-600 to-teal-600', description: 'Epic quests, explorations & journeys' },
    { id: 'Animation', name: 'Animation', emoji: '🎨', gradient: 'from-yellow-500 to-amber-600', description: 'Vibrant animated worlds for all ages' },
    { id: 'Anime', name: 'Anime', emoji: '🌸', gradient: 'from-pink-600 to-purple-600', description: 'Japanese animation & serialized sagas' },
    { id: 'Comedy', name: 'Comedy', emoji: '😂', gradient: 'from-amber-500 to-yellow-400', description: 'Laughs, satire & feel-good humor' },
    { id: 'Crime', name: 'Crime', emoji: '💼', gradient: 'from-zinc-700 to-red-900', description: 'Heists, mobsters, detectives & grit' },
    { id: 'Documentary', name: 'Documentary', emoji: '🎥', gradient: 'from-blue-600 to-cyan-600', description: 'Real stories, nature & true crime' },
    { id: 'Drama', name: 'Drama', emoji: '🎭', gradient: 'from-purple-700 to-indigo-800', description: 'Deep human emotions & powerful narratives' },
    { id: 'Family', name: 'Family', emoji: '👨‍👩‍👧', gradient: 'from-teal-500 to-emerald-500', description: 'Fun movies for kids and families' },
    { id: 'Fantasy', name: 'Fantasy', emoji: '🧙‍♂️', gradient: 'from-indigo-600 to-purple-600', description: 'Magic, mythical realms & superpowers' },
    { id: 'Horror', name: 'Horror', emoji: '👻', gradient: 'from-neutral-900 to-rose-950', description: 'Spooky, supernatural chills & jump scares' },
    { id: 'Mystery', name: 'Mystery', emoji: '🔍', gradient: 'from-violet-800 to-slate-900', description: 'Puzzles, plot twists & whodunits' },
    { id: 'Romance', name: 'Romance', emoji: '❤️', gradient: 'from-rose-500 to-pink-500', description: 'Love stories, passion & romantic comedies' },
    { id: 'Sci-Fi', name: 'Sci-Fi', emoji: '🚀', gradient: 'from-cyan-500 to-blue-600', description: 'Futuristic tech, space, AI & time travel' },
    { id: 'Sports', name: 'Sports', emoji: '⚽', gradient: 'from-lime-600 to-emerald-700', description: 'Athletic triumphs, matches & rivalries' },
    { id: 'Thriller', name: 'Thriller', emoji: '⚡', gradient: 'from-red-700 to-neutral-900', description: 'Edge-of-your-seat suspense & tension' },
];

/**
 * Standardize genre names to ensure seamless cross-matching
 */
export function normalizeGenre(genre: string): string {
    if (!genre) return '';
    const clean = genre.trim().toLowerCase();
    if (clean === 'sci-fi' || clean === 'science fiction' || clean === 'scifi') return 'Sci-Fi';
    if (clean.includes('action')) return 'Action';
    if (clean.includes('comedy')) return 'Comedy';
    if (clean.includes('drama')) return 'Drama';
    if (clean.includes('romance') || clean.includes('romantic')) return 'Romance';
    if (clean.includes('thrill')) return 'Thriller';
    if (clean.includes('horror')) return 'Horror';
    if (clean.includes('myst')) return 'Mystery';
    if (clean.includes('crime')) return 'Crime';
    if (clean.includes('anim')) return 'Animation';
    if (clean.includes('anime')) return 'Anime';
    if (clean.includes('doc')) return 'Documentary';
    if (clean.includes('advent')) return 'Adventure';
    if (clean.includes('fam') || clean.includes('kid')) return 'Family';
    if (clean.includes('fant')) return 'Fantasy';
    if (clean.includes('sport')) return 'Sports';

    // Capitalize first letter as fallback
    return genre.charAt(0).toUpperCase() + genre.slice(1);
}

/**
 * Regional & Language Recognition Helpers for Indian & Hindi Cinema
 */
export const INDIAN_LANG_CODES = ['hi', 'te', 'ta', 'ml', 'kn', 'pa', 'bn', 'mr', 'gu', 'ur', 'or', 'as'];
export const INDIAN_LANG_NAMES = ['hindi', 'telugu', 'tamil', 'malayalam', 'kannada', 'punjabi', 'bengali', 'marathi', 'gujarati', 'urdu', 'odia', 'assamese'];
export const INDIAN_TAGS = ['bollywood', 'tollywood', 'kollywood', 'mollywood', 'sandalwood', 'pollywood', 'desi', 'indian', 'south indian', 'hindi'];

export function isIndianContent(item: Content): boolean {
    if (!item) return false;
    const country = (item.country || '').toLowerCase().trim();
    if (country === 'india' || country === 'in' || country.includes('india')) return true;

    const lang = ((item as any).language || (item as any).original_language || '').toLowerCase().trim();
    if (INDIAN_LANG_CODES.includes(lang) || INDIAN_LANG_NAMES.some(l => lang.includes(l))) return true;

    const tags = ((item.tags || []) as string[]).map(t => t.toLowerCase().trim());
    if (tags.some(t => INDIAN_TAGS.some(tag => t.includes(tag)))) return true;

    const genres = (item.genres || []).map(g => g.toLowerCase().trim());
    if (genres.some(g => g.includes('bollywood') || g.includes('desi') || g.includes('indian'))) return true;

    return false;
}

export function isHindiContent(item: Content): boolean {
    if (!item) return false;
    const lang = ((item as any).language || (item as any).original_language || '').toLowerCase().trim();
    if (lang === 'hi' || lang.includes('hindi')) return true;

    const tags = ((item.tags || []) as string[]).map(t => t.toLowerCase().trim());
    if (tags.some(t => t.includes('bollywood') || t === 'hindi' || t.includes('desi'))) return true;

    const genres = (item.genres || []).map(g => g.toLowerCase().trim());
    if (genres.some(g => g.includes('bollywood') || g.includes('hindi'))) return true;

    return false;
}

/**
 * Read user favorite genres from local storage safely
 */
export function getStoredFavoriteGenres(): string[] {
    try {
        const raw = localStorage.getItem('my_donkey_favorite_genres');
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed;
        }
    } catch (e) {
        // silent fallback
    }
    return [];
}

export interface WatchHistoryAnalysis {
    genreWeights: Map<string, number>;
    watchedContentMap: Map<string, Content>;
    recentWatchedItems: Content[];
    watchedIds: Set<string>;
    completedIds: Set<string>;
    topGenres: string[];
    watchedCast: Set<string>;
    isIndianAffinity: boolean;
    isHindiAffinity: boolean;
    indianWatchCount: number;
    hindiWatchCount: number;
    totalWatchCount: number;
}

/**
 * Analyze the user's continue watching and watch history to derive implicit taste signals
 */
export function analyzeWatchHistory(
    watchHistory: (ContinueWatchingItem | { movieId: string; progress?: number; lastWatchedAt?: string })[] | undefined,
    allContent: Content[]
): WatchHistoryAnalysis {
    const genreWeights = new Map<string, number>();
    const watchedContentMap = new Map<string, Content>();
    const recentWatchedItems: Content[] = [];
    const watchedIds = new Set<string>();
    const completedIds = new Set<string>();
    const watchedCast = new Set<string>();

    if (!watchHistory || !Array.isArray(watchHistory) || watchHistory.length === 0) {
        return { 
            genreWeights, 
            watchedContentMap, 
            recentWatchedItems, 
            watchedIds, 
            completedIds, 
            topGenres: [], 
            watchedCast,
            isIndianAffinity: false,
            isHindiAffinity: false,
            indianWatchCount: 0,
            hindiWatchCount: 0,
            totalWatchCount: 0
        };
    }

    const contentById = new Map<string, Content>();
    for (const item of allContent) {
        if (item.id) contentById.set(item.id, item);
        if (item.imdbId) contentById.set(item.imdbId, item);
    }

    let indianWatchCount = 0;
    let hindiWatchCount = 0;
    let totalWatchCount = 0;

    // Iterate watch history from newest to oldest
    watchHistory.forEach((entry, index) => {
        const movieId = entry.movieId;
        if (!movieId) return;
        watchedIds.add(movieId);

        const contentItem = contentById.get(movieId);
        if (!contentItem) return;

        totalWatchCount++;
        watchedContentMap.set(movieId, contentItem);
        recentWatchedItems.push(contentItem);

        // Check if Indian or Hindi movie
        if (isIndianContent(contentItem)) {
            indianWatchCount++;
        }
        if (isHindiContent(contentItem)) {
            hindiWatchCount++;
        }

        // Check if finished (>= 88% progress)
        const progress = entry.progress || 0;
        if (progress >= 88) {
            completedIds.add(movieId);
        }

        // Recency decay: newest item has weight 1.0, 5th item ~0.6, 10th item ~0.3
        const recencyMultiplier = Math.max(0.2, 1 - index * 0.08);

        // Tally genres
        if (contentItem.genres && Array.isArray(contentItem.genres)) {
            contentItem.genres.forEach(rawGenre => {
                const norm = normalizeGenre(rawGenre);
                if (!norm) return;
                const currentWeight = genreWeights.get(norm) || 0;
                genreWeights.set(norm, currentWeight + 1.5 * recencyMultiplier);
            });
        }

        // Tally cast
        if (contentItem.cast && Array.isArray(contentItem.cast)) {
            contentItem.cast.slice(0, 3).forEach(actor => {
                if (actor) watchedCast.add(actor.toLowerCase().trim());
            });
        }
    });

    const sortedGenres = Array.from(genreWeights.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([genre]) => genre);

    // Compute regional affinity flags
    const isIndianAffinity = indianWatchCount > 0 && (
        indianWatchCount >= 2 || 
        (totalWatchCount > 0 && indianWatchCount / totalWatchCount >= 0.35)
    );

    const isHindiAffinity = hindiWatchCount > 0 && (
        hindiWatchCount >= 2 || 
        (indianWatchCount > 0 && hindiWatchCount / indianWatchCount >= 0.5) ||
        (totalWatchCount > 0 && hindiWatchCount / totalWatchCount >= 0.3)
    );

    return {
        genreWeights,
        watchedContentMap,
        recentWatchedItems,
        watchedIds,
        completedIds,
        topGenres: sortedGenres,
        watchedCast,
        isIndianAffinity,
        isHindiAffinity,
        indianWatchCount,
        hindiWatchCount,
        totalWatchCount
    };
}

export interface RecommendationResult {
    item: Content;
    score: number;
    matchPercentage: number;
    matchReason: string;
}

/**
 * Generate high-precision personalized recommendations based on favorite genres + watch history
 */
export function getPersonalizedRecommendations(params: {
    allContent: Content[];
    watchHistory?: (ContinueWatchingItem | { movieId: string; progress?: number; lastWatchedAt?: string })[];
    favoriteGenres?: string[];
    currentProfile?: Profile | null;
    limit?: number;
    filterType?: 'movie' | 'tv';
}): {
    recommendations: (Content & { matchPercentage?: number; matchReason?: string })[];
    topGenreAffinities: string[];
    hasPersonalization: boolean;
} {
    const { allContent, watchHistory, currentProfile, limit = 24, filterType } = params;

    // 1. Resolve explicit favorite genres
    const explicitGenres = new Set<string>();
    const rawFavs = (params.favoriteGenres && params.favoriteGenres.length > 0)
        ? params.favoriteGenres
        : (currentProfile?.favoriteGenres && currentProfile.favoriteGenres.length > 0)
            ? currentProfile.favoriteGenres
            : getStoredFavoriteGenres();

    rawFavs.forEach(g => {
        const norm = normalizeGenre(g);
        if (norm) explicitGenres.add(norm);
    });

    // 2. Analyze watch history for implicit taste signals
    const historyAnalysis = analyzeWatchHistory(watchHistory, allContent);
    const { genreWeights, watchedIds, completedIds, watchedCast } = historyAnalysis;

    const hasExplicit = explicitGenres.size > 0;
    const hasHistory = historyAnalysis.recentWatchedItems.length > 0;
    const hasPersonalization = hasExplicit || hasHistory;

    // Combined top genres
    const combinedTopGenres = Array.from(
        new Set([...Array.from(explicitGenres), ...historyAnalysis.topGenres])
    ).slice(0, 5);

    // 3. Filter candidates
    const candidates = allContent.filter(item => {
        // Exclude unpublished
        if (item.isPublished === false) return false;
        // Exclude exclusive / private content from public recommendations
        if (item.isExclusive || item.accessCode) return false;
        // Filter by media type if requested
        if (filterType && item.type !== filterType) return false;
        return true;
    });

    // 4. Score each candidate
    const scoredList: RecommendationResult[] = [];

    for (const item of candidates) {
        let score = 0;
        let reasons: string[] = [];

        // Base score from rating (0 - 25)
        const rating = typeof item.vote_average === 'number' && !isNaN(item.vote_average) ? item.vote_average : 7.0;
        score += rating * 2.5;

        // Featured boost
        if (item.featured) score += 8;

        // Check genres match
        const itemGenres = (item.genres || []).map(normalizeGenre);
        let explicitMatchCount = 0;
        let historyWeightSum = 0;
        const matchingGenreNames: string[] = [];

        itemGenres.forEach(genre => {
            if (explicitGenres.has(genre)) {
                explicitMatchCount++;
                matchingGenreNames.push(genre);
            }
            if (genreWeights.has(genre)) {
                historyWeightSum += genreWeights.get(genre) || 0;
                if (!matchingGenreNames.includes(genre)) {
                    matchingGenreNames.push(genre);
                }
            }
        });

        // Boost for explicit favorite genres (Highest signal: +45 per match)
        if (explicitMatchCount > 0) {
            score += explicitMatchCount * 45;
            if (explicitMatchCount === 1) {
                reasons.push(`Matches your favourite ${matchingGenreNames[0]}`);
            } else {
                reasons.push(`Matches your favourite genres: ${matchingGenreNames.slice(0, 2).join(' & ')}`);
            }
        }

        // Boost for watch history genre affinity (+25 per unit weight)
        if (historyWeightSum > 0) {
            score += Math.min(60, historyWeightSum * 25);
            if (reasons.length === 0 && matchingGenreNames.length > 0) {
                reasons.push(`Based on your interest in ${matchingGenreNames[0]}`);
            }
        }

        // Boost for cast affinity (+20)
        if (item.cast && Array.isArray(item.cast)) {
            const hasCastMatch = item.cast.some(actor => actor && watchedCast.has(actor.toLowerCase().trim()));
            if (hasCastMatch) {
                score += 20;
                if (reasons.length === 0) {
                    reasons.push(`Features actors you've watched`);
                }
            }
        }

        // Regional & Language Preference Boost (Indian & Hindi Cinema)
        const itemIsIndian = isIndianContent(item);
        const itemIsHindi = isHindiContent(item);

        if (historyAnalysis.isHindiAffinity) {
            if (itemIsHindi) {
                // Dominant boost for Hindi cinema when user usually watches Hindi/Indian movies
                score += 115;
                reasons.unshift('Top Pick in Hindi Cinema');
            } else if (itemIsIndian) {
                // Secondary boost for other Indian regional cinema
                score += 75;
                reasons.unshift('Popular in Indian Cinema');
            } else if (explicitMatchCount === 0) {
                // Down-rank unrelated foreign content
                score -= 40;
            }
        } else if (historyAnalysis.isIndianAffinity) {
            if (itemIsIndian) {
                score += 90;
                reasons.unshift('Popular in Indian Cinema');
            } else if (explicitMatchCount === 0) {
                score -= 30;
            }
        }

        // Penalty for already completed items (-60) to ensure fresh suggestions
        if (completedIds.has(item.id)) {
            score -= 60;
        } else if (watchedIds.has(item.id)) {
            // Partially watched: slight penalty in recommendations since it is already in continue watching
            score -= 25;
        } else {
            // Fresh unwatched bonus (+15)
            score += 15;
        }

        // Fallback reason if none matched
        let matchReason = reasons[0] || (rating >= 8.0 ? 'Critically Acclaimed' : 'Trending on MY DONKEY');

        // Calculate dynamic match percentage (ranging between 78% and 99%)
        const normalizedRatio = Math.max(0.1, Math.min(1.0, score / 200));
        const matchPercentage = Math.min(99, Math.max(76, Math.round(76 + normalizedRatio * 23)));

        scoredList.push({
            item,
            score,
            matchPercentage,
            matchReason
        });
    }

    // Sort descending by score
    scoredList.sort((a, b) => b.score - a.score);

    // Take top results
    const results = scoredList.slice(0, limit).map(res => ({
        ...res.item,
        matchPercentage: res.matchPercentage,
        matchReason: res.matchReason
    }));

    return {
        recommendations: results,
        topGenreAffinities: combinedTopGenres,
        hasPersonalization
    };
}

/**
 * Generate "Because You Watched [Title]" recommendations
 */
export function getBecauseYouWatchedSection(params: {
    watchHistory?: (ContinueWatchingItem | { movieId: string; progress?: number; lastWatchedAt?: string })[];
    allContent: Content[];
    limit?: number;
    filterType?: 'movie' | 'tv';
}): { sourceItem: Content; recommendations: Content[] } | null {
    const { watchHistory, allContent, limit = 15, filterType } = params;

    if (!watchHistory || watchHistory.length === 0 || allContent.length === 0) {
        return null;
    }

    const contentMap = new Map<string, Content>();
    allContent.forEach(item => contentMap.set(item.id, item));

    // Find the most recent watched item that exists in our catalog
    let sourceItem: Content | null = null;
    for (const entry of watchHistory) {
        const found = contentMap.get(entry.movieId);
        if (found && found.genres && found.genres.length > 0) {
            sourceItem = found;
            break;
        }
    }

    if (!sourceItem) return null;

    const sourceGenres = new Set((sourceItem.genres || []).map(normalizeGenre));
    const sourceCast = new Set((sourceItem.cast || []).map(c => c.toLowerCase().trim()));

    // Score related items
    const related = allContent
        .filter(item => {
            if (item.id === sourceItem!.id) return false;
            if (item.isPublished === false || item.isExclusive || item.accessCode) return false;
            if (filterType && item.type !== filterType) return false;
            return true;
        })
        .map(item => {
            let similarity = 0;
            const itemGenres = (item.genres || []).map(normalizeGenre);

            // Genre overlap (+30 per genre)
            itemGenres.forEach(g => {
                if (sourceGenres.has(g)) similarity += 30;
            });

            // Cast overlap (+20)
            if (item.cast) {
                item.cast.forEach(c => {
                    if (sourceCast.has(c.toLowerCase().trim())) similarity += 20;
                });
            }

            // Language & Regional alignment
            const sourceIsIndian = isIndianContent(sourceItem!);
            const sourceIsHindi = isHindiContent(sourceItem!);
            const itemIsIndian = isIndianContent(item);
            const itemIsHindi = isHindiContent(item);

            if (sourceIsIndian) {
                if (itemIsIndian) similarity += 35;
                if (sourceIsHindi && itemIsHindi) similarity += 35;
                if (!itemIsIndian) similarity -= 35;
            }

            // Quality score
            similarity += (item.vote_average || 7) * 2;

            return { item, similarity };
        })
        .filter(res => res.similarity > 25)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit)
        .map(res => res.item);

    if (related.length === 0) return null;

    return {
        sourceItem,
        recommendations: related
    };
}

/**
 * Retrieve curated picks for a specific favorite genre
 */
export function getTopPicksForGenre(params: {
    genre: string;
    allContent: Content[];
    watchedIds?: Set<string>;
    limit?: number;
    filterType?: 'movie' | 'tv';
}): Content[] {
    const { genre, allContent, watchedIds = new Set(), limit = 15, filterType } = params;
    const targetNorm = normalizeGenre(genre);

    return allContent
        .filter(item => {
            if (item.isPublished === false || item.isExclusive || item.accessCode) return false;
            if (filterType && item.type !== filterType) return false;
            const genres = (item.genres || []).map(normalizeGenre);
            return genres.includes(targetNorm);
        })
        .sort((a, b) => {
            // Prioritize unwatched
            const aWatched = watchedIds.has(a.id) ? 0 : 1;
            const bWatched = watchedIds.has(b.id) ? 0 : 1;
            if (aWatched !== bWatched) return bWatched - aWatched;

            // Then by rating
            return (b.vote_average || 0) - (a.vote_average || 0);
        })
        .slice(0, limit);
}
