import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, X, Loader2, History, Trash2, Clock, Sparkles } from 'lucide-react';
import { Content, Section } from '../types';
import { useStore } from '../context/StoreContext';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { searchTMDBMulti, fetchTMDBDetails, tmdbPosterUrl, tmdbBackdropUrl, mapTMDBGenres, extractTMDBTrailer } from '../services/tmdbService';
import { buildEmbedUrl } from '../utils/embedUrl';
import ContentRail from './ContentRail';
import Pagination from './Pagination';

interface SearchPageProps {
    onDetails: (item: Content) => void;
}

const ITEMS_PER_PAGE = 24;

const SearchPage: React.FC<SearchPageProps> = ({ onDetails }) => {
    const { content, sections, currentProfile, unlockContent, settings, currentUser, updateUser, isQuotaExceeded } = useStore();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const initialQuery = searchParams.get('q') || '';
    const [searchQuery, setSearchQuery] = useState(initialQuery);
    const [results, setResults] = useState<Partial<Content>[]>([]);
    const [matchingSections, setMatchingSections] = useState<Section[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [isSearching, setIsSearching] = useState(false);

    // Search History: check if user enabled it (default true)
    const isHistoryEnabled = currentUser?.searchHistoryEnabled !== false && localStorage.getItem('my_donkey_search_history_enabled') !== 'false';

    const [searchHistory, setSearchHistory] = useState<string[]>(() => {
        try {
            const raw = localStorage.getItem('my_donkey_search_history');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) return parsed;
            }
        } catch (e) {}
        return currentUser?.searchHistory || [];
    });

    // Keep state in sync if currentUser.searchHistory updates from DB
    useEffect(() => {
        if (currentUser?.searchHistory && Array.isArray(currentUser.searchHistory)) {
            setSearchHistory(prev => {
                const combined = Array.from(new Set([...currentUser.searchHistory!, ...prev])).slice(0, 15);
                try {
                    localStorage.setItem('my_donkey_search_history', JSON.stringify(combined));
                } catch (e) {}
                return combined;
            });
        }
    }, [currentUser?.searchHistory]);

    // Save query to search history
    const saveToHistory = (queryToSave: string) => {
        const clean = queryToSave.trim();
        if (!clean || clean.length < 2 || !isHistoryEnabled) return;

        setSearchHistory(prev => {
            const next = [clean, ...prev.filter(q => q.toLowerCase() !== clean.toLowerCase())].slice(0, 15);
            try {
                localStorage.setItem('my_donkey_search_history', JSON.stringify(next));
            } catch (e) {}
            return next;
        });

        if (currentUser) {
            const currentList = searchHistory.filter(q => q.toLowerCase() !== clean.toLowerCase());
            const next = [clean, ...currentList].slice(0, 15);
            updateUser({ searchHistory: next }).catch(() => {});
        }
    };

    // Delete single item from history
    const handleDeleteHistoryItem = (termToDelete: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setSearchHistory(prev => {
            const next = prev.filter(q => q !== termToDelete);
            try {
                localStorage.setItem('my_donkey_search_history', JSON.stringify(next));
            } catch (e) {}
            return next;
        });

        if (currentUser) {
            const next = searchHistory.filter(q => q !== termToDelete);
            updateUser({ searchHistory: next }).catch(() => {});
        }
    };

    // Clear all history
    const handleClearAllHistory = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        try {
            localStorage.removeItem('my_donkey_search_history');
        } catch (e) {}
        setSearchHistory([]);
        if (currentUser) {
            updateUser({ searchHistory: [] }).catch(() => {});
        }
    };

    // Clicking a recent search pill
    const handleSelectHistory = (term: string) => {
        handleQueryChange(term);
        saveToHistory(term);
    };

    // Sync state if URL query param changes
    useEffect(() => {
        const q = searchParams.get('q');
        if (q !== null && q !== searchQuery) {
            setSearchQuery(q);
        }
    }, [searchParams]);

    const handleQueryChange = (val: string) => {
        setSearchQuery(val);
        if (val.trim()) {
            setSearchParams({ q: val }, { replace: true });
        } else {
            setSearchParams({}, { replace: true });
        }
    };

    // Save to history automatically after user pauses typing (1.2s delay)
    useEffect(() => {
        if (!searchQuery.trim() || searchQuery.trim().length < 2 || !isHistoryEnabled) return;
        const timer = setTimeout(() => {
            saveToHistory(searchQuery);
        }, 1200);
        return () => clearTimeout(timer);
    }, [searchQuery, isHistoryEnabled]);

    // Focus input on mount
    useEffect(() => {
        const input = document.getElementById('search-input');
        if (input) input.focus();
    }, []);

    // Debounce Query & Fetch from TMDB
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (!searchQuery.trim()) {
                setResults([]);
                setMatchingSections([]);
                setIsSearching(false);
                return;
            }

            const lowerQuery = searchQuery.toLowerCase();
            setIsSearching(true);

            try {
                // 1. Hidden Doorway Logic
                if (settings?.globalExclusiveCode && lowerQuery === settings.globalExclusiveCode.toLowerCase()) {
                    unlockContent(settings.globalExclusiveCode).then(result => {
                        if (result.success) {
                            navigate('/exclusive');
                        }
                    });
                }

                // 2. Filter Sections Locally (Strictly keep only Marvel Cinematic Universe; remove Marvel Series & Sagas)
                const filteredSections = sections.filter(s => {
                    if (!s.enabled || !s.title) return false;
                    const titleLower = s.title.toLowerCase();
                    // Remove Marvel Saga / Series
                    if (titleLower.includes('marvel') && (titleLower.includes('saga') || titleLower.includes('series'))) {
                        return false;
                    }
                    return titleLower.includes(lowerQuery) || (s.tagFilter && s.tagFilter.toLowerCase().includes(lowerQuery));
                });

                // Guarantee only one canonical Marvel rail appears
                let seenMarvel = false;
                const finalMatchingSections: Section[] = [];
                for (const s of filteredSections) {
                    const isMarvel = s.title?.toLowerCase().includes('marvel') || s.tagFilter?.toLowerCase() === 'marvel';
                    if (isMarvel) {
                        if (!seenMarvel) {
                            seenMarvel = true;
                            finalMatchingSections.push({
                                ...s,
                                title: 'Marvel Cinematic Universe',
                                showRanking: true
                            });
                        }
                    } else {
                        finalMatchingSections.push(s);
                    }
                }
                setMatchingSections(finalMatchingSections);

                // 3. Search Locally (Database Fallback)
                const localResults: Partial<Content>[] = (content || []).filter(c =>
                    (c.title && c.title.toLowerCase().includes(lowerQuery)) ||
                    (c.overview && c.overview.toLowerCase().includes(lowerQuery))
                );

                // 4. Search TMDB
                let tmdbResults = [];
                try {
                    tmdbResults = await searchTMDBMulti(searchQuery);
                } catch (e) {
                    console.warn("TMDB Search failed, using local results only", e);
                }

                // 5. Map TMDB results with rich metadata ready for immediate details display
                const mappedTMDB: Partial<Content>[] = tmdbResults.map(r => {
                    const releaseDate = r.release_date || r.first_air_date || '';
                    const year = releaseDate ? parseInt(releaseDate.split('-')[0]) : 0;
                    const effectiveType: 'movie' | 'tv' = r.media_type === 'tv' ? 'tv' : 'movie';
                    return {
                        id: `tmdb_${r.id}`,
                        tmdbId: r.id,
                        title: r.title || r.name || '',
                        type: effectiveType,
                        poster_path: r.poster_path ? tmdbPosterUrl(r.poster_path) : '',
                        backdrop_path: r.backdrop_path ? tmdbBackdropUrl(r.backdrop_path) : '',
                        release_date: releaseDate,
                        year: year,
                        vote_average: r.vote_average || 0,
                        rating: r.vote_average || 0,
                        overview: r.overview || '',
                        description: r.overview || '',
                        genres: mapTMDBGenres(r.genre_ids || []),
                        allowPlayback: true,
                        isPublished: true
                    };
                });

                // 6. Merge and Deduplicate Results
                // Combine local matches and TMDB matches
                const finalResults = [...mappedTMDB];
                localResults.forEach(lc => {
                    // Avoid duplicates if a local item is also in TMDB results
                    if (!finalResults.find(tr => tr.tmdbId === lc.tmdbId)) {
                        finalResults.unshift(lc); // Prioritize local library results
                    }
                });

                setResults(finalResults);
                setCurrentPage(1);

            } catch (error) {
                console.error("TMDB Search Error:", error);
            } finally {
                setIsSearching(false);
            }

        }, 300); // 300ms delay for snappy, responsive search

        return () => clearTimeout(timer);
    }, [searchQuery, sections, settings, unlockContent, content]);

    // Handle clicking a search result - Opens INSTANTLY, enriches asynchronously
    const handleResultClick = (item: Partial<Content>) => {
        if (searchQuery.trim()) {
            saveToHistory(searchQuery);
        }

        // 1. If already full Content in local library, open immediately
        const localMatch = content?.find(c => (item.tmdbId && c.tmdbId === item.tmdbId) || (item.id && c.id === item.id));
        if (localMatch) {
            onDetails(localMatch);
            return;
        }

        if (!item.tmdbId) {
            // Local section item
            onDetails(item as Content);
            return;
        }

        const immediateType: 'movie' | 'tv' = (item.type as 'movie' | 'tv') || 'movie';
        const streamId = String(item.tmdbId);
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
            rating: item.vote_average || 0,
            overview: item.overview || '',
            description: item.overview || '',
            genres: item.genres || [],
            videoUrl: buildEmbedUrl(streamId, immediateType, settings),
            allowPlayback: true,
            isPublished: true,
        };

        // OPEN DETAILS MODAL IMMEDIATELY (0ms wait time for user)
        onDetails(immediateContent);

        // Background enrichment: fetch full TMDB metadata (cast, trailer, IMDb ID for higher stream quality)
        (async () => {
            try {
                const detail = await fetchTMDBDetails(item.tmdbId!, immediateType);
                if (!detail) return;

                const imdbId = detail.external_ids?.imdb_id || (detail as any).imdb_id || '';
                const trailerKey = extractTMDBTrailer(detail);
                const resolvedType: 'movie' | 'tv' = (detail.name || detail.media_type === 'tv' || immediateType === 'tv') ? 'tv' : 'movie';
                const effectiveStreamId = imdbId || String(detail.id);
                const releaseDate = detail.release_date || detail.first_air_date || immediateContent.release_date;
                const finalYear = releaseDate ? parseInt(releaseDate.split('-')[0]) : immediateContent.year;

                const enrichedContent: Content = {
                    ...immediateContent,
                    id: `tmdb_${detail.id}`,
                    tmdbId: detail.id,
                    imdbId: imdbId || undefined,
                    title: detail.title || detail.name || immediateContent.title,
                    type: resolvedType,
                    videoUrl: buildEmbedUrl(effectiveStreamId, resolvedType, settings),
                    youtubeId: trailerKey || undefined,
                    trailerUrl: trailerKey ? `https://www.youtube.com/watch?v=${trailerKey}` : undefined,
                    poster_path: detail.poster_path ? tmdbPosterUrl(detail.poster_path) : immediateContent.poster_path,
                    backdrop_path: detail.backdrop_path ? tmdbBackdropUrl(detail.backdrop_path) : immediateContent.backdrop_path,
                    overview: detail.overview || immediateContent.overview,
                    description: detail.overview || immediateContent.description,
                    genres: mapTMDBGenres(detail.genres?.map((g: any) => g.id) || []),
                    cast: detail.credits?.cast?.slice(0, 10).map((c: any) => c.name) || [],
                    year: finalYear,
                    release_date: releaseDate,
                    vote_average: detail.vote_average || immediateContent.vote_average,
                    rating: detail.vote_average || immediateContent.rating,
                    totalSeasons: detail.number_of_seasons,
                    totalEpisodes: detail.number_of_episodes,
                };

                // Seamlessly update details view with enriched metadata
                onDetails(enrichedContent);

                // Background logging of contribution (only when quota is available)
                if (currentUser && !isQuotaExceeded) {
                    const addedByInfo = {
                        userId: currentUser.uid,
                        name: currentProfile?.name || currentUser.name || 'User',
                        email: currentUser.email || '',
                        addedAt: new Date().toISOString()
                    };
                    addDoc(collection(db, 'content_contributions'), {
                        contentId: enrichedContent.id,
                        tmdbId: detail.id,
                        imdbId: imdbId || '',
                        title: enrichedContent.title,
                        poster_path: enrichedContent.poster_path,
                        type: enrichedContent.type,
                        addedBy: addedByInfo,
                        addedAt: new Date().toISOString()
                    }).catch(() => { });
                }
            } catch (err) {
                console.warn("Background TMDB metadata enrichment error:", err);
            }
        })();
    };

    // Helper to resolve items for a section
    const getSectionItems = (section: Section) => {
        let autoItems: Content[] = [];

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
        } else if (section.type === 'tag' && section.tagFilter) {
            autoItems = content.filter(c => c.tags?.includes(section.tagFilter!) || c.genres?.includes(section.tagFilter!)).slice(0, 10);
        } else if (section.type === 'my_list') {
            if (currentProfile?.myList) {
                autoItems = content.filter(c => currentProfile.myList.includes(c.id));
            }
        }

        // Differentiate media type (never mix web series with movies)
        const titleLower = (section.title || '').toLowerCase();
        const isSeriesSection = section.type === 'new_tv' ||
            (section.scopes?.includes('tv') && !section.scopes?.includes('movie')) ||
            /\b(series|shows?|web series|tv)\b/i.test(titleLower);

        const isMovieSection = section.type === 'new_movies' ||
            (section.scopes?.includes('movie') && !section.scopes?.includes('tv')) ||
            /\b(movies?|cinema|blockbusters?)\b/i.test(titleLower);

        if (isSeriesSection) {
            autoItems = autoItems.filter(c => c.type === 'tv');
        } else if (isMovieSection) {
            autoItems = autoItems.filter(c => c.type === 'movie' || !c.type);
        }

        const manualItems = (section.contentIds || []).map(id => content.find(c => c.id === id)).filter(Boolean) as Content[];

        return [...manualItems, ...autoItems].filter((item, index, self) =>
            index === self.findIndex(t => t.id === item.id)
        );
    };

    return (
        <div className="pt-24 px-4 md:px-12 pb-12 min-h-screen relative">
            <div className="max-w-6xl mx-auto">
                <div className="relative mb-12">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="h-6 w-6 text-gray-400" />
                    </div>
                    <input
                        id="search-input"
                        type="text"
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck="false"
                        className="block w-full pl-14 pr-12 py-5 bg-[#141414] border border-white/10 rounded-2xl focus:ring-2 focus:ring-brand-red focus:border-transparent text-white placeholder-gray-500 text-xl font-medium transition-all shadow-xl"
                        placeholder="Search for movies, TV shows..."
                        value={searchQuery}
                        onChange={(e) => handleQueryChange(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && searchQuery.trim()) {
                                saveToHistory(searchQuery);
                            }
                        }}
                    />
                    {isSearching ? (
                        <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                            <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
                        </div>
                    ) : searchQuery ? (
                        <button
                            onClick={() => handleQueryChange('')}
                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-white transition"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    ) : null}
                </div>

                {searchQuery ? (
                    <div className="space-y-12">
                        {/* 1. Matching Sections (Rendered in mid-size, balanced and not too big) */}
                        {matchingSections.length > 0 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {matchingSections.map(section => {
                                    const items = getSectionItems(section);
                                    if (items.length === 0) return null;
                                    return (
                                        <div key={section.id} className="bg-zinc-900/60 rounded-2xl p-4 md:p-6 border border-white/10 backdrop-blur-sm shadow-xl">
                                            <div className="mb-2 text-xs md:text-sm text-gray-400 font-bold uppercase tracking-wider flex items-center justify-between">
                                                <span className="flex items-center gap-1.5">
                                                    <Sparkles size={14} className="text-brand-red" />
                                                    Matching Collection
                                                </span>
                                                <span className="text-xs font-medium text-gray-400 normal-case bg-white/5 px-2.5 py-0.5 rounded-full border border-white/5">
                                                    {items.length} titles
                                                </span>
                                            </div>
                                            <ContentRail
                                                title={section.title}
                                                items={items}
                                                onDetails={(item) => handleResultClick(item)}
                                                size="mid"
                                                showRanking={false}
                                            />
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        {/* 2. Content Grid */}
                        <div>
                            <h2 className="text-xl text-gray-400 mb-6 flex items-center gap-2">
                                {results.length > 0 ? (
                                    <>Found <span className="text-white font-bold">{results.length}</span> titles matching "<span className="text-white">{searchQuery}</span>"</>
                                ) : (
                                    matchingSections.length === 0 && !isSearching && <>Searching for "{searchQuery}"</>
                                )}
                            </h2>

                            {(() => {
                                const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
                                const visibleResults = results.slice(startIndex, startIndex + ITEMS_PER_PAGE);
                                const totalPages = Math.ceil(results.length / ITEMS_PER_PAGE);

                                return (
                                    <>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9 gap-4">
                                            {visibleResults.map((item, idx) => (
                                                <div key={item.id || idx} onClick={() => handleResultClick(item)} className="cursor-pointer transition-transform hover:scale-105 relative aspect-[2/3] group rounded-xl overflow-hidden bg-gray-900 border border-white/5 shadow-lg hover:shadow-brand-red/20 hover:border-brand-red/50">
                                                    <img
                                                        src={item.poster_path || '/logo.png'}
                                                        className={`w-full h-full ${item.poster_path ? 'object-cover' : 'object-contain p-4 bg-gray-900'} transition-transform duration-500 group-hover:scale-110`}
                                                        loading="lazy"
                                                        alt={item.title}
                                                        onError={(e) => {
                                                            const t = e.currentTarget;
                                                            if (!t.src.endsWith('/logo.png')) {
                                                                t.src = '/logo.png';
                                                                t.className = "w-full h-full object-contain p-4 bg-gray-900 transition-transform duration-500 group-hover:scale-110";
                                                            }
                                                        }}
                                                    />
                                                    <div className="absolute inset-0 flex flex-col justify-end p-3 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                        <p className="text-white text-sm font-bold leading-tight drop-shadow-md">{item.title}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-[10px] text-white bg-brand-red px-1.5 py-0.5 rounded uppercase font-bold">{item.type}</span>
                                                            <span className="text-[10px] text-gray-300 drop-shadow">{item.release_date?.split('-')[0]}</span>
                                                        </div>
                                                    </div>
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
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-12 animate-in fade-in duration-300">
                        {/* 1. Recent Searches / Last Search Section */}
                        {isHistoryEnabled ? (
                            searchHistory.length > 0 ? (
                                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 md:p-8 backdrop-blur-md shadow-2xl">
                                    <div className="flex items-center justify-between mb-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-brand-red/10 border border-brand-red/20 flex items-center justify-center text-brand-red">
                                                <History size={20} />
                                            </div>
                                            <div>
                                                <h3 className="text-lg md:text-xl font-black tracking-tight text-white flex items-center gap-2">
                                                    Recent Searches
                                                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/10 text-gray-300">
                                                        {searchHistory.length}
                                                    </span>
                                                </h3>
                                                <p className="text-xs text-gray-400">Your last searched keywords</p>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={handleClearAllHistory}
                                            className="text-xs text-gray-400 hover:text-red-400 font-bold px-3 py-1.5 rounded-xl bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                                            title="Clear all search history"
                                        >
                                            <Trash2 size={13} />
                                            <span>Clear all</span>
                                        </button>
                                    </div>

                                    {/* Chips / Pills List */}
                                    <div className="flex flex-wrap gap-2.5">
                                        {searchHistory.map((term, idx) => (
                                            <div
                                                key={idx}
                                                onClick={() => handleSelectHistory(term)}
                                                className="group flex items-center gap-2.5 px-4 py-2 bg-[#18181c] hover:bg-[#222228] border border-white/10 hover:border-brand-red/50 rounded-xl cursor-pointer transition-all duration-200 hover:scale-105 shadow-md hover:shadow-brand-red/20 text-sm font-medium text-gray-200 hover:text-white"
                                            >
                                                <Clock size={14} className="text-gray-500 group-hover:text-brand-red transition-colors flex-shrink-0" />
                                                <span className="truncate max-w-[180px] md:max-w-[260px]">{term}</span>
                                                <button
                                                    type="button"
                                                    onClick={(e) => handleDeleteHistoryItem(term, e)}
                                                    className="p-1 rounded-md text-gray-500 hover:text-red-400 hover:bg-white/10 transition-colors cursor-pointer"
                                                    title={`Delete "${term}"`}
                                                >
                                                    <X size={13} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : null
                        ) : (
                            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 md:p-5 flex items-center justify-between text-xs text-gray-400">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-gray-500">
                                        <History size={16} />
                                    </div>
                                    <div>
                                        <span className="font-semibold text-gray-300">Search history is paused</span>
                                        <p className="text-[11px] text-gray-500">Your searches are not currently being saved or shown.</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => navigate('/account')}
                                    className="text-brand-red hover:underline font-bold px-3 py-1.5 rounded-lg bg-brand-red/10 border border-brand-red/20 text-xs cursor-pointer"
                                >
                                    Enable in Account
                                </button>
                            </div>
                        )}

                        {/* 2. Empty Search Placeholder when no history */}
                        {(!isHistoryEnabled || searchHistory.length === 0) && (
                            <div className="text-center py-20 opacity-50">
                                <Search className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                                <p className="text-gray-400 text-xl font-bold">Search the movie or TV show</p>
                                <p className="text-gray-600 text-sm mt-1">Find any title to instantly add it to your collection or stream</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SearchPage;
