import React from 'react';

const HeroSkeleton: React.FC = () => {
    return (
        <div className="relative w-full overflow-hidden bg-[#111114] h-[64vh] sm:h-[70vh] lg:h-[85vh]">
            {/* Background Shimmer */}
            <div className="absolute inset-0 skeleton-shimmer opacity-45" />

            {/* Gradient Overlays to match HeroBanner */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0b] via-[#0a0a0b]/45 to-transparent z-20" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0b]/85 via-[#0a0a0b]/30 to-transparent z-20" />

            {/* Content Placeholder */}
            <div className="absolute bottom-0 left-0 right-0 z-40 px-4 sm:px-8 md:px-12 lg:px-16 pb-8 md:pb-14">
                <div className="max-w-2xl space-y-4">
                    <h1 className="sr-only">My Donkey - Watch Free Movies, TV Shows &amp; Anime in HD</h1>
                    <div className="h-5 w-28 rounded-full skeleton-shimmer" aria-hidden="true" />
                    <div className="h-10 md:h-16 skeleton-shimmer rounded-lg w-3/4" aria-hidden="true" />

                    {/* Metadata Placeholder */}
                    <div className="flex gap-3">
                        <div className="h-5 w-16 skeleton-shimmer rounded" />
                        <div className="h-5 w-12 skeleton-shimmer rounded" />
                        <div className="h-5 w-20 skeleton-shimmer rounded" />
                    </div>

                    {/* Description Placeholder */}
                    <div className="hidden md:block space-y-2 py-1">
                        <div className="h-3.5 skeleton-shimmer rounded w-full" />
                        <div className="h-3.5 skeleton-shimmer rounded w-5/6" />
                        <div className="h-3.5 skeleton-shimmer rounded w-4/6" />
                    </div>

                    {/* Buttons Placeholder */}
                    <div className="flex gap-3 pt-3">
                        <div className="h-11 md:h-12 w-32 md:w-36 skeleton-shimmer rounded-xl" />
                        <div className="h-11 md:h-12 w-36 md:w-40 skeleton-shimmer rounded-xl" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HeroSkeleton;
