import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Menu, X, User, LogOut, Settings, LayoutDashboard, ChevronRight, Smartphone, Download, Loader2, Star, Play, Film } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { searchTMDBMulti, tmdbPosterUrl, tmdbBackdropUrl, mapTMDBGenres } from '../services/tmdbService';
import { buildEmbedUrl } from '../utils/embedUrl';
import { Content } from '../types';

interface TopNavProps {
    activeTab: string;
    setTab: (id: string) => void;
    onSearch: () => void;
    onUnlock: () => void;
    onDetails?: (item: Content) => void;
}

const TopNav: React.FC<TopNavProps & { onLoginClick?: () => void }> = ({ activeTab, setTab, onSearch, onUnlock, onLoginClick, onDetails }) => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isProfileMenuOpen, setProfileMenuOpen] = useState(false);
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Partial<Content>[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const profileRef = useRef<HTMLDivElement>(null);
    const searchContainerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    const { logout, currentUser, currentProfile, userProfiles, switchProfile, isInstallable, installPwa, content, settings } = useStore();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 0);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Clean up debounce timer on unmount
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    // Close dropdown on route change
    useEffect(() => {
        setIsDropdownOpen(false);
    }, [location.pathname]);

    // --- Click Outside to Close ---
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setProfileMenuOpen(false);
            }
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleNavClick = (id: string) => {
        setTab(id);
        setMobileMenuOpen(false);
        setIsDropdownOpen(false);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setSearchQuery(val);

        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        if (!val.trim()) {
            setSearchResults([]);
            setIsDropdownOpen(false);
            setIsSearching(false);
            return;
        }

        setIsDropdownOpen(true);
        setIsSearching(true);

        debounceTimerRef.current = setTimeout(async () => {
            try {
                const lower = val.toLowerCase().trim();

                // 1. Local catalog search (instant)
                const localMatches = (content || []).filter(c =>
                    (c.title && c.title.toLowerCase().includes(lower)) ||
                    (c.genres && c.genres.some(g => g.toLowerCase().includes(lower))) ||
                    (c.overview && c.overview.toLowerCase().includes(lower))
                ).slice(0, 8);

                // 2. TMDB Multi Search
                let tmdbResults: any[] = [];
                try {
                    tmdbResults = await searchTMDBMulti(val);
                } catch (e) {
                    console.warn("TMDB dropdown search error:", e);
                }

                // 3. Map TMDB items
                const mappedTMDB: Partial<Content>[] = (tmdbResults || []).map(r => {
                    const releaseDate = r.release_date || r.first_air_date || '';
                    const year = releaseDate ? parseInt(releaseDate.split('-')[0]) : 0;
                    const effectiveType: 'movie' | 'tv' = r.media_type === 'tv' ? 'tv' : 'movie';
                    return {
                        id: `tmdb_${r.id}`,
                        tmdbId: r.id,
                        title: r.title || r.name || 'Untitled',
                        type: effectiveType,
                        poster_path: r.poster_path ? tmdbPosterUrl(r.poster_path, 'w342') : '',
                        backdrop_path: r.backdrop_path ? tmdbBackdropUrl(r.backdrop_path, 'w780') : '',
                        release_date: releaseDate,
                        year: year,
                        vote_average: r.vote_average || 0,
                        rating: r.vote_average ? String(r.vote_average) : '0',
                        youtubeId: '',
                        overview: r.overview || '',
                        genres: mapTMDBGenres(r.genre_ids || []),
                        allowPlayback: true,
                        isPublished: true
                    };
                });

                // 4. Combine & Deduplicate (prioritize local matches)
                const combined: Partial<Content>[] = [...localMatches];
                mappedTMDB.forEach(t => {
                    if (!combined.some(c => (c.tmdbId && c.tmdbId === t.tmdbId) || (c.title && c.title.toLowerCase() === t.title?.toLowerCase()))) {
                        combined.push(t);
                    }
                });

                setSearchResults(combined.slice(0, 8));
            } catch (err) {
                console.error("Search dropdown error:", err);
            } finally {
                setIsSearching(false);
            }
        }, 250);
    };

    const handleSelectResult = (item: Partial<Content>) => {
        setIsDropdownOpen(false);
        setIsSearchFocused(false);
        searchInputRef.current?.blur();

        const localMatch = content?.find(c => (item.tmdbId && c.tmdbId === item.tmdbId) || (item.id && c.id === item.id));
        if (localMatch) {
            if (onDetails) {
                onDetails(localMatch);
            } else {
                navigate(`/browse/${localMatch.id}`, { state: { item: localMatch } });
            }
            return;
        }

        const immediateType: 'movie' | 'tv' = (item.type as 'movie' | 'tv') || 'movie';
        const streamId = String(item.tmdbId || item.id || '');
        const immediateContent: Content = {
            id: (item.id && !item.id.startsWith('tmdb_')) ? item.id : `tmdb_${item.tmdbId}`,
            tmdbId: item.tmdbId,
            title: item.title || 'Untitled',
            type: immediateType,
            poster_path: item.poster_path || '',
            backdrop_path: item.backdrop_path || '',
            release_date: item.release_date || '',
            year: item.year || (item.release_date ? parseInt(item.release_date.split('-')[0]) : 0),
            vote_average: item.vote_average || 0,
            rating: item.rating ? String(item.rating) : (item.vote_average ? String(item.vote_average) : '0'),
            youtubeId: item.youtubeId || '',
            overview: item.overview || '',
            genres: item.genres || [],
            videoUrl: buildEmbedUrl(streamId, immediateType, settings),
            allowPlayback: true,
            isPublished: true,
            createdAt: new Date().toISOString()
        };

        if (onDetails) {
            onDetails(immediateContent);
        } else {
            navigate(`/browse/${immediateContent.id}`, { state: { item: immediateContent } });
        }
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchResults.length > 0) {
            handleSelectResult(searchResults[0]);
        }
    };

    const handleSearchIconClick = () => {
        if (searchInputRef.current) {
            searchInputRef.current.focus();
        }
        if (searchQuery.trim()) {
            setIsDropdownOpen(true);
        }
    };

    const handleClearSearch = (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        setSearchQuery('');
        setSearchResults([]);
        setIsDropdownOpen(false);
        setIsSearching(false);
        searchInputRef.current?.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Escape') {
            setIsDropdownOpen(false);
            if (searchQuery) {
                handleClearSearch();
            } else {
                searchInputRef.current?.blur();
            }
        }
    };

    const isAdmin = currentUser?.role === 'admin';

    return (
        <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-700 ${isScrolled ? 'bg-gradient-to-b from-black via-black/90 to-transparent shadow-none' : 'bg-gradient-to-b from-black/90 via-black/40 to-transparent'}`}>
            {settings?.announcementBanner?.trim() && (
                <aside aria-label="Site announcement" className="w-full bg-gradient-to-r from-red-700 via-brand-red to-red-700 text-white text-[11px] sm:text-xs font-semibold py-1.5 px-4 text-center tracking-wide flex items-center justify-center gap-2 border-b border-red-500/30 shadow-md">
                    <span className="inline-block animate-pulse">📢</span>
                    <span>{settings.announcementBanner}</span>
                </aside>
            )}
            <div className="max-w-[1920px] mx-auto px-4 md:px-12 h-16 md:h-20 flex items-center justify-between">

                {/* Logo & Desktop Links */}
                <div className="flex items-center gap-4 md:gap-12">
                    <div
                        className="cursor-pointer"
                        onClick={() => handleNavClick('home')}
                    >
                        <img src="https://res.cloudinary.com/dpba1gvra/image/upload/v1770155013/logo_mgcysp.png" className="h-10 md:h-12 lg:h-14 w-auto object-contain" alt="MY DONKEY Logo" />
                    </div>

                    <div className="hidden lg:flex items-center gap-6">
                        {[
                            { id: 'home', label: 'Home' },
                            { id: 'tv', label: 'TV Shows' },
                            { id: 'movies', label: 'Movies' },
                            { id: 'categories', label: 'Categories' },
                            { id: 'anime', label: 'Anime' },
                            { id: 'my-list', label: 'My List' },
                        ].map(item => (
                            <button
                                key={item.id}
                                onClick={() => handleNavClick(item.id)}
                                className={`text-sm font-bold transition-all duration-300 relative px-5 py-2 rounded-full overflow-hidden group
                                    ${item.id === 'exclusive'
                                        ? `bg-gradient-to-r from-brand-red via-orange-500 to-brand-red bg-[length:200%_auto] animate-shimmer text-white italic tracking-wide shadow-[0_0_20px_rgba(229,9,20,0.6)] hover:shadow-[0_0_30px_rgba(229,9,20,0.8)] hover:scale-110 border border-white/20`
                                        : item.id === 'anime'
                                        ? `bg-gradient-to-r from-violet-600 via-pink-500 to-violet-600 bg-[length:200%_auto] animate-shimmer text-white italic tracking-wide shadow-[0_0_20px_rgba(168,85,247,0.6)] hover:shadow-[0_0_30px_rgba(236,72,153,0.8)] hover:scale-110 border border-white/20`
                                        : `${activeTab === item.id
                                            ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.4)] scale-105 border-transparent'
                                            : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10 hover:border-white/30 hover:text-white hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:scale-105'}`
                                    }
                                `}
                            >
                                <span className="relative z-10">{item.label}</span>
                                {item.id === 'anime' && (
                                    <div className="absolute inset-0 bg-white/20 group-hover:bg-white/30 transition-colors duration-300" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-2 sm:gap-4 md:gap-6">
                    {/* Search Container with Instant Dropdown Results */}
                    <div ref={searchContainerRef} className="relative">
                        <form
                            onSubmit={handleSearchSubmit}
                            role="search"
                            className={`relative flex items-center transition-all duration-300 rounded-full border backdrop-blur-md group
                                ${isSearchFocused || searchQuery
                                    ? 'w-44 xs:w-56 sm:w-64 md:w-72 lg:w-80 bg-black/85 border-brand-red/80 shadow-[0_0_20px_rgba(229,9,20,0.35)]'
                                    : 'w-36 xs:w-44 sm:w-56 md:w-64 lg:w-72 bg-white/10 hover:bg-white/15 border-white/20 hover:border-white/40'
                                }
                                h-9 md:h-10 px-3
                            `}
                        >
                            <button
                                type="button"
                                onClick={handleSearchIconClick}
                                className="text-gray-400 group-hover:text-white group-focus-within:text-brand-red transition-colors flex-shrink-0 p-0.5"
                                aria-label="Search"
                                title="Search"
                            >
                                <Search size={18} className="transition-transform group-hover:scale-110" />
                            </button>
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={handleInputChange}
                                onFocus={() => {
                                    setIsSearchFocused(true);
                                    if (searchQuery.trim()) setIsDropdownOpen(true);
                                }}
                                onBlur={() => setIsSearchFocused(false)}
                                onKeyDown={handleKeyDown}
                                placeholder="Search movies, TV shows..."
                                className="w-full bg-transparent text-white text-xs md:text-sm pl-2 pr-1 focus:outline-none placeholder-gray-400 font-medium tracking-wide"
                                autoComplete="off"
                                autoCorrect="off"
                                spellCheck="false"
                            />
                            {isSearching ? (
                                <Loader2 size={16} className="text-brand-red animate-spin flex-shrink-0" />
                            ) : searchQuery ? (
                                <button
                                    type="button"
                                    onClick={handleClearSearch}
                                    className="text-gray-400 hover:text-white hover:bg-white/20 p-1 rounded-full transition-colors flex-shrink-0"
                                    aria-label="Clear search"
                                    title="Clear"
                                >
                                    <X size={14} />
                                </button>
                            ) : null}
                        </form>

                        {/* Dropdown Results Panel */}
                        {isDropdownOpen && searchQuery.trim().length > 0 && (
                            <div className="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 top-16 sm:top-full mt-2 sm:w-[420px] md:w-[460px] bg-[#0e0e0e]/95 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.95),0_0_30px_rgba(229,9,20,0.2)] overflow-hidden z-[300] animate-in fade-in slide-in-from-top-2 duration-200">
                                {/* Header */}
                                <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-white/5">
                                    <span className="text-xs font-semibold text-gray-300">
                                        {isSearching ? 'Searching...' : searchResults.length > 0 ? `${searchResults.length} Titles Found` : 'Search Results'}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setIsDropdownOpen(false)}
                                        className="text-gray-400 hover:text-white p-1 rounded-md hover:bg-white/10 transition"
                                        aria-label="Close dropdown"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>

                                {/* Results List */}
                                <div className="max-h-[60vh] sm:max-h-[380px] overflow-y-auto p-2 space-y-1 divide-y divide-white/5 custom-scrollbar">
                                    {isSearching && searchResults.length === 0 ? (
                                        <div className="py-10 flex flex-col items-center justify-center text-gray-400 gap-2">
                                            <Loader2 size={24} className="animate-spin text-brand-red" />
                                            <span className="text-xs">Searching catalog & TMDB...</span>
                                        </div>
                                    ) : searchResults.length > 0 ? (
                                        searchResults.map((item, idx) => {
                                            const poster = item.poster_path || '';
                                            const rating = item.vote_average ? item.vote_average.toFixed(1) : null;
                                            const isSeries = item.type === 'tv';
                                            const isAnime = item.genres?.some(g => g.toLowerCase().includes('anime'));
                                            const displayType = isAnime ? 'Anime' : isSeries ? 'Series' : 'Movie';

                                            return (
                                                <div
                                                    key={item.id || item.tmdbId || idx}
                                                    onClick={() => handleSelectResult(item)}
                                                    className="flex items-center gap-3 p-2 hover:bg-white/10 rounded-xl cursor-pointer transition-all duration-150 group relative pt-2"
                                                >
                                                    {/* Poster Thumbnail */}
                                                    <div className="relative w-11 h-16 sm:w-12 sm:h-18 flex-shrink-0 rounded-md overflow-hidden bg-neutral-900 shadow-md">
                                                        {poster ? (
                                                            <img
                                                                src={poster}
                                                                alt={item.title || 'Poster'}
                                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                                                loading="lazy"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-gray-600">
                                                                <Film size={20} />
                                                            </div>
                                                        )}
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            <div className="w-6 h-6 rounded-full bg-brand-red flex items-center justify-center text-white shadow-lg">
                                                                <Play size={10} className="fill-white ml-0.5" />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Meta Info */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-bold text-sm text-white truncate group-hover:text-brand-red transition-colors">
                                                            {item.title}
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-400">
                                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider ${
                                                                isAnime
                                                                    ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                                                                    : isSeries
                                                                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                                                    : 'bg-red-500/20 text-red-300 border border-red-500/30'
                                                            }`}>
                                                                {displayType}
                                                            </span>
                                                            {item.year ? <span>{item.year}</span> : null}
                                                            {rating && parseFloat(rating) > 0 ? (
                                                                <span className="flex items-center gap-0.5 text-amber-400 font-semibold">
                                                                    <Star size={11} className="fill-amber-400 text-amber-400" />
                                                                    {rating}
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                        {item.genres && item.genres.length > 0 ? (
                                                            <div className="text-[10px] text-gray-400 truncate mt-0.5">
                                                                {item.genres.slice(0, 3).join(' • ')}
                                                            </div>
                                                        ) : item.overview ? (
                                                            <div className="text-[10px] text-gray-400 truncate mt-0.5">
                                                                {item.overview}
                                                            </div>
                                                        ) : null}
                                                    </div>

                                                    <ChevronRight size={16} className="text-gray-500 group-hover:text-white transition-colors flex-shrink-0" />
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="py-8 text-center px-4">
                                            <p className="text-sm font-medium text-gray-300">No matches found for &ldquo;{searchQuery}&rdquo;</p>
                                            <p className="text-xs text-gray-500 mt-1">Try checking your spelling or searching for another title.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {currentUser ? (
                        <>


                            {/* Profile Dropdown */}
                            <div className="relative" ref={profileRef}>
                                <button
                                    onClick={() => setProfileMenuOpen(!isProfileMenuOpen)}
                                    className="flex items-center gap-2 group"
                                >
                                    <img src={currentProfile?.avatarUrl || "/Mydonkey%20user.jpg"} className="w-8 h-8 rounded border-2 border-transparent group-hover:border-white transition object-cover" />
                                </button>

                                {isProfileMenuOpen && (
                                    <div className="absolute top-12 right-0 w-56 bg-cinema-black/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl py-2 animate-in slide-in-from-top-2">
                                        <div className="px-4 py-3 border-b border-white/10 mb-2">
                                            <div className="font-bold text-sm truncate text-white">{currentProfile?.name}</div>
                                            <div className="text-[10px] text-gray-500 truncate">{currentUser?.email}</div>
                                        </div>

                                        {isAdmin && (
                                            <button onClick={() => handleNavClick('admin')} className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-white/10 transition text-brand-red font-bold">
                                                <LayoutDashboard size={18} /> Admin Panel
                                            </button>
                                        )}

                                        {userProfiles.length > 1 && (
                                            <div className="py-2 border-b border-white/10">
                                                {userProfiles.filter(p => p.id !== currentProfile?.id).map(profile => (
                                                    <button key={profile.id} onClick={() => switchProfile(profile.id)} className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-white/10 transition opacity-80 hover:opacity-100">
                                                        <img src={profile.avatarUrl || "/Mydonkey%20user.jpg"} className="w-6 h-6 rounded object-cover" />
                                                        <span className="text-gray-300">{profile.name}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        <button onClick={() => handleNavClick('account')} className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-white/10 transition text-gray-300 hover:text-white">
                                            <User size={18} /> Account
                                        </button>
                                        <div className="border-t border-white/10 mt-2 pt-2">
                                            <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-white/10 transition text-gray-400 hover:text-white">
                                                <LogOut size={18} /> Sign Out
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <button
                            onClick={onLoginClick}
                            className="bg-brand-red text-white px-4 py-2 rounded font-bold text-sm hover:bg-red-700 transition"
                        >
                            Sign In
                        </button>
                    )}

                    <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden text-white p-1">
                        <Menu size={24} />
                    </button>
                </div>
            </div>

            {/* Mobile Sidebar Navigation */}
            {
                isMobileMenuOpen && (
                    <div className="fixed inset-0 z-[200] lg:hidden animate-in slide-in-from-right duration-300">
                        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
                        <div className="absolute right-0 top-0 bottom-0 w-[85%] max-w-sm bg-black border-l border-white/10 p-6 flex flex-col shadow-2xl overflow-y-auto">
                            <div className="flex justify-between items-center mb-10">
                                <span className="font-black text-brand-red text-2xl tracking-tighter">MY DONKEY</span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setMobileMenuOpen(false);
                                    }}
                                    className="text-gray-400 hover:text-white p-2 -mr-2 transition-colors duration-200"
                                    aria-label="Close menu"
                                >
                                    <X size={32} />
                                </button>
                            </div>

                            <div className="flex-1 space-y-2">
                                {[
                                    { id: 'home', label: 'Home' },
                                    { id: 'movies', label: 'Movies' },
                                    { id: 'tv', label: 'TV Shows' },
                                    { id: 'categories', label: 'Categories' },
                                    { id: 'anime', label: 'Anime' },
                                    { id: 'search', label: 'Search' },
                                    { id: 'my-list', label: 'My List' }, // Note: My List will trigger login catch in AppNew
                                ].map(item => (
                                    <button
                                        key={item.id}
                                        onClick={() => handleNavClick(item.id)}
                                        className={`w-full text-left text-2xl font-bold py-3 px-4 rounded-xl transition ${activeTab === item.id ? 'bg-white/5 text-white border-l-4 border-brand-red' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-4 pt-8 border-t border-white/10">
                                {isInstallable && (
                                    <button onClick={() => { installPwa(); setMobileMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-brand-red/20 to-transparent border border-brand-red/30 rounded-xl">
                                        <Smartphone size={20} className="text-brand-red" />
                                        <div className="text-left">
                                            <div className="text-white font-bold text-sm">Install App</div>
                                            <div className="text-[10px] text-gray-400">Add to Home Screen</div>
                                        </div>
                                    </button>
                                )}

                                {currentUser ? (
                                    <>
                                        <button onClick={() => handleNavClick('account')} className="w-full text-left font-bold text-gray-400 hover:text-white px-4 py-2">Account Settings</button>
                                        <button onClick={logout} className="w-full text-left font-bold text-brand-red px-4 py-2">Sign Out</button>
                                    </>
                                ) : (
                                    <button onClick={onLoginClick} className="w-full text-left font-bold text-brand-red px-4 py-2">Sign In</button>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }
        </nav >
    );
};

export default TopNav;