import React, { useState, useMemo } from 'react';
import { Lock, Unlock, Search, Film, X, Eye, EyeOff, KeyRound } from 'lucide-react';
import { useStore } from '../../../context/StoreContext';
import { Content } from '../../../types';

// Removed ExclusiveModal for Global Code System

// --- Main Component ---
const ExclusiveContentManager = () => {
    const { rawContent: allContent, updateContent } = useStore();
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'exclusive' | 'free'>('all');
    const [saving, setSaving] = useState<string | null>(null);

    const filtered = useMemo(() => {
        let list = allContent;
        if (filterType === 'exclusive') list = list.filter(c => c.isExclusive);
        if (filterType === 'free') list = list.filter(c => !c.isExclusive);
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(c => c.title.toLowerCase().includes(q));
        }
        return list;
    }, [allContent, search, filterType]);

    // Make Exclusive: 1-click toggle on
    const handleMakeExclusive = async (item: Content) => {
        setSaving(item.id);
        try {
            await updateContent(item.id, { isExclusive: true, accessCode: '' } as any);
        } catch (e) {
            alert('Failed to make exclusive: ' + e);
        } finally {
            setSaving(null);
        }
    };
    // Make Free: clear both isExclusive and accessCode
    const handleMakeFree = async (item: Content) => {
        setSaving(item.id);
        try {
            await updateContent(item.id, { isExclusive: false, accessCode: '' } as any);
        } catch (e) {
            alert('Failed to make free: ' + e);
        } finally {
            setSaving(null);
        }
    };

    const stats = {
        total: allContent.length,
        exclusive: allContent.filter(c => c.isExclusive).length,
        free: allContent.filter(c => !c.isExclusive).length,
    };

    return (
        <div className="space-y-6 animate-in fade-in pb-20">

            {/* Header */}
            <div>
                <h2 className="text-3xl font-bold flex items-center gap-3">
                    <Lock className="text-brand-red" /> Exclusive Content
                </h2>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 mt-4 mb-2 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                    <div>
                        <p className="text-sm">
                            Content marked as <span className="text-brand-red font-bold">Exclusive</span> requires a secret code before playing.
                            <br />
                            <span className="text-gray-400 text-xs">The global access code is configured in <strong className="text-white">Settings &gt; System</strong>.</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-[#141414] border border-white/5 rounded-xl p-4 text-center">
                    <div className="text-2xl font-black text-white">{stats.total}</div>
                    <div className="text-xs text-gray-400 mt-1">Total Content</div>
                </div>
                <div className="bg-[#141414] border border-brand-red/20 rounded-xl p-4 text-center">
                    <div className="text-2xl font-black text-brand-red">{stats.exclusive}</div>
                    <div className="text-xs text-gray-400 mt-1">Exclusive 🔒</div>
                </div>
                <div className="bg-[#141414] border border-green-500/20 rounded-xl p-4 text-center">
                    <div className="text-2xl font-black text-green-400">{stats.free}</div>
                    <div className="text-xs text-gray-400 mt-1">Free Access ✅</div>
                </div>
            </div>

            {/* Search + Filter */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search content..."
                        className="w-full bg-[#141414] border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-sm outline-none focus:border-brand-red/50"
                    />
                </div>
                <div className="flex gap-2">
                    {(['all', 'exclusive', 'free'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilterType(f)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition border ${filterType === f
                                ? 'bg-brand-red border-brand-red text-white'
                                : 'bg-transparent border-white/10 text-gray-400 hover:text-white'
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content List */}
            <div className="space-y-2">
                {filtered.length === 0 && (
                    <div className="text-center py-16 text-gray-500">
                        <Film size={40} className="mx-auto mb-3 opacity-30" />
                        <p>No content found</p>
                    </div>
                )}
                {filtered.map(item => {
                    const isExclusive = !!item.isExclusive;
                    const isSavingThis = saving === item.id;
                    return (
                        <div
                            key={item.id}
                            className="bg-[#1a1a1a] border border-white/5 rounded-xl p-4 flex items-center gap-4 transition hover:bg-white/5"
                        >
                            {/* Poster */}
                            <div className="w-12 h-16 rounded-lg overflow-hidden bg-black/40 flex-shrink-0 relative">
                                {item.poster_path_mobile || item.poster_path ? (
                                    <>
                                        <img
                                            src={item.poster_path_mobile || item.poster_path}
                                            className="w-full h-full object-cover"
                                            alt={item.title}
                                        />
                                        {isExclusive && (
                                            <span className="absolute bottom-0 left-0 text-[10px] bg-red-500/10 text-brand-red px-2 py-0.5 rounded-tr-lg border-t border-r border-red-500/20 flex items-center gap-1 font-mono uppercase font-bold tracking-wider">
                                                <Lock size={10} /> Exclusive
                                            </span>
                                        )}
                                    </>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-600">
                                        <Film size={20} />
                                    </div>
                                )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-white truncate">{item.title}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-gray-500 uppercase font-bold">{item.type}</span>
                                    {item.movieDriveId && <span className="text-xs text-blue-400">● Drive</span>}
                                    {item.videoUrl && <span className="text-xs text-purple-400">● Direct</span>}
                                    {isExclusive && item.accessCode && (
                                        <span className="text-xs text-yellow-400">● Code: {item.accessCode}</span>
                                    )}
                                </div>
                            </div>

                            {/* Status Badge */}
                            <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${isExclusive ? 'bg-brand-red/20 text-brand-red' : 'bg-green-500/10 text-green-400'}`}>
                                {isExclusive ? <Lock size={12} /> : <Unlock size={12} />}
                                {isExclusive ? 'Exclusive' : 'Free'}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                                {isExclusive ? (
                                    <button
                                        onClick={() => handleMakeFree(item)}
                                        disabled={isSavingThis}
                                        className="px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 disabled:opacity-50"
                                    >
                                        {isSavingThis ? <span className="animate-pulse">Saving...</span> : <><Unlock size={14} /> Make Free</>}
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleMakeExclusive(item)}
                                        disabled={isSavingThis}
                                        className="px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 bg-brand-red/10 hover:bg-brand-red/20 text-brand-red border border-brand-red/20 disabled:opacity-50"
                                    >
                                        {isSavingThis ? <span className="animate-pulse">Saving...</span> : <><Lock size={14} /> Make Exclusive</>}
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ExclusiveContentManager;
