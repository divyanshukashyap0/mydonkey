import React, { useState, useEffect, useRef } from 'react';
import { PlayCircle, Info, Volume2, VolumeX } from 'lucide-react';
import { Content } from '../types';
import { useStore } from '../context/StoreContext';

import { MessageSquarePlus, Send, X, CheckCircle } from 'lucide-react';

// RequestOverlay removed

interface HeroBannerProps {
    item: Content;
    onDetails: (item: Content) => void;
    onPlay: (item: Content) => void;
}

const HeroBanner: React.FC<HeroBannerProps> = ({ item, onDetails, onPlay }) => {
    const { settings, currentUser } = useStore();
    const [showVideo, setShowVideo] = useState(false);
    const [videoPlaying, setVideoPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const playerRef = useRef<any>(null);

    // Detect mobile device
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    const shouldAutoplay = isMobile
        ? (currentUser?.autoplayEnabled === true)
        : (currentUser?.autoplayEnabled !== false);

    // Reset state on item change
    useEffect(() => {
        if (!item) return;
        setShowVideo(false);
        setVideoPlaying(false);
        setIsMuted(true);
        if (playerRef.current) {
            playerRef.current.destroy();
            playerRef.current = null;
        }

        if (!shouldAutoplay) return;

        const timer = setTimeout(() => {
            setShowVideo(true);
        }, 3000); // reduced delay to 3s for faster start if ready

        return () => clearTimeout(timer);
    }, [item?.id, shouldAutoplay]);

    // Initialize Player when showVideo is true
    useEffect(() => {
        if (!showVideo || !item?.youtubeId) return;

        const initPlayer = () => {
            if (window.YT && window.YT.Player) {
                // Destroy existing if any
                if (playerRef.current) {
                    try { playerRef.current.destroy(); } catch (e) { }
                }

                playerRef.current = new window.YT.Player('hero-player', {
                    host: 'https://www.youtube.com',
                    videoId: item.youtubeId,
                    width: '100%',
                    height: '100%',
                    playerVars: {
                        autoplay: 1,
                        controls: 0,
                        mute: 1,
                        start: 0, // Start from beginning to avoid seeking issues
                        loop: 1,
                        playlist: item.youtubeId,
                        modestbranding: 1,
                        playsinline: 1,
                        rel: 0,
                        iv_load_policy: 3,
                        disablekb: 1,
                        fs: 0,
                        enablejsapi: 1
                    },
                    events: {
                        onReady: (event: any) => {
                            event.target.mute(); // Ensure mute first
                            event.target.playVideo();
                        },
                        onStateChange: (event: any) => {
                            // YT.PlayerState.PLAYING = 1
                            if (event.data === 1) {
                                setVideoPlaying(true);
                            }
                            // Loop manually if needed
                            if (event.data === 0) {
                                event.target.playVideo();
                            }
                        },
                        onError: (e: any) => {
                            console.error('Hero Player Error:', e.data);
                        }
                    }
                });
            }
        };

        if (window.YT && window.YT.Player) {
            initPlayer();
        } else {
            // Retry once if API not ready
            setTimeout(initPlayer, 1000);
        }

        return () => {
            if (playerRef.current) {
                try { playerRef.current.destroy(); } catch (e) { }
            }
        };
    }, [showVideo, item?.youtubeId]);

    const handleMuteToggle = () => {
        const newMuteState = !isMuted;
        setIsMuted(newMuteState);
        if (playerRef.current && playerRef.current.mute) {
            if (newMuteState) playerRef.current.mute();
            else playerRef.current.unMute();
        }
    };

    if (!item) return null;
    const isOriginal = item.tags?.includes('Original');
    const ratingScore = item.vote_average ? item.vote_average.toFixed(1) : '';

    return (
        <div className="relative w-full overflow-hidden group bg-cinema-black h-[70vh] lg:h-[85vh]">

            {/* Background Layer: Image (Always visible initially, fades out when video playing) */}
            {/* Background Layer: Image (Always visible initially, fades out when video playing) */}
            <div className={`absolute inset-0 transition-opacity duration-1000 z-10 ${videoPlaying ? 'opacity-0' : 'opacity-100'}`}>
                {/* Mobile: Poster (Smartphone Image) */}
                <img
                    src={item.poster_path_mobile || item.poster_path}
                    className="w-full h-full object-cover md:hidden"
                    alt="Hero Poster"
                />

                {/* Desktop: Backdrop (Desktop Image) - Full Screen */}
                <img
                    src={item.backdrop_path}
                    className="w-full h-full object-cover hidden md:block"
                    alt="Hero Backdrop"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-cinema-black via-cinema-black/20 to-transparent md:bg-gradient-to-r md:from-black md:via-black/40 md:to-transparent" />
            </div>

            {/* Background Layer: Video (Oversized for cinematic fill) */}
            {showVideo && item.youtubeId && (
                <div className={`absolute inset-0 z-0 overflow-hidden pointer-events-none transition-opacity duration-1000 ${videoPlaying ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="w-[135%] h-[135%] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-60">
                        <div id="hero-player" className="w-full h-full" />
                    </div>
                </div>
            )}

            {/* Cinematic Gradient Overlays - Reduced center coverage */}
            <div className="absolute inset-0 bg-gradient-to-t from-cinema-black via-cinema-black/30 to-transparent z-20" />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-cinema-black to-transparent z-20" />

            {/* Content Layer - Positioned at BOTTOM to not cover video */}
            <div className="absolute bottom-0 left-0 right-0 z-40 px-6 md:px-12 lg:px-16 pb-6 md:pb-12 pointer-events-none">
                <div className="max-w-4xl flex items-end justify-between">
                    <div className="max-w-2xl space-y-4 pointer-events-auto">
                        {isOriginal && (
                            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left duration-700">
                                <img src="https://res.cloudinary.com/dpba1gvra/image/upload/v1770155013/logo_mgcysp.png" className="h-5 w-auto object-contain" alt="Logo" />
                                <div className="text-gray-300 text-[10px] font-bold tracking-widest">ORIGINAL</div>
                            </div>
                        )}

                        <h1
                            className="text-3xl md:text-5xl lg:text-7xl font-black text-white leading-none drop-shadow-2xl animate-fade-up"
                            style={{ fontFamily: 'var(--font-hero)' }}
                        >
                            {item.title}
                        </h1>

                        <div className="flex flex-wrap items-center gap-2 md:gap-4 text-white font-medium text-sm md:text-base animate-fade-up delay-100 opacity-0">
                            {ratingScore && (
                                <span className="text-green-400 font-bold">{ratingScore}/10 Rating</span>
                            )}
                            <span>{item.release_date ? item.release_date.split('-')[0] : ''}</span>
                            <span className="bg-gray-800 px-2 py-0.5 rounded border border-gray-600 text-xs">{item.rating || 'U/A 13+'}</span>
                            <span className="bg-brand-red/20 text-brand-red border border-brand-red px-2 py-0.5 rounded text-xs">{item.resolution || '4K'}</span>
                            {(item.genres || []).slice(0, 3).map(g => (
                                <span key={g} className="text-gray-400 text-sm hidden md:inline">• {g}</span>
                            ))}
                        </div>

                        {/* Overview - Clamped for professional look */}
                        <div className="animate-fade-up delay-200 opacity-0 max-w-xl">
                            <p className="text-gray-200 text-sm md:text-base line-clamp-3 drop-shadow-md leading-relaxed">
                                {item.overview}
                            </p>
                        </div>

                        <div className="flex gap-3 pt-2 animate-fade-up delay-300 opacity-0">
                            <button
                                onClick={() => onPlay({ ...item, playMode: 'movie' })}
                                className="bg-white text-black px-5 md:px-8 py-2.5 md:py-3 rounded-full font-bold text-base md:text-lg flex items-center gap-2 hover:bg-gray-200 transition-transform hover:scale-105 active:scale-95"
                            >
                                <PlayCircle size={22} fill="black" /> Play
                            </button>
                            <button
                                onClick={() => onDetails(item)}
                                className="bg-gray-600/40 backdrop-blur-md text-white px-5 md:px-8 py-2.5 md:py-3 rounded-full font-bold text-base md:text-lg flex items-center gap-2 hover:bg-gray-600/60 transition-transform hover:scale-105 active:scale-95"
                            >
                                <Info size={22} /> More Info
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mute Toggle (Only if video is active) */}
            {videoPlaying && (
                <button
                    onClick={handleMuteToggle}
                    className="absolute bottom-24 right-6 md:bottom-12 md:right-12 z-40 bg-black/40 border border-white/20 p-2.5 md:p-3 rounded-full text-white hover:bg-white/10 transition animate-in fade-in"
                >
                    {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
            )}
        </div>
    );
};

export default HeroBanner;
