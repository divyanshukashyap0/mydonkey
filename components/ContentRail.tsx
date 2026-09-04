import React, { useRef } from 'react';
import { ChevronRight, ChevronLeft, PlayCircle, Plus, Check, Trash2 } from 'lucide-react';
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
    badge,
    subtitle,
    actionButton
}) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const { currentProfile, toggleWatchlist, currentUser, deleteContent } = useStore();
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
        <div className="relative group/rail py-2 md:py-3">
            <div className="px-4 md:px-12 mb-2 md:mb-3 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                <div>
                    {badge && (
                        <div className="mb-1.5 flex items-center">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/15 border border-red-500/30 text-red-300 shadow-sm">
                                {badge}
                            </span>
                        </div>
                    )}
                    <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2 group/title cursor-pointer text-white">
                        {title}
                        <ChevronRight size={20} className="text-brand-red opacity-0 group-hover/title:opacity-100 transition-opacity translate-y-0.5" />
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
                    className="absolute left-0 top-0 bottom-0 w-12 bg-black/50 z-30 hidden md:flex items-center justify-center hover:bg-black/70 transition-colors"
                >
                    <ChevronLeft size={40} />
                </button>
                <button
                    onClick={() => scroll('right')}
                    className="absolute right-0 top-0 bottom-0 w-12 bg-black/50 z-30 hidden md:flex items-center justify-center hover:bg-black/70 transition-colors"
                >
                    <ChevronRight size={40} />
                </button>

                <div
                    ref={scrollRef}
                    className={`flex overflow-x-auto px-4 md:px-12 no-scrollbar scroll-smooth py-2 md:py-3 ${showRanking ? 'gap-0 md:gap-0' : 'gap-3 md:gap-4'}`}
                >
                    {(!items || items.length === 0) ? (
                        <div className="text-gray-500 text-sm italic p-4">No content available.</div>
                    ) : (
                        items.map((item, idx) => {
                            const isAdded = currentProfile?.myList.includes(item.id);
                            // Ranking logic
                            const rank = idx + 1;

                            return (
                                <div
                                    key={item.id}
                                    className={`flex-shrink-0 transition-all duration-300 hover:z-20 cursor-pointer select-none relative flex items-end ${
                                        showRanking
                                            ? 'w-56 xs:w-64 sm:w-80 md:w-[420px]'
                                            : layout === 'landscape'
                                            ? 'w-56 xs:w-64 sm:w-72 md:w-88 lg:w-96'
                                            : 'w-36 xs:w-44 sm:w-52 md:w-60 lg:w-64 xl:w-72'
                                    }`}
                                    onClick={() => {
                                        if (navigator.vibrate) navigator.vibrate(10);
                                        onDetails(item);
                                    }}
                                >
                                    {showRanking && (
                                        <div className="flex-shrink-0 relative z-10 -mr-10 md:-mr-16 translate-y-6 md:translate-y-10 flex items-end pb-4">
                                            <svg
                                                viewBox="0 0 140 150"
                                                className="h-28 md:h-56 w-auto fill-black stroke-white stroke-[2px]"
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
 
                                    <div className={`relative ${showRanking ? 'w-36 xs:w-44 sm:w-52 md:w-64' : 'flex-1'} ${layout === 'landscape' ? 'aspect-video' : 'aspect-[2/3]'} group/card rounded-xl overflow-hidden shadow-xl hover:scale-105 transition-transform duration-300 z-20`}>
                                        {layout === 'landscape' ? (
                                            (item.backdrop_path || item.poster_path) ? (
                                                <picture>
                                                    {item.backdrop_path_mobile && <source media="(max-width: 767px)" srcSet={item.backdrop_path_mobile} />}
                                                    <img src={item.backdrop_path || item.poster_path} className="w-full h-full object-cover aspect-video" alt={item.title || ''} draggable={false} />
                                                </picture>
                                            ) : (
                                                <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-xs text-gray-500 aspect-video">No Image</div>
                                            )
                                        ) : (
                                            (item.poster_path_mobile || item.poster_path) ? (
                                                <img
                                                    src={item.poster_path_mobile || item.poster_path}
                                                    className="w-full h-full object-cover"
                                                    alt={item.title || ''}
                                                    draggable={false}
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-xs text-gray-500 aspect-[2/3]">No Poster</div>
                                            )
                                        )}

                                        {/* Overlay on hover */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent opacity-0 group-hover/card:opacity-100 transition-all duration-300 flex flex-col justify-end p-4 translate-y-4 group-hover/card:translate-y-0">
                                            <div className="flex items-center gap-2 mb-3">
                                                <PlayCircle 
                                                    size={32} 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (onPlay) {
                                                            onPlay(item, 'movie');
                                                        } else {
                                                            onDetails(item);
                                                        }
                                                    }}
                                                    className="text-white fill-white hover:text-brand-red hover:fill-brand-red transition-colors cursor-pointer active:scale-95" 
                                                />
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); toggleWatchlist(item.id); }}
                                                    className="bg-gray-600/50 p-1.5 rounded-full border border-white/20 hover:border-white transition"
                                                >
                                                    {isAdded ? <Check size={18} className="text-green-400" /> : <Plus size={18} />}
                                                </button>
                                            </div>
                                            <div className="text-sm font-bold truncate">{item.title}</div>
                                            <div className="flex items-center gap-2 text-[10px] mt-1">
                                                <span className="text-green-400 font-bold">
                                                    {(item as any).matchPercentage
                                                        ? `${(item as any).matchPercentage}% Match`
                                                        : `${(item.vote_average ? item.vote_average * 10 : 85).toFixed(0)}% Match`}
                                                </span>
                                                <span className="border border-white/30 px-1 rounded">HD</span>
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