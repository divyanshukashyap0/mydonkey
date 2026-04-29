import React, { useState, useEffect } from 'react';
import { Film, Clock, ExternalLink, Loader2 } from 'lucide-react';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { db } from '../../firebase';

interface Contribution {
    id: string;
    contentId: string;
    tmdbId: number;
    imdbId: string;
    title: string;
    poster_path: string;
    type: string;
    addedAt: string;
    addedBy: { userId: string; name: string; email: string };
}

interface MyContributionsProps {
    userId: string;
}

const MyContributions: React.FC<MyContributionsProps> = ({ userId }) => {
    const [contributions, setContributions] = useState<Contribution[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            try {
                const q = query(
                    collection(db, 'content_contributions'),
                    where('addedBy.userId', '==', userId)
                );
                const snap = await getDocs(q);
                const results = snap.docs.map(d => ({ id: d.id, ...d.data() } as Contribution));
                // Sort by addedAt desc in memory to avoid needing a composite index
                results.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
                setContributions(results.slice(0, 20));
            } catch (e) {
                console.error('Failed to load contributions:', e);
            } finally {
                setIsLoading(false);
            }
        };
        fetch();
    }, [userId]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-10 text-gray-500">
                <Loader2 className="animate-spin mr-2" size={18} /> Loading your additions...
            </div>
        );
    }

    if (contributions.length === 0) {
        return (
            <div className="text-center py-10 text-gray-500">
                <Film size={36} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">You haven't added any content yet.</p>
                <p className="text-xs text-gray-600 mt-1">Search for a movie or show and click on it to add it.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {contributions.map(item => (
                <div key={item.id} className="flex items-center gap-4 bg-white/5 rounded-xl p-3 border border-white/5 hover:border-white/10 transition group">
                    {/* Poster */}
                    <div className="flex-shrink-0 w-12 h-16 rounded-lg overflow-hidden bg-gray-800 shadow">
                        {item.poster_path ? (
                            <img src={item.poster_path} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <Film size={20} className="text-gray-600" />
                            </div>
                        )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white truncate text-sm">{item.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] uppercase font-bold text-brand-red bg-brand-red/10 px-1.5 py-0.5 rounded">{item.type}</span>
                            {item.imdbId && (
                                <span className="text-[10px] text-gray-500">{item.imdbId}</span>
                            )}
                        </div>
                        <div className="flex items-center gap-1 mt-1 text-[11px] text-gray-500">
                            <Clock size={10} />
                            <span>{new Date(item.addedAt).toLocaleString()}</span>
                        </div>
                    </div>

                    {/* External link */}
                    {item.imdbId && (
                        <a
                            href={`https://www.imdb.com/title/${item.imdbId}/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="opacity-0 group-hover:opacity-100 transition text-gray-500 hover:text-white p-1"
                        >
                            <ExternalLink size={14} />
                        </a>
                    )}
                </div>
            ))}
        </div>
    );
};

export default MyContributions;
