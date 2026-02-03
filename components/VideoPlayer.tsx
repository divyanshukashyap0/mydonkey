import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Settings, SkipForward, ArrowLeft, RotateCcw, RotateCw, Subtitles, Layers, BarChart2, Minimize, Headphones, Check, MessageSquare } from 'lucide-react';
import { Content } from '../types';
import StatsPanel from './StatsPanel';
import { useStore } from '../context/StoreContext';

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
    const { updatePlaybackProgress, currentUser } = useStore();

    // Determine play mode
    const isMovieMode = content.playMode === 'movie';
    const isDriveVideo = isMovieMode && !!content.movieDriveId;
    const youtubeVideoId = (isMovieMode && content.movieYoutubeId) ? content.movieYoutubeId : content.youtubeId;

    // State
    const [playing, setPlaying] = useState(!currentUser?.lowDataMode); // Autoplay off if Low Data Mode
    const [progress, setProgress] = useState(content.progress || 0); // 0-100
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [showControls, setShowControls] = useState(true);
    const [showSkipIntro, setShowSkipIntro] = useState(false);
    const [showStats, setShowStats] = useState(false);

    // Menus
    const [showAudioSubMenu, setShowAudioSubMenu] = useState(false);
    const [showQualityMenu, setShowQualityMenu] = useState(false);

    const [volume, setVolume] = useState(100);
    const [isMuted, setIsMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Player Options
    const [qualities, setQualities] = useState<string[]>([]);
    const [currentQuality, setCurrentQuality] = useState('auto');
    const [subtitleTracks, setSubtitleTracks] = useState<any[]>([]);
    const [selectedSubtitle, setSelectedSubtitle] = useState<any>(null); // null = off
    const [selectedAudio, setSelectedAudio] = useState({ id: 'eng_5.1', label: 'English (Original)', format: '5.1' });

    const playerRef = useRef<any>(null);
    const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const progressRef = useRef(progress);
    const playerContainerRef = useRef<HTMLDivElement>(null);

    // Mock Audio Options (Since YouTube API doesn't expose audio tracks easily for embeds)
    const AUDIO_OPTIONS = [
        { id: 'eng_5.1', label: 'English (Original)', format: '5.1' },
        { id: 'eng_stereo', label: 'English', format: 'Stereo' },
        { id: 'hin_5.1', label: 'Hindi', format: '5.1' }
    ];

    // Load YouTube API
    useEffect(() => {
        if (isDriveVideo) return; // Skip for Drive

        if (!window.YT) {
            const tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
        }

        const initPlayer = () => {
            if (window.YT && window.YT.Player && playerContainerRef.current) {
                playerRef.current = new window.YT.Player(playerContainerRef.current, {
                    height: '100%',
                    width: '100%',
                    videoId: youtubeVideoId,
                    playerVars: {
                        autoplay: currentUser?.lowDataMode ? 0 : 1, // Disable autoplay for Low Data Mode
                        controls: 0,
                        modestbranding: 1,
                        rel: 0,
                        showinfo: 0,
                        start: Math.floor((content.progress || 0) / 100 * (Number(content.duration) || 3600)),
                        enablejsapi: 1,
                        origin: window.location.origin,
                        cc_load_policy: 0 // We control captions manually
                    },
                    events: {
                        'onReady': onPlayerReady,
                        'onStateChange': onPlayerStateChange,
                        'onApiChange': onPlayerApiChange
                    }
                });
            }
        };

        if (window.YT && window.YT.Player) {
            initPlayer();
        } else {
            window.onYouTubeIframeAPIReady = initPlayer;
        }

        return () => {
            if (playerRef.current) {
                try { playerRef.current.destroy(); } catch (e) { }
            }
        };
    }, [youtubeVideoId, isDriveVideo]);

    const onPlayerReady = (event: any) => {
        setDuration(event.target.getDuration());
        setQualities(event.target.getAvailableQualityLevels());
        event.target.setVolume(volume);

        // Low Data Mode: Set lower quality
        if (currentUser?.lowDataMode) {
            event.target.setPlaybackQuality('small'); // Try forcing lower quality
        }

        if (content.progress) {
            const startTime = (content.progress / 100) * event.target.getDuration();
            event.target.seekTo(startTime, true);
        }

        if (!currentUser?.lowDataMode) {
            event.target.playVideo();
        }

        // Try to load captions module
        event.target.loadModule('captions');
    };

    const onPlayerStateChange = (event: any) => {
        if (event.data === window.YT.PlayerState.PLAYING) {
            setPlaying(true);
            setDuration(event.target.getDuration());
        } else if (event.data === window.YT.PlayerState.PAUSED) {
            setPlaying(false);
        } else if (event.data === window.YT.PlayerState.ENDED) {
            setPlaying(false);
        }
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

    // React -> Player Sync
    useEffect(() => {
        if (isDriveVideo) return;
        if (!playerRef.current?.playVideo) return;
        playing ? playerRef.current.playVideo() : playerRef.current.pauseVideo();
    }, [playing, isDriveVideo]);

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
    }, [playing, isDriveVideo]);

    // Save Progress Store
    useEffect(() => {
        if (isDriveVideo) return;
        const saveInterval = setInterval(() => {
            if (duration > 0) updatePlaybackProgress(content.id, progressRef.current, currentTime, duration);
        }, 5000);
        return () => {
            clearInterval(saveInterval);
            if (duration > 0) updatePlaybackProgress(content.id, progressRef.current, currentTime, duration);
        };
    }, [content.id, duration, isDriveVideo]);


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


    // Handlers
    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        if (isDriveVideo) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        const newTime = pos * duration;
        setProgress(pos * 100);
        if (playerRef.current) playerRef.current.seekTo(newTime, true);
    };

    const handleSkip = (seconds: number) => {
        if (isDriveVideo) return;
        if (playerRef.current) {
            const newTime = playerRef.current.getCurrentTime() + seconds;
            playerRef.current.seekTo(newTime, true);
        }
    };

    const handleQualityChange = (q: string) => {
        if (isDriveVideo) return;
        if (playerRef.current) {
            playerRef.current.setPlaybackQuality(q);
            setCurrentQuality(q);
            setShowQualityMenu(false);
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
    };

    // Fallback if API doesn't return tracks (common for embeds)
    const effectiveSubtitleTracks = subtitleTracks.length > 0 ? subtitleTracks : [
        { languageCode: 'en', displayName: 'English' },
        { languageCode: 'es', displayName: 'Spanish' },
        { languageCode: 'fr', displayName: 'French' }
    ];

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch((e) => console.log(e));
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
        <div className="fixed inset-0 z-[100] bg-black flex flex-col justify-center items-center overflow-hidden font-sans">

            {/* Player Container */}
            <div className="absolute inset-0 z-0 bg-black pointer-events-none">
                {isDriveVideo ? (
                    <iframe
                        className="w-full h-full pointer-events-auto"
                        src={`https://drive.google.com/file/d/${content.movieDriveId}/preview`}
                        allowFullScreen
                    ></iframe>
                ) : (
                    <div ref={playerContainerRef} className="w-full h-full" />
                )}
            </div>

            {/* Click to Toggle Controls */}
            {!isDriveVideo && <div className="absolute inset-0 z-10" onClick={() => setShowControls(!showControls)}></div>}

            {/* Skip Intro */}
            {!isDriveVideo && showSkipIntro && (
                <button
                    onClick={(e) => { e.stopPropagation(); handleSkip(90); setShowSkipIntro(false); }}
                    className="absolute bottom-24 right-4 md:bottom-32 md:right-12 bg-white text-black px-4 py-2 rounded font-bold text-sm shadow-lg hover:bg-gray-200 z-50 transition pointer-events-auto animate-in fade-in"
                >
                    Skip Intro
                </button>
            )}

            {/* Stats Panel */}
            {showStats && isSports && (
                <div className="pointer-events-auto z-50">
                    <StatsPanel content={content as any} onClose={() => setShowStats(false)} />
                </div>
            )}

            {/* Header - Always Show for both Video types (needed for Close button) */}
            <div className={`absolute top-0 left-0 w-full p-6 bg-gradient-to-b from-black/90 to-transparent transition-opacity duration-300 pointer-events-none z-40 ${showControls || isDriveVideo ? 'opacity-100' : 'opacity-0'}`}>
                <button onClick={onClose} className="text-white hover:text-gray-300 flex items-center gap-4 pointer-events-auto group">
                    <ArrowLeft size={36} className="group-hover:-translate-x-1 transition-transform" />
                    <div className="text-left">
                        <div className="font-black text-xl md:text-2xl drop-shadow-md leading-tight uppercase tracking-tight">{content.title}</div>
                        <div className="text-xs text-brand-red font-bold tracking-widest uppercase">Watching Now</div>
                    </div>
                </button>
            </div>

            {/* Controls - Hide for Drive Video */}
            {!isDriveVideo && (
                <div className={`absolute bottom-0 left-0 right-0 px-4 md:px-12 pb-6 pt-32 bg-gradient-to-t from-black via-black/80 to-transparent transition-opacity duration-300 pointer-events-none z-40 ${showControls ? 'opacity-100' : 'opacity-0'}`}>

                    {/* Timeline */}
                    <div className="w-full flex items-center gap-4 mb-4 group/timeline pointer-events-auto">
                        <div className="w-full h-1 bg-gray-700/60 rounded-full relative cursor-pointer group-hover/timeline:h-2 transition-all duration-200 overflow-hidden"
                            onClick={handleSeek}>
                            <div className="h-full bg-brand-red rounded-full relative" style={{ width: `${progress}%` }}></div>
                            {/* Buffered bar could be added here if API supports it */}
                        </div>
                        <div className="text-xs font-bold text-gray-300 whitespace-nowrap tabular-nums font-mono">
                            {formatTime(currentTime)} / {formatTime(duration)}
                        </div>
                    </div>

                    {/* Control Icons */}
                    <div className="flex justify-between items-center pointer-events-auto">
                        {/* Play/Pause/Skip */}
                        <div className="flex items-center gap-6 md:gap-8">
                            <button onClick={(e) => { e.stopPropagation(); setPlaying(!playing); }} className="text-white hover:scale-110 transition">
                                {playing ? <Pause size={32} fill="white" /> : <Play size={32} fill="white" />}
                            </button>
                            <button className="text-white hover:text-white/80 transition" onClick={(e) => { e.stopPropagation(); handleSkip(-10); }}>
                                <RotateCcw size={24} />
                            </button>
                            <button className="text-white hover:text-white/80 transition" onClick={(e) => { e.stopPropagation(); handleSkip(10); }}>
                                <RotateCw size={24} />
                            </button>

                            <div className="hidden md:flex items-center gap-2 group/vol cursor-pointer">
                                <button onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}>
                                    {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
                                </button>
                                <div className="w-0 overflow-hidden group-hover/vol:w-24 transition-all duration-300">
                                    <input type="range" min="0" max="100" value={isMuted ? 0 : volume}
                                        onChange={(e) => setVolume(Number(e.target.value))}
                                        className="h-1 bg-white rounded-full w-full ml-2 appearance-none outline-none accent-brand-red" />
                                </div>
                            </div>
                        </div>

                        {/* Right Side Controls */}
                        <div className="flex items-center gap-4 md:gap-6 text-white/90">
                            {isSports && (
                                <button onClick={(e) => { e.stopPropagation(); setShowStats(!showStats); }}
                                    className={`hover:text-white ${showStats ? 'text-brand-red scale-110' : ''} transition-all`} title="Match Stats">
                                    <BarChart2 size={28} />
                                </button>
                            )}

                            {/* Audio & Subtitles Menu */}
                            <div className="relative">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setShowAudioSubMenu(!showAudioSubMenu); setShowQualityMenu(false); }}
                                    className={`hover:text-white transition ${showAudioSubMenu ? 'text-brand-red' : ''}`}
                                    title="Audio & Subtitles"
                                >
                                    <MessageSquare size={26} />
                                </button>

                                {showAudioSubMenu && (
                                    <div className="absolute bottom-full right-0 mb-4 bg-[#1a1a1a]/95 backdrop-blur-md border border-white/10 rounded-xl p-6 min-w-[400px] flex gap-8 animate-in slide-in-from-bottom-2 shadow-2xl">
                                        {/* Audio Column */}
                                        <div className="flex-1">
                                            <h3 className="text-gray-400 font-bold text-xs uppercase tracking-widest mb-3">Audio</h3>
                                            <div className="space-y-1">
                                                {AUDIO_OPTIONS.map(audi => (
                                                    <button key={audi.id} onClick={() => setSelectedAudio(audi)}
                                                        className={`w-full text-left px-3 py-2 rounded flex justify-between items-center transition ${selectedAudio.id === audi.id ? 'bg-white/10 text-white font-bold' : 'text-gray-300 hover:bg-white/5'}`}>
                                                        <span>{audi.label}</span>
                                                        {selectedAudio.id === audi.id && <Check size={14} className="text-brand-red" />}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Subtitle Column */}
                                        <div className="flex-1 border-l border-white/10 pl-8">
                                            <h3 className="text-gray-400 font-bold text-xs uppercase tracking-widest mb-3">Subtitles</h3>
                                            <div className="space-y-1">
                                                <button onClick={() => handleSubtitleChange(null)}
                                                    className={`w-full text-left px-3 py-2 rounded flex justify-between items-center transition ${!selectedSubtitle ? 'bg-white/10 text-white font-bold' : 'text-gray-300 hover:bg-white/5'}`}>
                                                    <span>Off</span>
                                                    {!selectedSubtitle && <Check size={14} className="text-brand-red" />}
                                                </button>
                                                {effectiveSubtitleTracks.map((sub, idx) => (
                                                    <button key={sub.languageCode || idx} onClick={() => handleSubtitleChange(sub)}
                                                        className={`w-full text-left px-3 py-2 rounded flex justify-between items-center transition ${selectedSubtitle?.languageCode === sub.languageCode ? 'bg-white/10 text-white font-bold' : 'text-gray-300 hover:bg-white/5'}`}>
                                                        <span>{sub.displayName}</span>
                                                        {selectedSubtitle?.languageCode === sub.languageCode && <Check size={14} className="text-brand-red" />}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Quality Menu */}
                            <div className="relative">
                                <button onClick={(e) => { e.stopPropagation(); setShowQualityMenu(!showQualityMenu); setShowAudioSubMenu(false); }} className={`hover:text-white ${showQualityMenu ? 'text-brand-red' : ''}`}>
                                    <Settings size={28} />
                                </button>
                                {showQualityMenu && (
                                    <div className="absolute bottom-full right-0 mb-4 bg-[#1a1a1a]/95 backdrop-blur-md border border-white/10 rounded-lg p-2 min-w-[140px] shadow-xl animate-in slide-in-from-bottom-2">
                                        <h3 className="text-gray-500 font-bold text-[10px] uppercase tracking-widest px-4 py-2">Quality</h3>
                                        {qualities.map(q => (
                                            <button key={q} onClick={() => handleQualityChange(q)}
                                                className={`block w-full text-left px-4 py-2 text-sm hover:bg-white/10 rounded ${currentQuality === q ? 'text-brand-red font-bold' : 'text-gray-300'}`}>
                                                {q.toUpperCase()}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <button className="hover:text-white" onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}>
                                {isFullscreen ? <Minimize size={28} /> : <Maximize size={28} />}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VideoPlayer;