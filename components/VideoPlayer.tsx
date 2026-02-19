import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Settings, SkipForward, ArrowLeft, RotateCcw, RotateCw, Subtitles, Layers, BarChart2, Minimize, Headphones, Check, MessageSquare, Wifi, ExternalLink, Scan, Scaling } from 'lucide-react';
import { Content } from '../types';
import StatsPanel from './StatsPanel';
import { useStore } from '../context/StoreContext';
import { logUserActivity, incrementWatchTime } from '../utils/activityLogger';

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
    const { updatePlaybackProgress, currentUser, updateContentDuration } = useStore();

    // Extract IDs locally for safety
    const getDriveId = (url: string) => {
        if (!url) return '';
        const match = url.match(/[-\w]{25,}/);
        return match ? match[0] : url;
    };

    const getYoutubeId = (url: string) => {
        if (!url) return '';
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : url;
    };

    // Determine play mode
    const isMovieMode = content.playMode === 'movie';

    // Source Resolution Logic
    // 1. Check for overrides in videoUrl (New Decoupled Field)
    const overrideUrl = content.videoUrl;
    const overrideYoutubeId = overrideUrl ? getYoutubeId(overrideUrl) : '';
    const overrideDriveId = overrideUrl ? getDriveId(overrideUrl) : '';

    // 2. Determine IDs based on override or legacy fields

    // YouTube ID Calculation
    // Priority: Override YT ID > Legacy Movie YT ID > Legacy Standard YT ID
    let finalYoutubeId = '';
    if (overrideYoutubeId && overrideYoutubeId.length === 11) {
        finalYoutubeId = overrideYoutubeId;
    } else if (isMovieMode) {
        finalYoutubeId = getYoutubeId(content.movieYoutubeId || '');
    } else {
        // Legacy content.youtubeId could be Drive or YT
        const rawId = content.youtubeId || '';
        if (rawId.length <= 20) finalYoutubeId = getYoutubeId(rawId);
    }

    // Drive ID Calculation
    // Priority: Override Drive ID > Legacy Movie Drive ID > Legacy Standard Drive ID
    let finalDriveId = '';
    if (overrideDriveId) {
        finalDriveId = overrideDriveId;
    } else if (isMovieMode) {
        finalDriveId = getDriveId(content.movieDriveId || '');
    } else {
        const rawId = content.youtubeId || '';
        if (rawId.length > 20) finalDriveId = getDriveId(rawId);
    }

    // Direct Video URL Calculation
    // Only used if Override exists AND it's not YT AND it's not Drive
    const directVideoUrl = (overrideUrl && !overrideYoutubeId && !overrideDriveId) ? overrideUrl : null;

    // 3. Final Player Mode Determination
    const useDirect = !!directVideoUrl;
    // We use Drive mode if we have a Drive ID AND (No Direct URL) AND (No YouTube ID OR Logic Dictates Drive)
    // Logic: If Override was Drive, use Drive. If Override was YT, use YT.
    // If NO Override: Legacy rules apply (Movies often prefer Drive if both exist? Code suggests Drive checked first).
    // Let's simplified: If `finalDriveId` is valid, checks if we should prefer it.
    // Use Drive if:
    // 1. driveId exists
    // 2. Not using Direct URL
    // 3. AND (No YouTube ID OR (It's a Movie Mode without Override, where we prefer Drive?))
    // Actually, simple rule: If overrideUrl was Drive, `finalYoutubeId` is empty (from logic above). So Drive wins.
    // If overrideUrl was YT, `finalDriveId` is empty. So YT wins.
    // Conflict only happens if NO OVERRIDE and BOTH Legacy IDs exist.
    // Original logic: `isDriveVideo = (isMovieMode && !!content.movieDriveId) || ...`
    // So for Movies, checks Drive first.

    const isLegacyMovieDriveScale = isMovieMode && !overrideUrl && !!content.movieDriveId;
    const isLegacyStandardDrive = !isMovieMode && !overrideUrl && (content.youtubeId || '').length > 20;

    // We use Drive Player if:
    // A. We have an explicit Drive Override
    // B. We are in legacy mode and matched Drive criteria
    const useDrive = (!!overrideDriveId) || isLegacyMovieDriveScale || isLegacyStandardDrive;

    // Export usage vars (mapping to existing component variables)
    const youtubeVideoId = finalYoutubeId;
    const driveIdToUse = finalDriveId;
    const isDriveVideo = useDrive && !useDirect; // Direct takes precedence if valid (though logic ensures mutually exclusive)


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
    const [initialLoad, setInitialLoad] = useState(true); // New state to track first play
    const [isBoosted, setIsBoosted] = useState(false);
    const [showDataWarning, setShowDataWarning] = useState(false);
    const [isZoomed, setIsZoomed] = useState(false); // Zoom/Fill State

    // Data Usage Warning
    useEffect(() => {
        if (!currentUser?.lowDataMode && !isDriveVideo) {
            setShowDataWarning(true);
            const timer = setTimeout(() => setShowDataWarning(false), 5000);
            return () => clearTimeout(timer);
        }
    }, [currentUser?.lowDataMode, isDriveVideo]);

    // Player Options
    const [qualities, setQualities] = useState<string[]>([]);

    const [isApiReady, setIsApiReady] = useState(!!window.YT && !!window.YT.Player);
    const [currentQuality, setCurrentQuality] = useState('auto');
    const [subtitleTracks, setSubtitleTracks] = useState<any[]>([]);
    const [selectedSubtitle, setSelectedSubtitle] = useState<any>(null); // null = off
    const [selectedAudio, setSelectedAudio] = useState({ id: 'eng_5.1', label: 'English (Original)', format: '5.1' });

    const playerRef = useRef<any>(null);
    const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const progressRef = useRef(initialProgress);
    const playerContainerRef = useRef<HTMLDivElement>(null);

    // Mock Audio Options
    const AUDIO_OPTIONS = [
        { id: 'eng_5.1', label: 'English (Original)', format: '5.1' },
        { id: 'eng_stereo', label: 'English', format: 'Stereo' },
        { id: 'hin_5.1', label: 'Hindi', format: '5.1' }
    ];

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
        if (playing) {
            event.target.playVideo();
        } else {
            // If not auto-playing, we must clear initialLoad so the poster/controls are visible
            setInitialLoad(false);
        }
        event.target.loadModule('captions');
    };

    const onPlayerStateChange = (event: any) => {
        if (event.data === window.YT.PlayerState.PLAYING) {
            setPlaying(true);
            setIsBuffering(false);
            setInitialLoad(false); // Content has started
            setDuration(event.target.getDuration());
        } else if (event.data === window.YT.PlayerState.PAUSED) {
            setPlaying(false);
            setInitialLoad(false); // Ensure loading screen is gone if paused
        } else if (event.data === window.YT.PlayerState.BUFFERING) {
            setIsBuffering(true);
        } else if (event.data === window.YT.PlayerState.ENDED) {
            setPlaying(false);
        }
    };

    const handleSkip = (seconds: number) => {
        if (isDriveVideo) return;
        if (playerRef.current && playerRef.current.getCurrentTime) {
            const curr = playerRef.current.getCurrentTime();
            playerRef.current.seekTo(curr + seconds, true);
        }
    };

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

    const toggleBoost = () => {
        const newBoost = !isBoosted;
        setIsBoosted(newBoost);
        if (newBoost) {
            setVolume(100);
            if (playerRef.current) playerRef.current.setVolume(100);
        }
    };

    const triggerRipple = (side: 'left' | 'right') => {
        setRippleSides(prev => [...prev, side]);
        setTimeout(() => {
            setRippleSides(prev => prev.filter(s => s !== side));
        }, 500);
    };

    const onPlayerApiChange = () => {
        if (playerRef.current && playerRef.current.getOptions) {
            const options = playerRef.current.getOptions();
            if (options.includes('captions')) {
                const tracks = playerRef.current.getOption('captions', 'tracklist') || [];
                setSubtitleTracks(tracks);
            }
        }
    };

    // Initialize YouTube Player
    useEffect(() => {
        if (!isApiReady || isDriveVideo || playerRef.current || !youtubeVideoId) return;

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
        if (isDriveVideo) return;
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
            incrementWatchTime(currentUser.uid, 10);
        }, 10000);

        return () => clearInterval(heartbeat);
    }, [playing, currentUser?.uid, currentUser?.isGuest]);

    useEffect(() => {
        if (isDriveVideo) return;
        if (!playerRef.current?.setVolume) return;
        if (isMuted) playerRef.current.mute();
        else {
            playerRef.current.unMute();
            playerRef.current.setVolume(volume);
        }
    }, [volume, isMuted, isDriveVideo]);

    // Progress Loop
    useEffect(() => {
        if (isDriveVideo) return;
        const interval = setInterval(() => {
            if (playerRef.current && playing && playerRef.current.getCurrentTime) {
                const curr = playerRef.current.getCurrentTime();
                const dur = playerRef.current.getDuration();
                setCurrentTime(curr);
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
        if (!content || !playerRef.current || !currentUser || currentUser.role !== 'admin') return;
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
                        console.log(`[AutoFix] Updating duration to ${durationStr}`);
                        updateContentDuration(content.id, durationStr)
                            .catch(e => console.error("Duration update failed", e));
                        hasUpdatedDuration.current = true; // Block future updates
                    }
                }
            }
        }, 5000);

        return () => clearTimeout(checkTimer);
    }, [content.id, currentUser?.role, playing]);

    // Save Progress Store
    useEffect(() => {
        if (isDriveVideo || isTrailer) return;
        const saveInterval = setInterval(() => {
            if (duration > 0) updatePlaybackProgress(content.id, progressRef.current, currentTime, duration);
        }, 5000);
        return () => {
            clearInterval(saveInterval);
            if (duration > 0) updatePlaybackProgress(content.id, progressRef.current, currentTime, duration);
        };
    }, [content.id, duration, isDriveVideo, isTrailer]);


    // Controls Visibility Timer
    useEffect(() => {
        const resetTimer = () => {
            setShowControls(true);
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
            controlsTimeoutRef.current = setTimeout(() => {
                if (!showStats && !showAudioSubMenu && !showQualityMenu && playing) setShowControls(false);
            }, 3000);
        };

        window.addEventListener('mousemove', resetTimer);
        window.addEventListener('click', resetTimer);
        resetTimer();

        return () => {
            window.removeEventListener('mousemove', resetTimer);
            window.removeEventListener('click', resetTimer);
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        };
    }, [showStats, showAudioSubMenu, showQualityMenu, playing]);

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
                case 'ArrowUp':
                    e.preventDefault();
                    setVolume(prev => Math.min(100, prev + 5));
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    setVolume(prev => Math.max(0, prev - 5));
                    break;
                case 'KeyF':
                    e.preventDefault();
                    toggleFullscreen();
                    break;
                case 'KeyM':
                    e.preventDefault();
                    setIsMuted(prev => !prev);
                    break;
                case 'Escape':
                    if (isFullscreen) toggleFullscreen();
                    else onClose();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [playing, isFullscreen, isDriveVideo]);


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
        const handleAutoFullscreen = async () => {
            const isMobile = window.innerWidth <= 768;

            // 1. Mobile Auto-Rotate (Existing Logic)
            if (isMobile && content.playMode === 'movie') {
                try {
                    if (!document.fullscreenElement) {
                        await document.documentElement.requestFullscreen();
                        setIsFullscreen(true);
                    }
                    // @ts-ignore
                    if (screen.orientation && screen.orientation.lock) {
                        // @ts-ignore
                        await screen.orientation.lock('landscape');
                    }
                } catch (err) {
                    console.warn("Auto-rotate failed:", err);
                }
            }

            // 2. Desktop/Global Auto-Fullscreen Preference
            else if (currentUser?.autoFullscreen && !document.fullscreenElement) {
                try {
                    await document.documentElement.requestFullscreen();
                    setIsFullscreen(true);
                } catch (err) {
                    console.warn("Auto-fullscreen failed:", err);
                }
            }
        };

        handleAutoFullscreen();

        // Cleanup: Unlock and exit fullscreen on unmount
        return () => {
            const isMobile = window.innerWidth <= 768;
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
            const isFull = !!document.fullscreenElement;
            setIsFullscreen(isFull);
            if (isFull) setShowControls(false);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Gesture State
    const [brightness, setBrightness] = useState(100);
    const touchStartRef = useRef<{ x: number, y: number, time: number } | null>(null);
    const lastTapRef = useRef<{ time: number, x: number } | null>(null);
    const [rippleSides, setRippleSides] = useState<('left' | 'right')[]>([]);

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartRef.current = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
            time: Date.now()
        };
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!touchStartRef.current) return;

        const deltaY = touchStartRef.current.y - e.touches[0].clientY;
        const deltaX = e.touches[0].clientX - touchStartRef.current.x;
        const isLeft = touchStartRef.current.x < window.innerWidth / 2;

        // Vertical Swipe (Volume/Brightness) - Threshold 10px
        if (Math.abs(deltaY) > 10 && Math.abs(deltaY) > Math.abs(deltaX)) {
            const sensitivity = 0.5;
            if (isLeft) {
                // Brightness
                setBrightness(prev => Math.min(100, Math.max(10, prev + (deltaY * sensitivity))));
            } else {
                // Volume
                const newVol = Math.min(100, Math.max(0, volume + (deltaY * sensitivity)));
                setVolume(newVol);
                if (playerRef.current) playerRef.current.setVolume(newVol);
            }
            // Reset reference to avoid jumpiness, but keep "continuous" feel
            touchStartRef.current.y = e.touches[0].clientY;
        }
    };

    const handleTouchEnd = () => {
        touchStartRef.current = null;
    };

    const handleTap = (e: React.MouseEvent) => {
        const now = Date.now();
        const x = e.clientX;

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
            // Single Tap - Toggle Controls
            setShowControls(!showControls);
            lastTapRef.current = { time: now, x };
        }
    };

    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        if (isDriveVideo) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        const newTime = pos * duration;
        setProgress(pos * 100);
        if (playerRef.current) playerRef.current.seekTo(newTime, true);
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
    };

    // Fallback if API doesn't return tracks (common for embeds)
    const effectiveSubtitleTracks = subtitleTracks.length > 0 ? subtitleTracks : [
        { languageCode: 'en', displayName: 'English' },
        { languageCode: 'es', displayName: 'Spanish' },
        { languageCode: 'fr', displayName: 'French' }
    ];

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => { });
            setIsFullscreen(true);
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
                setIsFullscreen(false);
            }
        }
    };

    const formatTime = (time: number) => {
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const isSports = content.genres?.includes('Sports') || content.tags?.includes('Sports');

    return (
        <div
            className={`fixed inset-0 z-[100] bg-black flex flex-col justify-center items-center overflow-hidden font-sans select-none ${!showControls ? 'cursor-none' : ''}`}
        >
            {/* Strict Right-Click Block Overlay 
                - For YouTube: pointer-events 'auto' when controls hidden (blocks all clicks to iframe).
                - For Drive: MUST be 'none' always, otherwise user can't click internal iframe buttons.
            */}

            {/* Player Container */}
            <div className="absolute inset-0 z-0 bg-black pointer-events-none overflow-hidden flex items-center justify-center">
                <div className={`w-full h-full relative transition-transform duration-500 ease-in-out ${isZoomed ? 'scale-[1.35]' : 'scale-100'}`}>
                    {directVideoUrl ? (
                        <div className="w-full h-full relative pointer-events-auto">
                            <iframe
                                className="w-full h-full"
                                src={directVideoUrl}
                                allowFullScreen
                                allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                                sandbox="allow-forms allow-scripts allow-pointer-lock allow-same-origin allow-top-navigation allow-presentation"
                                title={content.title}
                            />
                        </div>
                    ) : isDriveVideo ? (
                        <div className="w-full h-full relative">
                            {/* Mask the top bar (filename) of Google Drive Player */}
                            {driveIdToUse && (
                                <iframe
                                    className="absolute top-[-64px] left-0 w-full h-[calc(100%+64px)] pointer-events-auto"
                                    src={`https://drive.google.com/file/d/${driveIdToUse}/preview`}
                                    allowFullScreen
                                    allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                                    sandbox="allow-forms allow-scripts allow-pointer-lock allow-same-origin allow-top-navigation allow-presentation"
                                    loading="eager"
                                    title="Video Content"
                                ></iframe>
                            )}

                            {/* Fallback Play Button for Large Files */}
                            <div className={`absolute top-4 right-4 z-[60] pointer-events-auto transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
                                <a
                                    href={`https://drive.google.com/file/d/${driveIdToUse}/view`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="bg-black/60 hover:bg-black/80 text-white/80 hover:text-white p-2 rounded-full backdrop-blur-md border border-white/10 flex items-center gap-2 text-xs font-bold transition-all group"
                                    title="Trouble playing? Open in Drive"
                                >
                                    <ExternalLink size={14} />
                                    <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap">Open External</span>
                                </a>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full h-full relative overflow-hidden pointer-events-none">
                            {/* Scale up YouTube to hide top title bar and bottom branding */}
                            <div ref={playerContainerRef} id="youtube-player" className="w-full h-full origin-center pointer-events-none" />
                        </div>
                    )}
                </div>
            </div>

            {/* Loading Overlay */}
            {(initialLoad || isBuffering) && !isDriveVideo && !directVideoUrl && (
                <div className="absolute inset-0 z-[50] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-none transition-opacity duration-300">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-red border-t-transparent mb-6 shadow-[0_0_15px_rgba(229,9,20,0.5)]"></div>
                    <div className="text-white font-bold text-xl tracking-wide animate-pulse">Loading Content...</div>
                    <div className="text-gray-400 text-sm mt-3 font-medium bg-white/10 px-4 py-1.5 rounded-full backdrop-blur-md border border-white/5">
                        Please wait for up to 1 minute
                    </div>
                </div>
            )}

            {/* Data Usage Warning Toast */}
            {showDataWarning && (
                <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[130] animate-in slide-in-from-top-4 fade-in duration-300">
                    <div className="bg-yellow-500/10 backdrop-blur-md border border-yellow-500/20 text-yellow-200 px-6 py-3 rounded-full flex items-center gap-3 shadow-lg max-w-sm text-center">
                        <Wifi size={20} className="text-yellow-400 shrink-0" />
                        <span className="text-sm font-medium">High data usage warning during playback</span>
                    </div>
                </div>
            )}

            {/* Click to Toggle Controls */}
            {!isDriveVideo && !directVideoUrl && <div className="absolute inset-0 z-10" onClick={() => setShowControls(!showControls)}></div>}

            {/* Skip Intro */}
            {!isDriveVideo && showSkipIntro && (
                <button
                    onClick={(e) => { e.stopPropagation(); handleSkip(90); setShowSkipIntro(false); }}
                    className="absolute bottom-24 right-4 md:bottom-32 md:right-12 bg-white text-black px-4 py-2 rounded font-bold text-sm shadow-lg hover:bg-gray-200 z-[120] transition pointer-events-auto animate-in fade-in"
                >
                    Skip Intro
                </button>
            )}

            {/* Stats Panel */}
            {showStats && isSports && (
                <div className="pointer-events-auto z-[120]">
                    <StatsPanel content={content as any} onClose={() => setShowStats(false)} />
                </div>
            )}

            {/* Header - Transparent Floating Pill Style */}
            <div className={`absolute top-0 left-0 w-full p-6 transition-opacity duration-300 pointer-events-none z-[120] ${showControls ? 'opacity-100' : 'opacity-0'}`}>
                <div className="bg-black/40 backdrop-blur-md border border-white/5 inline-flex items-center gap-4 px-6 py-3 rounded-full pointer-events-auto hover:bg-black/60 transition-colors">
                    <button onClick={onClose} className="text-white hover:text-brand-red transition-colors group">
                        <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <div className="h-6 w-px bg-white/10 mx-1"></div>
                    <div className="text-left">
                        <div className="text-white font-bold text-sm md:text-base leading-tight tracking-wide line-clamp-1 max-w-[200px] md:max-w-md">{content.title}</div>
                    </div>
                </div>
            </div>

            {/* Gesture Layer (Mobile Only) */}
            {!isDriveVideo && (
                <div
                    className="absolute inset-0 z-[115]"
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onClick={handleTap}
                >
                    {/* Visual Feedback for Double Tap */}
                    {rippleSides.map((side) => (
                        <div key={side} className={`absolute top-0 bottom-0 ${side === 'left' ? 'left-0' : 'right-0'} w-1/3 flex items-center justify-center pointer-events-none animate-ping opacity-0`}>
                            <div className="bg-white/20 p-4 rounded-full">
                                {side === 'left' ? <RotateCcw size={40} /> : <RotateCw size={40} />}
                            </div>
                        </div>
                    ))}

                    {/* Brightness Overlay (Simulated) */}
                    <div className="absolute inset-0 bg-black pointer-events-none transition-opacity duration-100" style={{ opacity: 1 - (brightness / 100) }} />
                </div>
            )}

            {/* Controls - Floating Glass Bar (Hide for Drive Video and Direct Video) */}
            {!isDriveVideo && !directVideoUrl && (
                <div className={`absolute bottom-0 left-0 right-0 p-4 md:p-8 transition-all duration-500 pointer-events-none z-[120] ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>

                    {/* Main Control Bar */}
                    <div className="bg-[#0f0f0f]/90 backdrop-blur-2xl border border-white/10 rounded-2xl md:rounded-3xl p-4 md:px-6 md:py-5 shadow-2xl pointer-events-auto flex flex-col gap-3 w-full max-w-5xl mx-auto ring-1 ring-white/5">

                        {/* Slider / Timeline */}
                        <div className="w-full flex items-center gap-4 group/timeline">
                            {/* Current Time */}
                            <div className="text-xs font-bold text-gray-400 font-mono w-12 text-right tracking-wider">
                                {formatTime(currentTime)}
                            </div>

                            {/* Progress Bar */}
                            <div className="flex-1 h-1.5 bg-white/10 rounded-full relative cursor-pointer group-hover/timeline:h-2.5 transition-all duration-300 overflow-visible"
                                onClick={handleSeek}>
                                {/* Buffered/Background */}
                                <div className="absolute inset-0 rounded-full overflow-hidden">
                                    <div className="h-full bg-white/5 w-full"></div>
                                </div>
                                {/* Filled Progress */}
                                <div className="h-full bg-gradient-to-r from-brand-red to-red-600 rounded-full relative shadow-[0_0_15px_rgba(229,9,20,0.6)]" style={{ width: `${progress}%` }}>
                                    {/* Handle */}
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md scale-0 group-hover/timeline:scale-125 transition-transform duration-200"></div>
                                </div>
                            </div>

                            {/* Duration */}
                            <div className="text-xs font-bold text-gray-400 font-mono w-12 text-left tracking-wider">
                                {formatTime(duration)}
                            </div>
                        </div>

                        {/* Lower Controls Row */}
                        <div className="flex justify-between items-center mt-1">

                            {/* LEFT: Playback Controls */}
                            <div className="flex items-center gap-3 md:gap-5">
                                <button onClick={(e) => { e.stopPropagation(); setPlaying(!playing); }}
                                    className="text-white hover:text-brand-red hover:bg-white/10 transition-all p-3 rounded-full active:scale-95 group">
                                    {playing ?
                                        <Pause size={28} className="fill-current" /> :
                                        <Play size={28} className="fill-current ml-1" />
                                    }
                                </button>

                                <div className="flex items-center gap-1 text-gray-400">
                                    <button className="hover:text-white hover:bg-white/10 transition p-2 rounded-full" onClick={(e) => { e.stopPropagation(); handleSkip(-10); }} title="-10s">
                                        <RotateCcw size={20} />
                                    </button>
                                    <button className="hover:text-white hover:bg-white/10 transition p-2 rounded-full" onClick={(e) => { e.stopPropagation(); handleSkip(10); }} title="+10s">
                                        <RotateCw size={20} />
                                    </button>
                                </div>

                                {/* Volume Slider */}
                                <div className="hidden md:flex items-center gap-2 group/vol cursor-pointer pl-4 border-l border-white/10 ml-2">
                                    <button onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }} className="text-gray-300 hover:text-white p-2 rounded-full hover:bg-white/10 transition">
                                        {isMuted ? <VolumeX size={22} /> : <Volume2 size={22} />}
                                    </button>
                                    <div className="w-0 overflow-hidden group-hover/vol:w-24 transition-all duration-300 ease-out">
                                        <input type="range" min="0" max="100" value={isMuted ? 0 : volume}
                                            onChange={(e) => setVolume(Number(e.target.value))}
                                            className="h-1 bg-white/20 rounded-full w-20 appearance-none outline-none accent-brand-red cursor-pointer hover:bg-white/30" />
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT: Features */}
                            <div className="flex items-center gap-2 md:gap-3 text-gray-400">
                                {isSports && (
                                    <button onClick={(e) => { e.stopPropagation(); setShowStats(!showStats); }}
                                        className={`hover:text-brand-red transition-all p-2.5 rounded-xl hover:bg-white/5 ${showStats ? 'bg-brand-red/10 text-brand-red md:ring-1 md:ring-brand-red/50' : ''}`} title="Match Stats">
                                        <BarChart2 size={22} />
                                    </button>
                                )}

                                {/* Audio & Subs Button */}
                                <div className="relative">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setShowAudioSubMenu(!showAudioSubMenu); setShowQualityMenu(false); }}
                                        className={`hover:text-white transition-all p-2.5 rounded-xl hover:bg-white/5 ${showAudioSubMenu ? 'bg-white/10 text-white' : ''}`}
                                        title="Audio & Subtitles"
                                    >
                                        <MessageSquare size={22} />
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

                                                {/* Booster */}
                                                <div className="mb-4 px-1">
                                                    <button
                                                        onClick={toggleBoost}
                                                        className={`w-full text-left p-3 rounded-xl border text-xs font-bold flex flex-col gap-2 transition-all ${isBoosted ? 'bg-brand-red/10 border-brand-red text-brand-red shadow-[0_0_15px_rgba(229,9,20,0.15)]' : 'border-white/10 text-gray-400 hover:bg-white/5 hover:border-white/20'}`}
                                                    >
                                                        <div className="flex items-center justify-between w-full">
                                                            <span className="tracking-wide">VOLUME BOOST</span>
                                                            <div className={`w-2 h-2 rounded-full ${isBoosted ? 'bg-brand-red animate-pulse' : 'bg-gray-700'}`} />
                                                        </div>
                                                        <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden">
                                                            <div className={`h-full transition-all duration-300 ${isBoosted ? 'w-full bg-brand-red' : 'w-0'}`} />
                                                        </div>
                                                    </button>
                                                </div>

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

                                {/* Quality Settings */}
                                <div className="relative">
                                    <button onClick={(e) => { e.stopPropagation(); setShowQualityMenu(!showQualityMenu); setShowAudioSubMenu(false); }}
                                        className={`hover:text-white transition-all p-2.5 rounded-xl hover:bg-white/5 ${showQualityMenu ? 'bg-white/10 text-white' : ''}`}
                                        title="Quality & Speed">
                                        <Settings size={22} />
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
                                    className={`hover:text-white transition-all p-2.5 rounded-xl hover:bg-white/5 ${isZoomed ? 'text-brand-red bg-white/5' : ''}`}
                                    title={isZoomed ? "Reset Zoom" : "Fill Screen"}
                                >
                                    {isZoomed ? <Minimize size={22} /> : <Scan size={22} />}
                                </button>

                                {/* Fullscreen */}
                                <button className="hover:text-white hover:bg-white/10 transition p-2.5 rounded-xl" onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}>
                                    {isFullscreen ? <Minimize size={22} /> : <Maximize size={22} />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VideoPlayer;