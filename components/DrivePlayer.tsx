import React, { useState, useEffect } from 'react';
import { ExternalLink, Loader2, X } from 'lucide-react';

interface DrivePlayerProps {
    driveId: string;
    title?: string;
    autoplay?: boolean;
    onLoad?: () => void;
}

/**
 * DrivePlayer - A stable Google Drive streaming component.
 * Uses the official /preview iframe method to avoid 403 errors and range request blocks.
 */
const DrivePlayer: React.FC<DrivePlayerProps> = ({ driveId, title = 'Video Content', autoplay = true, onLoad }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const [showWarning, setShowWarning] = useState(false);

    // Reset loading state when driveId changes to show consistent loading UI
    useEffect(() => {
        setLoading(true);
        setError(false);
        setShowWarning(false);
    }, [driveId]);

    // Show warning if it has been loaded for 10 seconds (could be stuck on Drive's internal spinner)
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        if (!loading && !error) {
            timer = setTimeout(() => {
                setShowWarning(true);
            }, 10000);
        }
        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [loading, error]);

    // Handle iframe load event — delay reveal so Drive's disclaimer screen is hidden behind our overlay
    const handleLoad = () => {
        setTimeout(() => {
            setLoading(false);
            onLoad?.();
        }, 2500);
    };

    return (
        <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
            {/* 16:9 Responsive Wrapper Case (If parent isn't fixed size, it maintains ratio) */}
            <div className="relative w-full h-full overflow-hidden" style={{ clipPath: 'inset(0px 0px 0px 0px)' }}>

                {/* The Frame: Google Drive Native Player */}
                <iframe
                    key={driveId}
                    className={`border-0 transition-opacity duration-700 ${loading ? 'opacity-0' : 'opacity-100'}`}
                    style={{
                        position: 'absolute',
                        top: '-40px',
                        left: '-2px',
                        width: 'calc(100% + 4px)',
                        height: 'calc(100% + 40px)', /* 40px compensates for top -40px, bottom sits precisely at 100% showing native controls */
                    }}
                    src={driveId.includes('http') ? driveId : `https://drive.google.com/file/d/${driveId}/preview?rm=minimal${autoplay ? '&autoplay=1' : ''}`}
                    allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                    referrerPolicy="no-referrer"
                    loading="eager"
                    title={title}
                    onLoad={handleLoad}
                    onError={() => setError(true)}
                />

                {/* Loading Overlay (OTT Style) */}
                {loading && !error && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black backdrop-blur-sm">
                        <div className="relative">
                            <Loader2 className="w-12 h-12 text-[#E50914] animate-spin" />
                            <div className="absolute inset-0 blur-lg bg-[#E50914]/20 animate-pulse rounded-full"></div>
                        </div>
                        <div className="mt-6 flex flex-col items-center gap-2">
                            <p className="text-white font-bold text-lg tracking-wide animate-pulse">Establishing Secure Stream</p>
                            <p className="text-gray-400 text-sm font-medium px-4 py-1.5 rounded-full bg-white/5 border border-white/10">
                                Optimizing for your connection...
                            </p>
                        </div>
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-zinc-900 px-6 text-center">
                        <p className="text-white text-xl font-bold mb-4">Playback Error</p>
                        <p className="text-gray-400 max-w-md mb-8">
                            We're having trouble reaching the stream. This can happen if the file is still being processed or if permissions are restricted.
                        </p>
                        <button
                            onClick={() => {
                                setError(false);
                                setLoading(true);
                                setShowWarning(false);
                            }}
                            className="flex items-center gap-2 px-6 py-3 bg-[#E50914] text-white font-bold rounded-lg hover:bg-red-700 transition-all shadow-lg"
                        >
                            Retry Playback
                        </button>
                    </div>
                )}

                {/* Stuck-loading warning — bottom-left toast, never covers the video on mobile */}
                {showWarning && (
                    <div className="absolute bottom-4 left-3 right-3 md:left-4 md:right-auto md:max-w-xs z-40 bg-[#E50914]/90 text-white px-4 py-3 rounded-xl text-sm font-medium shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-4 fade-in ring-1 ring-white/20 relative pr-10">
                        <button
                            onClick={() => setShowWarning(false)}
                            className="absolute top-2 right-2 p-1 bg-black/20 hover:bg-black/40 rounded-full text-white/80 hover:text-white transition-colors"
                        >
                            <X size={14} />
                        </button>
                        <p className="font-bold text-sm mb-0.5">Video stuck loading?</p>
                        <p className="text-white/90 text-xs leading-relaxed">
                            Your browser's <strong className="text-white">Tracking Prevention</strong> (or Adblocker) might be blocking the player.
                        </p>
                    </div>
                )}
            </div>

            <style>{`
        /* Hide scrollbars inside the component container */
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
        </div>
    );
};

export default DrivePlayer;
