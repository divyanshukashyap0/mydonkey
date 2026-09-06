import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { 
    Play, 
    Info, 
    Search, 
    SlidersHorizontal, 
    Star, 
    Loader2,
    LayoutGrid,
    Tag,
    Globe,
    Check,
    ChevronRight,
    ChevronLeft,
    TrendingUp,
    Plus,
    Film,
    Tv
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { Content } from '../types';
import Pagination from './Pagination';
import { 
    fetchTMDBDiscoverByCategory, 
    fetchTMDBDetails, 
    tmdbPosterUrl, 
    tmdbBackdropUrl, 
    mapTMDBGenres, 
    extractTMDBTrailer,
    searchTMDBMulti,
    INDIAN_LANGUAGES
} from '../services/tmdbService';
import { buildEmbedUrl } from '../utils/embedUrl';

interface CategoriesPageProps {
    onDetails: (item: Content) => void;
    onPlay: (item: Content, mode?: 'trailer' | 'movie') => void;
}

export interface CategoryInfo {
    id: string;
    name: string;
    emoji: string;
    gradient: string;
    description: string;
    aliases: string[];
}

export interface SubcategoryOption {
    id: string;
    label: string;
    industry: string;
    emoji: string;
}

export const ALL_CATEGORY: CategoryInfo = {
    id: 'All',
    name: 'All Genres',
    emoji: '💥',
    gradient: 'from-red-600 to-amber-600',
    description: 'Explore all movies and series across every genre',
    aliases: ['all', 'all genres', 'featured', 'everything']
};

export const CATEGORIES_LIST: CategoryInfo[] = [
    { id: 'Action', name: 'Action', emoji: '💥', gradient: 'from-red-600 to-amber-600', description: 'Explosions, intense combat & high stakes', aliases: ['action', 'action & adventure'] },
    { id: 'Adventure', name: 'Adventure', emoji: '🧭', gradient: 'from-emerald-600 to-teal-600', description: 'Epic expeditions, discoveries & quests', aliases: ['adventure', 'adventures'] },
    { id: 'Animation', name: 'Animation', emoji: '🎨', gradient: 'from-yellow-500 to-orange-500', description: 'Creative worlds & animated masterworks', aliases: ['animation', 'animated', 'anime'] },
    { id: 'Biography', name: 'Biography', emoji: '📜', gradient: 'from-amber-700 to-orange-900', description: 'Real lives, legends & historic figures', aliases: ['biography', 'biopic', 'bio'] },
    { id: 'Comedy', name: 'Comedy', emoji: '😂', gradient: 'from-amber-400 to-yellow-500', description: 'Laughs, clever satire & feel-good humor', aliases: ['comedy', 'comedies', 'romantic comedy'] },
    { id: 'Crime', name: 'Crime', emoji: '💼', gradient: 'from-zinc-700 to-red-950', description: 'Underworld, masterminds, detectives & heists', aliases: ['crime', 'gangster', 'mafia'] },
    { id: 'Documentary', name: 'Documentary', emoji: '🎥', gradient: 'from-blue-600 to-cyan-600', description: 'Real world revelations, wildlife & science', aliases: ['documentary', 'docu', 'docuseries'] },
    { id: 'Drama', name: 'Drama', emoji: '🎭', gradient: 'from-purple-700 to-indigo-900', description: 'Powerful emotions, relationships & conflicts', aliases: ['drama', 'period drama'] },
    { id: 'Family', name: 'Family', emoji: '👨‍👩‍👧', gradient: 'from-teal-500 to-emerald-600', description: 'Heartwarming stories for audiences of all ages', aliases: ['family', 'kids', 'children'] },
    { id: 'Fantasy', name: 'Fantasy', emoji: '🧙', gradient: 'from-indigo-600 to-purple-600', description: 'Magic, mythical realms & mythical beasts', aliases: ['fantasy', 'magic', 'supernatural'] },
    { id: 'History', name: 'History', emoji: '🏛️', gradient: 'from-amber-800 to-yellow-950', description: 'Historic battles, eras & true turning points', aliases: ['history', 'historical', 'period'] },
    { id: 'Horror', name: 'Horror', emoji: '👻', gradient: 'from-neutral-900 to-rose-950', description: 'Spooky hauntings, jump scares & thrill', aliases: ['horror', 'scary', 'spooky'] },
    { id: 'Mystery', name: 'Mystery', emoji: '🔍', gradient: 'from-violet-800 to-slate-900', description: 'Puzzles, hidden secrets & shocking twists', aliases: ['mystery', 'whodunit'] },
    { id: 'Romance', name: 'Romance', emoji: '❤️', gradient: 'from-rose-500 to-pink-600', description: 'Passionate tales of love, heart & destiny', aliases: ['romance', 'romantic'] },
    { id: 'Sci-Fi', name: 'Sci-Fi', emoji: '🚀', gradient: 'from-cyan-500 to-blue-600', description: 'Futuristic technology, space & alternate realms', aliases: ['sci-fi', 'science fiction', 'scifi'] },
    { id: 'Sport', name: 'Sport', emoji: '⚽', gradient: 'from-lime-600 to-emerald-700', description: 'Athletic rivalry, triumphs & championship matches', aliases: ['sport', 'sports', 'cricket', 'football'] },
    { id: 'Thriller', name: 'Thriller', emoji: '⚡', gradient: 'from-red-700 to-neutral-900', description: 'Edge-of-your-seat suspense & relentless tension', aliases: ['thriller', 'psychological thriller', 'suspense'] },
    { id: 'War', name: 'War', emoji: '⚔️', gradient: 'from-stone-800 to-red-900', description: 'Frontline courage, conflicts & combat', aliases: ['war', 'war & politics', 'military'] },
];

export const DISPLAY_CATEGORIES: CategoryInfo[] = [ALL_CATEGORY, ...CATEGORIES_LIST];

export const INDIAN_SUBCATEGORIES: SubcategoryOption[] = [
    { id: 'all', label: 'All Indian', industry: 'Pan-India', emoji: '🌐' },
    { id: 'hi', label: 'Hindi', industry: 'Bollywood', emoji: '🎬' },
    { id: 'te', label: 'Telugu', industry: 'Tollywood', emoji: '⚡' },
    { id: 'ta', label: 'Tamil', industry: 'Kollywood', emoji: '⚡' },
    { id: 'ml', label: 'Malayalam', industry: 'Mollywood', emoji: '🌊' },
    { id: 'kn', label: 'Kannada', industry: 'Sandalwood', emoji: '👑' },
    { id: 'pa', label: 'Punjabi', industry: 'Pollywood', emoji: '🌾' },
    { id: 'bn', label: 'Bengali', industry: 'Tollywood', emoji: '🎭' },
    { id: 'mr', label: 'Marathi', industry: 'Regional', emoji: '🏔️' },
];

export const GLOBAL_SUBCATEGORIES: SubcategoryOption[] = [
    { id: 'all', label: 'All Global', industry: 'Worldwide', emoji: '🌐' },
    { id: 'en', label: 'English', industry: 'Hollywood', emoji: '🗽' },
    { id: 'ko', label: 'Korean', industry: 'K-Drama', emoji: '🇰🇷' },
    { id: 'ja', label: 'Japanese', industry: 'Anime', emoji: '🎌' },
    { id: 'es', label: 'Spanish', industry: 'Latino', emoji: '🇪🇸' },
    { id: 'fr', label: 'French', industry: 'European', emoji: '🇫🇷' },
    { id: 'de', label: 'German', industry: 'European', emoji: '🇩🇪' },
    { id: 'it', label: 'Italian', industry: 'European', emoji: '🇮🇹' },
];

const CategoriesPage: React.FC<CategoriesPageProps> = ({ onDetails, onPlay }) => {
    const { content, currentProfile, toggleWatchlist, settings } = useStore();
    const [searchParams, setSearchParams] = useSearchParams();

    const location = useLocation();
    const isCategoriesRoute = location.pathname.startsWith('/categories') || location.pathname.startsWith('/category');

    // 1. Big Option: Region State ('indian' | 'global' | 'all')
    const regionParam = (searchParams.get('region') || 'indian').toLowerCase();
    const [region, setRegion] = useState<'indian' | 'global' | 'all'>(
        (regionParam === 'indian' || regionParam === 'global' || regionParam === 'all') ? regionParam : 'indian'
    );

    useEffect(() => {
        if (!isCategoriesRoute) return;
        if (regionParam === 'indian' || regionParam === 'global' || regionParam === 'all') {
            setRegion(regionParam);
        }
    }, [regionParam, isCategoriesRoute]);

    // 2. Subcategory: Language / Regional Industry State
    const subRegionParam = searchParams.get('subRegion') || 'hi';
    const [subRegion, setSubRegion] = useState<string>(subRegionParam);

    useEffect(() => {
        if (!isCategoriesRoute) return;
        setSubRegion(subRegionParam);
    }, [subRegionParam, isCategoriesRoute]);

    // 3. Genre Category State
    const genreParam = searchParams.get('genre') || searchParams.get('category') || 'All';
    const [selectedGenre, setSelectedGenre] = useState<string>(genreParam);

    useEffect(() => {
        if (!isCategoriesRoute) return;
        if (genreParam) {
            setSelectedGenre(genreParam);
        }
    }, [genreParam, isCategoriesRoute]);

    const activeCategory = useMemo(() => {
        if (!selectedGenre || selectedGenre.toLowerCase() === 'all') {
            return ALL_CATEGORY;
        }
        const found = CATEGORIES_LIST.find(
            c => c.id.toLowerCase() === selectedGenre.toLowerCase() ||
                 c.name.toLowerCase() === selectedGenre.toLowerCase() ||
                 c.aliases.includes(selectedGenre.toLowerCase())
        );
        return found || ALL_CATEGORY;
    }, [selectedGenre]);

    // Sub-filters State
    const [mediaType, setMediaType] = useState<'all' | 'movie' | 'tv'>('all');
    const [sortBy, setSortBy] = useState<'popular' | 'rating' | 'newest' | 'title'>('popular');
    const [searchFilter, setSearchFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [categoryLayout, setCategoryLayout] = useState<'grid' | 'wrap'>('grid');
    const [showAllLanguages, setShowAllLanguages] = useState(false);

    // Carousel state for Spotlight Hero
    const [spotlightIndex, setSpotlightIndex] = useState(0);

    // TMDB state
    const [tmdbItems, setTmdbItems] = useState<Partial<Content>[]>([]);
    const [totalPages, setTotalPages] = useState(1);
    const [isLoadingTMDB, setIsLoadingTMDB] = useState(true);
    const [loadingItemId, setLoadingItemId] = useState<string | null>(null);

    // Cache to avoid refetching detail for already resolved items
    const resolvedContentCache = useRef<Map<number, Content>>(new Map());

    // Active subcategories based on chosen big option
    const activeSubcategories = useMemo(() => {
        if (region === 'indian') return INDIAN_SUBCATEGORIES;
        if (region === 'global') return GLOBAL_SUBCATEGORIES;
        return [...INDIAN_SUBCATEGORIES.slice(0, 5), ...GLOBAL_SUBCATEGORIES.slice(1, 5)];
    }, [region]);

    const activeSubcategoryDef = useMemo(() => {
        return activeSubcategories.find(s => s.id === subRegion) || activeSubcategories[0];
    }, [activeSubcategories, subRegion]);

    // Handlers
    const handleSelectRegion = (newRegion: 'indian' | 'global' | 'all') => {
        setRegion(newRegion);
        const defaultSub = newRegion === 'indian' ? 'hi' : newRegion === 'global' ? 'en' : 'all';
        setSubRegion(defaultSub);
        setCurrentPage(1);
        setSpotlightIndex(0);
        setSearchParams({ 
            region: newRegion, 
            subRegion: defaultSub, 
            genre: activeCategory.id 
        });
    };

    const handleSelectSubRegion = (newSub: string) => {
        setSubRegion(newSub);
        setCurrentPage(1);
        setSpotlightIndex(0);
        setSearchParams({ 
            region, 
            subRegion: newSub, 
            genre: activeCategory.id 
        });
    };

    const handleSelectCategory = (catId: string) => {
        setSelectedGenre(catId);
        setSearchParams({ 
            region, 
            subRegion, 
            genre: catId 
        });
        setCurrentPage(1);
        setSpotlightIndex(0);
        setSearchFilter('');
    };

    // Helper: matches local content item against active category and region
    const matchesCategory = (item: Content, cat: CategoryInfo): boolean => {
        if (cat.id === 'All') return true;
        if (!item.genres || !Array.isArray(item.genres) || item.genres.length === 0) return false;
        const itemGenres = item.genres.map(g => g.toLowerCase().trim());
        const itemTags = (item.tags || []).map(t => t.toLowerCase().trim());
        const combined = [...itemGenres, ...itemTags];

        return cat.aliases.some(alias => combined.some(g => g.includes(alias) || alias.includes(g))) ||
               combined.some(g => g.includes(cat.id.toLowerCase()));
    };

    // Local items matching active filters
    const localMatchingItems = useMemo(() => {
        if (!content) return [];
        return content.filter(item => {
            if (item.isPublished === false || item.isExclusive || item.accessCode) return false;
            if (!matchesCategory(item, activeCategory)) return false;
            if (mediaType === 'movie' && item.type !== 'movie') return false;
            if (mediaType === 'tv' && item.type !== 'tv') return false;

            // Region & Language verification
            const lang = (item.language || '').toLowerCase();
            const tags = (item.tags || []).map(t => t.toLowerCase());
            const country = (item.country || '').toLowerCase();
            const isIndian = country === 'india' || 
                ['hindi', 'tamil', 'telugu', 'malayalam', 'kannada', 'punjabi', 'bengali'].some(l => lang.includes(l)) ||
                tags.some(t => ['bollywood', 'tollywood', 'kollywood', 'south', 'desi', 'indian'].includes(t));

            if (region === 'indian' && !isIndian) return false;
            if (region === 'global' && isIndian) return false;

            if (subRegion !== 'all') {
                const subDef = activeSubcategories.find(s => s.id === subRegion);
                if (subDef) {
                    const matchLang = lang.includes(subDef.label.toLowerCase()) || 
                        tags.some(t => t.includes(subDef.industry.toLowerCase()) || t.includes(subDef.label.toLowerCase()));
                    if (!matchLang) return false;
                }
            }

            if (searchFilter.trim()) {
                const q = searchFilter.toLowerCase().trim();
                const titleMatch = item.title?.toLowerCase().includes(q);
                const castMatch = item.cast?.some(c => c.toLowerCase().includes(q));
                if (!titleMatch && !castMatch) return false;
            }
            return true;
        });
    }, [content, activeCategory, mediaType, searchFilter, region, subRegion, activeSubcategories]);

    // Live TMDB Discovery
    useEffect(() => {
        if (!isCategoriesRoute) return;

        let isCancelled = false;
        setIsLoadingTMDB(true);

        const fetchContent = async () => {
            try {
                if (searchFilter.trim()) {
                    const searchRes = await searchTMDBMulti(searchFilter);
                    if (isCancelled) return;

                    const mapped = searchRes
                        .filter(r => {
                            if (mediaType === 'movie' && r.type !== 'movie') return false;
                            if (mediaType === 'tv' && r.type !== 'tv') return false;

                            const lang = r.original_language || '';
                            if (region === 'indian') {
                                if (subRegion !== 'all') {
                                    if (lang !== subRegion) return false;
                                } else {
                                    const isIndianLang = INDIAN_LANGUAGES.includes(lang) || 
                                        ((r as any).origin_country && (r as any).origin_country.includes('IN'));
                                    if (!isIndianLang) return false;
                                }
                            } else if (region === 'global') {
                                if (subRegion !== 'all') {
                                    if (lang !== subRegion) return false;
                                } else {
                                    if (INDIAN_LANGUAGES.includes(lang)) return false;
                                }
                            }
                            return true;
                        })
                        .map(r => {
                            const itemType = (r.media_type === 'tv' || r.type === 'tv' ? 'tv' : 'movie') as 'movie' | 'tv';
                            return {
                                id: `tmdb_${r.id}`,
                                tmdbId: r.id,
                                title: r.title || r.name || '',
                                type: itemType,
                                poster_path: r.poster_path ? tmdbPosterUrl(r.poster_path) : '',
                                backdrop_path: r.backdrop_path ? tmdbBackdropUrl(r.backdrop_path) : '',
                                release_date: r.release_date || r.first_air_date || '',
                                year: (r.release_date || r.first_air_date) ? parseInt((r.release_date || r.first_air_date)!.split('-')[0]) : undefined,
                                vote_average: r.vote_average || 0,
                                overview: r.overview || '',
                                genres: [activeCategory.name],
                                videoUrl: buildEmbedUrl(String(r.id), itemType, settings),
                                allowPlayback: true,
                                isPublished: true
                            };
                        });

                    setTmdbItems(mapped);
                    setTotalPages(Math.ceil(mapped.length / 24) || 1);
                } else {
                    const { results, totalPages: pages } = await fetchTMDBDiscoverByCategory({
                        category: activeCategory.id,
                        type: mediaType,
                        sortBy,
                        page: currentPage,
                        region,
                        subRegion
                    });

                    if (isCancelled) return;

                    const mapped = results.map(r => {
                        const itemType = (r.media_type === 'tv' ? 'tv' : 'movie') as 'movie' | 'tv';
                        return {
                            id: `tmdb_${r.id}`,
                            tmdbId: r.id,
                            title: r.title || r.name || '',
                            type: itemType,
                            poster_path: r.poster_path ? tmdbPosterUrl(r.poster_path) : '',
                            backdrop_path: r.backdrop_path ? tmdbBackdropUrl(r.backdrop_path) : '',
                            release_date: r.release_date || r.first_air_date || '',
                            year: (r.release_date || r.first_air_date) ? parseInt((r.release_date || r.first_air_date)!.split('-')[0]) : undefined,
                            vote_average: r.vote_average || 0,
                            overview: r.overview || '',
                            genres: [activeCategory.name],
                            videoUrl: buildEmbedUrl(String(r.id), itemType, settings),
                            allowPlayback: true,
                            isPublished: true
                        };
                    });

                    setTmdbItems(mapped);
                    setTotalPages(pages);
                }
            } catch (err) {
                console.error("TMDB category fetch error:", err);
            } finally {
                if (!isCancelled) {
                    setIsLoadingTMDB(false);
                }
            }
        };

        const timer = setTimeout(fetchContent, searchFilter ? 400 : 0);

        return () => {
            isCancelled = true;
            clearTimeout(timer);
        };
    }, [activeCategory.id, mediaType, sortBy, currentPage, searchFilter, region, subRegion, isCategoriesRoute]);

    // Merge Local Library matches with TMDB items
    const combinedContent = useMemo(() => {
        const merged: Partial<Content>[] = [];
        const seenTmdbIds = new Set<number>();

        if (currentPage === 1) {
            localMatchingItems.forEach(item => {
                merged.push(item);
                if (item.tmdbId) seenTmdbIds.add(item.tmdbId);
            });
        }

        tmdbItems.forEach(item => {
            if (!item.tmdbId || !seenTmdbIds.has(item.tmdbId)) {
                merged.push(item);
            }
        });

        return merged;
    }, [localMatchingItems, tmdbItems, currentPage]);

    // Spotlight items for carousel (top 5 titles)
    const spotlightItems = useMemo(() => {
        if (combinedContent.length === 0) return [];
        const candidates = combinedContent.filter(c => c.backdrop_path);
        return (candidates.length > 0 ? candidates : combinedContent).slice(0, 5);
    }, [combinedContent]);

    const currentSpotlight = spotlightItems[spotlightIndex] || spotlightItems[0] || null;

    // Resolve complete Content item for detail view & playback
    const resolveContentItem = async (partialItem: Partial<Content>): Promise<Content> => {
        if (partialItem.id && !partialItem.id.startsWith('tmdb_')) {
            const foundLocal = content?.find(c => c.id === partialItem.id);
            if (foundLocal) return foundLocal;
        }

        const tmdbId = partialItem.tmdbId;
        if (!tmdbId) return partialItem as Content;

        if (resolvedContentCache.current.has(tmdbId)) {
            return resolvedContentCache.current.get(tmdbId)!;
        }

        try {
            const requestedType = (partialItem.type === 'tv') ? 'tv' : 'movie';
            let detail: any = null;
            try {
                detail = await fetchTMDBDetails(tmdbId, requestedType);
            } catch (_) {
                // If requested type failed, try the alternate type
                detail = await fetchTMDBDetails(tmdbId, requestedType === 'tv' ? 'movie' : 'tv');
            }

            const trailerKey = extractTMDBTrailer(detail);
            const imdbId = detail.external_ids?.imdb_id || (detail as any).imdb_id || '';
            const finalType: 'movie' | 'tv' = (detail.name || detail.media_type === 'tv' || requestedType === 'tv') ? 'tv' : 'movie';
            const streamId = imdbId || String(detail.id);
            const videoUrl = buildEmbedUrl(streamId, finalType, settings);

            const resolved: Content = {
                id: `tmdb_${detail.id}`,
                title: detail.title || detail.name || partialItem.title || 'Untitled',
                type: finalType,
                imdbId: imdbId || undefined,
                genres: mapTMDBGenres(detail.genres?.map((g: any) => g.id) || []),
                poster_path: detail.poster_path ? tmdbPosterUrl(detail.poster_path) : (partialItem.poster_path || ''),
                backdrop_path: detail.backdrop_path ? tmdbBackdropUrl(detail.backdrop_path) : (partialItem.backdrop_path || ''),
                description: detail.overview || partialItem.overview || '',
                overview: detail.overview || partialItem.overview || '',
                release_date: detail.release_date || detail.first_air_date || partialItem.release_date || '',
                year: (detail.release_date || detail.first_air_date) 
                    ? parseInt((detail.release_date || detail.first_air_date)!.split('-')[0]) 
                    : (partialItem.year || new Date().getFullYear()),
                rating: detail.vote_average || partialItem.vote_average || 0,
                vote_average: detail.vote_average || partialItem.vote_average || 0,
                duration: detail.runtime ? `${detail.runtime}m` : undefined,
                cast: detail.credits?.cast?.slice(0, 8).map((c: any) => c.name) || [],
                director: detail.credits?.crew?.find((c: any) => c.job === 'Director')?.name || 'Unknown',
                trailerUrl: trailerKey ? `https://www.youtube.com/watch?v=${trailerKey}` : undefined,
                youtubeId: trailerKey || undefined,
                videoUrl: videoUrl,
                tmdbId: detail.id,
                totalSeasons: detail.number_of_seasons,
                totalEpisodes: detail.number_of_episodes,
                isPublished: true,
                allowPlayback: true,
                trending: false,
                isPopular: true
            };

            resolvedContentCache.current.set(tmdbId, resolved);
            return resolved;
        } catch (err) {
            console.error("Failed to fetch full TMDB details:", err);
            const effectiveType = partialItem.type || 'movie';
            const streamId = String(partialItem.tmdbId || '');
            return {
                id: `tmdb_${partialItem.tmdbId}`,
                title: partialItem.title || 'Untitled',
                type: effectiveType,
                genres: partialItem.genres || [activeCategory.name],
                poster_path: partialItem.poster_path || '',
                backdrop_path: partialItem.backdrop_path || '',
                description: partialItem.overview || '',
                overview: partialItem.overview || '',
                release_date: partialItem.release_date || '',
                year: partialItem.year || new Date().getFullYear(),
                rating: partialItem.vote_average || 0,
                vote_average: partialItem.vote_average || 0,
                videoUrl: streamId ? buildEmbedUrl(streamId, effectiveType, settings) : '',
                tmdbId: partialItem.tmdbId,
                isPublished: true,
                allowPlayback: true
            } as Content;
        }
    };

    const handleCardClick = async (partialItem: Partial<Content>) => {
        setLoadingItemId(partialItem.id || `tmdb_${partialItem.tmdbId}`);
        try {
            const fullContent = await resolveContentItem(partialItem);
            onDetails(fullContent);
        } catch (e) {
            console.error("Failed to open item details:", e);
            onDetails(partialItem as Content);
        } finally {
            setLoadingItemId(null);
        }
    };

    const handlePlayClick = async (partialItem: Partial<Content>) => {
        setLoadingItemId(partialItem.id || `tmdb_${partialItem.tmdbId}`);
        try {
            const fullContent = await resolveContentItem(partialItem);
            onPlay(fullContent, 'movie');
        } catch (e) {
            console.error("Failed to prepare playback for item:", e);
            onPlay(partialItem as Content, 'movie');
        } finally {
            setLoadingItemId(null);
        }
    };

    const isCurrentInWatchlist = useMemo(() => {
        if (!currentSpotlight) return false;
        const itemId = currentSpotlight.id || `tmdb_${currentSpotlight.tmdbId}`;
        return currentProfile?.myList?.includes(itemId) || false;
    }, [currentSpotlight, currentProfile?.myList]);

    const handleToggleWatchlist = async () => {
        if (!currentSpotlight) return;
        const full = await resolveContentItem(currentSpotlight);
        toggleWatchlist(full.id);
    };

    return (
        <div className="relative min-h-screen bg-[#0e0e11] text-white pt-16 pb-16 md:pt-20 md:pb-20 selection:bg-brand-red selection:text-white">
            
            {/* Top Poster Collage Backdrop Overlay */}
            <div className="absolute top-0 left-0 right-0 h-64 md:h-80 overflow-hidden pointer-events-none z-0 select-none opacity-20">
                <div className="flex gap-3 justify-center scale-105 blur-[0.5px]">
                    {combinedContent.slice(0, 14).map((c, i) => (
                        <img 
                            key={i} 
                            src={c.poster_path || '/logo.png'} 
                            alt="" 
                            className="w-24 md:w-36 h-48 md:h-56 object-cover rounded-md shrink-0 filter brightness-90 contrast-110" 
                        />
                    ))}
                </div>
                <div className="absolute inset-0 bg-gradient-to-b from-[#0e0e11]/40 via-[#0e0e11]/85 to-[#0e0e11]" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-3.5 sm:px-6 md:px-8">
                
                {/* 1. Header Title Section (Tight, not oversized) */}
                <div className="mb-4 md:mb-5">
                    <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-white">
                        Browse Categories
                    </h1>
                    <p className="text-xs md:text-sm text-gray-400 mt-1 max-w-2xl leading-relaxed">
                        Explore Indian regional cinema and global blockbusters with complete TMDB streaming integration.
                    </p>
                </div>

                {/* 2. Top Region Pill Switcher ([Indian] [Global] [All]) */}
                <div className="bg-[#18181c] p-1 rounded-full border border-white/10 flex items-center justify-between max-w-md mb-4 shadow-lg">
                    <button
                        onClick={() => handleSelectRegion('indian')}
                        className={`flex-1 py-1.5 md:py-2 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 transition-all duration-200 ${
                            region === 'indian'
                                ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-md'
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        <span>🇮🇳</span>
                        <span>Indian</span>
                    </button>
                    <button
                        onClick={() => handleSelectRegion('global')}
                        className={`flex-1 py-1.5 md:py-2 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 transition-all duration-200 ${
                            region === 'global'
                                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        <span>🌍</span>
                        <span>Global</span>
                    </button>
                    <button
                        onClick={() => handleSelectRegion('all')}
                        className={`flex-1 py-1.5 md:py-2 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 transition-all duration-200 ${
                            region === 'all'
                                ? 'bg-gradient-to-r from-brand-red to-amber-600 text-white shadow-md'
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        <span>✨</span>
                        <span>All</span>
                    </button>
                </div>

                {/* 3. BIG OPTIONS: Side-by-side or touch swipe cards */}
                <div className="mb-5 md:mb-6">
                    <div className="flex overflow-x-auto gap-3 pb-1 no-scrollbar snap-x snap-mandatory md:grid md:grid-cols-2 md:gap-4 md:overflow-visible">
                        
                        {/* Indian Content Card */}
                        <div
                            onClick={() => handleSelectRegion('indian')}
                            className={`group relative overflow-hidden rounded-2xl p-4 sm:p-5 md:p-6 cursor-pointer transition-all duration-200 border select-none w-[86vw] max-w-[340px] xs:w-[320px] shrink-0 snap-start md:w-auto md:max-w-none ${
                                region === 'indian'
                                    ? 'bg-gradient-to-br from-[#261306] via-[#1a0c03] to-[#0f0702] border-amber-500/70 ring-1 ring-amber-500/40 shadow-[0_0_25px_rgba(245,158,11,0.2)]'
                                    : 'bg-gradient-to-br from-[#18120c]/60 to-[#0e0e11] border-white/10 hover:border-amber-500/30'
                            }`}
                        >
                            {/* Taj Mahal Silhouette Illustration */}
                            <div className="absolute top-2 right-2 pointer-events-none z-0">
                                <svg viewBox="0 0 200 160" className="w-32 sm:w-40 h-28 opacity-30 group-hover:opacity-45 transition-opacity" fill="none">
                                    <defs>
                                        <radialGradient id="tajGlowSm" cx="50%" cy="50%" r="50%">
                                            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
                                            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                                        </radialGradient>
                                        <linearGradient id="tajAmberSm" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.9" />
                                            <stop offset="50%" stopColor="#d97706" stopOpacity="0.6" />
                                            <stop offset="100%" stopColor="#78350f" stopOpacity="0.3" />
                                        </linearGradient>
                                    </defs>
                                    <circle cx="100" cy="80" r="70" fill="url(#tajGlowSm)" />
                                    <rect x="15" y="140" width="170" height="8" rx="2" fill="url(#tajAmberSm)" />
                                    <rect x="25" y="132" width="150" height="8" rx="1" fill="url(#tajAmberSm)" />
                                    <path d="M 22 132 L 25 35 L 29 35 L 32 132 Z" fill="url(#tajAmberSm)" />
                                    <path d="M 168 132 L 171 35 L 175 35 L 178 132 Z" fill="url(#tajAmberSm)" />
                                    <rect x="58" y="80" width="84" height="52" rx="2" fill="url(#tajAmberSm)" />
                                    <path d="M 82 132 L 82 92 Q 100 80 118 92 L 118 132 Z" fill="#1e130c" stroke="url(#tajAmberSm)" strokeWidth="2" />
                                    <path d="M 78 65 C 76 45, 88 28, 100 24 C 112 28, 124 45, 122 65 Z" fill="url(#tajAmberSm)" />
                                    <line x1="100" y1="8" x2="100" y2="24" stroke="#fde68a" strokeWidth="2" />
                                </svg>
                            </div>

                            {/* Content */}
                            <div className="relative z-10 max-w-[78%]">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 mb-1.5">
                                    <Star size={10} className="fill-amber-400 text-amber-400" />
                                    <span>DESI & REGIONAL CINEMA</span>
                                </span>

                                <h2 className="text-lg md:text-2xl font-black text-white tracking-tight">
                                    Indian Content
                                </h2>
                                <p className="text-[11px] md:text-xs text-gray-300 mt-1 line-clamp-2 leading-relaxed">
                                    Blockbusters, web series, and regional powerhouses across Bollywood, South Indian cinema, Punjabi, and Bengali productions.
                                </p>

                                <div className="flex flex-wrap gap-1 pt-2">
                                    {['Bollywood', 'Kollywood', 'Punjabi'].map(tag => (
                                        <span key={tag} className="text-[10px] font-medium px-2 py-0.5 rounded bg-black/50 border border-white/10 text-gray-300">
                                            {tag}
                                        </span>
                                    ))}
                                    <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-black/50 border border-white/10 text-gray-400">
                                        +3
                                    </span>
                                </div>
                            </div>

                            {/* Arrow Button */}
                            <div className="absolute top-3.5 right-3.5 z-20">
                                <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center transition ${
                                    region === 'indian' 
                                        ? 'bg-amber-500/25 text-amber-300 border border-amber-400/40' 
                                        : 'bg-white/5 text-gray-400 border border-white/10'
                                }`}>
                                    <ChevronRight size={15} />
                                </div>
                            </div>
                        </div>

                        {/* Global Content Card */}
                        <div
                            onClick={() => handleSelectRegion('global')}
                            className={`group relative overflow-hidden rounded-2xl p-4 sm:p-5 md:p-6 cursor-pointer transition-all duration-200 border select-none w-[86vw] max-w-[340px] xs:w-[320px] shrink-0 snap-start md:w-auto md:max-w-none ${
                                region === 'global'
                                    ? 'bg-gradient-to-br from-[#08182f] via-[#040f20] to-[#020710] border-blue-500/70 ring-1 ring-blue-500/40 shadow-[0_0_25px_rgba(59,130,246,0.2)]'
                                    : 'bg-gradient-to-br from-[#0c1320]/60 to-[#0e0e11] border-white/10 hover:border-blue-500/30'
                            }`}
                        >
                            {/* Globe Illustration */}
                            <div className="absolute top-2 right-2 pointer-events-none z-0">
                                <svg viewBox="0 0 200 160" className="w-32 sm:w-40 h-28 opacity-30 group-hover:opacity-45 transition-opacity" fill="none">
                                    <defs>
                                        <radialGradient id="globeGlowSm" cx="50%" cy="50%" r="50%">
                                            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
                                            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                                        </radialGradient>
                                        <radialGradient id="sphereGradSm" cx="35%" cy="35%" r="65%">
                                            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.7" />
                                            <stop offset="50%" stopColor="#0284c7" stopOpacity="0.4" />
                                            <stop offset="100%" stopColor="#082f49" stopOpacity="0.2" />
                                        </radialGradient>
                                    </defs>
                                    <circle cx="120" cy="85" r="70" fill="url(#globeGlowSm)" />
                                    <circle cx="120" cy="85" r="50" fill="url(#sphereGradSm)" stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.6" />
                                    <ellipse cx="120" cy="85" rx="30" ry="50" stroke="#38bdf8" strokeWidth="0.8" strokeOpacity="0.5" fill="none" />
                                    <ellipse cx="120" cy="85" rx="14" ry="50" stroke="#38bdf8" strokeWidth="0.8" strokeOpacity="0.4" fill="none" />
                                </svg>
                            </div>

                            {/* Content */}
                            <div className="relative z-10 max-w-[78%]">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30 mb-1.5">
                                    <Globe size={10} className="text-blue-400" />
                                    <span>HOLLYWOOD & INTERNATIONAL</span>
                                </span>

                                <h2 className="text-lg md:text-2xl font-black text-white tracking-tight">
                                    Global Content
                                </h2>
                                <p className="text-[11px] md:text-xs text-gray-300 mt-1 line-clamp-2 leading-relaxed">
                                    World-renowned Hollywood epics, gripping K-Dramas, Japanese Anime masterpieces, and European cinema.
                                </p>

                                <div className="flex flex-wrap gap-1 pt-2">
                                    {['Hollywood', 'K-Drama', 'Anime'].map(tag => (
                                        <span key={tag} className="text-[10px] font-medium px-2 py-0.5 rounded bg-black/50 border border-white/10 text-gray-300">
                                            {tag}
                                        </span>
                                    ))}
                                    <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-black/50 border border-white/10 text-gray-400">
                                        +2
                                    </span>
                                </div>
                            </div>

                            {/* Arrow Button */}
                            <div className="absolute top-3.5 right-3.5 z-20">
                                <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center transition ${
                                    region === 'global' 
                                        ? 'bg-blue-500/25 text-blue-300 border border-blue-400/40' 
                                        : 'bg-white/5 text-gray-400 border border-white/10'
                                }`}>
                                    <ChevronRight size={15} />
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* 4. "BROWSE BY LANGUAGE & REGION" Bar */}
                <div className="mb-5 md:mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest font-black text-gray-400">
                            <Globe size={13} className="text-gray-400" />
                            <span>Browse by Language & Region</span>
                        </div>
                        <button 
                            onClick={() => setShowAllLanguages(!showAllLanguages)}
                            className="text-[11px] text-red-500 hover:text-red-400 font-bold transition"
                        >
                            View All
                        </button>
                    </div>

                    <div className="p-2 rounded-2xl bg-[#161619] border border-white/10 shadow-lg">
                        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                            {activeSubcategories.map(sub => {
                                const isSelected = subRegion === sub.id;

                                return (
                                    <button
                                        key={sub.id}
                                        onClick={() => handleSelectSubRegion(sub.id)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-all duration-200 active:scale-95 cursor-pointer ${
                                            isSelected
                                                ? 'bg-gradient-to-r from-[#ea3829] to-[#d92215] text-white font-bold shadow-[0_0_12px_rgba(234,56,41,0.4)] border border-red-400'
                                                : 'bg-[#1e1e22] text-gray-300 hover:text-white hover:bg-[#28282d] border border-white/5'
                                        }`}
                                    >
                                        <span className="text-sm">{sub.emoji}</span>
                                        <span>{sub.label}</span>
                                        <span className="text-[10px] opacity-70 font-normal hidden sm:inline">({sub.industry})</span>
                                        {isSelected && <Check size={12} strokeWidth={3} className="ml-0.5" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* 5. "BROWSE BY GENRE" Section (3 columns on smartphone matching image) */}
                <div className="mb-6 md:mb-7">
                    <div className="flex items-center justify-between gap-3 mb-2.5">
                        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest font-black text-gray-400">
                            <span className="text-gray-400">ⓘ</span>
                            <span>Browse by Genre</span>
                        </div>

                        {/* Layout Toggle (Grid vs Wrap) */}
                        <div className="flex items-center bg-[#17171a] border border-white/10 rounded-lg p-0.5 text-xs">
                            <button
                                onClick={() => setCategoryLayout('grid')}
                                className={`px-2.5 py-0.5 md:py-1 rounded-md flex items-center gap-1 text-[11px] font-bold transition ${
                                    categoryLayout === 'grid'
                                        ? 'bg-[#e50914] text-white shadow-md'
                                        : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                <LayoutGrid size={11} />
                                <span>Grid</span>
                            </button>
                            <button
                                onClick={() => setCategoryLayout('wrap')}
                                className={`px-2.5 py-0.5 md:py-1 rounded-md flex items-center gap-1 text-[11px] font-bold transition ${
                                    categoryLayout === 'wrap'
                                        ? 'bg-[#e50914] text-white shadow-md'
                                        : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                <Tag size={11} />
                                <span>Wrap</span>
                            </button>
                        </div>
                    </div>

                    {/* Genre Matrix: Exactly 3 cols on mobile, up to 7 on desktop */}
                    <div
                        className={
                            categoryLayout === 'grid'
                                ? "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-1.5 sm:gap-2 md:gap-2.5"
                                : "flex flex-wrap items-center gap-2"
                        }
                    >
                        {DISPLAY_CATEGORIES.map(cat => {
                            const isSelected = cat.id === activeCategory.id;

                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => handleSelectCategory(cat.id)}
                                    className={`group relative rounded-xl font-medium flex items-center transition-all duration-150 active:scale-95 select-none cursor-pointer ${
                                        categoryLayout === 'grid'
                                            ? 'px-2 py-2 sm:px-3 sm:py-2.5 justify-start text-[11px] sm:text-xs md:text-sm w-full'
                                            : 'px-3 py-1.5 text-xs md:text-sm'
                                    } ${
                                        isSelected
                                            ? 'bg-gradient-to-r from-[#e50914] via-[#ea3829] to-[#d92215] text-white shadow-[0_0_15px_rgba(229,9,20,0.5)] border border-red-400 font-bold z-10'
                                            : 'bg-[#18181b]/95 text-gray-200 hover:text-white hover:bg-[#242429] border border-white/5'
                                    }`}
                                >
                                    <span className="text-sm sm:text-base mr-1.5 shrink-0">
                                        {cat.emoji}
                                    </span>
                                    <span className="truncate">{cat.name}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* 6. Spotlight Hero Banner ("TRENDING NOW" as in image) */}
                {currentSpotlight && (
                    <div className="mb-7 md:mb-8">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest font-black text-red-500">
                                <TrendingUp size={13} className="text-red-500" />
                                <span>Trending Now</span>
                            </div>
                            <button 
                                onClick={() => {
                                    setMediaType('all');
                                    window.scrollTo({ top: 800, behavior: 'smooth' });
                                }}
                                className="text-[11px] text-red-500 hover:text-red-400 font-bold transition"
                            >
                                View All
                            </button>
                        </div>

                        <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl min-h-[220px] md:min-h-[280px] flex items-center bg-[#141416]">
                            
                            {/* Backdrop Image */}
                            <div className="absolute inset-0 z-0">
                                {currentSpotlight.backdrop_path ? (
                                    <img
                                        src={currentSpotlight.backdrop_path}
                                        alt={currentSpotlight.title}
                                        className="w-full h-full object-cover object-center filter brightness-[0.7] scale-105 transition-all duration-500"
                                    />
                                ) : (
                                    <div className={`w-full h-full bg-gradient-to-br ${activeCategory.gradient}`} />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-r from-[#0e0e11] via-[#0e0e11]/85 to-transparent w-full md:w-3/5" />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e11] via-transparent to-transparent" />
                            </div>

                            {/* Left Content */}
                            <div className="relative z-10 p-4 sm:p-6 md:p-8 max-w-xl space-y-2.5">
                                {/* Badges */}
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    {currentSpotlight.vote_average ? (
                                        <span className="flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-amber-500/30">
                                            <Star size={10} className="fill-amber-400 text-amber-400" />
                                            <span>{currentSpotlight.vote_average.toFixed(1)}</span>
                                        </span>
                                    ) : null}

                                    <span className="text-[10px] uppercase tracking-wider font-bold text-gray-300 bg-white/10 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10">
                                        {currentSpotlight.type === 'tv' ? 'SERIES' : 'MOVIE'}
                                    </span>

                                    <span className="text-[10px] font-semibold text-amber-200 bg-amber-950/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-amber-500/30">
                                        In {activeSubcategoryDef?.label || 'Hindi'}
                                    </span>
                                </div>

                                <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight drop-shadow-xl line-clamp-1">
                                    {currentSpotlight.title}
                                </h2>

                                <p className="text-xs text-gray-300 line-clamp-2 leading-relaxed drop-shadow">
                                    {currentSpotlight.overview || activeCategory.description}
                                </p>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-2.5 pt-1">
                                    <button
                                        onClick={() => handlePlayClick(currentSpotlight)}
                                        disabled={loadingItemId === currentSpotlight.id}
                                        className="px-4 py-1.5 sm:px-5 sm:py-2 bg-[#e50914] hover:bg-red-700 text-white font-bold text-xs rounded-full flex items-center gap-1.5 transition active:scale-95 shadow-xl disabled:opacity-50 cursor-pointer"
                                    >
                                        {loadingItemId === currentSpotlight.id ? (
                                            <Loader2 size={13} className="animate-spin text-white" />
                                        ) : (
                                            <Play size={13} className="fill-white" />
                                        )}
                                        <span>Watch Now</span>
                                    </button>
                                    
                                    <button
                                        onClick={handleToggleWatchlist}
                                        className="px-4 py-1.5 sm:px-5 sm:py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs rounded-full flex items-center gap-1.5 backdrop-blur-md transition active:scale-95 cursor-pointer"
                                    >
                                        {isCurrentInWatchlist ? (
                                            <>
                                                <Check size={14} className="text-green-400" />
                                                <span>My List</span>
                                            </>
                                        ) : (
                                            <>
                                                <Plus size={14} />
                                                <span>My List</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                        </div>
                    </div>
                )}

                {/* 7. Filter Toolbar & Search */}
                <div className="mb-5 md:mb-6">
                    <div className="p-2.5 md:p-3 rounded-xl bg-[#161619] border border-white/10 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-lg">
                        
                        {/* Media Type Tabs */}
                        <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-white/5 shrink-0">
                            <button
                                onClick={() => { setMediaType('all'); setCurrentPage(1); }}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                                    mediaType === 'all'
                                        ? 'bg-[#e50914] text-white shadow-md'
                                        : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                All Content
                            </button>
                            <button
                                onClick={() => { setMediaType('movie'); setCurrentPage(1); }}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition ${
                                    mediaType === 'movie'
                                        ? 'bg-[#e50914] text-white shadow-md'
                                        : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                <Film size={11} />
                                <span>Movies</span>
                            </button>
                            <button
                                onClick={() => { setMediaType('tv'); setCurrentPage(1); }}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition ${
                                    mediaType === 'tv'
                                        ? 'bg-[#e50914] text-white shadow-md'
                                        : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                <Tv size={11} />
                                <span>Series</span>
                            </button>
                        </div>

                        {/* Search Input */}
                        <div className="relative flex-1 max-w-md">
                            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={searchFilter}
                                onChange={e => { setSearchFilter(e.target.value); setCurrentPage(1); }}
                                placeholder={`Search ${region === 'indian' ? 'Indian' : 'Global'} ${activeCategory.name === 'All Genres' ? 'titles' : activeCategory.name}...`}
                                className="w-full bg-black/50 border border-white/10 rounded-lg pl-8 pr-3 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#e50914] transition"
                            />
                        </div>

                        {/* Sort Dropdown */}
                        <div className="flex items-center gap-1.5 shrink-0">
                            <SlidersHorizontal size={13} className="text-gray-400" />
                            <select
                                value={sortBy}
                                onChange={e => { setSortBy(e.target.value as any); setCurrentPage(1); }}
                                className="bg-black/60 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-[#e50914] cursor-pointer"
                            >
                                <option value="popular">Most Popular</option>
                                <option value="rating">Highest Rated</option>
                                <option value="newest">Newest Releases</option>
                                <option value="title">Title (A - Z)</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* 8. Movies & Series Catalog Grid */}
                <div>
                    {isLoadingTMDB ? (
                        <div className="py-16 flex flex-col items-center justify-center gap-2.5">
                            <Loader2 size={30} className="animate-spin text-[#e50914]" />
                            <p className="text-xs text-gray-400 font-medium">
                                Fetching titles from TMDB...
                            </p>
                        </div>
                    ) : combinedContent.length === 0 ? (
                        <div className="py-16 text-center space-y-2">
                            <span className="text-3xl">🎬</span>
                            <h3 className="text-base font-bold text-white">No content found</h3>
                            <p className="text-xs text-gray-400 max-w-sm mx-auto">
                                No titles found matching your selection. Try switching to a different language or genre.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3 md:gap-4">
                                {combinedContent.map(item => {
                                    const isItemLoading = loadingItemId === item.id;

                                    return (
                                        <div
                                            key={item.id}
                                            onClick={() => handleCardClick(item)}
                                            className="group relative rounded-xl overflow-hidden bg-[#161619] border border-white/10 hover:border-white/30 transition-all duration-200 hover:scale-[1.02] hover:shadow-2xl flex flex-col cursor-pointer"
                                        >
                                            {/* Poster Image */}
                                            <div className="relative aspect-[2/3] w-full overflow-hidden bg-black/60">
                                                <img
                                                    src={item.poster_path || '/logo.png'}
                                                    alt={item.title}
                                                    loading="lazy"
                                                    className={`w-full h-full ${item.poster_path ? 'object-cover' : 'object-contain p-4 bg-black/60'} transition-transform duration-300 group-hover:scale-105`}
                                                    onError={(e) => {
                                                        const t = e.currentTarget;
                                                        if (!t.src.endsWith('/logo.png')) {
                                                            t.src = '/logo.png';
                                                            t.className = "w-full h-full object-contain p-4 bg-black/60 transition-transform duration-300 group-hover:scale-105";
                                                        }
                                                    }}
                                                />

                                                {/* Rating Badge */}
                                                {item.vote_average ? (
                                                    <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-md border border-white/10 flex items-center gap-1 text-[9px] font-bold text-amber-400">
                                                        <Star size={9} className="fill-amber-400" />
                                                        <span>{item.vote_average.toFixed(1)}</span>
                                                    </div>
                                                ) : null}

                                                {/* Media Type Tag */}
                                                <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-md border border-white/10 text-[8px] font-bold uppercase tracking-wider text-gray-300">
                                                    {item.type === 'tv' ? 'Series' : 'Movie'}
                                                </div>

                                                {/* Hover Play Overlay */}
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-1.5">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handlePlayClick(item);
                                                        }}
                                                        disabled={isItemLoading}
                                                        className="w-9 h-9 rounded-full bg-[#e50914] text-white flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition"
                                                        title="Play Now"
                                                    >
                                                        {isItemLoading ? (
                                                            <Loader2 size={14} className="animate-spin text-white" />
                                                        ) : (
                                                            <Play size={14} className="fill-white translate-x-0.5" />
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleCardClick(item);
                                                        }}
                                                        className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-md flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition"
                                                        title="View Details"
                                                    >
                                                        <Info size={14} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Card Info */}
                                            <div className="p-2 flex-1 flex flex-col justify-between">
                                                <div>
                                                    <h3 className="text-[11px] sm:text-xs md:text-sm font-bold text-white group-hover:text-[#e50914] transition line-clamp-1">
                                                        {item.title}
                                                    </h3>
                                                    <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] text-gray-400 mt-0.5">
                                                        {item.year && <span>{item.year}</span>}
                                                        <span>•</span>
                                                        <span className="capitalize">{item.type === 'tv' ? 'Series' : 'Movie'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Pagination */}
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={(p) => {
                                    setCurrentPage(p);
                                    window.scrollTo({ top: 500, behavior: 'smooth' });
                                }}
                            />
                        </>
                    )}
                </div>

            </div>
        </div>
    );
};

export default CategoriesPage;
