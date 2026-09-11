import React, { useState, useEffect } from 'react';
import { ExternalLink, Loader2, X, Download, AlertCircle, RefreshCw } from 'lucide-react';
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
    const directDownloadUrl = cleanId
        ? `https://drive.google.com/uc?id=${cleanId}&export=download`
        : '';

    // Reset states when driveId changes
    useEffect(() => {
        setLoading(true);
        setError(false);
        setShowWarning(false);
    }, [driveId]);

    // Show troubleshooting prompt if loading takes longer than 8 seconds (e.g. CSP blocked or stuck on Drive spinner)
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        if (loading && !error) {
            timer = setTimeout(() => {
                setShowWarning(true);
            }, 8000);
        }
        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [loading, error]);

    const handleLoad = () => {
        setTimeout(() => {
            setLoading(false);
            onLoad?.();
        }, 2000);
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
                            <div className="mt-6 max-w-md p-4 rounded-xl bg-zinc-900/90 border border-yellow-500/30 text-left animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="flex items-start gap-2.5 mb-3">
                                    <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-xs text-yellow-200 font-semibold">Video taking longer than expected?</p>
                                        <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                                            If Google Drive blocks embedded playback, the file may be set to Restricted access, or browser Tracking Prevention blocked Google cookies.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/10">
                                    {directViewUrl && (
                                        <a
                                            href={directViewUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg transition"
                                        >
                                            <ExternalLink size={13} /> Open in Google Drive
                                        </a>
                                    )}
                                    {directDownloadUrl && (
                                        <a
                                            href={directDownloadUrl}
                                            download
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg transition"
                                        >
                                            <Download size={13} /> Direct Download
                                        </a>
                                    )}
                                    <button
                                        onClick={() => setLoading(false)}
                                        className="text-[11px] text-gray-400 hover:text-white px-2 py-1 transition ml-auto"
                                    >
                                        Dismiss Overlay
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
                            {directDownloadUrl && (
                                <a
                                    href={directDownloadUrl}
                                    download
                                    className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold rounded-lg transition"
                                >
                                    <Download size={15} /> Direct Download
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
