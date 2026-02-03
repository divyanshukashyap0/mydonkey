import React from 'react';
import { Users, TrendingUp, DollarSign, Activity } from 'lucide-react';

interface StatProps {
    label: string;
    value: string;
    trend: string;
    trendUp: boolean;
    icon: React.ReactNode;
}

const StatCard = ({ label, value, trend, trendUp, icon }: StatProps) => (
    <div className="bg-[#141414] p-6 rounded-xl border border-white/5 hover:border-white/10 transition">
        <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-red-600/10 rounded-lg text-red-500">
                {icon}
            </div>
            <div className={`text-xs font-bold px-2 py-1 rounded ${trendUp ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                {trend}
            </div>
        </div>
        <div className="text-3xl font-bold mb-1">{value}</div>
        <div className="text-xs text-gray-500 uppercase font-bold">{label}</div>
    </div>
);

const AnalyticsData = () => {
    // Mock Data for now - in next phase connect to Firestore
    const stats = [
        { label: 'Total Users', value: '12,450', trend: '+12%', trendUp: true, icon: <Users size={24} /> },
        { label: 'Premium Subs', value: '4,280', trend: '+8.4%', trendUp: true, icon: <Activity size={24} /> },
        { label: 'Revenue (Monthly)', value: '₹42.8L', trend: '+5.2%', trendUp: true, icon: <DollarSign size={24} /> },
        { label: 'Active Streams', value: '1,842', trend: '+24%', trendUp: true, icon: <TrendingUp size={24} /> },
    ];

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <StatCard key={i} {...stat} />
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Chart Placeholder */}
                <div className="bg-[#141414] p-6 rounded-xl border border-white/5 h-[300px] flex items-center justify-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent z-10" />
                    {/* Mock Graph Bars */}
                    <div className="flex items-end gap-2 h-full w-full px-4 pb-4 opacity-50">
                        {[40, 60, 45, 70, 50, 65, 80, 75, 90, 60, 85, 95].map((h, i) => (
                            <div key={i} className="flex-1 bg-red-600 rounded-t-sm hover:bg-red-500 transition-all duration-500" style={{ height: `${h}%` }}></div>
                        ))}
                    </div>
                    <div className="absolute top-6 left-6 z-20">
                        <h3 className="text-xl font-bold">User Growth</h3>
                        <p className="text-gray-400 text-xs uppercase font-bold">Last 12 Months</p>
                    </div>
                </div>

                <div className="bg-[#141414] p-6 rounded-xl border border-white/5">
                    <h3 className="text-xl font-bold mb-6">Top Content</h3>
                    <div className="space-y-4">
                        {[
                            { title: "KGF: Chapter 2", views: "1.2M", type: "Movie" },
                            { title: "Stranger Things", views: "980K", type: "Series" },
                            { title: "IPL 2025 Highlights", views: "850K", type: "Sports" },
                            { title: "Money Heist", views: "720K", type: "Series" },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center justify-between p-3 hover:bg-white/5 rounded-lg transition group cursor-pointer">
                                <div className="flex items-center gap-4">
                                    <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center font-bold text-gray-400 group-hover:text-white input-sm">#{i + 1}</div>
                                    <div>
                                        <div className="font-bold">{item.title}</div>
                                        <div className="text-xs text-gray-500">{item.type}</div>
                                    </div>
                                </div>
                                <div className="font-mono font-bold text-red-500">{item.views}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsData;
