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
    const { settings } = useStore();
    const [showVideo, setShowVideo] = useState(false);
    const [videoLoaded, setVideoLoaded] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Reset state on item change
    useEffect(() => {
        if (!item) return;
        setShowVideo(false);
        setVideoLoaded(false);
        setIsMuted(true);

        const timer = setTimeout(() => {
            setShowVideo(true);
        }, 5000); // 5s delay before trying to show video

        return () => clearTimeout(timer);
    }, [item?.id]);

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
            <div className={`absolute inset-0 transition-opacity duration-1000 z-10 ${videoLoaded ? 'opacity-0' : 'opacity-100'}`}>
                <img src={item.backdrop_path} className="w-full h-full object-cover" alt="Hero Backdrop" />
                <div className="absolute inset-0 bg-gradient-to-r from-black via-black/20 to-transparent" />
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

            {/* Cinematic Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-cinema-black via-transparent to-transparent z-20" />
            <div className="absolute inset-0 bg-gradient-to-r from-cinema-black via-transparent to-transparent z-20" />

            {/* Content Layer */}
            <div className="absolute inset-0 z-40 flex items-center px-6 md:px-12 lg:px-16">
                <div className="w-full grid grid-cols-1 md:grid-cols-[1.2fr_1fr] items-center gap-12">
                    <div className="space-y-6 pt-20 md:pt-0">
                        {isOriginal && (
                            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left duration-700">
                                <img src="https://res.cloudinary.com/dpba1gvra/image/upload/v1770155013/logo_mgcysp.png" className="h-6 w-auto object-contain" alt="Logo" />
                                <div className="text-gray-300 text-xs font-bold tracking-widest">ORIGINAL</div>
                            </div>
                        )}

                        <h1 className="text-4xl md:text-5xl lg:text-7xl font-black text-white leading-none drop-shadow-2xl animate-in zoom-in-95 duration-1000 origin-left">
                            {item.title}
                        </h1>

                        <div className="flex items-center gap-4 text-white font-medium text-lg">
                            <span className="text-green-400 font-bold">{(item.vote_average * 10).toFixed(0)}% Match</span>
                            <span>{item.release_date ? item.release_date.split('-')[0] : '2024'}</span>
                            <span className="bg-gray-800 px-2 py-0.5 rounded border border-gray-600 text-sm">U/A 13+</span>
                            <span className="bg-brand-red/20 text-brand-red border border-brand-red px-2 py-0.5 rounded text-sm">4K</span>
                        </div>

                        <p className="text-gray-200 text-sm md:text-lg line-clamp-3 drop-shadow-md max-w-xl leading-relaxed">
                            {item.overview}
                        </p>

                        <div className="flex gap-4 pt-4">
                            <button
                                onClick={() => onPlay({ ...item, playMode: 'movie' })}
                                className="bg-white text-black px-6 md:px-8 py-3 rounded font-bold text-lg md:text-xl flex items-center gap-3 hover:bg-gray-200 transition-transform hover:scale-105"
                            >
                                <PlayCircle size={28} fill="black" /> Play
                            </button>
                            <button
                                onClick={() => onDetails(item)}
                                className="bg-gray-600/40 backdrop-blur-md text-white px-6 md:px-8 py-3 rounded font-bold text-lg md:text-xl flex items-center gap-3 hover:bg-gray-600/60 transition-transform hover:scale-105"
                            >
                                <Info size={28} /> More Info
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mute Toggle (Only if video is active) */}
            {videoLoaded && (
                <button
                    onClick={handleMuteToggle}
                    className="absolute bottom-32 right-12 z-40 bg-black/40 border border-white/20 p-3 rounded-full text-white hover:bg-white/10 transition animate-in fade-in hidden md:block"
                >
                    {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
            )}
        </div>
    );
};

export default HeroBanner;
