import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, limit } from 'firebase/firestore';
import { db } from '../../../firebase';
import { Film, User, Clock, ExternalLink, RefreshCw, Loader2, Search } from 'lucide-react';

interface Contribution {
    id: string;
    contentId: string;
    tmdbId: number;
    imdbId: string;
    title: string;
    poster_path: string;
    type: string;
    addedAt: string;
    addedBy: { userId: string; name: string; email: string; addedAt: string };
}

const ContributionsManager: React.FC = () => {
    const [contributions, setContributions] = useState<Contribution[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');

    const fetchContributions = async () => {
        setIsLoading(true);
        try {
            const q = query(
                collection(db, 'content_contributions'),
                orderBy('addedAt', 'desc'),
                limit(100)
            );
            const snap = await getDocs(q);
            setContributions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Contribution)));
        } catch (e) {
            console.error('Failed to load contributions:', e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchContributions();
    }, []);

    const filtered = contributions.filter(c =>
        !search ||
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.addedBy?.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.addedBy?.email?.toLowerCase().includes(search.toLowerCase()) ||
        c.addedBy?.userId?.includes(search)
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h2 className="text-2xl font-bold text-white">User Contributions</h2>
                    <p className="text-sm text-gray-400 mt-1">All content added by users via Search</p>
                </div>
                <button
                    onClick={fetchContributions}
                    className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                >
                    <RefreshCw size={14} /> Refresh
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <div className="text-2xl font-black text-white">{contributions.length}</div>
                    <div className="text-xs text-gray-400 mt-1">Total Added</div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <div className="text-2xl font-black text-white">
                        {new Set(contributions.map(c => c.addedBy?.userId)).size}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">Unique Contributors</div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <div className="text-2xl font-black text-white">
                        {contributions.filter(c => c.type === 'movie').length}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">Movies Added</div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <div className="text-2xl font-black text-white">
                        {contributions.filter(c => c.type === 'tv').length}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">TV Shows Added</div>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                    type="text"
                    placeholder="Search by title, user name, email or user ID..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-brand-red/50"
                />
            </div>

            {/* Table */}
            {isLoading ? (
                <div className="flex items-center justify-center py-16 text-gray-500">
                    <Loader2 className="animate-spin mr-2" size={20} /> Loading contributions...
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                    <Film size={40} className="mx-auto mb-3 opacity-30" />
                    <p>No contributions found.</p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-white/10">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-white/5 text-xs text-gray-400 uppercase tracking-wider">
                                <th className="px-4 py-3 text-left">Content</th>
                                <th className="px-4 py-3 text-left">Type</th>
                                <th className="px-4 py-3 text-left">Added By</th>
                                <th className="px-4 py-3 text-left">User ID</th>
                                <th className="px-4 py-3 text-left">Date & Time</th>
                                <th className="px-4 py-3 text-left">IMDb / TMDb</th>
                                <th className="px-4 py-3 text-left">Links</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filtered.map(item => (
                                <tr key={item.id} className="hover:bg-white/5 transition">
                                    {/* Content */}
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="flex-shrink-0 w-9 h-12 rounded-md overflow-hidden bg-gray-800">
                                                {item.poster_path ? (
                                                    <img src={item.poster_path} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <Film size={14} className="text-gray-600" />
                                                    </div>
                                                )}
                                            </div>
                                            <span className="font-medium text-white truncate max-w-[160px]">{item.title}</span>
                                        </div>
                                    </td>

                                    {/* Type */}
                                    <td className="px-4 py-3">
                                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${item.type === 'movie' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                                            {item.type}
                                        </span>
                                    </td>

                                    {/* Added By */}
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 bg-gradient-to-br from-brand-red to-red-700 rounded-full flex items-center justify-center flex-shrink-0">
                                                <User size={12} />
                                            </div>
                                            <div>
                                                <div className="font-medium text-white text-xs">{item.addedBy?.name || 'Unknown'}</div>
                                                <div className="text-[10px] text-gray-500 truncate max-w-[140px]">{item.addedBy?.email || 'No email'}</div>
                                            </div>
                                        </div>
                                    </td>

                                    {/* User ID */}
                                    <td className="px-4 py-3">
                                        <span className="text-[10px] text-gray-500 font-mono truncate block max-w-[100px]" title={item.addedBy?.userId}>
                                            {item.addedBy?.userId?.substring(0, 10)}…
                                        </span>
                                    </td>

                                    {/* Date */}
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1 text-[11px] text-gray-400">
                                            <Clock size={10} />
                                            <span>{new Date(item.addedAt).toLocaleString()}</span>
                                        </div>
                                    </td>

                                    {/* IDs */}
                                    <td className="px-4 py-3">
                                        <div className="text-[10px] text-gray-500 space-y-0.5">
                                            <div><span className="text-yellow-500">IMDb:</span> {item.imdbId || 'N/A'}</div>
                                            <div><span className="text-blue-400">TMDb:</span> {item.tmdbId || 'N/A'}</div>
                                        </div>
                                    </td>

                                    {/* Links */}
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            {item.imdbId && (
                                                <a
                                                    href={`https://www.imdb.com/title/${item.imdbId}/`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-yellow-500 hover:text-yellow-400 transition"
                                                    title="Open on IMDb"
                                                >
                                                    <ExternalLink size={14} />
                                                </a>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default ContributionsManager;
