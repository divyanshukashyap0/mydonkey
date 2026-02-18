import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useStore } from './context/StoreContext';
import { logUserActivity } from './utils/activityLogger';
import TopNav from './components/TopNav';
import AnimeIntro from './components/AnimeIntro';
import HeroBanner from './components/HeroBanner';
import HeroSkeleton from './components/HeroSkeleton';
import ContentRail from './components/ContentRail';
import ContentDetails from './components/ContentDetails';
import VideoPlayer from './components/VideoPlayer';
import LoginPage from './components/LoginPage';
import MobileNav from './components/MobileNav';
import Footer from './components/Footer';
import InfoPage from './components/InfoPage';
import AccountSettings from './components/AccountSettings';
import RequestContent from './components/RequestContent';
import AdminLayout from './components/admin/AdminLayout';
import ContentRequestInline from './components/ContentRequestInline';
import UnlockContentModal from './components/UnlockContentModal';
import SearchPage from './components/SearchPage';
import ScrollToTop from './components/ScrollToTop';
import ProfileSelection from './components/ProfileSelection';
import FontLoader from './components/FontLoader';
import Loader from './components/Loader';
import { Content } from './types';
import { StoreProvider } from './context/StoreContext';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';

const MainLayout = () => {
    const { content, currentUser, currentProfile, isLoading, isAuthenticated, sections, pages, settings } = useStore();
    const location = useLocation();
    const navigate = useNavigate();

    // Derived activeTab from URL
    const path = location.pathname.substring(1);
    let activeTab = path ? decodeURIComponent(path) : 'home';
    if (activeTab.startsWith('browse/')) {
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

    // Deep Link Handler (e.g. /browse/content_123)
    useEffect(() => {
        if (location.pathname.startsWith('/browse/')) {
            const contentId = location.pathname.split('/')[2];
            if (content.length > 0) {
                if (contentId) {
                    const item = content.find(c => c.id === contentId);
                    if (item) {
                        setViewingContent(item);
                    } else {
                        // Content loaded but ID not found
                        console.warn(`Deep link content not found: ${contentId}`);
                        // Optional: Use a toast here if available in future
                        // alert("Content not found"); // Removed to be less intrusive, just redirect
                        navigate('/home', { replace: true });
                    }
                } else {
                    navigate('/home', { replace: true });
                }
            }
        }
    }, [location.pathname, content, navigate]);

    // Redirect root and /features to /home
    useEffect(() => {
        if (location.pathname === '/' || location.pathname === '/features') {
            navigate('/home', { replace: true });
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
    const { originals, trending, movies, tvShows } = useMemo(() => {
        if (!content) return { originals: [], trending: [], movies: [], tvShows: [] };

        // Trending logic
        const trendingContent = content.filter(c => c.featured || (c.vote_average && c.vote_average > 7.5));

        return {
            originals: content.filter(c => c.isOriginal),
            trending: trendingContent,
            movies: content.filter(c => c.type === 'movie'),
            tvShows: content.filter(c => c.type === 'tv'),
        };
    }, [content]);

    // Handlers
    const handlePlay = (item: Content, mode: 'movie' | 'trailer' = 'movie') => {
        if (mode === 'trailer') {
            setPlayingContent({ ...item, playMode: 'trailer' });
        } else {
            if (isAuthenticated && currentUser) {
                // Check for Exclusive Content
                if (item.accessCode && !currentProfile?.unlockedContent?.includes(item.id)) {
                    setShowUnlockModal(true);
                    return;
                }
                setPlayingContent({ ...item, playMode: 'movie' });
            } else {
                navigate('/login');
            }
        }
    };

    const handleDetails = (item: Content) => {
        setViewingContent(item);
    };

    const handleTabChange = (tabId: string) => {
        if (tabId === 'my-list' && !isAuthenticated) {
            navigate('/login');
            return;
        }
        // Navigate to the new URL
        navigate(`/${tabId}`);
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

    // Render Content based on Tab
    const renderContent = () => {
        // Info Pages - Dynamic
        const pageData = pages.find(p => p.id === activeTab);
        if (pageData) {
            return (
                <InfoPage
                    data={pageData}
                    onBack={() => navigate('/home')}
                />
            );
        }

        if (activeTab === 'home') {
            const heroItem = (settings?.heroContentId && content.find(c => c.id === settings.heroContentId))
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
                        {/* Dynamic Sections from Admin */}
                        {sections
                            .filter(s => s.enabled && s.scopes?.includes('home'))
                            .sort((a, b) => a.order - b.order)
                            .map(section => {
                                let autoItems: Content[] = [];

                                // Auto-population logic
                                if (section.type === 'trending') {
                                    autoItems = content.filter(c => c.featured || (c.vote_average && c.vote_average > 7.5)).slice(0, 10);
                                } else if (section.type === 'genre' && section.genreFilter) {
                                    autoItems = content.filter(c => c.genres?.includes(section.genreFilter!)).slice(0, 10);
                                } else if (section.type === 'originals') {
                                    autoItems = content.filter(c => c.isOriginal).slice(0, 10);
                                } else if (section.type === 'new_movies') {
                                    autoItems = content.filter(c => c.type === 'movie').slice(0, 10);
                                } else if (section.type === 'new_tv') {
                                    autoItems = content.filter(c => c.type === 'tv').slice(0, 10);
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
                                        isTop10={section.showRanking} // Use specific ranking style if enabled
                                        showRanking={section.showRanking}
                                    />
                                );
                            })}
                        <div className="pr-4 md:pr-12 pt-8">
                            <ContentRequestInline />
                        </div>
                    </div>
                </>
            );
        }

        if (activeTab === 'movies') {
            return (
                <div className="pt-24 px-4 md:px-12 pb-12 min-h-screen">
                    <h1 className="text-3xl font-bold mb-8">Movies</h1>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-12">
                        {movies.map(item => (
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
                    <ContentRequestInline />
                </div>
            );
        }

        if (activeTab === 'tv') {
            return (
                <div className="pt-24 px-4 md:px-12 pb-12 min-h-screen">
                    <h1 className="text-3xl font-bold mb-8">TV Shows</h1>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-12">
                        {tvShows.map(item => (
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
                    <ContentRequestInline />
                </div>
            );
        }

        if (activeTab === 'anime') {
            // Filter Anime Content
            const animeContent = content.filter(c =>
                c.genres?.some(g => g.toLowerCase() === 'anime' || g.toLowerCase() === 'animation')
            );

            // Sub-Genre Filtering State (Local to this block if possible, but React needs it at top level or component)
            // Since we are inside renderContent, we can't use useState hooks here directly if they weren't declared at top.
            // WORKAROUND: We will declare the state at the top level of MainLayout.

            // ... (See Top Level State Addition below) ...

            // Derived filtered list
            const filteredAnime = animeCategory === 'All'
                ? animeContent
                : animeContent.filter(c => c.genres?.includes(animeCategory));

            const featuredAnime = animeContent.find(c => c.featured) || animeContent[0];

            const categories = ['All', 'Action', 'Romance', 'Fantasy', 'Sci-Fi', 'Adventure', 'Drama'];

            return (
                <div className="min-h-screen pt-24 px-4 md:px-12 pb-12">
                    <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
                        <span className="bg-gradient-to-r from-brand-red to-purple-600 bg-clip-text text-transparent">Anime Library</span>
                    </h1>

                    {animeContent.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                            {animeContent.map(item => (
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
                    ) : (
                        <div className="h-64 flex flex-col items-center justify-center text-gray-500 border border-dashed border-white/10 rounded-xl">
                            <p className="text-xl font-bold mb-2">No Anime Found</p>
                            <p className="text-sm">Check back later for new additions!</p>
                        </div>
                    )}

                    <div className="mt-16">
                        <ContentRequestInline />
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
                    <ContentRequestInline />
                </div>
            );
        }

        if (activeTab === 'search') {
            return <SearchPage onDetails={handleDetails} />;
        }

        if (activeTab === 'account') {
            if (!isAuthenticated) return <Navigate to="/home" />;
            return <AccountSettings setActiveTab={handleTabChange} />;
        }

        if (activeTab === 'request') {
            return <RequestContent />;
        }

        return (
            <div className="min-h-screen pt-24 flex flex-col items-center justify-center text-center px-4">
                <h1 className="text-4xl font-bold mb-4">Page Not Found</h1>
                <p className="text-gray-400 mb-8">The page you are looking for does not exist.</p>
                <button
                    onClick={() => navigate('/home')}
                    className="px-6 py-2 bg-red-600 text-white rounded font-bold hover:bg-red-700 transition"
                >
                    Go Home
                </button>
            </div >
        );
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
            {showAnimeIntro && <AnimeIntro mode={animeIntroMode} onComplete={() => setShowAnimeIntro(false)} />}

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
                    onClose={() => setViewingContent(null)}
                    onPlay={handlePlay}
                    onDetails={handleDetails}
                />
            )}

            {playingContent && (
                <VideoPlayer
                    content={playingContent}
                    onClose={() => setPlayingContent(null)}
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
    const { currentUser, isLoading } = useStore();
    const navigate = useNavigate();

    return (
        <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
                path="/admin/*"
                element={
                    isLoading ? (
                        <Loader />
                    ) : currentUser?.role === 'admin' ? (
                        <AdminLayout onExit={() => navigate('/')} />
                    ) : (
                        <Navigate to="/home" replace />
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
