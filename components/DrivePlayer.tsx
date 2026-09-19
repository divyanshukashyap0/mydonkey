import React, { useState, useEffect } from 'react';
import { ExternalLink, Loader2, X, AlertCircle, RefreshCw } from 'lucide-react';
import { extractDriveId } from '../utils/embedUrl';

interface DrivePlayerProps {
    driveId: string;
    title?: string;
    autoplay?: boolean;
    onLoad?: () => void;
}

/**
 * DrivePlayer - A stable Google Drive streaming component.
 * Uses the official /preview iframe method and provides clear fallbacks
 * if Google Drive blocks framing (due to CSP, restricted permissions, or tracking prevention).
 */
const DrivePlayer: React.FC<DrivePlayerProps> = ({ driveId, title = 'Video Content', autoplay = true, onLoad }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [showWarning, setShowWarning] = useState(false);

    // Always resolve the clean Google Drive file ID
    const cleanId = extractDriveId(driveId) || (!driveId.startsWith('http') ? driveId : '');
    const embedUrl = cleanId
        ? `https://drive.google.com/file/d/${cleanId}/preview?rm=minimal${autoplay ? '&autoplay=1' : ''}`
        : driveId;
    const directViewUrl = cleanId
        ? `https://drive.google.com/file/d/${cleanId}/view`
        : driveId;


    // Reset states when driveId changes
    useEffect(() => {
        setLoading(true);
        setError(false);
        setShowWarning(false);
    }, [driveId]);

    // Show troubleshooting prompt if loading takes longer than 3.5 seconds (e.g. CSP blocked or stuck on Drive spinner)
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        if (loading && !error) {
            timer = setTimeout(() => {
                setShowWarning(true);
            }, 3500);
        }
        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [loading, error]);

    const handleLoad = () => {
        setTimeout(() => {
            setLoading(false);
            onLoad?.();
        }, 1500);
    };

    return (
        <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
            <div className="relative w-full h-full overflow-hidden" style={{ clipPath: 'inset(0px 0px 0px 0px)' }}>

                {/* The Frame: Google Drive Native Player */}
                <iframe
                    key={cleanId || driveId}
                    className={`border-0 transition-opacity duration-700 ${loading ? 'opacity-0' : 'opacity-100'}`}
                    style={{
                        position: 'absolute',
                        top: '-40px',
                        left: '-2px',
                        width: 'calc(100% + 4px)',
                        height: 'calc(100% + 40px)',
                    }}
                    src={embedUrl}
                    sandbox="allow-forms allow-scripts allow-same-origin allow-presentation"
                    allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                    referrerPolicy="no-referrer"
                    loading="eager"
                    title={title}
                    onLoad={handleLoad}
                    onError={() => setError(true)}
                />

                {/* Loading Overlay */}
                {loading && !error && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm px-4 text-center">
                        <div className="relative">
                            <Loader2 className="w-12 h-12 text-[#E50914] animate-spin" />
                            <div className="absolute inset-0 blur-lg bg-[#E50914]/20 animate-pulse rounded-full"></div>
                        </div>
                        <div className="mt-6 flex flex-col items-center gap-2">
                            <p className="text-white font-bold text-lg tracking-wide animate-pulse">Connecting to Google Drive Stream</p>
                            <p className="text-gray-400 text-xs sm:text-sm font-medium px-4 py-1.5 rounded-full bg-white/5 border border-white/10">
                                Optimizing stream playback...
                            </p>
                        </div>

                        {/* Fallback helper if Drive frame is blocked by CSP or slow to load */}
                        {showWarning && (
                            <div className="mt-6 max-w-lg p-4 rounded-xl bg-zinc-900/95 border border-yellow-500/40 text-left animate-in fade-in slide-in-from-bottom-2 duration-300 shadow-2xl">
                                <div className="flex items-start gap-3 mb-3">
                                    <AlertCircle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm text-yellow-200 font-bold">Google Drive Stream Blocked by Security Policy (CSP)?</p>
                                        <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                                            Google Drive prevents embedded iframe playback if this file is set to <strong>Restricted</strong> (requires Google login) or if browser privacy blocks third-party framing.
                                        </p>
                                        <p className="text-[11px] text-amber-300/80 mt-1 font-mono">
                                            Fix: In Google Drive &gt; Share &gt; Change to <strong>"Anyone with the link (Viewer)"</strong>.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10">
                                    {directViewUrl && (
                                        <a
                                            href={directViewUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition shadow-lg shadow-red-900/30"
                                        >
                                            <ExternalLink size={13} /> Open in Google Drive (Direct)
                                        </a>
                                    )}
                                    <button
                                        onClick={() => setLoading(false)}
                                        className="text-[11px] text-gray-400 hover:text-white px-2 py-1 transition ml-auto"
                                    >
                                        Dismiss
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-zinc-950 px-6 text-center">
                        <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
                            <AlertCircle className="w-7 h-7 text-[#E50914]" />
                        </div>
                        <p className="text-white text-xl font-bold mb-2">Stream Playback Restricted</p>
                        <p className="text-gray-400 text-sm max-w-md mb-6 leading-relaxed">
                            Google Drive refused to frame this stream. This typically happens when the file is set to <strong>Restricted</strong> in Google Drive, the 24-hour playback limit is reached, or browser Tracking Prevention blocked authentication.
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-3">
                            <button
                                onClick={() => {
                                    setError(false);
                                    setLoading(true);
                                    setShowWarning(false);
                                }}
                                className="flex items-center gap-2 px-5 py-2.5 bg-[#E50914] text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-all shadow-lg"
                            >
                                <RefreshCw size={15} /> Retry Playback
                            </button>
                            {directViewUrl && (
                                <a
                                    href={directViewUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold rounded-lg transition"
                                >
                                    <ExternalLink size={15} /> Open in Google Drive
                                </a>
                            )}
                        </div>
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
