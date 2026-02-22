import React, { useState, useEffect } from 'react';
import { ExternalLink, Loader2, X } from 'lucide-react';

interface DrivePlayerProps {
    driveId: string;
    title?: string;
    autoplay?: boolean;
}

/**
 * DrivePlayer - A stable Google Drive streaming component.
 * Uses the official /preview iframe method to avoid 403 errors and range request blocks.
 */
const DrivePlayer: React.FC<DrivePlayerProps> = ({ driveId, title = 'Video Content', autoplay = true }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const [showWarning, setShowWarning] = useState(false);

    // Reset loading state when driveId changes to show consistent loading UI
    useEffect(() => {
        setLoading(true);
        setError(false);
        setShowWarning(false);
    }, [driveId]);

    // Show warning if it has been "loaded" for 10 seconds (could be stuck on Drive's internal spinner)
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

    // Handle iframe load event
    const handleLoad = () => {
        setLoading(false);
    };

    return (
        <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
            {/* 16:9 Responsive Wrapper Case (If parent isn't fixed size, it maintains ratio) */}
            <div className="relative w-full h-full overflow-hidden">

                {/* The Frame: Google Drive Native Player */}
                <iframe
                    key={driveId} // Force remount on ID change for stability
                    className={`absolute inset-0 w-full h-full border-0 transition-opacity duration-700 ${loading ? 'opacity-0' : 'opacity-100'}`}
                    src={`https://drive.google.com/file/d/${driveId}/preview${autoplay ? '?autoplay=1' : ''}`}
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
                            We're having trouble reaching the stream. This can happen if the file is still being processed by Google or if sharing permissions are restricted.
                        </p>
                        <a
                            href={`https://drive.google.com/file/d/${driveId}/view`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-6 py-3 bg-white text-black font-bold rounded-lg hover:bg-white/90 transition-all"
                        >
                            <ExternalLink size={18} />
                            Open Preview in Drive
                        </a>
                    </div>
                )}

                {/* Quick Actions (Floating) */}
                {!loading && (
                    <div className="absolute top-4 right-4 z-40 flex flex-col items-end gap-3">
                        {showWarning && (
                            <div className="bg-[#E50914]/90 text-white px-4 py-3 rounded-xl text-sm font-medium shadow-2xl backdrop-blur-md animate-in slide-in-from-right-4 fade-in max-w-xs text-right ring-1 ring-white/20 relative pr-10">
                                <button
                                    onClick={() => setShowWarning(false)}
                                    className="absolute top-2 right-2 p-1 bg-black/20 hover:bg-black/40 rounded-full text-white/80 hover:text-white transition-colors"
                                >
                                    <X size={14} />
                                </button>
                                <p className="font-bold text-base mb-1">Video stuck loading?</p>
                                <p className="text-white/90 text-xs leading-relaxed">
                                    Your browser's <strong className="text-white">Tracking Prevention</strong> (or Adblocker) might be blocking the player.
                                </p>
                            </div>
                        )}
                        <a
                            href={`https://drive.google.com/file/d/${driveId}/view`}
                            target="_blank"
                            rel="noreferrer"
                            className={`bg-black/60 hover:bg-black/90 text-white/80 hover:text-white p-3 rounded-full backdrop-blur-md border border-white/20 flex items-center gap-2 text-sm font-bold transition-all group shadow-xl ${showWarning ? 'ring-2 ring-[#E50914] text-white animate-pulse' : ''}`}
                            title="External Player"
                        >
                            <ExternalLink size={18} />
                            <span className={`overflow-hidden transition-all duration-300 whitespace-nowrap ${showWarning ? 'max-w-xs px-1' : 'max-w-0 group-hover:max-w-xs group-hover:px-1'}`}>
                                Watch Externally
                            </span>
                        </a>
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
