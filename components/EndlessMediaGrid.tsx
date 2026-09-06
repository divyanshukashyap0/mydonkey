import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Star, Sparkles, Film, Tv, Loader2 } from 'lucide-react';
import { Content } from '../types';
import { useStore } from '../context/StoreContext';
import { fetchEndlessDiscoverPage } from '../services/tmdbService';

interface EndlessMediaGridProps {
    title: string;
    subtitle?: string;
    type: 'movie' | 'tv' | 'all';
    initialItems: Content[];
    onDetails: (item: Content) => void;
    onPlay?: (item: Content, mode?: 'trailer' | 'movie') => void;
    isHomeStream?: boolean;
    region?: 'all' | 'indian' | 'global';
    batchSize?: number;
}

export const EndlessMediaGrid: React.FC<EndlessMediaGridProps> = ({
    title,
    subtitle,
    type,
    initialItems,
    onDetails,
    onPlay,
    isHomeStream = false,
    region = 'all',
    batchSize = 24
}) => {
    const { settings } = useStore();

    // The full combined list of items currently displayed
    const [items, setItems] = useState<Content[]>([]);
    
    // Index into initialItems for progressive revealing of catalog content
    const catalogCursorRef = useRef(0);
    
    // TMDB pagination page counter for endless fetching once catalog items are revealed
    const tmdbPageRef = useRef(1);
    
    // Loading and fetch state flags
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const isFetchingRef = useRef(false);
    
    // Set of item IDs to guarantee strict deduplication
    const seenIdsRef = useRef<Set<string>>(new Set());

    // Sentinel element for IntersectionObserver
    const sentinelRef = useRef<HTMLDivElement | null>(null);

    // Initialize or reset when type or initialItems changes
    useEffect(() => {
        seenIdsRef.current.clear();
        catalogCursorRef.current = 0;
        tmdbPageRef.current = 1;
        setHasMore(true);

        const initialBatch: Content[] = [];
        const initialSlice = initialItems.slice(0, batchSize);
        catalogCursorRef.current = initialSlice.length;

        initialSlice.forEach(item => {
            const key = item.id || `tmdb_${item.tmdbId}`;
            if (!seenIdsRef.current.has(key)) {
                seenIdsRef.current.add(key);
                initialBatch.push(item);
            }
        });

        setItems(initialBatch);
    }, [type, initialItems, batchSize]);

    // Function to load the next batch of content (from catalog or TMDB)
    const loadMore = useCallback(async () => {
        if (isFetchingRef.current || !hasMore) return;
        isFetchingRef.current = true;
        setIsLoadingMore(true);

        try {
            const newItems: Content[] = [];

            // 1. Reveal remaining catalog items if any
            if (catalogCursorRef.current < initialItems.length) {
                const nextSlice = initialItems.slice(
                    catalogCursorRef.current,
                    catalogCursorRef.current + batchSize
                );
                catalogCursorRef.current += nextSlice.length;

                nextSlice.forEach(item => {
                    const key = item.id || `tmdb_${item.tmdbId}`;
                    if (!seenIdsRef.current.has(key)) {
                        seenIdsRef.current.add(key);
                        newItems.push(item);
                    }
                });
            }

            // 2. Fetch endless titles from TMDB if catalog slice is small or exhausted
            if (newItems.length < batchSize) {
                const pageToFetch = tmdbPageRef.current;
                tmdbPageRef.current += 1;

                const tmdbResults = await fetchEndlessDiscoverPage({
                    type,
                    page: pageToFetch,
                    region,
                    sortBy: 'popular',
                    settings
                });

                if (tmdbResults && tmdbResults.length > 0) {
                    tmdbResults.forEach(item => {
                        const key = item.id || `tmdb_${item.tmdbId}`;
                        const normalizedTitle = item.title?.toLowerCase().trim();

                        // Avoid adding duplicates
                        if (!seenIdsRef.current.has(key)) {
                            seenIdsRef.current.add(key);
                            newItems.push(item);
                        }
                    });
                } else if (catalogCursorRef.current >= initialItems.length) {
                    // Only stop if both catalog and TMDB return nothing
                    setHasMore(false);
                }
            }

            if (newItems.length > 0) {
                setItems(prev => [...prev, ...newItems]);
            }
        } catch (err) {
            console.error('[EndlessMediaGrid] loadMore error:', err);
        } finally {
            setIsLoadingMore(false);
            isFetchingRef.current = false;
        }
    }, [hasMore, initialItems, batchSize, type, region, settings]);

    // IntersectionObserver to trigger loading when reaching the bottom
    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const first = entries[0];
                if (first.isIntersecting && !isFetchingRef.current && hasMore) {
                    loadMore();
                }
            },
            {
                root: null,
                rootMargin: '600px', // Fetch well before hitting bottom
                threshold: 0.05
            }
        );

        observer.observe(sentinel);

        return () => {
            observer.disconnect();
        };
    }, [loadMore, hasMore]);

    return (
        <div className="pt-6 pb-16 w-full">
            {/* Header */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/15 border border-red-500/30 text-red-400">
                            <Sparkles size={12} className="animate-pulse" />
                            Endless Catalog
                        </span>
                        <span className="text-xs text-gray-500 font-medium">
                            {items.length} titles loaded
                        </span>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
                        {type === 'movie' && <Film className="text-brand-red hidden sm:inline" size={26} />}
                        {type === 'tv' && <Tv className="text-brand-red hidden sm:inline" size={26} />}
                        {type === 'all' && <Sparkles className="text-brand-red hidden sm:inline" size={26} />}
                        <span>{title}</span>
                    </h2>
                    {subtitle && (
                        <p className="text-sm text-gray-400 mt-1 font-normal max-w-2xl leading-relaxed">
                            {subtitle}
                        </p>
                    )}
                </div>
            </div>

            {/* Endless Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 sm:gap-4 md:gap-5">
                {items.map((item) => {
                    const posterSrc = item.poster_path_mobile || item.poster_path || '/logo.png';
                    const rating = item.vote_average ? item.vote_average.toFixed(1) : null;
                    const primaryGenre = item.genres?.[0];

                    return (
                        <div
                            key={item.id}
                            onClick={() => onDetails(item)}
                            className="group relative cursor-pointer aspect-[2/3] rounded-xl overflow-hidden bg-zinc-900/90 border border-white/10 shadow-lg hover:shadow-[0_10px_30px_rgba(229,9,20,0.3)] hover:border-brand-red/60 transition-all duration-300 hover:scale-[1.04] hover:z-20"
                        >
                            {/* Poster Image */}
                            <img
                                src={posterSrc}
                                alt={item.title}
                                loading="lazy"
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                onError={(e) => {
                                    const t = e.currentTarget;
                                    if (!t.src.endsWith('/logo.png')) {
                                        t.src = '/logo.png';
                                        t.className = "w-full h-full object-contain p-4 bg-zinc-900";
                                    }
                                }}
                            />

                            {/* Badge for Type (when showing both movies & tv on home) */}
                            {type === 'all' && item.type && (
                                <div className="absolute top-2 left-2 z-10">
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-black/75 text-gray-200 border border-white/15 backdrop-blur-md">
                                        {item.type === 'tv' ? 'Series' : 'Movie'}
                                    </span>
                                </div>
                            )}

                            {/* Rating badge if high rating */}
                            {rating && parseFloat(rating) >= 7.0 && (
                                <div className="absolute top-2 right-2 z-10">
                                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-500/90 text-black shadow-md">
                                        <Star size={10} className="fill-black text-black" />
                                        {rating}
                                    </span>
                                </div>
                            )}

                            {/* Hover Overlay with details & Quick Play */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3 text-left">
                                <h3 className="text-white font-bold text-sm leading-snug line-clamp-2 drop-shadow-md mb-1">
                                    {item.title}
                                </h3>

                                <div className="flex items-center gap-2 text-[11px] text-gray-300 mb-2.5">
                                    {item.year && <span>{item.year}</span>}
                                    {item.year && primaryGenre && <span>•</span>}
                                    {primaryGenre && <span className="text-red-400 font-semibold truncate">{primaryGenre}</span>}
                                </div>

                                <div className="flex items-center gap-2 pt-1 border-t border-white/10">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (onPlay) {
                                                onPlay(item, 'movie');
                                            } else {
                                                onDetails(item);
                                            }
                                        }}
                                        className="flex-1 py-1.5 px-2.5 rounded-lg bg-brand-red hover:bg-red-600 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition"
                                    >
                                        <Play size={12} className="fill-white" />
                                        <span>Watch</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Skeletons while loading more */}
                {isLoadingMore && (
                    <>
                        {Array.from({ length: 16 }).map((_, i) => (
                            <div
                                key={`skeleton-${i}`}
                                className="aspect-[2/3] rounded-xl bg-zinc-800/50 border border-white/5 animate-pulse flex flex-col justify-end p-3 relative overflow-hidden"
                            >
                                <div className="h-3.5 bg-zinc-700/60 rounded w-3/4 mb-2" />
                                <div className="h-2.5 bg-zinc-700/40 rounded w-1/2" />
                            </div>
                        ))}
                    </>
                )}
            </div>

            {/* Bottom Sentinel and Loading Status */}
            <div ref={sentinelRef} className="h-20 w-full flex items-center justify-center mt-6">
                {isLoadingMore ? (
                    <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-zinc-900/90 border border-white/10 text-gray-300 text-xs shadow-lg">
                        <Loader2 size={16} className="animate-spin text-brand-red" />
                        <span>Discovering more {type === 'tv' ? 'shows' : (type === 'movie' ? 'movies' : 'titles')}...</span>
                    </div>
                ) : !hasMore && items.length > 0 ? (
                    <div className="text-gray-500 text-xs font-medium tracking-wider uppercase py-4">
                        You have explored all titles in this stream
                    </div>
                ) : null}
            </div>
        </div>
    );
};
