import React, { useState } from 'react';
import { Activity, MessageCircle, BarChart2, X, Trophy } from 'lucide-react';
import { Content } from '../types';

interface StatsPanelProps {
  content: Content;
  onClose: () => void;
}

const StatsPanel: React.FC<StatsPanelProps> = ({ content, onClose }) => {
  const [activeTab, setActiveTab] = useState<'stats' | 'commentary' | 'polls'>('stats');

  // Provide mock data if the specific matchInfo isn't in the new schema
  // (In a real scenario, this would come from a separate side-loaded sports API)
  const mockMatch = {
    team1: content.title.split(' vs ')[0] || 'Team A',
    team2: content.title.split(' vs ')[1] || 'Team B',
    stats: [
      { label: 'Possession', value1: '52%', value2: '48%' },
      { label: 'Shots', value1: '12', value2: '15' },
      { label: 'Corners', value1: '5', value2: '6' },
    ],
    commentary: [
      { time: "45'", text: "Corner kick awarded to " + (content.title.split(' vs ')[0] || 'Team A'), type: "INFO" },
      { time: "38'", text: "Yellow card for persistent fouling.", type: "INFO" },
      { time: "22'", text: "Amazing save by the goalkeeper!", type: "ACTION" }
    ]
  };

  const { team1, team2, stats, commentary } = mockMatch;

  return (
    <div className="absolute top-0 right-0 bottom-0 w-80 md:w-96 bg-[#0a0a0a]/98 backdrop-blur-2xl border-l border-white/10 flex flex-col animate-in slide-in-from-right duration-500 z-[110] shadow-[-20px_0_50px_rgba(0,0,0,0.8)]">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-white/10">
        <h3 className="font-black text-xs md:text-sm flex items-center gap-2 uppercase tracking-widest">
          <Activity size={18} className="text-brand-red animate-pulse" /> Live Match Center
        </h3>
        <button onClick={onClose} className="hover:bg-white/10 p-2 rounded-full transition">
          <X size={24} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex p-3 gap-2 border-b border-white/10 bg-white/5">
        {[
          { id: 'stats', label: 'Stats', icon: BarChart2 },
          { id: 'commentary', label: 'Feed', icon: MessageCircle },
          { id: 'polls', label: 'Live', icon: Trophy },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-black uppercase tracking-tighter transition-all ${activeTab === tab.id ? 'bg-brand-red text-white shadow-lg' : 'hover:bg-white/5 text-gray-500'
              }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-6">
        {activeTab === 'stats' && (
          <div className="space-y-8">
            <div className="grid grid-cols-3 items-center text-center">
              <span className="font-black text-2xl truncate">{team1}</span>
              <span className="text-[10px] bg-white/10 px-2 py-1 rounded text-gray-500 font-black">VS</span>
              <span className="font-black text-2xl truncate">{team2}</span>
            </div>

            {stats.map((stat, idx) => (
              <div key={idx} className="space-y-3">
                <div className="flex justify-between text-[10px] text-gray-400 uppercase font-black tracking-widest">
                  <span className="text-white">{stat.value1}</span>
                  <span className="opacity-50">{stat.label}</span>
                  <span className="text-white">{stat.value2}</span>
                </div>
                <div className="flex h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div className="bg-brand-red" style={{ width: stat.value1 }}></div>
                  <div className="bg-gray-700 mx-px w-px"></div>
                  <div className="bg-brand-red opacity-40 ml-auto" style={{ width: stat.value2 }}></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'commentary' && (
          <div className="space-y-6">
            {commentary.map((comm, idx) => (
              <div key={idx} className="flex gap-4 text-sm bg-white/5 p-4 rounded-lg border border-white/5">
                <span className="font-black text-brand-red text-xs">{comm.time}</span>
                <p className="text-gray-200 font-medium leading-relaxed">{comm.text}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'polls' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-gray-800/80 to-black p-6 rounded-xl border border-white/10 shadow-xl">
              <h4 className="font-black text-sm uppercase tracking-widest mb-6 text-center">Audience Verdict</h4>
              <div className="space-y-4">
                <button className="w-full bg-white/5 hover:bg-white/10 border border-white/10 p-4 rounded-lg transition flex justify-between items-center group">
                  <span className="font-bold text-gray-400 group-hover:text-white transition">{team1}</span>
                  <span className="font-black text-brand-red">65%</span>
                </button>
                <button className="w-full bg-white/5 hover:bg-white/10 border border-white/10 p-4 rounded-lg transition flex justify-between items-center group">
                  <span className="font-bold text-gray-400 group-hover:text-white transition">{team2}</span>
                  <span className="font-black text-brand-red">35%</span>
                </button>
              </div>
              <p className="text-[10px] text-center text-gray-500 font-bold uppercase tracking-widest mt-6">🔥 12,405 fans voting live</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsPanel;
