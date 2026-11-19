import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Hls from 'hls.js';
import { Play, Pause, Volume2, Volume1, VolumeX, Maximize, Settings, SkipForward, ArrowLeft, RotateCcw, RotateCw, Subtitles, Layers, BarChart2, Minimize, Headphones, Check, MessageSquare, Wifi, X, ExternalLink, Scan, Scaling, AlertCircle, RefreshCw, Zap, Sliders, Sparkles, ShieldCheck, ShieldOff, Copy, ChevronDown, ChevronLeft, ChevronRight, Server, Search } from 'lucide-react';
import { Content, Season, Episode } from '../types';
import StatsPanel from './StatsPanel';
import DrivePlayer from './DrivePlayer';
import ContentLoader from './ContentLoader';
import { useStore } from '../context/StoreContext';
import { logUserActivity, incrementWatchTime } from '../utils/activityLogger';
import { MoviVideo } from './MoviVideo';
import {
    buildEmbedUrl,
    parseEmbedContentType,
    extractDriveId,
    isExternalEmbedUrl,
    isDirectVideoUrl,
    getPlayableStreamUrl,
    buildServerEmbedUrl,
    getNextFallbackServer,
    getBaseContentServer,
    STREAM_SERVERS,
    StreamServerKey,
    STANDARD_SERVER_FALLBACK_ORDER,
    ANIME_SERVER_FALLBACK_ORDER
} from '../utils/embedUrl';
import { soundBooster } from '../player/SoundBooster';
import { useAdShield } from '../utils/useAdShield';
import { fetchTMDBDetails, fetchTMDBSeason } from '../services/tmdbService';
import { saveContentTitle, setWebpageTitle } from '../utils/titleManager';
import {
    getSeriesEpisodeProgress,
    isEpisodeWatched,
    recordEpisodeWatched,
    syncSeriesProgressFromCloud,
    SeriesEpisodeProgress,
} from '../utils/episodeProgress';

interface VideoPlayerProps {
    content: Content;
    onClose: () => void;
}

declare global {
    interface Window {
        onYouTubeIframeAPIReady: () => void;
        YT: any;
    }
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ content, onClose }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { updatePlaybackProgress, currentUser, updateContentDuration, settings, addToWatchHistory } = useStore();

    // Embed Ad Shield: Always automatically active to block popups, new tabs, and redirects
    const {
        isEnabled: isAdShieldEnabled,
        sandboxAttributes: adShieldSandbox,
    } = useAdShield({
        defaultEnabled: true,
        defaultMode: 'strict',
        isActive: true,
    });



    // Resume Logic
    const isTrailer = content.type === 'trailer' || content.playMode === 'trailer';
    const savedState = useMemo(() => {
        if (isTrailer) return undefined;
        try {
            const raw = localStorage.getItem('my_donkey_watch_history');
            if (raw) {
                const list = JSON.parse(raw);
                const found = list.find((i: any) => i.movieId === content.id || (content.imdbId && i.movieId === content.imdbId));
                if (found) return found;
            }
        } catch (_) { }
        return currentUser?.continueWatching?.find(i => i.movieId === content.id);
    }, [isTrailer, content.id, content.imdbId, currentUser?.continueWatching]);
    const initialProgress = savedState?.progress || (isTrailer ? 0 : (content.progress || 0));
    const initialDuration = savedState?.duration || 0;

    // State
    const [playing, setPlaying] = useState(!currentUser?.lowDataMode);
    const [progress, setProgress] = useState(initialProgress);
    const [currentTime, setCurrentTime] = useState(savedState?.stoppedAt || 0);
    const [duration, setDuration] = useState(initialDuration);
    const [showControls, setShowControls] = useState(true);
    const [showSkipIntro, setShowSkipIntro] = useState(false);
    const [showStats, setShowStats] = useState(false);

    // Menus
    const [showSettingsMenu, setShowSettingsMenu] = useState(false);
    const [settingsTab, setSettingsTab] = useState<'quality' | 'subtitles' | 'audio'>('quality');

    const [volume, setVolume] = useState(100);
    const [isMuted, setIsMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isPlayerReady, setIsPlayerReady] = useState(false);
    const [isBuffering, setIsBuffering] = useState(false);
    const [initialLoad, setInitialLoad] = useState(true);
    const [loaderStartTime] = useState(Date.now());
    const [boostLevel, setBoostLevel] = useState<number>(() => {
        try {
            const saved = localStorage.getItem('mydonkey_sound_boost_level');
            return saved ? parseFloat(saved) : 1.0;
        } catch {
            return 1.0;
        }
    });
    const [dialogueClarity, setDialogueClarity] = useState<boolean>(() => {
        try {
            return localStorage.getItem('mydonkey_dialogue_boost') === 'true';
        } catch {
            return false;
        }
    });
    const [limiterEnabled, setLimiterEnabled] = useState<boolean>(true);
    const isBoosted = boostLevel > 1.0;
    const [isTestingAudio, setIsTestingAudio] = useState(false);

    useEffect(() => {
        return () => {
            soundBooster.stopTestSound();
        };
    }, []);

    // On-Screen Display (OSD / HUD)
    const [osdNotice, setOsdNotice] = useState<{ text: string; subtext?: string; icon?: 'zap' | 'volume' | 'mute' } | null>(null);
    const osdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const showOsd = useCallback((text: string, subtext?: string, icon?: 'zap' | 'volume' | 'mute') => {
        if (osdTimeoutRef.current) clearTimeout(osdTimeoutRef.current);
        setOsdNotice({ text, subtext, icon });
        osdTimeoutRef.current = setTimeout(() => {
            setOsdNotice(null);
        }, 1800);
    }, []);
    const [showDataWarning, setShowDataWarning] = useState(false);
    const [isZoomed, setIsZoomed] = useState(false); // Zoom/Fill State
    const [playbackError, setPlaybackError] = useState<string | null>(null);

    const [hasStartedPlaying, setHasStartedPlaying] = useState(false);
    const [isMovieLoading, setIsMovieLoading] = useState(true);

    const finishLoading = useCallback(() => {
        setIsMovieLoading(false);
        setHasStartedPlaying(true);
        setInitialLoad(false);
    }, []);

    // Multi-Server Content Access & Auto-Fallback State (My Donkey Engine)
    const isAnime = useMemo(() => {
        return Boolean(
            content.tags?.some(t => t.toLowerCase() === 'anime') ||
            content.genres?.some(g => g.toLowerCase() === 'anime' || g.toLowerCase() === 'animation')
        );
    }, [content]);

    const activeServer: StreamServerKey = 'nxsha';
    const [audioTrack] = useState<'sub' | 'dub'>('sub');

    useEffect(() => {
        try {
            localStorage.setItem('mydonkey_preferred_server', 'nxsha');
        } catch { }
    }, []);


    const isTV = Boolean(
        content.type === 'tv' ||
        (content as any).media_type === 'tv' ||
        (content.seasons && content.seasons.length > 0) ||
        (content.videoUrl && content.videoUrl.includes('/embed/tv/'))
    );

    // Parse unique episode URL: /watch/:id/season/:s/episode/:e (or ?season=..&episode=..)
    const routeSeasonEp = useMemo(() => {
        const pathMatch = location.pathname.match(/\/season\/(\d+)\/episode\/(\d+)/i);
        if (pathMatch) {
            const season = parseInt(pathMatch[1], 10);
            const episode = parseInt(pathMatch[2], 10);
            if (season > 0 && episode > 0) return { season, episode };
        }
        const params = new URLSearchParams(location.search);
        const sParam = params.get('season') || params.get('s');
        const eParam = params.get('episode') || params.get('e');
        if (sParam && eParam) {
            const season = parseInt(sParam, 10);
            const episode = parseInt(eParam, 10);
            if (season > 0 && episode > 0) return { season, episode };
        }
        return null;
    }, [location.pathname, location.search]);

    // Parse season & episode from embed URL if present (e.g. /embed/tv/tt13404982/1/2)
    const urlSeasonEp = useMemo(() => {
        if (routeSeasonEp) return routeSeasonEp;
        const target = content.videoUrl || '';
        const match = target.match(/(?:embed\/tv\/|tt\d+\/)?(\d+)\/(\d+)/);
        if (match) {
            return { season: parseInt(match[1]), episode: parseInt(match[2]) };
        }
        return null;
    }, [routeSeasonEp, content.videoUrl]);

    // Initial series progress read synchronously from storage/props
    const initialSeriesProgress = useMemo(() => {
        if (!isTV || isTrailer) return null;
        return getSeriesEpisodeProgress(content);
    }, [isTV, isTrailer, content]);

    // Target season/episode explicitly preferred on mount
    const initialTargetSeason = routeSeasonEp?.season || (content as any).lastSeason || urlSeasonEp?.season || initialSeriesProgress?.lastSeason || 1;
    const initialTargetEpisode = routeSeasonEp?.episode || (content as any).lastEpisode || urlSeasonEp?.episode || initialSeriesProgress?.lastEpisode || 1;

    // Season & Episode State (TV Shows)
    const [currentSeasonIdx, setCurrentSeasonIdx] = useState<number>(() => {
        if (content.seasons && content.seasons.length > 0) {
            const idx = content.seasons.findIndex(s => s.seasonNumber === initialTargetSeason);
            return idx !== -1 ? idx : 0;
        }
        return 0;
    });

    const [currentEpisodeIdx, setCurrentEpisodeIdx] = useState<number>(() => {
        if (content.seasons && content.seasons.length > 0) {
            const sIdx = content.seasons.findIndex(s => s.seasonNumber === initialTargetSeason);
            const season = sIdx !== -1 ? content.seasons[sIdx] : content.seasons[0];
            if (season?.episodes) {
                const epIdx = season.episodes.findIndex(e => e.episodeNumber === initialTargetEpisode);
                return epIdx !== -1 ? epIdx : 0;
            }
        }
        return 0;
    });

    const [showEpisodesMenu, setShowEpisodesMenu] = useState(false);
    const embedIframeRef = useRef<HTMLIFrameElement | null>(null);
    const iframeMountTimeRef = useRef<number>(Date.now());
    const lastSyncedUrlRef = useRef<string>('');
    const lastRecordedEpRef = useRef<string>('');

    // Require episode selection before showing the video player screen for TV series
    // (unless user opened a direct unique episode URL or clicked Resume on Continue Watching)
    const [hasSelectedEpisode, setHasSelectedEpisode] = useState<boolean>(() =>
        !isTV || isTrailer || Boolean(routeSeasonEp) || Boolean((content as any).lastSeason)
    );
    const [isLoadingSeasons, setIsLoadingSeasons] = useState<boolean>(() =>
        isTV && !isTrailer && !(content.seasons && content.seasons.length > 0 && content.seasons.some(s => s.episodes && s.episodes.length > 0))
    );
    const needsEpisodeSelection = isTV && !isTrailer && !hasSelectedEpisode;

    useEffect(() => {
        setHasSelectedEpisode(!isTV || isTrailer || Boolean(routeSeasonEp) || Boolean((content as any).lastSeason));
    }, [content.id, isTV, isTrailer, Boolean(routeSeasonEp), (content as any).lastSeason]);

    // Build and navigate to the unique URL for each episode (/watch/:id/season/:s/episode/:e)
    const syncEpisodeUrl = useCallback((seasonNum: number, episodeNum: number) => {
        if (!content?.id || isTrailer) return;
        const basePath = `/watch/${encodeURIComponent(content.id)}/season/${seasonNum}/episode/${episodeNum}`;
        const params = new URLSearchParams(location.search);
        if (!params.get('mode')) params.set('mode', content.playMode || 'movie');
        if (content.title && content.title !== 'undefined' && content.title !== 'null') {
            params.set('title', content.title.trim());
        }
        const nextUrl = `${basePath}?${params.toString()}`;
        const currentFull = `${location.pathname}${location.search}`;
        if (lastSyncedUrlRef.current === nextUrl || currentFull === nextUrl) {
            return;
        }
        lastSyncedUrlRef.current = nextUrl;
        navigate(nextUrl, { replace: true, state: location.state });
    }, [content?.id, content?.playMode, content?.title, isTrailer, location.pathname, location.search, location.state, navigate]);

    // Pre-seed dynamicSeasons with target season/episode so it NEVER defaults to S1:E1 while TMDB is hydrating
    const [dynamicSeasons, setDynamicSeasons] = useState<Season[]>(() => {
        if (content.seasons && content.seasons.length > 0) {
            return content.seasons;
        }
        if (isTV) {
            return [{
                id: `season_${initialTargetSeason}`,
                seasonNumber: initialTargetSeason,
                title: `Season ${initialTargetSeason}`,
                episodes: [{
                    id: `s${initialTargetSeason}_e${initialTargetEpisode}`,
                    episodeNumber: initialTargetEpisode,
                    title: `Episode ${initialTargetEpisode}`
                }]
            }];
        }
        return [];
    });

    useEffect(() => {
        if (content.seasons && content.seasons.length > 0) {
            setDynamicSeasons(content.seasons);
        }
    }, [content.seasons]);

    // Synchronize initial season & episode indices with parsed URL numbers
    useEffect(() => {
        const targetS = routeSeasonEp?.season || (content as any).lastSeason || initialTargetSeason;
        const targetE = routeSeasonEp?.episode || (content as any).lastEpisode || initialTargetEpisode;
        if (dynamicSeasons.length > 0) {
            const sIdx = dynamicSeasons.findIndex(s => s.seasonNumber === targetS);
            if (sIdx !== -1) {
                setCurrentSeasonIdx(sIdx);
                const eIdx = dynamicSeasons[sIdx].episodes.findIndex(e => e.episodeNumber === targetE);
                if (eIdx !== -1) {
                    setCurrentEpisodeIdx(eIdx);
                }
            }
        }
    }, [dynamicSeasons.length, routeSeasonEp?.season, routeSeasonEp?.episode, (content as any).lastSeason, (content as any).lastEpisode, initialTargetSeason, initialTargetEpisode]);

    // Fetch seasons & episodes dynamically from TMDB for TV shows if not pre-populated
    useEffect(() => {
        if (!isTV) return;
        if (content.seasons && content.seasons.length > 0 && content.seasons.some(s => s.episodes && s.episodes.length > 0)) {
            setDynamicSeasons(content.seasons);
            setIsLoadingSeasons(false);
            return;
        }

        let isCancelled = false;
        const makeFallbackSeason = () => {
            const defaultEpsCount = urlSeasonEp ? Math.max(urlSeasonEp.episode, 8) : 8;
            return [{
                id: 'season_1',
                seasonNumber: urlSeasonEp?.season || 1,
                title: `Season ${urlSeasonEp?.season || 1}`,
                episodes: Array.from({ length: defaultEpsCount }, (_, i) => ({
                    id: `ep_${i + 1}`,
                    episodeNumber: i + 1,
                    title: `Episode ${i + 1}`,
                }))
            }];
        };

        const loadTvSeasons = async () => {
            setIsLoadingSeasons(true);
            try {
                let tmdbId = content.tmdbId;
                if (!tmdbId && typeof content.id === 'string' && content.id.startsWith('tmdb_')) {
                    tmdbId = parseInt(content.id.replace('tmdb_', ''));
                }

                if (!tmdbId) {
                    setDynamicSeasons(prev => (prev.length > 0 ? prev : makeFallbackSeason()));
                    return;
                }

                const details = await fetchTMDBDetails(tmdbId, 'tv');
                if (isCancelled) return;
                if (!details) {
                    setDynamicSeasons(prev => (prev.length > 0 ? prev : makeFallbackSeason()));
                    return;
                }

                const validSeasons = (details.seasons || []).filter(s => s.season_number > 0);
                if (validSeasons.length === 0) {
                    setDynamicSeasons(prev => (prev.length > 0 ? prev : makeFallbackSeason()));
                    return;
                }

                const targetSeasonNum = urlSeasonEp?.season || validSeasons[0].season_number;
                const seasonDetail = await fetchTMDBSeason(tmdbId, targetSeasonNum);
                if (isCancelled) return;

                const populatedSeasons: Season[] = validSeasons.map(s => {
                    if (s.season_number === targetSeasonNum && seasonDetail?.episodes) {
                        return {
                            id: String(s.id),
                            seasonNumber: s.season_number,
                            title: s.name || `Season ${s.season_number}`,
                            episodes: seasonDetail.episodes.map(ep => ({
                                id: String(ep.id),
                                episodeNumber: ep.episode_number,
                                title: ep.name || `Episode ${ep.episode_number}`,
                                overview: ep.overview,
                                duration: ep.runtime ? `${ep.runtime}m` : undefined,
                                stillUrl: ep.still_path ? `https://image.tmdb.org/t/p/w500${ep.still_path}` : undefined,
                            }))
                        };
                    }
                    return {
                        id: String(s.id),
                        seasonNumber: s.season_number,
                        title: s.name || `Season ${s.season_number}`,
                        episodes: Array.from({ length: s.episode_count || 1 }, (_, i) => ({
                            id: `s${s.season_number}_e${i + 1}`,
                            episodeNumber: i + 1,
                            title: `Episode ${i + 1}`,
                        }))
                    };
                });

                setDynamicSeasons(populatedSeasons);
            } catch (err) {
                console.warn('Could not fetch TMDB TV seasons:', err);
                if (!isCancelled) {
                    setDynamicSeasons(prev => (prev.length > 0 ? prev : makeFallbackSeason()));
                }
            } finally {
                if (!isCancelled) setIsLoadingSeasons(false);
            }
        };

        loadTvSeasons();
        return () => { isCancelled = true; };
    }, [isTV, content.id, content.tmdbId]);

    // Listen for TV state & info messages emitted from the embed iframe
    useEffect(() => {
        const handleEmbedMessage = (event: MessageEvent) => {
            try {
                const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
                if (!data || typeof data !== 'object') return;

                if (data.type === 'TV_STATE' || data.event === 'tv_state') {
                    if (data.season !== undefined && data.episode !== undefined) {
                        const sNum = Number(data.season);
                        const eNum = Number(data.episode);
                        if (!sNum || !eNum) return;

                        // Ignore default/spurious boot-up messages from embed iframe during first 3.5 seconds
                        const isBootPhase = Date.now() - iframeMountTimeRef.current < 3500;
                        if (isBootPhase && (sNum !== initialTargetSeason || eNum !== initialTargetEpisode)) {
                            return;
                        }

                        setDynamicSeasons(prev => {
                            const sIdx = prev.findIndex(s => s.seasonNumber === sNum);
                            if (sIdx !== -1) {
                                setCurrentSeasonIdx(sIdx);
                                const eIdx = prev[sIdx].episodes.findIndex(e => e.episodeNumber === eNum);
                                if (eIdx !== -1) setCurrentEpisodeIdx(eIdx);
                            }
                            return prev;
                        });
                    }
                } else if (data.type === 'TV_INFO' && data.eps) {
                    setDynamicSeasons(prev => {
                        if (prev.length > 0 && prev.some(s => s.episodes && s.episodes.length > 0 && s.episodes[0].overview)) return prev;
                        const newSeasons: Season[] = [];
                        Object.entries(data.eps).forEach(([sNumStr, epList]: [string, any]) => {
                            const sNum = parseInt(sNumStr) || 1;
                            const episodes: Episode[] = [];
                            if (Array.isArray(epList)) {
                                epList.forEach((epNum: any) => {
                                    const n = Number(epNum);
                                    episodes.push({
                                        id: `s${sNum}_e${n}`,
                                        episodeNumber: n,
                                        title: `Episode ${n}`,
                                    });
                                });
                            } else if (typeof epList === 'number') {
                                for (let i = 1; i <= epList; i++) {
                                    episodes.push({
                                        id: `s${sNum}_e${i}`,
                                        episodeNumber: i,
                                        title: `Episode ${i}`,
                                    });
                                }
                            }
                            newSeasons.push({
                                id: `season_${sNum}`,
                                seasonNumber: sNum,
                                title: `Season ${sNum}`,
                                episodes
                            });
                        });
                        return newSeasons.length > 0 ? newSeasons : prev;
                    });
                }
            } catch {
                // Ignore non-json messages
            }
        };

        window.addEventListener('message', handleEmbedMessage);
        return () => window.removeEventListener('message', handleEmbedMessage);
    }, []);

    const handleSelectSeason = async (idx: number) => {
        setCurrentSeasonIdx(idx);
        const selectedSeason = dynamicSeasons[idx];
        if (!selectedSeason) return;

        let tmdbId = content.tmdbId;
        if (!tmdbId && typeof content.id === 'string' && content.id.startsWith('tmdb_')) {
            tmdbId = parseInt(content.id.replace('tmdb_', ''));
        }

        if (tmdbId && selectedSeason.episodes.some(e => e.title === `Episode ${e.episodeNumber}`)) {
            try {
                const seasonDetail = await fetchTMDBSeason(tmdbId, selectedSeason.seasonNumber);
                if (seasonDetail?.episodes) {
                    setDynamicSeasons(prev => prev.map((s, i) => i === idx ? {
                        ...s,
                        episodes: seasonDetail.episodes.map(ep => ({
                            id: String(ep.id),
                            episodeNumber: ep.episode_number,
                            title: ep.name || `Episode ${ep.episode_number}`,
                            overview: ep.overview,
                            duration: ep.runtime ? `${ep.runtime}m` : undefined,
                            stillUrl: ep.still_path ? `https://image.tmdb.org/t/p/w500${ep.still_path}` : undefined,
                        }))
                    } : s));
                }
            } catch {
                // Silently keep existing
            }
        }
    };

    // Per-series watched episode progress & last-watched memory
    const [seriesProgress, setSeriesProgress] = useState<SeriesEpisodeProgress | null>(() =>
        isTV && !isTrailer ? getSeriesEpisodeProgress(content) : null
    );
    const hasAutoFocusedResumeSeasonRef = useRef<boolean>(false);

    useEffect(() => {
        if (!isTV || isTrailer) {
            setSeriesProgress(null);
            return;
        }
        hasAutoFocusedResumeSeasonRef.current = false;
        setSeriesProgress(getSeriesEpisodeProgress(content));
        if (currentUser?.uid && !currentUser.isGuest) {
            let cancelled = false;
            syncSeriesProgressFromCloud(content, currentUser.uid).then((merged) => {
                if (!cancelled && merged) setSeriesProgress(merged);
            });
            return () => { cancelled = true; };
        }
    }, [content.id, content.tmdbId, isTV, isTrailer, currentUser?.uid, currentUser?.isGuest]);

    // Auto-focus the user's last watched season tab on the Episode Selection Gate
    useEffect(() => {
        if (!needsEpisodeSelection || routeSeasonEp || hasAutoFocusedResumeSeasonRef.current) return;
        if (seriesProgress && dynamicSeasons.length > 0) {
            const sIdx = dynamicSeasons.findIndex(s => s.seasonNumber === seriesProgress.lastSeason);
            if (sIdx !== -1) {
                hasAutoFocusedResumeSeasonRef.current = true;
                setCurrentSeasonIdx(sIdx);
                void handleSelectSeason(sIdx);
            }
        }
    }, [needsEpisodeSelection, routeSeasonEp, seriesProgress?.lastSeason, dynamicSeasons.length]);

    // Auto-play Next Episode state
    const [upNextCountdown, setUpNextCountdown] = useState<number | null>(null);
    const episodeEndedTriggeredRef = useRef<boolean>(false);

    const handleSelectEpisode = useCallback((seasonIdx: number, epIdx: number) => {
        const targetSeason = dynamicSeasons[seasonIdx];
        const targetEp = targetSeason?.episodes[epIdx];
        if (!targetSeason || !targetEp) return;

        setUpNextCountdown(null);
        episodeEndedTriggeredRef.current = false;
        setCurrentSeasonIdx(seasonIdx);
        setCurrentEpisodeIdx(epIdx);
        setHasSelectedEpisode(true);
        setShowEpisodesMenu(false);
        setInitialLoad(true);
        setIsMovieLoading(true);
        setPlaying(true);

        // Save watched episode & last-watched S/E progress (localStorage + Firestore)
        const updatedProgress = recordEpisodeWatched(
            content,
            targetSeason.seasonNumber,
            targetEp.episodeNumber,
            targetEp.title,
            targetEp.stillUrl,
            currentUser && !currentUser.isGuest ? currentUser.uid : undefined
        );
        setSeriesProgress(updatedProgress);

        // Give every episode its own unique URL (/watch/:id/season/:s/episode/:e)
        syncEpisodeUrl(targetSeason.seasonNumber, targetEp.episodeNumber);

        // Lazy-load TMDB metadata for the selected season if needed
        void handleSelectSeason(seasonIdx);

        if (embedIframeRef.current?.contentWindow) {
            try {
                embedIframeRef.current.contentWindow.postMessage({
                    type: 'TV_SET',
                    season: targetSeason.seasonNumber,
                    episode: targetEp.episodeNumber
                }, '*');
            } catch (err) {
                console.warn('Error sending TV_SET to embed iframe:', err);
            }
        }

        showOsd(
            `Playing S${targetSeason.seasonNumber} • E${targetEp.episodeNumber}`,
            targetEp.title || `Episode ${targetEp.episodeNumber}`,
            'zap'
        );
    }, [dynamicSeasons, content, currentUser, syncEpisodeUrl, showOsd]);

    const handleResumeLastEpisode = useCallback(() => {
        if (!seriesProgress) return;
        const sIdx = dynamicSeasons.findIndex(s => s.seasonNumber === seriesProgress.lastSeason);
        if (sIdx !== -1) {
            const eIdx = dynamicSeasons[sIdx].episodes.findIndex(e => e.episodeNumber === seriesProgress.lastEpisode);
            if (eIdx !== -1) {
                handleSelectEpisode(sIdx, eIdx);
                return;
            }
        }
        // Fallback when TMDB seasons are still hydrating: jump directly via unique URL
        setHasSelectedEpisode(true);
        setIsMovieLoading(true);
        setPlaying(true);
        syncEpisodeUrl(seriesProgress.lastSeason, seriesProgress.lastEpisode);
    }, [seriesProgress, dynamicSeasons, handleSelectEpisode, syncEpisodeUrl]);

    const currentSeason = (isTV && dynamicSeasons.length > 0) ? (dynamicSeasons[currentSeasonIdx] || dynamicSeasons[0]) : null;
    const currentEpisode = (isTV && currentSeason && currentSeason.episodes.length > 0) ? (currentSeason.episodes[currentEpisodeIdx] || currentSeason.episodes[0]) : null;

    const nextEpisodeInfo = useMemo(() => {
        if (!isTV || isTrailer || dynamicSeasons.length === 0) return null;
        const season = dynamicSeasons[currentSeasonIdx];
        if (season && currentEpisodeIdx + 1 < season.episodes.length) {
            return {
                seasonIdx: currentSeasonIdx,
                epIdx: currentEpisodeIdx + 1,
                season,
                episode: season.episodes[currentEpisodeIdx + 1],
            };
        }
        if (currentSeasonIdx + 1 < dynamicSeasons.length) {
            const nextSeason = dynamicSeasons[currentSeasonIdx + 1];
            if (nextSeason && nextSeason.episodes.length > 0) {
                return {
                    seasonIdx: currentSeasonIdx + 1,
                    epIdx: 0,
                    season: nextSeason,
                    episode: nextSeason.episodes[0],
                };
            }
        }
        return null;
    }, [isTV, isTrailer, dynamicSeasons, currentSeasonIdx, currentEpisodeIdx]);

    const playNextEpisode = useCallback(() => {
        if (!nextEpisodeInfo) {
            setUpNextCountdown(null);
            return;
        }
        handleSelectEpisode(nextEpisodeInfo.seasonIdx, nextEpisodeInfo.epIdx);
    }, [nextEpisodeInfo, handleSelectEpisode]);

    const triggerEpisodeEnded = useCallback(() => {
        if (!isTV || isTrailer || needsEpisodeSelection || !nextEpisodeInfo) return;
        if (episodeEndedTriggeredRef.current) return;
        episodeEndedTriggeredRef.current = true;
        setUpNextCountdown(5);
    }, [isTV, isTrailer, needsEpisodeSelection, nextEpisodeInfo]);

    const triggerEpisodeEndedRef = useRef(triggerEpisodeEnded);
    useEffect(() => {
        triggerEpisodeEndedRef.current = triggerEpisodeEnded;
    }, [triggerEpisodeEnded]);

    // Reset auto-next state whenever the episode changes
    useEffect(() => {
        setUpNextCountdown(null);
        episodeEndedTriggeredRef.current = false;
    }, [content.id, currentSeasonIdx, currentEpisodeIdx]);

    // Countdown tick -> automatically plays next episode when timer hits 0
    useEffect(() => {
        if (upNextCountdown === null) return;
        if (upNextCountdown <= 0) {
            playNextEpisode();
            return;
        }
        const timer = setTimeout(() => {
            setUpNextCountdown(prev => (prev !== null ? prev - 1 : null));
        }, 1000);
        return () => clearTimeout(timer);
    }, [upNextCountdown, playNextEpisode]);

    // Keep unique episode URL & watched progress synced if user opened an episode directly
    useEffect(() => {
        if (isTV && !isTrailer && hasSelectedEpisode && currentSeason && currentEpisode) {
            const epKey = `${currentSeason.seasonNumber}:${currentEpisode.episodeNumber}`;
            if (lastRecordedEpRef.current === epKey) return;
            lastRecordedEpRef.current = epKey;

            syncEpisodeUrl(currentSeason.seasonNumber, currentEpisode.episodeNumber);
            const updated = recordEpisodeWatched(
                content,
                currentSeason.seasonNumber,
                currentEpisode.episodeNumber,
                currentEpisode.title,
                currentEpisode.stillUrl,
                currentUser && !currentUser.isGuest ? currentUser.uid : undefined
            );
            setSeriesProgress(updated);
        }
    }, [isTV, isTrailer, hasSelectedEpisode, currentSeason?.seasonNumber, currentEpisode?.episodeNumber, syncEpisodeUrl, content, currentUser]);

    // Listen for episode end / completion signals from external embed iframes (Nxsha / HTML5 / JW / Plyr)
    useEffect(() => {
        if (!isTV || isTrailer || needsEpisodeSelection) return;
        const handleEmbedEndedMsg = (event: MessageEvent) => {
            try {
                const raw = event.data;
                if (!raw) return;
                const data = typeof raw === 'string'
                    ? (raw.length < 5000 && raw.trim().startsWith('{') ? JSON.parse(raw) : { event: raw })
                    : raw;
                if (!data || typeof data !== 'object') return;

                const evt = String(data.event || data.type || data.action || data.state || data.status || '').toLowerCase();
                const nestedEvt = String(data.data?.event || data.data?.state || '').toLowerCase();

                if (
                    evt === 'ended' ||
                    evt === 'complete' ||
                    evt === 'video_ended' ||
                    evt === 'playback_ended' ||
                    nestedEvt === 'ended' ||
                    nestedEvt === 'complete' ||
                    data.playerState === 0 ||
                    data.info?.playerState === 0
                ) {
                    triggerEpisodeEndedRef.current();
                    return;
                }

                // Many embed players emit timeupdate payloads with currentTime & duration
                const curr = Number(data.data?.currentTime ?? data.currentTime);
                const dur = Number(data.data?.duration ?? data.duration);
                if (Number.isFinite(curr) && Number.isFinite(dur) && dur > 60 && curr >= dur - 1.5) {
                    triggerEpisodeEndedRef.current();
                }
            } catch {
                // Ignore non-JSON cross-origin messages
            }
        };

        window.addEventListener('message', handleEmbedEndedMsg);
        return () => window.removeEventListener('message', handleEmbedEndedMsg);
    }, [isTV, isTrailer, needsEpisodeSelection]);

    const embedBaseHost = useMemo(() => {
        return (settings?.embedProxyBaseUrl || 'https://proxy.garageband.rocks').replace(/^https?:\/\//, '').replace(/\/+$/, '');
    }, [settings?.embedProxyBaseUrl]);

    // --- Video Source Logic ---
    const getDriveId = (url: string) => {
        return extractDriveId(url);
    };

    const getYoutubeId = (url: string) => {
        if (!url) return '';
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        if (match && match[2].length === 11) return match[2];
        if (/^[a-zA-Z0-9_-]{11}$/.test(url) && !url.startsWith('tt')) return url;
        return '';
    };

    const isMovieMode = content.playMode === 'movie';
    const isTrailerMode = content.playMode === 'trailer';
    let overrideUrl = isTrailerMode ? '' : content.videoUrl;

    const extractedImdbId = content.imdbId || (typeof content.id === 'string' && content.id.startsWith('imdb_') ? content.id.replace('imdb_', '') : '') || (content.videoUrl?.match(/(tt\d+)/)?.[1]) || (overrideUrl?.match(/(tt\d+)/)?.[1]) || '';

    const overrideYoutubeId = overrideUrl ? getYoutubeId(overrideUrl) : '';
    const overrideDriveId = overrideUrl ? getDriveId(overrideUrl) : '';

    let finalYoutubeId = '';
    if (overrideYoutubeId) {
        finalYoutubeId = overrideYoutubeId;
    } else if (isMovieMode) {
        finalYoutubeId = getYoutubeId(content.movieYoutubeId || '');
    } else {
        finalYoutubeId = getYoutubeId(content.youtubeId || '');
    }

    let finalDriveId = '';
    if (isTV) {
        const episodeDriveId = getDriveId(currentEpisode?.driveId || currentEpisode?.videoUrl || '');
        if (episodeDriveId) {
            finalDriveId = episodeDriveId;
        } else if (overrideDriveId) {
            finalDriveId = overrideDriveId;
        } else if (content.movieDriveId) {
            finalDriveId = getDriveId(content.movieDriveId);
        }
    } else {
        if (overrideDriveId) {
            finalDriveId = overrideDriveId;
        } else if (isMovieMode) {
            finalDriveId = getDriveId(content.movieDriveId || (content as any).driveId || '');
        } else {
            if (!finalYoutubeId) {
                finalDriveId = getDriveId(content.movieDriveId || (content as any).driveId || content.youtubeId || '');
            }
        }
    }

    const targetContentId = content.tmdbId ||
        (typeof content.id === 'string' && content.id.startsWith('tmdb_') ? content.id.replace('tmdb_', '') : '') ||
        extractedImdbId ||
        content.id;

    let directVideoUrl: string | null = null;
    if (finalDriveId) {
        // When admin enters a Drive link, external links (iframe embed) MUST NOT OPEN
        directVideoUrl = null;
    } else if (overrideUrl && isDirectVideoUrl(overrideUrl)) {
        // Only lock to overrideUrl if it is an actual direct video file (MP4/HLS/Cloudflare)
        directVideoUrl = overrideUrl;
    } else if (isTV) {
        const sNum = currentSeason?.seasonNumber || routeSeasonEp?.season || urlSeasonEp?.season || 1;
        const eNum = currentEpisode?.episodeNumber || routeSeasonEp?.episode || urlSeasonEp?.episode || 1;
        if (currentEpisode?.videoUrl && isDirectVideoUrl(currentEpisode.videoUrl)) {
            directVideoUrl = currentEpisode.videoUrl;
        } else if (targetContentId && !content.isManual) {
            directVideoUrl = buildServerEmbedUrl(targetContentId, 'tv', activeServer, {
                season: sNum,
                episode: eNum,
                audioTrack,
                settings
            });
        } else if (content.videoUrl && isDirectVideoUrl(content.videoUrl)) {
            directVideoUrl = content.videoUrl;
        } else if (targetContentId) {
            directVideoUrl = buildServerEmbedUrl(targetContentId, 'tv', activeServer, {
                season: sNum,
                episode: eNum,
                audioTrack,
                settings
            });
        }
    } else if (targetContentId && !finalDriveId && !finalYoutubeId && !content.isManual) {
        // Movie streaming server selection
        directVideoUrl = buildServerEmbedUrl(targetContentId, 'movie', activeServer, {
            audioTrack,
            settings
        });
    } else if (overrideUrl && !overrideDriveId && !overrideYoutubeId) {
        directVideoUrl = buildServerEmbedUrl(targetContentId || overrideUrl, 'movie', activeServer, {
            audioTrack,
            settings
        });
    } else {
        directVideoUrl = overrideUrl || null;
    }



    const isHls = directVideoUrl ? directVideoUrl.split('?')[0].toLowerCase().includes('.m3u8') : false;
    const isNativeVideo = useMemo(() => {
        if (!directVideoUrl) return false;
        return isDirectVideoUrl(directVideoUrl);
    }, [directVideoUrl]);
    const isEmbedPlayer = directVideoUrl ? (
        !isNativeVideo && !isHls && (
            directVideoUrl.includes('proxy.garageband.rocks') ||
            (embedBaseHost && directVideoUrl.includes(embedBaseHost)) ||
            directVideoUrl.includes('imdb.com') ||
            /tt\d+/.test(directVideoUrl)
        )
    ) : false;
    const isDirectIframeEmbed = Boolean(directVideoUrl && !isHls && !isNativeVideo);

    const useDirect = Boolean(directVideoUrl && (isHls || isNativeVideo || isDirectIframeEmbed));
    const useDrive = Boolean(finalDriveId && !useDirect);

    const youtubeVideoId = finalYoutubeId;
    const driveIdToUse = finalDriveId;
    const isDriveVideo = useDrive;
    const isExternalStream = isDirectIframeEmbed && !isDriveVideo;
    // --- End Video Source Logic ---

    const handleIframeError = useCallback(() => {
        finishLoading();
    }, [finishLoading]);

    const isMobile = useMemo(() => {
        return (window.innerWidth <= 768 || window.innerHeight <= 768) && /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent);
    }, []);
    const [showEmbedOverlay, setShowEmbedOverlay] = useState(isDirectIframeEmbed && isMobile);
    const [showDriveOverlay, setShowDriveOverlay] = useState(isDriveVideo && isMobile);

    // Popup Loader state - Only show once per day
    const [showContentLoader, setShowContentLoader] = useState(() => {
        if (settings?.contentLoaderEnabled === false) return false;
        const lastShown = localStorage.getItem('last_video_loader_date');
        return lastShown !== new Date().toDateString();
    });
    const [contentLoaderFinished, setContentLoaderFinished] = useState(() => {
        if (settings?.contentLoaderEnabled === false) return true;
        const lastShown = localStorage.getItem('last_video_loader_date');
        return lastShown === new Date().toDateString();
    });



    // Lock orientation to landscape on mobile once playback screen is visible, unlock on unmount
    useEffect(() => {
        if (!isMobile || needsEpisodeSelection) return;
        const lockOrientation = async () => {
            try {
                if (screen.orientation && (screen.orientation as any).lock) {
                    await (screen.orientation as any).lock('landscape');
                }
            } catch (_) { }
        };
        void lockOrientation();

        return () => {
            if (screen.orientation && (screen.orientation as any).unlock) {
                try { (screen.orientation as any).unlock(); } catch (_) { }
            }
        };
    }, [isMobile, needsEpisodeSelection]);

    // Lock document & window scroll during video playback so no scrollbar appears on the side
    useEffect(() => {
        const originalBodyOverflow = document.body.style.overflow;
        const originalHtmlOverflow = document.documentElement.style.overflow;

        document.body.classList.add('video-player-active');
        document.documentElement.classList.add('video-player-active');
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';

        // Immediately pause and mute any background trailer (e.g. HeroBanner YouTube player)
        try {
            const heroIframes = document.querySelectorAll<HTMLIFrameElement>('#hero-player, iframe#hero-player, #hero-player iframe');
            heroIframes.forEach((ifr) => {
                if (ifr?.contentWindow) {
                    ifr.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }), '*');
                    ifr.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'mute', args: [] }), '*');
                    ifr.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'setVolume', args: [0] }), '*');
                    ifr.contentWindow.postMessage({ event: 'command', func: 'pauseVideo', args: [] }, '*');
                    ifr.contentWindow.postMessage({ event: 'command', func: 'mute', args: [] }, '*');
                }
            });
        } catch (_) { }

        return () => {
            if (document.fullscreenElement && document.exitFullscreen) {
                document.exitFullscreen().catch(() => { });
            }
            document.body.classList.remove('video-player-active');
            document.documentElement.classList.remove('video-player-active');
            document.body.style.overflow = originalBodyOverflow;
            document.documentElement.style.overflow = originalHtmlOverflow;
        };
    }, []);

    // Data Usage Warning
    useEffect(() => {
        if (!currentUser?.lowDataMode && !isDriveVideo) {
            setShowDataWarning(true);
            const timer = setTimeout(() => setShowDataWarning(false), 5000);
            return () => clearTimeout(timer);
        }
    }, [currentUser?.lowDataMode, isDriveVideo]);

    // Reset playback states when content or episode changes
    useEffect(() => {
        setIsMovieLoading(true);
        setHasStartedPlaying(false);
    }, [content.id, currentEpisodeIdx, currentSeasonIdx]);

    // Safety fallback so loader never gets stuck indefinitely
    useEffect(() => {
        if (isMovieLoading) {
            const timeout = setTimeout(() => {
                finishLoading();
            }, 5000);
            return () => clearTimeout(timeout);
        }
    }, [isMovieLoading, finishLoading]);




    // Player Options
    const [qualities, setQualities] = useState<string[]>([]);

    const toggleFullscreen = useCallback(async () => {
        try {
            const doc = document as any;
            const isCurrentlyFullscreen = !!(
                doc.fullscreenElement ||
                doc.webkitFullscreenElement ||
                doc.mozFullScreenElement ||
                doc.msFullscreenElement
            );

            if (!isCurrentlyFullscreen) {
                const target = playerContainerRef.current || document.documentElement;
                let entered = false;

                if (target?.requestFullscreen) {
                    try {
                        await target.requestFullscreen();
                        entered = true;
                    } catch (e) {
                        console.warn('target.requestFullscreen failed, trying documentElement', e);
                    }
                } else if ((target as any)?.webkitRequestFullscreen) {
                    try {
                        await (target as any).webkitRequestFullscreen();
                        entered = true;
                    } catch (e) { }
                } else if ((target as any)?.mozRequestFullScreen) {
                    try {
                        await (target as any).mozRequestFullScreen();
                        entered = true;
                    } catch (e) { }
                } else if ((target as any)?.msRequestFullscreen) {
                    try {
                        await (target as any).msRequestFullscreen();
                        entered = true;
                    } catch (e) { }
                }

                if (!entered && document.documentElement.requestFullscreen) {
                    try {
                        await document.documentElement.requestFullscreen();
                        entered = true;
                    } catch (e) {
                        console.warn('documentElement.requestFullscreen failed', e);
                    }
                }

                // Fallback for iOS Safari video element
                if (!entered && videoRef.current) {
                    const videoEl = videoRef.current.getVideoElement ? videoRef.current.getVideoElement() : videoRef.current;
                    if (videoEl?.webkitEnterFullscreen) {
                        try {
                            videoEl.webkitEnterFullscreen();
                            entered = true;
                        } catch (e) { }
                    }
                }

                setIsFullscreen(true);

                // Lock orientation to landscape on mobile after entering fullscreen
                if (isMobile && screen.orientation && (screen.orientation as any).lock) {
                    try {
                        await (screen.orientation as any).lock('landscape');
                    } catch (e) {
                        // Orientation lock ignored
                    }
                }
            } else {
                if (doc.exitFullscreen) {
                    await doc.exitFullscreen();
                } else if (doc.webkitExitFullscreen) {
                    await doc.webkitExitFullscreen();
                } else if (doc.mozCancelFullScreen) {
                    await doc.mozCancelFullScreen();
                } else if (doc.msExitFullscreen) {
                    await doc.msExitFullscreen();
                }
                setIsFullscreen(false);

                // Unlock orientation when exiting fullscreen
                if (isMobile && screen.orientation && (screen.orientation as any).unlock) {
                    try {
                        (screen.orientation as any).unlock();
                    } catch (e) { }
                }
            }
        } catch (err) {
            console.error('Fullscreen toggle failed:', err);
            setIsFullscreen(prev => !prev);
        }
    }, [isMobile]);

    const [isApiReady, setIsApiReady] = useState(!!window.YT && !!window.YT.Player);
    const [currentQuality, setCurrentQuality] = useState('auto');
    const [subtitleTracks, setSubtitleTracks] = useState<any[]>([]);
    const [selectedSubtitle, setSelectedSubtitle] = useState<any>(null); // null = off
    const [selectedAudio, setSelectedAudio] = useState({ id: 'eng_5.1', label: 'English (Original)', format: '5.1' });

    const playerRef = useRef<any>(null);
    const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const progressRef = useRef(initialProgress);
    const playerContainerRef = useRef<HTMLDivElement>(null);



    // Dynamic Audio Options
    const [audioTracks, setDynamicAudioTracks] = useState<any[]>([]);
    const AUDIO_OPTIONS = useMemo(() => {
        if (audioTracks.length > 0) {
            return audioTracks.map(t => ({
                id: String(t.id),
                label: t.label || t.language || `Track ${t.id}`,
                format: t.codec || ''
            }));
        }
        return [
            { id: 'eng_5.1', label: 'English (Original)', format: '5.1' },
            { id: 'eng_stereo', label: 'English', format: 'Stereo' },
            { id: 'hin_5.1', label: 'Hindi', format: '5.1' }
        ];
    }, [audioTracks]);

    const onPlayerReady = (event: any) => {
        setIsPlayerReady(true);
        setIsBuffering(false);
        const playerDuration = event.target.getDuration();
        if (playerDuration > 0) setDuration(playerDuration);

        let avQualities = event.target.getAvailableQualityLevels();
        if (!avQualities || avQualities.length === 0) {
            // Fallback for when API returns empty (common with certain embeds)
            avQualities = ['auto', 'hd1080', 'hd720', 'large', 'medium', 'small'];
        }
        setQualities(avQualities);

        if (initialProgress > 0) {
            const seekTime = (initialProgress / 100) * playerDuration;
            event.target.seekTo(seekTime, true);
        } else {
            // Force high quality start for new playbacks
            event.target.setPlaybackQuality('hd1080');
        }
        if (playing && contentLoaderFinished) {
            event.target.playVideo();
        } else {
            // Wait for loader to finish
            setInitialLoad(false);
        }
        event.target.loadModule('captions');
    };

    // Auto-play when loader finishes
    useEffect(() => {
        if (contentLoaderFinished && isPlayerReady && playerRef.current?.playVideo && playing) {
            playerRef.current.playVideo();
        }
    }, [contentLoaderFinished, isPlayerReady, playing]);

    const onPlayerStateChange = (event: any) => {
        if (event.data === window.YT.PlayerState.PLAYING) {
            setPlaying(true);
            setIsBuffering(false);
            finishLoading();
            setDuration(event.target.getDuration());
        } else if (event.data === window.YT.PlayerState.PAUSED) {
            setPlaying(false);
            finishLoading();
        } else if (event.data === window.YT.PlayerState.BUFFERING) {
            setIsBuffering(true);
        } else if (event.data === window.YT.PlayerState.ENDED) {
            setPlaying(false);
            triggerEpisodeEndedRef.current();
        }
    };

    const handleSkip = useCallback((seconds: number) => {
        // 1. Native or HLS Video (Direct DOM / MoviEngine)
        if ((isHls || isNativeVideo) && videoRef.current) {
            videoRef.current.currentTime += seconds;
            const absSec = Math.abs(seconds);
            showOsd(
                seconds > 0 ? `+${absSec}s` : `-${absSec}s`,
                seconds > 0 ? 'Forward 5s' : 'Rewind 5s',
                'zap'
            );
        }
        // 2. YouTube IFrame Player (Only when YouTube is the active visible player)
        else if (!directVideoUrl && !isDriveVideo && playerRef.current && playerRef.current.getCurrentTime) {
            const curr = playerRef.current.getCurrentTime();
            playerRef.current.seekTo(curr + seconds, true);
            const absSec = Math.abs(seconds);
            showOsd(
                seconds > 0 ? `+${absSec}s` : `-${absSec}s`,
                seconds > 0 ? 'Forward 5s' : 'Rewind 5s',
                'zap'
            );
        }
        // 3. External Link Player (Iframe Embed) - Browser CORS security prevents outer script from manipulating third-party video
        else if (isDirectIframeEmbed) {
            showOsd(
                'External Stream Player',
                'Click inside player to use internal seekbar or ← / → arrow keys',
                'zap'
            );
        }
    }, [isHls, isNativeVideo, directVideoUrl, isDriveVideo, isDirectIframeEmbed, showOsd]);

    // Unified Play/Pause toggle supporting HLS, native video, and YouTube API
    const togglePlayState = useCallback(() => {
        if ((isHls || isNativeVideo) && videoRef.current) {
            const nextPlaying = !playing;
            setPlaying(nextPlaying);
            if (nextPlaying) videoRef.current.play().catch(() => { });
            else videoRef.current.pause();
        } else if (!directVideoUrl && !isDriveVideo && playerRef.current && playerRef.current.playVideo) {
            const nextPlaying = !playing;
            setPlaying(nextPlaying);
            if (nextPlaying) playerRef.current.playVideo();
            else playerRef.current.pauseVideo();
        } else if (isDirectIframeEmbed) {
            showOsd(
                'External Stream Player',
                'Use the play/pause button directly on the video player',
                'zap'
            );
        }
    }, [playing, isHls, isNativeVideo, directVideoUrl, isDriveVideo, isDirectIframeEmbed, showOsd]);

    const handleQualityChange = (quality: string) => {
        if (!playerRef.current) return;

        const currentTime = playerRef.current.getCurrentTime();

        // Use loadVideoById to force a reload stream with new quality (most reliable method)
        // This persists the quality better than setPlaybackQuality
        playerRef.current.loadVideoById({
            videoId: youtubeVideoId,
            startSeconds: currentTime,
            suggestedQuality: quality
        });

        setCurrentQuality(quality);
        setShowSettingsMenu(false);
    };

    const BOOST_PRESETS = [1.0, 1.5, 2.0, 3.0, 4.0];

    const cycleBoost = useCallback(() => {
        if (isExternalStream) {
            showOsd('External Embed Stream', 'Browser security blocks websites from modifying external iframe audio.', 'zap');
            return;
        }
        const levels = [1.0, 1.5, 2.0, 3.0, 4.0];
        const nextIndex = (levels.findIndex(l => Math.abs(l - boostLevel) < 0.05) + 1) % levels.length;
        const nextBoost = levels[nextIndex];
        setBoostLevel(nextBoost);
        if (nextBoost > 1.0) {
            showOsd(`SOUND BOOST: ${Math.round(nextBoost * 100)}%`, `${nextBoost}x Maximum Audio`, 'zap');
        } else {
            showOsd('SOUND BOOST: OFF', 'Standard 100% Volume', 'volume');
        }
    }, [isExternalStream, boostLevel, showOsd]);

    const setBoostPreset = useCallback((factor: number) => {
        if (isExternalStream) {
            showOsd('External Embed Stream', 'Browser security blocks websites from modifying external iframe audio.', 'zap');
            return;
        }
        setBoostLevel(factor);
        if (factor > 1.0) {
            showOsd(`SOUND BOOST: ${Math.round(factor * 100)}%`, `${factor}x Browser Audio`, 'zap');
        } else {
            showOsd('SOUND BOOST: OFF', 'Standard 100% Volume', 'volume');
        }
    }, [isExternalStream, showOsd]);

    // Sound Booster Sync
    useEffect(() => {
        soundBooster.setBoost(boostLevel);
        if (videoRef.current?.setBoost) {
            videoRef.current.setBoost(boostLevel);
        }
        try {
            localStorage.setItem('mydonkey_sound_boost_level', String(boostLevel));
        } catch { }
    }, [boostLevel]);

    useEffect(() => {
        soundBooster.setDialogueClarity(dialogueClarity);
        try {
            localStorage.setItem('mydonkey_dialogue_boost', String(dialogueClarity));
        } catch { }
    }, [dialogueClarity]);

    useEffect(() => {
        soundBooster.setLimiter(limiterEnabled);
    }, [limiterEnabled]);

    // YouTube-style Double-Tap Seek Feedback
    const [seekFeedback, setSeekFeedback] = useState<{ side: 'left' | 'right'; seconds: number } | null>(null);
    const seekFeedbackTimeoutRef = useRef<any>(null);

    const triggerRipple = useCallback((side: 'left' | 'right', deltaSeconds: number = 5) => {
        setRippleSides(prev => [...prev, side]);
        setTimeout(() => {
            setRippleSides(prev => prev.filter(s => s !== side));
        }, 500);

        setSeekFeedback(prev => {
            if (prev && prev.side === side) {
                return { side, seconds: prev.seconds + deltaSeconds };
            }
            return { side, seconds: deltaSeconds };
        });

        if (seekFeedbackTimeoutRef.current) clearTimeout(seekFeedbackTimeoutRef.current);
        seekFeedbackTimeoutRef.current = setTimeout(() => {
            setSeekFeedback(null);
        }, 800);
    }, []);

    const onPlayerApiChange = () => {
        if (playerRef.current && playerRef.current.getOptions) {
            const options = playerRef.current.getOptions();
            if (options.includes('captions')) {
                const tracks = playerRef.current.getOption('captions', 'tracklist') || [];
                setSubtitleTracks(tracks);
            }
        }
    };

    // Initialize HLS Player
    const videoRef = useRef<any>(null);
    const hlsRef = useRef<Hls | null>(null);

    useEffect(() => {
        // HLS initialization is now handled internally by MoviVideo
        return () => { };
    }, [isHls, directVideoUrl]);

    // Handle loaded metadata and dynamic track extraction
    const handleLoadedMetadata = useCallback((e: any) => {
        if (videoRef.current) {
            setIsPlayerReady(true);
            finishLoading();
            const dur = videoRef.current.duration || e?.target?.duration || 0;
            setDuration(dur);

            // Query dynamic tracks from Movi player
            if (videoRef.current.getSubtitleTracks) {
                const subs = videoRef.current.getSubtitleTracks();
                if (subs && subs.length > 0) {
                    setSubtitleTracks(subs.map((s: any) => ({
                        id: s.id,
                        languageCode: s.language || s.label || `sub_${s.id}`,
                        displayName: s.label || s.language || `Subtitle ${s.id}`
                    })));
                }
            }
            if (videoRef.current.getAudioTracks) {
                const auds = videoRef.current.getAudioTracks();
                if (auds && auds.length > 0) {
                    setDynamicAudioTracks(auds);
                    // Find active track and set it
                    const activeTrack = auds.find((t: any) => t.id === videoRef.current.getActiveAudioTrack?.()?.id) || auds[0];
                    setSelectedAudio({
                        id: String(activeTrack.id),
                        label: activeTrack.label || activeTrack.language || `Track ${activeTrack.id}`,
                        format: activeTrack.codec || ''
                    });
                }
            }

            if (playing) {
                videoRef.current.play().catch(console.error);
            }
        }
    }, [playing]);

    // Sync selectedAudio to Movi player
    useEffect(() => {
        if (selectedAudio && videoRef.current && videoRef.current.setAudioTrack) {
            const trackId = parseInt(selectedAudio.id, 10);
            if (!isNaN(trackId)) {
                videoRef.current.setAudioTrack(trackId);
            }
        }
    }, [selectedAudio]);

    // Sync HLS/Native Playback state
    useEffect(() => {
        if (!(isHls || isNativeVideo) || !videoRef.current) return;
        if (playing) videoRef.current.play().catch(() => { });
        else videoRef.current.pause();
    }, [playing, isHls, isNativeVideo]);

    // HLS/Native Progress Tracking
    useEffect(() => {
        if (!(isHls || isNativeVideo) || !videoRef.current) return;
        const interval = setInterval(() => {
            if (videoRef.current && playing) {
                const curr = videoRef.current.currentTime;
                const dur = videoRef.current.duration;
                setCurrentTime(curr);
                if (curr > 0) {
                    setHasStartedPlaying(true);
                }
                if (dur > 0) {
                    setDuration(dur);
                    const prog = (curr / dur) * 100;
                    setProgress(prog);
                    progressRef.current = prog;
                    if (dur > 30 && curr >= dur - 0.75) {
                        triggerEpisodeEndedRef.current();
                    }
                }
            }
        }, 500);
        return () => clearInterval(interval);
    }, [playing, isHls, isNativeVideo]);

    // Sync Vol/Mute for HLS/Native
    useEffect(() => {
        if (!(isHls || isNativeVideo) || !videoRef.current) return;
        const effectiveVol = isMuted ? 0 : (volume / 100) * boostLevel;
        videoRef.current.volume = effectiveVol;
        videoRef.current.muted = isMuted;
        if (videoRef.current.setBoost) {
            videoRef.current.setBoost(boostLevel);
        }
        soundBooster.setBoost(boostLevel);
        soundBooster.scanAndAttach();
    }, [volume, isMuted, isHls, isNativeVideo, boostLevel]);

    // Initialize YouTube Player (only when YouTube is the active visible player)
    useEffect(() => {
        if (needsEpisodeSelection || !isApiReady || isDriveVideo || isHls || isNativeVideo || isDirectIframeEmbed || playerRef.current || !youtubeVideoId) return;
        if (!/^[a-zA-Z0-9_-]{11}$/.test(youtubeVideoId)) {
            setPlaybackError('Invalid video source. Please go back or search for another title.');
            finishLoading();
            return;
        }

        try {
            playerRef.current = new window.YT.Player('youtube-player', {
                videoId: youtubeVideoId,
                playerVars: {
                    autoplay: playing ? 1 : 0,
                    controls: 0,
                    modestbranding: 1,
                    rel: 0,
                    iv_load_policy: 3,
                    playsinline: 1,
                    origin: window.location.origin, // Critical for API communication
                    enablejsapi: 1
                },
                events: {
                    onReady: onPlayerReady,
                    onStateChange: onPlayerStateChange,
                    onApiChange: onPlayerApiChange,
                    onError: (e: any) => {
                        console.error('YouTube Player Error:', e.data);
                        setIsBuffering(false);
                        let msg = 'Playback error occurred';
                        if (e.data === 2) msg = 'Invalid video ID';
                        if (e.data === 5) msg = 'Embedded player error';
                        if (e.data === 100) msg = 'Video not found or removed';
                        if (e.data === 101 || e.data === 150) msg = 'Playback restricted by owner';
                        setPlaybackError(msg);
                    }
                }
            });
        } catch (err) {
            console.error('Failed to initialize YouTube Player:', err);
            setIsBuffering(false);
            finishLoading();
            setPlaybackError('Unable to load this video stream. Please go back or search for new content.');
        }

        return () => {
            if (playerRef.current) {
                try {
                    playerRef.current.destroy();
                    playerRef.current = null;
                    setIsPlayerReady(false);
                } catch (e) {
                    console.error('Error destroying YT player:', e);
                }
            }
        };
    }, [needsEpisodeSelection, isApiReady, isDriveVideo, isHls, isNativeVideo, isDirectIframeEmbed, youtubeVideoId]);

    // React -> Player Sync & Logging
    useEffect(() => {
        if (isDriveVideo || isHls || isNativeVideo || isDirectIframeEmbed) return;
        if (!playerRef.current?.playVideo) return;

        if (playing) {
            playerRef.current.playVideo();
            logUserActivity(currentUser?.uid, currentUser?.email, 'video_play', { contentId: content.id, title: content.title }, currentUser?.isGuest);
        } else {
            playerRef.current.pauseVideo();
            logUserActivity(currentUser?.uid, currentUser?.email, 'video_pause', { contentId: content.id, title: content.title }, currentUser?.isGuest);
        }
    }, [playing, isDriveVideo]);

    // Real Screentime Heartbeat (Every 10 seconds)
    useEffect(() => {
        if (!playing || !currentUser?.uid || currentUser?.isGuest) return;

        const heartbeat = setInterval(() => {
            incrementWatchTime(currentUser.uid, 60);
        }, 60000);

        return () => clearInterval(heartbeat);
    }, [playing, currentUser?.uid, currentUser?.isGuest]);

    // Comprehensive Mute & Volume Synchronizer (Native, HLS, YouTube, Google Drive, and Iframe Embeds)
    useEffect(() => {
        // 1. Synchronize Web Audio SoundBooster pipeline
        soundBooster.setMuted(isMuted);

        // 2. Direct MoviVideo / HLS player element
        if (videoRef.current) {
            try {
                videoRef.current.muted = isMuted;
                const effectiveVol = isMuted ? 0 : (volume / 100) * boostLevel;
                videoRef.current.volume = effectiveVol;
                if (videoRef.current.setBoost) {
                    videoRef.current.setBoost(boostLevel);
                }
            } catch { }
        }

        // 3. YouTube Player API
        if (playerRef.current) {
            try {
                if (isMuted) {
                    playerRef.current.mute?.();
                } else {
                    playerRef.current.unMute?.();
                    playerRef.current.setVolume?.(volume);
                }
            } catch { }
        }

        // 4. Synchronize all HTMLMediaElements in this video player container
        try {
            const container = playerContainerRef.current;
            if (container) {
                container.querySelectorAll<HTMLMediaElement>('video, audio').forEach((el) => {
                    el.muted = isMuted;
                    if (isMuted) {
                        el.volume = 0;
                    } else {
                        el.volume = Math.min(1, Math.max(0, volume / 100));
                    }
                });
            }
        } catch { }

        // 5. Broadcast postMessage mute/unmute ONLY to iframes inside this video player container
        try {
            const container = playerContainerRef.current;
            if (container) {
                const iframes = container.querySelectorAll<HTMLIFrameElement>('iframe');
                iframes.forEach((iframe) => {
                    // Strictly exclude any background hero-player
                    if (iframe.id === 'hero-player' || iframe.closest('#hero-player')) return;

                    const win = iframe.contentWindow;
                    if (!win) return;

                    // YouTube & Google Drive style command
                    const ytCmd = {
                        event: 'command',
                        func: isMuted ? 'mute' : 'unMute',
                        args: []
                    };
                    win.postMessage(ytCmd, '*');
                    win.postMessage(JSON.stringify(ytCmd), '*');

                    const ytVolCmd = {
                        event: 'command',
                        func: 'setVolume',
                        args: [isMuted ? 0 : volume]
                    };
                    win.postMessage(ytVolCmd, '*');
                    win.postMessage(JSON.stringify(ytVolCmd), '*');

                    // HTML5 / Video.js / Plyr / JW Player style commands
                    const standardCommands = [
                        { type: isMuted ? 'mute' : 'unmute' },
                        { action: isMuted ? 'mute' : 'unmute' },
                        { method: isMuted ? 'mute' : 'unmute' },
                        { command: isMuted ? 'mute' : 'unmute' },
                        { event: isMuted ? 'mute' : 'unmute' },
                        { api: isMuted ? 'mute' : 'unmute' },
                        { type: 'volumechange', volume: isMuted ? 0 : (volume / 100) },
                        { action: 'setVolume', value: isMuted ? 0 : (volume / 100) },
                        { command: 'setVolume', args: [isMuted ? 0 : (volume / 100)] }
                    ];

                    standardCommands.forEach((cmd) => {
                        try {
                            win.postMessage(cmd, '*');
                            win.postMessage(JSON.stringify(cmd), '*');
                        } catch { }
                    });

                    // Safe cross-origin / same-origin DOM access attempt
                    try {
                        const innerDoc = iframe.contentDocument || iframe.contentWindow?.document;
                        if (innerDoc) {
                            innerDoc.querySelectorAll<HTMLMediaElement>('video, audio').forEach((media) => {
                                media.muted = isMuted;
                                media.volume = isMuted ? 0 : Math.min(1, volume / 100);
                            });
                        }
                    } catch { }
                });
            }
        } catch (e) {
            console.warn('Error broadcasting mute state:', e);
        }

        // 6. Guarantee any background hero trailer is permanently muted & paused
        try {
            const bgHeroIframes = document.querySelectorAll<HTMLIFrameElement>('#hero-player, iframe#hero-player, #hero-player iframe');
            bgHeroIframes.forEach((ifr) => {
                if (ifr?.contentWindow) {
                    ifr.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }), '*');
                    ifr.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'mute', args: [] }), '*');
                    ifr.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'setVolume', args: [0] }), '*');
                    ifr.contentWindow.postMessage({ event: 'command', func: 'pauseVideo', args: [] }, '*');
                    ifr.contentWindow.postMessage({ event: 'command', func: 'mute', args: [] }, '*');
                }
            });
        } catch { }
    }, [volume, isMuted, boostLevel]);

    // Progress Loop
    useEffect(() => {
        if (isDriveVideo || isHls || isNativeVideo || isDirectIframeEmbed) return;
        const interval = setInterval(() => {
            if (playerRef.current && playing && playerRef.current.getCurrentTime) {
                const curr = playerRef.current.getCurrentTime();
                const dur = playerRef.current.getDuration();
                setCurrentTime(curr);
                if (curr > 0) {
                    setHasStartedPlaying(true);
                }
                setDuration(dur);
                const prog = (curr / dur) * 100;
                setProgress(prog);
                progressRef.current = prog;
                setShowSkipIntro(curr > 30 && curr < 120 && content.type === 'tv');
            }
        }, 500);
        return () => clearInterval(interval);
    }, [playing, isDriveVideo, currentUser?.role, content.duration]);

    // Check for duration update (Auto-calculate) - Run once per session
    const hasUpdatedDuration = useRef(false);

    useEffect(() => {
        if (!content || !playerRef.current || isHls || !currentUser || currentUser.role !== 'admin') return;
        if (hasUpdatedDuration.current) return;

        // Check once after 5 seconds of playback
        const checkTimer = setTimeout(() => {
            if (playerRef.current && playerRef.current.getDuration) {
                const duration = playerRef.current.getDuration();
                if (duration > 0) {
                    const mins = Math.floor(duration / 60);
                    const durationStr = `${mins}m`;

                    // Only update if missing or different (and valid)
                    if (mins > 0 && content.duration !== durationStr) {
                        updateContentDuration(content.id, durationStr)
                            .catch(() => { });
                        hasUpdatedDuration.current = true; // Block future updates
                    }
                }
            }
        }, 5000);

        return () => clearTimeout(checkTimer);
    }, [content.id, currentUser?.role, playing]);

    // ==========================================
    // Playback Progress Safeguard (5-Point Optimization)
    // 1. Continuous cheap local storage (survives crashes, 0 Firestore cost)
    // 2. Throttled periodic Firestore write (every 30s, >= 20s delta)
    // 3. Immediate Firestore sync on pause (if changed)
    // 4. Flush on beforeunload / pagehide / unmount
    // 5. Never write while paused without meaningful change
    // ==========================================
    const lastSavedProgressTimeRef = useRef<number>(savedState?.stoppedAt || 0);
    const lastLocalSaveTimeRef = useRef<number>(0);
    const currentTimeRef = useRef<number>(currentTime);
    const durationRef = useRef<number>(duration);

    currentTimeRef.current = currentTime;
    durationRef.current = duration;

    // 1. Continuous cheap local save (survives browser crashes, 0 network cost)
    useEffect(() => {
        if (isTrailer) return;
        if (currentTime > 0 && Math.abs(currentTime - lastLocalSaveTimeRef.current) >= 3) {
            lastLocalSaveTimeRef.current = currentTime;
            try {
                const raw = localStorage.getItem('my_donkey_watch_history');
                const list = raw ? JSON.parse(raw) : [];
                const prevEntry = list.find((i: any) => i.movieId === content.id);
                const filtered = list.filter((i: any) => i.movieId !== content.id);
                filtered.unshift({
                    movieId: content.id,
                    progress: progressRef.current,
                    stoppedAt: currentTime,
                    duration: duration || prevEntry?.duration || 7200,
                    lastWatchedAt: new Date().toISOString(),
                    content: content
                });
                localStorage.setItem('my_donkey_watch_history', JSON.stringify(filtered.slice(0, 40)));
                window.dispatchEvent(new CustomEvent('mydonkey_watch_updated', { detail: { movieId: content.id } }));
            } catch (_) { }
        }
    }, [currentTime, content, duration, isTrailer]);

    // Throttled browser cache sync handler
    const syncProgressToFirestore = useCallback((force = false) => {
        const curr = currentTimeRef.current;
        const dur = durationRef.current;
        const prog = progressRef.current;
        if (dur > 0 && curr > 3) {
            const diff = Math.abs(curr - lastSavedProgressTimeRef.current);
            if (force || diff >= 10) {
                lastSavedProgressTimeRef.current = curr;
                updatePlaybackProgress(content.id, prog, curr, dur, content);
            }
        }
    }, [content, updatePlaybackProgress]);

    // 3. Immediate save on pause
    const prevPlayingRef = useRef(playing);
    useEffect(() => {
        if (prevPlayingRef.current && !playing) {
            syncProgressToFirestore(false);
        }
        prevPlayingRef.current = playing;
    }, [playing, syncProgressToFirestore]);

    // 2. Periodic sync while playing only (interval cleared immediately when paused)
    useEffect(() => {
        if (isDriveVideo || isHls || isTrailer) return;
        if (!playing) return;

        const saveInterval = setInterval(() => {
            syncProgressToFirestore(false);
        }, 30000);

        return () => clearInterval(saveInterval);
    }, [playing, isDriveVideo, isHls, isTrailer, syncProgressToFirestore]);

    // 4. Save on window unload / unmount
    useEffect(() => {
        const handleUnload = () => {
            syncProgressToFirestore(false);
        };
        window.addEventListener('beforeunload', handleUnload);
        window.addEventListener('pagehide', handleUnload);

        return () => {
            window.removeEventListener('beforeunload', handleUnload);
            window.removeEventListener('pagehide', handleUnload);
            syncProgressToFirestore(false);
        };
    }, [syncProgressToFirestore]);


    // Controls Visibility Timer (Hides after 3.5 seconds of inactivity; stays open while any menu is open)
    const resetInactivityTimer = useCallback(() => {
        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = setTimeout(() => {
            if (!showStats && !showSettingsMenu && !showEpisodesMenu) {
                setShowControls(false);
            }
        }, 3500);
    }, [showStats, showSettingsMenu, showEpisodesMenu]);

    useEffect(() => {
        const handleUserActivity = () => {
            if (document.activeElement?.tagName === 'IFRAME') {
                finishLoading();
            }
            resetInactivityTimer();
        };

        const events = ['mousemove', 'pointermove', 'mousedown', 'pointerdown', 'touchstart', 'touchmove', 'wheel', 'scroll', 'keydown'];
        events.forEach(evt => {
            window.addEventListener(evt, handleUserActivity, { capture: true, passive: true });
        });

        // Detect interactions when user clicks into or focuses iframe player
        window.addEventListener('blur', handleUserActivity);
        window.addEventListener('focus', handleUserActivity);

        // Initial timer on mount
        resetInactivityTimer();

        return () => {
            events.forEach(evt => {
                window.removeEventListener(evt, handleUserActivity, { capture: true } as any);
            });
            window.removeEventListener('blur', handleUserActivity);
            window.removeEventListener('focus', handleUserActivity);
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        };
    }, [resetInactivityTimer]);

    // Unified Fullscreen change listener: sync state & keep container promoted for overlays
    useEffect(() => {
        const handleFullscreenChange = () => {
            const doc = document as any;
            const fsElement =
                doc.fullscreenElement ||
                doc.webkitFullscreenElement ||
                doc.mozFullScreenElement ||
                doc.msFullscreenElement;
            const isFull = !!fsElement;
            setIsFullscreen(isFull);
            resetInactivityTimer();

            // If an inner child (such as the embed iframe, video, or canvas) entered fullscreen,
            // promote our playerContainerRef to fullscreen so overlays & watermark stay consistent
            if (fsElement && playerContainerRef.current && fsElement !== playerContainerRef.current) {
                if (playerContainerRef.current.contains(fsElement)) {
                    try {
                        const requestFS = playerContainerRef.current.requestFullscreen ||
                            (playerContainerRef.current as any).webkitRequestFullscreen ||
                            (playerContainerRef.current as any).mozRequestFullScreen ||
                            (playerContainerRef.current as any).msRequestFullscreen;
                        if (requestFS) {
                            requestFS.call(playerContainerRef.current).catch(() => { });
                        }
                    } catch { }
                }
            }
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', handleFullscreenChange);
        document.addEventListener('MSFullscreenChange', handleFullscreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
            document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
        };
    }, [resetInactivityTimer]);

    // When menus close, automatically begin inactivity hide countdown
    useEffect(() => {
        if (!showEpisodesMenu && !showSettingsMenu && !showStats) {
            resetInactivityTimer();
        } else {
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
            setShowControls(true);
        }
    }, [showEpisodesMenu, showSettingsMenu, showStats, resetInactivityTimer]);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if user is typing in an input
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

            // 'f' or 'F' button: ALWAYS toggle fullscreen across ALL player modes (including external iframe embeds)
            if (e.key === 'f' || e.key === 'F' || e.code === 'KeyF') {
                e.preventDefault();
                toggleFullscreen();
                resetInactivityTimer();
                return;
            }

            if (e.key === 'Escape' || e.code === 'Escape') {
                if (document.fullscreenElement) {
                    toggleFullscreen();
                } else {
                    onClose();
                }
                return;
            }

            // For external embeds, do not intercept Space/Arrows so the iframe receives them natively
            if (isDirectIframeEmbed) return;

            switch (e.code) {
                case 'Space':
                case 'KeyK':
                    e.preventDefault();
                    togglePlayState();
                    break;
                case 'ArrowLeft':
                case 'KeyJ':
                    e.preventDefault();
                    handleSkip(-5);
                    triggerRipple('left', 5);
                    break;
                case 'ArrowRight':
                case 'KeyL':
                    e.preventDefault();
                    handleSkip(5);
                    triggerRipple('right', 5);
                    break;
                case 'KeyB':
                    e.preventDefault();
                    cycleBoost();
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setVolume(prev => {
                        const next = Math.min(100, prev + 5);
                        showOsd(`Volume: ${next}%`, boostLevel > 1.0 ? `Sound Boost: ${Math.round(boostLevel * 100)}%` : undefined, 'volume');
                        return next;
                    });
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    setVolume(prev => {
                        const next = Math.max(0, prev - 5);
                        showOsd(`Volume: ${next}%`, undefined, 'volume');
                        return next;
                    });
                    break;
                case 'KeyM':
                    e.preventDefault();
                    setIsMuted(prev => {
                        const next = !prev;
                        showOsd(next ? 'Muted' : 'Unmuted', undefined, next ? 'mute' : 'volume');
                        return next;
                    });
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleSkip, triggerRipple, toggleFullscreen, onClose, cycleBoost, boostLevel, showOsd, isDirectIframeEmbed, resetInactivityTimer]);


    // Resume Logic: Watch for currentUser to populate if it wasn't ready initially
    // Resume Logic: Watch for currentUser to populate if it wasn't ready initially
    useEffect(() => {
        if (!playerRef.current || !savedState?.stoppedAt) return;

        // Ensure the player API is actually ready and has the methods we need
        if (typeof playerRef.current.getCurrentTime !== 'function' || typeof playerRef.current.seekTo !== 'function') return;

        const currentPlTime = playerRef.current.getCurrentTime();
        if (Math.abs(currentPlTime - savedState.stoppedAt) > 10 && currentPlTime < 10) {
            playerRef.current.seekTo(savedState.stoppedAt, true);
        }
    }, [currentUser, savedState]);

    // Mobile Auto-Rotate & Fullscreen Logic
    useEffect(() => {
        // Auto-fullscreen is handled by the user gesture to comply with browser policies

        // handleAutoFullscreen(); // Disabled to prevent "user gesture" errors

        // Cleanup: Unlock and exit fullscreen on unmount
        return () => {
            if (isMobile) {
                try {
                    // @ts-ignore
                    if (screen.orientation && screen.orientation.unlock) {
                        // @ts-ignore
                        screen.orientation.unlock();
                    }
                } catch (e) { }
            }

            if (document.fullscreenElement && document.exitFullscreen) {
                document.exitFullscreen().catch(() => { });
            }
        };
    }, [content.playMode, currentUser?.autoFullscreen]);

    // Gesture State
    const lastTapRef = useRef<{ time: number, x: number } | null>(null);
    const [rippleSides, setRippleSides] = useState<('left' | 'right')[]>([]);

    const startHideTimer = useCallback(() => {
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = setTimeout(() => {
            if (!showStats && !showSettingsMenu && !showEpisodesMenu) {
                setShowControls(false);
            }
        }, 3500);
    }, [showStats, showSettingsMenu, showEpisodesMenu]);

    const handleTap = (e: React.MouseEvent) => {
        const now = Date.now();
        const x = e.clientX;

        // Auto-fullscreen and rotate on first tap for mobile to satisfy user gesture policy
        if (isMobile && !document.fullscreenElement) {
            toggleFullscreen();
        }

        // Double Tap Logic: 5 seconds skip like YouTube
        if (lastTapRef.current && (now - lastTapRef.current.time) < 320) {
            const isLeft = x < window.innerWidth / 2;
            if (isLeft) {
                handleSkip(-5);
                triggerRipple('left', 5);
            } else {
                handleSkip(5);
                triggerRipple('right', 5);
            }
            lastTapRef.current = null; // Reset
        } else {
            // Single Tap: if controls visible → hide immediately; if hidden → show + start 3s timer
            if (showControls) {
                if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
                setShowControls(false);
            } else {
                setShowControls(true);
                startHideTimer();
            }
            lastTapRef.current = { time: now, x };
        }
    };

    const isPlayerReadyRef = useRef(isPlayerReady);
    const playingRef = useRef(playing);
    useEffect(() => { isPlayerReadyRef.current = isPlayerReady; }, [isPlayerReady]);
    useEffect(() => { playingRef.current = playing; }, [playing]);

    const handleLoaderComplete = useCallback(() => {
        setShowContentLoader(false);
        setContentLoaderFinished(true);

        // Save today's date so we don't show it again until tomorrow
        localStorage.setItem('last_video_loader_date', new Date().toDateString());

        if (isPlayerReadyRef.current && playingRef.current && playerRef.current?.playVideo) {
            playerRef.current.playVideo();
        }
    }, []);

    // Also auto-hide loader if video becomes ready early (after min 1.5s display)
    useEffect(() => {
        if (isPlayerReady && showContentLoader) {
            const elapsed = Date.now() - loaderStartTime;
            const remaining = Math.max(0, 1500 - elapsed);
            const timer = setTimeout(() => {
                handleLoaderComplete();
            }, remaining);
            return () => clearTimeout(timer);
        }
    }, [isPlayerReady, showContentLoader, handleLoaderComplete, loaderStartTime]);

    const handleIframeLoad = () => {
        setTimeout(() => {
            finishLoading();
        }, 800);
    };

    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        if (isDriveVideo) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        const newTime = pos * duration;
        setProgress(pos * 100);

        if ((isHls || isNativeVideo) && videoRef.current) {
            videoRef.current.currentTime = newTime;
        } else if (playerRef.current) {
            playerRef.current.seekTo(newTime, true);
        }
    };

    const handleSubtitleChange = (track: any) => {
        setSelectedSubtitle(track);
        if (playerRef.current) {
            if (track) {
                playerRef.current.setOption('captions', 'track', { languageCode: track.languageCode });
                playerRef.current.loadModule('captions'); // Ensure visible
            } else {
                playerRef.current.unloadModule('captions'); // Hide
                playerRef.current.setOption('captions', 'track', {}); // Reset
            }
        }
        if (videoRef.current && videoRef.current.setSubtitle) {
            videoRef.current.setSubtitle(track ? track.id : null);
        }
    };

    // Fallback if API doesn't return tracks (common for embeds)
    const effectiveSubtitleTracks = subtitleTracks.length > 0 ? subtitleTracks : [
        { languageCode: 'en', displayName: 'English' },
        { languageCode: 'es', displayName: 'Spanish' },
        { languageCode: 'fr', displayName: 'French' }
    ];
    const formatTime = (time: number) => {
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const isSports = content.genres?.includes('Sports') || content.tags?.includes('Sports');

    // --- Movie / TV Player Source Link Transformer ---
    const getFinalVideoUrl = (url: string) => {
        if (!url) return '';
        const trimmed = url.trim();

        const fallbackType = isTV ? 'tv' : 'movie';
        const activeSeason = currentSeason?.seasonNumber || initialTargetSeason;
        const activeEpisode = currentEpisode?.episodeNumber || initialTargetEpisode;

        // Keep Nxsha embed URLs directly, with active season & episode for TV
        if (trimmed.includes('nxsha.space')) {
            if (isTV && activeSeason && activeEpisode) {
                if (trimmed.includes('/embed/tv/')) {
                    return trimmed.replace(/\/embed\/tv\/([^\/]+)(?:\/\d+\/\d+)?/, `/embed/tv/$1/${activeSeason}/${activeEpisode}`);
                }
            }
            return trimmed;
        }

        const imdbMatch = trimmed.match(/(tt\d+)/);

        // If content is 100% manual, bypass all external embed transformations
        if (content.isManual) {
            return url;
        }

        // Route IMDb IDs, legacy proxy URLs, or legacy server URLs to Nxsha
        if (
            trimmed.includes('imdb.com') ||
            /^tt\d+$/.test(trimmed) ||
            trimmed.includes('proxy.garageband.rocks') ||
            (embedBaseHost && trimmed.includes(embedBaseHost))
        ) {
            const idForNxsha = content.tmdbId || imdbMatch?.[1];
            if (idForNxsha) {
                return buildServerEmbedUrl(idForNxsha, fallbackType, 'nxsha', {
                    season: activeSeason,
                    episode: activeEpisode,
                    audioTrack,
                    settings
                });
            }
        }

        return url;
    };

    const finalUrl = useMemo(
        () => getFinalVideoUrl(directVideoUrl || ''),
        [directVideoUrl, isTV, settings, embedBaseHost, audioTrack, content.tmdbId, currentSeason?.seasonNumber, currentEpisode?.episodeNumber, initialTargetSeason, initialTargetEpisode]
    );

    // Dynamically update document title to movie/show (and episode) name during playback
    useEffect(() => {
        if (content?.title) {
            const titleText = (isTV && hasSelectedEpisode && currentSeason && currentEpisode)
                ? `${content.title} — S${currentSeason.seasonNumber} E${currentEpisode.episodeNumber}`
                : content.title;
            setWebpageTitle(titleText);
            if (content.id) saveContentTitle(content.id, content.title);
        }
        return () => {
            if (!window.location.pathname.startsWith('/browse/') && !window.location.pathname.startsWith('/watch/')) {
                document.title = 'My Donkey | Watch Free Movies, TV Shows & Anime in HD';
            }
        };
    }, [content?.title, content?.id, isTV, hasSelectedEpisode, currentSeason?.seasonNumber, currentEpisode?.episodeNumber]);

    // Record watch history for stream sources without redirecting away (guarded to once per content ID)
    const hasRecordedWatchHistoryRef = useRef<string | null>(null);
    useEffect(() => {
        if (content?.id && !isTrailer && hasRecordedWatchHistoryRef.current !== content.id) {
            hasRecordedWatchHistoryRef.current = content.id;
            addToWatchHistory(content).catch(e => console.error("Error saving watch history:", e));
        }
    }, [content, isTrailer, addToWatchHistory]);

    // TV Series Episode Selection Gate: Ask user to choose an episode BEFORE showing/loading the player screen
    if (needsEpisodeSelection) {
        const bgImage = content.backdrop_path || content.poster_path || '';
        return (
            <div
                id="video-player-root"
                className="fixed inset-0 z-[100] bg-[#0a0a0b] text-white flex flex-col font-sans overflow-hidden"
            >
                {/* Subtle Backdrop */}
                {bgImage && (
                    <div className="pointer-events-none fixed inset-0 z-0">
                        <img
                            src={bgImage}
                            alt=""
                            className="w-full h-full object-cover opacity-20 blur-2xl scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0b]/80 via-[#0a0a0b]/90 to-[#0a0a0b]" />
                    </div>
                )}

                {/* Top Header */}
                <header className="relative z-10 border-b border-white/[0.08] bg-black/40 backdrop-blur-xl shrink-0">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                            <button
                                type="button"
                                onClick={() => {
                                    onClose();
                                    navigate('/');
                                }}
                                className="w-9 h-9 rounded-full bg-white/[0.08] hover:bg-white/[0.16] border border-white/10 flex items-center justify-center text-white transition shrink-0 cursor-pointer"
                                aria-label="Return to Home"
                                title="Return to Home"
                            >
                                <ArrowLeft size={18} />
                            </button>
                            <div className="min-w-0">
                                <h1 className="text-base sm:text-xl font-semibold tracking-tight text-white truncate">
                                    {content.title}
                                </h1>
                                <p className="text-xs text-zinc-400 truncate mt-0.5">
                                    Select an episode to start watching
                                    {(content as any).releaseYear || content.year ? ` · ${(content as any).releaseYear || content.year}` : ''}
                                </p>
                            </div>
                        </div>

                        {dynamicSeasons.length > 0 && (
                            <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/10 text-zinc-300 shrink-0">
                                {dynamicSeasons.length} {dynamicSeasons.length === 1 ? 'Season' : 'Seasons'}
                            </span>
                        )}
                    </div>

                    {/* Season Tabs */}
                    {dynamicSeasons.length > 1 && (
                        <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
                            {dynamicSeasons.map((s, idx) => {
                                const isSelected = currentSeasonIdx === idx;
                                return (
                                    <button
                                        key={s.id || `gate_season_${s.seasonNumber}`}
                                        type="button"
                                        onClick={() => handleSelectSeason(idx)}
                                        className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition shrink-0 cursor-pointer flex items-center gap-1.5 ${isSelected
                                            ? 'bg-white text-black font-semibold'
                                            : 'bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white'
                                            }`}
                                    >
                                        <span>{s.title || `Season ${s.seasonNumber}`}</span>
                                        {s.episodes && s.episodes.length > 0 && (
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isSelected ? 'bg-black/15 text-black' : 'bg-white/10 text-zinc-400'}`}>
                                                {s.episodes.length}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </header>

                {/* Episodes List */}
                <main className="relative z-10 flex-1 overflow-y-auto custom-scrollbar">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 sm:py-6">
                        {/* 1-Tap Continue Watching Resume Banner for returning TV viewers */}
                        {seriesProgress && (
                            <div className="mb-5 p-4 rounded-2xl bg-[#141418]/95 border border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
                                <div className="flex items-center gap-3.5 min-w-0">
                                    {seriesProgress.lastStillUrl ? (
                                        <img
                                            src={seriesProgress.lastStillUrl}
                                            alt={seriesProgress.lastEpisodeTitle || 'Last watched episode'}
                                            className="w-24 sm:w-28 aspect-video rounded-xl object-cover border border-white/10 shrink-0 bg-black"
                                        />
                                    ) : (
                                        <div className="w-12 h-12 rounded-xl bg-brand-red/20 border border-brand-red/30 text-brand-red flex flex-col items-center justify-center font-bold shrink-0">
                                            <span className="text-[9px] uppercase">S{seriesProgress.lastSeason}</span>
                                            <span className="text-sm leading-none">E{seriesProgress.lastEpisode}</span>
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-red">
                                                Continue Watching
                                            </span>
                                            {seriesProgress.watchedEpisodes.length > 0 && (
                                                <span className="text-[11px] text-zinc-400">
                                                    · {seriesProgress.watchedEpisodes.length} watched
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-sm sm:text-base font-semibold text-white truncate mt-0.5">
                                            S{seriesProgress.lastSeason} · E{seriesProgress.lastEpisode}
                                            {seriesProgress.lastEpisodeTitle ? ` — ${seriesProgress.lastEpisodeTitle}` : ''}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleResumeLastEpisode}
                                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 shrink-0 transition cursor-pointer"
                                >
                                    <Play size={14} className="fill-current" />
                                    <span>Resume S{seriesProgress.lastSeason} · E{seriesProgress.lastEpisode}</span>
                                </button>
                            </div>
                        )}

                        {isLoadingSeasons && dynamicSeasons.length === 0 ? (
                            <div className="py-20 flex flex-col items-center justify-center gap-3 text-center">
                                <div className="w-9 h-9 rounded-full border-2 border-white/15 border-t-brand-red animate-spin" />
                                <p className="text-sm text-zinc-400">Loading seasons and episodes...</p>
                            </div>
                        ) : currentSeason && currentSeason.episodes.length > 0 ? (
                            <div className="space-y-2.5 pb-10">
                                {currentSeason.episodes.map((ep, idx) => {
                                    const watched = isEpisodeWatched(seriesProgress, currentSeason.seasonNumber, ep.episodeNumber);
                                    const isLastWatched =
                                        seriesProgress?.lastSeason === currentSeason.seasonNumber &&
                                        seriesProgress?.lastEpisode === ep.episodeNumber;
                                    return (
                                        <button
                                            key={ep.id || `gate_ep_${ep.episodeNumber}`}
                                            type="button"
                                            onClick={() => handleSelectEpisode(currentSeasonIdx, idx)}
                                            className={`w-full text-left p-3 sm:p-4 rounded-2xl flex items-center gap-3.5 sm:gap-4 transition group cursor-pointer border ${isLastWatched
                                                ? 'bg-brand-red/10 border-brand-red/40 hover:bg-brand-red/15'
                                                : 'bg-[#111114]/90 hover:bg-[#19191f] border-white/[0.08] hover:border-white/20'
                                                }`}
                                        >
                                            {ep.stillUrl ? (
                                                <div className="w-28 sm:w-36 aspect-video rounded-xl overflow-hidden bg-black/70 relative shrink-0 border border-white/10">
                                                    <img
                                                        src={ep.stillUrl}
                                                        alt={ep.title}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                        loading="lazy"
                                                    />
                                                    <div className="absolute inset-0 bg-black/35 group-hover:bg-black/15 flex items-center justify-center transition">
                                                        <div className="w-9 h-9 rounded-full bg-white/90 text-black flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                                            <Play size={15} className="fill-current ml-0.5" />
                                                        </div>
                                                    </div>
                                                    {watched && (
                                                        <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow">
                                                            <Check size={12} strokeWidth={3} />
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex flex-col items-center justify-center font-bold shrink-0 transition relative ${isLastWatched
                                                    ? 'bg-brand-red text-white'
                                                    : 'bg-white/[0.06] group-hover:bg-brand-red text-zinc-200 group-hover:text-white'
                                                    }`}>
                                                    <span className="text-[9px] uppercase tracking-wider opacity-70">EP</span>
                                                    <span className="text-base leading-none">{ep.episodeNumber}</span>
                                                    {watched && (
                                                        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-black flex items-center justify-center">
                                                            <Check size={10} strokeWidth={3} />
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap text-xs text-zinc-400">
                                                    <span className="font-semibold text-zinc-200">
                                                        S{currentSeason.seasonNumber} · E{ep.episodeNumber}
                                                    </span>
                                                    {ep.duration && <span>· {ep.duration}</span>}
                                                    {isLastWatched ? (
                                                        <span className="px-1.5 py-0.5 rounded bg-brand-red/20 text-brand-red text-[10px] font-semibold border border-brand-red/30">
                                                            Last Watched
                                                        </span>
                                                    ) : watched ? (
                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-[10px] font-medium border border-emerald-500/25">
                                                            <Check size={10} strokeWidth={3} /> Watched
                                                        </span>
                                                    ) : null}
                                                </div>
                                                <h3 className="text-sm sm:text-base font-semibold text-white mt-0.5 truncate group-hover:text-brand-red transition-colors">
                                                    {ep.title}
                                                </h3>
                                                {ep.overview && (
                                                    <p className="text-xs text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
                                                        {ep.overview}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="shrink-0 hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] group-hover:bg-white text-zinc-300 group-hover:text-black text-xs font-semibold transition">
                                                <Play size={13} className="fill-current" />
                                                <span>{isLastWatched ? 'Resume' : 'Play'}</span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="py-20 text-center space-y-4">
                                <p className="text-sm text-zinc-400">No episodes found for this season.</p>
                                <button
                                    type="button"
                                    onClick={() => setHasSelectedEpisode(true)}
                                    className="px-5 py-2.5 rounded-xl bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition cursor-pointer"
                                >
                                    Play Season 1, Episode 1
                                </button>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        );
    }

    // Final Main Render
    return (
        <div
            id="video-player-root"
            ref={playerContainerRef}
            onPointerMove={resetInactivityTimer}
            onMouseMove={resetInactivityTimer}
            onTouchStart={resetInactivityTimer}
            onClick={resetInactivityTimer}
            className={`fixed inset-0 z-[100] bg-black flex flex-col font-sans select-none no-scrollbar justify-center items-center overflow-hidden ${!showControls ? 'cursor-none' : ''}`}
        >
            {/* On-Screen Display (OSD / HUD) for Volume / Boost Feedback */}
            {osdNotice && (
                <div className="absolute top-14 md:top-16 left-1/2 -translate-x-1/2 z-[250] pointer-events-none animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-black/85 backdrop-blur-2xl border border-white/20 text-white shadow-[0_8px_32px_rgba(0,0,0,0.8)] ring-1 ring-white/10">
                        {osdNotice.icon === 'zap' && <Zap size={20} className="text-amber-400 fill-amber-400 animate-pulse" />}
                        {osdNotice.icon === 'mute' && <VolumeX size={20} className="text-red-500" />}
                        {(!osdNotice.icon || osdNotice.icon === 'volume') && <Volume2 size={20} className="text-white" />}
                        <div className="flex flex-col text-left">
                            <span className="text-sm font-bold tracking-wide leading-tight">{osdNotice.text}</span>
                            {osdNotice.subtext && <span className="text-[11px] text-amber-300 font-medium tracking-normal">{osdNotice.subtext}</span>}
                        </div>
                    </div>
                </div>
            )}

            {/* 1. STABLE VIDEO CONTAINER (Root level, covers entire screen) */}
            <div className="absolute inset-0 z-0 bg-black overflow-hidden">
                <div className={`w-full h-full relative transition-transform duration-500 ease-in-out ${isZoomed ? 'scale-[1.35]' : 'scale-100'}`}>
                    {/* 1. YouTube Player (Always present to prevent removeChild error) */}
                    <div className={`w-full h-full relative overflow-hidden pointer-events-none ${(!directVideoUrl && !isDriveVideo) ? 'block' : 'hidden'}`}>
                        <div key="yt-player-container-root" id="youtube-player" className="w-full h-full origin-center pointer-events-none" />
                    </div>

                    {/* 2. Direct Video (HLS/Native/Iframe) */}
                    {directVideoUrl && !isDriveVideo && (
                        <div className="absolute inset-0 w-full h-full pointer-events-auto z-[20]">
                            {(isHls || isNativeVideo) ? (
                                <MoviVideo
                                    ref={videoRef}
                                    className={`w-full h-full ${isZoomed ? 'object-cover' : (isMobile ? 'object-cover' : 'object-contain')}`}
                                    playsInline
                                    autoPlay={playing}
                                    onClick={() => setPlaying(!playing)}
                                    src={directVideoUrl}
                                    onLoadedMetadata={handleLoadedMetadata}
                                    onEnded={() => triggerEpisodeEndedRef.current()}
                                    onError={(err) => setPlaybackError(err.message || 'Movi player playback error')}
                                />
                            ) : finalUrl ? (
                                <div className="relative w-full h-full">
                                    <iframe
                                        key={`embed-${content.id}`}
                                        ref={embedIframeRef}
                                        className="w-full h-full relative z-[30] border-0"
                                        src={finalUrl}
                                        sandbox={adShieldSandbox}
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                                        scrolling="no"
                                        referrerPolicy="origin"
                                        title={content.title}
                                        onLoad={handleIframeLoad}
                                        onError={handleIframeError}
                                    />
                                </div>
                            ) : null}
                        </div>
                    )}

                    {/* 3. Drive Player */}
                    {isDriveVideo && driveIdToUse && (
                        <div className="absolute inset-0 w-full h-full pointer-events-auto z-10">
                            <DrivePlayer
                                driveId={driveIdToUse}
                                title={content.title}
                                autoplay={playing}
                                onLoad={() => {
                                    finishLoading();
                                }}
                            />
                        </div>
                    )}
                </div>


                {/* Minimal Loader until movie starts */}
                {isMovieLoading && !showContentLoader && (
                    <div className="absolute inset-0 z-[45] flex flex-col items-center justify-center bg-black/80 backdrop-blur-[2px] pointer-events-none transition-opacity duration-500 animate-in fade-in">
                        <div className="relative w-11 h-11 flex items-center justify-center">
                            <div className="absolute inset-0 rounded-full border-2 border-white/10" />
                            <div className="w-11 h-11 rounded-full border-2 border-transparent border-t-brand-red border-r-brand-red animate-spin" />
                        </div>
                        <div className="mt-4 flex flex-col items-center gap-1.5 text-center px-4 max-w-sm">
                            <span className="text-white/95 text-sm font-semibold tracking-wide truncate max-w-[260px] sm:max-w-xs drop-shadow-md">
                                {content.title}
                            </span>
                            <span className="text-[11px] text-gray-400 font-medium tracking-wider uppercase animate-pulse">
                                Loading movie...
                            </span>
                        </div>
                    </div>
                )}

                {/* Mid-playback buffering spinner */}
                {isBuffering && !isMovieLoading && !isDriveVideo && !isDirectIframeEmbed && (
                    <div className="absolute inset-0 z-[40] flex items-center justify-center pointer-events-none transition-opacity duration-300">
                        <div className="w-10 h-10 rounded-full border-2 border-white/15 border-t-brand-red animate-spin" />
                    </div>
                )}

                {/* Drive/Embed overlays for mobile tap-to-fullscreen */}
                {isMobile && (showDriveOverlay && isDriveVideo || showEmbedOverlay && isDirectIframeEmbed) && (
                    <div
                        className="absolute inset-0 z-[60] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center px-6 text-center cursor-pointer"
                        onClick={async (e) => {
                            e.stopPropagation();
                            await toggleFullscreen();
                            setShowDriveOverlay(false);
                            setShowEmbedOverlay(false);
                        }}
                    >
                        <div className="bg-brand-red text-white p-4 rounded-full mb-3 shadow-[0_0_28px_rgba(229,9,20,0.55)] active:scale-95 transition-transform">
                            <Play size={32} className="translate-x-0.5 fill-current" />
                        </div>
                        <p className="text-white font-bold text-base max-w-xs truncate">{content.title || 'Tap to Play'}</p>
                        <p className="text-gray-300 text-xs mt-1">Tap anywhere for fullscreen</p>
                        {isExternalStream && isAdShieldEnabled && (
                            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-[11px] font-semibold">
                                <ShieldCheck size={13} />
                                <span>Ad Shield Active</span>
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowDriveOverlay(false);
                                setShowEmbedOverlay(false);
                            }}
                            className="mt-4 text-[11px] text-gray-400 hover:text-white underline underline-offset-4 px-3 py-1"
                        >
                            Watch without fullscreen
                        </button>
                    </div>
                )}


            </div>

            {/* 2. UI LAYERS (Overlays and Loaders) */}
            {showContentLoader && !isDriveVideo && !isDirectIframeEmbed && (
                <div className="z-[50] w-full h-full relative">
                    <ContentLoader
                        item={content}
                        duration={settings?.contentLoaderDuration || 2.5}
                        durationAction={handleLoaderComplete}
                    />
                </div>
            )}



            {!isDriveVideo && !isDirectIframeEmbed && (
                <div className="absolute inset-0 z-10" onClick={() => setShowControls(!showControls)}></div>
            )}

            {/* Common Overlays (Error, Skip Intro, Stats) */}
            {playbackError && (
                <div className="absolute inset-0 z-[250] bg-[#0a0a0d]/95 backdrop-blur-xl flex flex-col items-center justify-center p-5 text-center animate-in fade-in">
                    <div className="w-full max-w-md bg-[#121318] border border-white/15 rounded-3xl p-6 sm:p-8 shadow-[0_25px_80px_rgba(0,0,0,0.9)] ring-1 ring-white/10">
                        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-brand-red/15 border border-brand-red/30 flex items-center justify-center text-brand-red">
                            <AlertCircle size={28} />
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black text-white mb-2 tracking-tight">Playback Unavailable</h2>
                        <p className="text-gray-400 text-xs sm:text-sm mb-6 leading-relaxed">{playbackError}</p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onClose();
                                    navigate('/');
                                }}
                                className="w-full bg-white text-black px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm hover:bg-gray-200 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <ArrowLeft size={16} /> Home Screen
                            </button>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onClose();
                                    window.location.href = '/search';
                                }}
                                className="w-full bg-brand-red text-white px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm hover:bg-red-600 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <Search size={15} /> Search New Content
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={() => window.location.reload()}
                            className="mt-3 w-full bg-white/5 border border-white/10 text-gray-300 hover:text-white px-5 py-2.5 rounded-xl text-xs font-semibold hover:bg-white/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <RefreshCw size={14} /> Try Again
                        </button>
                    </div>
                </div>
            )}

            {!isDriveVideo && showSkipIntro && (
                <button
                    onClick={(e) => { e.stopPropagation(); handleSkip(90); setShowSkipIntro(false); }}
                    className="absolute bottom-24 right-4 md:bottom-32 md:right-12 bg-white text-black px-4 py-2 rounded font-bold text-sm shadow-lg hover:bg-gray-200 z-[120] transition pointer-events-auto animate-in fade-in"
                >
                    Skip Intro
                </button>
            )}

            {showStats && isSports && (
                <div className="pointer-events-auto z-[120]">
                    <StatsPanel content={content as any} onClose={() => setShowStats(false)} />
                </div>
            )}



            {/* Screen Activity Detector for native players when controls are hidden */}
            {!showControls && !isDirectIframeEmbed && !isDriveVideo && (
                <div
                    id="vp-activity-detector"
                    className="fixed inset-0 z-[90] bg-transparent select-none cursor-auto"
                    onPointerMove={resetInactivityTimer}
                    onMouseMove={resetInactivityTimer}
                    onMouseEnter={resetInactivityTimer}
                    onTouchStart={resetInactivityTimer}
                    onPointerDown={resetInactivityTimer}
                />
            )}

            {/* Subtle Top-Center Reveal Handle for Embed / Drive players when controls are hidden (never blocks iframe buttons) */}
            {!showControls && (isDirectIframeEmbed || isDriveVideo) && (
                <button
                    type="button"
                    aria-label="Show player controls"
                    onPointerMove={resetInactivityTimer}
                    onMouseEnter={resetInactivityTimer}
                    onTouchStart={resetInactivityTimer}
                    onClick={(e) => {
                        e.stopPropagation();
                        resetInactivityTimer();
                    }}
                    className="fixed top-0 left-1/2 -translate-x-1/2 z-[280] px-8 pt-1.5 pb-3 bg-transparent flex items-center justify-center cursor-pointer group"
                >
                    <span className="w-12 h-1 rounded-full bg-white/35 group-hover:bg-white/75 transition-all shadow-[0_1px_8px_rgba(0,0,0,0.8)]" />
                </button>
            )}

            {/* Clean Full-Width Responsive Top Bar */}
            <header
                onPointerMove={resetInactivityTimer}
                onMouseMove={resetInactivityTimer}
                className={`vp-top-bar fixed top-0 left-0 right-0 z-[300] px-2.5 sm:px-4 md:px-6 pt-2.5 sm:pt-3.5 pb-6 bg-gradient-to-b from-black/90 via-black/45 to-transparent select-none transition-all duration-300 ${showControls
                    ? 'opacity-100 translate-y-0 pointer-events-auto'
                    : 'opacity-0 -translate-y-2 pointer-events-none'
                    }`}
            >
                <div className="flex items-center justify-between gap-2 w-full max-w-7xl mx-auto">
                    {/* LEFT: Back Button + Title */}
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        <button
                            type="button"
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                                e.stopPropagation();
                                onClose();
                                navigate('/');
                            }}
                            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/60 hover:bg-white/20 active:scale-90 border border-white/15 backdrop-blur-md text-white hover:text-brand-red transition-all flex items-center justify-center cursor-pointer shrink-0 shadow-lg"
                            title="Return to Home"
                            aria-label="Return to Home"
                        >
                            <ArrowLeft size={18} className="sm:w-5 sm:h-5" />
                        </button>

                        <button
                            type="button"
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (isTV) setShowEpisodesMenu(true);
                            }}
                            className={`text-left min-w-0 flex-1 ${isTV ? 'cursor-pointer group/title' : 'cursor-default'}`}
                        >
                            <div className="text-white font-semibold text-xs sm:text-sm md:text-base leading-tight truncate drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)] group-hover/title:text-brand-red transition-colors">
                                {content.title}
                            </div>
                            {isTV && currentEpisode && (
                                <div className="text-[10px] sm:text-xs text-white/75 font-medium truncate mt-0.5">
                                    S{currentSeason?.seasonNumber || 1} • E{currentEpisode.episodeNumber || 1}
                                    {currentEpisode.title && currentEpisode.title !== `Episode ${currentEpisode.episodeNumber}` ? ` · ${currentEpisode.title}` : ''}
                                </div>
                            )}
                        </button>
                    </div>

                    {/* RIGHT: Compact Action Cluster (No overflow on smartphones) */}
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        {/* TV Episodes Pill (Single clean button replaces separate Season + Episode pills) */}
                        {isTV && (
                            <button
                                type="button"
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowEpisodesMenu(true);
                                    setShowSettingsMenu(false);
                                }}
                                className="h-9 sm:h-10 px-2.5 sm:px-3.5 rounded-full bg-black/60 hover:bg-white/20 active:scale-95 border border-white/15 backdrop-blur-md text-white text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all shadow-lg"
                                title="Seasons & Episodes"
                            >
                                <Layers size={14} className="text-brand-red shrink-0" />
                                <span className="whitespace-nowrap">S{currentSeason?.seasonNumber || 1} E{currentEpisode?.episodeNumber || 1}</span>
                            </button>
                        )}

                        {/* Quick Next Episode Button (TV Shows) */}
                        {isTV && nextEpisodeInfo && (
                            <button
                                type="button"
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    playNextEpisode();
                                }}
                                className="h-9 sm:h-10 px-2.5 sm:px-3.5 rounded-full bg-black/60 hover:bg-white/20 active:scale-95 border border-white/15 backdrop-blur-md text-white text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all shadow-lg"
                                title={`Next: S${nextEpisodeInfo.season.seasonNumber} E${nextEpisodeInfo.episode.episodeNumber}`}
                            >
                                <SkipForward size={14} className="shrink-0" />
                                <span className="hidden sm:inline whitespace-nowrap">Next Ep</span>
                            </button>
                        )}

                        {/* Fullscreen Toggle for Embed / Drive Players (Cleanly placed in top-right instead of covering iframe bottom-right) */}
                        {(isDirectIframeEmbed || isDriveVideo) && (
                            <button
                                type="button"
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleFullscreen();
                                }}
                                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/60 hover:bg-white/20 active:scale-90 border border-white/15 backdrop-blur-md text-white hover:text-brand-red transition-all flex items-center justify-center cursor-pointer shrink-0 shadow-lg"
                                title={isFullscreen ? "Exit Fullscreen (Esc)" : "Full Screen (F)"}
                                aria-label="Toggle Fullscreen"
                            >
                                {isFullscreen ? <Minimize size={16} className="sm:w-[18px] sm:h-[18px]" /> : <Maximize size={16} className="sm:w-[18px] sm:h-[18px]" />}
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Visual Feedback for Double Tap / Seek: YouTube style animation (100% pointer-events-none so player is never blocked) */}
            {seekFeedback && !isDirectIframeEmbed && !isDriveVideo && (
                <div className="absolute inset-0 z-[130] pointer-events-none overflow-hidden">
                    <div
                        className={`absolute top-0 bottom-0 ${seekFeedback.side === 'left' ? 'left-0 rounded-r-full pr-8 md:pr-14' : 'right-0 rounded-l-full pl-8 md:pl-14'} w-[35%] max-w-xs flex flex-col items-center justify-center pointer-events-none bg-white/15 backdrop-blur-[2px] animate-in fade-in zoom-in-95 duration-200`}
                    >
                        <div className="flex items-center text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                            {seekFeedback.side === 'left' ? (
                                <div className="flex items-center -space-x-3">
                                    <ChevronLeft size={30} className="animate-pulse" />
                                    <ChevronLeft size={30} className="animate-pulse delay-75" />
                                    <ChevronLeft size={30} className="animate-pulse delay-150" />
                                </div>
                            ) : (
                                <div className="flex items-center -space-x-3">
                                    <ChevronRight size={30} className="animate-pulse delay-150" />
                                    <ChevronRight size={30} className="animate-pulse delay-75" />
                                    <ChevronRight size={30} className="animate-pulse delay-150" />
                                </div>
                            )}
                        </div>
                        <span className="text-white text-[11px] md:text-xs font-black tracking-wider uppercase mt-1.5 drop-shadow-md">
                            {seekFeedback.seconds} seconds
                        </span>
                    </div>
                </div>
            )}

            {/* Gesture Layer (Landscape/Desktop for native videos ONLY - external iframe players must NOT be blocked) */}
            {!isDirectIframeEmbed && !isDriveVideo && (
                <div
                    className="absolute inset-0 z-[115]"
                    onClick={handleTap}
                    style={{ WebkitTapHighlightColor: 'rgba(0,0,0,0)', outline: 'none' }}
                />
            )}

            {/* Centered Playback Controls: YouTube-style Small & Sleek 5s Previous, Play/Pause, 5s Next */}
            {!isDirectIframeEmbed && !isDriveVideo && (
                <div className={`vp-center-controls absolute inset-0 z-[116] pointer-events-none flex flex-row items-center justify-center gap-3 md:gap-5 transition-all duration-300 ${showControls ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
                    {/* 5s Previous Button - Small, compact & sleek */}
                    <button
                        className="relative flex items-center justify-center w-8 h-8 md:w-10 md:h-10 text-white/90 hover:text-white bg-black/60 hover:bg-black/85 backdrop-blur-md transition-all p-1.5 md:p-2 rounded-full pointer-events-auto border border-white/20 hover:border-white/40 shadow-xl active:scale-90 group"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleSkip(-5);
                            triggerRipple('left', 5);
                        }}
                        title="Rewind 5s"
                        aria-label="Rewind 5 seconds"
                    >
                        <RotateCcw size={15} className="md:w-4 md:h-4 group-hover:-rotate-12 transition-transform" />
                        <span className="absolute inset-0 flex items-center justify-center text-[7px] md:text-[8px] font-black tracking-tighter pointer-events-none mt-0.5">
                            5
                        </span>
                    </button>

                    {/* Play/Pause Button - Compact & sleek */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            togglePlayState();
                        }}
                        className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 text-white hover:text-brand-red bg-black/70 hover:bg-black/90 backdrop-blur-md transition-all p-2 md:p-2.5 rounded-full active:scale-90 pointer-events-auto border border-white/25 hover:border-white/50 shadow-2xl"
                        title={playing ? "Pause" : "Play"}
                        aria-label={playing ? "Pause video" : "Play video"}
                    >
                        {playing ?
                            <Pause size={18} className="fill-current md:w-5 md:h-5" /> :
                            <Play size={18} className="fill-current ml-0.5 md:w-5 md:h-5" />
                        }
                    </button>

                    {/* 5s Next Button - Small, compact & sleek */}
                    <button
                        className="relative flex items-center justify-center w-8 h-8 md:w-10 md:h-10 text-white/90 hover:text-white bg-black/60 hover:bg-black/85 backdrop-blur-md transition-all p-1.5 md:p-2 rounded-full pointer-events-auto border border-white/20 hover:border-white/40 shadow-xl active:scale-90 group"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleSkip(5);
                            triggerRipple('right', 5);
                        }}
                        title="Forward 5s"
                        aria-label="Forward 5 seconds"
                    >
                        <RotateCw size={15} className="md:w-4 md:h-4 group-hover:rotate-12 transition-transform" />
                        <span className="absolute inset-0 flex items-center justify-center text-[7px] md:text-[8px] font-black tracking-tighter pointer-events-none mt-0.5">
                            5
                        </span>
                    </button>
                </div>
            )}

            {/* Clean Bottom Controls Bar (Native / Direct / YouTube players) */}
            {!isDriveVideo && !isDirectIframeEmbed && !showContentLoader && (
                <div
                    onPointerMove={resetInactivityTimer}
                    onMouseMove={resetInactivityTimer}
                    className={`vp-controls-bar fixed bottom-0 left-0 right-0 z-[200] px-3 sm:px-5 md:px-8 pt-10 pb-3 sm:pb-4 md:pb-5 bg-gradient-to-t from-black/95 via-black/65 to-transparent transition-all duration-300 pointer-events-none ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                >
                    <div className="w-full max-w-5xl mx-auto pointer-events-auto flex flex-col gap-1.5 sm:gap-2.5">
                        {/* Timeline Scrubber */}
                        <div className="w-full flex items-center gap-2.5 sm:gap-3 group/timeline">
                            <span className="text-[11px] sm:text-xs font-semibold text-white/85 font-mono tabular-nums min-w-[36px] text-right">
                                {formatTime(currentTime)}
                            </span>

                            <div
                                className="flex-1 relative cursor-pointer flex items-center h-7 sm:h-8 touch-none"
                                onClick={handleSeek}
                            >
                                <div className="w-full h-1.5 group-hover/timeline:h-2 bg-white/25 rounded-full overflow-hidden transition-all">
                                    <div
                                        className="h-full bg-brand-red rounded-full shadow-[0_0_10px_rgba(229,9,20,0.65)]"
                                        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                                    />
                                </div>
                                <div
                                    className="absolute w-3.5 h-3.5 bg-white rounded-full shadow-[0_0_8px_rgba(0,0,0,0.6)] ring-2 ring-brand-red/70 top-1/2 -translate-y-1/2 pointer-events-none transition-transform duration-150 md:scale-0 md:group-hover/timeline:scale-100"
                                    style={{ left: `calc(${Math.min(100, Math.max(0, progress))}% - 7px)` }}
                                />
                            </div>

                            <span className="text-[11px] sm:text-xs font-semibold text-white/60 font-mono tabular-nums min-w-[36px] text-left">
                                {formatTime(duration)}
                            </span>
                        </div>

                        {/* Clean Single-Row Action Controls */}
                        <div className="flex items-center justify-between gap-2">
                            {/* LEFT: Play/Pause, Skip (sm+), Volume */}
                            <div className="flex items-center gap-1 sm:gap-2">
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        togglePlayState();
                                    }}
                                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full text-white hover:bg-white/15 active:scale-90 transition flex items-center justify-center cursor-pointer"
                                    title={playing ? "Pause (Space)" : "Play (Space)"}
                                    aria-label={playing ? "Pause" : "Play"}
                                >
                                    {playing ? <Pause size={20} className="fill-current" /> : <Play size={20} className="fill-current ml-0.5" />}
                                </button>

                                {/* 5s Skip buttons shown on sm+ (mobile uses sleek center controls & double-tap) */}
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleSkip(-5);
                                        triggerRipple('left', 5);
                                    }}
                                    className="hidden sm:flex relative w-9 h-9 items-center justify-center text-white/85 hover:text-white rounded-full hover:bg-white/15 active:scale-90 transition cursor-pointer"
                                    title="Rewind 5s (←)"
                                    aria-label="Rewind 5 seconds"
                                >
                                    <RotateCcw size={18} />
                                    <span className="absolute text-[8px] font-black pointer-events-none mt-0.5">5</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleSkip(5);
                                        triggerRipple('right', 5);
                                    }}
                                    className="hidden sm:flex relative w-9 h-9 items-center justify-center text-white/85 hover:text-white rounded-full hover:bg-white/15 active:scale-90 transition cursor-pointer"
                                    title="Forward 5s (→)"
                                    aria-label="Forward 5 seconds"
                                >
                                    <RotateCw size={18} />
                                    <span className="absolute text-[8px] font-black pointer-events-none mt-0.5">5</span>
                                </button>

                                {/* Mute / Volume */}
                                <div className="flex items-center group/vol">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsMuted(!isMuted);
                                            showOsd(isMuted ? 'Unmuted' : 'Muted', undefined, isMuted ? 'volume' : 'mute');
                                        }}
                                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full text-white/90 hover:text-white hover:bg-white/15 active:scale-90 transition flex items-center justify-center cursor-pointer"
                                        title={isMuted ? "Unmute (M)" : "Mute (M)"}
                                        aria-label={isMuted ? "Unmute" : "Mute"}
                                    >
                                        {isMuted ? <VolumeX size={19} className="text-red-500" /> : volume > 50 ? <Volume2 size={19} /> : <Volume1 size={19} />}
                                    </button>
                                    <div className="hidden md:flex w-0 group-hover/vol:w-24 overflow-hidden transition-all duration-300 items-center pr-2">
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={isMuted ? 0 : volume}
                                            onChange={(e) => {
                                                const val = Number(e.target.value);
                                                setVolume(val);
                                                if (isMuted) setIsMuted(false);
                                            }}
                                            className="w-full h-1 bg-white/25 rounded-lg appearance-none cursor-pointer accent-brand-red focus:outline-none"
                                            title={`Volume: ${volume}%`}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT: Minimal, High-Utility Controls */}
                            <div className="flex items-center gap-1 sm:gap-1.5">
                                {isSports && (
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setShowStats(!showStats); }}
                                        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition cursor-pointer ${showStats ? 'bg-brand-red/20 text-brand-red' : 'text-white/85 hover:text-white hover:bg-white/15'}`}
                                        title="Match Stats"
                                    >
                                        <BarChart2 size={18} />
                                    </button>
                                )}

                                {/* Compact Sound Boost Toggle */}
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        cycleBoost();
                                    }}
                                    className={`h-8 sm:h-9 px-2.5 rounded-full text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${boostLevel > 1.0
                                        ? 'bg-amber-500/25 border border-amber-400/50 text-amber-300'
                                        : 'text-white/80 hover:text-white bg-white/10 hover:bg-white/15 border border-white/10'
                                        }`}
                                    title="Sound Booster (B)"
                                >
                                    <Zap size={13} className={boostLevel > 1.0 ? 'text-amber-400 fill-amber-400' : 'text-white/70'} />
                                    <span>{boostLevel > 1.0 ? `${Math.round(boostLevel * 100)}%` : 'Boost'}</span>
                                </button>

                                {/* Zoom / Fit Screen (sm+ only; also inside Settings sheet on phones) */}
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setIsZoomed(!isZoomed); }}
                                    className={`hidden sm:flex w-9 h-9 sm:w-10 sm:h-10 rounded-full items-center justify-center transition cursor-pointer ${isZoomed ? 'text-brand-red bg-white/15' : 'text-white/85 hover:text-white hover:bg-white/15'}`}
                                    title={isZoomed ? "Reset Zoom" : "Fill Screen"}
                                    aria-label="Toggle Fill Screen"
                                >
                                    {isZoomed ? <Minimize size={18} /> : <Scan size={18} />}
                                </button>

                                {/* Unified Settings Button (Quality, Subtitles, Audio & Boost, Screen Fit) */}
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowSettingsMenu(true);
                                        setShowEpisodesMenu(false);
                                    }}
                                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition cursor-pointer ${showSettingsMenu ? 'bg-white/20 text-white' : 'text-white/85 hover:text-white hover:bg-white/15'}`}
                                    title="Player Settings"
                                    aria-label="Player Settings"
                                >
                                    <Settings size={18} />
                                </button>

                                {/* Fullscreen */}
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
                                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full text-white/90 hover:text-white hover:bg-white/15 active:scale-90 transition flex items-center justify-center cursor-pointer"
                                    title={isFullscreen ? "Exit Fullscreen (Esc)" : "Fullscreen (F)"}
                                    aria-label="Toggle Fullscreen"
                                >
                                    {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Unified Responsive Settings Sheet (Native / Direct / YouTube players) */}
            {showSettingsMenu && !isDriveVideo && !isDirectIframeEmbed && (
                <div
                    className="fixed inset-0 z-[500] bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150"
                    onClick={() => setShowSettingsMenu(false)}
                >
                    <div
                        className="bg-[#111216] border border-white/15 rounded-2xl sm:rounded-3xl w-full max-w-md max-h-[82vh] flex flex-col overflow-hidden shadow-[0_25px_80px_rgba(0,0,0,0.95)] ring-1 ring-white/10 animate-in zoom-in-95 duration-150"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header + Tabs */}
                        <div className="px-4 pt-3.5 pb-2.5 border-b border-white/10 bg-white/[0.03] shrink-0">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-white font-bold text-sm sm:text-base flex items-center gap-2">
                                    <Settings size={16} className="text-brand-red" />
                                    <span>Player Settings</span>
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setShowSettingsMenu(false)}
                                    className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition cursor-pointer"
                                    aria-label="Close settings"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="grid grid-cols-3 gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10">
                                {([
                                    { id: 'quality', label: 'Quality', icon: Sliders },
                                    { id: 'subtitles', label: 'Subtitles', icon: Subtitles },
                                    { id: 'audio', label: 'Audio', icon: Headphones },
                                ] as const).map(({ id, label, icon: Icon }) => (
                                    <button
                                        key={id}
                                        type="button"
                                        onClick={() => setSettingsTab(id)}
                                        className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${settingsTab === id
                                            ? 'bg-brand-red text-white shadow'
                                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                                            }`}
                                    >
                                        <Icon size={13} />
                                        <span>{label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Tab Content */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                            {settingsTab === 'quality' && (
                                <>
                                    {/* Screen Fit Toggle */}
                                    <button
                                        type="button"
                                        onClick={() => setIsZoomed(!isZoomed)}
                                        className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/10 border border-white/10 text-xs font-semibold text-white cursor-pointer transition"
                                    >
                                        <span className="flex items-center gap-2">
                                            <Scan size={14} className="text-brand-red" />
                                            <span>Fill Screen (Zoom)</span>
                                        </span>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isZoomed ? 'bg-brand-red text-white' : 'bg-white/10 text-gray-300'}`}>
                                            {isZoomed ? 'ON' : 'FIT'}
                                        </span>
                                    </button>

                                    <div className="space-y-1">
                                        {qualities.length > 0 ? qualities.map(q => {
                                            let usage = '';
                                            if (q.includes('1080') || q.includes('highres')) usage = 'High Data (~3GB/hr)';
                                            else if (q.includes('720')) usage = 'Medium Data (~1GB/hr)';
                                            else if (q !== 'auto') usage = 'Low Data (<0.5GB/hr)';

                                            return (
                                                <button
                                                    key={q}
                                                    type="button"
                                                    onClick={() => handleQualityChange(q)}
                                                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs flex justify-between items-center transition cursor-pointer ${currentQuality === q
                                                        ? 'bg-brand-red text-white font-bold'
                                                        : 'text-gray-300 hover:bg-white/10 hover:text-white'
                                                        }`}
                                                >
                                                    <div className="flex flex-col">
                                                        <span>{q.toUpperCase()}</span>
                                                        {usage && <span className={`text-[10px] ${currentQuality === q ? 'text-white/80' : 'text-gray-500'}`}>{usage}</span>}
                                                    </div>
                                                    {currentQuality === q && <Check size={14} strokeWidth={3} />}
                                                </button>
                                            );
                                        }) : (
                                            <div className="px-3.5 py-3 text-xs text-gray-400 text-center bg-white/[0.03] rounded-xl">
                                                Quality: Auto (Adaptive)
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            {settingsTab === 'subtitles' && (
                                <div className="space-y-1">
                                    <button
                                        type="button"
                                        onClick={() => handleSubtitleChange(null)}
                                        className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex justify-between items-center transition cursor-pointer ${!selectedSubtitle
                                            ? 'bg-brand-red text-white'
                                            : 'text-gray-300 hover:bg-white/10 hover:text-white'
                                            }`}
                                    >
                                        <span>Off</span>
                                        {!selectedSubtitle && <Check size={14} strokeWidth={3} />}
                                    </button>
                                    {effectiveSubtitleTracks.map((sub, idx) => (
                                        <button
                                            key={sub.languageCode || idx}
                                            type="button"
                                            onClick={() => handleSubtitleChange(sub)}
                                            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex justify-between items-center transition cursor-pointer ${selectedSubtitle?.languageCode === sub.languageCode
                                                ? 'bg-brand-red text-white'
                                                : 'text-gray-300 hover:bg-white/10 hover:text-white'
                                                }`}
                                        >
                                            <span>{sub.displayName}</span>
                                            {selectedSubtitle?.languageCode === sub.languageCode && <Check size={14} strokeWidth={3} />}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {settingsTab === 'audio' && (
                                <div className="space-y-3">
                                    {/* Sound Booster */}
                                    <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2.5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-white flex items-center gap-1.5">
                                                <Zap size={13} className={boostLevel > 1.0 ? 'text-amber-400 fill-amber-400' : 'text-gray-400'} />
                                                Sound Booster
                                            </span>
                                            <span className="text-[11px] font-bold text-amber-400">{Math.round(boostLevel * 100)}%</span>
                                        </div>

                                        <div className="grid grid-cols-5 gap-1">
                                            {BOOST_PRESETS.map((lvl) => {
                                                const isActive = Math.abs(lvl - boostLevel) < 0.05;
                                                return (
                                                    <button
                                                        key={lvl}
                                                        type="button"
                                                        onClick={() => setBoostPreset(lvl)}
                                                        className={`py-1.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${isActive
                                                            ? 'bg-brand-red text-white'
                                                            : 'bg-white/10 text-gray-300 hover:text-white'
                                                            }`}
                                                    >
                                                        {Math.round(lvl * 100)}%
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        <input
                                            type="range"
                                            min="1.0"
                                            max="4.0"
                                            step="0.1"
                                            value={boostLevel}
                                            onChange={(e) => setBoostLevel(parseFloat(e.target.value))}
                                            className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-brand-red"
                                        />

                                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const next = !dialogueClarity;
                                                    setDialogueClarity(next);
                                                    showOsd(next ? 'Dialogue Clarity: ON' : 'Dialogue Clarity: OFF', undefined, 'zap');
                                                }}
                                                className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 border transition cursor-pointer ${dialogueClarity ? 'bg-brand-red/20 border-brand-red/50 text-white' : 'bg-white/5 border-white/10 text-gray-400'}`}
                                            >
                                                <Sparkles size={12} />
                                                <span>Voice Clarity</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const next = !limiterEnabled;
                                                    setLimiterEnabled(next);
                                                    showOsd(next ? 'Anti-Clipping: ON' : 'Anti-Clipping: OFF', undefined, 'zap');
                                                }}
                                                className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 border transition cursor-pointer ${limiterEnabled ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' : 'bg-white/5 border-white/10 text-gray-400'}`}
                                            >
                                                <ShieldCheck size={12} />
                                                <span>Limiter</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Audio Tracks */}
                                    <div className="space-y-1">
                                        {AUDIO_OPTIONS.map(audi => (
                                            <button
                                                key={audi.id}
                                                type="button"
                                                onClick={() => setSelectedAudio(audi)}
                                                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex justify-between items-center transition cursor-pointer ${selectedAudio.id === audi.id
                                                    ? 'bg-white/15 text-white'
                                                    : 'text-gray-300 hover:bg-white/5'
                                                    }`}
                                            >
                                                <span>{audi.label}</span>
                                                {selectedAudio.id === audi.id && <Check size={14} className="text-brand-red" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Auto-Play Next Episode Countdown Card */}
            {upNextCountdown !== null && nextEpisodeInfo && (
                <div
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    className="fixed bottom-5 right-4 sm:bottom-8 sm:right-6 z-[360] w-[calc(100vw-2rem)] max-w-sm bg-[#111114]/95 backdrop-blur-2xl border border-white/15 rounded-2xl p-4 shadow-[0_20px_60px_rgba(0,0,0,0.9)] ring-1 ring-white/10 animate-in fade-in slide-in-from-bottom-4 duration-200"
                >
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                            Up Next in <span className="text-white font-bold tabular-nums">{upNextCountdown}s</span>
                        </span>
                        <button
                            type="button"
                            onClick={() => setUpNextCountdown(null)}
                            className="text-zinc-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition cursor-pointer"
                            aria-label="Cancel auto-play"
                        >
                            <X size={14} />
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        {nextEpisodeInfo.episode.stillUrl ? (
                            <img
                                src={nextEpisodeInfo.episode.stillUrl}
                                alt={nextEpisodeInfo.episode.title}
                                className="w-24 aspect-video rounded-lg object-cover border border-white/10 shrink-0 bg-black"
                            />
                        ) : (
                            <div className="w-12 h-12 rounded-xl bg-white/10 flex flex-col items-center justify-center shrink-0 text-white font-bold">
                                <span className="text-[9px] text-zinc-400">EP</span>
                                <span className="text-sm leading-none">{nextEpisodeInfo.episode.episodeNumber}</span>
                            </div>
                        )}
                        <div className="min-w-0 flex-1">
                            <div className="text-[11px] font-semibold text-brand-red">
                                S{nextEpisodeInfo.season.seasonNumber} · E{nextEpisodeInfo.episode.episodeNumber}
                            </div>
                            <div className="text-sm font-semibold text-white truncate">
                                {nextEpisodeInfo.episode.title}
                            </div>
                        </div>
                    </div>

                    <div className="mt-3.5 flex items-center gap-2">
                        <button
                            type="button"
                            onClick={playNextEpisode}
                            className="flex-1 py-2 px-3 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                        >
                            <Play size={13} className="fill-current" />
                            <span>Play Now</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setUpNextCountdown(null)}
                            className="py-2 px-3.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-zinc-200 text-xs font-medium transition cursor-pointer"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Season & Episodes Popup Modal */}
            {showEpisodesMenu && isTV && (
                <div
                    className="fixed inset-0 z-[500] bg-black/85 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
                    onClick={() => setShowEpisodesMenu(false)}
                >
                    <div
                        className="bg-[#111215] border border-white/15 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-[0_25px_80px_rgba(0,0,0,0.95)] ring-1 ring-white/10 animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="p-5 md:p-6 border-b border-white/10 bg-white/[0.03] flex justify-between items-center shrink-0">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-white font-black text-xl md:text-2xl tracking-tight">
                                        Episodes
                                    </h3>
                                    <span className="px-2.5 py-0.5 rounded-full bg-brand-red/20 border border-brand-red/30 text-brand-red text-[11px] font-bold">
                                        Season {currentSeason?.seasonNumber || 1}
                                    </span>
                                </div>
                                <p className="text-gray-400 text-xs font-medium mt-1">
                                    {content.title} {(content as any).releaseYear || content.year ? `• ${(content as any).releaseYear || content.year}` : ''}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowEpisodesMenu(false)}
                                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-colors cursor-pointer"
                                aria-label="Close"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Season Tabs (Horizontal Pill Selector) */}
                        {dynamicSeasons.length > 1 && (
                            <div className="px-5 py-3 border-b border-white/10 bg-black/30 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
                                {dynamicSeasons.map((s, idx) => {
                                    const isSelected = currentSeasonIdx === idx;
                                    return (
                                        <button
                                            key={s.id || `season_${s.seasonNumber}`}
                                            onClick={() => handleSelectSeason(idx)}
                                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${isSelected
                                                ? 'bg-brand-red text-white shadow-md shadow-brand-red/30 scale-[1.02]'
                                                : 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white'
                                                }`}
                                        >
                                            <span>{s.title || `Season ${s.seasonNumber}`}</span>
                                            {s.episodes && s.episodes.length > 0 && (
                                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-black/30 text-white' : 'bg-white/10 text-gray-400'}`}>
                                                    {s.episodes.length}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Episodes List */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 space-y-2.5">
                            {currentSeason?.episodes.map((ep, idx) => {
                                const isCurrent = currentEpisodeIdx === idx;
                                const watched = isEpisodeWatched(seriesProgress, currentSeason.seasonNumber, ep.episodeNumber);
                                return (
                                    <button
                                        key={ep.id || `ep_${ep.episodeNumber}`}
                                        onClick={() => handleSelectEpisode(currentSeasonIdx, idx)}
                                        className={`w-full text-left p-3.5 sm:p-4 rounded-2xl flex items-center gap-3.5 sm:gap-4 transition-all duration-200 group cursor-pointer border ${isCurrent
                                            ? 'bg-brand-red/15 border-brand-red/50 shadow-lg shadow-brand-red/10 ring-1 ring-brand-red/30'
                                            : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.06] hover:border-white/15'
                                            }`}
                                    >
                                        {/* Episode Thumbnail or Number Box */}
                                        {ep.stillUrl ? (
                                            <div className="w-24 sm:w-28 aspect-video rounded-xl overflow-hidden bg-black/60 relative shrink-0 border border-white/10">
                                                <img
                                                    src={ep.stillUrl}
                                                    alt={ep.title}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                    loading="lazy"
                                                />
                                                <div className={`absolute inset-0 flex items-center justify-center transition-opacity ${isCurrent ? 'bg-black/40 opacity-100' : 'bg-black/30 opacity-0 group-hover:opacity-100'}`}>
                                                    <Play size={20} className={isCurrent ? 'text-brand-red fill-current' : 'text-white fill-current'} />
                                                </div>
                                                {watched && !isCurrent && (
                                                    <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow">
                                                        <Check size={10} strokeWidth={3} />
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex flex-col items-center justify-center font-black shrink-0 transition-colors relative ${isCurrent ? 'bg-brand-red text-white' : 'bg-white/5 text-gray-300 group-hover:bg-white/10 group-hover:text-white'
                                                }`}>
                                                <span className="text-[9px] uppercase tracking-wider opacity-60 font-semibold">EP</span>
                                                <span className="text-base sm:text-lg leading-none">{ep.episodeNumber}</span>
                                                {watched && !isCurrent && (
                                                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-black flex items-center justify-center">
                                                        <Check size={10} strokeWidth={3} />
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {/* Episode Details */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={`text-xs font-bold ${isCurrent ? 'text-brand-red' : 'text-gray-400'}`}>
                                                    Episode {ep.episodeNumber}
                                                </span>
                                                {ep.duration && (
                                                    <span className="text-[11px] text-gray-500 font-medium">
                                                        • {ep.duration}
                                                    </span>
                                                )}
                                                {isCurrent ? (
                                                    <span className="px-1.5 py-0.5 rounded bg-brand-red text-white text-[9px] font-black uppercase tracking-wider animate-pulse">
                                                        Now Playing
                                                    </span>
                                                ) : watched ? (
                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-[9px] font-semibold border border-emerald-500/25">
                                                        <Check size={9} strokeWidth={3} /> Watched
                                                    </span>
                                                ) : null}
                                            </div>
                                            <h4 className={`text-sm sm:text-base font-bold mt-0.5 truncate ${isCurrent ? 'text-white' : 'text-gray-200 group-hover:text-white'}`}>
                                                {ep.title}
                                            </h4>
                                            {ep.overview && (
                                                <p className="text-xs text-gray-400 line-clamp-2 mt-1 font-normal leading-relaxed">
                                                    {ep.overview}
                                                </p>
                                            )}
                                        </div>

                                        {/* Action Icon */}
                                        <div className="shrink-0 pl-1">
                                            {isCurrent ? (
                                                <div className="w-8 h-8 rounded-full bg-brand-red/20 border border-brand-red/40 flex items-center justify-center">
                                                    <Play size={14} className="text-brand-red fill-current ml-0.5" />
                                                </div>
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-white/5 group-hover:bg-white/20 border border-white/5 flex items-center justify-center opacity-40 group-hover:opacity-100 transition-all">
                                                    <Play size={14} className="text-white fill-current ml-0.5" />
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-3.5 border-t border-white/10 bg-white/[0.02] flex justify-between items-center shrink-0">
                            <span className="text-xs text-gray-500 font-medium pl-2">
                                {currentSeason?.episodes.length || 0} episode{currentSeason?.episodes.length !== 1 ? 's' : ''} available
                            </span>
                            <button
                                onClick={() => setShowEpisodesMenu(false)}
                                className="text-gray-400 hover:text-white font-bold text-xs uppercase tracking-wider px-4 py-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Unclickable Low-Opacity Corner Watermark Logo (Fades out while controls are visible so it never overlaps buttons) */}
            <div
                className={`video-watermark absolute z-[260] pointer-events-none select-none transition-opacity duration-300 drop-shadow-[0_2px_12px_rgba(0,0,0,0.85)] ${showControls
                    ? 'opacity-0'
                    : isFullscreen
                        ? 'top-5 right-5 md:top-7 md:right-9 opacity-30'
                        : 'top-3.5 right-3.5 md:top-5 md:right-7 opacity-25'
                    }`}
                aria-hidden="true"
            >
                <img
                    src="/favicon.png"
                    alt=""
                    className={`${isFullscreen ? 'w-9 h-9 md:w-12 md:h-12' : 'w-6 h-6 md:w-9 md:h-9'} object-contain pointer-events-none select-none`}
                    draggable={false}
                />
            </div>
        </div>
    );
};

export default VideoPlayer;