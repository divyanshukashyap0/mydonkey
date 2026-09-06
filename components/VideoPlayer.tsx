import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Hls from 'hls.js';
import { Play, Pause, Volume2, Volume1, VolumeX, Maximize, Settings, SkipForward, ArrowLeft, RotateCcw, RotateCw, Subtitles, Layers, BarChart2, Minimize, Headphones, Check, MessageSquare, Wifi, ExternalLink, Scan, Scaling, AlertCircle, RefreshCw, Zap, Sliders, Sparkles, ShieldCheck } from 'lucide-react';
import { Content } from '../types';
import StatsPanel from './StatsPanel';
import DrivePlayer from './DrivePlayer';
import ContentLoader from './ContentLoader';
import { useStore } from '../context/StoreContext';
import { logUserActivity, incrementWatchTime } from '../utils/activityLogger';
import { MoviVideo } from './MoviVideo';
import { buildEmbedUrl, parseEmbedContentType } from '../utils/embedUrl';
import { soundBooster } from '../player/SoundBooster';

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

    // Extract IDs locally for safety



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

    const isTV = content.type === 'tv' && content.seasons && content.seasons.length > 0;
    const currentSeason = isTV ? content.seasons![currentSeasonIdx] : null;
    const currentEpisode = (isTV && currentSeason) ? currentSeason.episodes[currentEpisodeIdx] : null;

    const embedBaseHost = useMemo(() => {
        return (settings?.embedProxyBaseUrl || 'https://proxy.garageband.rocks').replace(/^https?:\/\//, '').replace(/\/+$/, '');
    }, [settings?.embedProxyBaseUrl]);

    // --- Video Source Logic ---
    const getDriveId = (url: string) => {
        if (!url) return '';
        if (url.includes('youtube.com') || url.includes('youtu.be') || url.includes('proxy.garageband.rocks') || (embedBaseHost && url.includes(embedBaseHost)) || url.includes('imdb.com')) return '';
        const driveUrlMatch = url.match(/\/file\/d\/([-\w]{25,})/);
        if (driveUrlMatch) return driveUrlMatch[1];
        const rawIdMatch = url.match(/^[-\w]{25,}$/);
        if (rawIdMatch && !url.startsWith('tt')) return url;
        const match = url.match(/[-\w]{25,}/);
        return match ? match[0] : '';
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
    let overrideUrl = content.videoUrl;

    const extractedImdbId = content.imdbId || (typeof content.id === 'string' && content.id.startsWith('imdb_') ? content.id.replace('imdb_', '') : '') || (overrideUrl && /^tt\d+$/.test(overrideUrl.trim()) ? overrideUrl.trim() : '');

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
    if (overrideDriveId) {
        finalDriveId = overrideDriveId;
    } else if (isMovieMode) {
        finalDriveId = getDriveId(content.movieDriveId || '');
    } else {
        if (!finalYoutubeId) {
            finalDriveId = getDriveId(content.youtubeId || '');
        }
    }

    let directVideoUrl = (overrideUrl && !overrideYoutubeId && !overrideDriveId) ? overrideUrl : null;

    if (isTV) {
        if (content.videoUrl) {
            directVideoUrl = content.videoUrl;
        } else if (currentEpisode) {
            directVideoUrl = currentEpisode.videoUrl || (extractedImdbId ? buildEmbedUrl(extractedImdbId, 'tv', settings, currentSeason?.seasonNumber, currentEpisode.episodeNumber) : null);
        } else if (extractedImdbId) {
            directVideoUrl = buildEmbedUrl(extractedImdbId, 'tv', settings);
        }
    } else if (overrideUrl) {
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

    const useDirect = !!directVideoUrl;
    const isLegacyMovieDriveScale = isMovieMode && !overrideUrl && !!finalDriveId && !finalYoutubeId;
    const isLegacyStandardDrive = !isMovieMode && !overrideUrl && !!finalDriveId && !finalYoutubeId;
    const useDrive = (!!overrideDriveId) || isLegacyMovieDriveScale || isLegacyStandardDrive;

    const youtubeVideoId = finalYoutubeId;
    const driveIdToUse = finalDriveId;
    const isDriveVideo = useDrive && !useDirect;
    const isExternalStream = isDirectIframeEmbed || isDriveVideo || (!directVideoUrl && !!youtubeVideoId);
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

        return () => {
            if (document.fullscreenElement && document.exitFullscreen) {
                document.exitFullscreen().catch(() => {});
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
                    } catch (e) {}
                } else if ((target as any)?.mozRequestFullScreen) {
                    try {
                        await (target as any).mozRequestFullScreen();
                        entered = true;
                    } catch (e) {}
                } else if ((target as any)?.msRequestFullscreen) {
                    try {
                        await (target as any).msRequestFullscreen();
                        entered = true;
                    } catch (e) {}
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
                        } catch (e) {}
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
    const isHoveringHeaderRef = useRef(false);

    // Floating Header Pill - Permanently visible in any activity & draggable to any location
    const [pillPosition, setPillPosition] = useState<{ x: number; y: number } | null>(null);
    const pillRef = useRef<HTMLDivElement>(null);
    const dragDataRef = useRef<{
        isDragging: boolean;
        startX: number;
        startY: number;
        initialLeft: number;
        initialTop: number;
        hasMoved: boolean;
    }>({
        isDragging: false,
        startX: 0,
        startY: 0,
        initialLeft: 0,
        initialTop: 0,
        hasMoved: false,
    });

    const handlePillPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        // Never start drag or capture pointer when interacting with any button inside the pill
        if ((e.target as HTMLElement).closest('button')) return;
        if (e.button !== 0 && e.pointerType === 'mouse') return;
        const pill = pillRef.current;
        if (!pill) return;

        const rect = pill.getBoundingClientRect();
        dragDataRef.current = {
            isDragging: true,
            startX: e.clientX,
            startY: e.clientY,
            initialLeft: rect.left,
            initialTop: rect.top,
            hasMoved: false,
        };

        try {
            pill.setPointerCapture(e.pointerId);
        } catch (_) {}
    };

    const handlePillPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!dragDataRef.current.isDragging) return;

        const deltaX = e.clientX - dragDataRef.current.startX;
        const deltaY = e.clientY - dragDataRef.current.startY;

        if (!dragDataRef.current.hasMoved && Math.hypot(deltaX, deltaY) > 5) {
            dragDataRef.current.hasMoved = true;
        }

        if (dragDataRef.current.hasMoved) {
            const pill = pillRef.current;
            const width = pill ? pill.offsetWidth : 240;
            const height = pill ? pill.offsetHeight : 50;

            const nextX = dragDataRef.current.initialLeft + deltaX;
            const nextY = dragDataRef.current.initialTop + deltaY;

            const clampedX = Math.max(8, Math.min(window.innerWidth - width - 8, nextX));
            const clampedY = Math.max(8, Math.min(window.innerHeight - height - 8, nextY));

            setPillPosition({ x: clampedX, y: clampedY });
        }
    };

    const handlePillPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!dragDataRef.current.isDragging) return;
        dragDataRef.current.isDragging = false;
        setTimeout(() => {
            dragDataRef.current.hasMoved = false;
        }, 50);

        const pill = pillRef.current;
        if (pill) {
            try {
                pill.releasePointerCapture(e.pointerId);
            } catch (_) {}
        }
    };


    // Auto-clamp floating pill if window resizes
    useEffect(() => {
        const handleResize = () => {
            if (!pillPosition || !pillRef.current) return;
            const width = pillRef.current.offsetWidth || 240;
            const height = pillRef.current.offsetHeight || 50;
            const clampedX = Math.max(8, Math.min(window.innerWidth - width - 8, pillPosition.x));
            const clampedY = Math.max(8, Math.min(window.innerHeight - height - 8, pillPosition.y));
            if (clampedX !== pillPosition.x || clampedY !== pillPosition.y) {
                setPillPosition({ x: clampedX, y: clampedY });
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [pillPosition]);

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
        if (isDriveVideo) return;
        if ((isHls || isNativeVideo) && videoRef.current) {
            videoRef.current.currentTime += seconds;
        } else if (playerRef.current && playerRef.current.getCurrentTime) {
            const curr = playerRef.current.getCurrentTime();
            playerRef.current.seekTo(curr + seconds, true);
        }
    }, [isDriveVideo, isHls, isNativeVideo]);

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
        } catch {}
    }, [boostLevel]);

    useEffect(() => {
        soundBooster.setDialogueClarity(dialogueClarity);
        try {
            localStorage.setItem('mydonkey_dialogue_boost', String(dialogueClarity));
        } catch {}
    }, [dialogueClarity]);

    useEffect(() => {
        soundBooster.setLimiter(limiterEnabled);
    }, [limiterEnabled]);

    const triggerRipple = useCallback((side: 'left' | 'right') => {
        setRippleSides(prev => [...prev, side]);
        setTimeout(() => {
            setRippleSides(prev => prev.filter(s => s !== side));
        }, 500);
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
        return () => {};
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
            } catch {}
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
            } catch {}
        }

        // 4. Synchronize all HTMLMediaElements in document
        try {
            document.querySelectorAll<HTMLMediaElement>('video, audio').forEach((el) => {
                el.muted = isMuted;
                if (isMuted) {
                    el.volume = 0;
                } else {
                    el.volume = Math.min(1, Math.max(0, volume / 100));
                }
            });
        } catch {}

        // 5. Broadcast postMessage mute/unmute to all iframes (DrivePlayer, proxy.garageband.rocks, external embeds)
        try {
            const iframes = document.querySelectorAll<HTMLIFrameElement>('iframe');
            iframes.forEach((iframe) => {
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
                    } catch {}
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
                } catch {}
            });
        } catch (e) {
            console.warn('Error broadcasting mute state:', e);
        }
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
                            .catch(() => {});
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
            } catch (_) {}
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


    // Controls & Movie Card Visibility Timer (Hides after 3 seconds of inactivity)
    const resetInactivityTimer = useCallback(() => {
        if (isHoveringHeaderRef.current) return;
        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = setTimeout(() => {
            if (!isHoveringHeaderRef.current && !showStats && !showAudioSubMenu && !showQualityMenu && !showEpisodesMenu) {
                setShowControls(false);
                // When controls hide, restore window focus so subsequent clicks into iframe fire blur
                try {
                    if (document.activeElement?.tagName === 'IFRAME') {
                        window.focus();
                    }
                } catch (_) {}
            }
        }, 3000);
    }, [showStats, showAudioSubMenu, showQualityMenu, showEpisodesMenu]);

    useEffect(() => {
        const handleUserActivity = () => {
            if (document.activeElement?.tagName === 'IFRAME') {
                finishLoading();
            }
            if (!isHoveringHeaderRef.current) {
                resetInactivityTimer();
            }
        };

        const events = ['mousemove', 'pointermove', 'mousedown', 'pointerdown', 'touchstart', 'touchmove', 'wheel', 'scroll', 'keydown', 'click'];
        events.forEach(evt => {
            window.addEventListener(evt, handleUserActivity, { capture: true, passive: true });
        });
        window.addEventListener('focus', handleUserActivity);
        window.addEventListener('blur', handleUserActivity);

        // Initial 3-second timer on mount
        resetInactivityTimer();

        return () => {
            events.forEach(evt => {
                window.removeEventListener(evt, handleUserActivity, { capture: true } as any);
            });
            window.removeEventListener('focus', handleUserActivity);
            window.removeEventListener('blur', handleUserActivity);
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        };
    }, [resetInactivityTimer]);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if user is typing in an input
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

            switch (e.code) {
                case 'Space':
                case 'KeyK':
                    e.preventDefault();
                    setPlaying(prev => !prev);
                    break;
                case 'ArrowLeft':
                case 'KeyJ':
                    e.preventDefault();
                    handleSkip(-10);
                    triggerRipple('left');
                    break;
                case 'ArrowRight':
                case 'KeyL':
                    e.preventDefault();
                    handleSkip(10);
                    triggerRipple('right');
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
                case 'KeyF':
                    e.preventDefault();
                    toggleFullscreen();
                    break;
                case 'KeyM':
                    e.preventDefault();
                    setIsMuted(prev => {
                        const next = !prev;
                        showOsd(next ? 'Muted' : 'Unmuted', undefined, next ? 'mute' : 'volume');
                        return next;
                    });
                    break;
                case 'Escape':
                    if (document.fullscreenElement) {
                        toggleFullscreen();
                    } else {
                        onClose();
                    }
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleSkip, triggerRipple, toggleFullscreen, onClose, cycleBoost, boostLevel, showOsd]);


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
                            requestFS.call(playerContainerRef.current).catch(() => {});
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
            if (!isHoveringHeaderRef.current && !showStats && !showAudioSubMenu && !showQualityMenu && !showEpisodesMenu) {
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

        // Double Tap Logic
        if (lastTapRef.current && (now - lastTapRef.current.time) < 300) {
            const isLeft = x < window.innerWidth / 2;
            if (isLeft) {
                handleSkip(-10);
                triggerRipple('left');
            } else {
                handleSkip(10);
                triggerRipple('right');
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
        const prevTitle = document.title;
        if (content?.title) {
            document.title = `${content.title} | My Donkey`;
        }
        return () => {
            document.title = prevTitle;
        };
    }, [content?.title]);

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
                    {directVideoUrl && (
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
                                <iframe 
                                    className="w-full h-full relative z-[30] border-0"
                                    src={finalUrl}
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                                    allowFullScreen
                                    scrolling="no"
                                    referrerPolicy="origin"
                                    title={content.title}
                                    onLoad={handleIframeLoad}
                                />
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

                {/* Center playback controls (Mobile Portrait only) */}
                {isMobile && isPortrait && !isDriveVideo && !isDirectIframeEmbed && (
                    <div
                        className={`absolute inset-0 z-10 flex items-center justify-center gap-8 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                        onClick={handleTap}
                    >
                        <button className="text-white/80 bg-black/30 backdrop-blur-sm p-3 rounded-full active:scale-90 transition pointer-events-auto" onClick={(e) => { e.stopPropagation(); handleSkip(-10); }}>
                            <RotateCcw size={22} />
                        </button>
                        <button className="text-white bg-black/50 backdrop-blur-md p-4 rounded-full border border-white/10 active:scale-90 transition pointer-events-auto" onClick={(e) => { e.stopPropagation(); setPlaying(!playing); }}>
                            {playing ? <Pause size={28} className="fill-current" /> : <Play size={28} className="fill-current ml-0.5" />}
                        </button>
                        <button className="text-white/80 bg-black/30 backdrop-blur-sm p-3 rounded-full active:scale-90 transition pointer-events-auto" onClick={(e) => { e.stopPropagation(); handleSkip(10); }}>
                            <RotateCw size={22} />
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
                            <button
                                onClick={toggleFullscreen}
                                className="flex items-center gap-2 text-gray-300 hover:text-white text-xs bg-white/10 hover:bg-white/15 px-3.5 py-2 rounded-full transition cursor-pointer active:scale-95 shadow-sm"
                            >
                                <Maximize size={14} /> <span>Fullscreen</span>
                            </button>
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
                                <span className="text-sm font-medium">Available in it's original Sound & all languages subtitles Available</span>
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

            {/* Screen Activity Detector: Detects mouse movement and touch across the screen when controls are hidden, while leaving bottom player controls 100% uncovered & interactive */}
            {!showControls && (
                <div
                    id="vp-activity-detector"
                    className={`fixed top-0 left-0 right-0 ${isMobile && isPortrait ? 'bottom-1/2' : 'bottom-20 md:bottom-24'} z-[90] bg-transparent select-none cursor-auto`}
                    onPointerMove={resetInactivityTimer}
                    onMouseMove={resetInactivityTimer}
                    onMouseEnter={resetInactivityTimer}
                    onTouchStart={resetInactivityTimer}
                    onPointerDown={resetInactivityTimer}
                />
            )}

            {/* Floating Navigation Pill Header (Permanently visible in any activity & any location) */}
            <div
                ref={pillRef}
                style={
                    pillPosition
                        ? { left: `${pillPosition.x}px`, top: `${pillPosition.y}px`, transform: 'none' }
                        : undefined
                }
                onPointerDown={handlePillPointerDown}
                onPointerMove={handlePillPointerMove}
                onPointerUp={handlePillPointerUp}
                onPointerCancel={handlePillPointerUp}
                onDoubleClick={() => setPillPosition(null)}
                onMouseEnter={() => {
                    isHoveringHeaderRef.current = true;
                    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
                    setShowControls(true);
                }}
                onMouseLeave={() => {
                    isHoveringHeaderRef.current = false;
                    resetInactivityTimer();
                }}
                className={`fixed z-[300] select-none touch-none cursor-grab active:cursor-grabbing transition-opacity duration-300 ${
                    showControls
                        ? 'opacity-50 hover:opacity-100 pointer-events-auto'
                        : 'opacity-0 pointer-events-none'
                } ${
                    pillPosition
                        ? ''
                        : isMobile && isPortrait
                        ? 'top-3 left-3'
                        : 'top-1/2 left-2 md:left-6 -translate-y-1/2'
                }`}
                title="Drag to reposition anywhere, double-click to reset"
            >
                <div className="bg-black/60 backdrop-blur-xl border border-white/20 inline-flex items-center gap-2 md:gap-3 px-2 py-2 md:px-3 md:py-2.5 rounded-2xl pointer-events-auto hover:bg-black/85 transition-all shadow-2xl ring-1 ring-white/10 group/header">
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
                            setShowEpisodesMenu(!showEpisodesMenu);
                        }}
                        className="text-left pr-2 md:pr-4 group/title cursor-pointer select-none"
                    >
                        <div className="text-white font-bold text-xs md:text-sm leading-tight tracking-tight line-clamp-1 max-w-[120px] md:max-w-[200px] group-hover/title:text-brand-red transition-colors">
                            {content.title}
                        </div>
                        {isTV && currentEpisode && (
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-brand-red font-black text-[8px] md:text-[10px] uppercase tracking-wider bg-brand-red/10 px-1.5 py-0.5 rounded">
                                    S{currentSeason?.seasonNumber} • E{currentEpisode.episodeNumber}
                                </span>
                            </div>
                        )}
                    </button>
                    <div className="h-6 w-px bg-white/20 shrink-0 pointer-events-none"></div>
                    <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleFullscreen();
                        }}
                        className="text-white hover:text-brand-red transition-all p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-90 flex items-center justify-center cursor-pointer shrink-0"
                        title={isFullscreen ? "Exit Fullscreen (Esc)" : "Full Screen (F)"}
                        aria-label="Toggle Fullscreen"
                    >
                        {isFullscreen ? <Minimize size={18} className="md:w-5 md:h-5" /> : <Maximize size={18} className="md:w-5 md:h-5" />}
                    </button>
                </div>
            </div>

            {/* Gesture Layer (Mobile Landscape Only) */}
            {
                !isDriveVideo && !isDirectIframeEmbed && !isPortrait && (
                    <div
                        className="absolute inset-0 z-[115]"
                        onClick={handleTap}
                        style={{ WebkitTapHighlightColor: 'rgba(0,0,0,0)', outline: 'none' }}
                    >
                        {/* Visual Feedback for Double Tap */}
                        {rippleSides.map((side) => (
                            <div key={side} className={`absolute top-0 bottom-0 ${side === 'left' ? 'left-0' : 'right-0'} w-1/3 flex items-center justify-center pointer-events-none animate-ping opacity-0`}>
                                <div className="bg-white/20 p-4 rounded-full">
                                    {side === 'left' ? <RotateCcw size={40} /> : <RotateCw size={40} />}
                                </div>
                            </div>
                        ))}
                    </div>
                )
            }

            {/* Centered Playback Controls (Landscape/Desktop only) */}
            {!isDriveVideo && !isDirectIframeEmbed && !isPortrait && (
                <div className={`vp-center-controls absolute inset-0 z-[116] pointer-events-none flex flex-row items-center justify-center gap-4 md:gap-16 transition-all duration-300 ${showControls ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
                    <button className="text-white/80 hover:text-white bg-black/20 hover:bg-black/40 backdrop-blur-sm transition-all p-3 md:p-5 rounded-full pointer-events-auto active:scale-95" onClick={(e) => { e.stopPropagation(); handleSkip(-10); }} title="-10s">
                        <RotateCcw size={24} className="md:w-10 md:h-10" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setPlaying(!playing); }}
                        className="text-white hover:text-brand-red bg-black/40 backdrop-blur-md hover:bg-black/60 transition-all p-4 md:p-7 rounded-full active:scale-95 pointer-events-auto border border-white/10 shadow-2xl">
                        {playing ?
                            <Pause size={34} className="fill-current md:w-16 md:h-16" /> :
                            <Play size={34} className="fill-current ml-1 md:ml-2 md:w-16 md:h-16" />
                        }
                    </button>
                    <button className="text-white/80 hover:text-white bg-black/20 hover:bg-black/40 backdrop-blur-sm transition-all p-3 md:p-5 rounded-full pointer-events-auto active:scale-95" onClick={(e) => { e.stopPropagation(); handleSkip(10); }} title="+10s">
                        <RotateCw size={24} className="md:w-10 md:h-10" />
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

                                {/* LEFT: Play/Pause, Volume Slider, and Sound Booster */}
                                <div className="flex flex-1 items-center gap-1 md:gap-3">
                                    <button onClick={(e) => { e.stopPropagation(); setPlaying(!playing); }} className="text-gray-300 hover:text-white p-1.5 md:p-2 rounded-full hover:bg-white/10 transition" title={playing ? "Pause" : "Play"}>
                                        {playing ? <Pause size={18} className="md:w-[22px] md:h-[22px] fill-current" /> : <Play size={18} className="md:w-[22px] md:h-[22px] fill-current ml-0.5" />}
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
                                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wider transition-all duration-300 ${
                                            boostLevel > 1.0
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
                                                        <Headphones size={12} /> Audio
                                                    </h3>

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
                                                                target="_blank"
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
                                                                    className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl font-bold text-xs transition border ${
                                                                        isTestingAudio 
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
                                                                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                                                                    boostLevel > 1.0
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
                                                                            className={`py-1.5 px-1 rounded-lg text-[10px] font-bold text-center transition-all ${
                                                                                isActive
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
                                                                    className={`w-full flex items-center justify-center gap-2 py-1.5 px-2 rounded-lg font-bold text-[11px] transition border ${
                                                                        isTestingAudio 
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

            {/* Episodes Menu Overlay */}
            {showEpisodesMenu && isTV && (
                <div
                    className="fixed inset-0 z-[500] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300"
                    onClick={() => setShowEpisodesMenu(false)}
                >
                    <div
                        className="bg-[#0f0f0f] border border-white/10 rounded-3xl p-0 w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)] ring-1 ring-white/10 animate-in zoom-in-95 duration-300"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-5 md:p-6 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                            <div>
                                <h3 className="text-white font-black text-xl md:text-2xl tracking-tighter">Episodes</h3>
                                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-0.5">{content.title}</p>
                            </div>
                            <select
                                value={currentSeasonIdx}
                                onChange={(e) => {
                                    setCurrentSeasonIdx(parseInt(e.target.value));
                                    setCurrentEpisodeIdx(0);
                                }}
                                className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-black text-white outline-none focus:ring-2 ring-brand-red/50 transition-all cursor-pointer hover:bg-white/10"
                            >
                                {content.seasons?.map((s, idx) => (
                                    <option key={s.id} value={idx} className="bg-[#0f0f0f]">
                                        {s.title}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 space-y-2">
                            {currentSeason?.episodes.map((ep, idx) => (
                                <button
                                    key={ep.id}
                                    onClick={() => {
                                        setCurrentEpisodeIdx(idx);
                                        setShowEpisodesMenu(false);
                                        setInitialLoad(true);
                                        setPlaying(true);
                                    }}
                                    className={`w-full text-left p-4 rounded-[1.5rem] flex items-center gap-4 transition-all duration-300 group ${currentEpisodeIdx === idx ? 'bg-brand-red text-white shadow-xl shadow-brand-red/20 scale-[1.02]' : 'text-gray-400 hover:bg-white/5 hover:text-white hover:scale-[1.01]'}`}
                                >
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black shrink-0 transition-colors ${currentEpisodeIdx === idx ? 'bg-white/20' : 'bg-black/40 group-hover:bg-white/10'}`}>
                                        {ep.episodeNumber}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm md:text-base font-black truncate">{ep.title}</div>
                                        <div className={`text-xs mt-0.5 font-bold ${currentEpisodeIdx === idx ? 'text-white/70' : 'text-gray-500'}`}>
                                            {ep.duration || 'Duration Unknown'}
                                        </div>
                                    </div>
                                    {currentEpisodeIdx === idx ? (
                                        <Play size={20} className="fill-current" />
                                    ) : (
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Play size={20} />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>

                        <div className="p-4 border-t border-white/5 flex justify-center">
                            <button
                                onClick={() => setShowEpisodesMenu(false)}
                                className="text-gray-500 hover:text-white font-bold text-xs uppercase tracking-widest p-2 transition-colors"
                            >
                                Close Menu
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Unclickable Low-Opacity Corner Watermark Logo (Always visible in normal, embedded, and fullscreen modes) */}
            <div 
                className={`video-watermark absolute z-[999] pointer-events-none select-none transition-all duration-300 drop-shadow-[0_2px_12px_rgba(0,0,0,0.85)] ${
                    isFullscreen 
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