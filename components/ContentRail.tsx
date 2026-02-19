import React, { useRef } from 'react';
import { ChevronRight, ChevronLeft, PlayCircle, Plus, Check } from 'lucide-react';
import { Content } from '../types';
import { useStore } from '../context/StoreContext';

interface ContentRailProps {
    title: string;
    items: Content[];
    onDetails: (item: Content) => void;
    isTop10?: boolean;
    isOriginal?: boolean;
    layout?: 'portrait' | 'landscape';
    showRanking?: boolean;
}

const ContentRail: React.FC<ContentRailProps> = ({
    title,
    items,
    onDetails,
    isTop10 = false,
    isOriginal = false,
    layout = 'portrait',
    showRanking = false
}) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const { currentProfile, toggleWatchlist } = useStore();

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const { scrollLeft, clientWidth } = scrollRef.current;
            const scrollTo = direction === 'left' ? scrollLeft - clientWidth : scrollLeft + clientWidth;
            scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
        }
    };

    if (!items || items.length === 0) return null;

    return (
        <div className="relative group/rail pb-8">
            <h2 className="text-xl md:text-2xl font-bold mb-4 px-4 md:px-12 flex items-center gap-2 group/title cursor-pointer">
                {title}
                <ChevronRight size={20} className="text-brand-red opacity-0 group-hover/title:opacity-100 transition-opacity translate-y-0.5" />
            </h2>

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
                    className={`flex overflow-x-auto px-4 md:px-12 no-scrollbar scroll-smooth ${showRanking ? 'gap-0 md:gap-0' : 'gap-2 md:gap-4'}`}
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
                                    className={`flex-shrink-0 transition-all duration-500 hover:z-20 cursor-pointer select-none relative flex items-center ${showRanking ? 'w-48 md:w-96' : (layout === 'landscape' ? 'w-36 md:w-80' : 'w-24 md:w-48')}`}
                                    onClick={() => {
                                        if (navigator.vibrate) navigator.vibrate(10);
                                        onDetails(item);
                                    }}
                                >
                                    {showRanking && (
                                        <div className="flex-shrink-0 relative z-10 -mr-8 md:-mr-16 translate-y-0 flex items-end pb-4">
                                            <svg
                                                viewBox="0 0 140 150"
                                                className="h-32 md:h-64 w-auto fill-black stroke-white stroke-[2px]"
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

                                    <div className={`relative flex-1 ${layout === 'landscape' ? 'aspect-video' : 'aspect-[2/3]'} group/card rounded-lg overflow-hidden shadow-xl hover:scale-110 transition-transform duration-300 z-20`}>
                                        {layout === 'landscape' ? (
                                            <picture>
                                                {item.backdrop_path_mobile && <source media="(max-width: 767px)" srcSet={item.backdrop_path_mobile} />}
                                                <img src={item.backdrop_path} className="w-full h-full object-cover aspect-video" alt={item.title} draggable={false} />
                                            </picture>
                                        ) : (
                                            <img
                                                src={item.poster_path_mobile || item.poster_path}
                                                className="w-full h-full object-cover"
                                                alt={item.title}
                                                draggable={false}
                                            />
                                        )}

                                        {/* Overlay on hover */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent opacity-0 group-hover/card:opacity-100 transition-all duration-300 flex flex-col justify-end p-4 translate-y-4 group-hover/card:translate-y-0">
                                            <div className="flex gap-2 mb-3">
                                                <PlayCircle size={32} className="text-white fill-white hover:text-brand-red hover:fill-brand-red transition-colors" />
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); toggleWatchlist(item.id); }}
                                                    className="bg-gray-600/50 p-1.5 rounded-full border border-white/20 hover:border-white transition"
                                                >
                                                    {isAdded ? <Check size={18} className="text-green-400" /> : <Plus size={18} />}
                                                </button>
                                            </div>
                                            <div className="text-sm font-bold truncate">{item.title}</div>
                                            <div className="flex items-center gap-2 text-[10px] mt-1">
                                                <span className="text-green-400 font-bold">{(item.vote_average * 10).toFixed(0)}% Match</span>
                                                <span className="border border-white/30 px-1 rounded">HD</span>
                                            </div>
                                        </div>

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