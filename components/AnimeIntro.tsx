import React, { useEffect, useState } from 'react';

interface AnimeIntroProps {
    onComplete: () => void;
    mode?: 'enter' | 'exit';
}

const AnimeIntro: React.FC<AnimeIntroProps> = ({ onComplete, mode = 'enter' }) => {
    const [phase, setPhase] = useState<'start' | 'slash' | 'text' | 'exit'>('start');

    useEffect(() => {
        // Timeline
        const t1 = setTimeout(() => setPhase('slash'), 100);
        const t2 = setTimeout(() => setPhase('text'), 600);
        const t3 = setTimeout(() => setPhase('exit'), 2000); // Hold text for a bit
        const t4 = setTimeout(onComplete, 2500); // Complete after exit fade

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
            clearTimeout(t4);
        };
    }, []);

    return (
        <div className={`fixed inset-0 z-[100] bg-black flex items-center justify-center overflow-hidden ${phase === 'exit' ? 'animate-anime-exit' : ''}`}>

            {/* Background Video */}
            <div className="absolute inset-0 z-0">
                <video
                    src="/Anime.mp4"
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover opacity-80 pointer-events-none"
                />
                <div className="absolute inset-0 bg-black/40" />
            </div>

            {/* Phase 1: The Slash */}
            {phase === 'slash' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                    <div className="w-[150%] h-2 bg-white shadow-[0_0_50px_rgba(255,255,255,0.8)] animate-anime-slash" />
                </div>
            )}

            {/* Phase 2: The Text Impact */}
            {(phase === 'text' || phase === 'exit') && (
                <div className="relative z-10 text-center animate-anime-glitch">
                    <h1 className="text-8xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-500 via-white to-pink-500 italic tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] transform -rotate-6">
                        ANIME
                    </h1>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-9xl md:text-[12rem] font-black text-stroke text-transparent opacity-30 blur-sm -z-10 select-none">
                        アニメ
                    </div>
                    <div className="absolute -top-4 -left-4 text-brand-red font-black text-xl tracking-[1em] animate-pulse">
                        {mode === 'exit' ? 'REALITY' : 'WAKE UP'}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnimeIntro;
