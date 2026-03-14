import React, { useState, useEffect, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { Content, Section } from '../types';
import { useStore } from '../context/StoreContext';
import ContentRail from './ContentRail';
import Pagination from './Pagination';

interface SearchPageProps {
    onDetails: (item: Content) => void;
}

const ITEMS_PER_PAGE = 24;

const SearchPage: React.FC<SearchPageProps> = ({ onDetails }) => {
    const { content, sections, currentProfile } = useStore();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Content[]>([]);
    const [matchingSections, setMatchingSections] = useState<Section[]>([]);
    const [currentPage, setCurrentPage] = useState(1);

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
                setMatchingSections([]);
                return;
            }

            const lowerQuery = query.toLowerCase();

            // 1. Filter Content
            const filteredContent = content.filter(item =>
                item.title.toLowerCase().includes(lowerQuery) ||
                item.overview?.toLowerCase().includes(lowerQuery) ||
                item.genres?.some(g => g.toLowerCase().includes(lowerQuery)) ||
                item.tags?.some(t => t.toLowerCase().includes(lowerQuery)) // Added Tag search for individual items too
            );
            setResults(filteredContent);
            setCurrentPage(1); // Reset page on new search

            // 2. Filter Sections
            const filteredSections = sections.filter(s =>
                s.enabled && s.title.toLowerCase().includes(lowerQuery)
            );
            setMatchingSections(filteredSections);

        }, 300); // 300ms delay

        return () => clearTimeout(timer);
    }, [query, content, sections]);

    // Helper to resolve items for a section (Duplicated from AppNew for independence)
    const getSectionItems = (section: Section) => {
        let autoItems: Content[] = [];

        if (section.type === 'trending') {
            autoItems = content.filter(c => c.featured || (c.vote_average && c.vote_average > 7.5)).slice(0, 10);
        } else if (section.type === 'genre' && section.genreFilter) {
            autoItems = content.filter(c => c.genres?.includes(section.genreFilter!)).slice(0, 10);
        } else if (section.type === 'originals') {
            autoItems = content.filter(c => c.isOriginal).slice(0, 10);
        } else if (section.type === 'new_movies') {
            autoItems = content.filter(c => c.type === 'movie').slice(0, 10);
        } else if (section.type === 'new_tv') {
            autoItems = content.filter(c => c.type === 'tv').slice(0, 10);
        } else if (section.type === 'tag' && section.tagFilter) {
            autoItems = content.filter(c => c.tags?.includes(section.tagFilter!) || c.genres?.includes(section.tagFilter!)).slice(0, 10);
        } else if (section.type === 'my_list') {
            if (currentProfile?.myList) {
                autoItems = content.filter(c => currentProfile.myList.includes(c.id));
            }
        }

        const manualItems = (section.contentIds || []).map(id => content.find(c => c.id === id)).filter(Boolean) as Content[];

        return [...manualItems, ...autoItems].filter((item, index, self) =>
            index === self.findIndex(t => t.id === item.id)
        );
    };

    return (
        <div className="pt-24 px-4 md:px-12 pb-12 min-h-screen">
            <div className="max-w-6xl mx-auto">
                <div className="relative mb-12">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="h-6 w-6 text-gray-400" />
                    </div>
                    <input
                        id="search-input"
                        type="text"
                        className="block w-full pl-14 pr-12 py-5 bg-[#141414] border border-white/10 rounded-2xl focus:ring-2 focus:ring-brand-red focus:border-transparent text-white placeholder-gray-500 text-xl font-medium transition-all shadow-xl"
                        placeholder="Search for movies, TV shows, genres..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    {query && (
                        <button
                            onClick={() => setQuery('')}
                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-white transition"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    )}
                </div>

                {query ? (
                    <div className="space-y-12">
                        {/* 1. Matching Sections */}
                        {matchingSections.length > 0 && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {matchingSections.map(section => {
                                    const items = getSectionItems(section);
                                    if (items.length === 0) return null;
                                    return (
                                        <div key={section.id} className="bg-white/5 rounded-2xl p-6 border border-white/5">
                                            <div className="mb-2 text-sm text-gray-400 font-bold uppercase tracking-wider">Matching Collection</div>
                                            <ContentRail
                                                title={section.title}
                                                items={items}
                                                onDetails={onDetails}
                                                showRanking={section.showRanking}
                                            />
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        {/* 2. Content Grid */}
                        <div>
                            <h2 className="text-xl text-gray-400 mb-6 flex items-center gap-2">
                                {results.length > 0 ? (
                                    <>Found <span className="text-white font-bold">{results.length}</span> titles matching "<span className="text-white">{query}</span>"</>
                                ) : (
                                    matchingSections.length === 0 && <>No results found for "{query}"</>
                                )}
                            </h2>

                            {(() => {
                                const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
                                const visibleResults = results.slice(startIndex, startIndex + ITEMS_PER_PAGE);
                                const totalPages = Math.ceil(results.length / ITEMS_PER_PAGE);

                                return (
                                    <>
                                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                            {visibleResults.map(item => (
                                                <div key={item.id} onClick={() => onDetails(item)} className="cursor-pointer transition-transform hover:scale-105 relative aspect-[2/3] group rounded-xl overflow-hidden bg-gray-900 border border-white/5">
                                                    <img
                                                        src={item.poster_path_mobile || item.poster_path}
                                                        className="w-full h-full object-cover group-hover:opacity-60 transition-opacity"
                                                        loading="lazy"
                                                        alt={item.title}
                                                    />
                                                    <div className="absolute inset-0 flex flex-col justify-end p-3 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <p className="text-white text-sm font-bold leading-tight">{item.title}</p>
                                                        <p className="text-[10px] text-gray-300 mt-1 capitalize">{item.type} • {item.release_date?.split('-')[0]}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        {totalPages > 1 && (
                                            <Pagination
                                                currentPage={currentPage}
                                                totalPages={totalPages}
                                                onPageChange={(page) => {
                                                    setCurrentPage(page);
                                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                                }}
                                            />
                                        )}
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-32 opacity-50">
                        <Search className="h-20 w-20 text-gray-600 mx-auto mb-6" />
                        <p className="text-gray-400 text-2xl font-medium">Find your next favorite story</p>
                        <p className="text-gray-600 mt-2">Search by title, genre, or check out our collections</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SearchPage;
