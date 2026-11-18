import React, { useEffect, useMemo } from 'react';

export type SkeletonVariant =
    | 'home'
    | 'catalog'
    | 'categories'
    | 'search'
    | 'mylist'
    | 'details'
    | 'watch'
    | 'account'
    | 'profiles'
    | 'login'
    | 'admin'
    | 'theatre'
    | 'article';

interface LoaderProps {
    dataReady?: boolean;
    onComplete?: () => void;
    /** Explicit page layout skeleton; if omitted, auto-detected from the current URL */
    variant?: SkeletonVariant;
}

const detectVariantFromPath = (pathname: string): SkeletonVariant => {
    const p = (pathname || '/').toLowerCase();
    if (p.startsWith('/watch')) return 'watch';
    if (p.startsWith('/browse')) return 'details';
    if (p.startsWith('/account')) return 'account';
    if (p.startsWith('/login')) return 'login';
    if (p.startsWith('/admin')) return 'admin';
    if (p.startsWith('/theatre') || p.startsWith('/theater')) return 'theatre';
    if (p.startsWith('/search')) return 'search';
    if (p.startsWith('/my-list')) return 'mylist';
    if (p.startsWith('/categor')) return 'categories';
    if (
        p.startsWith('/movies') ||
        p.startsWith('/tv') ||
        p.startsWith('/anime') ||
        p.startsWith('/exclusive')
    ) {
        return 'catalog';
    }
    if (
        p.startsWith('/support') ||
        p.startsWith('/help') ||
        p.startsWith('/adblock') ||
        p.startsWith('/sound') ||
        p.startsWith('/device') ||
        p.startsWith('/contact') ||
        p.startsWith('/community') ||
        p.startsWith('/chat') ||
        p.startsWith('/scan') ||
        p.startsWith('/cinema-help')
    ) {
        return 'article';
    }
    return 'home';
};

/* Shared Chrome Pieces */
const TopNavSkeleton = () => (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 md:h-20 px-4 md:px-10 flex items-center justify-between bg-gradient-to-b from-[#0a0a0b] via-[#0a0a0b]/90 to-transparent">
        <div className="flex items-center gap-6 md:gap-8">
            <div className="w-24 md:w-28 h-7 rounded-md skeleton-shimmer" />
            <div className="hidden lg:flex items-center gap-5">
                <div className="w-12 h-3.5 rounded skeleton-shimmer" />
                <div className="w-14 h-3.5 rounded skeleton-shimmer" />
                <div className="w-16 h-3.5 rounded skeleton-shimmer" />
                <div className="w-12 h-3.5 rounded skeleton-shimmer" />
                <div className="w-20 h-3.5 rounded skeleton-shimmer" />
            </div>
        </div>
        <div className="flex items-center gap-3">
            <div className="hidden sm:block w-44 md:w-56 h-9 rounded-full skeleton-shimmer" />
            <div className="w-9 h-9 rounded-full skeleton-shimmer" />
        </div>
    </header>
);

const MobileBottomNavSkeleton = () => (
    <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#0a0a0b]/95 border-t border-white/[0.08] px-4 flex items-center justify-around z-50">
        {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
                <div className="w-5 h-5 rounded-md skeleton-shimmer" />
                <div className="w-9 h-2 rounded skeleton-shimmer" />
            </div>
        ))}
    </div>
);

const PosterCardSkeleton = ({ fluid = false }: { fluid?: boolean }) => (
    <div className={fluid ? 'w-full space-y-2' : 'flex-shrink-0 w-[124px] sm:w-[152px] md:w-[176px] lg:w-[196px] space-y-2'}>
        <div className="w-full aspect-[2/3] rounded-xl skeleton-shimmer border border-white/[0.05]" />
        <div className="h-3 w-4/5 rounded skeleton-shimmer" />
        <div className="h-2.5 w-1/2 rounded skeleton-shimmer opacity-70" />
    </div>
);

/* 1. Home Page Skeleton (Hero + Horizontal Rails) */
const HomeSkeleton = () => (
    <div className="min-h-screen w-full bg-[#0a0a0b] overflow-hidden">
        <TopNavSkeleton />
        <section className="relative w-full h-[64vh] sm:h-[70vh] lg:h-[82vh] overflow-hidden bg-[#111114]">
            <div className="absolute inset-0 skeleton-shimmer opacity-45" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0b] via-[#0a0a0b]/45 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0b]/90 via-[#0a0a0b]/35 to-transparent" />
            <div className="absolute bottom-8 sm:bottom-12 md:bottom-16 left-0 right-0 px-4 sm:px-8 md:px-12 lg:px-16">
                <div className="max-w-xl space-y-4">
                    <div className="w-28 h-5 rounded-full skeleton-shimmer" />
                    <div className="space-y-2.5">
                        <div className="h-9 sm:h-12 md:h-14 w-4/5 rounded-lg skeleton-shimmer" />
                        <div className="h-9 sm:h-12 md:h-14 w-1/2 rounded-lg skeleton-shimmer hidden sm:block" />
                    </div>
                    <div className="flex items-center gap-3 pt-1">
                        <div className="w-14 h-4 rounded skeleton-shimmer" />
                        <div className="w-10 h-4 rounded skeleton-shimmer" />
                        <div className="w-20 h-4 rounded skeleton-shimmer" />
                    </div>
                    <div className="hidden sm:block space-y-2 pt-1">
                        <div className="h-3.5 w-full rounded skeleton-shimmer" />
                        <div className="h-3.5 w-5/6 rounded skeleton-shimmer" />
                    </div>
                    <div className="flex items-center gap-3 pt-3">
                        <div className="h-11 sm:h-12 w-32 sm:w-36 rounded-xl skeleton-shimmer" />
                        <div className="h-11 sm:h-12 w-32 sm:w-40 rounded-xl skeleton-shimmer" />
                    </div>
                </div>
            </div>
        </section>

        <main className="relative z-10 -mt-4 sm:-mt-6 pb-24 md:pb-16 space-y-8 md:space-y-10">
            {['w-44', 'w-56', 'w-40'].map((titleWidth, railIdx) => (
                <section key={railIdx} className="px-4 sm:px-8 md:px-12 lg:px-16">
                    <div className={`h-5 sm:h-6 ${titleWidth} rounded-md skeleton-shimmer mb-4`} />
                    <div className="flex gap-3 sm:gap-4 overflow-hidden">
                        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                            <PosterCardSkeleton key={i} />
                        ))}
                    </div>
                </section>
            ))}
        </main>
        <MobileBottomNavSkeleton />
    </div>
);

/* 2. Catalog Page Skeleton (Movies, TV Shows, Anime, Exclusive — Banner + Filter Pills + Grid) */
const CatalogSkeleton = () => (
    <div className="min-h-screen w-full bg-[#0a0a0b] overflow-hidden">
        <TopNavSkeleton />
        <section className="relative w-full h-[42vh] sm:h-[48vh] overflow-hidden bg-[#111114]">
            <div className="absolute inset-0 skeleton-shimmer opacity-40" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0b] via-[#0a0a0b]/55 to-transparent" />
            <div className="absolute bottom-6 left-0 right-0 px-4 sm:px-8 md:px-12 lg:px-16 space-y-3">
                <div className="h-8 sm:h-11 w-56 rounded-lg skeleton-shimmer" />
                <div className="h-4 w-72 sm:w-96 rounded skeleton-shimmer opacity-75" />
                <div className="flex gap-2.5 pt-2">
                    <div className="h-10 w-28 rounded-xl skeleton-shimmer" />
                    <div className="h-10 w-32 rounded-xl skeleton-shimmer" />
                </div>
            </div>
        </section>

        <main className="px-4 sm:px-8 md:px-12 lg:px-16 pt-6 pb-24 space-y-6">
            <div className="flex items-center gap-2 overflow-hidden">
                {['w-16', 'w-20', 'w-24', 'w-20', 'w-28', 'w-20', 'w-24'].map((w, i) => (
                    <div key={i} className={`h-8 ${w} rounded-full skeleton-shimmer shrink-0`} />
                ))}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-5">
                {Array.from({ length: 12 }).map((_, i) => (
                    <PosterCardSkeleton key={i} fluid />
                ))}
            </div>
        </main>
        <MobileBottomNavSkeleton />
    </div>
);

/* 3. Categories Page Skeleton (Header + Genre Cards + Filtered Grid) */
const CategoriesSkeleton = () => (
    <div className="min-h-screen w-full bg-[#0a0a0b] overflow-hidden">
        <TopNavSkeleton />
        <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-24 md:pt-28 pb-24 space-y-8">
            <div className="space-y-2.5">
                <div className="h-8 w-52 rounded-lg skeleton-shimmer" />
                <div className="h-4 w-80 max-w-full rounded skeleton-shimmer opacity-75" />
            </div>

            {/* Category tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="h-14 rounded-xl skeleton-shimmer border border-white/[0.06]" />
                ))}
            </div>

            {/* Results grid */}
            <div className="space-y-4">
                <div className="h-5 w-44 rounded skeleton-shimmer" />
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-5">
                    {Array.from({ length: 12 }).map((_, i) => (
                        <PosterCardSkeleton key={i} fluid />
                    ))}
                </div>
            </div>
        </main>
        <MobileBottomNavSkeleton />
    </div>
);

/* 4. Search Page Skeleton (Centered Search Bar + Chips + Poster Results Grid) */
const SearchSkeleton = () => (
    <div className="min-h-screen w-full bg-[#0a0a0b] overflow-hidden">
        <TopNavSkeleton />
        <main className="max-w-6xl mx-auto px-4 sm:px-8 pt-24 md:pt-28 pb-24 space-y-7">
            <div className="max-w-2xl mx-auto space-y-4">
                <div className="h-13 sm:h-14 w-full rounded-2xl skeleton-shimmer border border-white/[0.08]" />
                <div className="flex flex-wrap justify-center gap-2">
                    {['w-16', 'w-20', 'w-24', 'w-20', 'w-16'].map((w, i) => (
                        <div key={i} className={`h-7 ${w} rounded-full skeleton-shimmer`} />
                    ))}
                </div>
            </div>

            <div className="space-y-4 pt-2">
                <div className="h-5 w-40 rounded skeleton-shimmer" />
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-5">
                    {Array.from({ length: 10 }).map((_, i) => (
                        <PosterCardSkeleton key={i} fluid />
                    ))}
                </div>
            </div>
        </main>
        <MobileBottomNavSkeleton />
    </div>
);

/* 5. My List Page Skeleton (Header + Count + Saved Grid) */
const MyListSkeleton = () => (
    <div className="min-h-screen w-full bg-[#0a0a0b] overflow-hidden">
        <TopNavSkeleton />
        <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-24 md:pt-28 pb-24 space-y-6">
            <div className="flex items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
                <div className="space-y-2">
                    <div className="h-8 w-36 rounded-lg skeleton-shimmer" />
                    <div className="h-3.5 w-56 rounded skeleton-shimmer opacity-70" />
                </div>
                <div className="h-8 w-24 rounded-lg skeleton-shimmer" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-5">
                {Array.from({ length: 12 }).map((_, i) => (
                    <PosterCardSkeleton key={i} fluid />
                ))}
            </div>
        </main>
        <MobileBottomNavSkeleton />
    </div>
);

/* 6. Content Details Page Skeleton (/browse/:id) */
const DetailsSkeleton = () => (
    <div className="fixed inset-0 z-[90] bg-[#0a0a0b] overflow-y-auto">
        {/* Top Back Button */}
        <div className="fixed top-4 left-4 md:top-6 md:left-8 z-20 w-10 h-10 rounded-full skeleton-shimmer border border-white/10" />

        {/* Backdrop Hero */}
        <div className="relative w-full h-[52vh] sm:h-[60vh] bg-[#111114] overflow-hidden">
            <div className="absolute inset-0 skeleton-shimmer opacity-45" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0b] via-[#0a0a0b]/50 to-transparent" />
            <div className="absolute bottom-6 left-0 right-0 max-w-6xl mx-auto px-5 md:px-12 space-y-4">
                <div className="h-9 sm:h-12 w-3/4 sm:w-2/5 rounded-lg skeleton-shimmer" />
                <div className="flex flex-wrap gap-2.5">
                    <div className="h-6 w-16 rounded-full skeleton-shimmer" />
                    <div className="h-6 w-14 rounded-full skeleton-shimmer" />
                    <div className="h-6 w-24 rounded-full skeleton-shimmer" />
                </div>
                <div className="flex flex-wrap gap-3 pt-2">
                    <div className="h-12 w-36 rounded-xl skeleton-shimmer" />
                    <div className="h-12 w-32 rounded-xl skeleton-shimmer" />
                    <div className="h-12 w-12 rounded-xl skeleton-shimmer" />
                </div>
            </div>
        </div>

        {/* Overview, Cast & Similar */}
        <div className="max-w-6xl mx-auto px-5 md:px-12 py-6 space-y-8 pb-20">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-2.5">
                    <div className="h-4 w-full rounded skeleton-shimmer" />
                    <div className="h-4 w-11/12 rounded skeleton-shimmer" />
                    <div className="h-4 w-3/4 rounded skeleton-shimmer" />
                </div>
                <div className="space-y-2.5 bg-[#111114] border border-white/[0.07] rounded-2xl p-4">
                    <div className="h-3.5 w-2/3 rounded skeleton-shimmer" />
                    <div className="h-3.5 w-4/5 rounded skeleton-shimmer" />
                    <div className="h-3.5 w-1/2 rounded skeleton-shimmer" />
                </div>
            </div>

            {/* Cast Row */}
            <div className="space-y-3">
                <div className="h-5 w-28 rounded skeleton-shimmer" />
                <div className="flex gap-4 overflow-hidden">
                    {Array.from({ length: 7 }).map((_, i) => (
                        <div key={i} className="flex flex-col items-center gap-2 shrink-0 w-20">
                            <div className="w-16 h-16 rounded-full skeleton-shimmer" />
                            <div className="h-2.5 w-16 rounded skeleton-shimmer" />
                        </div>
                    ))}
                </div>
            </div>

            {/* More Like This */}
            <div className="space-y-3">
                <div className="h-5 w-36 rounded skeleton-shimmer" />
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <PosterCardSkeleton key={i} fluid />
                    ))}
                </div>
            </div>
        </div>
    </div>
);

/* 7. Video Player Skeleton (/watch/:id) */
const WatchSkeleton = () => (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col justify-between overflow-hidden">
        {/* Top Bar */}
        <div className="px-4 sm:px-6 pt-4 pb-6 flex items-center justify-between gap-3 bg-gradient-to-b from-black/90 to-transparent">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full skeleton-shimmer" />
                <div className="space-y-1.5">
                    <div className="h-4 w-40 sm:w-56 rounded skeleton-shimmer" />
                    <div className="h-3 w-24 rounded skeleton-shimmer opacity-70" />
                </div>
            </div>
            <div className="flex items-center gap-2">
                <div className="h-9 w-20 rounded-full skeleton-shimmer" />
                <div className="w-9 h-9 rounded-full skeleton-shimmer" />
            </div>
        </div>

        {/* Center Video Frame Placeholder */}
        <div className="flex-1 flex items-center justify-center px-6">
            <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full skeleton-shimmer border border-white/10" />
                <div className="h-3 w-36 rounded skeleton-shimmer opacity-75" />
            </div>
        </div>

        {/* Bottom Scrubber & Controls */}
        <div className="px-4 sm:px-8 pb-5 pt-6 space-y-3 bg-gradient-to-t from-black/95 to-transparent max-w-5xl w-full mx-auto">
            <div className="flex items-center gap-3">
                <div className="h-3 w-10 rounded skeleton-shimmer" />
                <div className="flex-1 h-1.5 rounded-full skeleton-shimmer" />
                <div className="h-3 w-10 rounded skeleton-shimmer" />
            </div>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full skeleton-shimmer" />
                    <div className="w-9 h-9 rounded-full skeleton-shimmer" />
                    <div className="w-9 h-9 rounded-full skeleton-shimmer hidden sm:block" />
                </div>
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full skeleton-shimmer" />
                    <div className="w-9 h-9 rounded-full skeleton-shimmer" />
                </div>
            </div>
        </div>
    </div>
);

/* 8. Account Page Skeleton (Matches Mature Two-Column Account Dashboard) */
const AccountSkeleton = () => (
    <div className="min-h-screen w-full bg-[#0a0a0b] overflow-hidden">
        <TopNavSkeleton />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 md:pt-28 pb-24">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-white/[0.08]">
                <div className="space-y-2">
                    <div className="h-8 w-36 rounded-lg skeleton-shimmer" />
                    <div className="h-4 w-72 max-w-full rounded skeleton-shimmer opacity-70" />
                </div>
                <div className="flex gap-2.5">
                    <div className="h-9 w-28 rounded-lg skeleton-shimmer" />
                    <div className="h-9 w-28 rounded-lg skeleton-shimmer hidden sm:block" />
                </div>
            </div>

            {/* Mobile Horizontal Tabs */}
            <div className="lg:hidden flex gap-2 py-4 border-b border-white/[0.08] overflow-hidden">
                {['w-24', 'w-32', 'w-20', 'w-28'].map((w, i) => (
                    <div key={i} className={`h-9 ${w} rounded-lg skeleton-shimmer shrink-0`} />
                ))}
            </div>

            {/* Two-Column Body */}
            <div className="mt-6 lg:mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
                <aside className="hidden lg:flex lg:col-span-3 flex-col gap-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-10 w-full rounded-lg skeleton-shimmer" />
                    ))}
                </aside>

                <main className="lg:col-span-9 space-y-6">
                    {/* Identity Card */}
                    <div className="bg-[#111114] border border-white/[0.08] rounded-2xl p-6 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full skeleton-shimmer shrink-0" />
                            <div className="space-y-2">
                                <div className="h-5 w-36 rounded skeleton-shimmer" />
                                <div className="h-3.5 w-48 rounded skeleton-shimmer opacity-75" />
                                <div className="h-3 w-32 rounded skeleton-shimmer opacity-55" />
                            </div>
                        </div>
                        <div className="h-9 w-24 rounded-lg skeleton-shimmer hidden sm:block" />
                    </div>

                    {/* Settings Card */}
                    <div className="bg-[#111114] border border-white/[0.08] rounded-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-white/[0.07]">
                            <div className="h-3.5 w-28 rounded skeleton-shimmer" />
                        </div>
                        <div className="divide-y divide-white/[0.07]">
                            {[0, 1, 2].map((i) => (
                                <div key={i} className="px-6 py-4 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3.5">
                                        <div className="w-5 h-5 rounded skeleton-shimmer" />
                                        <div className="space-y-1.5">
                                            <div className="h-4 w-40 rounded skeleton-shimmer" />
                                            <div className="h-3 w-56 rounded skeleton-shimmer opacity-65" />
                                        </div>
                                    </div>
                                    <div className="w-4 h-4 rounded skeleton-shimmer" />
                                </div>
                            ))}
                        </div>
                    </div>
                </main>
            </div>
        </div>
        <MobileBottomNavSkeleton />
    </div>
);

/* 9. Profile Selection Skeleton ("Who's watching?") */
const ProfilesSkeleton = () => (
    <div className="min-h-screen w-full bg-[#0a0a0b] flex flex-col items-center justify-center px-6 py-12">
        <div className="w-32 h-10 rounded-lg skeleton-shimmer mb-8" />
        <div className="h-8 sm:h-10 w-56 rounded-lg skeleton-shimmer mb-10" />
        <div className="flex flex-wrap justify-center gap-5 sm:gap-8 max-w-3xl">
            {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex flex-col items-center gap-3">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl skeleton-shimmer border border-white/[0.08]" />
                    <div className="h-4 w-20 rounded skeleton-shimmer" />
                </div>
            ))}
        </div>
        <div className="h-10 w-44 rounded-lg skeleton-shimmer mt-14" />
    </div>
);

/* 10. Login Page Skeleton */
const LoginSkeleton = () => (
    <div className="min-h-screen w-full bg-[#0a0a0b] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-[#111114] border border-white/[0.08] rounded-2xl p-7 sm:p-8 space-y-6">
            <div className="flex flex-col items-center gap-3">
                <div className="w-28 h-8 rounded-md skeleton-shimmer" />
                <div className="h-6 w-44 rounded skeleton-shimmer" />
                <div className="h-3.5 w-60 rounded skeleton-shimmer opacity-70" />
            </div>
            <div className="space-y-4">
                <div className="h-11 w-full rounded-xl skeleton-shimmer" />
                <div className="h-11 w-full rounded-xl skeleton-shimmer" />
                <div className="h-11 w-full rounded-xl skeleton-shimmer" />
            </div>
            <div className="border-t border-white/[0.08] pt-5 space-y-2.5">
                <div className="h-11 w-full rounded-xl skeleton-shimmer" />
                <div className="h-10 w-full rounded-xl skeleton-shimmer opacity-70" />
            </div>
        </div>
    </div>
);

/* 11. Admin Dashboard Skeleton */
const AdminSkeleton = () => (
    <div className="min-h-screen w-full bg-[#0a0a0b] flex overflow-hidden">
        {/* Left Sidebar */}
        <aside className="hidden md:flex w-60 border-r border-white/[0.08] bg-[#0e0e11] p-5 flex-col gap-3 shrink-0">
            <div className="h-8 w-32 rounded-md skeleton-shimmer mb-4" />
            {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-9 w-full rounded-lg skeleton-shimmer" />
            ))}
        </aside>

        {/* Main Panel */}
        <div className="flex-1 flex flex-col min-w-0">
            <div className="h-16 border-b border-white/[0.08] px-6 flex items-center justify-between">
                <div className="h-6 w-40 rounded skeleton-shimmer" />
                <div className="flex items-center gap-3">
                    <div className="h-9 w-28 rounded-lg skeleton-shimmer" />
                    <div className="w-9 h-9 rounded-full skeleton-shimmer" />
                </div>
            </div>

            <div className="p-6 space-y-6">
                {/* KPI Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[0, 1, 2, 3].map((i) => (
                        <div key={i} className="bg-[#111114] border border-white/[0.08] rounded-xl p-5 space-y-3">
                            <div className="h-3.5 w-24 rounded skeleton-shimmer" />
                            <div className="h-8 w-20 rounded skeleton-shimmer" />
                            <div className="h-3 w-28 rounded skeleton-shimmer opacity-60" />
                        </div>
                    ))}
                </div>

                {/* Data Table */}
                <div className="bg-[#111114] border border-white/[0.08] rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-white/[0.08] flex items-center justify-between gap-4">
                        <div className="h-9 w-64 max-w-full rounded-lg skeleton-shimmer" />
                        <div className="h-9 w-28 rounded-lg skeleton-shimmer" />
                    </div>
                    <div className="divide-y divide-white/[0.06]">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="px-5 py-4 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="w-10 h-10 rounded-lg skeleton-shimmer shrink-0" />
                                    <div className="space-y-1.5 flex-1">
                                        <div className="h-3.5 w-48 max-w-full rounded skeleton-shimmer" />
                                        <div className="h-2.5 w-32 rounded skeleton-shimmer opacity-65" />
                                    </div>
                                </div>
                                <div className="h-7 w-20 rounded-md skeleton-shimmer shrink-0" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    </div>
);

/* 12. 3D Theatre Skeleton */
const TheatreSkeleton = () => (
    <div className="fixed inset-0 z-[90] bg-[#070709] flex flex-col justify-between p-4 sm:p-6 overflow-hidden">
        {/* Top HUD */}
        <div className="flex items-center justify-between">
            <div className="h-10 w-36 rounded-full skeleton-shimmer" />
            <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-full skeleton-shimmer" />
                <div className="h-10 w-24 rounded-full skeleton-shimmer" />
            </div>
        </div>

        {/* Cinema Screen + Seats Silhouette */}
        <div className="flex-1 flex flex-col items-center justify-center gap-8 max-w-4xl w-full mx-auto py-6">
            <div className="w-full aspect-video max-h-[52vh] rounded-2xl skeleton-shimmer border border-white/10 shadow-[0_0_80px_rgba(255,255,255,0.04)]" />
            <div className="w-4/5 space-y-2.5 opacity-55">
                <div className="grid grid-cols-8 gap-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="h-5 rounded-t-md skeleton-shimmer" />
                    ))}
                </div>
                <div className="grid grid-cols-10 gap-2">
                    {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className="h-6 rounded-t-md skeleton-shimmer" />
                    ))}
                </div>
            </div>
        </div>

        {/* Bottom Floating Bar */}
        <div className="flex items-center justify-center gap-3 pb-2">
            <div className="h-11 w-64 sm:w-80 rounded-full skeleton-shimmer border border-white/10" />
        </div>
    </div>
);

/* 13. Support / Guide / Article Pages Skeleton */
const ArticleSkeleton = () => (
    <div className="min-h-screen w-full bg-[#0a0a0b] overflow-hidden">
        <div className="h-16 border-b border-white/[0.08] px-4 sm:px-8 flex items-center justify-between">
            <div className="h-8 w-36 rounded-lg skeleton-shimmer" />
            <div className="h-7 w-28 rounded-full skeleton-shimmer" />
        </div>
        <main className="max-w-5xl mx-auto px-4 sm:px-8 py-12 space-y-10">
            <div className="max-w-2xl mx-auto flex flex-col items-center text-center space-y-3.5">
                <div className="h-6 w-36 rounded-full skeleton-shimmer" />
                <div className="h-10 sm:h-12 w-4/5 rounded-lg skeleton-shimmer" />
                <div className="h-4 w-full rounded skeleton-shimmer opacity-75" />
                <div className="h-4 w-3/4 rounded skeleton-shimmer opacity-60" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="bg-[#111114] border border-white/[0.08] rounded-2xl p-6 space-y-3.5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl skeleton-shimmer shrink-0" />
                            <div className="space-y-1.5 flex-1">
                                <div className="h-4 w-36 rounded skeleton-shimmer" />
                                <div className="h-3 w-48 rounded skeleton-shimmer opacity-65" />
                            </div>
                        </div>
                        <div className="h-3.5 w-full rounded skeleton-shimmer opacity-75" />
                        <div className="h-3.5 w-5/6 rounded skeleton-shimmer opacity-65" />
                        <div className="h-10 w-full rounded-xl skeleton-shimmer mt-2" />
                    </div>
                ))}
            </div>
        </main>
    </div>
);

const Loader: React.FC<LoaderProps> = ({ dataReady = true, onComplete, variant }) => {
    useEffect(() => {
        if (dataReady && onComplete) {
            onComplete();
        }
    }, [dataReady, onComplete]);

    const resolvedVariant = useMemo<SkeletonVariant>(() => {
        if (variant) return variant;
        if (typeof window !== 'undefined') {
            return detectVariantFromPath(window.location.pathname);
        }
        return 'home';
    }, [variant]);

    return (
        <div aria-busy="true" aria-label={`Loading ${resolvedVariant} page`} className="select-none">
            {resolvedVariant === 'home' && <HomeSkeleton />}
            {resolvedVariant === 'catalog' && <CatalogSkeleton />}
            {resolvedVariant === 'categories' && <CategoriesSkeleton />}
            {resolvedVariant === 'search' && <SearchSkeleton />}
            {resolvedVariant === 'mylist' && <MyListSkeleton />}
            {resolvedVariant === 'details' && <DetailsSkeleton />}
            {resolvedVariant === 'watch' && <WatchSkeleton />}
            {resolvedVariant === 'account' && <AccountSkeleton />}
            {resolvedVariant === 'profiles' && <ProfilesSkeleton />}
            {resolvedVariant === 'login' && <LoginSkeleton />}
            {resolvedVariant === 'admin' && <AdminSkeleton />}
            {resolvedVariant === 'theatre' && <TheatreSkeleton />}
            {resolvedVariant === 'article' && <ArticleSkeleton />}
        </div>
    );
};

export default Loader;
