import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, ChevronRight, Monitor, User as UserIcon, Plus, Calendar, Camera, Wifi, Settings, PlayCircle, Smartphone, Download, Send, Maximize, X, Trash2, Film, QrCode, ScanLine, Tv, Sparkles, ArrowRight, ShieldCheck, History, SlidersHorizontal, Globe, Volume2 } from 'lucide-react';
import { useStore, PERMANENT_ADMINS } from '../context/StoreContext';
import DeviceManagementModal from './account/DeviceManagementModal';
import MyContributions from './account/MyContributions';
import GenrePreferenceModal from './GenrePreferenceModal';
import GlobalSettingsModal from './account/GlobalSettingsModal';
import { normalizeGenre } from '../services/recommendationService';

const AccountSettings = ({ setActiveTab }: { setActiveTab: (tab: string) => void }) => {
    const navigate = useNavigate();
    const {
        currentUser,
        currentProfile,
        userProfiles,
        logout,
        addProfile,
        updateProfile,
        deleteProfile,
        updateUserEmail,
        triggerPasswordReset,
        updateProfileAvatar,
        updateUser,
        isInstallable,
        isIOS,
        installPwa,
        submitContentRequest,
        addPage
    } = useStore();

    const [expandedProfile, setExpandedProfile] = useState<string | null>(null);
    const [showDeviceModal, setShowDeviceModal] = useState(false);
    const [showGenreModal, setShowGenreModal] = useState(false);
    const [showGlobalSettings, setShowGlobalSettings] = useState(false);
    const [requestTitle, setRequestTitle] = useState('');
    const [isRequesting, setIsRequesting] = useState(false);
    const [showContributions, setShowContributions] = useState(false);

    const isAdmin = currentUser?.role === 'admin' || Boolean(currentUser?.email && PERMANENT_ADMINS.includes(currentUser.email));

    const userFavoriteGenres = React.useMemo(() => {
        if (currentProfile?.favoriteGenres && currentProfile.favoriteGenres.length > 0) {
            return currentProfile.favoriteGenres.map(normalizeGenre);
        }
        if (currentUser?.favoriteGenres && currentUser.favoriteGenres.length > 0) {
            return currentUser.favoriteGenres.map(normalizeGenre);
        }
        try {
            const raw = localStorage.getItem('my_donkey_favorite_genres');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) return parsed.map(normalizeGenre);
            }
        } catch (e) { }
        return [];
    }, [currentProfile?.favoriteGenres, currentUser?.favoriteGenres]);

    // Profile Management State
    const [editingProfile, setEditingProfile] = useState<any | null>(null);
    const [isAddingProfile, setIsAddingProfile] = useState(false);

    if (!currentUser) return null;

    const toggleProfile = (id: string) => {
        setExpandedProfile(expandedProfile === id ? null : id);
    };

    const handleAddProfile = async () => {
        const name = prompt("Enter profile name:");
        if (name) {
            const isKids = window.confirm("Is this a kid's profile?");
            await addProfile(name, isKids, "/Mydonkey%20user.jpg");
        }
    };

    const handleDeleteProfile = async (id: string) => {
        if (userProfiles.length <= 1) {
            alert("You cannot delete your only profile. Your account must keep at least one profile.");
            return;
        }
        if (window.confirm("Delete this profile?")) {
            try {
                await deleteProfile(id);
            } catch (err: any) {
                alert(`Failed to delete profile: ${err.message || err}`);
            }
        }
    };

    const handleChangeEmail = async () => {
        const newEmail = prompt("Enter new email address:", currentUser.email);
        if (newEmail && newEmail !== currentUser.email) {
            try {
                await updateUserEmail(newEmail);
                alert("Email updated successfully. You may need to login again.");
            } catch (error: any) {
                alert("Failed to update email: " + error.message);
            }
        }
    };

    const handlePasswordReset = async () => {
        if (confirm(`Send password reset email to ${currentUser.email}?`)) {
            try {
                await triggerPasswordReset();
                alert("Password reset email sent. Check your inbox.");
            } catch (error: any) {
                alert("Failed to send reset email: " + error.message);
            }
        }
    };

    const handleChangeAvatar = async () => {
        const url = prompt("Enter image URL for avatar:", "/Mydonkey%20user.jpg");
        if (url) {
            await updateProfileAvatar(url);
        }
    };

    const toggleLowDataMode = async () => {
        await updateUser({ lowDataMode: !currentUser.lowDataMode });
    };

    // Safe Date Formatting
    const getMemberSinceDate = () => {
        try {
            // Prioritize createdAt if available, otherwise fallback to lastLoginAt
            const dateStr = currentUser.createdAt || currentUser.lastLoginAt;
            if (!dateStr) return new Date().toLocaleDateString();

            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return 'Recently';
            return d.toLocaleDateString();
        } catch (e) {
            return 'Recently';
        }
    };

    if (currentUser.isGuest) {
        return (
            <div className="min-h-screen bg-[#0f0617] text-white font-sans flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-2xl p-8 text-center shadow-2xl">
                    <div className="w-20 h-20 bg-gradient-to-br from-gray-700 to-gray-900 rounded-full mx-auto flex items-center justify-center mb-6 shadow-lg shadow-black/50">
                        <UserIcon size={40} className="text-gray-400" />
                    </div>
                    <h1 className="text-2xl font-bold mb-2">Guest Access</h1>
                    <p className="text-gray-400 mb-8 text-sm">You are currently browsing as a Guest. Some features are limited to protect our content and community.</p>

                    <div className="bg-white/5 rounded-xl p-4 mb-8 text-left space-y-3 border border-white/5">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Restrictions</h3>
                        <div className="flex items-center gap-3 text-sm text-gray-300">
                            <Download size={16} className="text-red-400" />
                            <span>Downloads are disabled</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-300">
                            <Settings size={16} className="text-red-400" />
                            <span>Watch history is not saved</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-300">
                            <UserIcon size={16} className="text-red-400" />
                            <span>Profile customization is disabled</span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <button
                            onClick={logout}
                            className="w-full py-3 bg-brand-red hover:bg-red-700 text-white font-bold rounded-xl transition shadow-lg shadow-brand-red/20"
                        >
                            Create Account / Sign In
                        </button>
                        <button
                            onClick={logout}
                            className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition"
                        >
                            Exit Guest Session
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0f0617] text-white font-sans">

            {/* Hotstar-style Account Layout */}
            <div className="max-w-4xl mx-auto px-4 pt-24 md:pt-28 pb-32">

                {/* Profile Header - Hotstar Style */}
                <div className="flex items-center gap-4 mb-8">
                    <div className="relative group">
                        <img
                            src={userProfiles[0]?.avatarUrl || '/Mydonkey%20user.jpg'}
                            className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover ring-2 ring-cyan-500/50 shadow-lg shadow-cyan-500/20"
                        />
                        <button
                            onClick={handleChangeAvatar}
                            className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition"
                        >
                            <Camera size={20} className="text-white" />
                        </button>
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-white">{userProfiles[0]?.name || 'User'}</h1>
                        <p className="text-sm text-gray-400 truncate max-w-[200px]">{currentUser.email}</p>
                    </div>
                    <button
                        onClick={() => navigate('/scan')}
                        className="ml-auto flex items-center gap-2 px-3.5 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 transition-all font-bold text-xs shadow-lg shadow-cyan-500/10 active:scale-95"
                    >
                        <QrCode size={16} />
                        <span>Scan</span>
                    </button>
                </div>

                {/* 100% Free Lifetime Access Banner */}
                <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-2xl p-5 md:p-6 mb-6 relative overflow-hidden shadow-xl shadow-teal-950/40 border border-emerald-400/20">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgZmlsbD0iI2ZmZiIgZmlsbC1vcGFjaXR5PSIuMDUiIGN4PSIyMCIgY3k9IjIwIiByPSIyIi8+PC9nPjwvc3ZnPg==')] opacity-30" />
                    <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-emerald-200 bg-black/30 px-2.5 py-0.5 rounded-full border border-emerald-300/30">
                                    <Sparkles size={12} className="text-emerald-300" />
                                    100% Free Platform
                                </span>
                                <span className="px-2 py-0.5 bg-white/20 rounded text-[10px] font-bold text-white">Full HD & 4K</span>
                            </div>
                            <div className="text-2xl md:text-3xl font-black text-white">Free Forever Membership</div>
                            <p className="text-xs text-emerald-100/90 mt-1 max-w-md">Unlimited movies, series & anime at zero cost. No credit card or subscription needed.</p>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-white/15 backdrop-blur-md rounded-full border border-white/20 text-white text-xs font-bold shadow-md">
                            <ShieldCheck size={16} className="text-emerald-300" />
                            <span>Lifetime Free Access</span>
                        </div>
                    </div>
                </div>

                {/* Settings Sections - Hotstar Style Clean List */}
                <div className="space-y-3">

                    {/* Account Section */}
                    <div className="bg-white/5 rounded-xl overflow-hidden">
                        <div className="px-5 py-3 border-b border-white/5">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Account</span>
                        </div>

                        <button onClick={handleChangeEmail} className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition border-b border-white/5">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                                    <UserIcon size={18} />
                                </div>
                                <div className="text-left">
                                    <div className="font-medium">Email</div>
                                    <div className="text-xs text-gray-500 truncate max-w-[180px]">{currentUser.email}</div>
                                </div>
                            </div>
                            <ChevronDown size={18} className="text-gray-500 -rotate-90" />
                        </button>

                        <button onClick={handlePasswordReset} className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition border-b border-white/5">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                                    <Settings size={18} />
                                </div>
                                <div className="text-left">
                                    <div className="font-medium">Password</div>
                                    <div className="text-xs text-gray-500">Reset your password</div>
                                </div>
                            </div>
                            <ChevronDown size={18} className="text-gray-500 -rotate-90" />
                        </button>

                        <button onClick={() => setShowDeviceModal(true)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                                    <Monitor size={18} />
                                </div>
                                <div className="text-left">
                                    <div className="font-medium">Manage Devices</div>
                                    <div className="text-xs text-gray-500">Control active logins</div>
                                </div>
                            </div>
                            <ChevronDown size={18} className="text-gray-500 -rotate-90" />
                        </button>
                    </div>

                    {/* Scan & Connect / TV Login Section (Mobile First) */}
                    <div className="bg-gradient-to-br from-[#121927] via-[#0d121f] to-[#150f26] rounded-2xl overflow-hidden border border-cyan-500/30 shadow-xl shadow-cyan-950/30 relative">
                        {/* Glowing ambient background element */}
                        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-cyan-500/10 via-blue-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />

                        {/* Section Header */}
                        <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-2.5">
                                <div className="w-6 h-6 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                                    <QrCode size={14} className="text-cyan-400" />
                                </div>
                                <span className="text-xs font-black text-cyan-300 uppercase tracking-wider">Scan & Connect</span>
                            </div>
                            <span className="bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                                TV & WEB LOGIN
                            </span>
                        </div>

                        {/* Main Interactive Scan Card */}
                        <div className="p-5 relative z-10">
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/25 flex-shrink-0 border border-white/15">
                                        <ScanLine size={28} className="text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-base md:text-lg text-white flex items-center gap-2">
                                            Scan QR Code to Login
                                        </h3>
                                        <p className="text-xs text-gray-300 mt-1 max-w-lg leading-relaxed">
                                            Easily sign in to <strong className="text-cyan-300 font-semibold">Smart TV, Android TV, Fire TV</strong>, or Web browser by scanning the QR code with your mobile camera. No password needed!
                                        </p>
                                        <div className="flex flex-wrap gap-2 mt-3.5">
                                            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-white/5 text-gray-300 border border-white/10">
                                                <Tv size={12} className="text-cyan-400" /> Smart TV
                                            </span>
                                            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-white/5 text-gray-300 border border-white/10">
                                                <Monitor size={12} className="text-blue-400" /> Web Browser
                                            </span>
                                            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-white/5 text-gray-300 border border-white/10">
                                                <Sparkles size={12} className="text-purple-400" /> Instant Sign-in
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => navigate('/scan')}
                                    className="w-full md:w-auto px-6 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 active:scale-95 text-white rounded-xl font-bold text-sm shadow-xl shadow-cyan-500/25 transition-all flex items-center justify-center gap-2.5 flex-shrink-0 cursor-pointer"
                                >
                                    <QrCode size={18} />
                                    <span>Open Camera Scanner</span>
                                    <ArrowRight size={16} />
                                </button>
                            </div>

                            {/* Secondary Quick Action: Enter 6-digit Code */}
                            <div className="mt-4 pt-3.5 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-gray-400">
                                <span className="flex items-center gap-1.5">
                                    <Smartphone size={14} className="text-gray-400" />
                                    Camera unavailable or low light?
                                </span>
                                <button
                                    onClick={() => navigate('/scan?mode=manual')}
                                    className="text-cyan-400 hover:text-cyan-300 font-bold hover:underline flex items-center gap-1 transition-colors w-fit"
                                >
                                    Enter 6-digit code manually <ArrowRight size={12} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Preferences Section */}
                    <div className="bg-white/5 rounded-xl overflow-hidden">
                        <div className="px-5 py-3 border-b border-white/5">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Preferences</span>
                        </div>

                        <button
                            onClick={() => setShowGenreModal(true)}
                            className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition border-b border-white/5 group text-left cursor-pointer"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-600 to-amber-600 flex items-center justify-center text-white shadow-md shadow-red-600/20 group-hover:scale-105 transition-transform">
                                    <Sparkles size={18} />
                                </div>
                                <div className="text-left">
                                    <div className="font-medium flex items-center gap-2 text-white">
                                        Favourite Genres & Taste
                                        {userFavoriteGenres.length > 0 && (
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                                                {userFavoriteGenres.length} Selected
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xs text-gray-400">
                                        {userFavoriteGenres.length > 0
                                            ? userFavoriteGenres.slice(0, 4).join(', ') + (userFavoriteGenres.length > 4 ? '...' : '')
                                            : 'Choose genres to personalize recommendations'}
                                    </div>
                                </div>
                            </div>
                            <ChevronRight size={18} className="text-gray-500 group-hover:text-white group-hover:translate-x-1 transition-transform" />
                        </button>





                        {/* Search History Toggle & Clear */}
                        <div className="border-t border-white/5">
                            <div className="flex items-center justify-between px-5 py-4 hover:bg-white/5 transition">
                                <div className="flex items-center gap-4 flex-1 pr-4">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
                                        <History size={18} />
                                    </div>
                                    <div className="text-left flex-1 min-w-0">
                                        <div className="font-medium flex items-center gap-2 text-white">
                                            Search History
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${currentUser.searchHistoryEnabled !== false
                                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                                : 'bg-red-500/20 text-red-300 border border-red-500/30'
                                                }`}>
                                                {currentUser.searchHistoryEnabled !== false ? 'ENABLED' : 'PAUSED'}
                                            </span>
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {currentUser.searchHistoryEnabled !== false
                                                ? 'Showing and saving recent searches in Search page'
                                                : 'Search history paused (searches won’t be saved or shown)'}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            const nextVal = currentUser.searchHistoryEnabled === false ? true : false;
                                            localStorage.setItem('my_donkey_search_history_enabled', String(nextVal));
                                            await updateUser({ searchHistoryEnabled: nextVal });
                                        }}
                                        className={`w-12 h-7 rounded-full relative transition-colors cursor-pointer ${currentUser.searchHistoryEnabled !== false ? 'bg-cyan-500' : 'bg-gray-700'
                                            }`}
                                        aria-label="Toggle Search History"
                                    >
                                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all ${currentUser.searchHistoryEnabled !== false ? 'left-6' : 'left-1'
                                            }`} />
                                    </button>
                                </div>
                            </div>

                            {/* Clear History Action Button */}
                            {((currentUser.searchHistory && currentUser.searchHistory.length > 0) || Boolean(localStorage.getItem('my_donkey_search_history'))) && (
                                <div className="px-5 pb-3 pt-1 flex items-center justify-between border-t border-white/5 bg-black/20 text-xs">
                                    <span className="text-gray-400">
                                        {currentUser.searchHistory?.length || JSON.parse(localStorage.getItem('my_donkey_search_history') || '[]').length || 0} saved search{(currentUser.searchHistory?.length || 0) === 1 ? '' : 'es'}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            if (window.confirm("Clear all your search history?")) {
                                                localStorage.removeItem('my_donkey_search_history');
                                                await updateUser({ searchHistory: [] });
                                            }
                                        }}
                                        className="text-red-400 hover:text-red-300 font-bold hover:underline flex items-center gap-1.5 transition-colors py-1 px-2 rounded hover:bg-red-500/10 cursor-pointer"
                                    >
                                        <Trash2 size={13} />
                                        <span>Clear Search History</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => navigate('/adblocker')}
                            className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition border-t border-white/5 group text-left cursor-pointer"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20 group-hover:scale-105 transition-transform">
                                    <ShieldCheck size={18} />
                                </div>
                                <div className="text-left">
                                    <div className="font-medium flex items-center gap-2 text-white">
                                        Adblockers & Mobile DNS
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                            AD-FREE
                                        </span>
                                    </div>
                                    <div className="text-xs text-gray-500">Suggested adblockers for PC & private DNS for smartphones</div>
                                </div>
                            </div>
                            <ChevronDown size={18} className="text-gray-500 -rotate-90 group-hover:translate-x-1 transition-transform" />
                        </button>

                        <button
                            onClick={() => navigate('/sound-enhancements')}
                            className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition border-t border-white/5 group text-left cursor-pointer"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-black shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
                                    <Volume2 size={18} />
                                </div>
                                <div className="text-left">
                                    <div className="font-medium flex items-center gap-2 text-white">
                                        Sound Enhancements & Booster
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                            AUDIO LAB
                                        </span>
                                    </div>
                                    <div className="text-xs text-gray-500">400% Web Audio studio, dialogue clarity EQ, & OS guide</div>
                                </div>
                            </div>
                            <ChevronDown size={18} className="text-gray-500 -rotate-90 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>

                {/* App Install Section */}
                {isInstallable && (
                    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl overflow-hidden border border-white/10 shadow-xl">
                        <div className="px-5 py-3 border-b border-white/5">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Device Experience</span>
                        </div>
                        <button
                            onClick={installPwa}
                            className="w-full flex items-center justify-between px-5 py-5 hover:bg-white/5 transition group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-brand-red flex items-center justify-center shadow-lg shadow-brand-red/20 group-hover:scale-110 transition-transform">
                                    <Smartphone size={24} className="text-white" />
                                </div>
                                <div className="text-left">
                                    <div className="font-bold text-lg">{isIOS ? 'Add to Home Screen' : 'Download My Donkey App'}</div>
                                    <div className="text-xs text-gray-400">{isIOS ? 'Install via Safari Share menu' : 'Get the best experience on your home screen'}</div>
                                </div>
                            </div>
                            <div className="bg-white/10 p-2 rounded-full group-hover:bg-brand-red group-hover:text-white transition-colors">
                                <Download size={20} />
                            </div>
                        </button>
                    </div>
                )}

                {/* Profiles Section */}
                <div className="bg-white/5 rounded-xl overflow-hidden mb-8">
                    <div className="px-5 py-3 border-b border-white/5 flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Profiles</span>
                        <button
                            onClick={() => { setEditingProfile(null); setIsAddingProfile(true); }}
                            className="text-cyan-400 text-sm font-bold hover:text-cyan-300 transition flex items-center gap-1"
                        >
                            <Plus size={16} /> Add
                        </button>
                    </div>

                    <div className="p-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                        {userProfiles.map(profile => (
                            <div key={profile.id} className="group text-center cursor-pointer relative" onClick={() => setEditingProfile(profile)}>
                                <div className="relative mb-2">
                                    <img
                                        src={profile.avatarUrl || "/Mydonkey%20user.jpg"}
                                        className="w-14 h-14 md:w-16 md:h-16 mx-auto rounded-lg object-cover ring-2 ring-transparent group-hover:ring-cyan-500 transition"
                                    />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition rounded-lg">
                                        <div className="bg-black/60 p-1.5 rounded-full">
                                            <Settings size={14} />
                                        </div>
                                    </div>
                                    {profile.isKids && (
                                        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-yellow-500 text-black text-[8px] font-bold rounded">KIDS</span>
                                    )}
                                </div>
                                <div className="text-xs font-medium truncate">{profile.name}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* My Added Content Section */}
                <div className="bg-white/5 rounded-xl overflow-hidden">
                    <button
                        onClick={() => setShowContributions(!showContributions)}
                        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-red to-red-700 flex items-center justify-center">
                                <Film size={18} />
                            </div>
                            <div className="text-left">
                                <div className="font-medium">My Added Content</div>
                                <div className="text-xs text-gray-500">Movies & shows you've added to the platform</div>
                            </div>
                        </div>
                        {showContributions ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                    </button>

                    {showContributions && (
                        <div className="px-4 pb-4 border-t border-white/5">
                            <MyContributions userId={currentUser.uid} />
                        </div>
                    )}
                </div>

                {/* Administrator Controls (Only visible to Admins) */}
                {isAdmin && (
                    <div className="bg-gradient-to-br from-[#18111e] via-[#141021] to-black rounded-xl overflow-hidden border border-brand-red/30 shadow-lg shadow-brand-red/10">
                        <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Administrator Controls</span>
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-brand-red/20 text-brand-red border border-brand-red/30">
                                ADMIN ONLY
                            </span>
                        </div>

                        <button
                            onClick={() => setShowGlobalSettings(true)}
                            className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition group text-left cursor-pointer"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-red to-orange-600 flex items-center justify-center text-white shadow-md shadow-brand-red/25 group-hover:scale-105 transition-transform">
                                    <SlidersHorizontal size={18} />
                                </div>
                                <div className="text-left">
                                    <div className="font-bold flex items-center gap-2 text-white">
                                        Global Website Settings
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-gray-300">
                                            SYSTEM
                                        </span>
                                    </div>
                                    <div className="text-xs text-gray-400">
                                        Configure site-wide branding, stream URLs, maintenance mode & security
                                    </div>
                                </div>
                            </div>
                            <ChevronRight size={18} className="text-gray-500 group-hover:text-white group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                )}

                {/* Sign Out */}
                <button
                    onClick={logout}
                    className="w-full py-4 bg-white/5 hover:bg-red-500/20 rounded-xl text-gray-400 hover:text-red-400 font-bold transition flex items-center justify-center gap-2"
                >
                    Sign Out
                </button>

                <div className="text-center text-xs text-gray-600 pt-2">
                    Member since {getMemberSinceDate()} • Version 2.0
                </div>


            </div>

            {/* Profile Edit/Add Modal */}
            {
                (isAddingProfile || editingProfile) && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 animate-in fade-in zoom-in-95 duration-300">
                        <div className="w-full max-w-md bg-[#141414] p-8 rounded-2xl relative border border-white/10 shadow-2xl">
                            <button
                                onClick={() => { setIsAddingProfile(false); setEditingProfile(null); }}
                                className="absolute top-4 right-4 text-gray-400 hover:text-white"
                            >
                                <X size={24} />
                            </button>

                            <h2 className="text-2xl font-bold mb-6">{isAddingProfile ? 'Add Profile' : 'Edit Profile'}</h2>

                            <div className="flex flex-col items-center mb-6">
                                <img
                                    src={editingProfile?.avatarUrl || "/Mydonkey%20user.jpg"}
                                    className="w-24 h-24 rounded-lg object-cover mb-4 shadow-lg"
                                />
                                {/* Avatar picker could go here */}
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Name</label>
                                    <input
                                        type="text"
                                        defaultValue={editingProfile?.name}
                                        id="profileNameInput"
                                        placeholder="Profile Name"
                                        className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg focus:ring-2 ring-cyan-500 outline-none"
                                    />
                                </div>

                                <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg cursor-pointer" onClick={() => {
                                    const cb = document.getElementById('isKidsInput') as HTMLInputElement;
                                    if (cb) cb.checked = !cb.checked;
                                }}>
                                    <input
                                        type="checkbox"
                                        id="isKidsInput"
                                        defaultChecked={editingProfile?.isKids}
                                        className="w-5 h-5 rounded bg-gray-600 border-none focus:ring-cyan-500"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                    <label className="font-medium cursor-pointer">Kid's Profile?</label>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        onClick={async () => {
                                            const nameInput = document.getElementById('profileNameInput') as HTMLInputElement;
                                            const kidsInput = document.getElementById('isKidsInput') as HTMLInputElement;
                                            const name = nameInput.value;
                                            const isKids = kidsInput.checked;

                                            if (!name) return;

                                            if (isAddingProfile) {
                                                await addProfile(name, isKids, "/Mydonkey%20user.jpg");
                                            } else if (editingProfile) {
                                                await updateProfile(editingProfile.id, { name, isKids });
                                            }
                                            setIsAddingProfile(false);
                                            setEditingProfile(null);
                                        }}
                                        className="flex-1 py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition"
                                    >
                                        Save
                                    </button>
                                    {editingProfile && (
                                        <button
                                            onClick={async () => {
                                                if (userProfiles.length <= 1) {
                                                    alert("You cannot delete your only profile. Your account must keep at least one profile.");
                                                    return;
                                                }
                                                if (confirm("Delete this profile?")) {
                                                    try {
                                                        await deleteProfile(editingProfile.id);
                                                        setEditingProfile(null);
                                                    } catch (err: any) {
                                                        alert(`Failed to delete profile: ${err.message || err}`);
                                                    }
                                                }
                                            }}
                                            className="px-4 py-3 border border-red-500/50 text-red-500 hover:bg-red-500/10 font-bold rounded-lg transition"
                                            title="Delete profile"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Modals */}
            {showDeviceModal && <DeviceManagementModal onClose={() => setShowDeviceModal(false)} />}
            {showGenreModal && <GenrePreferenceModal isOpen={showGenreModal} onClose={() => setShowGenreModal(false)} />}
            {showGlobalSettings && <GlobalSettingsModal isOpen={showGlobalSettings} onClose={() => setShowGlobalSettings(false)} />}
        </div >
    );
};

export default AccountSettings;