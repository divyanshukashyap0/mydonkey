import React, { useEffect, useState } from 'react';
import { BarChart3, Clock, Download, Play, TrendingUp } from 'lucide-react';
import { collection, getDocs, limit, orderBy, query, where, onSnapshot, getAggregateFromServer, sum } from 'firebase/firestore';
import { db } from '../../../firebase';
import { User } from '../../../types';
import { useStore } from '../../../context/StoreContext';

const AnalyticsManager = () => {
    const { content } = useStore();
    const [recentActivity, setRecentActivity] = useState<any[]>([]);
    const [calculatedWatchTime, setCalculatedWatchTime] = useState(0);
    const [activeUsersCount, setActiveUsersCount] = useState(0);
    const [topContentData, setTopContentData] = useState<any[]>([]);
    const [globalHistory, setGlobalHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);

        // 1. Single Real-time Activity Stream (Optimized)
        // We fetch the last 150 logs of ANY type. 
        // - We use the first 20 for the "Recent Activity" feed.
        // - We filter for 'video_play' within these 150 to calculate "Trending Now".
        // This avoids needing a composite index on (action + timestamp) and uses the default timestamp index.
        const qActivity = query(collection(db, 'activity_logs'), orderBy('timestamp', 'desc'), limit(150));

        const unsubActivity = onSnapshot(qActivity, (snap) => {
            const allLogs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

            // 1A. Recent Activity Feed (Limit 20)
            setRecentActivity(allLogs.slice(0, 20));

            // 1B. Top Content (Derived from the same stream - Last 150 actions)
            const popularity: Record<string, number> = {};
            allLogs.forEach((log: any) => {
                if (log.action === 'video_play' && log.details?.contentId) {
                    popularity[log.details.contentId] = (popularity[log.details.contentId] || 0) + 1;
                }
            });

            const sortedContent = Object.entries(popularity)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([id, count]) => {
                    const c = content.find(x => x.id === id);
                    return { title: c?.title || 'Unknown Content', count, poster: c?.poster_path };
                });
            setTopContentData(sortedContent);

            setLoading(false);
        }, (error) => {
            console.error("Activity Stream Error:", error);
            setLoading(false);
        });

        // 2. Optimized KPI Fetching (One-time fetch on mount)
        const fetchStats = async () => {
            try {
                // Active Users (Last 24h)
                const now = new Date();
                const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

                // We use getCountFromServer for cheap counting if possible, but 
                // standard 'where' queries still read index entries (cheaper than documents)
                // However, without a composite index on 'lastActiveAt', this might fail or require an index.
                // Fallback: Fetch metadata only if possible, but Firestore doesn't support "keys only" easily.
                // Optimization: Index 'lastActiveAt'.

                const qActive = query(collection(db, 'users'), where('lastActiveAt', '>', oneDayAgo));
                const activeSnap = await getDocs(qActive); // Still reads docs but only active ones (e.g., 5-10 users)
                setActiveUsersCount(activeSnap.size);

                // Global Watch History (From Active Users only)
                // We reuse the 'activeSnap' from above to build the history list!
                const allActiveUsers = activeSnap.docs.map(d => d.data() as User);
                const historyData: any[] = [];

                allActiveUsers.forEach(u => {
                    if (u.continueWatching && u.continueWatching.length > 0) {
                        u.continueWatching.forEach(cw => {
                            const c = content.find(x => x.id === cw.movieId);
                            if (c) {
                                historyData.push({
                                    userEmail: u.email,
                                    userId: u.uid,
                                    contentTitle: c.title,
                                    poster: c.backdrop_path || c.poster_path,
                                    progress: cw.progress,
                                    duration: cw.duration,
                                    lastWatchedAt: cw.lastWatchedAt,
                                    percent: Math.min(100, Math.round((cw.progress / cw.duration) * 100)) || 0
                                });
                            }
                        });
                    }
                });
                // Sort by last watched
                historyData.sort((a, b) => new Date(b.lastWatchedAt).getTime() - new Date(a.lastWatchedAt).getTime());
                setGlobalHistory(historyData.slice(0, 20));

                // Total Watch Time (Aggregation) 
                // Note: sum() requires an index on 'totalWatchTimeSeconds' usually? 
                // Actually, client-side aggregation on ALL users is what killed the quota. 
                // We will NOT fetch all users. We will just fetch the top 100 active users and sum them for an "Approximation" 
                // or use the server-side aggregation feature if available (Firebase v9.14+).
                // Let's try server-side aggregation.

                const coll = collection(db, 'users');
                const snapshot = await getAggregateFromServer(coll, {
                    totalWatchTime: sum('totalWatchTimeSeconds')
                });

                setCalculatedWatchTime(snapshot.data().totalWatchTime || 0);

            } catch (err) {
                console.error("Stats Fetch Error (Likely Quota):", err);
            }
        };

        fetchStats();

        return () => {
            unsubActivity();
        };
    }, [content]);

    if (loading) return <div className="p-10 text-center animate-pulse">Loading Analytics...</div>;

    return (
        <div className="space-y-8 animate-in fade-in">
            <h2 className="text-3xl font-bold">Platform Analytics</h2>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#141414] p-6 rounded-xl border border-white/5 relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-gray-400 text-sm font-bold uppercase flex items-center gap-2"><Play size={16} /> Total Views (Recent)</p>
                        <p className="text-4xl font-black mt-2 text-white">{recentActivity.filter(a => a.action === 'video_play').length}</p>
                    </div>
                </div>
                <div className="bg-[#141414] p-6 rounded-xl border border-white/5 relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-gray-400 text-sm font-bold uppercase flex items-center gap-2"><Clock size={16} /> Total Watch Time (Global)</p>
                        <p className="text-4xl font-black mt-2 text-white">{(calculatedWatchTime / 60).toFixed(0)} <span className="text-lg text-gray-500 font-normal">mins</span></p>
                    </div>
                </div>
                <div className="bg-[#141414] p-6 rounded-xl border border-white/5 relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-gray-400 text-sm font-bold uppercase flex items-center gap-2"><TrendingUp size={16} /> Active Users (24h)</p>
                        <p className="text-4xl font-black mt-2 text-white">{activeUsersCount}</p>
                    </div>
                </div>
            </div>

            {/* Top Content */}
            <div className="bg-[#141414] rounded-xl border border-white/5 overflow-hidden max-w-2xl">
                <div className="p-4 border-b border-white/5 flex items-center gap-2">
                    <TrendingUp size={20} className="text-red-500" />
                    <h3 className="font-bold text-lg">Top Trending Content</h3>
                </div>
                <div>
                    {topContentData.map((item, i) => (
                        <div key={i} className="flex items-center gap-4 p-4 hover:bg-white/5 transition border-b border-white/5 last:border-0">
                            <span className="font-black text-2xl text-gray-700 w-8">{i + 1}</span>
                            <img src={item.poster} className="w-10 h-14 object-cover rounded bg-gray-800" />
                            <div className="flex-1">
                                <div className="font-bold">{item.title}</div>
                                <div className="text-xs text-gray-500">{item.count} views</div>
                            </div>
                            <div className="h-2 w-24 bg-gray-800 rounded-full overflow-hidden">
                                <div className="h-full bg-red-600" style={{ width: `${(item.count / (topContentData[0].count || 1)) * 100}%` }}></div>
                            </div>
                        </div>
                    ))}
                    {topContentData.length === 0 && <div className="p-8 text-center text-gray-500 font-bold">No trending data available yet.</div>}
                </div>
            </div>

            {/* Live Activity Feed */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-[#141414] rounded-xl border border-white/5 overflow-hidden">
                    <div className="p-4 border-b border-white/5 flex items-center gap-2">
                        <Clock size={20} className="text-brand-red" />
                        <h3 className="font-bold text-lg">Live User Activity</h3>
                    </div>
                    <div className="max-h-96 overflow-y-auto custom-scrollbar">
                        {recentActivity.map((log) => (
                            <div key={log.id} className="p-4 border-b border-white/5 hover:bg-white/5 transition flex items-center gap-4">
                                <div className={`w-2 h-2 rounded-full ${log.action.includes('play') ? 'bg-green-500' : 'bg-gray-500'}`} />
                                <div className="flex-1">
                                    <span className="font-bold text-white mr-2">{log.email}</span>
                                    <span className="text-gray-400 text-sm italic">{log.action === 'page_view' ? `Viewed ${log.details?.path}` : log.action}</span>
                                    {log.details?.title && <span className="text-brand-red text-sm ml-2 font-bold">({log.details.title})</span>}
                                </div>
                                <div className="text-xs text-gray-500 font-mono">
                                    {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleTimeString() : 'Just now'}
                                </div>
                            </div>
                        ))}
                        {recentActivity.length === 0 && <div className="p-8 text-center text-gray-500">No recent activity found.</div>}
                    </div>
                </div>

                <div className="bg-[#141414] rounded-xl border border-white/5 overflow-hidden">
                    <div className="p-4 border-b border-white/5 flex items-center gap-2">
                        <Play size={20} className="text-blue-500" />
                        <h3 className="font-bold text-lg">Global Watch History</h3>
                    </div>
                    <div className="max-h-96 overflow-y-auto custom-scrollbar">
                        {globalHistory.map((item, i) => (
                            <div key={i} className="p-4 border-b border-white/5 hover:bg-white/5 transition flex gap-4">
                                <img src={item.poster} className="w-16 h-10 object-cover rounded bg-gray-800" alt={item.contentTitle} />
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <h4 className="font-bold text-sm text-white">{item.contentTitle}</h4>
                                        <span className="text-[10px] text-gray-500 font-mono">{new Date(item.lastWatchedAt).toLocaleDateString()}</span>
                                    </div>
                                    <div className="text-xs text-gray-400 mt-0.5">User: <span className="text-white">{item.userEmail}</span></div>
                                    <div className="mt-2 h-1 bg-gray-700 rounded-full overflow-hidden w-full max-w-[150px]">
                                        <div className="h-full bg-blue-500" style={{ width: `${item.percent}%` }} />
                                    </div>
                                </div>
                            </div>
                        ))}
                        {globalHistory.length === 0 && <div className="p-8 text-center text-gray-500">No watch history found.</div>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsManager;
