import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Play, AlertCircle, Film, Loader2 } from 'lucide-react';
import { findByIMDbId, tmdbPosterUrl, tmdbBackdropUrl, mapTMDBGenres, TMDBDetail } from '../services/tmdbService';
import { Content } from '../types';
import { useStore } from '../context/StoreContext';
import { buildEmbedUrl } from '../utils/embedUrl';

const IMDbStreamPage: React.FC = () => {
    const { addToWatchHistory, settings } = useStore();
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState<{ detail: TMDBDetail, rawId: string } | null>(null);
    const navigate = useNavigate();

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        const query = inputValue.trim();
        if (!query) return;

        setIsLoading(true);
        setError('');
        setResult(null);

        try {
            // Extract ttXXXXXXX from URL or input
            const match = query.match(/(tt\d+)/);
            if (!match) {
                throw new Error("Invalid IMDb ID or URL. Please provide a link containing 'tt' followed by numbers.");
            }
            const imdbId = match[1];

            const detail = await findByIMDbId(imdbId);
            if (!detail) {
                throw new Error("Could not find a movie or TV show matching this IMDb ID on TMDB.");
            }

            setResult({ detail, rawId: imdbId });
        } catch (err: any) {
            setError(err.message || "An error occurred while searching.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleWatchNow = () => {
        if (!result) return;
        const { detail, rawId } = result;

        const isTv = !!detail.name;
        const streamUrl = buildEmbedUrl(rawId, isTv ? 'tv' : 'movie', settings);
        
        // Construct the mock Content object
        const mockItem: Content = {
            id: `imdb_${rawId}`,
            title: detail.title || detail.name || 'IMDb Stream',
            type: isTv ? 'tv' : 'movie',
            imdbId: rawId,
            videoUrl: streamUrl,
            poster_path: detail.poster_path ? tmdbPosterUrl(detail.poster_path) : '',
            backdrop_path: detail.backdrop_path ? tmdbBackdropUrl(detail.backdrop_path) : '',
            overview: detail.overview || '',
            genres: mapTMDBGenres(detail.genres?.map((g: any) => g.id) || []),
            release_date: detail.release_date || detail.first_air_date || '',
            vote_average: detail.vote_average || 0,
            allowPlayback: true,
            isPublished: true,
            createdAt: new Date().toISOString()
        };

        addToWatchHistory(mockItem).catch(e => console.error("Error saving watch history:", e));
        setTimeout(() => {
            window.location.href = streamUrl;
        }, 100);
    };

    return (
        <div className="min-h-screen pt-24 px-4 md:px-12 pb-12 relative overflow-hidden bg-[#141414]">
            {/* Background elements */}
            <div className="absolute top-0 left-0 w-full h-96 bg-brand-red/10 blur-[100px] rounded-full pointer-events-none -translate-y-1/2" />
            
            <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center">
                <h1 className="text-4xl md:text-5xl font-black mb-4 text-center tracking-tight">
                    Watch Any <span className="text-brand-red">IMDb</span> Title
                </h1>
                <p className="text-gray-400 text-center mb-10 max-w-xl text-lg">
                    Paste an IMDb URL or ID to instantly stream your favorite movie or TV show in high quality.
                </p>

                {/* Search Bar */}
                <form onSubmit={handleSearch} className="w-full max-w-2xl relative mb-12 shadow-2xl">
                    <div className="relative flex items-center bg-black/60 border-2 border-white/10 rounded-full overflow-hidden focus-within:border-brand-red transition-colors backdrop-blur-xl">
                        <Search className="absolute left-6 text-gray-400" size={24} />
                        <input
                            type="text"
                            placeholder="e.g. https://www.imdb.com/title/tt0371746/"
                            className="w-full bg-transparent text-white text-lg px-16 py-4 outline-none placeholder:text-gray-600"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                        />
                        <button
                            type="submit"
                            disabled={isLoading || !inputValue.trim()}
                            className="absolute right-2 bg-brand-red hover:bg-red-700 disabled:opacity-50 disabled:hover:bg-brand-red text-white font-bold py-2.5 px-6 rounded-full transition-all active:scale-95"
                        >
                            {isLoading ? <Loader2 size={24} className="animate-spin" /> : 'Search'}
                        </button>
                    </div>
                    {error && (
                        <div className="absolute top-full left-0 mt-3 flex items-center gap-2 text-red-400 bg-red-400/10 px-4 py-2 rounded-lg border border-red-400/20 w-full animate-in slide-in-from-top-2">
                            <AlertCircle size={18} />
                            <span className="text-sm">{error}</span>
                        </div>
                    )}
                </form>

                {/* Result Card */}
                {result && (
                    <div className="w-full max-w-3xl bg-black/40 border border-white/10 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-8">
                        <div className="flex flex-col md:flex-row">
                            {/* Poster */}
                            <div className="w-full md:w-1/3 aspect-[2/3] relative flex-shrink-0 bg-gray-900">
                                {result.detail.poster_path ? (
                                    <img 
                                        src={tmdbPosterUrl(result.detail.poster_path)} 
                                        alt={result.detail.title || result.detail.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Film size={48} className="text-gray-700" />
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent md:hidden" />
                            </div>

                            {/* Details */}
                            <div className="p-6 md:p-8 flex flex-col justify-center flex-1 relative z-10 -mt-20 md:mt-0">
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {(result.detail.title ? 'MOVIE' : 'TV SHOW') && (
                                        <span className="bg-brand-red text-white text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded">
                                            {result.detail.title ? 'MOVIE' : 'TV SHOW'}
                                        </span>
                                    )}
                                    {result.detail.vote_average > 0 && (
                                        <span className="bg-white/10 text-yellow-400 text-[10px] font-bold px-2 py-1 rounded border border-white/5">
                                            ★ {result.detail.vote_average.toFixed(1)}
                                        </span>
                                    )}
                                    <span className="bg-white/10 text-gray-300 text-[10px] font-bold px-2 py-1 rounded border border-white/5">
                                        {(result.detail.release_date || result.detail.first_air_date || '').slice(0, 4)}
                                    </span>
                                </div>

                                <h2 className="text-3xl md:text-4xl font-black mb-3 text-white leading-tight">
                                    {result.detail.title || result.detail.name}
                                </h2>
                                
                                <p className="text-gray-400 text-sm md:text-base leading-relaxed line-clamp-4 mb-8">
                                    {result.detail.overview || "No overview available."}
                                </p>

                                <button 
                                    onClick={handleWatchNow}
                                    className="flex items-center justify-center gap-3 bg-white text-black font-black text-lg py-4 px-8 rounded-xl hover:bg-gray-200 transition-all hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.3)] w-full md:w-auto mt-auto"
                                >
                                    <Play size={24} className="fill-current" />
                                    WATCH NOW
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default IMDbStreamPage;
