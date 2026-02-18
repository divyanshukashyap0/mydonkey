import React from 'react';

interface LoaderProps {
    dataReady?: boolean;
    onComplete?: () => void;
}

const Loader: React.FC<LoaderProps> = ({ dataReady = true, onComplete }) => {
    const videoRef = React.useRef<HTMLVideoElement>(null);

    React.useEffect(() => {
        if (dataReady && !onComplete) {
            // Fallback for simple usage without onComplete: just standard behavior
            // But if props are provided, we don't do anything here, we wait for video end.
        }
    }, [dataReady, onComplete]);

    const handleVideoEnd = () => {
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

    return (
        <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center">
            <video
                ref={videoRef}
                src="/mydoneky%20loader.mp4"
                autoPlay
                muted
                playsInline
                onEnded={handleVideoEnd}
                className="w-24 h-24 object-cover rounded-full"
            />
        </div>
    );
};

export default Loader;
