import React, { useState, useEffect, useCallback, useRef } from 'react';

interface LoaderProps {
    dataReady?: boolean;
    onComplete?: () => void;
}

const Loader: React.FC<LoaderProps> = ({ dataReady = true, onComplete }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [shouldShowVideo] = useState(() => {
        try {
            const lastShown = localStorage.getItem('last_app_loader_date');
            return lastShown !== new Date().toDateString();
        } catch (e) {
            return false;
        }
    });

    const finish = useCallback(() => {
        try {
            localStorage.setItem('last_app_loader_date', new Date().toDateString());
        } catch (e) {}
        if (onComplete) onComplete();
    }, [onComplete]);

    // Safety timeout: dismiss after 2 seconds max regardless of video state
    useEffect(() => {
        const timer = setTimeout(() => {
            finish();
        }, 2000);
        return () => clearTimeout(timer);
    }, [finish]);

    useEffect(() => {
        if (!shouldShowVideo && dataReady && onComplete) {
            finish();
        }
    }, [shouldShowVideo, dataReady, finish, onComplete]);

    return (
        <div
            onClick={finish}
            className="fixed inset-0 z-[9999] bg-[#0a0a0a] flex items-center justify-center cursor-pointer select-none transition-opacity duration-300"
        >
            {shouldShowVideo ? (
                <div className="flex flex-col items-center gap-4">
                    <video
                        ref={videoRef}
                        src="/mydoneky loader.mp4"
                        autoPlay
                        muted
                        playsInline
                        onEnded={finish}
                        onError={finish}
                        className="w-28 h-28 object-cover rounded-full pointer-events-none shadow-2xl"
                    />
                    <div className="text-white/40 text-xs font-bold tracking-[0.2em] uppercase animate-pulse">
                        My Donkey
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-[#e50914] border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(229,9,20,0.4)]"></div>
                    <div className="text-white/40 text-xs font-bold tracking-[0.2em] uppercase animate-pulse">Loading My Donkey</div>
                </div>
            )}
        </div>
    );
};

export default Loader;
