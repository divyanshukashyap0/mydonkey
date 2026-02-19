import React from 'react';
import { Trophy, PlayCircle } from 'lucide-react';
import { Content } from '../types';

interface LiveSportsRailProps {
    items: Content[];
    onPlay: (item: Content) => void;
}

const LiveSportsRail: React.FC<LiveSportsRailProps> = ({ items, onPlay }) => {
    if (!items || items.length === 0) return null;

    return (
        <div className="relative z-20 mb-8 pl-4 md:pl-12 py-6 bg-gradient-to-r from-blue-900/40 via-transparent to-transparent border-t border-white/5">
            <div className="flex items-center gap-2 mb-4 text-white">
                <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
                <h2 className="text-sm md:text-lg font-black tracking-widest uppercase">LIVE SPORTS & HIGHLIGHTS</h2>
            </div>
            <div className="flex gap-4 overflow-x-auto no-scrollbar pr-4 pb-2">
                {items.map((item) => (
                    <div
                        key={item.id}
                        onClick={() => onPlay(item)}
                        className="flex-none w-[160px] md:w-[200px] group cursor-pointer relative"
                    >
                        <div className="aspect-[2/3] rounded-lg overflow-hidden border border-white/10 group-hover:border-white/40 transition-all relative">
                            <img src={item.poster_path_mobile || item.poster_path} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={item.title} />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-90 transition-opacity" />

                            {/* Live/Coming Soon Badge */}
                            <div className="absolute top-2 right-2 bg-red-600 px-2 py-0.5 rounded text-[10px] font-black text-white">
                                {item.comingSoon ? 'REPLAY' : 'LIVE'}
                            </div>

                            <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                                <div className="flex-1">
                                    <h3 className="text-sm font-bold text-white line-clamp-2">{item.title}</h3>
                                    <p className="text-[10px] text-gray-300 font-medium">{(item.genres || []).join(' • ')}</p>
                                </div>
                                <PlayCircle size={32} className="text-white opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default LiveSportsRail;
