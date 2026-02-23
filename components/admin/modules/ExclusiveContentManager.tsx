import React, { useState, useMemo } from 'react';
import { Lock, Unlock, Search, Film, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react';
import { useStore } from '../../../context/StoreContext';
import { Content } from '../../../types';

const ExclusiveContentManager = () => {
    const { content, updateContent } = useStore();
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'exclusive' | 'free'>('all');
    const [saving, setSaving] = useState<string | null>(null);

    // All content — admin can make any item exclusive (even YouTube)
    const allContent = content;

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

    const toggleExclusive = async (item: Content) => {
        setSaving(item.id);
        try {
            await updateContent(item.id, { isExclusive: !item.isExclusive } as any);
        } catch (e) {
            alert('Failed to update: ' + e);
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
                <p className="text-gray-400 mt-2">
                    Content marked as <span className="text-brand-red font-bold">Exclusive</span> requires a password before playing — for any content type including YouTube.
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-[#141414] border border-white/5 rounded-xl p-4 text-center">
                    <div className="text-2xl font-black text-white">{stats.total}</div>
                    <div className="text-xs text-gray-400 mt-1">Total (Drive/Direct)</div>
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
                    const isExclusive = (item as any).isExclusive;
                    const isSavingThis = saving === item.id;
                    return (
                        <div
                            key={item.id}
                            className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${isExclusive
                                ? 'bg-brand-red/5 border-brand-red/20'
                                : 'bg-[#141414] border-white/5 hover:border-white/10'
                                }`}
                        >
                            {/* Poster */}
                            <div className="w-12 h-16 rounded-lg overflow-hidden bg-black/40 flex-shrink-0">
                                {item.poster_path_mobile || item.poster_path ? (
                                    <img
                                        src={item.poster_path_mobile || item.poster_path}
                                        className="w-full h-full object-cover"
                                        alt={item.title}
                                    />
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
                                </div>
                            </div>

                            {/* Status Badge */}
                            <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${isExclusive ? 'bg-brand-red/20 text-brand-red' : 'bg-green-500/10 text-green-400'}`}>
                                {isExclusive ? <Lock size={12} /> : <Unlock size={12} />}
                                {isExclusive ? 'Exclusive' : 'Free'}
                            </div>

                            {/* Toggle Button */}
                            <button
                                onClick={() => toggleExclusive(item)}
                                disabled={isSavingThis}
                                className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${isExclusive
                                    ? 'bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20'
                                    : 'bg-brand-red/10 hover:bg-brand-red/20 text-brand-red border border-brand-red/20'
                                    } disabled:opacity-50`}
                            >
                                {isSavingThis ? (
                                    <span className="animate-pulse">Saving...</span>
                                ) : isExclusive ? (
                                    <><Unlock size={14} /> Make Free</>
                                ) : (
                                    <><Lock size={14} /> Make Exclusive</>
                                )}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ExclusiveContentManager;
