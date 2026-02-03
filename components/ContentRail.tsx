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
}

const ContentRail: React.FC<ContentRailProps> = ({
    title,
    items,
    onDetails,
    isTop10 = false,
    isOriginal = false,
    layout = 'portrait'
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
                    className="absolute left-0 top-0 bottom-0 w-12 bg-black/50 z-30 opacity-0 group-hover/rail:opacity-100 transition-opacity hidden md:flex items-center justify-center hover:bg-black/70"
                >
                    <ChevronLeft size={40} />
                </button>
                <button
                    onClick={() => scroll('right')}
                    className="absolute right-0 top-0 bottom-0 w-12 bg-black/50 z-30 opacity-0 group-hover/rail:opacity-100 transition-opacity hidden md:flex items-center justify-center hover:bg-black/70"
                >
                    <ChevronRight size={40} />
                </button>

                <div
                    ref={scrollRef}
                    className="flex overflow-x-auto gap-2 md:gap-4 px-4 md:px-12 no-scrollbar scroll-smooth"
                >
                    {items.map((item, idx) => {
                        const isAdded = currentProfile?.myList.includes(item.id);

                        return (
                            <div
                                key={item.id}
                                className={`flex-shrink-0 transition-all duration-300 hover:scale-105 hover:z-20 cursor-pointer ${layout === 'landscape' ? 'w-64 md:w-80' : 'w-32 md:w-48'
                                    }`}
                                onClick={() => onDetails(item)}
                            >
                                <div className="relative aspect-[2/3] group/card rounded-md overflow-hidden bg-gray-900 shadow-xl border border-white/5">
                                    {layout === 'landscape' ? (
                                        <img src={item.backdrop_path} className="w-full h-full object-cover aspect-video" alt={item.title} />
                                    ) : (
                                        <img src={item.poster_path} className="w-full h-full object-cover" alt={item.title} />
                                    )}

                                    {/* Overlay on hover */}
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/card:opacity-100 transition-opacity flex flex-col justify-end p-4">
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

                                    {/* Top 10 Badge */}
                                    {isTop10 && (
                                        <div className="absolute top-0 left-0 bg-brand-red text-white text-[10px] font-black px-1.5 py-0.5 rounded-br uppercase tracking-tighter">
                                            TOP 10
                                        </div>
                                    )}
                                </div>

                                {/* Original Label Below */}
                                {isOriginal && (
                                    <div className="mt-2 text-[10px] text-brand-red font-bold tracking-widest uppercase text-center">
                                        My Donkey Original
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default ContentRail;