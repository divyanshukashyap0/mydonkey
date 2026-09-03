import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useStore } from './context/StoreContext';
import { logUserActivity } from './utils/activityLogger';
import TopNav from './components/TopNav';
import AnimeIntro from './components/AnimeIntro';
import HeroBanner from './components/HeroBanner';
import HeroSkeleton from './components/HeroSkeleton';
import ContentRail from './components/ContentRail';
import ContentDetails from './components/ContentDetails';
import VideoPlayer from './components/VideoPlayer';
import { MoviVideo } from './components/MoviVideo';
import LoginPage from './components/LoginPage';
import MobileNav from './components/MobileNav';
import Footer from './components/Footer';
import InfoPage from './components/InfoPage';
import MobileScannerPage from './components/MobileScannerPage';

import AccountSettings from './components/AccountSettings';
import AdminLayout from './components/admin/AdminLayout';
import UnlockContentModal from './components/UnlockContentModal';
import SearchPage from './components/SearchPage';
import ScrollToTop from './components/ScrollToTop';
import ProfileSelection from './components/ProfileSelection';
import FontLoader from './components/FontLoader';
import Loader from './components/Loader';
import Pagination from './components/Pagination';
import { Content } from './types';
import { StoreProvider } from './context/StoreContext';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';

const MainLayout = () => {
    const { content, rawContent, currentUser, currentProfile, isLoading, isAuthenticated, sections, pages, settings, incrementViews, addToWatchHistory } = useStore();
    const location = useLocation();
    const navigate = useNavigate();

    // Derived activeTab from URL (root '/' is the main website link for 'home')
    const path = location.pathname.substring(1);
    let activeTab = (path && path !== 'home') ? decodeURIComponent(path) : 'home';
    if (activeTab.startsWith('browse/') || activeTab.startsWith('watch/')) {
        activeTab = 'home';
    }

    const [viewingContent, setViewingContent] = useState<Content | null>(null);
    const [playingContent, setPlayingContent] = useState<Content | null>(null);
    const [showUnlockModal, setShowUnlockModal] = useState(false);

    // --- Anime Intro State ---
    const [showAnimeIntro, setShowAnimeIntro] = useState(false);
    const [animeIntroMode, setAnimeIntroMode] = useState<'enter' | 'exit'>('enter');
    const prevTabRef = useRef(activeTab);

    useEffect(() => {
        const prev = prevTabRef.current;

        if (activeTab === 'anime') {
            // Entering Anime
            setAnimeIntroMode('enter');
            setShowAnimeIntro(true);
        } else if (prev === 'anime' && activeTab !== 'anime') {
            // Exiting Anime
            setAnimeIntroMode('exit');
            setShowAnimeIntro(true);
        } else {
            setShowAnimeIntro(false);
        }

        prevTabRef.current = activeTab;
    }, [activeTab]);
    const [animeCategory, setAnimeCategory] = useState('All'); // State for Anime Filter

    useEffect(() => {
        if (currentUser) {
            logUserActivity(currentUser.uid, currentUser.email, 'page_view', { path: location.pathname }, currentUser.isGuest);
        }
    }, [location.pathname, currentUser]);

    // Deep Link Handler (e.g. /browse/content_123 or /watch/content_123)
    useEffect(() => {
        if (location.pathname.startsWith('/browse/')) {
            const contentId = location.pathname.split('/')[2];
            const stateItem = (location.state as any)?.item;
            if (rawContent.length > 0 || stateItem) {

                if (contentId) {
                    const item = stateItem || rawContent.find(c => c.id === contentId);
                    if (item) {
                        // Check for Exclusive access via URL
                        if (item.isExclusive && !currentProfile?.unlockedContent?.includes('global_unlock')) {
                            navigate('/exclusive', { replace: true });
                            return;
                        }
                        setViewingContent(item);
                    } else {
                        // Content loaded but ID not found
                        console.warn(`Deep link content not found: ${contentId}`);
                        navigate('/', { replace: true });
                        return;
                    }
                } else {
                    navigate('/', { replace: true });
                }
            }
        } else {
            // URL cleared, ensure modal closes
            if (viewingContent) {
                setViewingContent(null);
            }
        }

        if (location.pathname.startsWith('/watch/')) {
            const contentId = location.pathname.split('/')[2];
            const searchParams = new URLSearchParams(location.search);
            const mode = searchParams.get('mode') as 'trailer' | 'movie' || 'movie';
            const stateItem = (location.state as any)?.item;

            // Wait for authentication and content to load
            if (!isLoading && rawContent.length > 0) {
                console.log("AppNew: Watch deep link check:", { contentId, hasStateItem: !!stateItem, playingId: playingContent?.id });
                if (contentId) {
                    let item = stateItem || rawContent.find(c => c.id === contentId);

                    if (!item) {
                        for (const show of rawContent) {
                            if (show.type === 'tv' && show.seasons) {
                                for (const season of show.seasons) {
                                    const episode = season.episodes.find(e => e.id === contentId);
                                    if (episode) {
                                        item = {
                                            ...show,
                                            id: episode.id,
                                            title: `${show.title} - ${season.title} | ${episode.title}`,
                                            movieDriveId: episode.driveId,
                                            movieYoutubeId: episode.youtubeId,
                                            videoUrl: episode.videoUrl,
                                            duration: episode.duration
                                        };
                                        break;
                                    }
                                }
                            }
                            if (item) break;
                        }
                    }

                    if (item) {
                        // Check if item has RapidStream movie/TV source with IMDb ID (open in same tab)
                        const imdbId = item.imdbId || 
                            (typeof item.id === 'string' && item.id.startsWith('imdb_') ? item.id.replace('imdb_', '') : null) ||
                            (item.videoUrl ? item.videoUrl.match(/(tt\d+)/i)?.[1] : null) ||
                            (typeof item.id === 'string' && /^tt\d+$/i.test(item.id.trim()) ? item.id.trim() : null);

                        if (imdbId) {
                            incrementViews(item.id).catch(err => console.error("Error incrementing views:", err));
                            addToWatchHistory(item).catch(err => console.error("Error saving watch history:", err));
                            setTimeout(() => {
                                window.location.href = `https://proxy.garageband.rocks/embed/movie/${imdbId}`;
                            }, 100);
                            return;
                        }

                        // Authenticate if required (trailers don't need auth, movies do)
                        if (mode === 'movie' && !isAuthenticated) {
                            navigate('/login');
                            return;
                        }

                        // Check for Exclusive Content
                        if (mode === 'movie' && item.isExclusive && !currentProfile?.unlockedContent?.includes('global_unlock')) {
                            navigate('/exclusive', { replace: true });
                            return;
                        }
                        if (!playingContent || playingContent.id !== item.id || playingContent.playMode !== mode) {
                            setPlayingContent({ ...item, playMode: mode });
                            // Increment views when main movie starts
                            if (mode === 'movie') {
                                incrementViews(item.id).catch(err => console.error("Error incrementing views:", err));
                            }
                        }
                    } else {
                        // Optional: Handle episodes correctly if deep linking directly to episode ID
                        // For now, if ID not in main content list, redirect
                        console.warn(`Watch deep link content not found: ${contentId}`);
                        // PROTECTION: Never redirect if we are already playing or have state
                        if (playingContent?.id === contentId || !!playingContent || stateItem || (location.state as any)?.item) return;
                        navigate('/', { replace: true });
                        return;
                    }
                } else {
                    navigate('/', { replace: true });
                }
            }
        } else {
            if (playingContent) {
                setPlayingContent(null);
            }
        }

    }, [location.pathname, location.search, content, rawContent, navigate, viewingContent, playingContent, isLoading, isAuthenticated, currentProfile]);

    // Redirect legacy /home and /features to main website link /
    useEffect(() => {
        if (location.pathname === '/home' || location.pathname === '/features') {
            navigate('/', { replace: true });
        }
    }, [location.pathname, navigate]);

    // Load YouTube API
    useEffect(() => {
        if (!document.getElementById('youtube-iframe-api')) {
            const tag = document.createElement('script');
            tag.id = 'youtube-iframe-api';
            tag.src = "https://www.youtube.com/iframe_api";
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
        }
    }, []);

    // Derived Content Lists
    const { originals, trending, movies, tvShows, userAddedContent } = useMemo(() => {
        if (!content) return { originals: [], trending: [], movies: [], tvShows: [], userAddedContent: [] };

        // Trending logic
        const trendingContent = content.filter(c => c.featured || (c.vote_average && c.vote_average > 7.5));
        
        // Content added by users (has addedBy field)
        const addedByUsers = content.filter(c => c.addedBy !== undefined);

        return {
            originals: content.filter(c => c.isOriginal),
            trending: trendingContent,
            movies: content.filter(c => c.type === 'movie'),
            tvShows: content.filter(c => c.type === 'tv'),
            userAddedContent: addedByUsers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 15)
        };
    }, [content]);

    // Continue Watching Items (User Watch History)
    const continueWatchingItems = useMemo(() => {
        const historyList = currentUser?.continueWatching || [];
        let items: (Content & { progress?: number })[] = [];

        if (historyList.length > 0) {
            items = historyList.map(h => {
                const c = content.find(x => x.id === h.movieId || (x.imdbId && x.imdbId === h.movieId));
                return c ? { ...c, progress: h.progress || 15 } : null;
            }).filter(Boolean) as (Content & { progress?: number })[];
        }
        
        // Supplement from local storage
        try {
            const raw = localStorage.getItem('my_donkey_watch_history');
            if (raw) {
                const localList = JSON.parse(raw);
                localList.forEach((lh: any) => {
                    if (!items.some(it => it.id === lh.movieId || it.imdbId === lh.movieId)) {
                        const c = content.find(x => x.id === lh.movieId || (x.imdbId && x.imdbId === lh.movieId));
                        if (c) {
                            items.push({ ...c, progress: lh.progress || 15 });
                        }
                    }
                });
            }
        } catch (e) {}

        return items;
    }, [currentUser?.continueWatching, content]);
 
    // State for random heroes (refreshes on tab change)
    const [randomHeroes, setRandomHeroes] = useState<{ home: any; movie: any; tv: any }>({
        home: null,
        movie: null,
        tv: null
    });
 
    useEffect(() => {
        if (!content || content.length === 0) return;
 
        if (activeTab === 'home') {
            const candidates = trending.length > 0 ? trending : content;
            setRandomHeroes(prev => ({ ...prev, home: candidates[Math.floor(Math.random() * candidates.length)] }));
        } else if (activeTab === 'movies') {
            const candidates = movies.filter(m => m.featured).length > 0 ? movies.filter(m => m.featured) : movies;
            if (candidates.length > 0) {
                setRandomHeroes(prev => ({ ...prev, movie: candidates[Math.floor(Math.random() * candidates.length)] }));
            }
        } else if (activeTab === 'tv') {
            const candidates = tvShows.filter(t => t.featured).length > 0 ? tvShows.filter(t => t.featured) : tvShows;
            if (candidates.length > 0) {
                setRandomHeroes(prev => ({ ...prev, tv: candidates[Math.floor(Math.random() * candidates.length)] }));
            }
        }
    }, [activeTab, content, trending.length, movies.length, tvShows.length]);

    // Handlers
    const handlePlay = (item: Content, mode: 'movie' | 'trailer' = 'movie') => {
        if (mode === 'trailer') {
            setPlayingContent({ ...item, playMode: 'trailer' });
            navigate(`/watch/${item.id}?mode=trailer`, { state: { item } });
            return;
        }

        // Check if item has RapidStream / IMDb content ID (open in same tab)
        const imdbId = item.imdbId || 
            (typeof item.id === 'string' && item.id.startsWith('imdb_') ? item.id.replace('imdb_', '') : null) ||
            (item.videoUrl ? item.videoUrl.match(/(tt\d+)/i)?.[1] : null) ||
            (typeof item.id === 'string' && /^tt\d+$/i.test(item.id.trim()) ? item.id.trim() : null);

        if (imdbId) {
            incrementViews(item.id).catch(err => console.error("Error incrementing views:", err));
            addToWatchHistory(item).catch(err => console.error("Error saving watch history:", err));
            setTimeout(() => {
                window.location.href = `https://proxy.garageband.rocks/embed/movie/${imdbId}`;
            }, 100);
            return;
        }

        if (isAuthenticated && currentUser) {
            setPlayingContent({ ...item, playMode: 'movie' });
            navigate(`/watch/${item.id}?mode=movie`, { state: { item } });
        } else {
            navigate('/login');
        }
    };

    const handleDetails = (item: Content) => {
        setViewingContent(item);
        navigate(`/browse/${item.id}`, { state: { item } });
    };

    const handleTabChange = (tabId: string) => {
        if (tabId === 'my-list' && !isAuthenticated) {
            navigate('/login');
            return;
        }
        // Navigate to the target URL (Home uses main website link '/')
        const targetPath = tabId === 'home' ? '/' : `/${tabId}`;
        navigate(targetPath);
        window.scrollTo(0, 0);
    };

    const handleNavigate = (page: string) => {
        if (page === 'Account') {
            if (!isAuthenticated) {
                navigate('/login');
            } else {
                navigate('/account');
                window.scrollTo(0, 0);
            }
            return;
        }

        // Check for dynamic page
        const existingPage = pages.find(p => p.id === page);
        if (existingPage) {
            navigate(`/${page}`);
            window.scrollTo(0, 0);
            return;
        }

        // Navigate to the page (standard tabs)
        if (['Home', 'Movies', 'TV Shows', 'My List'].includes(page)) {
            // Map standard pages to IDs if needed, else use page name
            let target = page;
            if (page === 'Home') target = 'home';
            if (page === 'Movies') target = 'movies';
            if (page === 'TV Shows') target = 'tv';
            if (page === 'My List') target = 'my-list';

            navigate(`/${target}`);
            window.scrollTo(0, 0);
            return;
        }

        // Fallback
        handleTabChange(page.toLowerCase());
    };

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 24;

    useEffect(() => {
        setCurrentPage(1); // Reset on tab change
        window.scrollTo(0, 0);
    }, [activeTab, animeCategory]);

    const handleIntroComplete = useCallback(() => {
        setShowAnimeIntro(false);
    }, []);

    // Helper to render sections for a given scope
    const renderSections = (scope: 'home' | 'tv' | 'movie') => {
        const scopeSections = sections
            .filter(s => s.enabled && s.scopes?.includes(scope))
            .sort((a, b) => a.order - b.order);

        if (scopeSections.length > 0) {
            return scopeSections.map(section => {
                let autoItems: Content[] = [];

                // Auto-population logic
                if (section.type === 'trending') {
                    autoItems = content.filter(c => c.featured || (c.vote_average && c.vote_average > 7.5)).slice(0, 20);
                } else if (section.type === 'genre' && section.genreFilter) {
                    autoItems = content.filter(c => c.genres?.includes(section.genreFilter!)).slice(0, 20);
                } else if (section.type === 'originals') {
                    autoItems = content.filter(c => c.isOriginal).slice(0, 20);
                } else if (section.type === 'new_movies') {
                    autoItems = content.filter(c => c.type === 'movie').slice(0, 20);
                } else if (section.type === 'new_tv') {
                    autoItems = content.filter(c => c.type === 'tv').slice(0, 20);
                } else if (section.type === 'tag' && section.tagFilter) {
                    autoItems = content.filter(c => c.tags?.includes(section.tagFilter!) || c.genres?.includes(section.tagFilter!)).slice(0, 20);
                } else if (section.type === 'my_list') {
                    if (currentProfile?.myList) {
                        autoItems = content.filter(c => currentProfile.myList.includes(c.id));
                    }
                }

                // Filter by type if scope is movie or tv and it's not a specific type section
                if (scope === 'movie' && !['new_movies', 'new_tv'].includes(section.type)) {
                    autoItems = autoItems.filter(c => c.type === 'movie');
                }
                if (scope === 'tv' && !['new_movies', 'new_tv'].includes(section.type)) {
                    autoItems = autoItems.filter(c => c.type === 'tv');
                }

                // Manual items
                const manualItems = (section.contentIds || []).map(id => content.find(c => c.id === id)).filter(Boolean) as Content[];

                // Merge: Manual first, then Auto. Deduplicate.
                const items = [...manualItems, ...autoItems].filter((item, index, self) =>
                    index === self.findIndex(t => t.id === item.id)
                );

                if (items.length === 0) return null;

                return (
                    <ContentRail
                        key={section.id}
                        title={section.title}
                        items={items}
                        onDetails={handleDetails}
                        isTop10={section.showRanking}
                        showRanking={section.showRanking}
                    />
                );
            });
        }

        // --- Automatic Fallback Sections ---
        const filteredContent = scope === 'movie' ? movies : (scope === 'tv' ? tvShows : content);

        if (filteredContent.length === 0) return null;

        const trendingItems = filteredContent.filter(c => c.featured || (c.vote_average && c.vote_average > 7.5)).slice(0, 15);
        const recentlyAdded = [...filteredContent].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 15);

        // Get top genres for this content
        const genreCounts: Record<string, number> = {};
        filteredContent.forEach(c => {
            c.genres?.forEach(g => {
                genreCounts[g] = (genreCounts[g] || 0) + 1;
            });
        });
        const topGenres = Object.entries(genreCounts)
            .filter(([genre]) => !['Anime', 'Animation', 'Short'].includes(genre))
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4)
            .map(([genre]) => genre);

        return (
            <div className="space-y-12">
                {trendingItems.length > 0 && (
                    <ContentRail
                        title={`Trending ${scope === 'movie' ? 'Movies' : 'Shows'}`}
                        items={trendingItems}
                        onDetails={handleDetails}
                    />
                )}
                {recentlyAdded.length > 0 && (
                    <ContentRail
                        title="Recently Added"
                        items={recentlyAdded}
                        onDetails={handleDetails}
                    />
                )}
                {topGenres.map(genre => {
                    const genreItems = filteredContent.filter(c => c.genres?.includes(genre)).slice(0, 15);
                    if (genreItems.length === 0) return null;
                    return (
                        <ContentRail
                            key={genre}
                            title={`${genre} ${scope === 'movie' ? 'Movies' : 'Shows'}`}
                            items={genreItems}
                            onDetails={handleDetails}
                        />
                    );
                })}
            </div>
        );
    };

    // Render Content based on Tab
    const renderContent = () => {
        // Info Pages - Dynamic
        const pageData = pages.find(p => p.id === activeTab);
        if (pageData) {
            return (
                <InfoPage
                    data={pageData}
                    onBack={() => navigate('/')}
                />
            );
        }

        if (activeTab === 'home') {
            const heroItem = randomHeroes.home || (settings?.heroContentId && content.find(c => c.id === settings.heroContentId))
                || (trending.length > 0 ? trending[0] : (content.length > 0 ? content[0] : null));

            return (
                <>
                    {heroItem ? (
                        <HeroBanner
                            item={heroItem}
                            onPlay={(item) => handlePlay(item, 'movie')}
                            onDetails={handleDetails}
                        />
                    ) : (
                        <HeroSkeleton />
                    )}
                    <div className="pb-24 bg-[#141414] relative z-10 pl-4 md:pl-12 space-y-8">
                        {/* Original Language Announcement */}
                        <div className="pt-8 pr-4 md:pr-12">
                            <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-brand-red/20 via-brand-red/5 to-transparent border-l-4 border-brand-red p-5 shadow-2xl group hover:from-brand-red/30 transition-all duration-300">
                                <div className="flex items-center gap-4">
                                    <div className="hidden sm:flex w-12 h-12 rounded-full bg-brand-red items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-white font-bold text-lg md:text-xl tracking-tight mb-1">
                                            Authentic Sound Experience
                                        </h3>
                                        <p className="text-gray-300 text-sm md:text-base leading-relaxed">
                                            Enjoy every story with its original performance. <span className="text-brand-red font-semibold">All content is available in its real language voice.</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-brand-red/10 rounded-full blur-3xl"></div>
                            </div>
                        </div>

                        {/* Continue Watching Rail (Watch History) */}
                        {continueWatchingItems.length > 0 && (
                            <div className="pt-8">
                                <ContentRail 
                                    title="Continue Watching" 
                                    items={continueWatchingItems} 
                                    onDetails={handleDetails}
                                    onPlay={handlePlay}
                                />
                            </div>
                        )}

                        {userAddedContent.length > 0 && (
                            <div className="pt-8">
                                <ContentRail 
                                    title="Recently Added by Users" 
                                    items={userAddedContent} 
                                    onDetails={handleDetails}
                                    onPlay={handlePlay}
                                />
                            </div>
                        )}

                        {/* Dynamic or Automatic Sections */}
                        {renderSections('home')}
                    </div>
                </>
            );
        }

        if (activeTab === 'movies') {
            const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
            const visibleMovies = movies.slice(startIndex, startIndex + ITEMS_PER_PAGE);
            const totalPages = Math.ceil(movies.length / ITEMS_PER_PAGE);

            // Random hero for movies
            const movieHero = randomHeroes.movie || movies.find(m => m.featured) || movies[0];

            return (
                <div className="min-h-screen pb-12 bg-[#141414]">
                    {movieHero && (
                        <HeroBanner
                            item={movieHero}
                            onPlay={(item) => handlePlay(item, 'movie')}
                            onDetails={handleDetails}
                        />
                    )}

                    <div className="relative z-10 pl-4 md:pl-12 -mt-12 md:-mt-32 space-y-12">
                        {renderSections('movie')}

                        <div className="pt-8 pr-4 md:pr-12">
                            <h2 className="text-2xl font-bold mb-6">Explore All Movies</h2>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-4">
                                {visibleMovies.map(item => (
                                    <div key={item.id} onClick={() => handleDetails(item)} className="cursor-pointer transition-transform hover:scale-105 relative aspect-[2/3]">
                                        <img
                                            src={item.poster_path_mobile || item.poster_path}
                                            className="rounded-lg w-full h-full object-cover shadow-lg border border-white/5"
                                            loading="lazy"
                                            alt={item.title}
                                        />
                                    </div>
                                ))}
                            </div>
                            {totalPages > 1 && (
                                <Pagination
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    onPageChange={(page) => {
                                        setCurrentPage(page);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                />
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        if (activeTab === 'tv') {
            const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
            const visibleTV = tvShows.slice(startIndex, startIndex + ITEMS_PER_PAGE);
            const totalPages = Math.ceil(tvShows.length / ITEMS_PER_PAGE);

            const tvHero = randomHeroes.tv || tvShows.find(t => t.featured) || tvShows[0];

            return (
                <div className="min-h-screen pb-12 bg-[#141414]">
                    {tvHero && (
                        <HeroBanner
                            item={tvHero}
                            onPlay={(item) => handlePlay(item, 'movie')}
                            onDetails={handleDetails}
                        />
                    )}

                    <div className="relative z-10 pl-4 md:pl-12 -mt-12 md:-mt-32 space-y-12">
                        {renderSections('tv')}

                        <div className="pt-8 pr-4 md:pr-12">
                            <h2 className="text-2xl font-bold mb-6">Explore All TV Shows</h2>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9 gap-4">
                                {visibleTV.map(item => (
                                    <div key={item.id} onClick={() => handleDetails(item)} className="cursor-pointer transition-transform hover:scale-105 relative aspect-[2/3]">
                                        <img
                                            src={item.poster_path_mobile || item.poster_path}
                                            className="rounded-lg w-full h-full object-cover shadow-lg border border-white/5"
                                            loading="lazy"
                                            alt={item.title}
                                        />
                                    </div>
                                ))}
                            </div>
                            {totalPages > 1 && (
                                <Pagination
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    onPageChange={(page) => {
                                        setCurrentPage(page);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                />
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        if (activeTab === 'anime') {
            // Filter Anime Content
            const animeContent = content.filter(c =>
                c.genres?.some(g => g.toLowerCase() === 'anime' || g.toLowerCase() === 'animation')
            );

            // Derived filtered list
            const filteredAnime = animeCategory === 'All'
                ? animeContent
                : animeContent.filter(c => c.genres?.includes(animeCategory));

            const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
            const visibleAnime = filteredAnime.slice(startIndex, startIndex + ITEMS_PER_PAGE);
            const totalPages = Math.ceil(filteredAnime.length / ITEMS_PER_PAGE);

            return (
                <div className="min-h-screen pt-24 px-4 md:px-12 pb-12 relative overflow-hidden">
                    {/* Background Video */}
                    <div className="absolute inset-0 z-0">
                        <MoviVideo
                            src="/Anime.mp4"
                            autoPlay
                            loop
                            muted
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/60" />
                    </div>

                    <div className="relative z-10">
                        <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
                            <span className="bg-gradient-to-r from-brand-red to-purple-600 bg-clip-text text-transparent">Anime Library</span>
                        </h1>

                        {filteredAnime.length > 0 ? (
                            <>
                                <div className="pt-8 pr-4 md:pr-12">
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-4">
                                    {visibleAnime.map(item => (
                                        <div key={item.id} onClick={() => handleDetails(item)} className="group cursor-pointer relative aspect-[2/3] overflow-hidden rounded-xl border border-white/10 hover:border-brand-red/50 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(229,9,20,0.4)]">
                                            <img
                                                src={item.poster_path_mobile || item.poster_path}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                loading="lazy"
                                                alt={item.title}
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                                                <div>
                                                    <h3 className="font-bold text-white leading-tight mb-1">{item.title}</h3>
                                                    <div className="text-[10px] text-brand-red font-black uppercase">{item.genres?.[0]}</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    </div>
                                </div>
                                {totalPages > 1 && (
                                    <Pagination
                                        currentPage={currentPage}
                                        totalPages={totalPages}
                                        onPageChange={(page) => {
                                            setCurrentPage(page);
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}
                                    />
                                )}
                            </>
                        ) : (
                            <div className="h-64 flex flex-col items-center justify-center text-gray-500 border border-dashed border-white/10 rounded-xl">
                                <p className="text-xl font-bold mb-2">No Anime Found</p>
                                <p className="text-sm">Check back later for new additions!</p>
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        if (activeTab === 'my-list') {
            if (!isAuthenticated) return null;

            const myListView = content.filter(c => currentProfile?.myList?.includes(c.id));

            return (
                <div className="pt-24 px-4 md:px-12 pb-12 min-h-screen">
                    <h1 className="text-3xl font-bold mb-8">My List</h1>
                    {myListView.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-12">
                            {myListView.map(item => (
                                <div key={item.id} onClick={() => handleDetails(item)} className="cursor-pointer transition-transform hover:scale-105 relative aspect-[2/3]">
                                    <img
                                        src={item.poster_path_mobile || item.poster_path}
                                        className="rounded-lg shadow-lg w-full aspect-[2/3] object-cover"
                                        loading="lazy"
                                        alt={item.title}
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-gray-400 mb-12">Your list is empty.</div>
                    )}
                </div>
            );
        }

        if (activeTab === 'search') {
            return <SearchPage onDetails={handleDetails} />;
        }

        if (activeTab === 'exclusive') {
            return <ExclusiveContentPage onDetails={handleDetails} />;
        }

        if (activeTab === 'account') {
            if (!isAuthenticated) return <Navigate to="/home" />;
            return <AccountSettings setActiveTab={handleTabChange} />;
        }

        return <Navigate to="/" replace />;
    };

    if (isLoading) {
        return <Loader />;
    }

    // Force Profile Selection if logged in but no profile selected
    if (isAuthenticated && !currentProfile) {
        return (
            <>
                <ScrollToTop />
                <ProfileSelection />
            </>
        );
    }

    return (
        <div className="bg-[#141414] min-h-screen text-white font-sans selection:bg-red-600 selection:text-white">
            <ScrollToTop />

            {/* Anime Intro Overlay */}
            {showAnimeIntro && <AnimeIntro mode={animeIntroMode} onComplete={handleIntroComplete} />}

            <TopNav
                activeTab={activeTab}
                setTab={handleTabChange}
                onSearch={() => handleTabChange('search')}
                onUnlock={() => setShowUnlockModal(true)}
                onLoginClick={() => navigate('/login')}
            />

            <main>
                {renderContent()}
            </main>

            <Footer onNavigate={handleNavigate} />
            <MobileNav activeTab={activeTab} setTab={handleTabChange} />



            {viewingContent && (
                <ContentDetails
                    content={viewingContent}
                    onClose={() => {
                        // Navigate directly to the current tab's base path instead of going back
                        const path = activeTab === 'home' ? '/' : `/${activeTab}`;
                        navigate(path);
                    }}
                    onPlay={handlePlay}
                    onDetails={handleDetails}
                />
            )}

            {playingContent && (
                <VideoPlayer
                    content={playingContent}
                    onClose={() => {
                        const path = activeTab === 'home' ? '/' : `/${activeTab}`;
                        navigate(path);
                    }}
                />
            )}
            <UnlockContentModal
                isOpen={showUnlockModal}
                onClose={() => setShowUnlockModal(false)}
            />

        </div>
    );
};

const AppRoutes = () => {
    const { currentUser, isLoading, isAuthenticated } = useStore();
    const navigate = useNavigate();

    return (
        <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/scan" element={<MobileScannerPage />} />
            <Route
                path="/admin/*"
                element={
                    isLoading ? (
                        <Loader />
                    ) : (currentUser?.role === 'admin' || (isAuthenticated && window.location.pathname.startsWith('/admin'))) ? (
                        <AdminLayout onExit={() => navigate('/')} />
                    ) : (
                        <Navigate to="/" replace />
                    )
                }
            />
            <Route path="/*" element={<MainLayout />} />
        </Routes>
    );
};

export default function AppNew() {
    return (
        <StoreProvider>
            <FontLoader />
            <AppRoutes />
        </StoreProvider>
    );
}
