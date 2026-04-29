import React, { useState } from 'react';
import { ChevronDown, ChevronUp, CreditCard, Monitor, User as UserIcon, Plus, Calendar, Camera, Wifi, Settings, PlayCircle, Smartphone, Download, Send, Maximize, X, Trash2, Film } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import PlanSelectionModal from './account/PlanSelectionModal';
import PaymentMethodsModal from './account/PaymentMethodsModal';
import BillingHistoryModal from './account/BillingHistoryModal';
import DeviceManagementModal from './account/DeviceManagementModal';
import MyContributions from './account/MyContributions';

const AccountSettings = ({ setActiveTab }: { setActiveTab: (tab: string) => void }) => {
    const {
        currentUser,
        userProfiles,
        logout,
        addProfile,
        updateProfile,
        deleteProfile,
        plans,
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
    const [showPlanModal, setShowPlanModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showBillingModal, setShowBillingModal] = useState(false);
    const [showDeviceModal, setShowDeviceModal] = useState(false);
    const [requestTitle, setRequestTitle] = useState('');
    const [isRequesting, setIsRequesting] = useState(false);
    const [showContributions, setShowContributions] = useState(false);

    // Profile Management State
    const [editingProfile, setEditingProfile] = useState<any | null>(null);
    const [isAddingProfile, setIsAddingProfile] = useState(false);

    if (!currentUser) return null;

    const currentPlan = plans.find(p => p.name === currentUser.plan) || plans[0];

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
        if (window.confirm("Delete this profile?")) {
            await deleteProfile(id);
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
                            <CreditCard size={16} className="text-red-400" />
                            <span>Cannot subscribe to plans</span>
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
                </div>

                {/* Subscription Banner - Hotstar Gradient */}
                <div className="bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 rounded-2xl p-5 md:p-6 mb-6 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgZmlsbD0iI2ZmZiIgZmlsbC1vcGFjaXR5PSIuMDUiIGN4PSIyMCIgY3k9IjIwIiByPSIyIi8+PC9nPjwvc3ZnPg==')] opacity-30" />
                    <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-bold uppercase tracking-wider text-cyan-200">Current Plan</span>
                                <span className="px-2 py-0.5 bg-white/20 rounded text-[10px] font-bold">{currentPlan?.quality}</span>
                            </div>
                            <div className="text-2xl md:text-3xl font-black">{currentPlan?.name}</div>
                        </div>
                        <button
                            onClick={() => setShowPlanModal(true)}
                            className="px-6 py-2.5 bg-white text-gray-900 rounded-full font-bold text-sm hover:bg-gray-100 transition shadow-lg"
                        >
                            Upgrade
                        </button>
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

                        <button onClick={handlePasswordReset} className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition">
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
                    </div>

                    {/* Subscription Section */}
                    <div className="bg-white/5 rounded-xl overflow-hidden">
                        <div className="px-5 py-3 border-b border-white/5">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Subscription</span>
                        </div>

                        <button onClick={() => setShowPaymentModal(true)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition border-b border-white/5">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                                    <CreditCard size={18} />
                                </div>
                                <div className="text-left">
                                    <div className="font-medium">Payment Methods</div>
                                    <div className="text-xs text-gray-500">•••• 4242</div>
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

                    {/* Preferences Section */}
                    <div className="bg-white/5 rounded-xl overflow-hidden">
                        <div className="px-5 py-3 border-b border-white/5">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Preferences</span>
                        </div>

                        <button onClick={toggleLowDataMode} className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition border-b border-white/5">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                                    <Wifi size={18} />
                                </div>
                                <div className="text-left">
                                    <div className="font-medium">Low Data Mode</div>
                                    <div className="text-xs text-gray-500">Reduce quality to save data. <span className="text-red-400">High Quality uses up to 3GB/hr.</span></div>
                                </div>
                            </div>
                            <div className={`w-12 h-7 rounded-full relative transition-colors ${currentUser.lowDataMode ? 'bg-cyan-500' : 'bg-gray-700'}`}>
                                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all ${currentUser.lowDataMode ? 'left-6' : 'left-1'}`} />
                            </div>
                        </button>

                        <button onClick={() => updateUser({ autoplayEnabled: !currentUser.autoplayEnabled })} className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition border-b border-white/5">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
                                    <PlayCircle size={18} />
                                </div>
                                <div className="text-left">
                                    <div className="font-medium">Autoplay Videos</div>
                                    <div className="text-xs text-gray-500">Auto-start trailers on home</div>
                                </div>
                            </div>
                            <div className={`w-12 h-7 rounded-full relative transition-colors ${currentUser.autoplayEnabled ? 'bg-cyan-500' : 'bg-gray-700'}`}>
                                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all ${currentUser.autoplayEnabled ? 'left-6' : 'left-1'}`} />
                            </div>
                        </button>

                        <button onClick={() => updateUser({ autoFullscreen: !currentUser.autoFullscreen })} className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                                    <Maximize size={18} />
                                </div>
                                <div className="text-left">
                                    <div className="font-medium">Auto Fullscreen</div>
                                    <div className="text-xs text-gray-500">Go fullscreen when video starts</div>
                                </div>
                            </div>
                            <div className={`w-12 h-7 rounded-full relative transition-colors ${currentUser.autoFullscreen ? 'bg-cyan-500' : 'bg-gray-700'}`}>
                                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all ${currentUser.autoFullscreen ? 'left-6' : 'left-1'}`} />
                            </div>
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
                                        src={profile.avatarUrl}
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

                {/* Content Request Section */}


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
                                                if (confirm("Delete this profile?")) {
                                                    await deleteProfile(editingProfile.id);
                                                    setEditingProfile(null);
                                                }
                                            }}
                                            className="px-4 py-3 border border-red-500/50 text-red-500 hover:bg-red-500/10 font-bold rounded-lg transition"
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
            {showPlanModal && <PlanSelectionModal onClose={() => setShowPlanModal(false)} />}
            {showPaymentModal && <PaymentMethodsModal onClose={() => setShowPaymentModal(false)} />}
            {showBillingModal && <BillingHistoryModal onClose={() => setShowBillingModal(false)} />}
            {showDeviceModal && <DeviceManagementModal onClose={() => setShowDeviceModal(false)} />}
        </div >
    );
};

export default AccountSettings;