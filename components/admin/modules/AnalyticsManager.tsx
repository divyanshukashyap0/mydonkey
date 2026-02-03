import React, { useEffect, useState } from 'react';
import { BarChart3, Clock, Download, Play, TrendingUp } from 'lucide-react';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { db } from '../../../firebase';
import { ViewingLog, DownloadLog } from '../../../types';
import { useStore } from '../../../context/StoreContext';

const AnalyticsManager = () => {
    const { content } = useStore();
    const [viewLogs, setViewLogs] = useState<ViewingLog[]>([]);
    const [downloadLogs, setDownloadLogs] = useState<DownloadLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Fetch last 100 views
                const qViews = query(collection(db, 'viewing_logs'), orderBy('startedAt', 'desc'), limit(100));
                const snapViews = await getDocs(qViews);
                setViewLogs(snapViews.docs.map(d => d.data() as ViewingLog));

                // Fetch last 50 downloads
                const qDownloads = query(collection(db, 'download_logs'), orderBy('downloadedAt', 'desc'), limit(50));
                const snapDownloads = await getDocs(qDownloads);
                setDownloadLogs(snapDownloads.docs.map(d => d.data() as DownloadLog));
            } catch (e) {
                console.error("Analytics error:", e);
            }
            setLoading(false);
        };
        fetchStats();
    }, []);

    // Aggregations
    const totalWatchTime = viewLogs.reduce((acc, log) => acc + (log.watchDurationSeconds || 0), 0);
    const totalViews = viewLogs.length;
    const totalDownloads = downloadLogs.length;

    // Top Content
    const contentPopularity: Record<string, number> = {};
    viewLogs.forEach(log => {
        contentPopularity[log.contentId] = (contentPopularity[log.contentId] || 0) + 1;
    });

    const topContent = Object.entries(contentPopularity)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id, count]) => {
            const c = content.find(x => x.id === id);
            return { title: c?.title || 'Unknown', count, poster: c?.poster_path };
        });

    if (loading) return <div className="p-10 text-center animate-pulse">Loading Analytics...</div>;

    return (
        <div className="space-y-8 animate-in fade-in">
            <h2 className="text-3xl font-bold">Platform Analytics</h2>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#141414] p-6 rounded-xl border border-white/5 relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-gray-400 text-sm font-bold uppercase flex items-center gap-2"><Play size={16} /> Total Views (Recent)</p>
                        <p className="text-4xl font-black mt-2 text-white">{totalViews}</p>
                    </div>
                </div>
                <div className="bg-[#141414] p-6 rounded-xl border border-white/5 relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-gray-400 text-sm font-bold uppercase flex items-center gap-2"><Clock size={16} /> Total Watch Time</p>
                        <p className="text-4xl font-black mt-2 text-white">{(totalWatchTime / 60).toFixed(0)} <span className="text-lg text-gray-500 font-normal">mins</span></p>
                    </div>
                </div>
                <div className="bg-[#141414] p-6 rounded-xl border border-white/5 relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-gray-400 text-sm font-bold uppercase flex items-center gap-2"><Download size={16} /> Recent Downloads</p>
                        <p className="text-4xl font-black mt-2 text-white">{totalDownloads}</p>
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
                    {topContent.map((item, i) => (
                        <div key={i} className="flex items-center gap-4 p-4 hover:bg-white/5 transition border-b border-white/5 last:border-0">
                            <span className="font-black text-2xl text-gray-700 w-8">{i + 1}</span>
                            <img src={item.poster} className="w-10 h-14 object-cover rounded bg-gray-800" />
                            <div className="flex-1">
                                <div className="font-bold">{item.title}</div>
                                <div className="text-xs text-gray-500">{item.count} views</div>
                            </div>
                            <div className="h-2 w-24 bg-gray-800 rounded-full overflow-hidden">
                                <div className="h-full bg-red-600" style={{ width: `${(item.count / (topContent[0].count || 1)) * 100}%` }}></div>
                            </div>
                        </div>
                    ))}
                    {topContent.length === 0 && <div className="p-8 text-center text-gray-500 font-bold">No data available yet.</div>}
                </div>
            </div>
        </div>
    );
};

export default AnalyticsManager;
