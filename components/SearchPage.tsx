import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Loader2 } from 'lucide-react';
import { Content, Section } from '../types';
import { useStore } from '../context/StoreContext';
import { collection, query, where, getDocs, addDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { searchTMDBMulti, fetchTMDBDetails, tmdbPosterUrl, tmdbBackdropUrl, mapTMDBGenres, extractTMDBTrailer } from '../services/tmdbService';
import ContentRail from './ContentRail';
import Pagination from './Pagination';

interface SearchPageProps {
    onDetails: (item: Content) => void;
}

const ITEMS_PER_PAGE = 24;

const SearchPage: React.FC<SearchPageProps> = ({ onDetails }) => {
    const { content, sections, currentProfile, unlockContent, settings, currentUser, publishCatalog } = useStore();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState<Partial<Content>[]>([]);
    const [matchingSections, setMatchingSections] = useState<Section[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [isSearching, setIsSearching] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

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

                // 2. Filter Sections Locally
                const filteredSections = sections.filter(s =>
                    s.enabled && s.title && s.title.toLowerCase().includes(lowerQuery)
                );
                setMatchingSections(filteredSections);

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

                // 5. Map TMDB results
                const mappedTMDB: Partial<Content>[] = tmdbResults.map(r => ({
                    id: `tmdb_${r.id}`, // temporary ID
                    tmdbId: r.id,
                    title: r.title || r.name || '',
                    type: r.media_type === 'tv' ? 'tv' : 'movie',
                    poster_path: r.poster_path ? tmdbPosterUrl(r.poster_path) : '',
                    release_date: r.release_date || r.first_air_date || '',
                    vote_average: r.vote_average || 0,
                    overview: r.overview
                }));

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

        }, 500); // 500ms delay to prevent excessive API calls

        return () => clearTimeout(timer);
    }, [searchQuery, sections, settings, unlockContent, content]);

    // Handle clicking a search result
    const handleResultClick = async (item: Partial<Content>) => {
        if (!item.tmdbId) {
            // It's a local section item (already full Content)
            onDetails(item as Content);
            return;
        }

        setIsSaving(true);
        try {
            // 1. Fetch full TMDB details (includes external_ids for IMDb ID)
            const detail = await fetchTMDBDetails(item.tmdbId, item.type as 'movie' | 'tv');

            // 2. Set stream source URL with IMDb ID
            const imdbId = detail.external_ids?.imdb_id || (detail as any).imdb_id || '';
            const isMovie = !detail.name;
            let videoUrl = (isMovie && imdbId) ? `https://proxy.garageband.rocks/embed/movie/${imdbId}` : '';

            // 3. Construct base Content object from fresh metadata
            const addedByInfo = currentUser ? {
                userId: currentUser.uid,
                name: currentProfile?.name || currentUser.name || 'User',
                email: currentUser.email || '',
                addedAt: new Date().toISOString()
            } : null;

            // Extract Year safely
            const releaseDate = detail.release_date || detail.first_air_date || '';
            const year = releaseDate ? parseInt(releaseDate.split('-')[0]) : 0;

            const newMetadata: Omit<Content, 'id'> = {
                tmdbId: detail.id,
                imdbId: imdbId || '',
                title: detail.title || detail.name || '',
                type: detail.title ? 'movie' : 'tv',
                videoUrl: videoUrl,
                youtubeId: extractTMDBTrailer(detail) || '', // Trailer key
                poster_path: detail.poster_path ? tmdbPosterUrl(detail.poster_path) : '',
                backdrop_path: detail.backdrop_path ? tmdbBackdropUrl(detail.backdrop_path) : '',
                overview: detail.overview || '',
                genres: mapTMDBGenres(detail.genres?.map((g: any) => g.id) || []),
                cast: detail.credits?.cast?.slice(0, 10).map((c: any) => c.name) || [], // Top 10 cast
                release_date: releaseDate,
                year: year,
                vote_average: detail.vote_average || 0,
                allowPlayback: true,
                isPublished: true,
                createdAt: new Date().toISOString(),
                ...(addedByInfo && { addedBy: addedByInfo })
            };

            // 4. Check if it already exists in Firebase to handle "No Duplicates" and "Replace All"
            const q = query(collection(db, 'content'), where('tmdbId', '==', item.tmdbId));
            const querySnapshot = await getDocs(q);
            
            let savedContent: Content;

            if (!querySnapshot.empty) {
                // ALREADY EXISTS
                const existingDoc = querySnapshot.docs[0];
                const existingData = existingDoc.data() as Content;
                
                // Only admins can update existing metadata to prevent permission errors
                if (currentUser?.role === 'admin') {
                    const updatedData = {
                        ...existingData,
                        ...newMetadata,
                        // Preserve state fields
                        featured: existingData.featured || false,
                        isOriginal: existingData.isOriginal || false,
                        views: existingData.views || 0,
                        likes: existingData.likes || 0,
                        createdAt: existingData.createdAt || newMetadata.createdAt,
                        updatedAt: new Date().toISOString()
                    };
                    await setDoc(doc(db, 'content', existingDoc.id), updatedData);
                    savedContent = { id: existingDoc.id, ...updatedData } as Content;
                    await publishCatalog();
                } else {
                    // Non-admins just use the existing content
                    savedContent = { id: existingDoc.id, ...existingData } as Content;
                }
            } else {
                // ADD NEW (Allowed by rules for everyone currently)
                const docRef = await addDoc(collection(db, 'content'), newMetadata);
                savedContent = { id: docRef.id, ...newMetadata } as Content;
                await publishCatalog();
            }

            // 5. Log to content_contributions for tracking
            if (addedByInfo) {
                addDoc(collection(db, 'content_contributions'), {
                    contentId: savedContent.id,
                    tmdbId: detail.id,
                    imdbId: imdbId || '',
                    title: savedContent.title,
                    poster_path: savedContent.poster_path,
                    type: savedContent.type,
                    addedBy: addedByInfo,
                    addedAt: new Date().toISOString()
                }).catch(e => console.error('Contribution log failed:', e));
            }

            // 6. Call onDetails to open the player/details view
            onDetails(savedContent);

        } catch (error) {
            console.error("Error processing selection:", error);
            alert("Failed to load title details. Please try again.");
        } finally {
            setIsSaving(false);
        }
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

        const manualItems = (section.contentIds || []).map(id => content.find(c => c.id === id)).filter(Boolean) as Content[];

        return [...manualItems, ...autoItems].filter((item, index, self) =>
            index === self.findIndex(t => t.id === item.id)
        );
    };

    return (
        <div className="pt-24 px-4 md:px-12 pb-12 min-h-screen relative">

            {/* Loading Overlay when Saving to DB */}
            {isSaving && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="flex flex-col items-center">
                        <Loader2 className="h-12 w-12 text-brand-red animate-spin mb-4" />
                        <p className="text-white font-bold text-lg">Loading Title...</p>
                    </div>
                </div>
            )}

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
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {isSearching ? (
                        <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                            <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
                        </div>
                    ) : searchQuery ? (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-white transition"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    ) : null}
                </div>

                {searchQuery ? (
                    <div className="space-y-12">
                        {/* 1. Matching Sections */}
                        {matchingSections.length > 0 && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {matchingSections.map(section => {
                                    const items = getSectionItems(section);
                                    if (items.length === 0) return null;
                                    return (
                                        <div key={section.id} className="bg-white/5 rounded-2xl p-6 border border-white/5">
                                            <div className="mb-2 text-sm text-gray-400 font-bold uppercase tracking-wider">Matching Collection</div>
                                            <ContentRail
                                                title={section.title}
                                                items={items}
                                                onDetails={(item) => handleResultClick(item)}
                                                showRanking={section.showRanking}
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
                                    matchingSections.length === 0 && !isSearching && <>No results found for "{searchQuery}"</>
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
                                                    {item.poster_path ? (
                                                        <img
                                                            src={item.poster_path}
                                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                            loading="lazy"
                                                            alt={item.title}
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-500">
                                                            No Image
                                                        </div>
                                                    )}
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
                    <div className="text-center py-32 opacity-50">
                        <Search className="h-20 w-20 text-gray-600 mx-auto mb-6" />
                        <p className="text-gray-400 text-2xl font-medium">Search the movie</p>
                        <p className="text-gray-600 mt-2">Find any movie or TV show to instantly add it to your collection</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SearchPage;
