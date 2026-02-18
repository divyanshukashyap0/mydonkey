import React, { useEffect, useState } from 'react';
import { BarChart3, Clock, Download, Play, TrendingUp } from 'lucide-react';
import { collection, getDocs, limit, orderBy, query, where, onSnapshot } from 'firebase/firestore';
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

        // 1. Real-time Activity Logs
        const qActivity = query(collection(db, 'activity_logs'), orderBy('timestamp', 'desc'), limit(50));
        const unsubActivity = onSnapshot(qActivity, (snap) => {
            setRecentActivity(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        // 2. Real-time Users (for Watch Time & Active Count)
        const qUsers = query(collection(db, 'users'));
        const unsubUsers = onSnapshot(qUsers, (snap) => {
            const allUsers = snap.docs.map(d => d.data() as User);

            // Total Watch Time
            // @ts-ignore
            const totalSeconds = allUsers.reduce((acc, user) => acc + (user.totalWatchTimeSeconds || 0), 0);
            setCalculatedWatchTime(totalSeconds);

            // Active Users (Last 24h)
            const now = new Date();
            const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            // @ts-ignore
            const activeCount = allUsers.filter(u => {
                if (!u.lastActiveAt) return false;
                // @ts-ignore
                const date = u.lastActiveAt.toDate ? u.lastActiveAt.toDate() : new Date(u.lastActiveAt);
                return date > oneDayAgo;
            }).length;
            setActiveUsersCount(activeCount);

            // Global Watch History
            const historyData: any[] = [];
            allUsers.forEach(u => {
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
            historyData.sort((a, b) => new Date(b.lastWatchedAt).getTime() - new Date(a.lastWatchedAt).getTime());
            setGlobalHistory(historyData.slice(0, 50));
        });


        // 3. Independent Top Content Query (Keep simpler/separate if needed, or put in useEffect)
        // For 'Top Content', we need to aggregate logs. Since we don't want to download ALL logs ever in real-time,
        // we might stick to a tailored query or just use the recent 500 logs we might fetch.
        // Let's do a separate snapshot for wider stats but limited to recent 500 actions to keep it somewhat live but lighter.
        const playLogsQ = query(collection(db, 'activity_logs'), where('action', '==', 'video_play'), orderBy('timestamp', 'desc'), limit(500));
        const unsubTop = onSnapshot(playLogsQ, (snap) => {
            const popularity: Record<string, number> = {};
            snap.forEach(doc => {
                const data = doc.data();
                if (data.details?.contentId) {
                    popularity[data.details.contentId] = (popularity[data.details.contentId] || 0) + 1;
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
        });

        setLoading(false);

        return () => {
            unsubActivity();
            unsubUsers();
            unsubTop();
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
