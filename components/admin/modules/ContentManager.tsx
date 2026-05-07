import React, { useState, useMemo, useRef } from 'react';
import { Plus, Edit, Trash2, Youtube, HardDrive, Star, Check, X, Bell, ChevronDown, ChevronRight, Play, Lock, Search, Filter, MoreVertical, Archive, Sparkles, Loader2 } from 'lucide-react';
import { useStore } from '../../../context/StoreContext';
import { Content, Season, Episode } from '../../../types';
import { doc, setDoc, deleteDoc, updateDoc, collection, addDoc, deleteField, writeBatch, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase';
import {
    searchTMDB, fetchTMDBDetails, tmdbPosterUrl, tmdbBackdropUrl,
    mapTMDBGenres, mapTMDBRating, formatRuntime,
    TMDBSearchResult, fetchTMDBSeason, tmdbStillUrl, extractTMDBTrailer,
    fetchTMDBEpisode, extractTMDBEpisodeVideo
} from '../../../services/tmdbService';

const MOVIE_GENRES = ["Action", "Adventure", "Comedy", "Drama", "Horror", "Sci-Fi", "Thriller", "Romance", "Documentary", "Animation"];
const TV_GENRES = ["Drama", "Comedy", "Reality", "Action", "Sci-Fi", "Documentary", "Kids", "Mystery"];

const ContentManager = () => {
    const { content, rawContent, settings, updateSettings, publishCatalog } = useStore();
    const [isEditing, setIsEditing] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncProgress, setSyncProgress] = useState(0);

    // Filters & Search
    const [filterType, setFilterType] = useState<'ALL' | 'movie' | 'tv'>('ALL');
    const [filterStatus, setFilterStatus] = useState<'ALL' | 'published' | 'draft'>('ALL');
    const [searchQuery, setSearchQuery] = useState('');

    // TMDB Auto-Fetch State
    const [tmdbQuery, setTmdbQuery] = useState('');
    const [tmdbResults, setTmdbResults] = useState<TMDBSearchResult[]>([]);
    const [tmdbLoading, setTmdbLoading] = useState(false);
    const [tmdbFilled, setTmdbFilled] = useState(false);
    const [tmdbError, setTmdbError] = useState('');
    const tmdbSearchRef = useRef<HTMLDivElement>(null);

    // Bulk Selection
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [bulkFastMode, setBulkFastMode] = useState(false);
    const [skipEpisodeVideos, setSkipEpisodeVideos] = useState(false);

    const [formData, setFormData] = useState<Partial<Content>>({});

    // Manage expanded season in UI
    const [expandedSeasonId, setExpandedSeasonId] = useState<string | null>(null);
    const [expandedEpisodeId, setExpandedEpisodeId] = useState<string | null>(null);

    // Reset Form
    const resetForm = (type: 'movie' | 'tv' = 'movie') => {
        setFormData({
            type,
            genres: [],
            isPublished: false,
            allowDownload: true,
            allowPlayback: true,
            comingSoon: false,
            vote_average: 0,
            duration: '',
            rating: 'U/A 13+',
            resolution: 'HD',
            seasons: []
        });
        setIsEditing(true);
        setExpandedSeasonId(null);
        setExpandedEpisodeId(null);
        setTmdbQuery('');
        setTmdbResults([]);
        setTmdbFilled(false);
        setTmdbError('');
    };

    // TMDB Search Handler
    const handleTMDBSearch = async () => {
        if (!tmdbQuery.trim()) return;
        setTmdbLoading(true);
        setTmdbError('');
        setTmdbResults([]);
        try {
            const results = await searchTMDB(tmdbQuery, formData.type === 'tv' ? 'tv' : 'movie');
            setTmdbResults(results);
            if (results.length === 0) setTmdbError('No results found. Try a different title.');
        } catch (e: any) {
            setTmdbError(e.message || 'TMDB search failed');
        } finally {
            setTmdbLoading(false);
        }
    };

    // TMDB Auto-Fill Handler
    const handleTMDBAutofill = async (result: TMDBSearchResult) => {
        setTmdbLoading(true);
        setTmdbResults([]);
        try {
            const type = formData.type === 'tv' ? 'tv' : 'movie';
            const detail = await fetchTMDBDetails(result.id, type);

            const title = detail.title || detail.name || '';
            const releaseDate = detail.release_date || detail.first_air_date || '';
            const genres = mapTMDBGenres([], detail.genres);
            const cast = detail.credits?.cast
                .sort((a, b) => a.order - b.order)
                .slice(0, 6)
                .map(a => a.name) || [];
            const runtime = type === 'movie'
                ? formatRuntime(detail.runtime)
                : detail.episode_run_time?.[0] ? `${detail.episode_run_time[0]}m` : '';
            const rating = mapTMDBRating(detail, type);
            const poster = tmdbPosterUrl(detail.poster_path, 'w500');
            const backdrop = tmdbBackdropUrl(detail.backdrop_path, 'w1280');

            // Find visually distinct mobile poster (different file_path than primary)
            const altPosterPath = detail.images?.posters?.find(p => p.file_path !== detail.poster_path)?.file_path;
            const posterMobile = tmdbPosterUrl(altPosterPath || detail.poster_path, 'w342');

            // Find visually distinct mobile backdrop (different file_path than primary)
            const altBackdropPath = detail.images?.backdrops?.find(b => b.file_path !== detail.backdrop_path)?.file_path;
            const backdropMobile = tmdbBackdropUrl(altBackdropPath || detail.backdrop_path, 'w780');

            const trailerId = extractTMDBTrailer(detail);
            const imdbId = detail.external_ids?.imdb_id || (detail as any).imdb_id || '';

            let newSeasons = formData.seasons || [];

            // If TV, check for seasons and episodes
            if (type === 'tv' && detail.seasons && newSeasons.length === 0) {
                // Fetch each valid season details (skip specials)
                const validSeasons = detail.seasons.filter(s => s.season_number > 0);

                const seasonPromises = validSeasons.map(vs => fetchTMDBSeason(detail.id, vs.season_number).catch(() => null));
                const resolvedSeasons = await Promise.all(seasonPromises);

                newSeasons = await Promise.all(resolvedSeasons.filter(Boolean).map(async (seasonData, index) => {
                    const seasonTrailerId = extractTMDBTrailer(seasonData!);

                    const seasonTMDBId = seasonData!.id;

                    const totalEpisodes = (seasonData!.episodes || []).length;
                    const episodesToFetch = (seasonData!.episodes || []).slice(0, 5000);
                    const episodeDetails: any[] = [];

                    // Thinning Strategy: To avoid Firestore 1MB limit for massive shows (4000+ episodes)
                    // We omit episode-level overviews if total episodes > 500
                    const shouldThinData = totalEpisodes > 500;

                    // Only fetch episode details if not skipping videos
                    if (!skipEpisodeVideos) {
                        // Batch fetching (15 at a time) to avoid TMDB rate limits while being faster
                        for (let i = 0; i < episodesToFetch.length; i += 15) {
                            const batch = episodesToFetch.slice(i, i + 15);
                            const results = await Promise.all(
                                batch.map(ep => fetchTMDBEpisode(detail.id, seasonData!.season_number, ep.episode_number).catch(() => null))
                            );
                            episodeDetails.push(...results);
                            // Smaller delay for faster processing, but still safe against TMDB 40 req/10s
                            if (i + 15 < episodesToFetch.length) await new Promise(r => setTimeout(r, 150));
                        }
                    } else {
                        // Just use basic data from season fetch
                        episodeDetails.push(...episodesToFetch);
                    }

                    return {
                        id: `season_${Date.now()}_${index}`,
                        tmdbId: seasonTMDBId,
                        seasonNumber: seasonData!.season_number,
                        title: seasonData!.name || `Season ${seasonData!.season_number}`,
                        trailerYoutubeId: seasonTrailerId || '',
                        episodes: (seasonData!.episodes || []).map((ep, epIndex) => {
                            const epDetail = episodeDetails.find(d => d && d.episode_number === ep.episode_number);
                            const epYoutubeId = epDetail ? extractTMDBEpisodeVideo(epDetail) : '';

                            return {
                                id: `ep_${Date.now()}_${index}_${epIndex}`,
                                episodeNumber: ep.episode_number,
                                title: ep.name || `Episode ${ep.episode_number}`,
                                overview: shouldThinData ? undefined : ep.overview, // Data Thinning
                                stillUrl: tmdbStillUrl(ep.still_path, 'w300'),
                                duration: ep.runtime ? `${ep.runtime}m` : runtime,
                                youtubeId: epYoutubeId || '',
                            };
                        })
                    };
                }));
            }

            setFormData(prev => ({
                ...prev,
                // Only fill fields that are currently empty — never overwrite existing data
                title: prev.title || title,
                tmdbId: result.id,
                imdbId: prev.imdbId || imdbId,
                overview: prev.overview || detail.overview || '',
                poster_path: prev.poster_path || poster,
                backdrop_path: prev.backdrop_path || backdrop,
                poster_path_mobile: prev.poster_path_mobile || posterMobile,
                backdrop_path_mobile: prev.backdrop_path_mobile || backdropMobile,
                youtubeId: prev.youtubeId || trailerId || '',
                release_date: prev.release_date || releaseDate.split('T')[0],
                vote_average: prev.vote_average || Math.round(detail.vote_average * 10) / 10,
                genres: (prev.genres && prev.genres.length > 0) ? prev.genres : genres,
                cast: (prev.cast && (prev.cast as string[]).length > 0) ? prev.cast : cast,
                duration: prev.duration || runtime,
                rating: prev.rating || rating,
                videoUrl: prev.videoUrl || `https://www.playimdb.com/title/${imdbId || result.id}/`,
                seasons: type === 'tv' ? newSeasons : prev.seasons,
            }));

            setTmdbFilled(true);
            setTmdbQuery(title);
        } catch (e: any) {
            setTmdbError(e.message || 'Failed to fetch details');
        } finally {
            setTmdbLoading(false);
        }
    };

    // ID Extractors
    const extractYoutubeId = (url: string) => {
        if (!url) return '';
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : url;
    };

    const extractDriveId = (url: string) => {
        if (!url) return '';
        const regExp = /[-\w]{25,}/;
        const match = url.match(regExp);
        return match ? match[0] : url;
    };

    const extractVideoUrl = (url: string) => {
        if (!url) return '';
        const iframeMatch = url.match(/<iframe.*?src=["'](.*?)["']/);
        return iframeMatch ? iframeMatch[1] : url;
    };

    // --- Season & Episode Handlers ---
    const addSeason = () => {
        const newSeason: Season = {
            id: `season_${Date.now()}`,
            seasonNumber: (formData.seasons?.length || 0) + 1,
            title: `Season ${(formData.seasons?.length || 0) + 1}`,
            episodes: []
        };
        setFormData(prev => ({ ...prev, seasons: [...(prev.seasons || []), newSeason] }));
    };

    const deleteSeason = (seasonId: string) => {
        if (confirm("Delete this season?")) {
            setFormData(prev => ({ ...prev, seasons: prev.seasons?.filter(s => s.id !== seasonId) }));
        }
    };

    const updateSeason = (seasonId: string, updates: Partial<Season>) => {
        setFormData(prev => ({
            ...prev,
            seasons: prev.seasons?.map(s => s.id === seasonId ? { ...s, ...updates } : s)
        }));
    };

    const addEpisode = (seasonId: string) => {
        const season = formData.seasons?.find(s => s.id === seasonId);
        if (!season) return;

        const newEpisode: Episode = {
            id: `ep_${Date.now()}`,
            episodeNumber: (season.episodes.length || 0) + 1,
            title: `Episode ${(season.episodes.length || 0) + 1}`,
            driveId: '',
            duration: ''
        };

        const updatedSeason = { ...season, episodes: [...season.episodes, newEpisode] };
        updateSeason(seasonId, { episodes: updatedSeason.episodes });
    };

    const updateEpisode = (seasonId: string, episodeId: string, updates: Partial<Episode>) => {
        setFormData(prev => ({
            ...prev,
            seasons: prev.seasons?.map(s => {
                if (s.id !== seasonId) return s;
                return {
                    ...s,
                    episodes: s.episodes.map(e => e.id === episodeId ? { ...e, ...updates } : e)
                };
            })
        }));
    };

    const deleteEpisode = (seasonId: string, episodeId: string) => {
        setFormData(prev => ({
            ...prev,
            seasons: prev.seasons?.map(s => {
                if (s.id !== seasonId) return s;
                return { ...s, episodes: s.episodes.filter(e => e.id !== episodeId) };
            })
        }));
    };



    const handleSave = async () => {
        if (!formData.title || !formData.poster_path) {
            alert("Title and Poster are required");
            return;
        }

        try {
            const id = formData.id || `content_${Date.now()}`;
            const now = new Date().toISOString();

            // Clean Data
            const finalData: Content = {
                id,
                tmdbId: Number(formData.tmdbId) || undefined,
                imdbId: formData.imdbId || '',
                title: formData.title,
                overview: formData.overview || '',
                poster_path: formData.poster_path,
                poster_path_mobile: formData.poster_path_mobile || undefined,
                backdrop_path: formData.backdrop_path || formData.poster_path,
                backdrop_path_mobile: formData.backdrop_path_mobile || undefined,
                youtubeId: extractYoutubeId(formData.youtubeId || ''),
                movieDriveId: formData.type === 'movie' ? extractDriveId(formData.movieDriveId || '') : undefined,
                movieYoutubeId: formData.type === 'movie' ? extractYoutubeId(formData.movieYoutubeId || '') : undefined,
                videoUrl: formData.videoUrl || '',
                imdbId: formData.imdbId || '',
                tmdbId: formData.tmdbId || null,
                type: formData.type || 'movie',
                genres: formData.genres || [],
                release_date: formData.release_date || now.split('T')[0],
                vote_average: Number(formData.vote_average) || 0,
                isPublished: formData.isPublished || false,
                allowDownload: formData.allowDownload ?? true,
                allowPlayback: formData.allowPlayback ?? true,
                cast: typeof formData.cast === 'string' ? (formData.cast as string).split(',').map(s => s.trim()) : (formData.cast || []),
                tags: typeof formData.tags === 'string' ? (formData.tags as string).split(',').map(s => s.trim()) : (formData.tags || []),
                comingSoon: formData.comingSoon || false,
                createdAt: formData.createdAt || now,
                featured: formData.featured || false,

                duration: formData.duration,
                rating: formData.rating || 'U/A 13+',
                resolution: formData.resolution || 'HD',
                accessCode: formData.accessCode || undefined,
                // Sanitize Seasons/Episodes
                seasons: formData.type === 'tv' ? (formData.seasons || []).map(s => ({
                    ...s,
                    trailerYoutubeId: extractYoutubeId(s.trailerYoutubeId || ''),
                    episodes: s.episodes.map(e => ({
                        ...e,
                        driveId: extractDriveId(e.driveId || '')
                    }))
                })) : []
            };

            // Sanitize data
            const dataToSave = JSON.parse(JSON.stringify(finalData));
            await setDoc(doc(db, 'content', id), dataToSave);

            // Increment DB Version to trigger client reuse/fetch
            await setDoc(doc(db, 'settings', 'global'), {
                contentVersion: (settings.contentVersion || 0) + 1
            }, { merge: true });

            // Notification for new content
            if (!formData.id && finalData.isPublished) {
                await addDoc(collection(db, 'notifications'), {
                    title: `New Arrival: ${finalData.title}`,
                    message: `Watch ${finalData.title} now on My Donkey!`,
                    image: finalData.poster_path,
                    type: 'content',
                    link: `/browse/${id}`,
                    createdAt: now,
                    read: false
                });
            }

            alert("Content saved successfully!");
            setIsEditing(false);
            setFormData({});
            
            // Background publish catalog
            publishCatalog();
        } catch (e: any) {
            console.error(e);
            alert("Error saving content: " + e.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this content?")) {
            await deleteDoc(doc(db, 'content', id));
            publishCatalog();
        }
    };

    const toggleHero = async (id: string) => {
        if (settings.heroContentId === id) {
            await updateSettings({ heroContentId: deleteField() as any });
        } else {
            await updateSettings({ heroContentId: id });
        }
    };

    const handleSyncAll = async () => {
        const itemsToSync = rawContent.filter(c => c.tmdbId);
        if (itemsToSync.length === 0) {
            alert("No content with TMDB IDs found to sync.");
            return;
        }

        if (!confirm(`Sync and refresh metadata for ${itemsToSync.length} items from TMDB? This will overwrite existing metadata fields (genres, cast, poster, trailer, etc.) with fresh data.`)) return;

        setIsSyncing(true);
        setSyncProgress(0);
        let successCount = 0;

        try {
            for (let i = 0; i < itemsToSync.length; i++) {
                const item = itemsToSync[i];
                try {
                    const detail = await fetchTMDBDetails(item.tmdbId!, item.type as 'movie' | 'tv');

                    const releaseDate = detail.release_date || detail.first_air_date || '';
                    const year = releaseDate ? parseInt(releaseDate.split('-')[0]) : 0;
                    const trailerId = extractTMDBTrailer(detail) || item.youtubeId || '';

                    const imdbId = detail.external_ids?.imdb_id || (detail as any).imdb_id || '';
                    let videoUrl = item.videoUrl;

                    // Only update videoUrl if it's currently empty or already a playimdb link
                    if (!videoUrl || videoUrl.includes('playimdb.com')) {
                        videoUrl = `https://www.playimdb.com/title/${imdbId || item.tmdbId}/`;
                    }

                    const updates: any = {
                        overview: detail.overview || item.overview,
                        poster_path: tmdbPosterUrl(detail.poster_path, 'w500') || item.poster_path,
                        backdrop_path: tmdbBackdropUrl(detail.backdrop_path, 'w1280') || item.backdrop_path,
                        vote_average: Math.round(detail.vote_average * 10) / 10,
                        genres: mapTMDBGenres([], detail.genres),
                        cast: detail.credits?.cast?.slice(0, 10).map((c: any) => c.name) || item.cast,
                        release_date: releaseDate || item.release_date,
                        year: year || item.year,
                        youtubeId: trailerId,
                        videoUrl: videoUrl,
                        imdbId: imdbId || item.imdbId || '',
                        updatedAt: new Date().toISOString()
                    };

                    await updateDoc(doc(db, 'content', item.id), updates);
                    successCount++;
                } catch (err) {
                    console.error(`Failed to sync ${item.title}:`, err);
                }

                setSyncProgress(Math.round(((i + 1) / itemsToSync.length) * 100));

                // TMDB rate limit protection
                if ((i + 1) % 20 === 0) {
                    await new Promise(r => setTimeout(r, 2000));
                } else {
                    await new Promise(r => setTimeout(r, 150));
                }
            }

            // Global refresh
            await setDoc(doc(db, 'settings', 'global'), {
                contentVersion: (settings.contentVersion || 0) + 1
            }, { merge: true });

            alert(`Sync completed! Successfully updated ${successCount} items.`);
            publishCatalog();
        } catch (error: any) {
            alert("Sync failed: " + error.message);
        } finally {
            setIsSyncing(false);
            setSyncProgress(0);
        }
    };

    // --- Bulk Actions ---
    const toggleSelection = (id: string) => {
        setSelectedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Delete ${selectedItems.length} items? This cannot be undone.`)) return;
        const batch = writeBatch(db);
        selectedItems.forEach(id => {
            batch.delete(doc(db, 'content', id));
        });
        await batch.commit();
        publishCatalog();
        setSelectedItems([]);
    };

    const handleBulkPublish = async (status: boolean) => {
        const batch = writeBatch(db);
        selectedItems.forEach(id => {
            batch.update(doc(db, 'content', id), { isPublished: status });
        });
        await batch.commit();
        publishCatalog();
        setSelectedItems([]);
    };

    // --- Filtering Logic ---
    const filteredContent = useMemo(() => {
        return rawContent.filter(item => {
            // Type Filter
            if (filterType !== 'ALL' && item.type !== filterType) return false;

            // Status Filter
            if (filterStatus === 'published' && !item.isPublished) return false;
            if (filterStatus === 'draft' && item.isPublished) return false;

            // Search Filter
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                return item.title.toLowerCase().includes(q) ||
                    item.genres.some(g => g.toLowerCase().includes(q)) ||
                    item.tags?.some(t => t.toLowerCase().includes(q));
            }
            return true;
        });
    }, [rawContent, filterType, filterStatus, searchQuery]);

    if (isEditing) {
        return (
            <div className="bg-[#141414] p-6 rounded-xl border border-white/5 animate-in fade-in max-h-[90vh] overflow-y-auto">
                {/* Form Header */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        {formData.id ? 'Edit Content' : 'Add New Content'}
                        <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-gray-500 font-mono">v1.2</span>
                        {tmdbFilled && (
                            <span className="text-[10px] bg-blue-500/20 border border-blue-500/40 text-blue-400 px-2 py-0.5 rounded flex items-center gap-1">
                                <Sparkles size={10} /> TMDB Auto-filled
                            </span>
                        )}
                    </h2>
                    <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-white/10 rounded"><X /></button>
                </div>

                {/* TMDB Auto-Fetch Panel */}
                <div className="mb-6 bg-gradient-to-r from-blue-950/40 to-purple-950/30 border border-blue-500/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Sparkles size={16} className="text-blue-400" />
                        <span className="text-sm font-bold text-blue-300">Auto-fill from TMDB</span>
                        <span className="text-[10px] text-gray-500">
                            {import.meta.env.VITE_TMDB_API_KEY ? '' : '⚠ Add VITE_TMDB_API_KEY to .env'}
                        </span>
                    </div>
                    <div className="flex gap-2" ref={tmdbSearchRef}>
                        <input
                            className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 placeholder:text-gray-600 transition"
                            placeholder={`Search ${formData.type === 'tv' ? 'TV show' : 'movie'} title on TMDB...`}
                            value={tmdbQuery}
                            autoComplete="off"
                            autoCorrect="off"
                            spellCheck="false"
                            onChange={e => { setTmdbQuery(e.target.value); setTmdbFilled(false); }}
                            onKeyDown={e => e.key === 'Enter' && handleTMDBSearch()}
                        />
                        <button
                            onClick={handleTMDBSearch}
                            disabled={tmdbLoading || !tmdbQuery.trim()}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-bold transition shadow-lg shadow-blue-900/30"
                        >
                            {tmdbLoading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
                            {tmdbLoading ? 'Searching…' : 'Search'}
                        </button>
                    </div>
                    <div className="flex items-center gap-4 mt-2 mb-3">
                        <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer hover:text-white transition group">
                            <input
                                type="checkbox"
                                checked={skipEpisodeVideos}
                                onChange={(e) => setSkipEpisodeVideos(e.target.checked)}
                                className="rounded border-white/10 bg-black text-blue-600 focus:ring-blue-500"
                            />
                            Skip Episode Videos (Faster Autofill)
                        </label>
                    </div>
                    {/* Error */}
                    {tmdbError && (
                        <p className="text-xs text-red-400 mt-2 flex items-center gap-1"><X size={12} />{tmdbError}</p>
                    )}

                    {/* Results Dropdown */}
                    {tmdbResults.length > 0 && (
                        <div className="mt-3 space-y-2 max-h-72 overflow-y-auto pr-1">
                            {tmdbResults.map(result => (
                                <div
                                    key={result.id}
                                    className="flex items-center gap-3 bg-black/40 hover:bg-white/5 border border-white/5 hover:border-blue-500/30 rounded-lg p-2.5 transition group cursor-pointer"
                                >
                                    {/* Poster thumbnail */}
                                    <div className="w-10 h-14 rounded overflow-hidden flex-shrink-0 bg-white/10">
                                        {(result.poster_path) ? (
                                            <img
                                                src={`https://image.tmdb.org/t/p/w92${result.poster_path}`}
                                                alt={result.title || result.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-600 text-[10px]">N/A</div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-sm text-white truncate">{result.title || result.name}</div>
                                        <div className="text-[11px] text-gray-400">
                                            {(result.release_date || result.first_air_date || '').slice(0, 4)}
                                            {result.vote_average > 0 && (
                                                <span className="ml-2 text-yellow-400">★ {result.vote_average.toFixed(1)}</span>
                                            )}
                                        </div>
                                        <div className="text-[11px] text-gray-600 line-clamp-1">{result.overview}</div>
                                    </div>

                                    {/* Use This Button */}
                                    <button
                                        onClick={() => handleTMDBAutofill(result)}
                                        className="flex-shrink-0 text-xs font-bold bg-blue-600/80 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg transition opacity-80 group-hover:opacity-100"
                                    >
                                        Use This
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs text-gray-500 uppercase font-bold">Title</label>
                            <input className="w-full bg-black/50 border border-white/10 rounded p-2 outline-none focus:border-red-600"
                                value={formData.title || ''}
                                onChange={e => {
                                    setFormData({ ...formData, title: e.target.value });
                                    setTmdbQuery(e.target.value); // Keep TMDB search in sync
                                }} />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 uppercase font-bold">Overview</label>
                            <textarea className="w-full bg-black/50 border border-white/10 rounded p-2 outline-none focus:border-red-600 h-24"
                                value={formData.overview || ''} onChange={e => setFormData({ ...formData, overview: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-gray-500 uppercase font-bold">Type</label>
                                <select className="w-full bg-black/50 border border-white/10 rounded p-2 outline-none"
                                    value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value as 'movie' | 'tv' })}>
                                    <option value="movie">Movie</option>
                                    <option value="tv">TV Series</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 uppercase font-bold">Release Date</label>
                                <input type="date" className="w-full bg-black/50 border border-white/10 rounded p-2 outline-none"
                                    value={formData.release_date || ''} onChange={e => setFormData({ ...formData, release_date: e.target.value })} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {formData.type?.toLowerCase() === 'movie' && (
                                <div>
                                    <label className="text-xs text-gray-500 uppercase font-bold flex justify-between">
                                        Duration
                                        <span className="text-[10px] text-blue-400 font-normal normal-case">Auto-calcs on play</span>
                                    </label>
                                    <input className="w-full bg-black/50 border border-white/10 rounded p-2 outline-none font-mono placeholder:text-gray-700"
                                        value={formData.duration || ''} onChange={e => setFormData({ ...formData, duration: e.target.value })}
                                        placeholder="Auto (or type manually)" />
                                </div>
                            )}
                            <div>
                                <label className="text-xs text-gray-500 uppercase font-bold">Age Rating</label>
                                <select className="w-full bg-black/50 border border-white/10 rounded p-2 outline-none"
                                    value={formData.rating || 'U/A 13+'} onChange={e => setFormData({ ...formData, rating: e.target.value })}>
                                    <option value="U">U (Universal)</option>
                                    <option value="U/A 7+">U/A 7+</option>
                                    <option value="U/A 13+">U/A 13+</option>
                                    <option value="U/A 16+">U/A 16+</option>
                                    <option value="A (18+)">A (18+)</option>

                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-gray-500 uppercase font-bold">TMDB ID</label>
                                <input type="number" className="w-full bg-black/50 border border-white/10 rounded p-2 outline-none font-mono text-sm"
                                    value={formData.tmdbId || ''} onChange={e => setFormData({ ...formData, tmdbId: Number(e.target.value) })} />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 uppercase font-bold">IMDb ID (ttXXXXX)</label>
                                <input className="w-full bg-black/50 border border-white/10 rounded p-2 outline-none font-mono text-sm"
                                    value={formData.imdbId || ''} onChange={e => setFormData({ ...formData, imdbId: e.target.value })} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-gray-500 uppercase font-bold">Quality Label</label>
                                <select className="w-full bg-black/50 border border-white/10 rounded p-2 outline-none"
                                    value={formData.resolution || 'HD'} onChange={e => setFormData({ ...formData, resolution: e.target.value as any })}>
                                    <option value="4K">4K Ultra HD</option>
                                    <option value="HD">HD (1080p)</option>
                                    <option value="SD">SD (Standard)</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 uppercase font-bold">Match Score (0-10)</label>
                                <input type="number" min="0" max="10" step="0.1" className="w-full bg-black/50 border border-white/10 rounded p-2 outline-none"
                                    value={formData.vote_average || 0} onChange={e => setFormData({ ...formData, vote_average: Number(e.target.value) })} />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 uppercase font-bold">Cast (comma separated)</label>
                            <input className="w-full bg-black/50 border border-white/10 rounded p-2 outline-none"
                                value={Array.isArray(formData.cast) ? formData.cast.join(', ') : formData.cast || ''}
                                onChange={e => setFormData({ ...formData, cast: e.target.value as any })} />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 uppercase font-bold">Tags (comma separated)</label>
                            <input className="w-full bg-black/50 border border-white/10 rounded p-2 outline-none"
                                value={Array.isArray(formData.tags) ? formData.tags.join(', ') : formData.tags || ''}
                                onChange={e => setFormData({ ...formData, tags: e.target.value as any })} />
                        </div>
                    </div>

                    <div className="space-y-4">
                        {/* Simplified Image Fields - One for PC, One for Mobile */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs text-gray-500 uppercase font-bold flex items-center gap-2">
                                    🖥️ Image URL (Desktop/PC)
                                </label>
                                <input
                                    className="w-full bg-black/50 border border-white/10 rounded p-2.5 outline-none focus:border-blue-500 transition"
                                    placeholder="Paste image link for PC users"
                                    value={formData.poster_path || ''}
                                    onChange={e => setFormData({
                                        ...formData,
                                        poster_path: e.target.value,
                                        backdrop_path: e.target.value // Same image for backdrop
                                    })}
                                />
                                {formData.poster_path && (
                                    <img src={formData.poster_path} className="w-full h-24 object-cover rounded border border-white/10" alt="Preview" />
                                )}
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs text-gray-500 uppercase font-bold flex items-center gap-2">
                                    📱 Image URL (Mobile) <span className="text-gray-600 font-normal normal-case">Optional</span>
                                </label>
                                <input
                                    className="w-full bg-black/50 border border-white/10 rounded p-2.5 outline-none focus:border-blue-500 transition placeholder:text-gray-600"
                                    placeholder="Leave empty to use PC image"
                                    value={formData.poster_path_mobile || ''}
                                    onChange={e => setFormData({
                                        ...formData,
                                        poster_path_mobile: e.target.value,
                                        backdrop_path_mobile: e.target.value // Same image for backdrop
                                    })}
                                />
                                {formData.poster_path_mobile && (
                                    <img src={formData.poster_path_mobile} className="w-full h-24 object-cover rounded border border-white/10" alt="Mobile Preview" />
                                )}
                            </div>
                        </div>

                        {/* Common Youtube (Trailer for Movie, Main Trailer for TV) */}
                        <div>
                            <label className="text-xs text-gray-500 uppercase font-bold flex items-center gap-2"><Youtube size={14} /> {formData.type === 'movie' ? 'Trailer YouTube ID' : 'Series Trailer ID'}</label>
                            <input className="w-full bg-black/50 border border-white/10 rounded p-2 outline-none"
                                value={formData.youtubeId || ''} onChange={e => setFormData({ ...formData, youtubeId: e.target.value })}
                                placeholder="Link or ID" />
                        </div>

                        {/* Movie Specific - Smart Source Input */}
                        {formData.type === 'movie' && (
                            <div>
                                <label className="text-xs text-gray-500 uppercase font-bold flex items-center gap-2 mt-4">Movie Source (Drive or YouTube)</label>
                                <input className="w-full bg-black/50 border border-white/10 rounded p-2 outline-none"
                                    value={formData.movieDriveId || formData.movieYoutubeId || ''}
                                    onChange={e => {
                                        const val = e.target.value;
                                        if (extractYoutubeId(val).length === 11) {
                                            setFormData({ ...formData, movieYoutubeId: val, movieDriveId: '' });
                                        } else {
                                            setFormData({ ...formData, movieDriveId: val, movieYoutubeId: '' });
                                        }
                                    }}
                                    placeholder="Paste Drive Link or YouTube Link" />
                            </div>
                        )}

                        <div>
                            <label className="text-xs text-gray-500 uppercase font-bold flex items-center gap-2 mt-4">Player Video URL (Optional)</label>
                            <div className="text-[10px] text-gray-400 mb-1">Overrides the primary source for playback. Useful for PlayIMDb links or direct MP4/HLS links.</div>
                            <input className="w-full bg-black/50 border border-white/10 rounded p-2 outline-none font-mono text-sm"
                                value={formData.videoUrl || ''}
                                onChange={e => setFormData({ ...formData, videoUrl: extractVideoUrl(e.target.value) })}
                                placeholder="https://www.playimdb.com/title/ttXXXXX/" />
                        </div>

                        {/* Video Preview */}
                        {(extractYoutubeId(formData.youtubeId || '').length === 11 || (formData.movieYoutubeId && extractYoutubeId(formData.movieYoutubeId).length === 11) || (formData.movieDriveId && extractDriveId(formData.movieDriveId)) || formData.videoUrl) && (
                            <div className="mt-4 bg-black/50 rounded-lg p-2 border border-white/10 h-40 overflow-hidden relative">
                                <div className="absolute top-2 left-2 bg-black/60 px-2 py-1 rounded text-xs text-white z-10">
                                    {formData.videoUrl ? 'Direct Video URL' : formData.movieDriveId ? 'Drive Source' : formData.movieYoutubeId ? 'YouTube Movie' : 'Trailer'}
                                </div>
                                {formData.videoUrl ? (
                                    <iframe className="w-full h-full rounded" src={formData.videoUrl} title="Preview" allowFullScreen />
                                ) : formData.movieDriveId ? (
                                    <iframe className="w-full h-full rounded" src={`https://drive.google.com/file/d/${extractDriveId(formData.movieDriveId)}/preview`} title="Preview" allowFullScreen />
                                ) : (
                                    <iframe className="w-full h-full rounded" src={`https://www.youtube.com/embed/${extractYoutubeId(formData.movieYoutubeId || formData.youtubeId || '')}`} title="Preview" allowFullScreen />
                                )}
                            </div>
                        )}

                        {/* Download Links Management (Movie) */}
                        {formData.type === 'movie' && (
                            <div className="mt-4 border-t border-white/10 pt-4">
                                <label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Download Links</label>
                                <div className="space-y-2">
                                    {formData.downloadLinks?.map((link, idx) => (
                                        <div key={idx} className="flex gap-2">
                                            <input
                                                placeholder="Label (e.g. 1080p)"
                                                className="w-1/3 bg-black/50 border border-white/10 rounded p-2 text-sm outline-none focus:border-blue-500"
                                                value={link.label}
                                                onChange={e => {
                                                    const newLinks = [...(formData.downloadLinks || [])];
                                                    newLinks[idx].label = e.target.value;
                                                    setFormData({ ...formData, downloadLinks: newLinks });
                                                }}
                                            />
                                            <input
                                                placeholder="Download URL"
                                                className="flex-1 bg-black/50 border border-white/10 rounded p-2 text-sm outline-none focus:border-blue-500"
                                                value={link.url}
                                                onChange={e => {
                                                    const newLinks = [...(formData.downloadLinks || [])];
                                                    newLinks[idx].url = e.target.value;
                                                    setFormData({ ...formData, downloadLinks: newLinks });
                                                }}
                                            />
                                            <button
                                                onClick={() => {
                                                    const newLinks = formData.downloadLinks?.filter((_, i) => i !== idx);
                                                    setFormData({ ...formData, downloadLinks: newLinks });
                                                }}
                                                className="text-red-500 p-2 hover:bg-white/5 rounded"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => setFormData({ ...formData, downloadLinks: [...(formData.downloadLinks || []), { label: '', url: '' }] })}
                                        className="text-xs flex items-center gap-1 bg-white/10 hover:bg-white/20 px-3 py-1 rounded transition"
                                    >
                                        <Plus size={14} /> Add Download Link
                                    </button>
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Genres</label>
                            <div className="flex flex-wrap gap-2">
                                {(formData.type === 'movie' ? MOVIE_GENRES : TV_GENRES).map(g => (
                                    <button key={g}
                                        onClick={() => {
                                            const current = formData.genres || [];
                                            const newGenres = current.includes(g) ? current.filter(x => x !== g) : [...current, g];
                                            setFormData({ ...formData, genres: newGenres });
                                        }}
                                        className={`px-3 py-1 rounded-full text-xs font-bold border ${formData.genres?.includes(g) ? 'bg-white text-black border-white' : 'border-gray-700 text-gray-400'}`}>
                                        {g}
                                    </button>
                                ))}
                            </div>
                        </div>



                        <div className="flex gap-4 pt-2">
                            <button onClick={() => setFormData({ ...formData, isPublished: !formData.isPublished })}
                                className={`flex-1 py-2 rounded font-bold border ${formData.isPublished ? 'bg-green-600/20 text-green-400 border-green-600' : 'bg-gray-800 text-gray-400 border-gray-600'}`}>
                                {formData.isPublished ? 'Published' : 'Draft'}
                            </button>
                            <button onClick={() => setFormData({ ...formData, comingSoon: !formData.comingSoon })}
                                className={`flex-1 py-2 rounded font-bold border ${formData.comingSoon ? 'bg-blue-600/20 text-blue-400 border-blue-600' : 'bg-gray-800 text-gray-400 border-gray-600'}`}>
                                {formData.comingSoon ? 'Coming Soon' : 'Released'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Seasons & Episodes Manager */}
                {
                    formData.type === 'tv' && (
                        <div className="mt-8 border-t border-white/10 pt-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold">Seasons & Episodes</h3>
                                <button onClick={addSeason} className="text-xs flex items-center gap-1 bg-white/10 hover:bg-white/20 px-3 py-1 rounded">
                                    <Plus size={14} /> Add Season
                                </button>
                            </div>

                            <div className="space-y-4">
                                {formData.seasons?.map((season, seasonIdx) => (
                                    <div key={season.id} className="bg-black/40 border border-white/5 rounded-lg overflow-hidden">
                                        <div
                                            className="flex items-center justify-between p-4 bg-white/5 cursor-pointer hover:bg-white/10"
                                            onClick={() => setExpandedSeasonId(expandedSeasonId === season.id ? null : season.id)}
                                        >
                                            <div className="flex items-center gap-4">
                                                {expandedSeasonId === season.id ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                                <span className="font-bold">{season.title}</span>
                                                <span className="text-xs text-gray-500">{season.episodes.length} Episodes</span>
                                            </div>
                                            <button onClick={(e) => { e.stopPropagation(); deleteSeason(season.id); }} className="text-red-500 hover:text-red-400 p-1">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>

                                        {expandedSeasonId === season.id && (
                                            <div className="p-4 space-y-4 animate-in slide-in-from-top-2">
                                                {/* Season Details */}
                                                <div className="grid grid-cols-2 gap-4 mb-4">
                                                    <input value={season.title} onChange={e => updateSeason(season.id, { title: e.target.value })}
                                                        className="bg-black/50 border border-white/10 rounded p-2 text-sm" placeholder="Season Title" />
                                                    <input value={season.trailerYoutubeId || ''} onChange={e => updateSeason(season.id, { trailerYoutubeId: e.target.value })}
                                                        className="bg-black/50 border border-white/10 rounded p-2 text-sm" placeholder="Season Trailer (YouTube ID)" />
                                                </div>

                                                {/* Bulk Add Episodes */}
                                                <div className="bg-white/5 p-4 rounded-lg mb-4 border border-white/10">
                                                    <h4 className="text-sm font-bold mb-2 flex items-center gap-2">
                                                        <Archive size={14} /> Bulk Add Episodes containing Links
                                                    </h4>

                                                    <div className="flex flex-col md:flex-row gap-4 mb-2">
                                                        <input
                                                            placeholder="Default Thumbnail URL (Optional)"
                                                            className="flex-1 bg-black/50 border border-white/10 rounded p-2 text-xs focus:border-blue-500 outline-none"
                                                            id={`bulk-thumbnail-${season.id}`}
                                                        />
                                                        <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer hover:text-white transition whitespace-nowrap">
                                                            <input
                                                                type="checkbox"
                                                                checked={bulkFastMode}
                                                                onChange={(e) => setBulkFastMode(e.target.checked)}
                                                                className="rounded border-white/10 bg-black"
                                                            />
                                                            Fast Mode (Skip TMDB Metadata)
                                                        </label>
                                                    </div>

                                                    <textarea
                                                        placeholder="Paste multiple YouTube or Drive links here (one per line). We'll auto-create episodes for them."
                                                        className="w-full bg-black/50 border border-white/10 rounded p-2 text-xs font-mono h-24 mb-2 focus:border-blue-500 outline-none"
                                                        id={`bulk-input-${season.id}`}
                                                    />
                                                    <button
                                                        onClick={async () => {
                                                            const doc = document.getElementById(`bulk-input-${season.id}`) as HTMLTextAreaElement;
                                                            const thumbDoc = document.getElementById(`bulk-thumbnail-${season.id}`) as HTMLInputElement;
                                                            if (!doc || !doc.value.trim()) return;

                                                            // Start loading
                                                            setTmdbLoading(true);

                                                            try {
                                                                const normalizedText = doc.value.replace(/,/g, '\n');
                                                                const rawLines = normalizedText.split(/\r?\n/);
                                                                const lines = rawLines.map(l => l.trim()).filter(l => l.length > 0).reverse();

                                                                const defaultThumb = thumbDoc ? thumbDoc.value.trim() : '';

                                                                const processedEpisodes: Episode[] = [];

                                                                // Batch processing (10 at a time) to avoid TMDB rate limits
                                                                for (let i = 0; i < lines.length; i += 10) {
                                                                    const batchLines = lines.slice(i, i + 10);
                                                                    const batchResults = await Promise.all(batchLines.map(async (line, idx) => {
                                                                        const globalIdx = i + idx;
                                                                        const url = line.trim();
                                                                        const match = url.match(/[sS](\d+)\s*[eE](\d+)/);
                                                                        const isYt = extractYoutubeId(url).length === 11;
                                                                        const isDrive = extractDriveId(url).length > 20;

                                                                        const episodeNumber = match ? parseInt(match[2]) : ((season.episodes.length || 0) + globalIdx + 1);

                                                                        let epTitle = `Episode ${episodeNumber}`;
                                                                        let epStill = defaultThumb;

                                                                        // Fetch TMDB Metadata if possible and NOT in Fast Mode
                                                                        if (!bulkFastMode && formData.tmdbId && formData.type === 'tv') {
                                                                            try {
                                                                                const tmdbEp = await fetchTMDBEpisode(formData.tmdbId, season.seasonNumber, episodeNumber);
                                                                                if (tmdbEp) {
                                                                                    epTitle = tmdbEp.name || epTitle;
                                                                                    epStill = tmdbStillUrl(tmdbEp.still_path, 'w300') || epStill;
                                                                                }
                                                                            } catch (e) {
                                                                                console.warn(`Failed to fetch TMDB metadata for Ep ${episodeNumber}`, e);
                                                                            }
                                                                        }

                                                                        return {
                                                                            id: `ep_${Date.now()}_${globalIdx}`,
                                                                            episodeNumber,
                                                                            title: epTitle,
                                                                            driveId: isDrive ? extractDriveId(url) : '',
                                                                            youtubeId: isYt ? extractYoutubeId(url) : '',
                                                                            duration: '',
                                                                            stillUrl: epStill
                                                                        };
                                                                    }));
                                                                    processedEpisodes.push(...batchResults);

                                                                    // Small delay between batches if more are coming
                                                                    if (i + 10 < lines.length) {
                                                                        await new Promise(r => setTimeout(r, 200));
                                                                    }
                                                                }

                                                                // Sort by episode number to ensure correct order
                                                                processedEpisodes.sort((a, b) => a.episodeNumber - b.episodeNumber);

                                                                updateSeason(season.id, { episodes: [...season.episodes, ...processedEpisodes] });
                                                                doc.value = ''; // Clear input
                                                                if (thumbDoc) thumbDoc.value = '';
                                                            } finally {
                                                                setTmdbLoading(false);
                                                            }
                                                        }}
                                                        disabled={tmdbLoading}
                                                        className="text-xs bg-blue-600/20 text-blue-400 border border-blue-600 px-3 py-1.5 rounded hover:bg-blue-600 hover:text-white transition"
                                                    >
                                                        Process & Add Links
                                                    </button>
                                                </div>

                                                {/* Episodes List */}
                                                <div className="space-y-2 pl-4 border-l-2 border-white/10">
                                                    {season.episodes.map((ep, epIdx) => (
                                                        <div key={ep.id} className="bg-black/20 rounded mb-2 overflow-hidden">
                                                            <div className="grid grid-cols-1 md:grid-cols-[auto_1.5fr_1.5fr_1.5fr_0.5fr_auto_auto] gap-2 items-center p-2">
                                                                <span className="text-xs font-mono text-gray-500 px-2">{epIdx + 1}</span>
                                                                <input value={ep.title} onChange={e => updateEpisode(season.id, ep.id, { title: e.target.value })}
                                                                    className="bg-black/50 border border-white/10 rounded p-1.5 text-sm" placeholder="Ep Title" />

                                                                <input value={ep.stillUrl || ''} onChange={e => updateEpisode(season.id, ep.id, { stillUrl: e.target.value })}
                                                                    className="bg-black/50 border border-white/10 rounded p-1.5 text-sm" placeholder="Thumbnail URL" />

                                                                {/* Smart Episode Source Input */}
                                                                <div className="flex flex-col gap-1 w-full relative group">
                                                                    <input
                                                                        value={ep.driveId || ep.youtubeId || ''}
                                                                        onChange={e => {
                                                                            const val = e.target.value;
                                                                            if (extractYoutubeId(val).length === 11) {
                                                                                updateEpisode(season.id, ep.id, { youtubeId: val, driveId: '' });
                                                                            } else {
                                                                                updateEpisode(season.id, ep.id, { driveId: val, youtubeId: '' });
                                                                            }
                                                                        }}
                                                                        className="bg-black/50 border border-white/10 rounded p-1.5 text-sm font-mono placeholder:text-gray-600 w-full"
                                                                        placeholder="Source (Drive/YT)"
                                                                    />
                                                                    {/* Hidden input that appears on hover/focus for Player URL */}
                                                                    <input
                                                                        value={ep.videoUrl || ''}
                                                                        onChange={e => updateEpisode(season.id, ep.id, { videoUrl: extractVideoUrl(e.target.value) })}
                                                                        className="bg-black/50 border border-white/10 rounded p-1.5 text-[10px] font-mono placeholder:text-gray-600 w-full absolute top-full left-0 z-10 hidden group-hover:block focus:block focus:relative group-hover:relative"
                                                                        placeholder="Player URL (Optional Override)"
                                                                    />
                                                                </div>

                                                                <input value={ep.duration} onChange={e => updateEpisode(season.id, ep.id, { duration: e.target.value })}
                                                                    className="bg-black/50 border border-white/10 rounded p-1.5 text-sm w-full text-center"
                                                                    placeholder="Auto"
                                                                    title="Auto-calcs on play"
                                                                />

                                                                <button
                                                                    onClick={() => setExpandedEpisodeId(expandedEpisodeId === ep.id ? null : ep.id)}
                                                                    className={`p-2 rounded hover:bg-white/5 transition ${expandedEpisodeId === ep.id ? 'text-blue-400 bg-white/5' : 'text-gray-400'}`}
                                                                    title="Manage Downloads"
                                                                >
                                                                    <HardDrive size={16} />
                                                                </button>

                                                                <button onClick={() => deleteEpisode(season.id, ep.id)} className="text-red-500 p-2 hover:bg-white/5 rounded">
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>

                                                            {/* Expanded Episode Details (Downloads) */}
                                                            {expandedEpisodeId === ep.id && (
                                                                <div className="p-3 bg-black/40 border-t border-white/5 animate-in slide-in-from-top-1">
                                                                    <label className="text-xs text-gray-500 uppercase font-bold mb-2 block flex items-center gap-2">
                                                                        <Archive size={12} /> Download Links for {ep.title}
                                                                    </label>
                                                                    <div className="space-y-2">
                                                                        {ep.downloadLinks?.map((link, linkIdx) => (
                                                                            <div key={linkIdx} className="flex gap-2">
                                                                                <input
                                                                                    placeholder="Label (e.g. 1080p)"
                                                                                    className="w-1/3 bg-black/50 border border-white/10 rounded p-1.5 text-xs outline-none focus:border-blue-500"
                                                                                    value={link.label}
                                                                                    onChange={e => {
                                                                                        const currentLinks = [...(ep.downloadLinks || [])];
                                                                                        currentLinks[linkIdx] = { ...currentLinks[linkIdx], label: e.target.value };
                                                                                        updateEpisode(season.id, ep.id, { downloadLinks: currentLinks });
                                                                                    }}
                                                                                />
                                                                                <input
                                                                                    placeholder="Download URL"
                                                                                    className="flex-1 bg-black/50 border border-white/10 rounded p-1.5 text-xs outline-none focus:border-blue-500"
                                                                                    value={link.url}
                                                                                    onChange={e => {
                                                                                        const currentLinks = [...(ep.downloadLinks || [])];
                                                                                        currentLinks[linkIdx] = { ...currentLinks[linkIdx], url: e.target.value };
                                                                                        updateEpisode(season.id, ep.id, { downloadLinks: currentLinks });
                                                                                    }}
                                                                                />
                                                                                <button
                                                                                    onClick={() => {
                                                                                        const currentLinks = ep.downloadLinks?.filter((_, i) => i !== linkIdx);
                                                                                        updateEpisode(season.id, ep.id, { downloadLinks: currentLinks });
                                                                                    }}
                                                                                    className="text-red-500 p-1.5 hover:bg-white/5 rounded"
                                                                                >
                                                                                    <Trash2 size={14} />
                                                                                </button>
                                                                            </div>
                                                                        ))}
                                                                        <button
                                                                            onClick={() => {
                                                                                const currentLinks = [...(ep.downloadLinks || [])];
                                                                                currentLinks.push({ label: '', url: '' });
                                                                                updateEpisode(season.id, ep.id, { downloadLinks: currentLinks });
                                                                            }}
                                                                            className="text-[10px] flex items-center gap-1 bg-white/5 hover:bg-white/10 px-2 py-1 rounded text-gray-400 hover:text-white transition"
                                                                        >
                                                                            <Plus size={12} /> Add Link
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                    <button onClick={() => addEpisode(season.id)} className="w-full py-2 border border-dashed border-white/20 text-gray-500 hover:text-white hover:border-white/40 rounded text-sm flex items-center justify-center gap-2">
                                                        <Plus size={14} /> Add Episode
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                }

                <div className="flex justify-end gap-4 mt-8 border-t border-white/10 pt-4">
                    <button onClick={() => setIsEditing(false)} className="px-6 py-2 rounded text-gray-400 font-bold hover:text-white">Cancel</button>
                    <button onClick={handleSave} className="px-6 py-2 rounded bg-red-600 text-white font-bold hover:bg-red-700">Save Content</button>
                </div>
            </div >
        );
    }

    return (
        <div className="space-y-6 pb-20">
            {/* Header & Controls */}
            <div className="flex flex-col gap-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-black text-white">Content Library</h2>
                        <p className="text-gray-500 text-sm">{filteredContent.length} titles found</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleSyncAll}
                            disabled={isSyncing}
                            className="bg-amber-600 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-amber-700 transition disabled:opacity-50 shadow-lg shadow-amber-900/20"
                        >
                            {isSyncing ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                            {isSyncing ? `Syncing ${syncProgress}%` : 'Sync TMDB Data'}
                        </button>
                        <button onClick={() => resetForm('movie')} className="bg-blue-600 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700 transition">
                            <Plus size={18} /> Add Movie
                        </button>
                        <button onClick={() => resetForm('tv')} className="bg-purple-600 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-purple-700 transition">
                            <Plus size={18} /> Add TV Show
                        </button>
                    </div>
                </div>

                {/* Filters Bar */}
                <div className="flex flex-wrap items-center gap-3 bg-[#141414] p-3 rounded-xl border border-white/5">

                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-2.5 text-gray-500" size={18} />
                        <input
                            value={searchQuery}
                            autoComplete="off"
                            autoCorrect="off"
                            spellCheck="false"
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by title, genre, tag..."
                            className="w-full bg-black/50 border border-white/10 rounded pl-10 pr-4 py-2 outline-none focus:border-white/30 text-sm"
                        />
                    </div>

                    <div className="w-px h-8 bg-white/10 hidden md:block" />

                    {/* Quick Filters */}
                    <div className="flex gap-2 text-sm font-medium overflow-x-auto">
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value as any)}
                            className="bg-black/50 pl-3 pr-8 py-2 rounded border border-white/10 outline-none appearance-none cursor-pointer hover:bg-white/5"
                        >
                            <option value="ALL">All Content</option>
                            <option value="movie">Movies Only</option>
                            <option value="tv">TV Shows Only</option>
                        </select>

                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value as any)}
                            className="bg-black/50 pl-3 pr-8 py-2 rounded border border-white/10 outline-none appearance-none cursor-pointer hover:bg-white/5"
                        >
                            <option value="ALL">All Status</option>
                            <option value="published">Published</option>
                            <option value="draft">Drafts</option>
                        </select>
                    </div>

                </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {filteredContent.map(item => (
                    <div
                        key={item.id}
                        className={`group relative rounded-xl overflow-hidden bg-[#141414] cursor-pointer transform transition-all duration-300 ${selectedItems.includes(item.id) ? 'ring-2 ring-red-500 scale-[0.98]' : 'hover:scale-105 hover:z-10 hover:shadow-xl'
                            }`}
                        onClick={() => {
                            if (selectedItems.length > 0) {
                                toggleSelection(item.id);
                            } else {
                                setFormData(item);
                                setTmdbQuery(item.title || '');
                                setTmdbFilled(false);
                                setTmdbResults([]);
                                setIsEditing(true);
                            }
                        }}
                    >
                        {/* Thumbnail */}
                        <div className="aspect-[2/3] relative">
                            <img
                                src={item.poster_path}
                                alt={item.title}
                                className="w-full h-full object-cover"
                            />

                            {/* Selection Checkbox Overlay */}
                            <div className={`absolute top-2 right-2 z-20 transition-all ${selectedItems.length > 0 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                <button
                                    onClick={(e) => { e.stopPropagation(); toggleSelection(item.id); }}
                                    className={`w-6 h-6 rounded-md border flex items-center justify-center transition-colors ${selectedItems.includes(item.id) ? 'bg-red-600 border-red-600 text-white' : 'bg-black/50 border-white/50 text-transparent hover:border-white'
                                        }`}
                                >
                                    <Check size={14} />
                                </button>
                            </div>

                            {/* Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-60 group-hover:opacity-90 transition-opacity" />

                            {/* Status Badges */}
                            <div className="absolute top-2 left-2 flex flex-col gap-1">
                                {settings.heroContentId === item.id && (
                                    <span className="px-2 py-0.5 rounded bg-amber-500 text-black text-[10px] font-black uppercase shadow-lg">
                                        ⭐ HERO
                                    </span>
                                )}
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${item.isPublished
                                    ? 'bg-green-500 text-white'
                                    : 'bg-gray-600 text-gray-300'
                                    }`}>
                                    {item.isPublished ? 'LIVE' : 'DRAFT'}
                                </span>
                            </div>

                            {/* Hover Actions */}
                            <div className="absolute inset-x-0 bottom-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300 flex justify-center gap-3 pb-8">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setFormData(item); setTmdbQuery(item.title || ''); setTmdbFilled(false); setTmdbResults([]); setIsEditing(true); }}
                                    className="p-2 rounded-full bg-white text-black hover:scale-110 transition shadow-lg"
                                    title="Edit"
                                >
                                    <Edit size={16} />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); toggleHero(item.id); }}
                                    className={`p-2 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/20 hover:scale-110 transition ${settings.heroContentId === item.id ? 'text-amber-400 border-amber-400' : ''}`}
                                    title="Set as Hero"
                                >
                                    <Star size={16} fill={settings.heroContentId === item.id ? "currentColor" : "none"} />
                                </button>
                            </div>
                        </div>

                        {/* Content Info */}
                        <div className="p-3 space-y-1">
                            <h3 className="font-bold text-white text-sm truncate group-hover:text-red-500 transition-colors">
                                {item.title}
                            </h3>
                            <div className="flex items-center gap-2 text-[10px] text-gray-400">
                                <span className="uppercase">{item.type}</span>
                                <span>•</span>
                                <span>{item.release_date?.split('-')[0] || '2026'}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Empty State */}
            {filteredContent.length === 0 && (
                <div className="text-center py-20 text-gray-500">
                    <div className="bg-white/5 inline-block p-6 rounded-full mb-4">
                        <Search size={48} className="opacity-20" />
                    </div>
                    <div className="text-xl font-bold mb-2">No content found</div>
                    <div className="text-sm max-w-xs mx-auto">Try adjusting your filters or search query to find what you're looking for.</div>
                </div>
            )}

            {/* Bulk Actions Bar */}
            {selectedItems.length > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#181818] border border-white/10 shadow-2xl rounded-full px-6 py-3 flex items-center gap-6 animate-in slide-in-from-bottom-6">
                    <span className="font-bold text-sm">{selectedItems.length} selected</span>
                    <div className="h-4 w-px bg-white/10" />
                    <div className="flex items-center gap-2">
                        <button onClick={() => handleBulkPublish(true)} className="p-2 hover:bg-green-500/20 text-green-500 rounded-full transition" title="Publish Selected">
                            <Check size={18} />
                        </button>
                        <button onClick={() => handleBulkPublish(false)} className="p-2 hover:bg-gray-500/20 text-gray-400 rounded-full transition" title="Unpublish Selected">
                            <Archive size={18} />
                        </button>
                        <button onClick={handleBulkDelete} className="p-2 hover:bg-red-500/20 text-red-500 rounded-full transition" title="Delete Selected">
                            <Trash2 size={18} />
                        </button>
                    </div>
                    <div className="h-4 w-px bg-white/10" />
                    <button onClick={() => setSelectedItems([])} className="text-xs font-bold text-gray-500 hover:text-white">
                        CANCEL
                    </button>
                </div>
            )}
        </div>
    );
};

export default ContentManager;
