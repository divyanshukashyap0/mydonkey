import React from 'react';
import { Home, Search, Download, PlayCircle } from 'lucide-react';

interface MobileNavProps {
    activeTab: string;
    setTab: (tab: string) => void;
    currentProfile?: any;
}

const MobileNav: React.FC<MobileNavProps> = ({ activeTab, setTab, currentProfile }) => {
    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0a0a0a] border-t border-white/10 z-[60] pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.8)]">
            <div className="flex justify-around items-center h-16 px-2">
                <button onClick={() => setTab('home')} className={`flex flex-col items-center gap-1 transition-colors min-w-[3.5rem] ${activeTab === 'home' ? 'text-white' : 'text-gray-400 hover:text-gray-200'}`}>
                    <Home size={20} strokeWidth={activeTab === 'home' ? 3 : 2} />
                    <span className="text-[10px] font-medium">Home</span>
                </button>

                <button onClick={() => setTab('search')} className={`flex flex-col items-center gap-1 transition-colors min-w-[3.5rem] ${activeTab === 'search' ? 'text-white' : 'text-gray-400 hover:text-gray-200'}`}>
                    <Search size={20} strokeWidth={activeTab === 'search' ? 3 : 2} />
                    <span className="text-[10px] font-medium">Search</span>
                </button>
                <button onClick={() => setTab('my-list')} className={`flex flex-col items-center gap-1 transition-colors min-w-[3.5rem] ${activeTab === 'my-list' ? 'text-white' : 'text-gray-400 hover:text-gray-200'}`}>
                    <Download size={20} strokeWidth={activeTab === 'my-list' ? 3 : 2} />
                    <span className="text-[10px] font-medium">My List</span>
                </button>
                <button onClick={() => setTab('account')} className={`flex flex-col items-center gap-1 transition-colors min-w-[3.5rem] ${activeTab === 'account' ? 'text-white' : 'text-gray-400 hover:text-gray-200'}`}>
                    <img
                        src={currentProfile?.avatarUrl || "https://wallpapers.com/images/hd/netflix-profile-pictures-1000-x-1000-qo9h82134t9nv0j0.jpg"}
                        className={`w-5 h-5 rounded object-cover ${activeTab === 'account' ? 'border-2 border-white' : 'opacity-80'}`}
                        alt="Profile"
                    />
                    <span className="text-[10px] font-medium">Profile</span>
                </button>
            </div>
        </div>
    );
};

export default MobileNav;
