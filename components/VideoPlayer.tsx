import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Hls from 'hls.js';
import { Play, Pause, Volume2, Volume1, VolumeX, Maximize, Settings, SkipForward, ArrowLeft, RotateCcw, RotateCw, Subtitles, Layers, BarChart2, Minimize, Headphones, Check, MessageSquare, Wifi, X, ExternalLink, Scan, Scaling, AlertCircle, RefreshCw, Zap, Sliders, Sparkles, ShieldCheck, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Content, Season, Episode } from '../types';
import StatsPanel from './StatsPanel';
import DrivePlayer from './DrivePlayer';
import ContentLoader from './ContentLoader';
import { useStore } from '../context/StoreContext';
import { logUserActivity, incrementWatchTime } from '../utils/activityLogger';
import { MoviVideo } from './MoviVideo';
import { buildEmbedUrl, parseEmbedContentType, extractDriveId, isExternalEmbedUrl } from '../utils/embedUrl';
import { soundBooster } from '../player/SoundBooster';
import { useAdShield } from '../utils/useAdShield';
import { fetchTMDBDetails, fetchTMDBSeason } from '../services/tmdbService';
import { saveContentTitle, setWebpageTitle } from '../utils/titleManager';

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
    const { updatePlaybackProgress, currentUser, updateContentDuration, settings, addToWatchHistory } = useStore();

    // Embed Ad Shield: Blocks external popups, new tabs, and site hijacking redirects
    const {
        isEnabled: isAdShieldEnabled,
        mode: adShieldMode,
        blockedCount: adShieldBlockedCount,
        sandboxAttributes: adShieldSandbox,
        toggleAdShield,
        changeMode: changeAdShieldMode,
    } = useAdShield({
        defaultEnabled: settings?.enableAdShield !== false,
        defaultMode: settings?.adShieldMode || 'strict',
        isActive: true,
    });



    // Resume Logic
    const isTrailer = content.type === 'trailer' || content.playMode === 'trailer';
    const savedState = isTrailer ? undefined : currentUser?.continueWatching?.find(i => i.movieId === content.id);
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
    const [showAudioSubMenu, setShowAudioSubMenu] = useState(false);
    const [showQualityMenu, setShowQualityMenu] = useState(false);

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


    // Season & Episode State (TV Shows)
    const [currentSeasonIdx, setCurrentSeasonIdx] = useState(0);
    const [currentEpisodeIdx, setCurrentEpisodeIdx] = useState(0);
    const [showEpisodesMenu, setShowEpisodesMenu] = useState(false);
    const embedIframeRef = useRef<HTMLIFrameElement | null>(null);

    // Parse season & episode from embed URL if present (e.g. /embed/tv/tt13404982/1/2)
    const urlSeasonEp = useMemo(() => {
        const target = content.videoUrl || '';
        const match = target.match(/(?:embed\/tv\/|tt\d+\/)?(\d+)\/(\d+)/);
        if (match) {
            return { season: parseInt(match[1]), episode: parseInt(match[2]) };
        }
        return null;
    }, [content.videoUrl]);

    const isTV = Boolean(
        content.type === 'tv' ||
        (content as any).media_type === 'tv' ||
        (content.seasons && content.seasons.length > 0) ||
        (content.videoUrl && content.videoUrl.includes('/embed/tv/'))
    );

    const [dynamicSeasons, setDynamicSeasons] = useState<Season[]>(() => {
        if (content.seasons && content.seasons.length > 0) {
            return content.seasons;
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
        if (urlSeasonEp && dynamicSeasons.length > 0) {
            const sIdx = dynamicSeasons.findIndex(s => s.seasonNumber === urlSeasonEp.season);
            if (sIdx !== -1) {
                setCurrentSeasonIdx(sIdx);
                const eIdx = dynamicSeasons[sIdx].episodes.findIndex(e => e.episodeNumber === urlSeasonEp.episode);
                if (eIdx !== -1) {
                    setCurrentEpisodeIdx(eIdx);
                }
            }
        }
    }, [urlSeasonEp, dynamicSeasons.length]);

    // Fetch seasons & episodes dynamically from TMDB for TV shows if not pre-populated
    useEffect(() => {
        if (!isTV) return;
        if (content.seasons && content.seasons.length > 0 && content.seasons.some(s => s.episodes && s.episodes.length > 0)) {
            setDynamicSeasons(content.seasons);
            return;
        }

        let isCancelled = false;
        const loadTvSeasons = async () => {
            try {
                let tmdbId = content.tmdbId;
                if (!tmdbId && typeof content.id === 'string' && content.id.startsWith('tmdb_')) {
                    tmdbId = parseInt(content.id.replace('tmdb_', ''));
                }

                if (!tmdbId) {
                    if (dynamicSeasons.length === 0) {
                        const defaultEpsCount = urlSeasonEp ? Math.max(urlSeasonEp.episode, 8) : 8;
                        const defaultEps: Episode[] = Array.from({ length: defaultEpsCount }, (_, i) => ({
                            id: `ep_${i + 1}`,
                            episodeNumber: i + 1,
                            title: `Episode ${i + 1}`,
                        }));
                        setDynamicSeasons([{
                            id: 'season_1',
                            seasonNumber: urlSeasonEp?.season || 1,
                            title: `Season ${urlSeasonEp?.season || 1}`,
                            episodes: defaultEps,
                        }]);
                    }
                    return;
                }

                const details = await fetchTMDBDetails(tmdbId, 'tv');
                if (isCancelled || !details) return;

                const validSeasons = (details.seasons || []).filter(s => s.season_number > 0);
                if (validSeasons.length === 0) return;

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
                if (dynamicSeasons.length === 0) {
                    const defaultEpsCount = urlSeasonEp ? Math.max(urlSeasonEp.episode, 8) : 8;
                    setDynamicSeasons([{
                        id: 'season_1',
                        seasonNumber: urlSeasonEp?.season || 1,
                        title: `Season ${urlSeasonEp?.season || 1}`,
                        episodes: Array.from({ length: defaultEpsCount }, (_, i) => ({
                            id: `ep_${i + 1}`,
                            episodeNumber: i + 1,
                            title: `Episode ${i + 1}`,
                        }))
                    }]);
                }
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
                    if (data.season !== undefined) {
                        const sNum = Number(data.season);
                        const eNum = Number(data.episode);
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

    const handleSelectEpisode = (seasonIdx: number, epIdx: number) => {
        const targetSeason = dynamicSeasons[seasonIdx];
        const targetEp = targetSeason?.episodes[epIdx];
        if (!targetSeason || !targetEp) return;

        setCurrentSeasonIdx(seasonIdx);
        setCurrentEpisodeIdx(epIdx);
        setShowEpisodesMenu(false);
        setInitialLoad(true);
        setPlaying(true);

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
    };

    const currentSeason = (isTV && dynamicSeasons.length > 0) ? (dynamicSeasons[currentSeasonIdx] || dynamicSeasons[0]) : null;
    const currentEpisode = (isTV && currentSeason && currentSeason.episodes.length > 0) ? (currentSeason.episodes[currentEpisodeIdx] || currentSeason.episodes[0]) : null;

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

    let directVideoUrl: string | null = null;
    if (finalDriveId) {
        // When admin enters a Drive link, external links (iframe embed) MUST NOT OPEN
        directVideoUrl = null;
    } else if (isTV) {
        const sNum = currentSeason?.seasonNumber || (urlSeasonEp?.season || 1);
        const eNum = currentEpisode?.episodeNumber || (urlSeasonEp?.episode || 1);
        if (currentEpisode?.videoUrl && !getDriveId(currentEpisode.videoUrl)) {
            directVideoUrl = currentEpisode.videoUrl;
        } else if (extractedImdbId) {
            directVideoUrl = buildEmbedUrl(extractedImdbId, 'tv', settings, sNum, eNum);
        } else if (content.videoUrl && !getDriveId(content.videoUrl)) {
            directVideoUrl = content.videoUrl;
        }
    } else if (overrideUrl && !overrideDriveId && !overrideYoutubeId) {
        directVideoUrl = overrideUrl;
    } else if (extractedImdbId && !finalDriveId && !finalYoutubeId) {
        directVideoUrl = buildEmbedUrl(extractedImdbId, 'movie', settings);
    } else {
        directVideoUrl = null;
    }

    const isHls = directVideoUrl ? directVideoUrl.split('?')[0].toLowerCase().includes('.m3u8') : false;
    const isNativeVideo = useMemo(() => {
        if (!directVideoUrl) return false;
        const urlWithoutQuery = directVideoUrl.split('?')[0].toLowerCase();

        // Standard video extensions
        const hasExtension = ['.mp4', '.webm', '.mkv', '.ogg', '.mov', '.avi', '.ts', '.flv'].some(ext =>
            urlWithoutQuery.endsWith(ext)
        );
        if (hasExtension) return true;

        // Check if extension is present in the path
        const hasExtensionAnywhere = ['.mp4', '.webm', '.mkv', '.ogg', '.mov', '.avi', '.ts', '.flv'].some(ext =>
            urlWithoutQuery.includes(ext)
        );
        if (hasExtensionAnywhere) return true;

        // Cloudflare R2 buckets (often host raw video files like MKV/MP4 without file extensions in the pathname)
        if (directVideoUrl.toLowerCase().includes('.r2.dev')) return true;

        return false;
    }, [directVideoUrl]);
    const isEmbedPlayer = directVideoUrl ? (
        directVideoUrl.includes('proxy.garageband.rocks') ||
        (embedBaseHost && directVideoUrl.includes(embedBaseHost)) ||
        directVideoUrl.includes('imdb.com') ||
        /tt\d+/.test(directVideoUrl)
    ) : false;
    const isDirectIframeEmbed = (directVideoUrl && !isHls && !isNativeVideo) || isEmbedPlayer;

    const useDirect = Boolean(directVideoUrl && (isHls || isNativeVideo || isDirectIframeEmbed));
    const useDrive = Boolean(finalDriveId && !useDirect);

    const youtubeVideoId = finalYoutubeId;
    const driveIdToUse = finalDriveId;
    const isDriveVideo = useDrive;
    const isExternalStream = isDirectIframeEmbed && !isDriveVideo;
    // --- End Video Source Logic ---

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

    // Portrait/Landscape detection for mobile embedded-player layout
    const [isPortrait, setIsPortrait] = useState(() =>
        isMobile ? window.matchMedia('(orientation: portrait)').matches : false
    );

    useEffect(() => {
        if (!isMobile) return;
        const mq = window.matchMedia('(orientation: portrait)');
        const handler = (e: MediaQueryListEvent) => setIsPortrait(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, [isMobile]);

    // Unlock orientation on unmount (no forced lock — portrait is valid)
    useEffect(() => {
        return () => {
            if (isMobile && screen.orientation && (screen.orientation as any).unlock) {
                try { (screen.orientation as any).unlock(); } catch (_) { }
            }
        };
    }, [isMobile]);

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
            if (nextPlaying) videoRef.current.play().catch(() => {});
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
        setShowQualityMenu(false);
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

    // Initialize YouTube Player
    useEffect(() => {
        if (!isApiReady || isDriveVideo || isHls || playerRef.current || !youtubeVideoId) return;

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
    }, [isApiReady, isDriveVideo, youtubeVideoId]);

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
        if (isDriveVideo || isHls || isTrailer) return;
        if (currentTime > 0 && Math.abs(currentTime - lastLocalSaveTimeRef.current) >= 3) {
            lastLocalSaveTimeRef.current = currentTime;
            try {
                const raw = localStorage.getItem('my_donkey_watch_history');
                const list = raw ? JSON.parse(raw) : [];
                const filtered = list.filter((i: any) => i.movieId !== content.id);
                filtered.unshift({
                    movieId: content.id,
                    progress: progressRef.current,
                    stoppedAt: currentTime,
                    duration,
                    lastWatchedAt: new Date().toISOString()
                });
                localStorage.setItem('my_donkey_watch_history', JSON.stringify(filtered.slice(0, 30)));
            } catch (_) { }
        }
    }, [currentTime, content.id, duration, isDriveVideo, isHls, isTrailer]);

    // Throttled Firestore sync handler
    const syncProgressToFirestore = useCallback((force = false) => {
        const curr = currentTimeRef.current;
        const dur = durationRef.current;
        const prog = progressRef.current;
        if (dur > 0 && curr > 5) {
            const diff = Math.abs(curr - lastSavedProgressTimeRef.current);
            if (force || diff >= 20) {
                lastSavedProgressTimeRef.current = curr;
                updatePlaybackProgress(content.id, prog, curr, dur);
            }
        }
    }, [content.id, updatePlaybackProgress]);

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


    // Controls & Movie Card Visibility Timer (Hides after 2 seconds of inactivity)
    const resetInactivityTimer = useCallback(() => {
        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = setTimeout(() => {
            if (!showStats && !showAudioSubMenu && !showQualityMenu && !showEpisodesMenu) {
                setShowControls(false);
            }
        }, 2000);
    }, [showStats, showAudioSubMenu, showQualityMenu, showEpisodesMenu]);

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

        // Initial 2-second timer on mount
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

    // Fullscreen change listener to keep isFullscreen state in sync with browser
    useEffect(() => {
        const handleFullscreenChange = () => {
            const doc = document as any;
            const isFull = !!(
                doc.fullscreenElement ||
                doc.webkitFullscreenElement ||
                doc.mozFullScreenElement ||
                doc.msFullscreenElement
            );
            setIsFullscreen(isFull);
            resetInactivityTimer();
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

    // When menus (episodes, quality, audio, stats) close, automatically begin 2s inactivity hide countdown
    useEffect(() => {
        if (!showEpisodesMenu && !showQualityMenu && !showAudioSubMenu && !showStats) {
            resetInactivityTimer();
        }
    }, [showEpisodesMenu, showQualityMenu, showAudioSubMenu, showStats, resetInactivityTimer]);

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

    // Fullscreen Event Listener
    useEffect(() => {
        const handleFullscreenChange = () => {
            const fsElement = document.fullscreenElement ||
                (document as any).webkitFullscreenElement ||
                (document as any).mozFullScreenElement ||
                (document as any).msFullscreenElement;
            const isFull = !!fsElement;
            setIsFullscreen(isFull);
            if (isFull) setShowControls(false);

            // If an inner child (such as the embed iframe, video, or canvas) entered fullscreen,
            // promote our playerContainerRef to fullscreen so the watermark logo remains visible on top!
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
                    } catch (e) {
                        // ignore
                    }
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
    }, []);

    // Escape Key Listener to exit player
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !document.fullscreenElement) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // Gesture State
    const lastTapRef = useRef<{ time: number, x: number } | null>(null);
    const [rippleSides, setRippleSides] = useState<('left' | 'right')[]>([]);

    const startHideTimer = useCallback(() => {
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = setTimeout(() => {
            if (!showStats && !showAudioSubMenu && !showQualityMenu && !showEpisodesMenu) {
                setShowControls(false);
            }
        }, 3000);
    }, [showStats, showAudioSubMenu, showQualityMenu, showEpisodesMenu]);

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

        // Extract IMDb ID (e.g., tt1234567, /title/tt1234567/, /embed/movie/tt1234567)
        const imdbMatch = trimmed.match(/(tt\d+)/);

        // Check if it's an IMDb-related URL or raw IMDb ID
        if (trimmed.includes('imdb.com') || /^tt\d+$/.test(trimmed)) {
            if (imdbMatch) {
                return buildEmbedUrl(imdbMatch[1], fallbackType, settings);
            }
        }

        // If it is a proxy.garageband.rocks URL or matches configured embed host
        if (trimmed.includes('proxy.garageband.rocks') || (embedBaseHost && trimmed.includes(embedBaseHost))) {
            const existingType = parseEmbedContentType(trimmed);
            if (imdbMatch) {
                const typeToUse = existingType || fallbackType;
                const seasonEpMatch = trimmed.match(new RegExp(`${imdbMatch[1]}(\\/\\d+\\/\\d+)`));
                const extraPath = seasonEpMatch ? seasonEpMatch[1] : '';
                return `${buildEmbedUrl(imdbMatch[1], typeToUse, settings)}${extraPath}`;
            }
            return trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
        }

        return url;
    };

    const finalUrl = useMemo(() => getFinalVideoUrl(directVideoUrl || ''), [directVideoUrl, isTV, settings, embedBaseHost]);

    // Dynamically update document title to movie/show name during playback
    useEffect(() => {
        if (content?.title) {
            setWebpageTitle(content.title);
            if (content.id) saveContentTitle(content.id, content.title);
        }
        return () => {
            if (!window.location.pathname.startsWith('/browse/') && !window.location.pathname.startsWith('/watch/')) {
                document.title = 'My Donkey | Watch Free Movies, TV Shows, Anime & Marvel Movies Online in HD';
            }
        };
    }, [content?.title, content?.id]);

    // Record watch history for stream sources without redirecting away (guarded to once per content ID)
    const hasRecordedWatchHistoryRef = useRef<string | null>(null);
    useEffect(() => {
        if (finalUrl && content?.id && hasRecordedWatchHistoryRef.current !== content.id) {
            hasRecordedWatchHistoryRef.current = content.id;
            addToWatchHistory(content).catch(e => console.error("Error saving watch history:", e));
        }
    }, [finalUrl, content?.id]);

    // Final Main Render
    return (
        <div
            id="video-player-root"
            ref={playerContainerRef}
            onPointerMove={resetInactivityTimer}
            onMouseMove={resetInactivityTimer}
            onTouchStart={resetInactivityTimer}
            onClick={resetInactivityTimer}
            className={`fixed inset-0 z-[100] bg-black flex flex-col font-sans select-none no-scrollbar ${isMobile && isPortrait ? 'overflow-y-auto' : 'justify-center items-center overflow-hidden'} ${!showControls && !(isMobile && isPortrait) ? 'cursor-none' : ''}`}
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

            {/* 1. STABLE VIDEO CONTAINER (Root level, never unmounts) */}
            <div className={`${isMobile && isPortrait ? 'relative w-full aspect-video' : 'absolute inset-0 z-0'} bg-black overflow-hidden`}>
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
                                    className="w-full h-full object-contain"
                                    playsInline
                                    onClick={() => setPlaying(!playing)}
                                    src={directVideoUrl}
                                    onLoadedMetadata={handleLoadedMetadata}
                                    onError={(err) => setPlaybackError(err.message || 'Movi player playback error')}
                                />
                            ) : finalUrl ? (
                                <div className="relative w-full h-full">
                                    {/* Top-bar click interceptor shield for TV embed (blocks external clicks/popups on #vs-bar and opens in-app popup modal) */}
                                    {isTV && isEmbedPlayer && (
                                        <div
                                            className="absolute top-0 left-0 right-0 h-14 z-[35] cursor-pointer"
                                            title="Click to open Season & Episode selection"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowEpisodesMenu(true);
                                            }}
                                        />
                                    )}
                                    <iframe
                                        ref={embedIframeRef}
                                        className="w-full h-full relative z-[30] border-0"
                                        src={finalUrl}
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                                        scrolling="no"
                                        referrerPolicy="origin"
                                        title={content.title}
                                        onLoad={handleIframeLoad}
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
                        className="absolute inset-0 z-[60] bg-black/85 flex flex-col items-center justify-center cursor-pointer"
                        onClick={async (e) => {
                            e.stopPropagation();
                            await toggleFullscreen();
                            setShowDriveOverlay(false);
                            setShowEmbedOverlay(false);
                        }}
                    >
                        <div className="bg-[#E50914] text-white p-4 rounded-full mb-3 shadow-[0_0_24px_rgba(229,9,20,0.6)] animate-pulse">
                            <Play size={36} className="translate-x-0.5" />
                        </div>
                        <p className="text-white font-bold text-base">{content.title || 'Tap to Play'}</p>
                        <p className="text-gray-300 text-xs mt-1">Tap to watch fullscreen</p>
                    </div>
                )}

                {/* Center playback controls (Mobile Portrait) - Small, sleek & unobtrusive */}
                {isMobile && isPortrait && (
                    <div
                        className={`absolute inset-0 z-10 flex items-center justify-center gap-3 pointer-events-none transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                    >
                        {/* 5s Previous Button */}
                        <button
                            className="relative flex items-center justify-center w-8 h-8 text-white/90 bg-black/60 hover:bg-black/85 backdrop-blur-md p-1.5 rounded-full border border-white/20 active:scale-90 transition pointer-events-auto shadow-md"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleSkip(-5);
                                triggerRipple('left', 5);
                            }}
                            title="Rewind 5s"
                            aria-label="Rewind 5 seconds"
                        >
                            <RotateCcw size={15} />
                            <span className="absolute inset-0 flex items-center justify-center text-[7px] font-black tracking-tighter pointer-events-none mt-0.5">
                                5
                            </span>
                        </button>

                        {/* Play/Pause Button */}
                        <button
                            className="flex items-center justify-center w-10 h-10 text-white bg-black/70 hover:bg-black/95 backdrop-blur-md p-2 rounded-full border border-white/25 active:scale-90 transition pointer-events-auto shadow-xl"
                            onClick={(e) => {
                                e.stopPropagation();
                                togglePlayState();
                            }}
                            title={playing ? "Pause" : "Play"}
                            aria-label={playing ? "Pause video" : "Play video"}
                        >
                            {playing ? <Pause size={18} className="fill-current" /> : <Play size={18} className="fill-current ml-0.5" />}
                        </button>

                        {/* 5s Next Button */}
                        <button
                            className="relative flex items-center justify-center w-8 h-8 text-white/90 bg-black/60 hover:bg-black/85 backdrop-blur-md p-1.5 rounded-full border border-white/20 active:scale-90 transition pointer-events-auto shadow-md"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleSkip(5);
                                triggerRipple('right', 5);
                            }}
                            title="Forward 5s"
                            aria-label="Forward 5 seconds"
                        >
                            <RotateCw size={15} />
                            <span className="absolute inset-0 flex items-center justify-center text-[7px] font-black tracking-tighter pointer-events-none mt-0.5">
                                5
                            </span>
                        </button>
                    </div>
                )}
            </div>

            {/* 2. UI LAYERS (Metadata and Overlays) */}
            {isMobile && isPortrait ? (
                <>


                    {/* Metadata section (scrolled below video) */}
                    <div className="flex-1 px-4 pt-4 pb-8 space-y-3 bg-[#0f0f0f]">
                        <h2 className="text-white font-black text-xl leading-tight">{content.title}</h2>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                            {content.release_date && <span>{content.release_date.split('-')[0]}</span>}
                            {content.rating && <span className="border border-white/30 px-1.5 py-0.5 rounded text-[10px]">{content.rating}</span>}
                            {content.resolution && <span className="border border-white/30 px-1.5 py-0.5 rounded text-[10px] font-black">{content.resolution}</span>}
                        </div>
                        {content.overview && <p className="text-gray-300 text-sm leading-relaxed line-clamp-4">{content.overview}</p>}

                        <div className="flex items-center gap-4 pt-1">
                            <button
                                onClick={() => {
                                    const next = !isMuted;
                                    setIsMuted(next);
                                    showOsd(next ? 'Muted' : 'Unmuted', undefined, next ? 'mute' : 'volume');
                                }}
                                className="flex items-center gap-2 text-gray-300 hover:text-white text-xs bg-white/10 hover:bg-white/15 px-3.5 py-2 rounded-full transition cursor-pointer active:scale-95 shadow-sm"
                                title={isMuted ? 'Unmute audio' : 'Mute audio'}
                            >
                                {isMuted ? <VolumeX size={14} className="text-red-500" /> : <Volume2 size={14} />}
                                <span>{isMuted ? 'Unmute' : 'Mute'}</span>
                            </button>
                            {!isDriveVideo && (
                                <button
                                    onClick={toggleFullscreen}
                                    className="flex items-center gap-2 text-gray-300 hover:text-white text-xs bg-white/10 hover:bg-white/15 px-3.5 py-2 rounded-full transition cursor-pointer active:scale-95 shadow-sm"
                                >
                                    <Maximize size={14} /> <span>Fullscreen</span>
                                </button>
                            )}
                        </div>
                    </div>
                </>
            ) : (
                <>
                    {/* Landscape/Desktop UI Layers */}
                    {showContentLoader && !isDriveVideo && !isDirectIframeEmbed && (
                        <div className="z-[50] w-full h-full relative">
                            <ContentLoader
                                item={content}
                                duration={settings?.contentLoaderDuration || 2.5}
                                durationAction={handleLoaderComplete}
                            />
                        </div>
                    )}

                    {showDataWarning && (
                        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[130] animate-in slide-in-from-top-4 fade-in duration-300">
                            <div className="bg-yellow-500/10 backdrop-blur-md border border-yellow-500/20 text-yellow-200 px-6 py-3 rounded-full flex items-center gap-3 shadow-lg max-w-sm text-center">
                                <Wifi size={20} className="text-yellow-400 shrink-0" />
                                <span className="text-sm font-medium">original Sound</span>
                            </div>
                        </div>
                    )}

                    {!isDriveVideo && !isDirectIframeEmbed && (
                        <div className="absolute inset-0 z-10" onClick={() => setShowControls(!showControls)}></div>
                    )}

                    {/* Common Overlays (Error, Skip Intro, Stats) */}
                    {playbackError && (
                        <div className="absolute inset-0 z-[250] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
                            <div className="bg-brand-red/10 p-6 rounded-full mb-6 border border-brand-red/20 shadow-[0_0_50px_rgba(229,9,20,0.2)]">
                                <AlertCircle size={64} className="text-brand-red" />
                            </div>
                            <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">Playback Error</h2>
                            <p className="text-gray-400 mb-8 max-w-sm leading-relaxed">{playbackError}</p>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => window.location.reload()}
                                    className="bg-white text-black px-8 py-3 rounded-xl font-black hover:bg-gray-200 transition-all active:scale-95 flex items-center gap-2"
                                >
                                    <RefreshCw size={18} /> RETRY
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onClose();
                                    }}
                                    className="bg-white/5 border border-white/10 text-white px-8 py-3 rounded-xl font-bold hover:bg-white/10 transition-all cursor-pointer"
                                >
                                    GO BACK
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


                </>
            )}

            {/* Screen Activity Detector: Detects mouse movement and touch across the screen when controls are hidden for native players */}
            {!showControls && !isDirectIframeEmbed && !isDriveVideo && (
                <div
                    id="vp-activity-detector"
                    className={`fixed top-0 left-0 right-0 ${isMobile && isPortrait ? 'bottom-1/2' : 'bottom-16 md:bottom-20'} z-[90] bg-transparent select-none cursor-auto`}
                    onPointerMove={resetInactivityTimer}
                    onMouseMove={resetInactivityTimer}
                    onMouseEnter={resetInactivityTimer}
                    onTouchStart={resetInactivityTimer}
                    onPointerDown={resetInactivityTimer}
                />
            )}

            {/* Top Activity Detector: Detects mouse movement and touch near top header area when controls are hidden */}
            {!showControls && (
                <div
                    className="fixed top-0 left-0 right-0 h-16 z-[95] bg-transparent cursor-pointer"
                    onPointerMove={resetInactivityTimer}
                    onMouseMove={resetInactivityTimer}
                    onMouseEnter={resetInactivityTimer}
                    onTouchStart={resetInactivityTimer}
                />
            )}

            {/* Corner Activity Detector for Bottom-Right Fullscreen button */}
            {!showControls && !isPortrait && (isDirectIframeEmbed || isDriveVideo) && (
                <div
                    className="fixed bottom-0 right-0 w-24 h-24 z-[95] bg-transparent cursor-pointer"
                    onPointerMove={resetInactivityTimer}
                    onMouseMove={resetInactivityTimer}
                    onMouseEnter={resetInactivityTimer}
                    onTouchStart={resetInactivityTimer}
                />
            )}

            {/* Navigation Pill Header - Fixed in top-left corner */}
            <div
                onPointerMove={resetInactivityTimer}
                onMouseMove={resetInactivityTimer}
                className={`fixed z-[300] top-2.5 left-2.5 md:top-4 md:left-4 select-none transition-opacity duration-300 ${showControls
                    ? 'opacity-100 pointer-events-auto'
                    : 'opacity-0 pointer-events-none'
                    }`}
            >
                <div className="bg-black/95 backdrop-blur-2xl border border-white/20 inline-flex items-center gap-2 md:gap-3 px-2 py-2 md:px-3 md:py-2.5 rounded-2xl pointer-events-auto hover:bg-black transition-all shadow-2xl ring-1 ring-white/10 group/header min-w-[200px] md:min-w-[260px]">
                    <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                        }}
                        className="text-white hover:text-brand-red transition-all p-2 md:p-3 rounded-xl bg-white/10 hover:bg-white/20 active:scale-90 flex items-center justify-center cursor-pointer shrink-0"
                        title="Go Back to Previous Page"
                        aria-label="Previous page"
                    >
                        <ArrowLeft size={20} className="md:w-5 md:h-5 transition-transform group-hover/header:-translate-x-1" />
                    </button>
                    <div className="h-6 w-px bg-white/20 shrink-0 pointer-events-none"></div>
                    <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (isTV) setShowEpisodesMenu(!showEpisodesMenu);
                        }}
                        className="text-left px-1.5 md:px-2.5 group/title cursor-pointer select-none"
                    >
                        <div className="text-white font-semibold text-[11px] md:text-xs leading-tight tracking-tight line-clamp-1 max-w-[120px] md:max-w-[200px] group-hover/title:text-brand-red transition-colors">
                            {content.title}
                        </div>
                        {isTV && currentEpisode && (
                            <div className="flex items-center gap-1 mt-0.5">
                                <span className="text-brand-red font-black text-[7px] md:text-[9px] uppercase tracking-wider bg-brand-red/10 px-1 py-0.5 rounded">
                                    S{currentSeason?.seasonNumber || 1} • E{currentEpisode.episodeNumber || 1}
                                </span>
                            </div>
                        )}
                    </button>
                    {isTV && (
                        <>
                            <div className="h-6 w-px bg-white/20 shrink-0 pointer-events-none"></div>
                            <div className="flex items-center gap-1 md:gap-1.5">
                                <button
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowEpisodesMenu(true);
                                    }}
                                    className="px-2 md:px-2.5 py-1 md:py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 border border-white/15 text-white text-[10px] md:text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all shadow-sm"
                                    title="Open Season selection"
                                >
                                    <span>Season {currentSeason?.seasonNumber || 1}</span>
                                    <ChevronDown size={13} className="text-gray-400" />
                                </button>
                                <button
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowEpisodesMenu(true);
                                    }}
                                    className="px-2 md:px-2.5 py-1 md:py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 border border-white/15 text-white text-[10px] md:text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all shadow-sm"
                                    title="Open Episode selection"
                                >
                                    <span>Episode {currentEpisode?.episodeNumber || 1}</span>
                                    <ChevronDown size={13} className="text-gray-400" />
                                </button>
                            </div>
                        </>
                    )}

                </div>
            </div>

            {/* Right Down Corner Fullscreen Button (in exact corner, in place of player fullscreen button) */}
            {!isPortrait && (isDirectIframeEmbed || isDriveVideo) && (
                <div
                    onPointerMove={resetInactivityTimer}
                    onMouseMove={resetInactivityTimer}
                    className={`fixed z-[300] bottom-0 right-0 select-none transition-opacity duration-300 ${showControls
                        ? 'opacity-100 pointer-events-auto'
                        : 'opacity-0 pointer-events-none'
                        }`}
                >
                    <div className="bg-black/90 hover:bg-black backdrop-blur-xl border-t border-l border-white/20 rounded-tl-xl p-1 md:p-1.5 shadow-2xl pointer-events-auto transition-all">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleFullscreen();
                            }}
                            className="text-white hover:text-brand-red transition-all p-1.5 md:p-2 rounded-lg bg-white/10 hover:bg-white/20 active:scale-90 flex items-center justify-center cursor-pointer"
                            title={isFullscreen ? "Exit Fullscreen (Esc)" : "Full Screen (F)"}
                            aria-label="Toggle Fullscreen"
                        >
                            {isFullscreen ? (
                                <Minimize size={18} className="md:w-5 md:h-5" />
                            ) : (
                                <Maximize size={18} className="md:w-5 md:h-5" />
                            )}
                        </button>
                    </div>
                </div>
            )}

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
            {!isPortrait && !isDirectIframeEmbed && !isDriveVideo && (
                <div
                    className="absolute inset-0 z-[115]"
                    onClick={handleTap}
                    style={{ WebkitTapHighlightColor: 'rgba(0,0,0,0)', outline: 'none' }}
                />
            )}

            {/* Centered Playback Controls: YouTube-style Small & Sleek 5s Previous, Play/Pause, 5s Next */}
            {!isPortrait && !isDirectIframeEmbed && !isDriveVideo && (
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

            {/* Controls - Floating Glass Bar (Landscape/Desktop only) */}
            {
                !isDriveVideo && !isDirectIframeEmbed && !showContentLoader && !isPortrait && (
                    <div className={`absolute left-0 right-0 px-2 md:px-8 transition-all duration-500 pointer-events-none z-[200] ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                        style={{ bottom: '24px' }}>

                        {/* Main Control Bar */}
                        <div className="bg-[#0f0f0f]/95 backdrop-blur-2xl border border-white/20 rounded-2xl md:rounded-3xl p-3 md:px-6 md:py-4 shadow-[0_10px_40px_rgba(0,0,0,0.8)] pointer-events-auto flex flex-col gap-3 w-full max-w-5xl mx-auto ring-1 ring-white/10 relative overflow-visible">

                            {/* Slider / Timeline */}
                            <div className="w-full flex items-center gap-2 md:gap-4 group/timeline">
                                {/* Current Time */}
                                <div className="text-[10px] md:text-xs font-bold text-gray-400 font-mono w-9 md:w-12 text-right tracking-wider">
                                    {formatTime(currentTime)}
                                </div>

                                {/* Progress Bar — tall touch target on mobile */}
                                <div
                                    className="flex-1 relative cursor-pointer flex items-center"
                                    style={{ height: '44px' }}
                                    onClick={handleSeek}
                                >
                                    {/* Track */}
                                    <div className="absolute left-0 right-0 h-3 md:h-1.5 bg-white/15 rounded-full overflow-hidden" style={{ top: '50%', transform: 'translateY(-50%)' }}>
                                        <div className="h-full bg-white/5 w-full" />
                                        {/* Filled */}
                                        <div
                                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-brand-red to-red-600 rounded-full shadow-[0_0_10px_rgba(229,9,20,0.5)]"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                    {/* Thumb dot — always visible on mobile, hover on desktop */}
                                    <div
                                        className="absolute w-4 h-4 bg-white rounded-full shadow-lg z-10 -translate-y-1/2 top-1/2 md:scale-0 md:group-hover/timeline:scale-100 transition-transform duration-200"
                                        style={{ left: `calc(${progress}% - 8px)` }}
                                    />
                                </div>

                                {/* Duration */}
                                <div className="text-[10px] md:text-xs font-bold text-gray-400 font-mono w-9 md:w-12 text-left tracking-wider">
                                    {formatTime(duration)}
                                </div>
                            </div>

                            {/* Lower Controls Row */}
                            <div className="flex justify-between items-center">

                                {/* LEFT: 5s Previous, Play/Pause, 5s Next, Volume Slider, and Sound Booster */}
                                <div className="flex flex-1 items-center gap-1 md:gap-2">
                                    {/* 5s Previous Button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleSkip(-5);
                                            triggerRipple('left', 5);
                                        }}
                                        className="relative flex items-center justify-center text-gray-300 hover:text-white p-1.5 md:p-2 rounded-full hover:bg-white/10 transition group"
                                        title="Rewind 5s (J or ←)"
                                        aria-label="Rewind 5 seconds"
                                    >
                                        <RotateCcw size={18} className="md:w-5 md:h-5 group-hover:-rotate-12 transition-transform" />
                                        <span className="absolute inset-0 flex items-center justify-center text-[8px] md:text-[9px] font-black pointer-events-none mt-0.5">
                                            5
                                        </span>
                                    </button>

                                    {/* Play/Pause Button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            togglePlayState();
                                        }}
                                        className="text-gray-300 hover:text-white p-1.5 md:p-2 rounded-full hover:bg-white/10 transition"
                                        title={playing ? "Pause (k or Space)" : "Play (k or Space)"}
                                        aria-label={playing ? "Pause" : "Play"}
                                    >
                                        {playing ? <Pause size={18} className="md:w-[22px] md:h-[22px] fill-current" /> : <Play size={18} className="md:w-[22px] md:h-[22px] fill-current ml-0.5" />}
                                    </button>

                                    {/* 5s Next Button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleSkip(5);
                                            triggerRipple('right', 5);
                                        }}
                                        className="relative flex items-center justify-center text-gray-300 hover:text-white p-1.5 md:p-2 rounded-full hover:bg-white/10 transition group"
                                        title="Forward 5s (L or →)"
                                        aria-label="Forward 5 seconds"
                                    >
                                        <RotateCw size={18} className="md:w-5 md:h-5 group-hover:rotate-12 transition-transform" />
                                        <span className="absolute inset-0 flex items-center justify-center text-[8px] md:text-[9px] font-black pointer-events-none mt-0.5">
                                            5
                                        </span>
                                    </button>

                                    {/* Volume & Hover Slider */}
                                    <div className="flex items-center group/vol">
                                        <button onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); showOsd(isMuted ? 'Unmuted' : 'Muted', undefined, isMuted ? 'volume' : 'mute'); }} className="text-gray-300 hover:text-white p-1.5 md:p-2 rounded-full hover:bg-white/10 transition" title={isMuted ? "Unmute" : "Mute"}>
                                            {isMuted ? <VolumeX size={18} className="md:w-[22px] md:h-[22px] text-red-500" /> : volume > 50 ? <Volume2 size={18} className="md:w-[22px] md:h-[22px]" /> : <Volume1 size={18} className="md:w-[22px] md:h-[22px]" />}
                                        </button>
                                        <div className="w-0 group-hover/vol:w-20 md:group-hover/vol:w-24 overflow-hidden transition-all duration-300 flex items-center pr-2">
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
                                                className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-brand-red focus:outline-none"
                                                title={`Volume: ${volume}%`}
                                            />
                                        </div>
                                    </div>

                                    {/* Quick Sound Booster Button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            cycleBoost();
                                        }}
                                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wider transition-all duration-300 ${boostLevel > 1.0
                                            ? 'bg-gradient-to-r from-red-600/30 to-amber-500/30 border border-amber-500/50 text-amber-300 shadow-[0_0_16px_rgba(245,158,11,0.35)]'
                                            : 'text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10'
                                            }`}
                                        title="Sound Booster: Click to cycle presets (100% → 150% → 200% → 300% → 400%). Hotkey: B"
                                    >
                                        <Zap size={13} className={boostLevel > 1.0 ? 'text-amber-400 fill-amber-400 animate-pulse' : 'text-gray-400'} />
                                        <span>{boostLevel > 1.0 ? `${Math.round(boostLevel * 100)}%` : 'BOOST'}</span>
                                    </button>
                                </div>

                                {/* RIGHT: Features */}
                                <div className="flex items-center gap-0.5 md:gap-3 text-gray-400">
                                    {isSports && (
                                        <button onClick={(e) => { e.stopPropagation(); setShowStats(!showStats); }}
                                            className={`hover:text-brand-red transition-all p-1.5 md:p-2.5 rounded-xl hover:bg-white/5 ${showStats ? 'bg-brand-red/10 text-brand-red md:ring-1 md:ring-brand-red/50' : ''}`} title="Match Stats">
                                            <BarChart2 size={18} className="md:w-[22px] md:h-[22px]" />
                                        </button>
                                    )}

                                    {/* Audio & Subs Button */}
                                    <div className="relative">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setShowAudioSubMenu(!showAudioSubMenu); setShowQualityMenu(false); setShowEpisodesMenu(false); }}
                                            className={`hover:text-white transition-all p-1.5 md:p-2.5 rounded-xl hover:bg-white/5 ${showAudioSubMenu ? 'bg-white/10 text-white' : ''}`}
                                            title="Audio & Subtitles"
                                        >
                                            <MessageSquare size={18} className="md:w-[22px] md:h-[22px]" />
                                        </button>

                                        {/* Audio/Sub Menu Popup */}
                                        {showAudioSubMenu && (
                                            <div className="absolute bottom-full right-0 mb-6 bg-[#0f0f0f]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-0 min-w-[340px] flex overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200 shadow-2xl z-[150] ring-1 ring-white/5">

                                                {/* Subtitles Col */}
                                                <div className="flex-1 p-4 bg-white/[0.02]">
                                                    <h3 className="text-gray-500 font-bold text-[10px] uppercase tracking-widest mb-3 px-2 flex items-center gap-2">
                                                        <Subtitles size={12} /> Subtitles
                                                    </h3>
                                                    <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                                                        <button onClick={() => handleSubtitleChange(null)}
                                                            className={`w-full text-left px-3 py-2 rounded-lg text-sm flex justify-between items-center transition ${!selectedSubtitle ? 'bg-brand-red text-white shadow-lg shadow-brand-red/20' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}>
                                                            <span>Off</span>
                                                            {!selectedSubtitle && <Check size={14} strokeWidth={3} />}
                                                        </button>
                                                        {effectiveSubtitleTracks.map((sub, idx) => (
                                                            <button key={sub.languageCode || idx} onClick={() => handleSubtitleChange(sub)}
                                                                className={`w-full text-left px-3 py-2 rounded-lg text-sm flex justify-between items-center transition ${selectedSubtitle?.languageCode === sub.languageCode ? 'bg-brand-red text-white shadow-lg shadow-brand-red/20' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}>
                                                                <span>{sub.displayName}</span>
                                                                {selectedSubtitle?.languageCode === sub.languageCode && <Check size={14} strokeWidth={3} />}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Audio Col */}
                                                <div className="flex-1 p-4 border-l border-white/5 bg-black/20">
                                                    <h3 className="text-gray-500 font-bold text-[10px] uppercase tracking-widest mb-3 px-2 flex items-center gap-2">
                                                        <Headphones size={12} /> Audio & Protection
                                                    </h3>

                                                    {/* Embed Ad Shield Card */}
                                                    <div className="mb-4 p-3.5 rounded-2xl bg-gradient-to-b from-emerald-500/15 to-emerald-500/5 border border-emerald-500/30 flex flex-col gap-2.5">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-1.5 text-emerald-300 font-bold text-xs">
                                                                <ShieldCheck size={15} />
                                                                <span>EMBED AD SHIELD</span>
                                                            </div>
                                                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${isAdShieldEnabled ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-red-500/20 text-red-300 border-red-500/30'}`}>
                                                                {isAdShieldEnabled ? 'Active' : 'Disabled'}
                                                            </span>
                                                        </div>
                                                        <p className="text-[11px] text-gray-300 leading-snug">
                                                            {isAdShieldEnabled
                                                                ? `HTML5 Sandbox is active. External popups, new tabs, and site redirects are blocked (${adShieldBlockedCount} blocked).`
                                                                : 'Ad Shield is disabled. External player may open new tabs or popups on click.'}
                                                        </p>
                                                        <div className="flex items-center justify-between pt-1">
                                                            <button
                                                                type="button"
                                                                onClick={toggleAdShield}
                                                                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${isAdShieldEnabled ? 'bg-emerald-500 text-black shadow-md' : 'bg-red-500 text-white shadow-md'}`}
                                                            >
                                                                {isAdShieldEnabled ? 'Shield Enabled' : 'Enable Shield'}
                                                            </button>
                                                            {isAdShieldEnabled && (
                                                                <div className="flex gap-1">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => changeAdShieldMode('strict')}
                                                                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${adShieldMode === 'strict' ? 'bg-emerald-500 text-black' : 'bg-white/10 text-gray-300 hover:text-white'}`}
                                                                    >
                                                                        Strict
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => changeAdShieldMode('standard')}
                                                                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${adShieldMode === 'standard' ? 'bg-emerald-500 text-black' : 'bg-white/10 text-gray-300 hover:text-white'}`}
                                                                    >
                                                                        Standard
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Sound Booster / External Embed Notice */}
                                                    {isExternalStream ? (
                                                        <div className="mb-4 p-3.5 rounded-2xl bg-gradient-to-b from-amber-500/15 to-amber-500/5 border border-amber-500/30 flex flex-col gap-2.5">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-1.5 text-amber-300 font-bold text-xs">
                                                                    <AlertCircle size={15} />
                                                                    <span>EXTERNAL STREAM</span>
                                                                </div>
                                                                <span className="text-[10px] uppercase font-bold text-amber-300 px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/30">
                                                                    Iframe Player
                                                                </span>
                                                            </div>
                                                            <p className="text-[11px] text-gray-300 leading-snug">
                                                                This title is streamed via an external embed ({embedBaseHost || 'proxy.garageband.rocks'}).
                                                                Browser security (Same-Origin Policy) isolates external iframe audio from web pages.
                                                            </p>
                                                            <a
                                                                href="https://chromewebstore.google.com/detail/sound-booster-that-works/gnidjfdekbljleajoeamecfijnhbgndl"
                                                                target="_self"
                                                                rel="noreferrer"
                                                                className="flex items-center justify-between p-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-xs font-bold transition group"
                                                            >
                                                                <div className="flex flex-col">
                                                                    <span>Sound Booster Extension</span>
                                                                    <span className="text-[10px] text-amber-300/80 font-normal">Boosts all tab audio up to 600%</span>
                                                                </div>
                                                                <ExternalLink size={14} className="group-hover:translate-x-0.5 transition-transform" />
                                                            </a>

                                                            {/* Interactive 400% Booster Preview */}
                                                            <div className="pt-2 border-t border-amber-500/20 flex flex-col gap-2">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-[10px] text-amber-200/90 font-bold uppercase tracking-wider">Test 400% Web Audio Engine</span>
                                                                    {isTestingAudio && (
                                                                        <span className="text-[9px] bg-amber-400 text-black px-1.5 py-0.5 rounded font-extrabold animate-pulse">
                                                                            TESTING
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        soundBooster.toggleTestSound((active) => setIsTestingAudio(active));
                                                                    }}
                                                                    className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl font-bold text-xs transition border ${isTestingAudio
                                                                        ? 'bg-amber-400 text-black border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                                                                        : 'bg-white/10 hover:bg-white/15 text-amber-100 border-amber-500/30'
                                                                        }`}
                                                                >
                                                                    <Volume2 size={14} />
                                                                    <span>{isTestingAudio ? 'Stop 400% Demo Chime' : '🎧 Play 400% Demo Chime'}</span>
                                                                </button>
                                                                {isTestingAudio && (
                                                                    <div className="p-2.5 rounded-xl bg-black/50 border border-amber-500/40 flex flex-col gap-1.5 animate-in fade-in duration-150">
                                                                        <div className="flex justify-between text-[11px] text-amber-300 font-bold">
                                                                            <span>Demo Volume:</span>
                                                                            <span>{Math.round(boostLevel * 100)}% ({boostLevel}x)</span>
                                                                        </div>
                                                                        <input
                                                                            type="range"
                                                                            min="1.0"
                                                                            max="4.0"
                                                                            step="0.1"
                                                                            value={boostLevel}
                                                                            onChange={(e) => {
                                                                                const val = parseFloat(e.target.value);
                                                                                setBoostLevel(val);
                                                                            }}
                                                                            className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
                                                                        />
                                                                        <div className="flex justify-between text-[9px] text-gray-400">
                                                                            <span>100% (Normal)</span>
                                                                            <span>200% (2x)</span>
                                                                            <span>400% (4x MAX)</span>
                                                                        </div>
                                                                        <p className="text-[10px] text-amber-200/90 text-center font-medium mt-0.5">
                                                                            Drag slider to hear sound amplify up to 400% in real-time!
                                                                        </p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="mb-4 p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col gap-3">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-1.5">
                                                                    <Zap size={14} className={boostLevel > 1.0 ? 'text-amber-400 fill-amber-400' : 'text-gray-400'} />
                                                                    <span className="text-xs font-bold text-white tracking-wide">SOUND BOOSTER</span>
                                                                </div>
                                                                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${boostLevel > 1.0
                                                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                                                                    : 'bg-white/5 text-gray-400 border-white/10'
                                                                    }`}>
                                                                    {boostLevel > 1.0 ? `${Math.round(boostLevel * 100)}% (${boostLevel}x)` : '100% (NORMAL)'}
                                                                </span>
                                                            </div>

                                                            {/* Presets */}
                                                            <div className="grid grid-cols-5 gap-1">
                                                                {BOOST_PRESETS.map((lvl) => {
                                                                    const isActive = Math.abs(lvl - boostLevel) < 0.05;
                                                                    return (
                                                                        <button
                                                                            key={lvl}
                                                                            onClick={() => setBoostPreset(lvl)}
                                                                            className={`py-1.5 px-1 rounded-lg text-[10px] font-bold text-center transition-all ${isActive
                                                                                ? 'bg-brand-red text-white shadow-md shadow-brand-red/30 ring-1 ring-white/20'
                                                                                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                                                                                }`}
                                                                        >
                                                                            {Math.round(lvl * 100)}%
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>

                                                            {/* Fine slider */}
                                                            <div className="flex flex-col gap-1">
                                                                <div className="flex justify-between text-[10px] text-gray-400 font-medium">
                                                                    <span>100%</span>
                                                                    <span className="text-amber-400 font-bold">{Math.round(boostLevel * 100)}%</span>
                                                                    <span>400%</span>
                                                                </div>
                                                                <input
                                                                    type="range"
                                                                    min="1.0"
                                                                    max="4.0"
                                                                    step="0.1"
                                                                    value={boostLevel}
                                                                    onChange={(e) => {
                                                                        const val = parseFloat(e.target.value);
                                                                        setBoostLevel(val);
                                                                    }}
                                                                    className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-brand-red focus:outline-none"
                                                                />
                                                            </div>

                                                            {/* Extra Audio Processing Toggles */}
                                                            <div className="pt-2 border-t border-white/5 flex flex-col gap-1.5">
                                                                {/* Dialogue Clarity */}
                                                                <button
                                                                    onClick={() => {
                                                                        const next = !dialogueClarity;
                                                                        setDialogueClarity(next);
                                                                        showOsd(next ? 'Dialogue Clarity: ON' : 'Dialogue Clarity: OFF', 'Vocal frequency enhancer', 'zap');
                                                                    }}
                                                                    className="flex items-center justify-between text-left p-1.5 rounded-lg hover:bg-white/5 transition"
                                                                >
                                                                    <div className="flex items-center gap-2">
                                                                        <Sparkles size={13} className={dialogueClarity ? 'text-amber-400' : 'text-gray-500'} />
                                                                        <div className="flex flex-col">
                                                                            <span className="text-[11px] font-semibold text-gray-200">Dialogue Clarity</span>
                                                                            <span className="text-[9px] text-gray-500">Boosts voice frequencies for crisp speech</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className={`w-8 h-4 rounded-full transition-colors relative flex items-center px-0.5 ${dialogueClarity ? 'bg-brand-red' : 'bg-white/10'}`}>
                                                                        <div className={`w-3 h-3 rounded-full bg-white transition-transform ${dialogueClarity ? 'translate-x-4' : 'translate-x-0'}`} />
                                                                    </div>
                                                                </button>

                                                                {/* Anti-Clipping Limiter */}
                                                                <button
                                                                    onClick={() => {
                                                                        const next = !limiterEnabled;
                                                                        setLimiterEnabled(next);
                                                                        showOsd(next ? 'Anti-Clipping: ON' : 'Anti-Clipping: OFF', 'Dynamic distortion protection', 'zap');
                                                                    }}
                                                                    className="flex items-center justify-between text-left p-1.5 rounded-lg hover:bg-white/5 transition"
                                                                >
                                                                    <div className="flex items-center gap-2">
                                                                        <ShieldCheck size={13} className={limiterEnabled ? 'text-emerald-400' : 'text-gray-500'} />
                                                                        <div className="flex flex-col">
                                                                            <span className="text-[11px] font-semibold text-gray-200">Anti-Clipping Limiter</span>
                                                                            <span className="text-[9px] text-gray-500">Compresses peaks to prevent distortion</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className={`w-8 h-4 rounded-full transition-colors relative flex items-center px-0.5 ${limiterEnabled ? 'bg-emerald-600' : 'bg-white/10'}`}>
                                                                        <div className={`w-3 h-3 rounded-full bg-white transition-transform ${limiterEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                                                                    </div>
                                                                </button>

                                                                {/* Test Chime Button */}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        soundBooster.toggleTestSound((active) => setIsTestingAudio(active));
                                                                    }}
                                                                    className={`w-full flex items-center justify-center gap-2 py-1.5 px-2 rounded-lg font-bold text-[11px] transition border ${isTestingAudio
                                                                        ? 'bg-amber-400 text-black border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                                                                        : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/10'
                                                                        }`}
                                                                >
                                                                    <Volume2 size={13} />
                                                                    <span>{isTestingAudio ? 'Stop Demo Chime' : '🎧 Test 400% Audio Chime'}</span>
                                                                </button>
                                                            </div>

                                                            {/* Dynamic visualizer bars when boosted */}
                                                            {boostLevel > 1.0 && (
                                                                <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-black/40 border border-amber-500/20 text-[10px] text-amber-300/90 font-medium">
                                                                    <span className="flex items-center gap-1.5">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                                                                        Amplification Active
                                                                    </span>
                                                                    <div className="flex items-end gap-0.5 h-3">
                                                                        <div className="w-0.5 bg-amber-400 rounded-full h-2 animate-pulse" />
                                                                        <div className="w-0.5 bg-amber-400 rounded-full h-3 animate-pulse" />
                                                                        <div className="w-0.5 bg-amber-400 rounded-full h-1.5 animate-pulse" />
                                                                        <div className="w-0.5 bg-amber-400 rounded-full h-2.5 animate-pulse" />
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    <div className="space-y-1">
                                                        {AUDIO_OPTIONS.map(audi => (
                                                            <button key={audi.id} onClick={() => setSelectedAudio(audi)}
                                                                className={`w-full text-left px-3 py-2 rounded-lg text-sm flex justify-between items-center transition ${selectedAudio.id === audi.id ? 'bg-white/10 text-white font-medium' : 'text-gray-400 hover:bg-white/5'}`}>
                                                                <span>{audi.label}</span>
                                                                {selectedAudio.id === audi.id && <Check size={14} className="text-brand-red" />}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Episodes Selector (TV Only) */}
                                    {isTV && !isEmbedPlayer && (
                                        <div className="relative">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setShowEpisodesMenu(!showEpisodesMenu); setShowAudioSubMenu(false); setShowQualityMenu(false); }}
                                                className={`hover:text-white transition-all p-1.5 md:p-2.5 rounded-xl hover:bg-white/5 ${showEpisodesMenu ? 'bg-white/10 text-white' : ''}`}
                                                title="Episodes"
                                            >
                                                <Layers size={18} className="md:w-[22px] md:h-[22px]" />
                                            </button>
                                        </div>
                                    )}

                                    {/* Quality Settings */}
                                    <div className="relative">
                                        <button onClick={(e) => { e.stopPropagation(); setShowQualityMenu(!showQualityMenu); setShowAudioSubMenu(false); setShowEpisodesMenu(false); }}
                                            className={`hover:text-white transition-all p-1.5 md:p-2.5 rounded-xl hover:bg-white/5 ${showQualityMenu ? 'bg-white/10 text-white' : ''}`}
                                            title="Quality & Speed">
                                            <Settings size={18} className="md:w-[22px] md:h-[22px]" />
                                        </button>

                                        {showQualityMenu && (
                                            <div className="absolute bottom-full right-0 mb-6 bg-[#0f0f0f]/95 backdrop-blur-xl border border-white/10 rounded-xl p-0 min-w-[200px] flex flex-col shadow-2xl animate-in slide-in-from-bottom-4 z-[150] ring-1 ring-white/5 overflow-hidden">

                                                {/* Quality Section */}
                                                <div>
                                                    <h3 className="text-gray-500 font-bold text-[10px] uppercase tracking-widest px-4 py-2 bg-white/5">Quality</h3>
                                                    <div className="max-h-48 overflow-y-auto custom-scrollbar p-1">
                                                        {qualities.length > 0 ? qualities.map(q => {
                                                            let usage = '';
                                                            if (q.includes('1080') || q.includes('highres')) usage = 'Late Data (3GB/hr)';
                                                            else if (q.includes('720')) usage = 'Med Data (1GB/hr)';
                                                            else if (q !== 'auto') usage = 'Low Data (<0.5GB/hr)';

                                                            return (
                                                                <button key={q} onClick={() => handleQualityChange(q)}
                                                                    className={`w-full text-left px-4 py-2 text-xs hover:bg-white/10 rounded-lg transition-colors flex justify-between items-center ${currentQuality === q ? 'text-brand-red font-bold bg-brand-red/5' : 'text-gray-400 hover:text-white'}`}>
                                                                    <div className="flex flex-col">
                                                                        <span>{q.toUpperCase()}</span>
                                                                        {usage && <span className="text-[9px] opacity-60 font-normal">{usage}</span>}
                                                                    </div>
                                                                    {currentQuality === q && <Check size={12} strokeWidth={3} />}
                                                                </button>
                                                            );
                                                        }) : (
                                                            <div className="px-4 py-2 text-xs text-gray-500 italic">Auto (Default)</div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Playback Speed (Bonus Feature integration if space permits, otherwise just Quality) */}
                                            </div>
                                        )}
                                    </div>

                                    {/* Zoom / Fill Screen Toggle */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setIsZoomed(!isZoomed); }}
                                        className={`hover:text-white transition-all p-1.5 md:p-2.5 rounded-xl hover:bg-white/5 ${isZoomed ? 'text-brand-red bg-white/5' : ''}`}
                                        title={isZoomed ? "Reset Zoom" : "Fill Screen"}
                                    >
                                        {isZoomed ? <Minimize size={18} className="md:w-[22px] md:h-[22px]" /> : <Scan size={18} className="md:w-[22px] md:h-[22px]" />}
                                    </button>

                                    {/* Fullscreen */}
                                    <button className="hover:text-white hover:bg-white/10 transition p-1.5 md:p-2.5 rounded-xl" onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}>
                                        {isFullscreen ? <Minimize size={18} className="md:w-[22px] md:h-[22px]" /> : <Maximize size={18} className="md:w-[22px] md:h-[22px]" />}
                                    </button>
                                </div>
                            </div>
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
                                    {content.title} {content.releaseYear ? `• ${content.releaseYear}` : ''}
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
                                            </div>
                                        ) : (
                                            <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex flex-col items-center justify-center font-black shrink-0 transition-colors ${isCurrent ? 'bg-brand-red text-white' : 'bg-white/5 text-gray-300 group-hover:bg-white/10 group-hover:text-white'
                                                }`}>
                                                <span className="text-[9px] uppercase tracking-wider opacity-60 font-semibold">EP</span>
                                                <span className="text-base sm:text-lg leading-none">{ep.episodeNumber}</span>
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
                                                {isCurrent && (
                                                    <span className="px-1.5 py-0.5 rounded bg-brand-red text-white text-[9px] font-black uppercase tracking-wider animate-pulse">
                                                        Now Playing
                                                    </span>
                                                )}
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

            {/* Unclickable Low-Opacity Corner Watermark Logo (Always visible in normal, embedded, and fullscreen modes) */}
            <div
                className={`video-watermark absolute z-[999] pointer-events-none select-none transition-all duration-300 drop-shadow-[0_2px_12px_rgba(0,0,0,0.85)] ${isFullscreen
                    ? 'top-6 right-6 md:top-8 md:right-10 opacity-35'
                    : (isMobile && isPortrait
                        ? 'top-16 right-4 opacity-30'
                        : 'top-4 right-4 md:top-6 md:right-8 opacity-30')
                    }`}
                aria-hidden="true"
            >
                <img
                    src="/favicon.png"
                    alt=""
                    className={`${isFullscreen ? 'w-10 h-10 md:w-14 md:h-14' : 'w-7 h-7 md:w-10 md:h-10'} object-contain pointer-events-none select-none`}
                    draggable={false}
                />
            </div>
        </div>
    );
};

export default VideoPlayer;