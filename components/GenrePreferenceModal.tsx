import React, { useState } from 'react';
import { X, Check, Sparkles, SlidersHorizontal, RotateCcw } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { AVAILABLE_GENRES, normalizeGenre } from '../services/recommendationService';

interface GenrePreferenceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaved?: () => void;
}

const PRESETS: { label: string; genres: string[] }[] = [
    { label: 'Action & Thrills', genres: ['Action', 'Thriller', 'Crime', 'Adventure'] },
    { label: 'Sci-Fi & Fantasy', genres: ['Sci-Fi', 'Fantasy', 'Adventure', 'Mystery'] },
    { label: 'Chill & Laughs', genres: ['Comedy', 'Romance', 'Animation', 'Family'] },
    { label: 'Dark & Gripping', genres: ['Crime', 'Mystery', 'Thriller', 'Horror', 'Drama'] },
    { label: 'Anime & Stories', genres: ['Anime', 'Animation', 'Fantasy', 'Action'] },
];

const GenrePreferenceModal: React.FC<GenrePreferenceModalProps> = ({ isOpen, onClose, onSaved }) => {
    const { currentProfile, currentUser, updateFavoriteGenres } = useStore();

    // Initialize with current profile's or user's favorite genres
    const initialGenres = React.useMemo(() => {
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
    }, [currentProfile?.favoriteGenres, currentUser?.favoriteGenres, isOpen]);

    const [selectedGenres, setSelectedGenres] = useState<string[]>(initialGenres);
    const [isSaving, setIsSaving] = useState(false);

    // Sync if initialGenres changes when modal opens
    React.useEffect(() => {
        if (isOpen) {
            setSelectedGenres(initialGenres);
        }
    }, [isOpen, initialGenres]);

    if (!isOpen) return null;

    const toggleGenre = (genreName: string) => {
        setSelectedGenres(prev => {
            if (prev.includes(genreName)) {
                return prev.filter(g => g !== genreName);
            } else {
                return [...prev, genreName];
            }
        });
    };

    const applyPreset = (presetGenres: string[]) => {
        setSelectedGenres(prev => {
            const set = new Set([...prev, ...presetGenres]);
            return Array.from(set);
        });
    };

    const clearAll = () => {
        setSelectedGenres([]);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateFavoriteGenres(selectedGenres);
            if (onSaved) onSaved();
            onClose();
        } catch (error) {
            console.error('Failed to save genre preferences:', error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div 
                className="relative w-full max-w-2xl bg-[#161616] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 pb-4 border-b border-white/10 flex items-start justify-between bg-gradient-to-b from-white/5 to-transparent">
                    <div className="space-y-1 pr-6">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/30 flex items-center justify-center text-brand-red">
                                <Sparkles size={18} />
                            </div>
                            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                                Customise Your Feed
                            </h2>
                        </div>
                        <p className="text-xs md:text-sm text-gray-400">
                            Select your favourite genres so MY DONKEY can suggest content tailored to your taste.
                        </p>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition"
                        aria-label="Close"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Quick Presets */}
                <div className="px-6 py-3 border-b border-white/5 bg-black/30 flex items-center gap-2 overflow-x-auto no-scrollbar">
                    <span className="text-xs font-semibold text-gray-400 flex items-center gap-1 shrink-0">
                        <SlidersHorizontal size={12} /> Presets:
                    </span>
                    {PRESETS.map((preset) => (
                        <button
                            key={preset.label}
                            onClick={() => applyPreset(preset.genres)}
                            className="px-2.5 py-1 text-xs rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white shrink-0 transition"
                        >
                            + {preset.label}
                        </button>
                    ))}
                </div>

                {/* Genre Grid */}
                <div className="p-6 overflow-y-auto space-y-3 flex-1 custom-scrollbar">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {AVAILABLE_GENRES.map((genre) => {
                            const isSelected = selectedGenres.includes(genre.name);

                            return (
                                <button
                                    key={genre.id}
                                    type="button"
                                    onClick={() => toggleGenre(genre.name)}
                                    className={`relative p-3.5 rounded-xl border text-left transition-all duration-200 group flex flex-col justify-between min-h-[96px] select-none ${
                                        isSelected
                                            ? 'bg-gradient-to-br from-red-950/50 to-zinc-900 border-red-500/80 shadow-[0_0_15px_rgba(229,9,20,0.25)] ring-1 ring-red-500/50'
                                            : 'bg-white/[0.03] border-white/10 hover:border-white/20 hover:bg-white/[0.06]'
                                    }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <span className="text-2xl filter drop-shadow-sm transition-transform group-hover:scale-110">
                                            {genre.emoji}
                                        </span>
                                        <div
                                            className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                                                isSelected
                                                    ? 'bg-red-600 border-red-500 text-white'
                                                    : 'border-white/20 group-hover:border-white/40'
                                            }`}
                                        >
                                            {isSelected && <Check size={12} strokeWidth={3} />}
                                        </div>
                                    </div>

                                    <div>
                                        <div className={`text-sm font-bold tracking-tight ${isSelected ? 'text-white' : 'text-gray-200'}`}>
                                            {genre.name}
                                        </div>
                                        <div className="text-[10px] text-gray-400 line-clamp-1 mt-0.5">
                                            {genre.description}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 px-6 border-t border-white/10 bg-[#121212] flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400">
                            Selected: <strong className="text-white font-semibold">{selectedGenres.length}</strong>
                        </span>
                        {selectedGenres.length > 0 && (
                            <button
                                onClick={clearAll}
                                className="text-xs text-gray-500 hover:text-red-400 flex items-center gap-1 transition"
                            >
                                <RotateCcw size={11} /> Clear
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-semibold text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 rounded-lg transition shadow-lg shadow-red-900/30 active:scale-95 disabled:opacity-50"
                        >
                            {isSaving ? 'Saving...' : 'Save Preferences'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GenrePreferenceModal;
