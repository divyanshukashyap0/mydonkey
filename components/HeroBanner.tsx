import React, { useState, useEffect, useRef } from 'react';
import { PlayCircle, Info, Volume2, VolumeX } from 'lucide-react';
import { Content } from '../types';
import { useStore } from '../context/StoreContext';

interface HeroBannerProps {
    item: Content;
    onDetails: (item: Content) => void;
    onPlay: (item: Content) => void;
}

const HeroBanner: React.FC<HeroBannerProps> = ({ item, onDetails, onPlay }) => {
    const { settings, currentUser } = useStore();
    const [showVideo, setShowVideo] = useState(false);
    const [videoLoaded, setVideoLoaded] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Detect mobile device
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    // Check if autoplay should be enabled
    // On mobile: disabled by default, unless user explicitly enables it
    // On desktop: enabled by default
    const shouldAutoplay = isMobile
        ? (currentUser?.autoplayEnabled === true)
        : (currentUser?.autoplayEnabled !== false);

    // Reset state on item change
    useEffect(() => {
        if (!item) return;
        setShowVideo(false);
        setVideoLoaded(false);
        setIsMuted(true);

        // Only start autoplay timer if autoplay is enabled
        if (!shouldAutoplay) return;

        const timer = setTimeout(() => {
            setShowVideo(true);
        }, 5000); // 5s delay before trying to show video

        return () => clearTimeout(timer);
    }, [item?.id, shouldAutoplay]);

    useEffect(() => {
        if (!showVideo || !item?.youtubeId) return;

        // Post-message to set quality once loaded (rough approx of onReady)
        const qualityTimer = setTimeout(() => {
            if (iframeRef.current) {
                iframeRef.current.contentWindow?.postMessage(JSON.stringify({
                    event: 'command',
                    func: 'setPlaybackQuality',
                    args: [settings.heroVideoQuality || 'hd1080']
                }), '*');
                setVideoLoaded(true);
            }
        }, 2000); // Give iframe 2s to init

        return () => clearTimeout(qualityTimer);
    }, [showVideo, item?.youtubeId, settings.heroVideoQuality]);

    const handleMuteToggle = () => {
        const newMuteState = !isMuted;
        setIsMuted(newMuteState);
        if (iframeRef.current) {
            iframeRef.current.contentWindow?.postMessage(JSON.stringify({
                event: 'command',
                func: newMuteState ? 'mute' : 'unMute',
                args: []
            }), '*');
        }
    };

    if (!item) return null;
    const isOriginal = item.tags?.includes('Original');

    return (
        <div className="relative w-full overflow-hidden group bg-cinema-black h-[70vh] lg:h-[85vh]">

            {/* Background Layer: Image (Always visible initially, fades out when video ready) */}
            <div className={`absolute inset-0 transition-opacity duration-1000 z-10 ${videoLoaded ? 'opacity-0' : 'opacity-100'} animate-slow-zoom`}>
                <picture>
                    {item.backdrop_path_mobile && <source media="(max-width: 767px)" srcSet={item.backdrop_path_mobile} />}
                    <img src={item.backdrop_path} className="w-full h-full object-cover" alt="Hero Backdrop" />
                </picture>
                <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent" />
            </div>

            {/* Background Layer: Video (Oversized for cinematic fill) */}
            {showVideo && item.youtubeId && (
                <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                    <iframe
                        ref={iframeRef}
                        className={`w-[150%] h-[150%] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-60 transition-opacity duration-1000 ${videoLoaded ? 'opacity-100' : 'opacity-0'}`}
                        src={`https://www.youtube.com/embed/${item.youtubeId}?autoplay=1&mute=1&loop=1&playlist=${item.youtubeId}&controls=0&showinfo=0&rel=0&modestbranding=1&iv_load_policy=3&start=10&enablejsapi=1&origin=${window.location.origin}`}
                        allow="autoplay; encrypted-media"
                        title="Hero Video"
                    />
                </div>
            )}

            {/* Cinematic Gradient Overlays - Reduced center coverage */}
            <div className="absolute inset-0 bg-gradient-to-t from-cinema-black via-cinema-black/30 to-transparent z-20" />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-cinema-black to-transparent z-20" />

            {/* Content Layer - Positioned at BOTTOM to not cover video */}
            <div className="absolute bottom-0 left-0 right-0 z-40 px-6 md:px-12 lg:px-16 pb-6 md:pb-12">
                <div className="max-w-2xl space-y-4">
                    {isOriginal && (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left duration-700">
                            <img src="https://res.cloudinary.com/dpba1gvra/image/upload/v1770155013/logo_mgcysp.png" className="h-5 w-auto object-contain" alt="Logo" />
                            <div className="text-gray-300 text-[10px] font-bold tracking-widest">ORIGINAL</div>
                        </div>
                    )}

                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white leading-none drop-shadow-2xl animate-fade-up">
                        {item.title}
                    </h1>

                    <div className="flex flex-wrap items-center gap-2 md:gap-4 text-white font-medium text-sm md:text-base animate-fade-up delay-100 opacity-0">
                        <span className="text-green-400 font-bold">{(item.vote_average * 10).toFixed(0)}% Match</span>
                        <span>{item.release_date ? item.release_date.split('-')[0] : '2026'}</span>
                        <span className="bg-gray-800 px-2 py-0.5 rounded border border-gray-600 text-xs">{item.rating || 'U/A 13+'}</span>
                        <span className="bg-brand-red/20 text-brand-red border border-brand-red px-2 py-0.5 rounded text-xs">{item.resolution || '4K'}</span>
                    </div>

                    {/* Overview - Hidden on mobile, only visible on desktop */}
                    <p className="hidden md:block text-gray-200 text-base line-clamp-3 drop-shadow-md leading-relaxed animate-fade-up delay-200 opacity-0">
                        {item.overview}
                    </p>

                    <div className="flex gap-3 pt-2 animate-fade-up delay-300 opacity-0">
                        <button
                            onClick={() => onPlay({ ...item, playMode: 'movie' })}
                            className="bg-white text-black px-5 md:px-8 py-2.5 md:py-3 rounded font-bold text-base md:text-lg flex items-center gap-2 hover:bg-gray-200 transition-transform hover:scale-105 active:scale-95"
                        >
                            <PlayCircle size={22} fill="black" /> Play
                        </button>
                        <button
                            onClick={() => onDetails(item)}
                            className="bg-gray-600/40 backdrop-blur-md text-white px-5 md:px-8 py-2.5 md:py-3 rounded font-bold text-base md:text-lg flex items-center gap-2 hover:bg-gray-600/60 transition-transform hover:scale-105 active:scale-95"
                        >
                            <Info size={22} /> More Info
                        </button>
                    </div>
                </div>
            </div>

            {/* Mute Toggle (Only if video is active) */}
            {videoLoaded && (
                <button
                    onClick={handleMuteToggle}
                    className="absolute bottom-24 right-6 md:bottom-32 md:right-12 z-40 bg-black/40 border border-white/20 p-2.5 md:p-3 rounded-full text-white hover:bg-white/10 transition animate-in fade-in"
                >
                    {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
            )}
        </div>
    );
};

export default HeroBanner;
