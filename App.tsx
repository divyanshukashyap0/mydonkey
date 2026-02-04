import React, { useState, useEffect, useMemo } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate, useParams } from 'react-router-dom';
import { Home, Search, Download, Settings, ChevronRight, X, Check, Lock, PlayCircle } from 'lucide-react';
import { StoreProvider, useStore } from './context/StoreContext';
import { Content, Section, Profile } from './types';
import { FOOTER_PAGE_CONTENT } from './constants';
import VideoPlayer from './components/VideoPlayer';
import SparksFeed from './components/SparksFeed';
import ContentDetails from './components/ContentDetails';
import TopNav from './components/TopNav';
import HeroBanner from './components/HeroBanner';
import ContentRail from './components/ContentRail';
import AdminLayout from './components/admin/AdminLayout';
import Footer from './components/Footer';
import InfoPage from './components/InfoPage';
import AccountSettings from './components/AccountSettings';
import LoginPage from './components/LoginPage';
import ProfileSelection from './components/ProfileSelection';
import ActivateDevice from './components/ActivateDevice';
import UnlockContentModal from './components/UnlockContentModal';

// --- Mobile Bottom Nav ---
const MobileNav = ({ activeTab, setTab, currentProfile }: any) => (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0a0a0a] border-t border-white/10 z-[60] pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.8)]">
        <div className="flex justify-around items-center h-16">
            <button onClick={() => setTab('home')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'home' ? 'text-white' : 'text-gray-400 hover:text-gray-200'}`}>
                <Home size={20} strokeWidth={activeTab === 'home' ? 3 : 2} />
                <span className="text-[10px] font-medium">Home</span>
            </button>
            <button onClick={() => setTab('search')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'search' ? 'text-white' : 'text-gray-400 hover:text-gray-200'}`}>
                <Search size={20} strokeWidth={activeTab === 'search' ? 3 : 2} />
                <span className="text-[10px] font-medium">Search</span>
            </button>
            <button onClick={() => setTab('downloads')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'downloads' ? 'text-white' : 'text-gray-400 hover:text-gray-200'}`}>
                <Download size={20} strokeWidth={activeTab === 'downloads' ? 3 : 2} />
                <span className="text-[10px] font-medium">My List</span>
            </button>
            <button onClick={() => setTab('account')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'account' ? 'text-white' : 'text-gray-400 hover:text-gray-200'}`}>
                <img src={currentProfile?.avatarUrl || "https://wallpapers.com/images/hd/netflix-profile-pictures-1000-x-1000-qo9h82134t9nv0j0.jpg"} className={`w-5 h-5 rounded object-cover ${activeTab === 'account' ? 'border-2 border-white' : 'opacity-80'}`} />
                <span className="text-[10px] font-medium">Profile</span>
            </button>
        </div>
    </div>
);

// --- Search Component ---
const SearchOverlay = ({ isOpen, onClose, onPlay, onDetails }: any) => {
    const { content } = useStore();
    const [query, setQuery] = useState('');

    if (!isOpen) return null;

    const results = query
        ? content.filter(c =>
            c.title.toLowerCase().includes(query.toLowerCase()) ||
            c.overview.toLowerCase().includes(query.toLowerCase()) ||
            c.tags?.some(t => t.toLowerCase().includes(query.toLowerCase()))
        )
        : [];

    return (
        <div className="fixed inset-0 z-[60] bg-black/95 flex flex-col pt-24 px-4 md:px-32 animate-in fade-in">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold">Search</h2>
                <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={40} /></button>
            </div>
            <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Movies, Shows, Genres, Cast..."
                className="bg-gray-800 text-white text-2xl p-6 rounded-lg outline-none focus:ring-2 ring-brand-red placeholder:text-gray-500 w-full"
            />

            <div className="mt-8 flex-1 overflow-y-auto no-scrollbar pb-20">
                {query && results.length === 0 && (
                    <div className="text-center text-gray-500 mt-10 text-xl">No results found for "{query}"</div>
                )}
                {query && results.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {results.map(item => (
                            <div key={item.id} className="group relative cursor-pointer" onClick={() => onDetails(item)}>
                                <div className="aspect-[2/3] rounded-lg overflow-hidden border border-white/10 group-hover:border-white/50 transition">
                                    <img src={item.poster_path} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                        <PlayCircle size={40} />
                                    </div>
                                </div>
                                <h4 className="mt-2 text-sm font-bold text-gray-300 group-hover:text-white">{item.title}</h4>
                            </div>
                        ))}
                    </div>
                )}
                {!query && (
                    <div className="text-gray-500 mt-10">
                        <h3 className="font-bold text-lg mb-4 text-white">Top Genres</h3>
                        <div className="flex flex-wrap gap-2">
                            {['Action', 'Comedy', 'Thriller', 'Drama', 'Originals'].map(tag => (
                                <button key={tag} onClick={() => setQuery(tag)} className="px-4 py-2 bg-white/10 rounded-full hover:bg-white/20 text-sm">{tag}</button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Generic Grid View for Movies/TV ---
const CategoryGrid = ({ title, items, onPlay, onDetails, withHero = false }: any) => {
    return (
        <div className={`${withHero ? 'px-4 md:px-12 pb-20' : 'pt-24 px-4 md:px-12 pb-20 min-h-screen'}`}>
            <h1 className="text-3xl md:text-5xl font-black mb-8 animate-in slide-in-from-left">{title}</h1>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 animate-in slide-in-from-bottom-8 duration-500">
                {items.map((item: Content) => (
                    <div key={item.id} className="group cursor-pointer" onClick={() => onDetails(item)}>
                        <div className="aspect-[2/3] rounded-lg overflow-hidden relative shadow-lg border border-transparent hover:border-white/20 transition-all">
                            <img
                                src={item.poster_path}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col justify-end p-4 transition-opacity">
                                <div className="flex items-center gap-2 mb-2">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onPlay(item); }}
                                        className="bg-brand-red text-white p-2 rounded-full hover:scale-110 transition"
                                    >
                                        <PlayCircle size={24} fill="white" />
                                    </button>
                                    <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded">{item.vote_average.toFixed(1)}</span>
                                </div>
                                <p className="text-xs text-gray-300 line-clamp-2">{item.overview}</p>
                            </div>
                        </div>
                        <h3 className="mt-2 font-bold text-gray-200 group-hover:text-white truncate">{item.title}</h3>
                        <p className="text-xs text-gray-500">{item.release_date.split('-')[0]} • {item.genres.slice(0, 2).join(', ')}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

// --- Info Page Wrapper to Extract Params and Data ---
const InfoPageWrapper = ({ onBack }: { onBack: () => void }) => {
    const { pageId } = useParams<{ pageId: string }>();
    const data = FOOTER_PAGE_CONTENT[decodeURIComponent(pageId || '')];

    if (!data) {
        return (
            <div className="min-h-screen pt-24 px-12 text-center">
                <h1 className="text-3xl font-bold mb-4">Page Not Found</h1>
                <p className="text-gray-400 mb-8">The requested information page could not be found.</p>
                <button onClick={onBack} className="bg-brand-red px-6 py-2 rounded text-white font-bold">Go Home</button>
            </div>
        );
    }

    return <InfoPage data={data} onBack={onBack} />;
};

// --- Deep Link Handler ---
const DeepLinkHandler = ({ setViewingItem, content }: { setViewingItem: (item: any) => void, content: Content[] }) => {
    const { contentId } = useParams<{ contentId: string }>();
    const navigate = useNavigate();

    useEffect(() => {
        if (contentId && content.length > 0) {
            const item = content.find(c => c.id === contentId);
            if (item) {
                setViewingItem(item);
            }
            // Always redirect to home to clean URL and establish context
            navigate('/', { replace: true });
        } else if (content.length > 0) {
            // Content loaded but ID not found
            navigate('/', { replace: true });
        }
    }, [contentId, content, navigate, setViewingItem]);

    // Return null or a loader while processing
    return null;
};

const AppContent = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [playingItem, setPlayingItem] = useState<any>(null);
    const [viewingItem, setViewingItem] = useState<any>(null);
    const [searchOpen, setSearchOpen] = useState(false);
    const [unlockOpen, setUnlockOpen] = useState(false);

    // Derive activeTab from URL
    const activeTab = useMemo(() => {
        const path = location.pathname;
        if (path === '/') return 'home';
        if (path.startsWith('/info/')) return `info:${decodeURIComponent(path.split('/info/')[1])}`;
        return path.substring(1) || 'home';
    }, [location.pathname]);

    const setTab = (tab: string) => {
        if (tab === 'home') navigate('/');
        else if (tab.startsWith('info:')) navigate(`/info/${tab.split('info:')[1]}`);
        else navigate(`/${tab}`);
    };

    // Consume Store
    const { content, settings, sections, isAuthenticated, currentProfile, currentUser, switchProfile } = useStore();

    // --- Inactivity Timer (2 Hours) ---
    useEffect(() => {
        if (!currentProfile) return;

        let timeout: NodeJS.Timeout;
        const TIMEOUT_DURATION = 2 * 60 * 60 * 1000; // 2 Hours

        const resetTimer = () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                switchProfile(null);
            }, TIMEOUT_DURATION);
        };

        // Initial start
        resetTimer();

        // Listeners
        const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
        events.forEach(event => window.addEventListener(event, resetTimer));

        return () => {
            clearTimeout(timeout);
            events.forEach(event => window.removeEventListener(event, resetTimer));
        };
    }, [currentProfile, switchProfile]);


    // Recommendation Engine
    const recommendedContent = useMemo(() => {
        if (!currentProfile) return [];

        // Collect tags from Watchlist & History
        const userGenres = new Set<string>();
        content.forEach(c => {
            if (currentProfile.myList.includes(c.id)) {
                (c.genres || []).forEach(g => userGenres.add(g));
            }
        });

        const scoredContent = content
            .filter(c => !currentProfile.myList.includes(c.id))
            .map(c => {
                let score = 0;
                (c.genres || []).forEach(g => { if (userGenres.has(g)) score++; });
                return { ...c, score };
            });

        return scoredContent
            .filter(c => c.score > 0)
            .sort((a, b) => b.score - (a.score as any))
            .slice(0, 10);
    }, [content, currentProfile?.myList]);

    const handleFooterNavigate = (pageTitle: string) => {
        if (pageTitle === 'Account') {
            setTab('account');
        } else if (pageTitle === 'Activate Device') {
            setTab('activate');
        } else {
            setTab(`info:${pageTitle}`);
        }
        window.scrollTo(0, 0);
    };

    // --- Deep Link: Save pending link before auth redirect ---
    useEffect(() => {
        const path = location.pathname;
        if (path.startsWith('/watch/') || path.startsWith('/browse/')) {
            const contentId = path.split('/').pop();
            if (contentId) {
                localStorage.setItem('pendingDeepLink', contentId);
            }
        }
    }, [location.pathname]);

    // --- Deep Link: Process after login ---
    useEffect(() => {
        if (isAuthenticated && currentProfile && content.length > 0) {
            const pendingId = localStorage.getItem('pendingDeepLink');
            if (pendingId) {
                const item = content.find(c => c.id === pendingId);
                if (item) {
                    setViewingItem(item);
                }
                localStorage.removeItem('pendingDeepLink');
                // Clean URL
                if (location.pathname !== '/') {
                    navigate('/', { replace: true });
                }
            }
        }
    }, [isAuthenticated, currentProfile, content, navigate, location.pathname]);

    if (!isAuthenticated) return <LoginPage />;
    if (!currentProfile) return <ProfileSelection />;

    if (settings.maintenanceMode && activeTab !== 'admin') {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center text-center p-8">
                <div className="bg-brand-red/10 p-6 rounded-full mb-6">
                    <Lock size={64} className="text-brand-red" />
                </div>
                <h1 className="text-4xl font-black mb-4">Under Maintenance</h1>
                <p className="text-gray-400 max-w-md text-lg">{settings.siteName} is currently getting a tune-up. We'll be back shortly.</p>
                <button onClick={() => setTab('admin')} className="mt-12 text-gray-700 hover:text-gray-500 text-sm font-mono">Admin Login</button>
            </div>
        )
    }

    if (activeTab === 'admin') return <AdminLayout onExit={() => setTab('home')} />;

    // Content Filtering for Kids Mode
    const availableContent = currentProfile.isKids ? content.filter(c => c.tags?.includes('Kids')) : content;

    // Derived Lists
    const movieItems = availableContent.filter(c => c.type === 'movie');
    const tvItems = availableContent.filter(c => c.type === 'tv');
    const myListItems = content.filter(c => currentProfile.myList.includes(c.id));

    // Hero Selection
    const heroItem = availableContent.find(c => c.id === settings.heroContentId) || movieItems[0] || availableContent[0];

    const renderScopedSections = (scope: 'home' | 'tv' | 'movie' | 'new') => {
        return sections
            .filter(s => s.enabled && s.scopes.includes(scope))
            .map(section => {
                let items: Content[] = [];
                let title = section.title;

                if (section.type === 'trending') {
                    items = availableContent.sort((a, b) => b.vote_average - a.vote_average).slice(0, 15);
                } else if (section.type === 'originals') {
                    items = availableContent.filter(c => c.tags?.includes('Original'));
                } else if (section.type === 'genre') {
                    items = availableContent.filter(c => c.genres.includes(section.genreFilter || ''));
                } else if (section.type === 'curated') {
                    items = content.filter(c => section.contentIds?.includes(c.id));
                }

                if (items.length === 0) return null;

                return (
                    <ContentRail
                        key={section.id}
                        title={title}
                        items={items}
                        onDetails={setViewingItem}
                        isOriginal={section.type === 'originals'}
                        layout={section.type === 'trending' ? 'portrait' : 'portrait'}
                    />
                );
            });
    };

    return (
        <div className="min-h-screen font-sans selection:bg-brand-red selection:text-white bg-cinema-black text-white overflow-x-hidden">
            <TopNav activeTab={activeTab} setTab={setTab} onSearch={() => setSearchOpen(true)} onUnlock={() => setUnlockOpen(true)} />

            <main className="pb-20 md:pb-0">
                <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} onPlay={setPlayingItem} onDetails={setViewingItem} />

                <Routes>
                    <Route path="/" element={
                        <>
                            <HeroBanner item={heroItem} onDetails={setViewingItem} onPlay={setPlayingItem} />

                            {/* Gradient Spacer to smooth transition and prevent overlap */}
                            <div className="relative z-10 bg-gradient-to-b from-transparent via-cinema-black/60 to-cinema-black w-full h-12 -mt-12 pointer-events-none" />

                            <div className="relative z-10 space-y-4 px-4 md:px-12 pb-10">
                                {renderScopedSections('home')}
                                {currentUser?.continueWatching && currentUser.continueWatching.length > 0 && (
                                    <ContentRail
                                        title="Continue Watching"
                                        items={content.filter(c => currentUser.continueWatching?.some(h => h.movieId === c.id))}
                                        onDetails={setViewingItem}
                                        layout="landscape"
                                    />
                                )}
                                {/* Fallback Rail for Recently Added (All Published Content) */}
                                <ContentRail
                                    title="Recently Added"
                                    items={availableContent.filter(c => c.isPublished).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 20)}
                                    onDetails={setViewingItem}
                                    layout="landscape"
                                />
                            </div>
                            <Footer onNavigate={handleFooterNavigate} />
                        </>
                    } />

                    <Route path="/movies" element={
                        <>
                            <HeroBanner item={movieItems[0]} onDetails={setViewingItem} onPlay={setPlayingItem} />
                            <div className="relative z-10 space-y-4 -mt-24 md:-mt-48 pb-10">
                                {renderScopedSections('movie')}
                            </div>
                            <CategoryGrid title="All Movies" items={movieItems} onPlay={setPlayingItem} onDetails={setViewingItem} withHero={true} />
                            <Footer onNavigate={handleFooterNavigate} />
                        </>
                    } />

                    <Route path="/tv" element={
                        <>
                            <HeroBanner item={tvItems[0]} onDetails={setViewingItem} onPlay={setPlayingItem} />
                            <div className="relative z-10 space-y-4 -mt-24 md:-mt-48 pb-10">
                                {renderScopedSections('tv')}
                            </div>
                            <CategoryGrid title="All TV Shows" items={tvItems} onPlay={setPlayingItem} onDetails={setViewingItem} withHero={true} />
                            <Footer onNavigate={handleFooterNavigate} />
                        </>
                    } />

                    <Route path="/sparks" element={<SparksFeed items={availableContent.filter(c => c.tags?.includes('Spark'))} />} />

                    <Route path="/downloads" element={
                        <div className="min-h-screen flex flex-col justify-between pt-24 px-4 md:px-12">
                            <div>
                                <h1 className="text-2xl md:text-4xl font-black mb-8">My List</h1>
                                {myListItems.length > 0 ? (
                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 mb-12">
                                        {myListItems.map(item => (
                                            <div key={item.id} className="group relative cursor-pointer" onClick={() => setViewingItem(item)}>
                                                <div className="aspect-[2/3] rounded-lg overflow-hidden border border-white/10 group-hover:border-white/50 transition">
                                                    <img src={item.poster_path} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-gray-500 text-lg mb-12">Your list is empty.</div>
                                )}
                            </div>
                            <Footer onNavigate={handleFooterNavigate} />
                        </div>
                    } />

                    <Route path="/account" element={
                        <div className="min-h-screen flex flex-col justify-between bg-cinema-black">
                            <AccountSettings setActiveTab={setTab} />
                            <Footer onNavigate={handleFooterNavigate} />
                        </div>
                    } />

                    <Route path="/info/:pageId" element={<InfoPageWrapper onBack={() => setTab('home')} />} />

                    <Route path="/activate" element={
                        <div className="min-h-screen bg-cinema-black">
                            <TopNav activeTab="" setTab={setTab} onSearch={() => setSearchOpen(true)} onUnlock={() => setUnlockOpen(true)} />
                            <ActivateDevice onBack={() => setTab('home')} />
                            <Footer onNavigate={handleFooterNavigate} />
                        </div>
                    } />

                    <Route path="/browse/:contentId" element={<DeepLinkHandler setViewingItem={setViewingItem} content={content} />} />
                    <Route path="/watch/:contentId" element={<DeepLinkHandler setViewingItem={setViewingItem} content={content} />} />

                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </main>

            {playingItem && <VideoPlayer content={playingItem} onClose={() => setPlayingItem(null)} />}
            {viewingItem && <ContentDetails content={viewingItem} onClose={() => setViewingItem(null)} onPlay={(item, mode) => setPlayingItem({ ...item, playMode: mode })} />}
            <UnlockContentModal isOpen={unlockOpen} onClose={() => setUnlockOpen(false)} />
            <MobileNav activeTab={activeTab} setTab={setTab} currentProfile={currentProfile} />
        </div>
    );
};

export default function App() {
    return (
        <StoreProvider>
            <AppContent />
        </StoreProvider>
    );
}