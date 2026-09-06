import React, { useState, useEffect, useRef } from 'react';
import { Play, Plus, Check, ThumbsUp, Star, Film, Tv, Sparkles, Loader2 } from 'lucide-react';
import { Content } from '../types';
import { useStore } from '../context/StoreContext';
import { fetchEndlessDiscoverPage } from '../services/tmdbService';
import Pagination from './Pagination';

interface PaginatedMediaGridProps {
    title: string;
    subtitle?: string;
    type: 'movie' | 'tv' | 'all';
    catalogItems: Content[];
    onDetails: (item: Content) => void;
    onPlay?: (item: Content, mode?: 'trailer' | 'movie') => void;
    itemsPerPage?: number;
    totalMaxPages?: number;
}

export const PaginatedMediaGrid: React.FC<PaginatedMediaGridProps> = ({
    title,
    subtitle,
    type,
    catalogItems,
    onDetails,
    onPlay,
    itemsPerPage = 20,
    totalMaxPages = 100
}) => {
    const { settings, currentProfile, toggleWatchlist, likedContent, toggleLike } = useStore();
    const [currentPage, setCurrentPage] = useState(1);
    const [items, setItems] = useState<Content[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Cache fetched TMDB pages to make pagination instantaneous when navigating back & forth
    const pageCacheRef = useRef<Record<number, Content[]>>({});
    const gridRef = useRef<HTMLDivElement | null>(null);

    // Calculate total pages: catalog pages + dynamic TMDB discover pages
    const catalogPagesCount = Math.max(1, Math.ceil(catalogItems.length / itemsPerPage));
    const totalPages = Math.max(catalogPagesCount, totalMaxPages);

    useEffect(() => {
        // Clear cache when content or type changes
        pageCacheRef.current = {};
        setCurrentPage(1);
    }, [type]);

    useEffect(() => {
        let isCancelled = false;

        const loadPageContent = async () => {
            // 1. If within catalog content scope
            if (currentPage <= catalogPagesCount) {
                const startIndex = (currentPage - 1) * itemsPerPage;
                const slice = catalogItems.slice(startIndex, startIndex + itemsPerPage);
                if (!isCancelled) {
                    setItems(slice);
                    setIsLoading(false);
                }
                return;
            }

            // 2. Beyond catalog content: check local cache first
            if (pageCacheRef.current[currentPage]) {
                if (!isCancelled) {
                    setItems(pageCacheRef.current[currentPage]);
                    setIsLoading(false);
                }
                return;
            }

            // 3. Fetch from TMDB Discover API
            setIsLoading(true);
            try {
                const tmdbPageToFetch = currentPage - catalogPagesCount;
                const tmdbResults = await fetchEndlessDiscoverPage({
                    type,
                    page: tmdbPageToFetch,
                    region: 'all',
                    sortBy: 'popular',
                    settings
                });

                if (isCancelled) return;

                const resultsSlice = tmdbResults.slice(0, itemsPerPage);
                pageCacheRef.current[currentPage] = resultsSlice;
                setItems(resultsSlice);
            } catch (err) {
                console.error('[PaginatedMediaGrid] Failed to fetch page:', err);
                if (!isCancelled) setItems([]);
            } finally {
                if (!isCancelled) setIsLoading(false);
            }
        };

        loadPageContent();

        return () => {
            isCancelled = true;
        };
    }, [currentPage, catalogItems, catalogPagesCount, itemsPerPage, type, settings]);

    const handlePageChange = (newPage: number) => {
        if (newPage < 1 || newPage > totalPages || newPage === currentPage) return;
        setCurrentPage(newPage);

        // Smooth scroll to top of this section
        if (gridRef.current) {
            const yOffset = -90; // offset for sticky top navbar
            const y = gridRef.current.getBoundingClientRect().top + window.pageYOffset + yOffset;
            window.scrollTo({ top: y, behavior: 'smooth' });
        }
    };

    return (
        <div ref={gridRef} className="pt-8 pb-16 w-full scroll-mt-24">
            {/* Header */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/15 border border-red-500/30 text-red-400">
                            <Sparkles size={12} className="animate-pulse" />
                            {itemsPerPage} Titles
                        </span>
                        <span className="text-xs text-gray-500 font-medium">
                            Page {currentPage} of {totalPages}
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

            {/* Grid of exactly 20 items */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 2xl:grid-cols-8 gap-3 sm:gap-4 md:gap-5">
                {isLoading
                    ? Array.from({ length: itemsPerPage }).map((_, i) => (
                        <div
                            key={`skeleton-${i}`}
                            className="aspect-[2/3] rounded-xl bg-zinc-800/50 border border-white/5 animate-pulse flex flex-col justify-end p-3 relative overflow-hidden"
                        >
                            <div className="h-3.5 bg-zinc-700/60 rounded w-3/4 mb-2" />
                            <div className="h-2.5 bg-zinc-700/40 rounded w-1/2" />
                        </div>
                    ))
                    : items.map((item) => {
                        const posterSrc = item.poster_path_mobile || item.poster_path || '/logo.png';
                        const rating = item.vote_average ? item.vote_average.toFixed(1) : null;
                        const primaryGenre = item.genres?.[0];
                        const isAdded = currentProfile?.myList?.includes(item.id) ?? false;
                        const isLiked = likedContent?.includes(item.id) ?? false;

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

                                {/* Type Badge */}
                                {type === 'all' && item.type && (
                                    <div className="absolute top-2 left-2 z-10">
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-black/75 text-gray-200 border border-white/15 backdrop-blur-md">
                                            {item.type === 'tv' ? 'Series' : 'Movie'}
                                        </span>
                                    </div>
                                )}

                                {/* Rating badge */}
                                {rating && parseFloat(rating) >= 6.5 && (
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

                                    <div className="flex items-center gap-1.5 pt-1 border-t border-white/10">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (onPlay) {
                                                    onPlay(item, 'movie');
                                                } else {
                                                    onDetails(item);
                                                }
                                            }}
                                            className="flex-1 py-1.5 px-2 rounded-lg bg-brand-red hover:bg-red-600 text-white font-semibold text-xs flex items-center justify-center gap-1 shadow-md active:scale-95 transition"
                                        >
                                            <Play size={12} className="fill-white" />
                                            <span>Watch</span>
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleWatchlist(item.id);
                                            }}
                                            className="p-1.5 rounded-lg bg-zinc-800/90 hover:bg-zinc-700 border border-white/20 text-white transition active:scale-95 flex items-center justify-center"
                                            title={isAdded ? "Remove from My List" : "Add to My List"}
                                        >
                                            {isAdded ? <Check size={13} className="text-green-400" /> : <Plus size={13} />}
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleLike(item.id);
                                            }}
                                            className={`p-1.5 rounded-lg border transition active:scale-95 flex items-center justify-center ${
                                                isLiked ? 'bg-white/25 border-white text-white' : 'bg-zinc-800/90 hover:bg-zinc-700 border-white/20 text-white'
                                            }`}
                                            title={isLiked ? "Liked" : "Like"}
                                        >
                                            <ThumbsUp size={13} className={isLiked ? "fill-white text-white" : "text-white"} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="mt-8">
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                    />
                </div>
            )}
        </div>
    );
};
