import React, { useState, useEffect } from 'react';
import { Content } from '../types';

interface ContentLoaderProps {
    item: Content;
    durationAction: () => void;
    duration?: number;
}

const getMoviePhrases = (title: string) => [
    `Loading high-definition stream for ${title}...`,
    'Preparing the ultimate cinematic experience...',
    'Dimming the virtual lights...',
    'Decrypting secure video channels...',
    'Enhancing Dolby audio spatialization...'
];

const getTVShowPhrases = (title: string) => [
    `Tuning to the next episode of ${title}...`,
    'Recapping previous events...',
    'Loading seasonal metadata...',
    'Configuring continuous playback...',
    'Establishing secure connection to the mainframe...'
];

const getAnimePhrases = (title: string) => [
    `Loading high-definition stream for ${title}...`,
    'Translating subtitle tracks...',
    'Enhancing 2D animation frames...',
    'Synchronizing audio with visual data...',
    'Preparing the ultimate cinematic experience...'
];

const ContentLoader: React.FC<ContentLoaderProps> = ({ item, durationAction, duration = 2.5 }) => {
    const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
    const [phrases, setPhrases] = useState<string[]>([]);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        // Determine phrases based on content type/genre
        let selectedPhrases: string[];
        if (item.genres?.some(g => g.toLowerCase() === 'anime' || g.toLowerCase() === 'animation')) {
            selectedPhrases = getAnimePhrases(item.title);
        } else if (item.type === 'tv') {
            selectedPhrases = getTVShowPhrases(item.title);
        } else {
            selectedPhrases = getMoviePhrases(item.title);
        }

        // Shuffle and pick 3 phrases to show during the load
        const shuffled = selectedPhrases.sort(() => 0.5 - Math.random());
        setPhrases(shuffled.slice(0, 3));
    }, [item]);

    useEffect(() => {
        if (phrases.length === 0) return;

        const phraseIntervalTime = (duration * 1000) / phrases.length;

        const phraseInterval = setInterval(() => {
            setCurrentPhraseIndex(prev => Math.min(prev + 1, phrases.length - 1));
        }, phraseIntervalTime);

        // Progress bar animation
        const startTime = Date.now();
        const updateProgress = () => {
            const elapsed = Date.now() - startTime;
            const percentage = Math.min((elapsed / (duration * 1000)) * 100, 100);
            setProgress(percentage);

            if (percentage < 100) {
                requestAnimationFrame(updateProgress);
            }
        };
        requestAnimationFrame(updateProgress);

        // Final action
        const finalTimeout = setTimeout(() => {
            durationAction();
        }, duration * 1000);

        return () => {
            clearInterval(phraseInterval);
            clearTimeout(finalTimeout);
        };
    }, [duration, durationAction, phrases]);

    if (phrases.length === 0) return null;

    return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center overflow-hidden animate-in fade-in duration-500">
            {/* Blurred Background of the item */}
            <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-110 blur-xl brightness-[0.2]"
                style={{ backgroundImage: `url(${item.backdrop_path || item.poster_path || '/logo.png'})` }}
            />
            {/* Dark gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/60" />

            {/* Content Container */}
            <div className="relative z-10 flex flex-col items-center max-w-2xl px-6 text-center">
                {/* High class spinner (Dual rings) */}
                <div className="relative w-32 h-32 mb-12 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-t-2 border-brand-red animate-spin shadow-[0_0_15px_rgba(229,9,20,0.5)]" style={{ animationDuration: '1.5s' }} />
                    <div className="absolute inset-2 rounded-full border-b-2 border-white/50 animate-spin animate-reverse" style={{ animationDuration: '2s' }} />
                    <div className="absolute inset-4 rounded-full border-r-2 border-brand-red/30 animate-spin" style={{ animationDuration: '3s' }} />

                    {/* Center glowing dot */}
                    <div className="w-2 h-2 rounded-full bg-white shadow-[0_0_10px_white] animate-pulse" />
                </div>

                <h1 className="text-4xl md:text-5xl font-black mb-6 tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent drop-shadow-lg">
                    {item.title}
                </h1>

                {/* Dynamic Text Container with fade-in/out for phrases */}
                <div className="h-8 mb-12 flex items-center justify-center overflow-hidden">
                    {phrases.map((phrase, idx) => (
                        <p
                            key={idx}
                            className={`absolute text-lg md:text-xl text-brand-red font-medium tracking-wide transition-all duration-500 ${currentPhraseIndex === idx
                                    ? 'opacity-100 translate-y-0 scale-100'
                                    : currentPhraseIndex > idx
                                        ? 'opacity-0 -translate-y-4 scale-95'
                                        : 'opacity-0 translate-y-4 scale-95'
                                }`}
                        >
                            {phrase}
                        </p>
                    ))}
                </div>

                {/* Sleek Progress Bar */}
                <div className="w-full max-w-md h-1 bg-white/10 rounded-full overflow-hidden relative">
                    <div
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-brand-red/50 to-brand-red shadow-[0_0_10px_rgba(229,9,20,0.8)] rounded-full transition-all duration-75 ease-linear"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <div className="mt-3 text-xs text-gray-500 font-mono font-bold tracking-widest uppercase">
                    {Math.round(progress)}%
                </div>
            </div>
        </div>
    );
};

export default ContentLoader;
