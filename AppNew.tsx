import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from './context/StoreContext';
import TopNav from './components/TopNav';
import HeroBanner from './components/HeroBanner';
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
import SearchPage from './components/SearchPage';
import { Content } from './types';
import { StoreProvider } from './context/StoreContext';
import { db, auth } from './firebase';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';

const MainLayout = () => {
    const { content, currentUser, currentProfile, isLoading, isAuthenticated, sections, pages, settings } = useStore();
    const location = useLocation();
    const navigate = useNavigate();

    // Derived activeTab from URL
    // Remove leading slash, default to 'home' if empty (though we redirect empty to home below)
    // Decode URI component for paths like "About%20Us"
    const path = location.pathname.substring(1);
    const activeTab = path ? decodeURIComponent(path) : 'home';

    const [viewingContent, setViewingContent] = useState<Content | null>(null);
    const [playingContent, setPlayingContent] = useState<Content | null>(null);
    const [showLoginModal, setShowLoginModal] = useState(false);

    // Redirect root and /features to /home
    useEffect(() => {
        if (location.pathname === '/' || location.pathname === '/features') {
            navigate('/home', { replace: true });
        }
    }, [location.pathname, navigate]);

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
                setPlayingContent({ ...item, playMode: 'movie' });
            } else {
                setShowLoginModal(true);
            }
        }
    };

    const handleDetails = (item: Content) => {
        setViewingContent(item);
    };

    const handleTabChange = (tabId: string) => {
        if (tabId === 'my-list' && !isAuthenticated) {
            setShowLoginModal(true);
            return;
        }
        // Navigate to the new URL
        navigate(`/${tabId}`);
        window.scrollTo(0, 0);
    };

    const handleNavigate = (page: string) => {
        if (page === 'Account') {
            if (!isAuthenticated) {
                setShowLoginModal(true);
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
                    {heroItem && (
                        <HeroBanner
                            item={heroItem}
                            onPlay={(item) => handlePlay(item, 'movie')}
                            onDetails={handleDetails}
                        />
                    )}
                    <div className="pb-24 bg-[#141414] relative z-10 pl-4 md:pl-12 space-y-8">
                        <ContentRail title="Trending Now" items={trending} onDetails={handleDetails} />
                        <ContentRail title="My Donkey Originals" items={originals} isOriginal onDetails={handleDetails} layout="portrait" />
                        <ContentRail title="New Releases" items={movies.slice(0, 10)} onDetails={handleDetails} />
                        <ContentRail title="TV Shows" items={tvShows.slice(0, 10)} onDetails={handleDetails} />

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
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
            </div>
        );
    }

    if (showLoginModal) {
        return (
            <div className="fixed inset-0 z-[200] bg-black">
                <button
                    onClick={() => setShowLoginModal(false)}
                    className="absolute top-4 right-4 text-white z-50 p-2 bg-black/50 rounded-full hover:bg-white/20"
                >
                    ✕
                </button>
                <LoginPage />
            </div>
        );
    }

    return (
        <div className="bg-[#141414] min-h-screen text-white font-sans selection:bg-red-600 selection:text-white">
            <TopNav
                activeTab={activeTab}
                setTab={handleTabChange}
                onSearch={() => handleTabChange('search')}
                onUnlock={() => { }}
                onLoginClick={() => setShowLoginModal(true)}
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
                />
            )}

            {playingContent && (
                <VideoPlayer
                    content={playingContent}
                    onClose={() => setPlayingContent(null)}
                />
            )}
        </div>
    );
};

const AppRoutes = () => {
    const { currentUser, isLoading } = useStore();
    const navigate = useNavigate();

    return (
        <Routes>
            <Route
                path="/admin/*"
                element={
                    isLoading ? (
                        <div className="min-h-screen bg-black flex items-center justify-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
                        </div>
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
            <AppRoutes />
        </StoreProvider>
    );
}
