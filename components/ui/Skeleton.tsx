import React from 'react';

interface SkeletonProps {
    className?: string;
}

const Skeleton: React.FC<SkeletonProps> = ({ className }) => {
    return (
        <div className={`animate-pulse bg-white/5 rounded-md ${className}`} />
    );
};

export const CardSkeleton = () => (
    <div className="flex-shrink-0 w-32 md:w-48 aspect-[2/3] rounded-md overflow-hidden bg-white/5 relative">
        <Skeleton className="absolute inset-0 w-full h-full" />
    </div>
);

export const RailSkeleton = () => (
    <div className="mb-8 pl-4 md:pl-12">
        <Skeleton className="h-6 w-48 mb-4" />
        <div className="flex gap-4 overflow-hidden">
            {[1, 2, 3, 4, 5, 6].map(i => <CardSkeleton key={i} />)}
        </div>
    </div>
);

export default Skeleton;
