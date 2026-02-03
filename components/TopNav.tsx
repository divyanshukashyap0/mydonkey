import React, { useState, useEffect } from 'react';
import { Search, Bell, Menu, X, User, LogOut, Settings, LayoutDashboard, ChevronRight } from 'lucide-react';
import { useStore } from '../context/StoreContext';

interface TopNavProps {
    activeTab: string;
    setTab: (id: string) => void;
    onSearch: () => void;
    onUnlock: () => void;
}

const TopNav: React.FC<TopNavProps> = ({ activeTab, setTab, onSearch, onUnlock }) => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isProfileMenuOpen, setProfileMenuOpen] = useState(false);
    const [isNotifOpen, setNotifOpen] = useState(false);

    const { logout, currentUser, currentProfile, notifications } = useStore();

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 0);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleNavClick = (id: string) => {
        setTab(id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setMobileMenuOpen(false);
    };

    const isAdmin = currentUser?.role === 'admin';
    const unreadNotifs = notifications.filter(n => !n.read).length;

    return (
        <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${isScrolled ? 'bg-cinema-black shadow-2xl' : 'bg-gradient-to-b from-black/80 to-transparent'}`}>
            <div className="max-w-[1920px] mx-auto px-4 md:px-12 h-16 md:h-20 flex items-center justify-between">

                {/* Logo & Desktop Links */}
                <div className="flex items-center gap-4 md:gap-12">
                    <div
                        className="cursor-pointer"
                        onClick={() => handleNavClick('home')}
                    >
                        <img src="/logo.png" className="h-8 md:h-10 lg:h-12 w-auto object-contain" alt="MY DONKEY Logo" />
                    </div>

                    <div className="hidden lg:flex items-center gap-6">
                        {[
                            { id: 'home', label: 'Home' },
                            { id: 'tv', label: 'TV Shows' },
                            { id: 'movies', label: 'Movies' },
                            { id: 'new', label: 'New & Popular' },
                            { id: 'downloads', label: 'My List' },
                        ].map(item => (
                            <button
                                key={item.id}
                                onClick={() => handleNavClick(item.id)}
                                className={`text-sm font-medium transition-colors hover:text-gray-300 ${activeTab === item.id ? 'text-white font-bold' : 'text-gray-200'}`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-4 md:gap-6">
                    <button onClick={onSearch} className="text-white hover:scale-110 transition"><Search size={22} /></button>
                    <button onClick={onUnlock} className="text-white hover:scale-110 transition relative group" title="Redeem Code">
                        <Settings size={22} className="hidden" /> {/* Hack to keep imports if needed, but we use Lock */}
                        <div className="bg-white/10 p-1.5 rounded-full hover:bg-white/20">
                            {/* Using a Key icon conceptually but Lock is imported... wait, need to import Key or Ticket */}
                            {/* Let's use LockOpen or just Key if valid. I'll use a specific SVG or just generic Lock for "Unlock" */}
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="16" r="1" /><rect x="3" y="10" width="22" height="12" rx="2" /><path d="M7 10V7a5 5 0 0 1 10 0v3" /></svg>
                        </div>
                    </button>

                    {/* Notifications */}
                    <div className="relative">
                        <button
                            onClick={() => setNotifOpen(!isNotifOpen)}
                            className="text-white hover:scale-110 transition relative"
                        >
                            <Bell size={22} />
                            {unreadNotifs > 0 && (
                                <span className="absolute -top-1 -right-1 bg-brand-red text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                                    {unreadNotifs}
                                </span>
                            )}
                        </button>

                        {isNotifOpen && (
                            <div className="absolute top-12 right-0 w-80 bg-cinema-black/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl overflow-hidden animate-in slide-in-from-top-2">
                                <div className="p-4 border-b border-white/10 font-bold">Notifications</div>
                                <div className="max-h-96 overflow-y-auto">
                                    {notifications.length > 0 ? (
                                        notifications.map(n => (
                                            <div key={n.id} className="p-4 border-b border-white/5 hover:bg-white/5 cursor-pointer">
                                                <div className="text-sm font-bold text-white mb-1">{n.title}</div>
                                                <div className="text-xs text-gray-400 line-clamp-2">{n.message}</div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-8 text-center text-gray-500 text-sm">No new notifications.</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Profile Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setProfileMenuOpen(!isProfileMenuOpen)}
                            className="flex items-center gap-2 group"
                        >
                            <div className="w-8 h-8 md:w-10 md:h-10 rounded overflow-hidden border-2 border-transparent group-hover:border-white transition">
                                <img src={currentProfile?.avatarUrl || "https://wallpapers.com/images/hd/netflix-profile-pictures-1000-x-1000-qo9h82134t9nv0j0.jpg"} className="w-full h-full object-cover" />
                            </div>
                        </button>

                        {isProfileMenuOpen && (
                            <div className="absolute top-12 right-0 w-56 bg-cinema-black/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl py-2 animate-in slide-in-from-top-2">
                                <div className="px-4 py-3 border-b border-white/10 mb-2">
                                    <div className="font-bold text-sm truncate">{currentProfile?.name}</div>
                                    <div className="text-[10px] text-gray-500 truncate">{currentUser?.email}</div>
                                </div>

                                {isAdmin && (
                                    <button
                                        onClick={() => handleNavClick('admin')}
                                        className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-white/10 transition text-brand-red font-bold"
                                    >
                                        <LayoutDashboard size={18} /> Admin Panel
                                    </button>
                                )}

                                <button
                                    onClick={() => handleNavClick('account')}
                                    className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-white/10 transition"
                                >
                                    <User size={18} /> Account Settings
                                </button>

                                <button className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-white/10 transition">
                                    <Settings size={18} /> Help Center
                                </button>

                                <div className="border-t border-white/10 mt-2 pt-2">
                                    <button
                                        onClick={logout}
                                        className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-white/10 transition text-gray-400"
                                    >
                                        <LogOut size={18} /> Sign Out
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => setMobileMenuOpen(true)}
                        className="lg:hidden text-white"
                    >
                        <Menu size={28} />
                    </button>
                </div>
            </div>

            {/* Mobile Sidebar Navigation */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-[200] lg:hidden animate-in slide-in-from-right">
                    <div className="absolute inset-0 bg-black/60" onClick={() => setMobileMenuOpen(false)} />
                    <div className="absolute right-0 top-0 bottom-0 w-[80%] max-w-sm bg-cinema-black p-6 flex flex-col">
                        <div className="flex justify-between items-center mb-10">
                            <span className="font-black text-brand-red text-2xl">MY DONKEY</span>
                            <button onClick={() => setMobileMenuOpen(false)}><X size={32} /></button>
                        </div>

                        <div className="flex-1 space-y-4">
                            {[
                                { id: 'home', label: 'Home' },
                                { id: 'movies', label: 'Movies' },
                                { id: 'tv', label: 'TV Shows' },
                                { id: 'new', label: 'New & Popular' },
                                { id: 'downloads', label: 'My List' },
                            ].map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => handleNavClick(item.id)}
                                    className={`w-full text-left text-2xl font-bold py-2 ${activeTab === item.id ? 'text-brand-red' : 'text-gray-200'}`}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>

                        <div className="space-y-4 pt-10 border-t border-white/10">
                            <button onClick={() => handleNavClick('account')} className="w-full text-left text-lg text-gray-400">Account</button>
                            <button onClick={logout} className="w-full text-left text-lg text-gray-400">Sign Out</button>
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
};

export default TopNav;