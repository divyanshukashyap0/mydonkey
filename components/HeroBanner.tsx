import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PlayCircle, Info, Volume2, VolumeX, ChevronLeft, ChevronRight } from 'lucide-react';
import { Content } from '../types';
import { useStore } from '../context/StoreContext';

interface HeroBannerProps {
    /** Support both single item (legacy) and multi-item carousel */
    item?: Content;
    items?: Content[];
    onDetails: (item: Content) => void;
    onPlay: (item: Content) => void;
}

const AUTO_ADVANCE_MS = 7000;

const HeroBanner: React.FC<HeroBannerProps> = ({ item, items, onDetails, onPlay }) => {
    const { settings, currentUser } = useStore();

    // Normalise to array
    const slides: Content[] = items && items.length > 0 ? items : (item ? [item] : []);

    const [activeIdx, setActiveIdx] = useState(0);
    const [showVideo, setShowVideo] = useState(false);
    const [videoPlaying, setVideoPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [isPaused, setIsPaused] = useState(false);
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const playerRef = useRef<any>(null);
    const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const shouldAutoplay = isMobile
        ? (currentUser?.autoplayEnabled === true)
        : (currentUser?.autoplayEnabled !== false);

    const currentItem = slides[activeIdx] ?? null;

    // ── Helpers ────────────────────────────────────────────────────────────

    const destroyPlayer = () => {
        if (playerRef.current) {
            try { playerRef.current.destroy(); } catch (_) { }
            playerRef.current = null;
        }
    };

    const resetVideoState = () => {
        setShowVideo(false);
        setVideoPlaying(false);
        setIsMuted(true);
        destroyPlayer();
    };

    const goTo = useCallback((idx: number) => {
        const target = (idx + slides.length) % slides.length;
        setShowVideo(false);
        setVideoPlaying(false);
        setIsMuted(true);
        destroyPlayer();
        setActiveIdx(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [slides.length]);

    const goNext = useCallback(() => goTo(activeIdx + 1), [goTo, activeIdx]);
    const goPrev = useCallback(() => goTo(activeIdx - 1), [goTo, activeIdx]);

    // ── Auto-advance ──────────────────────────────────────────────────────

    useEffect(() => {
        if (slides.length <= 1 || isPaused) return;
        if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
        autoTimerRef.current = setTimeout(goNext, AUTO_ADVANCE_MS);
        return () => { if (autoTimerRef.current) clearTimeout(autoTimerRef.current); };
    }, [activeIdx, isPaused, goNext, slides.length]);

    // ── Trailer autoplay ──────────────────────────────────────────────────

    useEffect(() => {
        if (!currentItem) return;
        resetVideoState();
        if (!shouldAutoplay) return;
        const timer = setTimeout(() => { setShowVideo(true); }, 3000);
        return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeIdx, shouldAutoplay]);

    useEffect(() => {
        if (!showVideo || !currentItem?.youtubeId) return;

        const initPlayer = () => {
            if (window.YT && window.YT.Player) {
                destroyPlayer();
                playerRef.current = new window.YT.Player('hero-player', {
                    host: 'https://www.youtube.com',
                    videoId: currentItem.youtubeId,
                    width: '100%',
                    height: '100%',
                    playerVars: {
                        autoplay: 1, controls: 0, mute: 1, start: 0,
                        loop: 1, playlist: currentItem.youtubeId,
                        modestbranding: 1, playsinline: 1, rel: 0,
                        iv_load_policy: 3, disablekb: 1, fs: 0, enablejsapi: 1,
                    },
                    events: {
                        onReady: (e: any) => { e.target.mute(); e.target.playVideo(); },
                        onStateChange: (e: any) => {
                            if (e.data === 1) setVideoPlaying(true);
                            if (e.data === 0) e.target.playVideo();
                        },
                        onError: (e: any) => console.error('Hero Player Error:', e.data),
                    },
                });
            }
        };

        if (window.YT && window.YT.Player) {
            initPlayer();
        } else {
            setTimeout(initPlayer, 1000);
        }

        return destroyPlayer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showVideo, currentItem?.youtubeId]);

    // ── Touch swipe ────────────────────────────────────────────────────────

    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchStart(e.touches[0].clientX);
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStart === null) return;
        const diff = touchStart - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 50) {
            diff > 0 ? goNext() : goPrev();
        }
        setTouchStart(null);
    };

    // ── Mute toggle ────────────────────────────────────────────────────────

    const handleMuteToggle = () => {
        const next = !isMuted;
        setIsMuted(next);
        if (playerRef.current?.mute) {
            next ? playerRef.current.mute() : playerRef.current.unMute();
        }
    };

    if (!currentItem) return null;

    const isOriginal = currentItem.tags?.includes('Original');
    const ratingScore = currentItem.vote_average ? currentItem.vote_average.toFixed(1) : '';

    return (
        <div
            className="relative w-full overflow-hidden group bg-cinema-black h-[70vh] lg:h-[85vh] select-none"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            {/* ── Slides (stacked, cross-fade) ─────────────────────────── */}
            {slides.map((slide, idx) => (
                <div
                    key={slide.id + idx}
                    className={`absolute inset-0 transition-opacity duration-700 ${idx === activeIdx ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}
                >
                    {/* Mobile poster */}
                    {(slide.poster_path_mobile || slide.poster_path) && (
                        <img
                            src={slide.poster_path_mobile || slide.poster_path}
                            className="w-full h-full object-cover md:hidden"
                            alt={slide.title}
                            loading={idx === 0 ? 'eager' : 'lazy'}
                        />
                    )}
                    {/* Desktop backdrop */}
                    {(slide.backdrop_path || slide.poster_path) && (
                        <img
                            src={slide.backdrop_path || slide.poster_path}
                            className="w-full h-full object-cover hidden md:block"
                            alt={slide.title}
                            loading={idx === 0 ? 'eager' : 'lazy'}
                        />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-cinema-black via-cinema-black/20 to-transparent md:bg-gradient-to-r md:from-black md:via-black/40 md:to-transparent" />
                </div>
            ))}

            {/* ── YouTube player ────────────────────────────────────────── */}
            {showVideo && currentItem.youtubeId && (
                <div className={`absolute inset-0 z-20 overflow-hidden pointer-events-none transition-opacity duration-1000 ${videoPlaying ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="w-[135%] h-[135%] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-60">
                        <div id="hero-player" className="w-full h-full" />
                    </div>
                </div>
            )}

            {/* ── Gradient overlays ─────────────────────────────────────── */}
            <div className="absolute inset-0 bg-gradient-to-t from-cinema-black via-cinema-black/30 to-transparent z-30" />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-cinema-black to-transparent z-30" />

            {/* ── Content overlay ───────────────────────────────────────── */}
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
                            {currentItem.title}
                        </h1>

                        <div className="flex flex-wrap items-center gap-2 md:gap-4 text-white font-medium text-sm md:text-base animate-fade-up delay-100 opacity-0">
                            {ratingScore && (
                                <span className="text-green-400 font-bold">{ratingScore}/10 Rating</span>
                            )}
                            <span>{currentItem.release_date ? currentItem.release_date.split('-')[0] : ''}</span>
                            {currentItem.rating && <span className="bg-gray-800 px-2 py-0.5 rounded border border-gray-600 text-xs">{currentItem.rating}</span>}
                            <span className="bg-brand-red/20 text-brand-red border border-brand-red px-2 py-0.5 rounded text-xs">{currentItem.resolution || '4K'}</span>
                            {(currentItem.genres || []).slice(0, 3).map(g => (
                                <span key={g} className="text-gray-400 text-sm hidden md:inline">• {g}</span>
                            ))}
                        </div>

                        <div className="animate-fade-up delay-200 opacity-0 max-w-xl">
                            <p className="text-gray-200 text-sm md:text-base line-clamp-3 drop-shadow-md leading-relaxed">
                                {currentItem.overview}
                            </p>
                        </div>

                        <div className="flex gap-3 pt-2 animate-fade-up delay-300 opacity-0">
                            <button
                                onClick={() => onPlay({ ...currentItem, playMode: 'movie' })}
                                className="bg-white text-black px-5 md:px-8 py-2.5 md:py-3 rounded-full font-bold text-base md:text-lg flex items-center gap-2 hover:bg-gray-200 transition-transform hover:scale-105 active:scale-95"
                            >
                                <PlayCircle size={22} fill="black" /> Play
                            </button>
                            <button
                                onClick={() => onDetails(currentItem)}
                                className="bg-gray-600/40 backdrop-blur-md text-white px-5 md:px-8 py-2.5 md:py-3 rounded-full font-bold text-base md:text-lg flex items-center gap-2 hover:bg-gray-600/60 transition-transform hover:scale-105 active:scale-95"
                            >
                                <Info size={22} /> More Info
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Arrow navigation ──────────────────────────────────────── */}
            {slides.length > 1 && (
                <>
                    <button
                        onClick={goPrev}
                        aria-label="Previous slide"
                        className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 z-50 bg-black/40 border border-white/20 p-2 md:p-3 rounded-full text-white hover:bg-white/10 transition opacity-0 group-hover:opacity-100 focus:opacity-100 hidden md:flex items-center justify-center"
                    >
                        <ChevronLeft size={22} />
                    </button>
                    <button
                        onClick={goNext}
                        aria-label="Next slide"
                        className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 z-50 bg-black/40 border border-white/20 p-2 md:p-3 rounded-full text-white hover:bg-white/10 transition opacity-0 group-hover:opacity-100 focus:opacity-100 hidden md:flex items-center justify-center"
                    >
                        <ChevronRight size={22} />
                    </button>
                </>
            )}

            {/* ── Dot indicators ────────────────────────────────────────── */}
            {slides.length > 1 && (
                <div className="absolute bottom-4 md:bottom-6 right-6 md:right-16 z-50 flex gap-1.5 items-center">
                    {slides.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => goTo(idx)}
                            aria-label={`Go to slide ${idx + 1}`}
                            className={`rounded-full transition-all duration-300 ${idx === activeIdx
                                ? 'w-6 h-2 bg-white'
                                : 'w-2 h-2 bg-white/40 hover:bg-white/70'
                            }`}
                        />
                    ))}
                </div>
            )}

            {/* ── Progress bar ──────────────────────────────────────────── */}
            {slides.length > 1 && !videoPlaying && !isPaused && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 z-50 bg-white/10">
                    <div
                        key={`prog-${activeIdx}`}
                        className="h-full bg-brand-red origin-left"
                        style={{ animation: `hero-progress ${AUTO_ADVANCE_MS}ms linear forwards` }}
                    />
                </div>
            )}

            {/* ── Mute toggle ───────────────────────────────────────────── */}
            {videoPlaying && (
                <button
                    onClick={handleMuteToggle}
                    className="absolute bottom-24 right-6 md:bottom-12 md:right-12 z-40 bg-black/40 border border-white/20 p-2.5 md:p-3 rounded-full text-white hover:bg-white/10 transition animate-in fade-in"
                >
                    {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
            )}

            {/* ── CSS keyframe for progress bar ─────────────────────────── */}
            <style>{`
                @keyframes hero-progress {
                    from { transform: scaleX(0); }
                    to   { transform: scaleX(1); }
                }
            `}</style>
        </div>
    );
};

export default HeroBanner;
