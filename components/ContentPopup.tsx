import React, { useState, useEffect, useCallback } from 'react';
import { X, Play, Info, Sparkles } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { Content, PopupConfig } from '../types';
import { getPremiumDescription } from '../utils/premiumDescriptions';

const SESSION_KEY = 'popup_dismissed';

interface ContentPopupProps {
    onPlay: (item: Content, mode: 'movie' | 'trailer') => void;
    onDetails: (item: Content) => void;
}

const ContentPopup: React.FC<ContentPopupProps> = ({ onPlay, onDetails }) => {
    const { settings, content, contentRequests } = useStore();
    const [visible, setVisible] = useState(false);
    const [animateIn, setAnimateIn] = useState(false);
    const [currentMode, setCurrentMode] = useState<PopupConfig['mode']>('latest');

    const popup = settings?.popup;

    // Effectively pick a mode on every mount if set to 'rotating'
    useEffect(() => {
        if (popup?.mode === 'rotating') {
            const pool: PopupConfig['mode'][] = ['latest', 'imdb_top', 'most_watched', 'most_liked', 'demanded'];
            const random = pool[Math.floor(Math.random() * pool.length)];
            setCurrentMode(random);
        } else if (popup?.mode) {
            setCurrentMode(popup.mode);
        }
    }, [popup?.mode]);

    // Resolve which content item to show
    const resolvedContent: Content | null = (() => {
        if (!popup?.enabled || !content || content.length === 0) return null;

        if (currentMode === 'latest') {
            return [...content].sort((a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )[0] ?? null;
        }

        if (currentMode === 'imdb_top') {
            return [...content].sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0))[0] ?? null;
        }

        if (currentMode === 'most_watched') {
            return [...content].sort((a, b) => (b.views || 0) - (a.views || 0))[0] ?? null;
        }

        if (currentMode === 'most_liked') {
            return [...content].sort((a, b) => (b.likes || 0) - (a.likes || 0))[0] ?? null;
        }

        if (currentMode === 'demanded') {
            const counts: Record<string, number> = {};
            for (const req of contentRequests) {
                const key = req.contentTitle.toLowerCase().trim();
                counts[key] = (counts[key] || 0) + 1;
            }
            const sortedKeys = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(e => e[0]);
            for (const key of sortedKeys) {
                const match = content.find(c =>
                    c.title.toLowerCase().includes(key) || key.includes(c.title.toLowerCase())
                );
                if (match) return match;
            }
            return content[0] ?? null;
        }

        if (currentMode === 'custom' && popup.contentId) {
            return content.find(c => c.id === popup.contentId) ?? null;
        }

        return null;
    })();

    useEffect(() => {
        if (!popup?.enabled || !resolvedContent) return;

        // Respect "show once per session"
        if (popup.showOnce !== false) {
            const dismissed = sessionStorage.getItem(SESSION_KEY);
            if (dismissed) return;
        }

        // Delay appearance slightly so page can load
        const timer = setTimeout(() => {
            setVisible(true);
            requestAnimationFrame(() => setAnimateIn(true));
        }, 1200);

        return () => clearTimeout(timer);
    }, [popup?.enabled, popup?.showOnce, resolvedContent?.id]);

    const handleClose = useCallback(() => {
        setAnimateIn(false);
        setTimeout(() => setVisible(false), 300);
        if (popup?.showOnce !== false) {
            sessionStorage.setItem(SESSION_KEY, '1');
        }
    }, [popup?.showOnce]);

    const handlePlay = () => {
        if (!resolvedContent) return;
        handleClose();
        onPlay(resolvedContent, 'movie');
    };

    const handleDetails = () => {
        if (!resolvedContent) return;
        handleClose();
        onDetails(resolvedContent);
    };

    if (!visible || !resolvedContent) return null;

    const badgeLabel =
        currentMode === 'latest' ? '🔥 Just Added'
            : currentMode === 'imdb_top' ? '⭐ IMDb Top Rated'
                : currentMode === 'most_watched' ? '👀 Most Watched'
                    : currentMode === 'most_liked' ? '❤️ Most Liked'
                        : currentMode === 'demanded' ? '🌟 Most Demanded'
                            : '⭐ Featured';

    return (
        <div
            className={`fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 transition-all duration-300 ${animateIn ? 'bg-black/70 backdrop-blur-sm' : 'bg-transparent'}`}
            onClick={handleClose}
        >
            {/* Popup Card */}
            <div
                onClick={e => e.stopPropagation()}
                className={`relative w-full max-w-md bg-[#0f0f0f]/95 backdrop-blur-3xl rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-white/20 ring-1 ring-white/10 transition-all duration-500 ease-out ${animateIn
                    ? 'opacity-100 translate-y-0 scale-100'
                    : 'opacity-0 translate-y-16 scale-90'
                    }`}
            >
                {/* Close button */}
                <button
                    onClick={handleClose}
                    className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-black/50 hover:bg-black/80 text-white transition"
                >
                    <X size={16} />
                </button>

                {/* Backdrop image */}
                <div className="relative h-56 overflow-hidden">
                    <img
                        src={resolvedContent.backdrop_path || resolvedContent.poster_path}
                        className="w-full h-full object-cover scale-105"
                        alt=""
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/50 to-[#0f0f0f]" />
                </div>

                {/* Body */}
                <div className="px-6 pb-6 -mt-20 relative">
                    <div className="flex gap-5 items-end mb-5">
                        {/* Poster */}
                        <div className="relative flex-shrink-0">
                            <div className="absolute -inset-1 bg-gradient-to-b from-brand-red/50 to-transparent rounded-xl blur opacity-70"></div>
                            <img
                                src={resolvedContent.poster_path_mobile || resolvedContent.poster_path}
                                className="relative w-24 h-36 object-cover rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] border border-white/20"
                                alt={resolvedContent.title}
                            />
                        </div>
                        <div className="flex-1 min-w-0 pb-2">
                            {/* Badge */}
                            <div className="text-[10px] font-black uppercase tracking-widest text-brand-red mb-2 flex items-center gap-1.5 drop-shadow-md">
                                <Sparkles size={12} className="animate-pulse" />
                                {badgeLabel}
                            </div>
                            <h3 className="font-black text-2xl leading-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 drop-shadow-lg filter brightness-110">
                                {popup?.title || resolvedContent.title}
                            </h3>
                            {(popup?.subtitle) && (
                                <p className="text-sm text-gray-300 mt-1 leading-snug">{popup.subtitle}</p>
                            )}
                            {!popup?.subtitle && resolvedContent.genres?.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    {resolvedContent.genres.slice(0, 3).map(g => (
                                        <span key={g} className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-white/10 text-gray-300">
                                            {g}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Premium Description snippet */}
                    <div className="relative mb-6 p-4 rounded-2xl bg-gradient-to-br from-white/5 to-transparent border border-white/10 shadow-inner group overflow-hidden">
                        <div className="absolute top-0 left-0 w-[200%] h-px bg-gradient-to-r from-transparent via-brand-red to-transparent opacity-50 group-hover:animate-shimmer transition-all"></div>
                        <p className="text-sm md:text-base font-medium tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-400 leading-relaxed italic text-center drop-shadow-md">
                            "{getPremiumDescription(resolvedContent)}"
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            onClick={handlePlay}
                            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-brand-red to-red-700 hover:from-red-600 hover:to-red-800 text-white font-bold py-3.5 rounded-xl text-sm transition-all active:scale-95 shadow-[0_0_20px_rgba(229,9,20,0.4)] hover:shadow-[0_0_30px_rgba(229,9,20,0.6)] border border-brand-red/50"
                        >
                            <Play size={18} fill="currentColor" />
                            Watch Now
                        </button>
                        <button
                            onClick={handleDetails}
                            className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-bold transition-all active:scale-95 border border-white/10 hover:border-white/30 backdrop-blur-md"
                        >
                            <Info size={18} />
                            Info
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContentPopup;
