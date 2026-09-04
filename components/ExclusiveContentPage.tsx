import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Search, Film, KeyRound, Sparkles, ShieldCheck, Home } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { Content } from '../types';
import Pagination from './Pagination';

interface ExclusiveContentPageProps {
    onDetails: (item: Content) => void;
}

const ITEMS_PER_PAGE = 24;

const ExclusiveContentPage: React.FC<ExclusiveContentPageProps> = ({ onDetails }) => {
    const { exclusiveContent, currentProfile, unlockContent, settings } = useStore();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [unlockCode, setUnlockCode] = useState('');
    const [isUnlocking, setIsUnlocking] = useState(false);
    const [error, setError] = useState('');

    const isUnlocked = useMemo(() => {
        return currentProfile?.unlockedContent?.includes('global_unlock');
    }, [currentProfile?.unlockedContent]);

    const filteredContent = useMemo(() => {
        if (!searchQuery.trim()) return exclusiveContent;
        const q = searchQuery.toLowerCase();
        return exclusiveContent.filter(c => c.title.toLowerCase().includes(q));
    }, [exclusiveContent, searchQuery]);

    const paginatedContent = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredContent.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredContent, currentPage]);

    const totalPages = Math.ceil(filteredContent.length / ITEMS_PER_PAGE);

    const handleUnlock = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!unlockCode.trim()) return;

        setIsUnlocking(true);
        setError('');
        try {
            const result = await unlockContent(unlockCode);
            if (!result.success) {
                setError(result.message);
            }
        } catch (err) {
            setError('Failed to verify code. Please try again.');
        } finally {
            setIsUnlocking(false);
        }
    };

    if (!isUnlocked) {
        return (
            <div className="min-h-screen pt-24 pb-12 px-4 flex items-center justify-center relative overflow-hidden bg-black">
                {/* Background Decor */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand-red/20 rounded-full blur-[120px] opacity-20 animate-pulse" />
                <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-purple-600/10 rounded-full blur-[100px]" />
                
                <div className="max-w-md w-full relative z-10 text-center">
                    <div className="mb-8 relative inline-block">
                        <div className="bg-gradient-to-br from-brand-red to-purple-600 p-5 rounded-2xl shadow-[0_0_40px_rgba(229,9,20,0.3)] relative z-10">
                            <Lock size={48} className="text-white" />
                        </div>
                        <div className="absolute -top-2 -right-2 transform rotate-12 bg-yellow-500 text-black p-1.5 rounded-lg shadow-lg z-20">
                            <Sparkles size={16} />
                        </div>
                    </div>

                    <h1 className="text-4xl font-black text-white mb-4 tracking-tight">
                        Exclusive Library
                    </h1>
                    <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                        This section is restricted. Enter your professional access code to reveal our exclusive collection.
                    </p>

                    <form onSubmit={handleUnlock} className="space-y-4">
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-brand-red transition-colors">
                                <KeyRound size={20} />
                            </div>
                            <input
                                type="text"
                                value={unlockCode}
                                onChange={(e) => setUnlockCode(e.target.value)}
                                placeholder="ACCESS CODE"
                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-4 text-center text-xl font-bold tracking-[0.2em] uppercase placeholder:tracking-normal placeholder:font-normal placeholder:text-gray-600 focus:border-brand-red/50 focus:bg-white/10 outline-none transition-all"
                                autoFocus
                            />
                        </div>

                        {error && (
                            <div className="text-brand-red text-sm font-bold bg-brand-red/10 py-2 rounded-lg animate-in fade-in slide-in-from-top-1">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isUnlocking || !unlockCode.trim()}
                            className="w-full bg-white text-black font-black py-4 rounded-xl hover:bg-brand-red hover:text-white transition-all duration-300 disabled:opacity-50 disabled:grayscale transform hover:scale-[1.02] active:scale-95 shadow-xl"
                        >
                            {isUnlocking ? 'VERIFYING...' : 'REVEAL ACCESS'}
                        </button>

                        <button
                            type="button"
                            onClick={() => navigate('/')}
                            className="w-full bg-white/5 border border-white/10 text-gray-400 font-bold py-4 rounded-xl hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-2"
                        >
                            <Home size={18} /> BACK TO HOME
                        </button>
                    </form>

                    <p className="mt-8 text-xs text-gray-500 uppercase tracking-widest font-bold flex items-center justify-center gap-2">
                        <ShieldCheck size={14} /> Encrypted Access Point
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-24 px-4 md:px-12 pb-12 bg-black">
            <div className="max-w-[1920px] mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="bg-brand-red text-white text-[10px] font-black px-2 py-0.5 rounded tracking-tighter uppercase">Exclusive</span>
                            <span className="text-gray-500 text-xs font-bold uppercase tracking-widest">Unlocked</span>
                        </div>
                        <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-3">
                            Exclusive Collection <Sparkles className="text-yellow-500" size={24} />
                        </h1>
                    </div>

                    <div className="relative group max-w-sm w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-brand-red transition-colors" size={18} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search exclusive titles..."
                            autoComplete="off"
                            autoCorrect="off"
                            spellCheck="false"
                            className="w-full bg-white/5 border border-white/10 rounded-full pl-12 pr-4 py-3 text-sm focus:bg-white/10 focus:border-brand-red/50 outline-none transition-all"
                        />
                    </div>
                </div>

                {filteredContent.length > 0 ? (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                            {paginatedContent.map((item) => (
                                <div
                                    key={item.id}
                                    onClick={() => onDetails(item)}
                                    className="group cursor-pointer relative aspect-[2/3] overflow-hidden rounded-xl border border-white/10 hover:border-brand-red/50 transition-all duration-500 hover:scale-105 hover:shadow-[0_20px_40px_rgba(0,0,0,0.8)] shadow-2xl"
                                >
                                    <img
                                        src={item.poster_path_mobile || item.poster_path || undefined}
                                        alt={item.title}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                    />
                                    
                                    {/* Overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-4">
                                        <h3 className="font-bold text-white text-sm mb-1 line-clamp-2 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                                            {item.title}
                                        </h3>
                                        <div className="flex items-center gap-2 overflow-hidden transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 delay-75">
                                            <span className="text-[10px] text-brand-red font-black uppercase whitespace-nowrap">{item.type}</span>
                                            {item.vote_average && (
                                                <span className="text-[10px] text-yellow-500 font-bold">★ {item.vote_average}</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Exclusive Badge */}
                                    <div className="absolute top-2 right-2 bg-brand-red/90 backdrop-blur-md p-1.5 rounded-lg border border-white/20 shadow-lg">
                                        <Lock size={12} className="text-white" />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {totalPages > 1 && (
                            <div className="mt-12 flex justify-center">
                                <Pagination
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    onPageChange={setCurrentPage}
                                />
                            </div>
                        )}
                    </>
                ) : (
                    <div className="py-20 text-center">
                        <div className="bg-white/5 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Film size={32} className="text-gray-600" />
                        </div>
                        <h2 className="text-xl font-bold text-white">No items found</h2>
                        <p className="text-gray-500 mt-1">Try adjusting your search for exclusive content.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExclusiveContentPage;
