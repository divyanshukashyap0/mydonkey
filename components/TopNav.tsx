import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, Menu, X, User, LogOut, Settings, LayoutDashboard, ChevronRight, Smartphone, Download } from 'lucide-react';
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

    const profileRef = useRef<HTMLDivElement>(null);
    const notifRef = useRef<HTMLDivElement>(null);

    const { logout, currentUser, currentProfile, notifications, markNotificationAsRead, isInstallable, installPwa, isIOS } = useStore();
    const navigate = useNavigate();

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 0);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // --- Click Outside to Close ---
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setProfileMenuOpen(false);
            }
            if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
                setNotifOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleNavClick = (id: string) => {
        setTab(id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setMobileMenuOpen(false);
    };

    const isAdmin = currentUser?.role === 'admin';
    const unreadNotifs = notifications.filter(n => !n.read).length;

    return (
        <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-700 ${isScrolled ? 'bg-black/60 backdrop-blur-xl border-b border-white/5 shadow-2xl py-2' : 'bg-gradient-to-b from-black/90 via-black/40 to-transparent py-4'}`}>
            <div className="max-w-[1920px] mx-auto px-4 md:px-12 h-16 md:h-20 flex items-center justify-between">

                {/* Logo & Desktop Links */}
                <div className="flex items-center gap-4 md:gap-12">
                    <div
                        className="cursor-pointer"
                        onClick={() => handleNavClick('home')}
                    >
                        <img src="https://res.cloudinary.com/dpba1gvra/image/upload/v1770155013/logo_mgcysp.png" className="h-10 md:h-12 lg:h-14 w-auto object-contain" alt="MY DONKEY Logo" />
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
                                className={`text-sm font-medium transition-all duration-300 hover:text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] ${activeTab === item.id ? 'text-white font-bold drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]' : 'text-gray-300'}`}
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
                    <div className="relative" ref={notifRef}>
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
                            <div className="fixed md:absolute top-20 md:top-12 left-4 right-4 md:left-auto md:right-0 md:w-96 bg-[#0a0a0a] backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-top-2 z-[300] ring-1 ring-white/5">
                                <div className="p-3 md:p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
                                    <span className="font-bold text-white text-sm md:text-base tracking-wide">Notifications</span>
                                    {unreadNotifs > 0 && <span className="text-[10px] md:text-xs text-brand-red font-bold uppercase tracking-wider">{unreadNotifs} New</span>}
                                </div>
                                <div className="max-h-[50vh] md:max-h-[400px] overflow-y-auto custom-scrollbar">
                                    {notifications.length > 0 ? (
                                        notifications.map(n => (
                                            <div key={n.id}
                                                onClick={() => {
                                                    markNotificationAsRead(n.id);
                                                    if (n.link) {
                                                        if (n.link.startsWith('http')) {
                                                            window.open(n.link, '_blank');
                                                        } else {
                                                            navigate(n.link);
                                                            setNotifOpen(false);
                                                        }
                                                    }
                                                }}
                                                className={`p-4 border-b border-white/5 flex gap-4 transition-all cursor-pointer group hover:bg-white/10 ${n.read ? 'opacity-60 hover:opacity-100 bg-transparent' : 'bg-white/5 border-l-2 border-l-brand-red'}`}
                                            >
                                                {/* Image if available */}
                                                {n.image && (
                                                    <div className="flex-shrink-0 w-12 h-16 rounded overflow-hidden bg-gray-800 shadow-lg">
                                                        <img src={n.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                                    </div>
                                                )}

                                                <div className="flex-1">
                                                    <div className={`text-sm mb-1 ${n.read ? 'font-medium text-gray-300' : 'font-bold text-white'}`}>{n.title}</div>
                                                    <div className="text-xs text-gray-400 leading-relaxed line-clamp-2">{n.message}</div>
                                                    <div className="flex items-center justify-between mt-2">
                                                        {n.link && <span className="text-[10px] text-brand-red font-bold uppercase tracking-widest flex items-center gap-1 group-hover:translate-x-1 transition-transform">View <ChevronRight size={10} /></span>}
                                                        <span className="text-[10px] text-gray-600 font-mono">
                                                            {new Date(n.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Unread Dot */}
                                                {!n.read && (
                                                    <div className="w-2 h-2 rounded-full bg-brand-red flex-shrink-0 mt-1.5 shadow-[0_0_8px_rgba(229,9,20,0.6)]"></div>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-12 text-center flex flex-col items-center gap-3 text-gray-500">
                                            <Bell size={32} className="opacity-20" />
                                            <span className="text-sm font-medium">No new notifications</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Profile Dropdown */}
                    <div className="relative" ref={profileRef}>
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
                            {isInstallable && (
                                <button
                                    onClick={() => { installPwa(); setMobileMenuOpen(false); }}
                                    className="w-full flex items-center gap-3 px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/10 group"
                                >
                                    <div className="bg-brand-red p-2 rounded-lg group-hover:scale-110 transition-transform">
                                        <Smartphone size={20} className="text-white" />
                                    </div>
                                    <div className="text-left">
                                        <div className="text-white font-bold text-sm">{isIOS ? 'Add to Home Screen' : 'Install App'}</div>
                                        <div className="text-[10px] text-gray-400">{isIOS ? 'Tap Share and add' : 'Get the mobile app'}</div>
                                    </div>
                                    <Download size={16} className="ml-auto text-gray-500" />
                                </button>
                            )}
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