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

const TopNav: React.FC<TopNavProps & { onLoginClick?: () => void }> = ({ activeTab, setTab, onSearch, onUnlock, onLoginClick }) => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isProfileMenuOpen, setProfileMenuOpen] = useState(false);
    const [isNotifOpen, setNotifOpen] = useState(false);

    const profileRef = useRef<HTMLDivElement>(null);
    const notifRef = useRef<HTMLDivElement>(null);

    const { logout, currentUser, currentProfile, userProfiles, switchProfile, notifications, markNotificationAsRead, isInstallable, installPwa, isIOS } = useStore();
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
        <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-700 ${isScrolled ? 'bg-gradient-to-b from-black via-black/90 to-transparent py-4 shadow-none' : 'bg-gradient-to-b from-black/90 via-black/40 to-transparent py-4'}`}>
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
                            { id: 'anime', label: 'Anime' },
                            { id: 'my-list', label: 'My List' },
                        ].map(item => (
                            <button
                                key={item.id}
                                onClick={() => handleNavClick(item.id)}
                                className={`text-sm font-bold transition-all duration-300 relative px-5 py-2 rounded-full overflow-hidden group
                                    ${item.id === 'anime'
                                        ? `bg-gradient-to-r from-violet-600 via-pink-500 to-violet-600 bg-[length:200%_auto] animate-shimmer text-white italic tracking-wide shadow-[0_0_20px_rgba(168,85,247,0.6)] hover:shadow-[0_0_30px_rgba(236,72,153,0.8)] hover:scale-110 border border-white/20`
                                        : `${activeTab === item.id
                                            ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.4)] scale-105 border-transparent'
                                            : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10 hover:border-white/30 hover:text-white hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:scale-105'}`
                                    }
                                `}
                            >
                                <span className="relative z-10">{item.label}</span>
                                {item.id === 'anime' && (
                                    <div className="absolute inset-0 bg-white/20 group-hover:bg-white/30 transition-colors duration-300" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-4 md:gap-6">
                    <button onClick={onSearch} className="text-white hover:scale-110 transition p-1"><Search size={24} /></button>

                    {currentUser ? (
                        <>
                            <button onClick={onUnlock} className="text-white hover:scale-110 transition relative group p-1" title="Redeem Code">
                                <div className="bg-white/10 p-1 rounded-full hover:bg-white/20 transition">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="16" r="1" /><rect x="3" y="10" width="22" height="12" rx="2" /><path d="M7 10V7a5 5 0 0 1 10 0v3" /></svg>
                                </div>
                            </button>

                            {/* Notifications */}
                            <div className="relative" ref={notifRef}>
                                <button
                                    onClick={() => setNotifOpen(!isNotifOpen)}
                                    className="text-white hover:scale-110 transition relative p-1"
                                >
                                    <Bell size={24} />
                                    {unreadNotifs > 0 && (
                                        <span className="absolute top-0 right-0 bg-brand-red text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold shadow-lg border border-[#0a0a0a]">
                                            {unreadNotifs}
                                        </span>
                                    )}
                                </button>

                                {isNotifOpen && (
                                    <div className="fixed md:absolute top-16 right-4 md:right-0 w-80 md:w-96 bg-[#0a0a0a] backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-top-2 z-[300] ring-1 ring-white/5">
                                        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
                                            <span className="font-bold text-white tracking-wide">Notifications</span>
                                            {unreadNotifs > 0 && <span className="text-xs text-brand-red font-bold uppercase tracking-wider">{unreadNotifs} New</span>}
                                        </div>
                                        <div className="max-h-[60vh] md:max-h-[400px] overflow-y-auto custom-scrollbar">
                                            {notifications.length > 0 ? (
                                                notifications.map(n => (
                                                    <div key={n.id}
                                                        onClick={() => {
                                                            markNotificationAsRead(n.id);
                                                            if (n.link) n.link.startsWith('http') ? window.open(n.link, '_blank') : navigate(n.link);
                                                            setNotifOpen(false);
                                                        }}
                                                        className={`p-4 border-b border-white/5 flex gap-4 transition-all cursor-pointer hover:bg-white/10 ${n.read ? 'opacity-60' : 'bg-white/5 border-l-2 border-l-brand-red'}`}
                                                    >
                                                        {n.image && <img src={n.image} className="w-12 h-16 rounded object-cover flex-shrink-0 bg-gray-800" />}
                                                        <div className="flex-1 min-w-0">
                                                            <div className={`text-sm mb-1 truncate ${n.read ? 'font-medium text-gray-300' : 'font-bold text-white'}`}>{n.title}</div>
                                                            <div className="text-xs text-gray-400 line-clamp-2">{n.message}</div>
                                                            <div className="flex justify-between mt-2">
                                                                <span className="text-[10px] text-gray-500 font-mono">{new Date(n.createdAt).toLocaleDateString()}</span>
                                                                {!n.read && <div className="w-2 h-2 rounded-full bg-brand-red" />}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="p-12 text-center text-gray-500 space-y-2">
                                                    <Bell size={24} className="mx-auto opacity-30" />
                                                    <div className="text-sm">No notifications</div>
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
                                    <img src={currentProfile?.avatarUrl || "/Mydonkey%20user.jpg"} className="w-8 h-8 rounded border-2 border-transparent group-hover:border-white transition object-cover" />
                                </button>

                                {isProfileMenuOpen && (
                                    <div className="absolute top-12 right-0 w-56 bg-cinema-black/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl py-2 animate-in slide-in-from-top-2">
                                        <div className="px-4 py-3 border-b border-white/10 mb-2">
                                            <div className="font-bold text-sm truncate text-white">{currentProfile?.name}</div>
                                            <div className="text-[10px] text-gray-500 truncate">{currentUser?.email}</div>
                                        </div>

                                        {isAdmin && (
                                            <button onClick={() => handleNavClick('admin')} className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-white/10 transition text-brand-red font-bold">
                                                <LayoutDashboard size={18} /> Admin Panel
                                            </button>
                                        )}

                                        {userProfiles.length > 1 && (
                                            <div className="py-2 border-b border-white/10">
                                                {userProfiles.filter(p => p.id !== currentProfile?.id).map(profile => (
                                                    <button key={profile.id} onClick={() => switchProfile(profile.id)} className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-white/10 transition opacity-80 hover:opacity-100">
                                                        <img src={profile.avatarUrl} className="w-6 h-6 rounded object-cover" />
                                                        <span className="text-gray-300">{profile.name}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        <button onClick={() => handleNavClick('account')} className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-white/10 transition text-gray-300 hover:text-white">
                                            <User size={18} /> Account
                                        </button>
                                        <div className="border-t border-white/10 mt-2 pt-2">
                                            <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-white/10 transition text-gray-400 hover:text-white">
                                                <LogOut size={18} /> Sign Out
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <button
                            onClick={onLoginClick}
                            className="bg-brand-red text-white px-4 py-2 rounded font-bold text-sm hover:bg-red-700 transition"
                        >
                            Sign In
                        </button>
                    )}

                    <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden text-white p-1">
                        <Menu size={24} />
                    </button>
                </div>
            </div>

            {/* Mobile Sidebar Navigation */}
            {
                isMobileMenuOpen && (
                    <div className="fixed inset-0 z-[200] lg:hidden animate-in slide-in-from-right duration-300">
                        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
                        <div className="absolute right-0 top-0 bottom-0 w-[85%] max-w-sm bg-black border-l border-white/10 p-6 flex flex-col shadow-2xl overflow-y-auto">
                            <div className="flex justify-between items-center mb-10">
                                <span className="font-black text-brand-red text-2xl tracking-tighter">MY DONKEY</span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setMobileMenuOpen(false);
                                    }}
                                    className="text-gray-400 hover:text-white p-2 -mr-2 transition-colors duration-200"
                                    aria-label="Close menu"
                                >
                                    <X size={32} />
                                </button>
                            </div>

                            <div className="flex-1 space-y-2">
                                {[
                                    { id: 'home', label: 'Home' },
                                    { id: 'movies', label: 'Movies' },
                                    { id: 'tv', label: 'TV Shows' },
                                    { id: 'my-list', label: 'My List' }, // Note: My List will trigger login catch in AppNew
                                ].map(item => (
                                    <button
                                        key={item.id}
                                        onClick={() => handleNavClick(item.id)}
                                        className={`w-full text-left text-2xl font-bold py-3 px-4 rounded-xl transition ${activeTab === item.id ? 'bg-white/5 text-white border-l-4 border-brand-red' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-4 pt-8 border-t border-white/10">
                                {isInstallable && (
                                    <button onClick={() => { installPwa(); setMobileMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-brand-red/20 to-transparent border border-brand-red/30 rounded-xl">
                                        <Smartphone size={20} className="text-brand-red" />
                                        <div className="text-left">
                                            <div className="text-white font-bold text-sm">Install App</div>
                                            <div className="text-[10px] text-gray-400">Add to Home Screen</div>
                                        </div>
                                    </button>
                                )}

                                {currentUser ? (
                                    <>
                                        <button onClick={() => handleNavClick('account')} className="w-full text-left font-bold text-gray-400 hover:text-white px-4 py-2">Account Settings</button>
                                        <button onClick={logout} className="w-full text-left font-bold text-brand-red px-4 py-2">Sign Out</button>
                                    </>
                                ) : (
                                    <button onClick={onLoginClick} className="w-full text-left font-bold text-brand-red px-4 py-2">Sign In</button>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }
        </nav >
    );
};

export default TopNav;