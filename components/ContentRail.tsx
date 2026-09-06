import React, { useRef } from 'react';
import { ChevronRight, ChevronLeft, Play, Plus, Check, ThumbsUp, Trash2 } from 'lucide-react';
import { Content } from '../types';
import { useStore } from '../context/StoreContext';

interface ContentRailProps {
    title: string;
    items: Content[];
    onDetails: (item: Content) => void;
    onPlay?: (item: Content, mode?: 'trailer' | 'movie') => void;
    isTop10?: boolean;
    isOriginal?: boolean;
    layout?: 'portrait' | 'landscape';
    showRanking?: boolean;
    size?: 'standard' | 'mid';
    badge?: string;
    subtitle?: string;
    actionButton?: React.ReactNode;
}

const ContentRail: React.FC<ContentRailProps> = ({
    title,
    items,
    onDetails,
    onPlay,
    isTop10 = false,
    isOriginal = false,
    layout = 'portrait',
    showRanking = false,
    size = 'standard',
    badge,
    subtitle,
    actionButton
}) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const { currentProfile, toggleWatchlist, likedContent, toggleLike, currentUser, deleteContent } = useStore();
    const isAdmin = currentUser?.role === 'admin';

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const { scrollLeft, clientWidth } = scrollRef.current;
            const scrollTo = direction === 'left' ? scrollLeft - clientWidth : scrollLeft + clientWidth;
            scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
        }
    };

    if (!items || items.length === 0) return null;

    return (
        <div className={`relative group/rail ${size === 'mid' ? 'py-1 md:py-2' : 'py-2 md:py-3'}`}>
            <div className={`${size === 'mid' ? 'px-0 mb-2' : 'px-4 md:px-12 mb-2 md:mb-3'} flex flex-col sm:flex-row sm:items-end justify-between gap-2`}>
                <div>
                    {badge && (
                        <div className="mb-1.5 flex items-center">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/15 border border-red-500/30 text-red-300 shadow-sm">
                                {badge}
                            </span>
                        </div>
                    )}
                    <h2 className={`${size === 'mid' ? 'text-lg md:text-xl' : 'text-xl md:text-2xl'} font-bold flex items-center gap-2 group/title cursor-pointer text-white`}>
                        {title}
                        <ChevronRight size={size === 'mid' ? 16 : 20} className="text-brand-red opacity-0 group-hover/title:opacity-100 transition-opacity translate-y-0.5" />
                    </h2>
                    {subtitle && (
                        <p className="text-xs md:text-sm text-gray-400 mt-1 font-normal leading-relaxed">{subtitle}</p>
                    )}
                </div>
                {actionButton && (
                    <div className="flex-shrink-0 self-start sm:self-auto">
                        {actionButton}
                    </div>
                )}
            </div>

            <div className="relative">
                {/* Navigation Buttons */}
                <button
                    onClick={() => scroll('left')}
                    aria-label="Scroll left"
                    className={`absolute left-2 md:left-3 top-1/2 -translate-y-1/2 ${
                        size === 'mid' ? 'w-9 h-9 md:w-10 md:h-10' : 'w-10 h-10 md:w-11 md:h-11'
                    } rounded-full bg-black/75 hover:bg-black/95 text-white/90 hover:text-white backdrop-blur-md border border-white/20 shadow-[0_4px_20px_rgba(0,0,0,0.6)] z-30 hidden md:flex items-center justify-center hover:scale-110 active:scale-95 transition-all opacity-85 hover:opacity-100 cursor-pointer`}
                >
                    <ChevronLeft size={size === 'mid' ? 20 : 24} />
                </button>
                <button
                    onClick={() => scroll('right')}
                    aria-label="Scroll right"
                    className={`absolute right-2 md:right-3 top-1/2 -translate-y-1/2 ${
                        size === 'mid' ? 'w-9 h-9 md:w-10 md:h-10' : 'w-10 h-10 md:w-11 md:h-11'
                    } rounded-full bg-black/75 hover:bg-black/95 text-white/90 hover:text-white backdrop-blur-md border border-white/20 shadow-[0_4px_20px_rgba(0,0,0,0.6)] z-30 hidden md:flex items-center justify-center hover:scale-110 active:scale-95 transition-all opacity-85 hover:opacity-100 cursor-pointer`}
                >
                    <ChevronRight size={size === 'mid' ? 20 : 24} />
                </button>

                <div
                    ref={scrollRef}
                    className={`flex overflow-x-auto ${size === 'mid' ? 'px-0 gap-2.5 md:gap-3.5' : 'px-4 md:px-12 gap-3 md:gap-4'} no-scrollbar scroll-smooth py-1.5 md:py-2.5`}
                >
                    {(!items || items.length === 0) ? (
                        <div className="text-gray-500 text-sm italic p-4">No content available.</div>
                    ) : (
                        items.map((item, idx) => {
                            const isAdded = currentProfile?.myList?.includes(item.id) ?? false;
                            const isLiked = likedContent?.includes(item.id) ?? false;
                            // Ranking logic
                            const rank = idx + 1;

                            return (
                                <div
                                    key={item.id}
                                    className={`flex-shrink-0 transition-all duration-300 hover:z-20 cursor-pointer select-none relative flex items-end ${
                                        size === 'mid'
                                            ? (showRanking
                                                ? 'w-36 xs:w-40 sm:w-44 md:w-48'
                                                : layout === 'landscape'
                                                ? 'w-44 xs:w-48 sm:w-56 md:w-64'
                                                : 'w-28 xs:w-32 sm:w-36 md:w-40 lg:w-44')
                                            : (showRanking
                                                ? 'w-56 xs:w-64 sm:w-80 md:w-[420px]'
                                                : layout === 'landscape'
                                                ? 'w-56 xs:w-64 sm:w-72 md:w-88 lg:w-96'
                                                : 'w-36 xs:w-44 sm:w-52 md:w-60 lg:w-64 xl:w-72')
                                    }`}
                                    onClick={() => {
                                        if (navigator.vibrate) navigator.vibrate(10);
                                        onDetails(item);
                                    }}
                                >
                                    {showRanking && (
                                        <div className={`flex-shrink-0 relative z-10 ${size === 'mid' ? '-mr-5 md:-mr-7 translate-y-2 md:translate-y-4 pb-2' : '-mr-10 md:-mr-16 translate-y-6 md:translate-y-10 pb-4'} flex items-end`}>
                                            <svg
                                                viewBox="0 0 140 150"
                                                className={`${size === 'mid' ? 'h-16 md:h-20' : 'h-28 md:h-56'} w-auto fill-black stroke-white stroke-[2px]`}
                                                style={{ filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.5))' }}
                                            >
                                                <text
                                                    x="125"
                                                    y="140"
                                                    textAnchor="end"
                                                    fontSize="160"
                                                    fontWeight="900"
                                                    style={{ fontFamily: "var(--font-rank, 'Anton'), Impact, sans-serif" }}
                                                    className="fill-black stroke-[#595959]"
                                                    strokeWidth="4px"
                                                >
                                                    {rank}
                                                </text>
                                            </svg>
                                        </div>
                                    )}
 
                                    <div className={`relative ${showRanking ? (size === 'mid' ? 'w-24 xs:w-28 sm:w-32 md:w-36' : 'w-36 xs:w-44 sm:w-52 md:w-64') : 'flex-1'} ${layout === 'landscape' ? 'aspect-video' : 'aspect-[2/3]'} group/card rounded-xl overflow-hidden shadow-xl hover:scale-105 transition-transform duration-300 z-20`}>
                                        {layout === 'landscape' ? (
                                            (item.backdrop_path || item.poster_path) ? (
                                                <picture>
                                                    {item.backdrop_path_mobile && <source media="(max-width: 767px)" srcSet={item.backdrop_path_mobile} />}
                                                    <img 
                                                        src={item.backdrop_path || item.poster_path} 
                                                        className="w-full h-full object-cover aspect-video" 
                                                        alt={item.title || ''} 
                                                        draggable={false} 
                                                        loading="lazy" 
                                                        decoding="async" 
                                                        onError={(e) => {
                                                            const t = e.currentTarget;
                                                            if (!t.src.endsWith('/logo.png')) {
                                                                t.src = '/logo.png';
                                                                t.className = "w-full h-full object-contain p-4 bg-zinc-900 aspect-video";
                                                            }
                                                        }}
                                                    />
                                                </picture>
                                            ) : (
                                                <img src="/logo.png" className="w-full h-full object-contain p-4 bg-zinc-900 aspect-video" alt={item.title || ''} />
                                            )
                                        ) : (
                                            (item.poster_path_mobile || item.poster_path) ? (
                                                <img
                                                    src={item.poster_path_mobile || item.poster_path}
                                                    className="w-full h-full object-cover"
                                                    alt={item.title || ''}
                                                    draggable={false}
                                                    loading="lazy"
                                                    decoding="async"
                                                    onError={(e) => {
                                                        const t = e.currentTarget;
                                                        if (!t.src.endsWith('/logo.png')) {
                                                            t.src = '/logo.png';
                                                            t.className = "w-full h-full object-contain p-4 bg-zinc-900 aspect-[2/3]";
                                                        }
                                                    }}
                                                />
                                            ) : (
                                                <img src="/logo.png" className="w-full h-full object-contain p-4 bg-zinc-900 aspect-[2/3]" alt={item.title || ''} />
                                            )
                                        )}

                                        {/* Overlay on hover */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent opacity-0 group-hover/card:opacity-100 transition-all duration-300 flex flex-col justify-end p-4 translate-y-4 group-hover/card:translate-y-0">
                                            <div className="flex items-center gap-2 mb-3">
                                                {/* Play Button */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (onPlay) {
                                                            onPlay(item, 'movie');
                                                        } else {
                                                            onDetails(item);
                                                        }
                                                    }}
                                                    className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:bg-neutral-200 transition-all cursor-pointer active:scale-95 shadow-md flex-shrink-0"
                                                    title="Play"
                                                >
                                                    <Play size={15} className="fill-black text-black ml-0.5" />
                                                </button>

                                                {/* Add to My List Button */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleWatchlist(item.id);
                                                    }}
                                                    className="w-8 h-8 rounded-full bg-zinc-800/80 hover:bg-zinc-700/80 border border-white/30 hover:border-white text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-md flex-shrink-0"
                                                    title={isAdded ? "Remove from My List" : "Add to My List"}
                                                >
                                                    {isAdded ? <Check size={16} className="text-green-400" /> : <Plus size={16} className="text-white" />}
                                                </button>

                                                {/* Like Button */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleLike(item.id);
                                                    }}
                                                    className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-md flex-shrink-0 ${
                                                        isLiked
                                                            ? 'bg-white/25 border-white text-white'
                                                            : 'bg-zinc-800/80 hover:bg-zinc-700/80 border-white/30 hover:border-white text-white'
                                                    }`}
                                                    title={isLiked ? "Liked" : "Like"}
                                                >
                                                    <ThumbsUp size={14} className={isLiked ? "fill-white text-white" : "text-white"} />
                                                </button>
                                            </div>
                                            <div className="text-sm font-bold truncate">{item.title}</div>
                                            <div className="flex items-center gap-2 text-[10px] mt-1">
                                                <span className="border border-white/30 px-1 rounded">HD</span>
                                                {item.year && <span className="text-gray-300 font-medium">{item.year}</span>}
                                                {item.addedBy && (
                                                    <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.2 rounded font-medium truncate max-w-[80px]">
                                                        User Added
                                                    </span>
                                                )}
                                            </div>
                                            {(item as any).matchReason && (
                                                <div className="text-[10px] text-amber-300/90 font-medium truncate mt-0.5">
                                                    {(item as any).matchReason}
                                                </div>
                                            )}
                                        </div>

                                        {/* Admin Corner Delete Button on Hover */}
                                        {isAdmin && (
                                            <button
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    if (window.confirm(`Admin: Remove "${item.title}" from the platform?\n\nThis will immediately remove this content and its poster from the platform.`)) {
                                                        try {
                                                            await deleteContent(item.id);
                                                        } catch (err: any) {
                                                            alert(`Failed to delete: ${err.message || err}`);
                                                        }
                                                    }
                                                }}
                                                className="absolute top-2 right-2 z-30 p-2 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-2xl opacity-0 group-hover/card:opacity-100 transition-all duration-200 hover:scale-110 active:scale-95 border border-white/20"
                                                title="Admin: Remove Content"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        )}

                                        {/* Progress Bar (if available) */}
                                        {item.progress && item.progress > 0 && (
                                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700">
                                                <div className="h-full bg-brand-red" style={{ width: `${item.progress}%` }}></div>
                                            </div>
                                        )}

                                        {/* Top 10 Badge (if explicit top 10 but not using numbered raking, or both) */}
                                        {isTop10 && !showRanking && (
                                            <div className="absolute top-0 left-0 bg-brand-red text-white text-[10px] font-black px-1.5 py-0.5 rounded-br uppercase tracking-tighter">
                                                TOP 10
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default ContentRail;