import React from 'react';

const HeroSkeleton: React.FC = () => {
    return (
        <div className="relative w-full overflow-hidden bg-[#0a0a0a] h-[70vh] lg:h-[85vh] animate-pulse">
            {/* Background Placeholder */}
            <div className="absolute inset-0 bg-gray-900/50" />

            {/* Gradient Overlays to match HeroBanner */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/30 to-transparent z-20" />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#141414] to-transparent z-20" />

            {/* Content Placeholder */}
            <div className="absolute bottom-0 left-0 right-0 z-40 px-6 md:px-12 lg:px-16 pb-6 md:pb-12">
                <div className="max-w-2xl space-y-4">
                    {/* Title Placeholder */}
                    <div className="h-10 md:h-16 bg-gray-800 rounded w-3/4 mb-4" />

                    {/* Metadata Placeholder */}
                    <div className="flex gap-4">
                        <div className="h-6 w-16 bg-gray-800 rounded" />
                        <div className="h-6 w-12 bg-gray-800 rounded" />
                        <div className="h-6 w-20 bg-gray-800 rounded" />
                    </div>

                    {/* Description Placeholder */}
                    <div className="hidden md:block space-y-2 py-2">
                        <div className="h-4 bg-gray-800 rounded w-full" />
                        <div className="h-4 bg-gray-800 rounded w-5/6" />
                        <div className="h-4 bg-gray-800 rounded w-4/6" />
                    </div>

                    {/* Buttons Placeholder */}
                    <div className="flex gap-3 pt-4">
                        <div className="h-12 w-32 bg-gray-800 rounded" />
                        <div className="h-12 w-40 bg-gray-800 rounded" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HeroSkeleton;
