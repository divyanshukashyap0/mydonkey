import React from 'react';

interface SkeletonProps {
    className?: string;
}

const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => {
    return (
        <div className={`skeleton-shimmer rounded-md ${className}`} />
    );
};

export const CardSkeleton = () => (
    <div className="flex-shrink-0 w-[124px] sm:w-[152px] md:w-[176px] lg:w-[196px] space-y-2">
        <div className="w-full aspect-[2/3] rounded-xl overflow-hidden border border-white/[0.05] relative">
            <Skeleton className="absolute inset-0 w-full h-full rounded-xl" />
        </div>
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-2.5 w-1/2 opacity-70" />
    </div>
);

export const RailSkeleton = () => (
    <div className="mb-8 px-4 sm:px-8 md:px-12 lg:px-16">
        <Skeleton className="h-5 sm:h-6 w-48 mb-4" />
        <div className="flex gap-3 sm:gap-4 overflow-hidden">
            {[1, 2, 3, 4, 5, 6, 7].map(i => <CardSkeleton key={i} />)}
        </div>
    </div>
);

export default Skeleton;
