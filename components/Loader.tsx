import React from 'react';
import { MoviVideo } from './MoviVideo';

interface LoaderProps {
    dataReady?: boolean;
    onComplete?: () => void;
}

const Loader: React.FC<LoaderProps> = ({ dataReady = true, onComplete }) => {
    const videoRef = React.useRef<any>(null);
    const [shouldShowVideo] = React.useState(() => {
        const lastShown = localStorage.getItem('last_app_loader_date');
        return lastShown !== new Date().toDateString();
    });

    React.useEffect(() => {
        if (!shouldShowVideo && dataReady && onComplete) {
            onComplete();
        }
    }, [shouldShowVideo, dataReady, onComplete]);

    const handleVideoEnd = () => {
        // Save today's date so we skip the video next time
        localStorage.setItem('last_app_loader_date', new Date().toDateString());
        
        if (dataReady) {
            if (onComplete) onComplete();
        } else {
            // Data not ready, replay
            if (videoRef.current) {
                videoRef.current.currentTime = 0;
                videoRef.current.play();
            }
        }
    };

    if (!shouldShowVideo) {
        return (
            <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-[#e50914] border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(229,9,20,0.4)]"></div>
                    <div className="text-white/40 text-xs font-bold tracking-[0.2em] uppercase animate-pulse">Loading My Donkey</div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center">
            <MoviVideo
                ref={videoRef}
                src="/mydoneky loader.mp4"
                autoPlay
                muted
                onEnded={handleVideoEnd}
                className="w-24 h-24 object-cover rounded-full pointer-events-none"
            />
        </div>
    );
};

export default Loader;
