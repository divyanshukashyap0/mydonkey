import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ChevronRight,
    Monitor,
    User as UserIcon,
    Plus,
    Camera,
    Settings,
    Smartphone,
    Download,
    X,
    Trash2,
    Film,
    QrCode,
    ShieldCheck,
    History,
    SlidersHorizontal,
    Volume2,
    LayoutDashboard,
    LogOut,
    KeyRound,
    Mail,
    Users,
    Sparkles,
    CheckCircle2,
    AlertCircle,
    Wifi,
    Tv,
    ArrowUpRight,
    Upload,
    Loader2,
} from 'lucide-react';
import { useStore, PERMANENT_ADMINS } from '../context/StoreContext';
import DeviceManagementModal from './account/DeviceManagementModal';
import MyContributions from './account/MyContributions';
import GenrePreferenceModal from './GenrePreferenceModal';
import GlobalSettingsModal from './account/GlobalSettingsModal';
import { normalizeGenre } from '../services/recommendationService';
import { compressImageToDataUrl, formatBytes } from '../utils/imageCompressor';

type AccountSection = 'overview' | 'security' | 'profiles' | 'preferences' | 'contributions' | 'admin';

const AccountSettings = ({ setActiveTab: _setActiveTab }: { setActiveTab: (tab: string) => void }) => {
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
    } = useStore();

    const [activeSection, setActiveSection] = useState<AccountSection>('overview');
    const [showDeviceModal, setShowDeviceModal] = useState(false);
    const [showGenreModal, setShowGenreModal] = useState(false);
    const [showGlobalSettings, setShowGlobalSettings] = useState(false);

    // Inline feedback toast
    const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const showNotice = (type: 'success' | 'error', text: string) => {
        setNotice({ type, text });
        setTimeout(() => {
            setNotice((prev) => (prev?.text === text ? null : prev));
        }, 4000);
    };

    // Controlled inline modal states (replaces browser prompt/alert dialogs)
    const [emailModalOpen, setEmailModalOpen] = useState(false);
    const [emailInput, setEmailInput] = useState('');
    const [emailSaving, setEmailSaving] = useState(false);

    const [avatarModalOpen, setAvatarModalOpen] = useState(false);
    const [avatarInput, setAvatarInput] = useState('');
    const [avatarSaving, setAvatarSaving] = useState(false);
    const [avatarCompressing, setAvatarCompressing] = useState(false);
    const [avatarStats, setAvatarStats] = useState<{ original: number; compressed: number } | null>(null);
    const avatarFileRef = useRef<HTMLInputElement>(null);

    const [resettingPassword, setResettingPassword] = useState(false);
    const [confirmClearHistory, setConfirmClearHistory] = useState(false);

    // Controlled Profile Add/Edit Modal state
    const [editingProfile, setEditingProfile] = useState<any | null>(null);
    const [isAddingProfile, setIsAddingProfile] = useState(false);
    const [profileNameInput, setProfileNameInput] = useState('');
    const [profileAvatarInput, setProfileAvatarInput] = useState('/Mydonkey%20user.jpg');
    const [profileAvatarCompressing, setProfileAvatarCompressing] = useState(false);
    const [profileAvatarStats, setProfileAvatarStats] = useState<{ original: number; compressed: number } | null>(null);
    const profileFileRef = useRef<HTMLInputElement>(null);
    const [profileIsKids, setProfileIsKids] = useState(false);
    const [profileSaving, setProfileSaving] = useState(false);
    const [confirmDeleteProfile, setConfirmDeleteProfile] = useState(false);

    const isAdmin =
        currentUser?.role === 'admin' ||
        Boolean(currentUser?.email && PERMANENT_ADMINS.includes(currentUser.email));

    const userFavoriteGenres = useMemo(() => {
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
        } catch { }
        return [];
    }, [currentProfile?.favoriteGenres, currentUser?.favoriteGenres]);

    const savedSearchCount = useMemo(() => {
        if (currentUser?.searchHistory && currentUser.searchHistory.length > 0) {
            return currentUser.searchHistory.length;
        }
        try {
            const raw = localStorage.getItem('my_donkey_search_history');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) return parsed.length;
            }
        } catch { }
        return 0;
    }, [currentUser?.searchHistory]);

    if (!currentUser) return null;

    const getMemberSinceDate = () => {
        try {
            const dateStr = currentUser.createdAt || currentUser.lastLoginAt;
            if (!dateStr) return 'Recently';
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return 'Recently';
            return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
        } catch {
            return 'Recently';
        }
    };

    const openAddProfileModal = () => {
        setEditingProfile(null);
        setProfileNameInput('');
        setProfileAvatarInput('/Mydonkey%20user.jpg');
        setProfileAvatarStats(null);
        setProfileIsKids(false);
        setConfirmDeleteProfile(false);
        setIsAddingProfile(true);
    };

    const openEditProfileModal = (profile: any) => {
        setIsAddingProfile(false);
        setEditingProfile(profile);
        setProfileNameInput(profile.name || '');
        setProfileAvatarInput(profile.avatarUrl || '/Mydonkey%20user.jpg');
        setProfileAvatarStats(null);
        setProfileIsKids(Boolean(profile.isKids));
        setConfirmDeleteProfile(false);
    };

    const closeProfileModal = () => {
        setIsAddingProfile(false);
        setEditingProfile(null);
        setConfirmDeleteProfile(false);
        setProfileAvatarStats(null);
    };

    const handleAvatarFileUpload = async (file: File | null, target: 'main' | 'profile') => {
        if (!file) return;
        const setBusy = target === 'main' ? setAvatarCompressing : setProfileAvatarCompressing;
        setBusy(true);
        try {
            const compressed = await compressImageToDataUrl(file, {
                maxDimension: 200,
                maxBytes: 22 * 1024,
                squareCrop: true,
            });
            if (target === 'main') {
                setAvatarInput(compressed.dataUrl);
                setAvatarStats({ original: compressed.originalBytes, compressed: compressed.compressedBytes });
            } else {
                setProfileAvatarInput(compressed.dataUrl);
                setProfileAvatarStats({ original: compressed.originalBytes, compressed: compressed.compressedBytes });
            }
        } catch (err: any) {
            showNotice('error', err?.message || 'Could not compress the selected image.');
        } finally {
            setBusy(false);
        }
    };

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = profileNameInput.trim();
        if (!trimmed) return;
        const finalAvatar = profileAvatarInput.trim() || '/Mydonkey%20user.jpg';
        setProfileSaving(true);
        try {
            if (isAddingProfile) {
                await addProfile(trimmed, profileIsKids, finalAvatar);
                showNotice('success', `Profile "${trimmed}" created.`);
            } else if (editingProfile) {
                await updateProfile(editingProfile.id, { name: trimmed, isKids: profileIsKids, avatarUrl: finalAvatar });
                showNotice('success', `Profile "${trimmed}" updated.`);
            }
            closeProfileModal();
        } catch (err: any) {
            showNotice('error', err?.message || 'Unable to save profile.');
        } finally {
            setProfileSaving(false);
        }
    };

    const handleConfirmDeleteProfile = async () => {
        if (!editingProfile) return;
        if (userProfiles.length <= 1) {
            showNotice('error', 'Your account must keep at least one profile.');
            return;
        }
        setProfileSaving(true);
        try {
            await deleteProfile(editingProfile.id);
            showNotice('success', `Profile "${editingProfile.name}" deleted.`);
            closeProfileModal();
        } catch (err: any) {
            showNotice('error', err?.message || 'Failed to delete profile.');
        } finally {
            setProfileSaving(false);
        }
    };

    const handleSaveEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        const nextEmail = emailInput.trim();
        if (!nextEmail || nextEmail === currentUser.email) {
            setEmailModalOpen(false);
            return;
        }
        setEmailSaving(true);
        try {
            await updateUserEmail(nextEmail);
            setEmailModalOpen(false);
            showNotice('success', 'Email updated. You may need to sign in again.');
        } catch (err: any) {
            showNotice('error', err?.message || 'Failed to update email address.');
        } finally {
            setEmailSaving(false);
        }
    };

    const handleSaveAvatar = async (e: React.FormEvent) => {
        e.preventDefault();
        const url = avatarInput.trim();
        if (!url) return;
        setAvatarSaving(true);
        try {
            await updateProfileAvatar(url);
            setAvatarModalOpen(false);
            showNotice('success', 'Profile photo updated.');
        } catch (err: any) {
            showNotice('error', err?.message || 'Could not update profile photo.');
        } finally {
            setAvatarSaving(false);
        }
    };

    const handlePasswordReset = async () => {
        setResettingPassword(true);
        try {
            await triggerPasswordReset();
            showNotice('success', `Password reset link sent to ${currentUser.email}.`);
        } catch (err: any) {
            showNotice('error', err?.message || 'Failed to send password reset email.');
        } finally {
            setResettingPassword(false);
        }
    };

    const handleToggleSearchHistory = async () => {
        const nextVal = currentUser.searchHistoryEnabled === false ? true : false;
        try {
            localStorage.setItem('my_donkey_search_history_enabled', String(nextVal));
        } catch { }
        await updateUser({ searchHistoryEnabled: nextVal });
        showNotice('success', nextVal ? 'Search history enabled.' : 'Search history paused.');
    };

    const handleClearSearchHistory = async () => {
        try {
            localStorage.removeItem('my_donkey_search_history');
        } catch { }
        await updateUser({ searchHistory: [] });
        setConfirmClearHistory(false);
        showNotice('success', 'Search history cleared.');
    };

    const handleToggleLowData = async () => {
        const nextVal = !currentUser.lowDataMode;
        await updateUser({ lowDataMode: nextVal });
        showNotice('success', nextVal ? 'Data saver enabled.' : 'Data saver disabled.');
    };

    // Guest View — Mature & Clean
    if (currentUser.isGuest) {
        return (
            <div className="min-h-screen bg-[#0a0a0b] text-white font-sans flex items-center justify-center px-4 py-24">
                <div className="w-full max-w-md bg-[#111114] border border-white/[0.08] rounded-2xl p-7 sm:p-8 shadow-2xl">
                    <div className="w-12 h-12 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-zinc-300 mb-5">
                        <UserIcon size={22} />
                    </div>
                    <h1 className="text-xl font-semibold tracking-tight text-white">Guest Session</h1>
                    <p className="text-sm text-zinc-400 mt-1.5 leading-relaxed">
                        Sign in to sync your watchlist, customize profiles, and keep your viewing history across devices.
                    </p>

                    <div className="mt-6 border-t border-white/[0.08] pt-5 space-y-3">
                        <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                            Unavailable in Guest Mode
                        </div>
                        {[
                            { icon: Download, label: 'Offline downloads' },
                            { icon: History, label: 'Cross-device watch history' },
                            { icon: Users, label: 'Multiple profiles & personalization' },
                        ].map(({ icon: Icon, label }) => (
                            <div key={label} className="flex items-center gap-3 text-sm text-zinc-300">
                                <Icon size={15} className="text-zinc-500 shrink-0" />
                                <span>{label}</span>
                            </div>
                        ))}
                    </div>

                    <div className="mt-7 space-y-2.5">
                        <button
                            type="button"
                            onClick={logout}
                            className="w-full py-2.5 px-4 bg-white hover:bg-zinc-200 text-black text-sm font-semibold rounded-lg transition cursor-pointer"
                        >
                            Sign In or Create Account
                        </button>
                        <button
                            type="button"
                            onClick={logout}
                            className="w-full py-2.5 px-4 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-zinc-300 hover:text-white text-sm font-medium rounded-lg transition cursor-pointer"
                        >
                            Exit Guest Session
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const navItems: Array<{ id: AccountSection; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = [
        { id: 'overview', label: 'Overview', icon: UserIcon },
        { id: 'security', label: 'Security & Devices', icon: ShieldCheck },
        { id: 'profiles', label: 'Profiles', icon: Users },
        { id: 'preferences', label: 'Preferences', icon: Settings },
        { id: 'contributions', label: 'My Content', icon: Film },
        ...(isAdmin ? [{ id: 'admin' as const, label: 'Administration', icon: LayoutDashboard }] : []),
    ];

    const displayName = currentProfile?.name || userProfiles[0]?.name || 'Member';
    const avatarSrc = currentProfile?.avatarUrl || userProfiles[0]?.avatarUrl || '/Mydonkey%20user.jpg';

    return (
        <div className="min-h-screen bg-[#0a0a0b] text-zinc-100 font-sans">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 md:pt-28 pb-28">
                {/* Page Header */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-white/[0.08]">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
                            Account
                        </h1>
                        <p className="text-sm text-zinc-400 mt-1">
                            Manage your profile, connected devices, and playback preferences.
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5 self-start sm:self-auto">
                        <button
                            type="button"
                            onClick={() => navigate('/scan')}
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.11] border border-white/[0.09] text-zinc-200 hover:text-white text-xs font-medium transition cursor-pointer"
                        >
                            <QrCode size={15} className="text-zinc-400" />
                            <span>Link TV / Device</span>
                        </button>
                        {isAdmin && (
                            <button
                                type="button"
                                onClick={() => navigate('/admin')}
                                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-brand-red hover:bg-red-700 text-white text-xs font-semibold transition cursor-pointer"
                            >
                                <LayoutDashboard size={15} />
                                <span>Admin Console</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Inline Toast Notice */}
                {notice && (
                    <div
                        role="status"
                        className={`mt-5 px-4 py-3 rounded-xl border text-xs sm:text-sm font-medium flex items-center justify-between gap-3 ${notice.type === 'success'
                            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                            : 'bg-red-500/10 border-red-500/25 text-red-300'
                            }`}
                    >
                        <div className="flex items-center gap-2.5">
                            {notice.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                            <span>{notice.text}</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setNotice(null)}
                            className="text-current opacity-70 hover:opacity-100 cursor-pointer"
                            aria-label="Dismiss message"
                        >
                            <X size={15} />
                        </button>
                    </div>
                )}

                {/* Mobile Horizontal Navigation */}
                <nav
                    aria-label="Account sections"
                    className="lg:hidden flex items-center gap-1.5 overflow-x-auto no-scrollbar py-4 border-b border-white/[0.08]"
                >
                    {navItems.map(({ id, label, icon: Icon }) => {
                        const isActive = activeSection === id;
                        return (
                            <button
                                key={id}
                                type="button"
                                onClick={() => setActiveSection(id)}
                                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer shrink-0 ${isActive
                                    ? 'bg-white text-black font-semibold'
                                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]'
                                    }`}
                            >
                                <Icon size={14} />
                                <span>{label}</span>
                            </button>
                        );
                    })}
                </nav>

                {/* Two-Column Mature Dashboard Layout */}
                <div className="mt-6 lg:mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Desktop Left Sidebar */}
                    <aside className="hidden lg:flex lg:col-span-3 flex-col gap-1 sticky top-24">
                        {navItems.map(({ id, label, icon: Icon }) => {
                            const isActive = activeSection === id;
                            return (
                                <button
                                    key={id}
                                    type="button"
                                    onClick={() => setActiveSection(id)}
                                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm transition cursor-pointer text-left ${isActive
                                        ? 'bg-white/[0.09] text-white font-medium'
                                        : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]'
                                        }`}
                                >
                                    <Icon size={16} className={isActive ? 'text-white' : 'text-zinc-500'} />
                                    <span>{label}</span>
                                </button>
                            );
                        })}

                        <div className="my-3 border-t border-white/[0.08]" />

                        <button
                            type="button"
                            onClick={logout}
                            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm text-zinc-400 hover:text-red-400 hover:bg-red-500/[0.08] transition cursor-pointer text-left"
                        >
                            <LogOut size={16} />
                            <span>Sign Out</span>
                        </button>

                        <div className="px-3.5 pt-4 text-[11px] text-zinc-600">
                            Member since {getMemberSinceDate()}
                        </div>
                    </aside>

                    {/* Right Content Pane */}
                    <main className="lg:col-span-9 space-y-6 min-w-0">
                        {/* SECTION: OVERVIEW */}
                        {activeSection === 'overview' && (
                            <>
                                {/* Identity Card */}
                                <section className="bg-[#111114] border border-white/[0.08] rounded-2xl p-5 sm:p-6">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className="relative group shrink-0">
                                                <img
                                                    src={avatarSrc}
                                                    alt={displayName}
                                                    className="w-16 h-16 rounded-full object-cover border border-white/15 bg-zinc-900"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setAvatarInput(avatarSrc);
                                                        setAvatarStats(null);
                                                        setAvatarModalOpen(true);
                                                    }}
                                                    className="absolute inset-0 flex items-center justify-center bg-black/65 rounded-full opacity-0 group-hover:opacity-100 transition cursor-pointer"
                                                    title="Change profile photo"
                                                    aria-label="Change profile photo"
                                                >
                                                    <Camera size={16} className="text-white" />
                                                </button>
                                            </div>

                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h2 className="text-lg font-semibold text-white truncate">
                                                        {displayName}
                                                    </h2>
                                                    {isAdmin && (
                                                        <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-white/10 text-zinc-200 border border-white/10">
                                                            Admin
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-zinc-400 truncate mt-0.5">{currentUser.email}</p>
                                                <p className="text-xs text-zinc-500 mt-1">
                                                    Member since {getMemberSinceDate()} · {userProfiles.length} {userProfiles.length === 1 ? 'profile' : 'profiles'}
                                                </p>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setAvatarInput(avatarSrc);
                                                setAvatarStats(null);
                                                setAvatarModalOpen(true);
                                            }}
                                            className="px-3.5 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.11] border border-white/[0.09] text-xs font-medium text-zinc-200 hover:text-white transition cursor-pointer self-start sm:self-center shrink-0"
                                        >
                                            Edit Photo
                                        </button>
                                    </div>
                                </section>

                                {/* Membership Details Card (Calm, Netflix/Apple-style) */}
                                <section className="bg-[#111114] border border-white/[0.08] rounded-2xl overflow-hidden">
                                    <div className="px-5 sm:px-6 py-4 border-b border-white/[0.07] flex items-center justify-between">
                                        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                                            Membership
                                        </h3>
                                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                            Active
                                        </span>
                                    </div>
                                    <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div>
                                            <div className="text-base font-semibold text-white">
                                                Standard Free Plan
                                            </div>
                                            <p className="text-sm text-zinc-400 mt-1">
                                                Unlimited HD & 4K movies, series, and anime with zero subscription fees.
                                            </p>
                                        </div>
                                        <div className="text-left sm:text-right shrink-0">
                                            <div className="text-sm font-semibold text-white">Free Forever</div>
                                            <div className="text-xs text-zinc-500 mt-0.5">No card required</div>
                                        </div>
                                    </div>
                                </section>

                                {/* Quick Actions Grid */}
                                <section className="bg-[#111114] border border-white/[0.08] rounded-2xl overflow-hidden">
                                    <div className="px-5 sm:px-6 py-4 border-b border-white/[0.07]">
                                        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                                            Quick Links
                                        </h3>
                                    </div>

                                    <div className="divide-y divide-white/[0.07]">
                                        <button
                                            type="button"
                                            onClick={() => setActiveSection('security')}
                                            className="w-full flex items-center justify-between px-5 sm:px-6 py-4 hover:bg-white/[0.03] transition text-left cursor-pointer group"
                                        >
                                            <div className="flex items-center gap-3.5">
                                                <ShieldCheck size={18} className="text-zinc-400 group-hover:text-white transition" />
                                                <div>
                                                    <div className="text-sm font-medium text-white">Security & Connected Devices</div>
                                                    <div className="text-xs text-zinc-500">Email, password, active sessions, and TV sign-in</div>
                                                </div>
                                            </div>
                                            <ChevronRight size={16} className="text-zinc-600 group-hover:text-zinc-300 transition" />
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setActiveSection('profiles')}
                                            className="w-full flex items-center justify-between px-5 sm:px-6 py-4 hover:bg-white/[0.03] transition text-left cursor-pointer group"
                                        >
                                            <div className="flex items-center gap-3.5">
                                                <Users size={18} className="text-zinc-400 group-hover:text-white transition" />
                                                <div>
                                                    <div className="text-sm font-medium text-white">Manage Profiles</div>
                                                    <div className="text-xs text-zinc-500">{userProfiles.length} active {userProfiles.length === 1 ? 'profile' : 'profiles'} on this account</div>
                                                </div>
                                            </div>
                                            <ChevronRight size={16} className="text-zinc-600 group-hover:text-zinc-300 transition" />
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setShowGenreModal(true)}
                                            className="w-full flex items-center justify-between px-5 sm:px-6 py-4 hover:bg-white/[0.03] transition text-left cursor-pointer group"
                                        >
                                            <div className="flex items-center gap-3.5">
                                                <Sparkles size={18} className="text-zinc-400 group-hover:text-white transition" />
                                                <div>
                                                    <div className="text-sm font-medium text-white">Taste & Genres</div>
                                                    <div className="text-xs text-zinc-500">
                                                        {userFavoriteGenres.length > 0
                                                            ? userFavoriteGenres.slice(0, 4).join(', ') + (userFavoriteGenres.length > 4 ? ` +${userFavoriteGenres.length - 4}` : '')
                                                            : 'Personalize your recommendations'}
                                                    </div>
                                                </div>
                                            </div>
                                            <ChevronRight size={16} className="text-zinc-600 group-hover:text-zinc-300 transition" />
                                        </button>

                                        {isInstallable && (
                                            <button
                                                type="button"
                                                onClick={installPwa}
                                                className="w-full flex items-center justify-between px-5 sm:px-6 py-4 hover:bg-white/[0.03] transition text-left cursor-pointer group"
                                            >
                                                <div className="flex items-center gap-3.5">
                                                    <Smartphone size={18} className="text-zinc-400 group-hover:text-white transition" />
                                                    <div>
                                                        <div className="text-sm font-medium text-white">
                                                            {isIOS ? 'Add App to Home Screen' : 'Install My Donkey App'}
                                                        </div>
                                                        <div className="text-xs text-zinc-500">
                                                            {isIOS ? 'Install via Safari Share menu' : 'Faster launch and fullscreen experience'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <Download size={16} className="text-zinc-500 group-hover:text-white transition" />
                                            </button>
                                        )}
                                    </div>
                                </section>
                            </>
                        )}

                        {/* SECTION: SECURITY & DEVICES */}
                        {activeSection === 'security' && (
                            <>
                                <section className="bg-[#111114] border border-white/[0.08] rounded-2xl overflow-hidden">
                                    <div className="px-5 sm:px-6 py-4 border-b border-white/[0.07]">
                                        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                                            Login & Credentials
                                        </h3>
                                    </div>

                                    <div className="divide-y divide-white/[0.07]">
                                        <div className="px-5 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <div className="flex items-center gap-3.5 min-w-0">
                                                <Mail size={18} className="text-zinc-400 shrink-0" />
                                                <div className="min-w-0">
                                                    <div className="text-sm font-medium text-white">Email Address</div>
                                                    <div className="text-xs text-zinc-400 truncate mt-0.5">{currentUser.email}</div>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setEmailInput(currentUser.email || '');
                                                    setEmailModalOpen(true);
                                                }}
                                                className="px-3.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.11] border border-white/[0.09] text-xs font-medium text-zinc-200 hover:text-white transition cursor-pointer self-start sm:self-center shrink-0"
                                            >
                                                Change Email
                                            </button>
                                        </div>

                                        <div className="px-5 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <div className="flex items-center gap-3.5">
                                                <KeyRound size={18} className="text-zinc-400 shrink-0" />
                                                <div>
                                                    <div className="text-sm font-medium text-white">Password</div>
                                                    <div className="text-xs text-zinc-400 mt-0.5">Send a secure password reset email</div>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                disabled={resettingPassword}
                                                onClick={handlePasswordReset}
                                                className="px-3.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.11] border border-white/[0.09] text-xs font-medium text-zinc-200 hover:text-white transition cursor-pointer disabled:opacity-50 self-start sm:self-center shrink-0"
                                            >
                                                {resettingPassword ? 'Sending...' : 'Reset Password'}
                                            </button>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => setShowDeviceModal(true)}
                                            className="w-full px-5 sm:px-6 py-4 hover:bg-white/[0.03] transition flex items-center justify-between text-left cursor-pointer group"
                                        >
                                            <div className="flex items-center gap-3.5">
                                                <Monitor size={18} className="text-zinc-400 group-hover:text-white transition shrink-0" />
                                                <div>
                                                    <div className="text-sm font-medium text-white">Active Devices</div>
                                                    <div className="text-xs text-zinc-400 mt-0.5">Review and revoke signed-in sessions</div>
                                                </div>
                                            </div>
                                            <ChevronRight size={16} className="text-zinc-600 group-hover:text-zinc-300 transition" />
                                        </button>
                                    </div>
                                </section>

                                {/* TV & Web QR Sign-in */}
                                <section className="bg-[#111114] border border-white/[0.08] rounded-2xl overflow-hidden">
                                    <div className="px-5 sm:px-6 py-4 border-b border-white/[0.07]">
                                        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                                            TV & Quick Sign-In
                                        </h3>
                                    </div>

                                    <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                                        <div className="flex items-start gap-3.5">
                                            <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-zinc-200 shrink-0">
                                                <Tv size={18} />
                                            </div>
                                            <div>
                                                <div className="text-sm font-semibold text-white">Sign in to Smart TV or Browser</div>
                                                <p className="text-xs text-zinc-400 mt-1 max-w-md leading-relaxed">
                                                    Approve a login on Android TV, Fire TV, or another browser by scanning the QR code or entering the 6-digit pairing code.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => navigate('/scan?mode=manual')}
                                                className="px-3.5 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.11] border border-white/[0.09] text-xs font-medium text-zinc-200 hover:text-white transition cursor-pointer"
                                            >
                                                Enter Code
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => navigate('/scan')}
                                                className="px-4 py-2 rounded-lg bg-white hover:bg-zinc-200 text-black text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
                                            >
                                                <QrCode size={14} />
                                                <span>Scan QR</span>
                                            </button>
                                        </div>
                                    </div>
                                </section>
                            </>
                        )}

                        {/* SECTION: PROFILES */}
                        {activeSection === 'profiles' && (
                            <section className="bg-[#111114] border border-white/[0.08] rounded-2xl overflow-hidden">
                                <div className="px-5 sm:px-6 py-4 border-b border-white/[0.07] flex items-center justify-between">
                                    <div>
                                        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                                            Household Profiles
                                        </h3>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={openAddProfileModal}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-black text-xs font-semibold transition cursor-pointer"
                                    >
                                        <Plus size={14} />
                                        <span>Add Profile</span>
                                    </button>
                                </div>

                                <div className="divide-y divide-white/[0.07]">
                                    {userProfiles.map((profile) => {
                                        const isCurrent = currentProfile?.id === profile.id;
                                        return (
                                            <div
                                                key={profile.id}
                                                className="px-5 sm:px-6 py-4 flex items-center justify-between gap-4 hover:bg-white/[0.02] transition"
                                            >
                                                <div className="flex items-center gap-3.5 min-w-0">
                                                    <img
                                                        src={profile.avatarUrl || '/Mydonkey%20user.jpg'}
                                                        alt={profile.name}
                                                        className="w-11 h-11 rounded-lg object-cover border border-white/10 bg-zinc-900 shrink-0"
                                                    />
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-medium text-white truncate">
                                                                {profile.name}
                                                            </span>
                                                            {isCurrent && (
                                                                <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-white/10 text-zinc-300">
                                                                    Current
                                                                </span>
                                                            )}
                                                            {profile.isKids && (
                                                                <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/25">
                                                                    Kids
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-zinc-500 mt-0.5">
                                                            {profile.isKids ? 'Kid-friendly catalog & maturity limits' : 'All maturity ratings'}
                                                        </div>
                                                    </div>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => openEditProfileModal(profile)}
                                                    className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.11] border border-white/[0.09] text-xs font-medium text-zinc-200 hover:text-white transition cursor-pointer shrink-0"
                                                >
                                                    Edit
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        )}

                        {/* SECTION: PREFERENCES */}
                        {activeSection === 'preferences' && (
                            <section className="bg-[#111114] border border-white/[0.08] rounded-2xl overflow-hidden">
                                <div className="px-5 sm:px-6 py-4 border-b border-white/[0.07]">
                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                                        Playback & Privacy
                                    </h3>
                                </div>

                                <div className="divide-y divide-white/[0.07]">
                                    {/* Genres */}
                                    <button
                                        type="button"
                                        onClick={() => setShowGenreModal(true)}
                                        className="w-full px-5 sm:px-6 py-4 hover:bg-white/[0.03] transition flex items-center justify-between gap-4 text-left cursor-pointer group"
                                    >
                                        <div className="flex items-center gap-3.5 min-w-0">
                                            <Sparkles size={18} className="text-zinc-400 group-hover:text-white transition shrink-0" />
                                            <div className="min-w-0">
                                                <div className="text-sm font-medium text-white">Favourite Genres</div>
                                                <div className="text-xs text-zinc-400 truncate mt-0.5">
                                                    {userFavoriteGenres.length > 0
                                                        ? userFavoriteGenres.join(', ')
                                                        : 'Choose genres to tailor recommendations'}
                                                </div>
                                            </div>
                                        </div>
                                        <ChevronRight size={16} className="text-zinc-600 group-hover:text-zinc-300 shrink-0 transition" />
                                    </button>

                                    {/* Data Saver */}
                                    <div className="px-5 sm:px-6 py-4 flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-3.5 min-w-0">
                                            <Wifi size={18} className="text-zinc-400 shrink-0" />
                                            <div>
                                                <div className="text-sm font-medium text-white">Data Saver</div>
                                                <div className="text-xs text-zinc-400 mt-0.5">
                                                    Disable automatic playback on mobile networks to reduce data usage
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            role="switch"
                                            aria-checked={Boolean(currentUser.lowDataMode)}
                                            onClick={handleToggleLowData}
                                            className={`w-11 h-6 rounded-full relative transition-colors cursor-pointer shrink-0 ${currentUser.lowDataMode ? 'bg-brand-red' : 'bg-zinc-700'
                                                }`}
                                        >
                                            <span
                                                className={`block w-4 h-4 bg-white rounded-full shadow transition-transform ${currentUser.lowDataMode ? 'translate-x-6' : 'translate-x-1'
                                                    }`}
                                            />
                                        </button>
                                    </div>

                                    {/* Search History */}
                                    <div className="px-5 sm:px-6 py-4 space-y-3">
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-3.5 min-w-0">
                                                <History size={18} className="text-zinc-400 shrink-0" />
                                                <div>
                                                    <div className="text-sm font-medium text-white">Search History</div>
                                                    <div className="text-xs text-zinc-400 mt-0.5">
                                                        {currentUser.searchHistoryEnabled !== false
                                                            ? 'Save recent searches for faster lookup'
                                                            : 'Paused — searches are not being saved'}
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                role="switch"
                                                aria-checked={currentUser.searchHistoryEnabled !== false}
                                                onClick={handleToggleSearchHistory}
                                                className={`w-11 h-6 rounded-full relative transition-colors cursor-pointer shrink-0 ${currentUser.searchHistoryEnabled !== false ? 'bg-brand-red' : 'bg-zinc-700'
                                                    }`}
                                            >
                                                <span
                                                    className={`block w-4 h-4 bg-white rounded-full shadow transition-transform ${currentUser.searchHistoryEnabled !== false ? 'translate-x-6' : 'translate-x-1'
                                                        }`}
                                                />
                                            </button>
                                        </div>

                                        {savedSearchCount > 0 && (
                                            <div className="pl-8 flex items-center justify-between gap-3 pt-2 border-t border-white/[0.06] text-xs">
                                                <span className="text-zinc-500">
                                                    {savedSearchCount} saved {savedSearchCount === 1 ? 'search' : 'searches'}
                                                </span>
                                                {confirmClearHistory ? (
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setConfirmClearHistory(false)}
                                                            className="px-2.5 py-1 rounded-md text-zinc-400 hover:text-white transition cursor-pointer"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={handleClearSearchHistory}
                                                            className="px-2.5 py-1 rounded-md bg-red-600 hover:bg-red-700 text-white font-medium transition cursor-pointer"
                                                        >
                                                            Confirm Clear
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => setConfirmClearHistory(true)}
                                                        className="text-zinc-400 hover:text-red-400 font-medium inline-flex items-center gap-1.5 transition cursor-pointer"
                                                    >
                                                        <Trash2 size={13} />
                                                        <span>Clear History</span>
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Adblockers & Mobile DNS */}
                                    <button
                                        type="button"
                                        onClick={() => navigate('/adblocker')}
                                        className="w-full px-5 sm:px-6 py-4 hover:bg-white/[0.03] transition flex items-center justify-between gap-4 text-left cursor-pointer group"
                                    >
                                        <div className="flex items-center gap-3.5">
                                            <ShieldCheck size={18} className="text-zinc-400 group-hover:text-white transition shrink-0" />
                                            <div>
                                                <div className="text-sm font-medium text-white">Ad Protection & Private DNS</div>
                                                <div className="text-xs text-zinc-400 mt-0.5">Setup guide for desktop browsers and mobile DNS</div>
                                            </div>
                                        </div>
                                        <ArrowUpRight size={16} className="text-zinc-600 group-hover:text-zinc-300 shrink-0 transition" />
                                    </button>

                                    {/* Sound Enhancements */}
                                    <button
                                        type="button"
                                        onClick={() => navigate('/sound-enhancements')}
                                        className="w-full px-5 sm:px-6 py-4 hover:bg-white/[0.03] transition flex items-center justify-between gap-4 text-left cursor-pointer group"
                                    >
                                        <div className="flex items-center gap-3.5">
                                            <Volume2 size={18} className="text-zinc-400 group-hover:text-white transition shrink-0" />
                                            <div>
                                                <div className="text-sm font-medium text-white">Audio Enhancements</div>
                                                <div className="text-xs text-zinc-400 mt-0.5">Sound booster, dialogue clarity, and equalizer guide</div>
                                            </div>
                                        </div>
                                        <ArrowUpRight size={16} className="text-zinc-600 group-hover:text-zinc-300 shrink-0 transition" />
                                    </button>
                                </div>
                            </section>
                        )}

                        {/* SECTION: MY CONTENT / CONTRIBUTIONS */}
                        {activeSection === 'contributions' && (
                            <section className="bg-[#111114] border border-white/[0.08] rounded-2xl overflow-hidden">
                                <div className="px-5 sm:px-6 py-4 border-b border-white/[0.07]">
                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                                        My Added Content
                                    </h3>
                                </div>
                                <div className="p-4 sm:p-5">
                                    <MyContributions userId={currentUser.uid} />
                                </div>
                            </section>
                        )}

                        {/* SECTION: ADMINISTRATION (Admin Only) */}
                        {activeSection === 'admin' && isAdmin && (
                            <section className="bg-[#111114] border border-white/[0.08] rounded-2xl overflow-hidden">
                                <div className="px-5 sm:px-6 py-4 border-b border-white/[0.07]">
                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                                        Administration
                                    </h3>
                                </div>

                                <div className="divide-y divide-white/[0.07]">
                                    <button
                                        type="button"
                                        onClick={() => navigate('/admin')}
                                        className="w-full px-5 sm:px-6 py-4 hover:bg-white/[0.03] transition flex items-center justify-between gap-4 text-left cursor-pointer group"
                                    >
                                        <div className="flex items-center gap-3.5">
                                            <LayoutDashboard size={18} className="text-zinc-400 group-hover:text-white transition shrink-0" />
                                            <div>
                                                <div className="text-sm font-medium text-white">Admin Console</div>
                                                <div className="text-xs text-zinc-400 mt-0.5">
                                                    Manage catalog, users, analytics, and content requests
                                                </div>
                                            </div>
                                        </div>
                                        <ChevronRight size={16} className="text-zinc-600 group-hover:text-zinc-300 transition" />
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setShowGlobalSettings(true)}
                                        className="w-full px-5 sm:px-6 py-4 hover:bg-white/[0.03] transition flex items-center justify-between gap-4 text-left cursor-pointer group"
                                    >
                                        <div className="flex items-center gap-3.5">
                                            <SlidersHorizontal size={18} className="text-zinc-400 group-hover:text-white transition shrink-0" />
                                            <div>
                                                <div className="text-sm font-medium text-white">Global Site Settings</div>
                                                <div className="text-xs text-zinc-400 mt-0.5">
                                                    Configure branding, stream endpoints, and maintenance mode
                                                </div>
                                            </div>
                                        </div>
                                        <ChevronRight size={16} className="text-zinc-600 group-hover:text-zinc-300 transition" />
                                    </button>
                                </div>
                            </section>
                        )}

                        {/* Mobile Sign Out Footer */}
                        <div className="lg:hidden pt-4 border-t border-white/[0.08] flex items-center justify-between gap-4">
                            <span className="text-xs text-zinc-500">Member since {getMemberSinceDate()}</span>
                            <button
                                type="button"
                                onClick={logout}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.05] hover:bg-red-500/15 border border-white/[0.08] text-xs font-medium text-zinc-300 hover:text-red-400 transition cursor-pointer"
                            >
                                <LogOut size={14} />
                                <span>Sign Out</span>
                            </button>
                        </div>
                    </main>
                </div>
            </div>

            {/* Email Change Modal */}
            {emailModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                    onClick={() => setEmailModalOpen(false)}
                >
                    <form
                        onSubmit={handleSaveEmail}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-md bg-[#111114] border border-white/[0.1] rounded-2xl p-6 shadow-2xl"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-base font-semibold text-white">Update Email Address</h2>
                            <button
                                type="button"
                                onClick={() => setEmailModalOpen(false)}
                                className="text-zinc-400 hover:text-white cursor-pointer"
                                aria-label="Close"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1.5">New Email</label>
                        <input
                            type="email"
                            required
                            value={emailInput}
                            onChange={(e) => setEmailInput(e.target.value)}
                            placeholder="name@example.com"
                            className="w-full bg-black/50 border border-white/[0.12] focus:border-white/40 text-white text-sm px-3.5 py-2.5 rounded-lg outline-none transition"
                        />
                        <div className="mt-5 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setEmailModalOpen(false)}
                                className="px-4 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-white transition cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={emailSaving}
                                className="px-4 py-2 rounded-lg bg-white hover:bg-zinc-200 text-black text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                            >
                                {emailSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Avatar Upload / URL Modal */}
            {avatarModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                    onClick={() => setAvatarModalOpen(false)}
                >
                    <form
                        onSubmit={handleSaveAvatar}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-md bg-[#111114] border border-white/[0.1] rounded-2xl p-6 shadow-2xl"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-base font-semibold text-white">Update Profile Photo</h2>
                            <button
                                type="button"
                                onClick={() => setAvatarModalOpen(false)}
                                className="text-zinc-400 hover:text-white cursor-pointer"
                                aria-label="Close"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="flex flex-col items-center mb-5">
                            <div className="relative">
                                <img
                                    src={avatarInput || '/Mydonkey%20user.jpg'}
                                    alt="Preview"
                                    className="w-24 h-24 rounded-full object-cover border border-white/15 bg-zinc-900"
                                />
                                {avatarCompressing && (
                                    <div className="absolute inset-0 rounded-full bg-black/70 flex items-center justify-center">
                                        <Loader2 size={20} className="text-white animate-spin" />
                                    </div>
                                )}
                            </div>
                            {avatarStats && (
                                <p className="text-[11px] text-emerald-400 font-medium mt-2.5">
                                    Compressed {formatBytes(avatarStats.original)} → {formatBytes(avatarStats.compressed)}
                                </p>
                            )}
                        </div>

                        {/* Upload from device */}
                        <input
                            ref={avatarFileRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0] || null;
                                void handleAvatarFileUpload(file, 'main');
                                e.target.value = '';
                            }}
                        />
                        <button
                            type="button"
                            disabled={avatarCompressing}
                            onClick={() => avatarFileRef.current?.click()}
                            className="w-full py-3 px-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-dashed border-white/20 hover:border-white/35 text-zinc-200 hover:text-white text-xs font-medium flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                        >
                            {avatarCompressing ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                            <span>{avatarCompressing ? 'Compressing image...' : 'Upload Image from Device'}</span>
                        </button>
                        <p className="text-[11px] text-zinc-500 text-center mt-1.5">
                            Automatically compressed in your browser to a tiny size before saving.
                        </p>

                        {/* Optional URL fallback */}
                        <div className="mt-4 pt-4 border-t border-white/[0.08]">
                            <label className="block text-[11px] font-medium text-zinc-500 mb-1.5">Or paste an image URL</label>
                            <input
                                type="text"
                                value={avatarInput.startsWith('data:') ? '' : avatarInput}
                                onChange={(e) => {
                                    setAvatarStats(null);
                                    setAvatarInput(e.target.value);
                                }}
                                placeholder="https://example.com/avatar.jpg"
                                className="w-full bg-black/50 border border-white/[0.12] focus:border-white/40 text-white text-xs px-3.5 py-2.5 rounded-lg outline-none transition"
                            />
                        </div>

                        <div className="mt-5 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setAvatarModalOpen(false)}
                                className="px-4 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-white transition cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={avatarSaving || avatarCompressing || !avatarInput.trim()}
                                className="px-4 py-2 rounded-lg bg-white hover:bg-zinc-200 text-black text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                            >
                                {avatarSaving ? 'Saving...' : 'Save Photo'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Profile Edit / Add Modal */}
            {(isAddingProfile || editingProfile) && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                    onClick={closeProfileModal}
                >
                    <form
                        onSubmit={handleSaveProfile}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-md bg-[#111114] border border-white/[0.1] rounded-2xl p-6 shadow-2xl"
                    >
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-base font-semibold text-white">
                                {isAddingProfile ? 'Add Profile' : 'Edit Profile'}
                            </h2>
                            <button
                                type="button"
                                onClick={closeProfileModal}
                                className="text-zinc-400 hover:text-white cursor-pointer"
                                aria-label="Close"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="flex flex-col items-center mb-5">
                            <div className="relative group">
                                <img
                                    src={profileAvatarInput || '/Mydonkey%20user.jpg'}
                                    alt="Profile avatar"
                                    className="w-20 h-20 rounded-xl object-cover border border-white/15 bg-zinc-900"
                                />
                                <button
                                    type="button"
                                    disabled={profileAvatarCompressing}
                                    onClick={() => profileFileRef.current?.click()}
                                    className="absolute inset-0 rounded-xl bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition cursor-pointer"
                                    title="Upload profile photo"
                                    aria-label="Upload profile photo"
                                >
                                    {profileAvatarCompressing ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
                                </button>
                            </div>
                            <input
                                ref={profileFileRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0] || null;
                                    void handleAvatarFileUpload(file, 'profile');
                                    e.target.value = '';
                                }}
                            />
                            <button
                                type="button"
                                disabled={profileAvatarCompressing}
                                onClick={() => profileFileRef.current?.click()}
                                className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.11] border border-white/[0.09] text-xs font-medium text-zinc-200 hover:text-white transition cursor-pointer disabled:opacity-50"
                            >
                                {profileAvatarCompressing ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                                <span>{profileAvatarCompressing ? 'Compressing...' : 'Upload Photo'}</span>
                            </button>
                            {profileAvatarStats && (
                                <p className="text-[11px] text-emerald-400 font-medium mt-1.5">
                                    Compressed {formatBytes(profileAvatarStats.original)} → {formatBytes(profileAvatarStats.compressed)}
                                </p>
                            )}
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                                    Profile Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={profileNameInput}
                                    onChange={(e) => setProfileNameInput(e.target.value)}
                                    placeholder="e.g. Alex"
                                    className="w-full bg-black/50 border border-white/[0.12] focus:border-white/40 text-white text-sm px-3.5 py-2.5 rounded-lg outline-none transition"
                                />
                            </div>

                            <label className="flex items-center justify-between p-3.5 bg-white/[0.03] border border-white/[0.08] rounded-xl cursor-pointer">
                                <div>
                                    <div className="text-sm font-medium text-white">Kids Profile</div>
                                    <div className="text-xs text-zinc-500">Show family-friendly titles only</div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={profileIsKids}
                                    onChange={(e) => setProfileIsKids(e.target.checked)}
                                    className="w-4 h-4 accent-brand-red cursor-pointer"
                                />
                            </label>

                            {editingProfile && confirmDeleteProfile && (
                                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/25 flex items-center justify-between gap-3">
                                    <span className="text-xs text-red-300">Delete "{editingProfile.name}" permanently?</span>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => setConfirmDeleteProfile(false)}
                                            className="text-xs text-zinc-300 hover:text-white px-2 py-1 cursor-pointer"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            disabled={profileSaving}
                                            onClick={handleConfirmDeleteProfile}
                                            className="text-xs font-semibold bg-red-600 hover:bg-red-700 text-white px-2.5 py-1 rounded-md cursor-pointer"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center justify-between gap-2 pt-2">
                                {editingProfile && !confirmDeleteProfile ? (
                                    <button
                                        type="button"
                                        onClick={() => setConfirmDeleteProfile(true)}
                                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                                    >
                                        <Trash2 size={14} />
                                        <span>Delete</span>
                                    </button>
                                ) : (
                                    <div />
                                )}

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={closeProfileModal}
                                        className="px-4 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-white transition cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={profileSaving}
                                        className="px-4 py-2 rounded-lg bg-white hover:bg-zinc-200 text-black text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                                    >
                                        {profileSaving ? 'Saving...' : 'Save'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            {/* Existing Account Modals */}
            {showDeviceModal && <DeviceManagementModal onClose={() => setShowDeviceModal(false)} />}
            {showGenreModal && <GenrePreferenceModal isOpen={showGenreModal} onClose={() => setShowGenreModal(false)} />}
            {showGlobalSettings && <GlobalSettingsModal isOpen={showGlobalSettings} onClose={() => setShowGlobalSettings(false)} />}
        </div>
    );
};

export default AccountSettings;
