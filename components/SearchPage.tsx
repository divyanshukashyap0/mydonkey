import React, { useState, useEffect, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { Content } from '../types';
import { useStore } from '../context/StoreContext';

interface SearchPageProps {
    onDetails: (item: Content) => void;
}

const SearchPage: React.FC<SearchPageProps> = ({ onDetails }) => {
    const { content } = useStore();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Content[]>([]);

    // Focus input on mount
    useEffect(() => {
        const input = document.getElementById('search-input');
        if (input) input.focus();
    }, []);

    // Debounce Query
    useEffect(() => {
        const timer = setTimeout(() => {
            if (!query.trim()) {
                setResults([]);
                return;
            }

            const lowerQuery = query.toLowerCase();
            const filtered = content.filter(item =>
                item.title.toLowerCase().includes(lowerQuery) ||
                item.overview?.toLowerCase().includes(lowerQuery) ||
                item.genres?.some(g => g.toLowerCase().includes(lowerQuery))
            );
            setResults(filtered);
        }, 300); // 300ms delay

        return () => clearTimeout(timer);
    }, [query, content]);

    return (
        <div className="pt-24 px-4 md:px-12 pb-12 min-h-screen">
            <div className="max-w-4xl mx-auto">
                <div className="relative mb-8">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-6 w-6 text-gray-400" />
                    </div>
                    <input
                        id="search-input"
                        type="text"
                        className="block w-full pl-12 pr-10 py-4 bg-[#1a1a1a] border border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-red focus:border-transparent text-white placeholder-gray-400 text-lg transition-all"
                        placeholder="Search for movies, TV shows, genres..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    {query && (
                        <button
                            onClick={() => setQuery('')}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    )}
                </div>

                {query ? (
                    <>
                        <h2 className="text-xl text-gray-400 mb-6">
                            {results.length > 0 ? `Found ${results.length} results for "${query}"` : `No results found for "${query}"`}
                        </h2>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {results.map(item => (
                                <div key={item.id} onClick={() => onDetails(item)} className="cursor-pointer transition-transform hover:scale-105 relative aspect-[2/3] group">
                                    <img
                                        src={item.poster_path_mobile || item.poster_path}
                                        className="rounded-lg shadow-lg w-full aspect-[2/3] object-cover group-hover:ring-2 group-hover:ring-white/50 transition-all"
                                        loading="lazy"
                                        alt={item.title}
                                    />
                                    <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-b-lg">
                                        <p className="text-white text-sm font-bold truncate">{item.title}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="text-center py-20">
                        <Search className="h-16 w-16 text-gray-700 mx-auto mb-4" />
                        <p className="text-gray-500 text-lg">Type something to start searching</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SearchPage;
