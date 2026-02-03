
import React, { useState } from 'react';
import { ChevronDown, ChevronUp, CreditCard, Monitor, User as UserIcon, Plus, Calendar, Camera, Wifi, Settings } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import PlanSelectionModal from './account/PlanSelectionModal';
import PaymentMethodsModal from './account/PaymentMethodsModal';
import BillingHistoryModal from './account/BillingHistoryModal';
import DeviceManagementModal from './account/DeviceManagementModal';

const AccountSettings = ({ setActiveTab }: { setActiveTab: (tab: string) => void }) => {
    const {
        currentUser,
        userProfiles,
        logout,
        addProfile,
        deleteProfile,
        plans,
        updateUserEmail,
        triggerPasswordReset,
        updateProfileAvatar,
        updateUser
    } = useStore();

    const [expandedProfile, setExpandedProfile] = useState<string | null>(null);
    const [showPlanModal, setShowPlanModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showBillingModal, setShowBillingModal] = useState(false);
    const [showDeviceModal, setShowDeviceModal] = useState(false);

    if (!currentUser) return null;

    const currentPlan = plans.find(p => p.name === currentUser.plan) || plans[0];

    const toggleProfile = (id: string) => {
        setExpandedProfile(expandedProfile === id ? null : id);
    };

    const handleAddProfile = async () => {
        const name = prompt("Enter profile name:");
        if (name) {
            const isKids = window.confirm("Is this a kid's profile?");
            await addProfile(name, isKids, "https://wallpapers.com/images/hd/netflix-profile-pictures-1000-x-1000-qo9h82134t9nv0j0.jpg");
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
        const url = prompt("Enter image URL for avatar:", "https://wallpapers.com/images/hd/netflix-profile-pictures-1000-x-1000-qo9h82134t9nv0j0.jpg");
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
            if (!currentUser.lastLoginAt) return new Date().toLocaleDateString();
            const d = new Date(currentUser.lastLoginAt);
            if (isNaN(d.getTime())) return 'Recently';
            return d.toLocaleDateString();
        } catch (e) {
            return 'Recently';
        }
    };

    return (
        <div className="min-h-screen bg-[#141414] text-white font-sans animate-in fade-in">

            {/* Account Page Header */}
            <div className="max-w-[1024px] mx-auto pt-24 pb-8 px-4 md:px-5 lg:px-0 border-b border-white/10">
                <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Account</h1>
                        <div className="flex items-center gap-2 text-sm text-gray-400 font-medium">
                            <Monitor size={16} />
                            <span>Member Since {getMemberSinceDate()}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right hidden md:block">
                            <div className="text-xs text-gray-500 uppercase font-bold">Current Plan</div>
                            <div className="font-bold text-red-500">{currentPlan?.name}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-[1024px] mx-auto px-4 md:px-5 lg:px-0 pb-20 mt-8">

                {/* Section: Membership & Billing */}
                <div className="flex flex-col md:flex-row border-b border-white/10 py-8 gap-8">
                    <div className="w-full md:w-[280px]">
                        <h2 className="text-gray-400 text-lg font-medium uppercase tracking-wide mb-4">Membership & Billing</h2>
                        <button onClick={logout} className="bg-white/10 hover:bg-white/20 text-white text-sm font-bold py-3 px-6 rounded shadow-sm w-full transition">
                            Sign Out
                        </button>
                    </div>

                    <div className="flex-1 space-y-4">
                        <div className="bg-black/40 p-4 rounded-lg border border-white/5">
                            <div className="flex justify-between items-center mb-1">
                                <div className="font-bold text-lg">{currentUser.email}</div>
                                <button onClick={handleChangeEmail} className="text-blue-400 hover:text-blue-300 text-sm font-medium">Change email</button>
                            </div>
                            <div className="flex justify-between items-center text-sm text-gray-400">
                                <div>Password: ********</div>
                                <button onClick={handlePasswordReset} className="text-blue-400 hover:text-blue-300 font-medium">Change password</button>
                            </div>
                        </div>

                        <div className="bg-black/40 p-4 rounded-lg border border-white/5 space-y-4">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3 font-bold">
                                    <div className="bg-white p-1 rounded text-black">
                                        <CreditCard size={20} />
                                    </div>
                                    <span className="text-gray-200">•••• •••• •••• 4242</span>
                                </div>
                                <button onClick={() => setShowPaymentModal(true)} className="text-blue-400 hover:text-blue-300 text-sm font-medium">Manage payment info</button>
                            </div>
                            <div className="border-t border-white/10 pt-4 flex justify-between items-center">
                                <div className="text-gray-400 text-sm">Next Billing Date: <span className="text-white font-bold ml-1">Nov 23, 2025</span></div>
                                <button onClick={() => setShowBillingModal(true)} className="text-blue-400 hover:text-blue-300 text-sm font-medium">Billing details</button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section: Plan Details */}
                <div className="flex flex-col md:flex-row border-b border-white/10 py-8 gap-8">
                    <div className="w-full md:w-[280px]">
                        <h2 className="text-gray-400 text-lg font-medium uppercase tracking-wide">Plan Details</h2>
                    </div>
                    <div className="flex-1 flex justify-between items-center bg-black/40 p-4 rounded-lg border border-white/5">
                        <div className="flex items-center gap-3">
                            <span className="font-bold text-xl text-white">{currentUser.plan}</span>
                            {currentPlan && (
                                <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase">{currentPlan.quality}</span>
                            )}
                        </div>
                        <button onClick={() => setShowPlanModal(true)} className="text-blue-400 hover:text-blue-300 text-sm font-bold">Change plan</button>
                    </div>
                </div>

                {/* Section: App Settings (Low Data Mode) */}
                <div className="flex flex-col md:flex-row border-b border-white/10 py-8 gap-8">
                    <div className="w-full md:w-[280px]">
                        <h2 className="text-gray-400 text-lg font-medium uppercase tracking-wide">App Settings</h2>
                    </div>
                    <div className="flex-1 bg-black/40 p-4 rounded-lg border border-white/5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`p - 2 rounded - full ${currentUser.lowDataMode ? 'bg-yellow-500/20 text-yellow-500' : 'bg-gray-800 text-gray-400'} `}>
                                    <Wifi size={20} />
                                </div>
                                <div>
                                    <div className="font-bold text-white">Low Data Mode</div>
                                    <div className="text-xs text-gray-400">Reduces video quality to save data. Disables autoplay.</div>
                                </div>
                            </div>
                            <button
                                onClick={toggleLowDataMode}
                                className={`w - 12 h - 6 rounded - full relative transition - colors duration - 300 ${currentUser.lowDataMode ? 'bg-green-500' : 'bg-gray-700'} `}
                            >
                                <div className={`absolute top - 1 w - 4 h - 4 rounded - full bg - white transition - all duration - 300 ${currentUser.lowDataMode ? 'left-7' : 'left-1'} `} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Section: Profile & Parental Controls */}
                <div className="flex flex-col md:flex-row py-8 border-b border-white/10 gap-8">
                    <div className="w-full md:w-[280px]">
                        <h2 className="text-gray-400 text-lg font-medium uppercase tracking-wide">Profiles</h2>
                    </div>
                    <div className="flex-1">
                        <div className="space-y-4">
                            {userProfiles.map(profile => (
                                <div key={profile.id} className="bg-black/40 rounded-lg border border-white/5 overflow-hidden">
                                    <div
                                        className="flex justify-between items-center cursor-pointer group p-4 hover:bg-white/5 transition"
                                        onClick={() => toggleProfile(profile.id)}
                                    >
                                        <div className="flex items-center gap-4">
                                            <img src={profile.avatarUrl} className="w-12 h-12 rounded" alt="avatar" />
                                            <div>
                                                <div className="font-bold text-white group-hover:text-red-500 transition">{profile.name}</div>
                                                <div className="text-xs text-gray-400">{profile.isKids ? 'Kids Profile' : 'All Maturity Ratings'}</div>
                                            </div>
                                        </div>
                                        <div className="text-gray-500 group-hover:text-white transition transform duration-200">
                                            {expandedProfile === profile.id ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                                        </div>
                                    </div>

                                    {expandedProfile === profile.id && (
                                        <div className="px-4 pb-4 pt-2 bg-black/20 border-t border-white/5 space-y-3 animate-in slide-in-from-top-2 duration-200">
                                            <div className="flex justify-between items-center py-2 border-b border-white/5">
                                                <div className="flex items-center gap-3">
                                                    <Camera size={16} className="text-gray-400" />
                                                    <div className="font-bold text-sm text-gray-300">Profile Picture</div>
                                                </div>
                                                <button onClick={handleChangeAvatar} className="text-blue-400 text-sm hover:underline">Change</button>
                                            </div>

                                            <div className="flex justify-between items-center py-2 border-b border-white/5">
                                                <div className="flex items-center gap-3">
                                                    <Settings size={16} className="text-gray-400" />
                                                    <div>
                                                        <div className="font-bold text-sm text-gray-300">Maturity Settings</div>
                                                        <div className="text-xs text-gray-500">{profile.isKids ? 'Kids Content Only' : 'All Content'}</div>
                                                    </div>
                                                </div>
                                                <button onClick={() => alert("Feature coming soon")} className="text-blue-400 text-sm hover:underline">Change</button>
                                            </div>

                                            <div className="flex justify-between items-center pt-2">
                                                <button onClick={() => handleDeleteProfile(profile.id)} className="text-red-500 text-sm hover:text-red-400 font-bold">Delete Profile</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {userProfiles.length < 5 && (
                                <div className="pt-2">
                                    <button
                                        onClick={handleAddProfile}
                                        className="flex items-center gap-2 text-gray-300 font-bold text-sm hover:bg-white/10 px-4 py-3 rounded transition w-full justify-center border border-white/10 border-dashed"
                                    >
                                        <Plus size={18} /> Add Profile
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Section: Settings */}
                <div className="flex flex-col md:flex-row py-8 mt-4 gap-8">
                    <div className="w-full md:w-[280px]">
                        <h2 className="text-gray-400 text-lg font-medium uppercase tracking-wide">Quick Links</h2>
                    </div>
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button onClick={() => setShowDeviceModal(true)} className="p-4 bg-black/40 border border-white/5 rounded-lg text-left hover:bg-white/5 transition group">
                            <div className="font-bold text-gray-200 group-hover:text-blue-400">Manage download devices</div>
                            <div className="text-xs text-gray-500 mt-1">Control where you can watch offline</div>
                        </button>
                        <button onClick={() => setActiveTab('activate')} className="p-4 bg-black/40 border border-white/5 rounded-lg text-left hover:bg-white/5 transition group">
                            <div className="font-bold text-gray-200 group-hover:text-blue-400">Activate a device</div>
                            <div className="text-xs text-gray-500 mt-1">Connect your TV to this account</div>
                        </button>
                        <button onClick={() => setShowDeviceModal(true)} className="p-4 bg-black/40 border border-white/5 rounded-lg text-left hover:bg-white/5 transition group">
                            <div className="font-bold text-gray-200 group-hover:text-blue-400">Sign out of all devices</div>
                            <div className="text-xs text-gray-500 mt-1">Security check for your account</div>
                        </button>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {showPlanModal && <PlanSelectionModal onClose={() => setShowPlanModal(false)} />}
            {showPaymentModal && <PaymentMethodsModal onClose={() => setShowPaymentModal(false)} />}
            {showBillingModal && <BillingHistoryModal onClose={() => setShowBillingModal(false)} />}
            {showDeviceModal && <DeviceManagementModal onClose={() => setShowDeviceModal(false)} />}
        </div>
    );
};

export default AccountSettings;