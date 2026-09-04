import React, { useState } from 'react';
import { Sparkles, X, Check, SlidersHorizontal, ChevronRight } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { AVAILABLE_GENRES, normalizeGenre } from '../services/recommendationService';

interface PersonalizeBannerProps {
    onOpenModal: () => void;
}

const POPULAR_GENRES = ['Action', 'Sci-Fi', 'Thriller', 'Comedy', 'Romance', 'Anime', 'Horror', 'Drama', 'Crime', 'Adventure'];

const PersonalizeBanner: React.FC<PersonalizeBannerProps> = ({ onOpenModal }) => {
    const { currentProfile, currentUser, updateFavoriteGenres } = useStore();
    const [isDismissed, setIsDismissed] = useState(() => {
        return localStorage.getItem('my_donkey_dismiss_personalize_banner') === 'true';
    });

    const activeGenres = React.useMemo(() => {
        if (currentProfile?.favoriteGenres && currentProfile.favoriteGenres.length > 0) {
            return currentProfile.favoriteGenres.map(normalizeGenre);
        }
        if (currentUser?.favoriteGenres && currentUser.favoriteGenres.length > 0) {
            return currentUser.favoriteGenres.map(normalizeGenre);
        }
        try {
            const raw = localStorage.getItem('my_donkey_favorite_genres');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) return parsed.map(normalizeGenre);
            }
        } catch (e) {}
        return [];
    }, [currentProfile?.favoriteGenres, currentUser?.favoriteGenres]);

    if (isDismissed) return null;

    const handleToggleGenre = async (genreName: string) => {
        let updated: string[];
        if (activeGenres.includes(genreName)) {
            updated = activeGenres.filter(g => g !== genreName);
        } else {
            updated = [...activeGenres, genreName];
        }
        await updateFavoriteGenres(updated);
    };

    const handleDismiss = () => {
        setIsDismissed(true);
        try {
            localStorage.setItem('my_donkey_dismiss_personalize_banner', 'true');
        } catch (e) {}
    };

    return (
        <div className="relative mx-4 md:mx-12 my-6 p-5 md:p-6 rounded-2xl bg-gradient-to-r from-red-950/40 via-zinc-900/60 to-purple-950/30 border border-white/10 shadow-2xl backdrop-blur-md overflow-hidden">
            {/* Background Glow */}
            <div className="absolute -top-24 -left-24 w-60 h-60 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-60 h-60 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="p-1 rounded-md bg-red-600/30 text-brand-red border border-red-500/30">
                            <Sparkles size={16} />
                        </span>
                        <h3 className="text-base md:text-lg font-bold text-white tracking-tight">
                            Personalise Your Experience
                        </h3>
                        {activeGenres.length > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 border border-emerald-500/30 text-emerald-300">
                                {activeGenres.length} Selected
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-gray-300 max-w-xl">
                        Select your favourite genres below to get custom suggestions and instant recommendations tailored to you.
                    </p>
                </div>

                <div className="flex items-center gap-2 self-end md:self-auto">
                    <button
                        onClick={onOpenModal}
                        className="px-3.5 py-1.5 text-xs font-semibold text-white bg-white/10 hover:bg-white/15 border border-white/10 rounded-lg transition flex items-center gap-1.5 active:scale-95"
                    >
                        <SlidersHorizontal size={13} />
                        <span>All Genres</span>
                        <ChevronRight size={13} className="text-gray-400" />
                    </button>
                    <button
                        onClick={handleDismiss}
                        className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition"
                        title="Dismiss"
                        aria-label="Dismiss banner"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* Quick-tap Genre Chips */}
            <div className="relative z-10 mt-4 flex flex-wrap items-center gap-2">
                {POPULAR_GENRES.map(genreName => {
                    const genreDef = AVAILABLE_GENRES.find(g => g.name === genreName);
                    const isSelected = activeGenres.includes(genreName);

                    return (
                        <button
                            key={genreName}
                            onClick={() => handleToggleGenre(genreName)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-all active:scale-95 ${
                                isSelected
                                    ? 'bg-red-600 text-white shadow-[0_0_12px_rgba(229,9,20,0.4)] border border-red-500'
                                    : 'bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 border border-white/10'
                            }`}
                        >
                            <span>{genreDef?.emoji || '🎬'}</span>
                            <span>{genreName}</span>
                            {isSelected && <Check size={13} strokeWidth={3} />}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default PersonalizeBanner;
