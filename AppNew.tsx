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
import LoginPage from './components/LoginPage';
import MobileNav from './components/MobileNav';
import Footer from './components/Footer';
import InfoPage from './components/InfoPage';
import MobileScannerPage from './components/MobileScannerPage';
import AdblockerGuidePage from './components/AdblockerGuidePage';

import AccountSettings from './components/AccountSettings';
import AdminLayout from './components/admin/AdminLayout';
import UnlockContentModal from './components/UnlockContentModal';
import SearchPage from './components/SearchPage';
import CategoriesPage from './components/CategoriesPage';
import ScrollToTop from './components/ScrollToTop';
import ProfileSelection from './components/ProfileSelection';
import FontLoader from './components/FontLoader';
import Loader from './components/Loader';
import { buildEmbedUrl, parseEmbedContentType } from './utils/embedUrl';
import Pagination from './components/Pagination';
import GenrePreferenceModal from './components/GenrePreferenceModal';
import PersonalizeBanner from './components/PersonalizeBanner';
import {
    getPersonalizedRecommendations,
    getBecauseYouWatchedSection,
    getTopPicksForGenre,
    normalizeGenre,
    isIndianOrMarvelContent
} from './services/recommendationService';
import {
    fetchTMDBDetails,
    findByIMDbId,
    tmdbPosterUrl,
    tmdbBackdropUrl,
    mapTMDBGenres,
    extractTMDBTrailer,
    fetchCuratedHeroContent,
    INDIAN_LANGUAGES
} from './services/tmdbService';
import { SlidersHorizontal } from 'lucide-react';
import { Content, ContinueWatchingItem } from './types';
import { StoreProvider } from './context/StoreContext';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate, Link } from 'react-router-dom';

const MainLayout = () => {
    const { content, rawContent, currentUser, currentProfile, isLoading, isAuthenticated, sections, pages, settings, incrementViews, addToWatchHistory } = useStore();
    const location = useLocation();
    const navigate = useNavigate();

    // Preserve previous tab and URL when entering modal routes (/browse/ or /watch/)
    const lastActiveTabRef = useRef<string>('home');
    const lastNonModalUrlRef = useRef<string>('/');

    // Derived activeTab from URL (root '/' is the main website link for 'home')
    const path = location.pathname.substring(1);
    const isModalRoute = path.startsWith('browse/') || path.startsWith('watch/');

    let currentTab = (path && path !== 'home') ? decodeURIComponent(path.split('/')[0]) : 'home';
    if (currentTab === 'category') currentTab = 'categories';

    if (!isModalRoute) {
        lastActiveTabRef.current = currentTab;
        lastNonModalUrlRef.current = location.pathname + location.search;
    }

    const stateFromTab = (location.state as any)?.fromTab;
    const stateFrom = (location.state as any)?.from;

    let extractedFromTab: string | undefined;
    if (stateFrom) {
        const cleanFrom = stateFrom.replace(/^\//, '').split('?')[0].split('/')[0];
        extractedFromTab = (cleanFrom && cleanFrom !== 'home') ? decodeURIComponent(cleanFrom) : 'home';
        if (extractedFromTab === 'category') extractedFromTab = 'categories';
    }

    // Active tab stays on the underlying screen when viewing content or playing video
    const activeTab = isModalRoute
        ? (stateFromTab || extractedFromTab || lastActiveTabRef.current || 'home')
        : currentTab;

    const [viewingContent, setViewingContent] = useState<Content | null>(null);
    const [playingContent, setPlayingContent] = useState<Content | null>(null);
    const [showUnlockModal, setShowUnlockModal] = useState(false);
    const [showGenreModal, setShowGenreModal] = useState(false);

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

    // Lock document scroll when watching video to eliminate browser sidebar scrollbar
    useEffect(() => {
        const isWatchRoute = location.pathname.startsWith('/watch/');
        if (playingContent && isWatchRoute) {
            document.body.classList.add('video-player-active');
            document.documentElement.classList.add('video-player-active');
            document.body.style.overflow = 'hidden';
            document.documentElement.style.overflow = 'hidden';
        } else {
            document.body.classList.remove('video-player-active');
            document.documentElement.classList.remove('video-player-active');
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
        }

        return () => {
            if (!playingContent || !location.pathname.startsWith('/watch/')) {
                document.body.classList.remove('video-player-active');
                document.documentElement.classList.remove('video-player-active');
                document.body.style.overflow = '';
                document.documentElement.style.overflow = '';
            }
        };
    }, [playingContent, location.pathname]);

    // Deep Link Handler (e.g. /browse/content_123 or /watch/content_123)
    useEffect(() => {
        let isCancelled = false;

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
                        if (isCancelled || !window.location.pathname.startsWith('/browse/')) return;
                        setViewingContent(item);
                    } else if (contentId.startsWith('tmdb_')) {
                        const rawId = parseInt(contentId.replace('tmdb_', ''));
                        if (!isNaN(rawId)) {
                            const hintType = (stateItem?.type as 'movie' | 'tv') || (location.search.includes('type=tv') ? 'tv' : undefined);
                            const fetchResolved = async () => {
                                let detail: any = null;
                                let resolvedType: 'movie' | 'tv' = hintType || 'movie';
                                if (hintType === 'tv') {
                                    try { detail = await fetchTMDBDetails(rawId, 'tv'); } catch (_) { }
                                    if (!detail) { try { detail = await fetchTMDBDetails(rawId, 'movie'); resolvedType = 'movie'; } catch (_) { } }
                                } else {
                                    try { detail = await fetchTMDBDetails(rawId, 'movie'); } catch (_) { }
                                    if (!detail) { try { detail = await fetchTMDBDetails(rawId, 'tv'); resolvedType = 'tv'; } catch (_) { } }
                                }
                                if (!detail) throw new Error(`TMDB ID ${rawId} not found`);

                                const trailerUrl = extractTMDBTrailer(detail);
                                const imdbId = detail.external_ids?.imdb_id || (detail as any).imdb_id || '';
                                const effectiveType: 'movie' | 'tv' = (detail.name || detail.media_type === 'tv' || resolvedType === 'tv') ? 'tv' : 'movie';
                                const streamId = imdbId || String(detail.id);

                                const resolved: Content = {
                                    id: `tmdb_${detail.id}`,
                                    title: detail.title || detail.name || 'Untitled',
                                    type: effectiveType,
                                    imdbId: imdbId || undefined,
                                    genres: mapTMDBGenres(detail.genres?.map((g: any) => g.id) || []),
                                    poster_path: detail.poster_path ? tmdbPosterUrl(detail.poster_path) : '',
                                    backdrop_path: detail.backdrop_path ? tmdbBackdropUrl(detail.backdrop_path) : '',
                                    description: detail.overview || '',
                                    overview: detail.overview || '',
                                    year: (detail.release_date || detail.first_air_date) ? parseInt((detail.release_date || detail.first_air_date)!.split('-')[0]) : new Date().getFullYear(),
                                    rating: detail.vote_average || 0,
                                    vote_average: detail.vote_average || 0,
                                    trailerUrl: trailerUrl ? `https://www.youtube.com/watch?v=${trailerUrl}` : undefined,
                                    youtubeId: trailerUrl || undefined,
                                    videoUrl: buildEmbedUrl(streamId, effectiveType, settings),
                                    tmdbId: detail.id,
                                    totalSeasons: detail.number_of_seasons,
                                    totalEpisodes: detail.number_of_episodes,
                                    allowPlayback: true,
                                    isPublished: true
                                };
                                if (isCancelled || !window.location.pathname.startsWith('/browse/')) return;
                                setViewingContent(resolved);
                            };

                            fetchResolved().catch(() => {
                                if (isCancelled || !window.location.pathname.startsWith('/browse/')) return;
                                const from = (location.state as any)?.from || lastNonModalUrlRef.current;
                                navigate(from || '/', { replace: true });
                            });
                        }
                    } else {
                        // Content loaded but ID not found
                        console.warn(`Deep link content not found: ${contentId}`);
                        const from = (location.state as any)?.from || lastNonModalUrlRef.current;
                        navigate(from || '/', { replace: true });
                        return;
                    }
                } else {
                    const from = (location.state as any)?.from || lastNonModalUrlRef.current;
                    navigate(from || '/', { replace: true });
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
                        const embedBaseHost = (settings?.embedProxyBaseUrl || 'https://proxy.garageband.rocks').replace(/^https?:\/\//, '').replace(/\/+$/, '');

                        const imdbId = item.imdbId ||
                            (typeof item.id === 'string' && item.id.startsWith('imdb_') ? item.id.replace('imdb_', '') : null) ||
                            (item.videoUrl ? item.videoUrl.match(/(tt\d+)/i)?.[1] : null) ||
                            (typeof item.id === 'string' && /^tt\d+$/i.test(item.id.trim()) ? item.id.trim() : null);

                        const tmdbNumId = item.tmdbId || (typeof item.id === 'string' && item.id.startsWith('tmdb_') ? item.id.replace('tmdb_', '') : null);

                        const isEmbed = (item.videoUrl && (item.videoUrl.includes('proxy.garageband.rocks') || (embedBaseHost && item.videoUrl.includes(embedBaseHost)) || item.videoUrl.includes('/embed/'))) || !!imdbId || !!tmdbNumId;

                        const effectiveStreamId = imdbId || tmdbNumId;

                        let playableItem = { ...item };
                        if (isEmbed && (effectiveStreamId || item.videoUrl)) {
                            const existingType = item.videoUrl ? parseEmbedContentType(item.videoUrl) : null;
                            const streamUrl = effectiveStreamId ? buildEmbedUrl(effectiveStreamId, existingType || item.type || 'movie', settings) : item.videoUrl;
                            if (streamUrl) {
                                playableItem.videoUrl = streamUrl;
                            }
                        }

                        // Authenticate if required (trailers don't need auth, movies do)
                        if (mode === 'movie' && !isAuthenticated) {
                            navigate('/login');
                            return;
                        }

                        // Check for Exclusive Content
                        if (mode === 'movie' && playableItem.isExclusive && !currentProfile?.unlockedContent?.includes('global_unlock')) {
                            navigate('/exclusive', { replace: true });
                            return;
                        }
                        if (!playingContent || playingContent.id !== playableItem.id || playingContent.playMode !== mode) {
                            if (isCancelled || !window.location.pathname.startsWith('/watch/')) return;
                            setPlayingContent({ ...playableItem, playMode: mode });
                            // Increment views when main movie starts
                            if (mode === 'movie') {
                                incrementViews(playableItem.id).catch(() => {});
                            }
                        }
                    } else if (contentId && (contentId.startsWith('tmdb_') || /^\d+$/.test(contentId) || /^tt\d+$/i.test(contentId))) {
                        // Dynamically resolve TMDB or IMDb ID on /watch/:id deep link
                        const isImdb = /^tt\d+$/i.test(contentId);
                        const fetchResolved = async () => {
                            let detail: any = null;
                            let resolvedType: 'movie' | 'tv' = 'movie';
                            let rawTmdbId = 0;
                            let imdbId = '';
                            if (isImdb) {
                                imdbId = contentId;
                                detail = await findByIMDbId(contentId);
                                if (detail) {
                                    rawTmdbId = detail.id;
                                    resolvedType = detail.title ? 'movie' : 'tv';
                                }
                            } else {
                                rawTmdbId = parseInt(contentId.replace('tmdb_', ''), 10);
                                try {
                                    detail = await fetchTMDBDetails(rawTmdbId, 'movie');
                                } catch (_) {
                                    if (!detail) { try { detail = await fetchTMDBDetails(rawTmdbId, 'tv'); resolvedType = 'tv'; } catch (_) { } }
                                }
                                if (detail) {
                                    imdbId = detail.external_ids?.imdb_id || (detail as any).imdb_id || '';
                                    resolvedType = (detail.name || detail.media_type === 'tv' || resolvedType === 'tv') ? 'tv' : 'movie';
                                }
                            }
                            if (!detail) throw new Error(`Content ID ${contentId} not found`);

                            const trailerUrl = extractTMDBTrailer(detail);
                            const streamId = imdbId || (rawTmdbId ? String(rawTmdbId) : '');

                            const resolved: Content = {
                                id: `tmdb_${detail.id}`,
                                title: detail.title || detail.name || 'Untitled',
                                type: resolvedType,
                                imdbId: imdbId || undefined,
                                genres: mapTMDBGenres(detail.genres?.map((g: any) => g.id) || []),
                                poster_path: detail.poster_path ? tmdbPosterUrl(detail.poster_path) : '',
                                backdrop_path: detail.backdrop_path ? tmdbBackdropUrl(detail.backdrop_path) : '',
                                overview: detail.overview || '',
                                year: (detail.release_date || detail.first_air_date) ? parseInt((detail.release_date || detail.first_air_date)!.split('-')[0]) : new Date().getFullYear(),
                                rating: detail.vote_average || 0,
                                vote_average: detail.vote_average || 0,
                                trailerUrl: trailerUrl ? `https://www.youtube.com/watch?v=${trailerUrl}` : undefined,
                                youtubeId: trailerUrl || '',
                                videoUrl: buildEmbedUrl(streamId, resolvedType, settings),
                                tmdbId: detail.id,
                                totalSeasons: detail.number_of_seasons,
                                totalEpisodes: detail.number_of_episodes,
                                allowPlayback: true,
                                isPublished: true,
                                createdAt: new Date().toISOString()
                            };
                            if (isCancelled || !window.location.pathname.startsWith('/watch/')) return;
                            setPlayingContent({ ...resolved, playMode: mode });
                            if (mode === 'movie') {
                                incrementViews(resolved.id).catch(() => {});
                            }
                        };
                        fetchResolved().catch(() => {
                            if (isCancelled || !window.location.pathname.startsWith('/watch/')) return;
                            if (!playingContent) {
                                const from = (location.state as any)?.from || lastNonModalUrlRef.current;
                                navigate(from || '/', { replace: true });
                            }
                        });
                        return;
                    } else {
                        // Optional: Handle episodes correctly if deep linking directly to episode ID
                        // For now, if ID not in main content list, redirect
                        console.warn(`Watch deep link content not found: ${contentId}`);
                        // PROTECTION: Never redirect if we are already playing or have state
                        if (playingContent?.id === contentId || !!playingContent || stateItem || (location.state as any)?.item) return;
                        const from = (location.state as any)?.from || lastNonModalUrlRef.current;
                        navigate(from || '/', { replace: true });
                        return;
                    }
                } else {
                    if (!playingContent) {
                        const from = (location.state as any)?.from || lastNonModalUrlRef.current;
                        navigate(from || '/', { replace: true });
                    }
                }
            }
        } else {
            if (playingContent) {
                setPlayingContent(null);
            }
        }

        return () => {
            isCancelled = true;
        };
    }, [location.pathname, location.search, content, rawContent, navigate, viewingContent, playingContent, isLoading, isAuthenticated, currentProfile]);

    // Synchronously clean up player and modals when navigating away from their routes or on browser back/forward
    useEffect(() => {
        const handleRouteExit = () => {
            if (!location.pathname.startsWith('/watch/')) {
                setPlayingContent(null);
                if (document.fullscreenElement && document.exitFullscreen) {
                    document.exitFullscreen().catch(() => {});
                }
                document.body.classList.remove('video-player-active');
                document.documentElement.classList.remove('video-player-active');
                document.body.style.overflow = '';
                document.documentElement.style.overflow = '';
            }
            if (!location.pathname.startsWith('/browse/')) {
                setViewingContent(null);
            }
        };

        window.addEventListener('popstate', handleRouteExit);
        handleRouteExit();

        return () => {
            window.removeEventListener('popstate', handleRouteExit);
        };
    }, [location.pathname]);

    // Ensure URL is explicitly /watch/:id whenever content is playing (never stays on localhost:3000)
    useEffect(() => {
        if (playingContent && location.pathname.startsWith('/watch/')) {
            const targetWatchPath = `/watch/${playingContent.id}`;
            if (!location.pathname.startsWith(targetWatchPath)) {
                navigate(`${targetWatchPath}?mode=${playingContent.playMode || 'movie'}`, {
                    replace: true,
                    state: {
                        item: playingContent,
                        from: lastNonModalUrlRef.current,
                        fromTab: lastActiveTabRef.current
                    }
                });
            }
        }
    }, [playingContent, location.pathname, navigate]);

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
        } catch (e) { }

        return items;
    }, [currentUser?.continueWatching, content]);

    // Combined Watch History (Firestore + LocalStorage fallback)
    const combinedWatchHistory = useMemo(() => {
        const list: (ContinueWatchingItem | { movieId: string; progress?: number; lastWatchedAt?: string })[] = [];
        if (currentUser?.continueWatching) {
            list.push(...currentUser.continueWatching);
        }
        try {
            const raw = localStorage.getItem('my_donkey_watch_history');
            if (raw) {
                const localList = JSON.parse(raw);
                if (Array.isArray(localList)) {
                    localList.forEach((lh: any) => {
                        if (!list.some(it => it.movieId === lh.movieId)) {
                            list.push(lh);
                        }
                    });
                }
            }
        } catch (e) { }
        return list;
    }, [currentUser?.continueWatching]);

    // Resolved User Favorite Genres (Profile -> Account -> LocalStorage)
    const userFavoriteGenres = useMemo(() => {
        if (currentProfile?.favoriteGenres && currentProfile.favoriteGenres.length > 0) {
            return currentProfile.favoriteGenres.map(normalizeGenre);
        }
        if (currentUser?.favoriteGenres && currentUser.favoriteGenres.length > 0) {
            return currentUser.favoriteGenres.map(normalizeGenre);
        }
        try {
            const raw = localStorage.getItem('my_donkey_favorite_genres');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) return parsed.map(normalizeGenre);
            }
        } catch (e) { }
        return [];
    }, [currentProfile?.favoriteGenres, currentUser?.favoriteGenres]);

    // Home Page Suggestions Scope: ONLY Indian movies, Indian TV shows, and Marvel movies
    const homeFilteredContent = useMemo(() => {
        if (!content) return [];
        return content.filter(isIndianOrMarvelContent);
    }, [content]);

    // Personalized Recommendations for Home Tab (Exclusively Indian & Marvel)
    const homePersonalized = useMemo(() => {
        return getPersonalizedRecommendations({
            allContent: homeFilteredContent,
            watchHistory: combinedWatchHistory,
            favoriteGenres: userFavoriteGenres,
            currentProfile,
            limit: 20
        });
    }, [homeFilteredContent, combinedWatchHistory, userFavoriteGenres, currentProfile]);

    // Personalized Recommendations for Movies Tab
    const moviePersonalized = useMemo(() => {
        return getPersonalizedRecommendations({
            allContent: content,
            watchHistory: combinedWatchHistory,
            favoriteGenres: userFavoriteGenres,
            currentProfile,
            limit: 20,
            filterType: 'movie'
        });
    }, [content, combinedWatchHistory, userFavoriteGenres, currentProfile]);

    // Personalized Recommendations for TV Tab
    const tvPersonalized = useMemo(() => {
        return getPersonalizedRecommendations({
            allContent: content,
            watchHistory: combinedWatchHistory,
            favoriteGenres: userFavoriteGenres,
            currentProfile,
            limit: 20,
            filterType: 'tv'
        });
    }, [content, combinedWatchHistory, userFavoriteGenres, currentProfile]);

    // "Because You Watched [Title]" Section (Exclusively Indian & Marvel on Home Tab)
    const becauseYouWatched = useMemo(() => {
        return getBecauseYouWatchedSection({
            watchHistory: combinedWatchHistory,
            allContent: homeFilteredContent,
            limit: 15
        });
    }, [combinedWatchHistory, homeFilteredContent]);

    // Curated Rails for User's Explicit Favorite Genres (Exclusively Indian & Marvel on Home Tab)
    const favoriteGenreRails = useMemo(() => {
        if (!userFavoriteGenres || userFavoriteGenres.length === 0) return [];
        const watchedIds = new Set(combinedWatchHistory.map(w => w.movieId));
        return userFavoriteGenres.slice(0, 2).map(genre => {
            const items = getTopPicksForGenre({
                genre,
                allContent: homeFilteredContent,
                watchedIds,
                limit: 15
            });
            return { genre, items };
        }).filter(r => r.items.length > 0);
    }, [userFavoriteGenres, combinedWatchHistory, homeFilteredContent]);

    // State for random heroes (refreshes on tab change)
    const [randomHeroes, setRandomHeroes] = useState<{ movie: any; tv: any }>({
        movie: null,
        tv: null
    });

    useEffect(() => {
        if (!content || content.length === 0) return;

        if (activeTab === 'movies') {
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
    }, [activeTab, content, movies.length, tvShows.length]);

    // ── Curated Hero Carousel (Indian + Marvel + DC, rating >= 7.5) ──────────
    const [heroItems, setHeroItems] = useState<Content[]>([]);
    useEffect(() => {
        // Derive preferred language from combined watch history
        const langCount: Record<string, number> = {};
        const watchIds = combinedWatchHistory.map(h => h.movieId);
        content.filter(c => watchIds.includes(c.id) || watchIds.includes(c.imdbId || '')).forEach(c => {
            const lang = (c as any).original_language || (INDIAN_LANGUAGES.includes((c as any).lang) ? (c as any).lang : null);
            if (lang) langCount[lang] = (langCount[lang] || 0) + 1;
        });
        const preferredLang = Object.entries(langCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'hi';

        fetchCuratedHeroContent(preferredLang).then(results => {
            const mapped: Content[] = results.map(r => ({
                id: `tmdb_${r.id}`,
                title: r.title || r.name || 'Untitled',
                type: (r.media_type === 'tv' ? 'tv' : 'movie') as 'movie' | 'tv',
                poster_path: r.poster_path ? tmdbPosterUrl(r.poster_path) : '',
                backdrop_path: r.backdrop_path ? tmdbBackdropUrl(r.backdrop_path) : '',
                overview: r.overview || '',
                description: r.overview || '',
                vote_average: r.vote_average,
                release_date: r.release_date || r.first_air_date || '',
                year: parseInt((r.release_date || r.first_air_date || '0').split('-')[0]) || new Date().getFullYear(),
                genres: mapTMDBGenres(r.genre_ids || []),
                tmdbId: r.id,
                allowPlayback: true,
                isPublished: true,
                resolution: '4K',
            }));
            setHeroItems(mapped);
        }).catch(err => {
            console.error('fetchCuratedHeroContent error:', err);
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Handlers
    const handlePlay = (item: Content, mode: 'movie' | 'trailer' = 'movie') => {
        const fromUrl = (location.state as any)?.from || (isModalRoute ? lastNonModalUrlRef.current : (location.pathname + location.search));
        const fromTab = (location.state as any)?.fromTab || activeTab;

        if (mode === 'trailer') {
            const targetId = item.id || (item.tmdbId ? `tmdb_${item.tmdbId}` : (item.imdbId ? `imdb_${item.imdbId}` : 'trailer'));
            const fullItem = { ...item, id: targetId, playMode: 'trailer' as const };
            const isFromBrowse = location.pathname.startsWith('/browse/');
            setViewingContent(null);
            setPlayingContent(fullItem);
            navigate(`/watch/${targetId}?mode=trailer`, {
                replace: isFromBrowse,
                state: {
                    item: fullItem,
                    from: fromUrl,
                    fromTab: fromTab
                }
            });
            return;
        }

        const embedBaseHost = (settings?.embedProxyBaseUrl || 'https://proxy.garageband.rocks').replace(/^https?:\/\//, '').replace(/\/+$/, '');

        // Check if item has RapidStream / IMDb content ID or TMDB ID (open in stream player)
        const imdbId = item.imdbId ||
            (typeof item.id === 'string' && item.id.startsWith('imdb_') ? item.id.replace('imdb_', '') : null) ||
            (item.videoUrl ? item.videoUrl.match(/(tt\d+)/i)?.[1] : null) ||
            (typeof item.id === 'string' && /^tt\d+$/i.test(item.id.trim()) ? item.id.trim() : null);

        const tmdbNumId = item.tmdbId || (typeof item.id === 'string' && item.id.startsWith('tmdb_') ? item.id.replace('tmdb_', '') : null);

        const isEmbed = (item.videoUrl && (item.videoUrl.includes('proxy.garageband.rocks') || (embedBaseHost && item.videoUrl.includes(embedBaseHost)) || item.videoUrl.includes('/embed/'))) || !!imdbId || !!tmdbNumId;

        const effectiveStreamId = imdbId || tmdbNumId;

        let playableItem = { ...item };
        if (isEmbed && (effectiveStreamId || item.videoUrl)) {
            const existingType = item.videoUrl ? parseEmbedContentType(item.videoUrl) : null;
            const streamUrl = effectiveStreamId ? buildEmbedUrl(effectiveStreamId, existingType || item.type || 'movie', settings) : item.videoUrl;
            if (streamUrl) {
                playableItem.videoUrl = streamUrl;
            }
        }

        // ── Guard: block internal player if no playable source exists ──────────
        const hasAnyPlayableSource = !!(
            playableItem.videoUrl ||
            playableItem.movieDriveId ||
            playableItem.movieYoutubeId ||
            imdbId ||
            tmdbNumId
        );

        if (!hasAnyPlayableSource) {
            // Show a friendly "not available" toast instead of opening an empty player
            const toast = document.createElement('div');
            toast.innerHTML = `
                <div style="display:flex;align-items:center;gap:12px;">
                    <svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <span><b>Content not available</b><br/><span style="font-size:13px;opacity:0.8">No stream link found for "<em>${item.title}</em>"</span></span>
                </div>`;
            Object.assign(toast.style, {
                position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
                background: '#1a1a1a', color: '#fff', border: '1px solid rgba(255,255,255,0.12)',
                borderLeft: '4px solid #e50914', padding: '14px 20px', borderRadius: '10px',
                zIndex: '99999', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                fontFamily: 'inherit', maxWidth: '90vw', animation: 'fadeInUp 0.3s ease',
                lineHeight: '1.5',
            });
            document.body.appendChild(toast);
            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transition = 'opacity 0.4s ease';
                setTimeout(() => document.body.removeChild(toast), 400);
            }, 3500);
            return;
        }
        // ── End guard ──────────────────────────────────────────────────────────

        if (isAuthenticated && currentUser) {
            const targetId = playableItem.id || (playableItem.tmdbId ? `tmdb_${playableItem.tmdbId}` : (playableItem.imdbId ? `imdb_${playableItem.imdbId}` : 'player'));
            const fullItem = { ...playableItem, id: targetId, playMode: 'movie' as const };
            const isFromBrowse = location.pathname.startsWith('/browse/');
            setViewingContent(null);
            setPlayingContent(fullItem);
            navigate(`/watch/${targetId}?mode=movie`, {
                replace: isFromBrowse,
                state: {
                    item: fullItem,
                    from: fromUrl,
                    fromTab: fromTab
                }
            });
        } else {
            navigate('/login');
        }
    };

    const handleDetails = (item: Content) => {
        setViewingContent(item);
        const fromUrl = (location.state as any)?.from || (isModalRoute ? lastNonModalUrlRef.current : (location.pathname + location.search));
        const fromTab = (location.state as any)?.fromTab || activeTab;
        const search = (!isModalRoute && location.search) ? location.search : '';
        navigate(`/browse/${item.id}${search}`, {
            state: {
                item,
                from: fromUrl,
                fromTab: fromTab
            }
        });
    };

    const handleCloseDetails = () => {
        setViewingContent(null);
        let destination = (location.state as any)?.from || lastNonModalUrlRef.current;
        if (!destination || destination.startsWith('/browse') || destination.startsWith('/watch')) {
            destination = lastNonModalUrlRef.current;
        }
        if (!destination || destination.startsWith('/browse') || destination.startsWith('/watch')) {
            const tab = lastActiveTabRef.current || activeTab;
            destination = (!tab || tab === 'home') ? '/' : `/${tab}`;
        }
        if (window.history.state && window.history.state.idx > 0) {
            navigate(-1);
        } else {
            navigate(destination, { replace: true });
        }
    };

    const handleClosePlayer = () => {
        if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
        }
        document.body.classList.remove('video-player-active');
        document.documentElement.classList.remove('video-player-active');
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
        setPlayingContent(null);
        setViewingContent(null);

        let destination = (location.state as any)?.from || lastNonModalUrlRef.current;
        if (!destination || destination.startsWith('/watch') || destination.startsWith('/browse')) {
            destination = lastNonModalUrlRef.current;
        }
        if (!destination || destination.startsWith('/watch') || destination.startsWith('/browse')) {
            const tab = lastActiveTabRef.current || activeTab;
            destination = (!tab || tab === 'home') ? '/' : `/${tab}`;
        }
        if (window.history.state && window.history.state.idx > 0) {
            navigate(-1);
        } else {
            navigate(destination, { replace: true });
        }
    };

    const handleTabChange = (tabId: string) => {
        if (tabId === 'my-list' && !isAuthenticated) {
            navigate('/login');
            return;
        }
        // Navigate to the target URL (Home uses main website link '/')
        const targetPath = tabId === 'home' ? '/' : `/${tabId}`;
        if (location.pathname === targetPath) {
            window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
        } else {
            navigate(targetPath);
        }
    };

    const handleNavigate = (page: string) => {
        if (page === 'Account') {
            if (!isAuthenticated) {
                navigate('/login');
            } else {
                navigate('/account');
            }
            return;
        }

        if (page === 'adblocker' || page === 'adblockers' || page === 'Adblocker' || page === 'Adblockers') {
            navigate('/adblocker');
            return;
        }

        // Check for dynamic page
        const existingPage = pages.find(p => p.id === page);
        if (existingPage) {
            navigate(`/${page}`);
            return;
        }

        // Navigate to the page (standard tabs)
        if (['Home', 'Movies', 'TV Shows', 'My List', 'Categories', 'Category'].includes(page)) {
            // Map standard pages to IDs if needed, else use page name
            let target = page;
            if (page === 'Home') target = 'home';
            if (page === 'Movies') target = 'movies';
            if (page === 'TV Shows') target = 'tv';
            if (page === 'My List') target = 'my-list';
            if (page === 'Categories' || page === 'Category') target = 'categories';

            navigate(`/${target}`);
            return;
        }

        // Fallback
        handleTabChange(page.toLowerCase());
    };

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 24;

    const prevActiveTabRef = useRef(activeTab);
    useEffect(() => {
        if (prevActiveTabRef.current !== activeTab) {
            prevActiveTabRef.current = activeTab;
            setCurrentPage(1); // Reset on actual tab change
        }
    }, [activeTab, animeCategory, isModalRoute]);

    const handleIntroComplete = useCallback(() => {
        setShowAnimeIntro(false);
    }, []);

    // Helper to render sections for a given scope
    const renderSections = (scope: 'home' | 'tv' | 'movie') => {
        const scopeContent = scope === 'home' ? homeFilteredContent : (scope === 'movie' ? movies : (scope === 'tv' ? tvShows : content));

        const scopeSections = sections
            .filter(s => s.enabled && s.scopes?.includes(scope))
            .sort((a, b) => a.order - b.order);

        if (scopeSections.length > 0) {
            return scopeSections.map(section => {
                let autoItems: Content[] = [];

                // Auto-population logic
                if (section.type === 'recommended') {
                    autoItems = scope === 'movie'
                        ? moviePersonalized.recommendations
                        : (scope === 'tv' ? tvPersonalized.recommendations : homePersonalized.recommendations);
                } else if (section.type === 'trending') {
                    autoItems = scopeContent.filter(c => c.featured || (c.vote_average && c.vote_average > 7.5)).slice(0, 20);
                } else if (section.type === 'genre' && section.genreFilter) {
                    autoItems = scopeContent.filter(c => c.genres?.includes(section.genreFilter!)).slice(0, 20);
                } else if (section.type === 'originals') {
                    autoItems = scopeContent.filter(c => c.isOriginal).slice(0, 20);
                } else if (section.type === 'new_movies') {
                    autoItems = scopeContent.filter(c => c.type === 'movie').slice(0, 20);
                } else if (section.type === 'new_tv') {
                    autoItems = scopeContent.filter(c => c.type === 'tv').slice(0, 20);
                } else if (section.type === 'tag' && section.tagFilter) {
                    autoItems = scopeContent.filter(c => c.tags?.includes(section.tagFilter!) || c.genres?.includes(section.tagFilter!)).slice(0, 20);
                } else if (section.type === 'my_list') {
                    if (currentProfile?.myList) {
                        autoItems = scopeContent.filter(c => currentProfile.myList.includes(c.id));
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
                let manualItems = (section.contentIds || []).map(id => content.find(c => c.id === id)).filter(Boolean) as Content[];
                if (scope === 'home') {
                    manualItems = manualItems.filter(isIndianOrMarvelContent);
                }

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
        const filteredContent = scope === 'home' ? homeFilteredContent : (scope === 'movie' ? movies : (scope === 'tv' ? tvShows : content));

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
            // Home Hero items filtered strictly to Indian movies, Indian TV shows, and Marvel movies
            const homeHeroItems = heroItems.filter(isIndianOrMarvelContent);
            const fallbackHero = (settings?.heroContentId && content.find(c => c.id === settings.heroContentId && isIndianOrMarvelContent(c)))
                || (homeHeroItems.length > 0 ? homeHeroItems[0] : (homeFilteredContent.length > 0 ? homeFilteredContent[0] : null));

            const homeContinueWatching = continueWatchingItems.filter(isIndianOrMarvelContent);
            const homeUserAdded = userAddedContent.filter(isIndianOrMarvelContent);

            return (
                <>
                    {homeHeroItems.length > 0 ? (
                        <HeroBanner
                            items={homeHeroItems}
                            onPlay={(item) => handlePlay(item, 'movie')}
                            onDetails={handleDetails}
                        />
                    ) : fallbackHero ? (
                        <HeroBanner
                            item={fallbackHero}
                            onPlay={(item) => handlePlay(item, 'movie')}
                            onDetails={handleDetails}
                        />
                    ) : (
                        <HeroSkeleton />
                    )}
                    <div className="pb-24 bg-[#141414] relative z-10 space-y-3 md:space-y-5">
                        {/* Original Language Announcement */}
                        <div className="pt-4 px-4 md:px-12">
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
                                            <span className="text-brand-red font-semibold">Enjoy All content is available in its real language voice.</span>
                                        </p>
                                        <p className="text-gray-300 text-sm md:text-base leading-relaxed">
                                            we suggest to use <Link to="/adblocker" className="text-brand-red underline hover:text-brand-red/80">Adblockers & Mobile DNS</Link> for smooth experience and to enjoy content with better quality.  cause we use links of internet which can contains ads.
                                        </p>
                                    </div>
                                </div>
                                <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-brand-red/10 rounded-full blur-3xl"></div>
                            </div>
                        </div>

                        {/* Quick Personalize Banner if user hasn't selected favorite genres yet */}
                        {userFavoriteGenres.length === 0 && (
                            <div className="px-4 md:px-12">
                                <PersonalizeBanner onOpenModal={() => setShowGenreModal(true)} />
                            </div>
                        )}

                        {/* Continue Watching Rail (Watch History) */}
                        {homeContinueWatching.length > 0 && (
                            <ContentRail
                                title="Continue Watching"
                                items={homeContinueWatching}
                                onDetails={handleDetails}
                                onPlay={handlePlay}
                            />
                        )}

                        {/* Personalized Recommendations Rail ("Recommended For You") */}
                        {homePersonalized.recommendations.length > 0 && (
                            <ContentRail
                                title="Recommended For You"
                                items={homePersonalized.recommendations}
                                onDetails={handleDetails}
                                onPlay={handlePlay}
                                badge="✨ Top Picks For You"
                                subtitle={
                                    userFavoriteGenres.length > 0
                                        ? `Curated from your watch history & ${userFavoriteGenres.length} favourite ${userFavoriteGenres.length === 1 ? 'genre' : 'genres'}`
                                        : (homeContinueWatching.length > 0
                                            ? 'Curated from your recent watch history'
                                            : 'Tailored suggestions based on trending and top-rated titles')
                                }
                                actionButton={
                                    <button
                                        onClick={() => setShowGenreModal(true)}
                                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/15 text-gray-300 hover:text-white border border-white/10 flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm"
                                    >
                                        <SlidersHorizontal size={13} />
                                        <span>Tune Taste</span>
                                    </button>
                                }
                            />
                        )}

                        {/* "Because You Watched [Title]" Rail */}
                        {becauseYouWatched && becauseYouWatched.recommendations.length > 0 && (
                            <ContentRail
                                title={`Because You Watched ${becauseYouWatched.sourceItem.title}`}
                                items={becauseYouWatched.recommendations}
                                onDetails={handleDetails}
                                onPlay={handlePlay}
                                badge="🎯 Watch Next"
                                subtitle={`Similar to ${becauseYouWatched.sourceItem.title}`}
                            />
                        )}

                        {/* Dedicated Rails for User's Explicit Favorite Genres */}
                        {favoriteGenreRails.map(({ genre, items }) => (
                            <ContentRail
                                key={genre}
                                title={`Because You Love ${genre}`}
                                items={items}
                                onDetails={handleDetails}
                                onPlay={handlePlay}
                                badge="❤️ Favourite Genre"
                                subtitle={`Top picks in ${genre} handpicked for you`}
                            />
                        ))}

                        {homeUserAdded.length > 0 && (
                            <ContentRail
                                title="Recently Added by Users"
                                items={homeUserAdded}
                                onDetails={handleDetails}
                                onPlay={handlePlay}
                            />
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

                    <div className="relative z-10 pl-4 md:pl-12 -mt-12 md:-mt-32 space-y-4 md:space-y-6">
                        {moviePersonalized.recommendations.length > 0 && (
                            <ContentRail
                                title="Recommended Movies For You"
                                items={moviePersonalized.recommendations}
                                onDetails={handleDetails}
                                onPlay={handlePlay}
                                badge="✨ Tailored Movies"
                                subtitle={
                                    userFavoriteGenres.length > 0
                                        ? `Based on your watch history & ${userFavoriteGenres.join(', ')}`
                                        : 'Personalized movie picks matching your taste'
                                }
                                actionButton={
                                    <button
                                        onClick={() => setShowGenreModal(true)}
                                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/15 text-gray-300 hover:text-white border border-white/10 flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm"
                                    >
                                        <SlidersHorizontal size={13} />
                                        <span>Tune Taste</span>
                                    </button>
                                }
                            />
                        )}

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

                    <div className="relative z-10 pl-4 md:pl-12 -mt-12 md:-mt-32 space-y-4 md:space-y-6">
                        {tvPersonalized.recommendations.length > 0 && (
                            <ContentRail
                                title="Recommended Shows For You"
                                items={tvPersonalized.recommendations}
                                onDetails={handleDetails}
                                onPlay={handlePlay}
                                badge="✨ Tailored Shows"
                                subtitle={
                                    userFavoriteGenres.length > 0
                                        ? `Based on your watch history & ${userFavoriteGenres.join(', ')}`
                                        : 'Personalized series & TV picks matching your taste'
                                }
                                actionButton={
                                    <button
                                        onClick={() => setShowGenreModal(true)}
                                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/15 text-gray-300 hover:text-white border border-white/10 flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm"
                                    >
                                        <SlidersHorizontal size={13} />
                                        <span>Tune Taste</span>
                                    </button>
                                }
                            />
                        )}

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
                        <video
                            src="/Anime.mp4"
                            autoPlay
                            loop
                            muted
                            playsInline
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

        if (activeTab === 'categories' || activeTab === 'category') {
            return <CategoriesPage onDetails={handleDetails} onPlay={handlePlay} />;
        }

        if (activeTab === 'account') {
            if (!isAuthenticated) return <Navigate to="/home" />;
            return <AccountSettings setActiveTab={handleTabChange} />;
        }

        // If currently playing content or viewing browse modal, do NOT redirect URL!
        if (isModalRoute) {
            return null;
        }

        return <Navigate to="/" replace />;
    };

    if (isLoading) {
        return <Loader />;
    }

    // Force Profile Selection if logged in but no profile selected
    if (isAuthenticated && !currentProfile) {
        return (
            <ProfileSelection />
        );
    }

    return (
        <div className="bg-[#141414] min-h-screen text-white font-sans selection:bg-red-600 selection:text-white">

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



            {viewingContent && location.pathname.startsWith('/browse/') && (
                <ContentDetails
                    content={viewingContent}
                    onClose={handleCloseDetails}
                    onPlay={handlePlay}
                    onDetails={handleDetails}
                />
            )}

            {playingContent && location.pathname.startsWith('/watch/') && (
                <VideoPlayer
                    content={playingContent}
                    onClose={handleClosePlayer}
                />
            )}
            <UnlockContentModal
                isOpen={showUnlockModal}
                onClose={() => setShowUnlockModal(false)}
            />
            {showGenreModal && (
                <GenrePreferenceModal
                    isOpen={showGenreModal}
                    onClose={() => setShowGenreModal(false)}
                />
            )}

        </div>
    );
};

const AppRoutes = () => {
    const { currentUser, isLoading, isAuthenticated } = useStore();
    const navigate = useNavigate();

    const isAlreadyLoggedIn = !isLoading && isAuthenticated && currentUser && !currentUser.isGuest;

    return (
        <Routes>
            <Route
                path="/login"
                element={
                    isLoading ? (
                        <Loader />
                    ) : isAlreadyLoggedIn ? (
                        <Navigate to="/" replace />
                    ) : (
                        <LoginPage />
                    )
                }
            />
            <Route path="/scan" element={<MobileScannerPage />} />
            <Route path="/adblocker" element={<AdblockerGuidePage />} />
            <Route path="/adblockers" element={<Navigate to="/adblocker" replace />} />
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
            <ScrollToTop />
            <AppRoutes />
        </StoreProvider>
    );
}
