import React, { useState, useEffect } from 'react';
import { useStore } from '../../../context/StoreContext';
import { Save, AlertTriangle, Globe, Shield, Mail, Monitor, CheckCircle, Bell, Smartphone } from 'lucide-react';
import { SiteSettings } from '../../../types';

const SettingsManager = () => {
    const { settings, updateSettings, content } = useStore();
    const [activeTab, setActiveTab] = useState<'general' | 'media' | 'system'>('general');

    // Local state for changes before saving
    const [formData, setFormData] = useState<SiteSettings>(settings);
    const [isDirty, setIsDirty] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

    // Sync from store on mount
    useEffect(() => {
        setFormData(settings);
    }, [settings]);

    const handleChange = (updates: Partial<SiteSettings>) => {
        setFormData(prev => ({ ...prev, ...updates }));
        setIsDirty(true);
        setSaveStatus('idle');
    };

    const handleSave = async () => {
        setSaveStatus('saving');
        try {
            await updateSettings(formData);
            setSaveStatus('saved');
            setIsDirty(false);
            setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (e) {
            alert("Failed to save settings");
            setSaveStatus('idle');
        }
    };

    const heroContent = content.find(c => c.id === formData.heroContentId);

    return (
        <div className="space-y-6 animate-in fade-in pb-20 max-w-5xl">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold">System Configuration</h2>
                    <p className="text-gray-400 mt-1">Manage global site settings and parameters.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={!isDirty || saveStatus === 'saving'}
                    className={`px-6 py-2 rounded font-bold flex items-center gap-2 transition shadow-lg ${saveStatus === 'saved' ? 'bg-green-600 text-white' :
                            isDirty ? 'bg-brand-red hover:bg-red-700 text-white shadow-red-900/20' :
                                'bg-white/10 text-gray-500 cursor-not-allowed'
                        }`}
                >
                    {saveStatus === 'saving' ? <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" /> :
                        saveStatus === 'saved' ? <CheckCircle size={20} /> :
                            <Save size={20} />}
                    {saveStatus === 'saved' ? 'Changes Saved' : 'Save Changes'}
                </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/10">
                <button onClick={() => setActiveTab('general')} className={`px-6 py-3 text-sm font-bold border-b-2 transition flex items-center gap-2 ${activeTab === 'general' ? 'border-brand-red text-white' : 'border-transparent text-gray-500 hover:text-white'}`}>
                    <Globe size={16} /> General & Branding
                </button>
                <button onClick={() => setActiveTab('media')} className={`px-6 py-3 text-sm font-bold border-b-2 transition flex items-center gap-2 ${activeTab === 'media' ? 'border-brand-red text-white' : 'border-transparent text-gray-500 hover:text-white'}`}>
                    <Monitor size={16} /> Media & Hero
                </button>
                <button onClick={() => setActiveTab('system')} className={`px-6 py-3 text-sm font-bold border-b-2 transition flex items-center gap-2 ${activeTab === 'system' ? 'border-brand-red text-white' : 'border-transparent text-gray-500 hover:text-white'}`}>
                    <Shield size={16} /> System & Security
                </button>
            </div>

            <div className="bg-[#141414] rounded-xl border border-white/5 p-8 min-h-[400px]">
                {activeTab === 'general' && (
                    <div className="max-w-2xl space-y-8 animate-in slide-in-from-left-4 duration-300">
                        <div>
                            <label className="text-xs text-gray-500 uppercase font-bold block mb-2">Website Name</label>
                            <input
                                type="text"
                                value={formData.siteName}
                                onChange={(e) => handleChange({ siteName: e.target.value })}
                                className="w-full bg-black/50 border border-white/10 rounded-lg p-3 outline-none focus:border-brand-red transition font-bold text-lg"
                            />
                        </div>

                        <div>
                            <label className="text-xs text-gray-500 uppercase font-bold block mb-2">Contact & Support Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3.5 text-gray-500" size={16} />
                                <input
                                    type="email"
                                    value={formData.contactEmail || ''}
                                    onChange={(e) => handleChange({ contactEmail: e.target.value })}
                                    className="w-full bg-black/50 border border-white/10 rounded-lg p-3 pl-10 outline-none focus:border-brand-red transition"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs text-gray-500 uppercase font-bold block mb-3">Visual Information</label>
                            <div className="grid grid-cols-2 gap-4">
                                <div
                                    onClick={() => handleChange({ theme: 'default' })}
                                    className={`cursor-pointer p-4 rounded-lg border-2 transition ${formData.theme === 'default' ? 'border-brand-red bg-brand-red/5' : 'border-white/5 bg-black/50 hover:bg-white/5'}`}
                                >
                                    <div className="font-bold mb-1">Netflix Dark</div>
                                    <div className="text-xs text-gray-500">Classic dark mode with red accents. High contrast.</div>
                                </div>
                                <div
                                    onClick={() => handleChange({ theme: 'luxury' })}
                                    className={`cursor-pointer p-4 rounded-lg border-2 transition ${formData.theme === 'luxury' ? 'border-brand-red bg-brand-red/5' : 'border-white/5 bg-black/50 hover:bg-white/5'}`}
                                >
                                    <div className="font-bold mb-1">Luxury Gold</div>
                                    <div className="text-xs text-gray-500">Premium feel with gold/black palette. Elegant typography.</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'media' && (
                    <div className="max-w-2xl space-y-8 animate-in slide-in-from-left-4 duration-300">
                        <div>
                            <label className="text-xs text-gray-500 uppercase font-bold block mb-4">Homepage Hero Content</label>
                            {heroContent ? (
                                <div className="flex items-start gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
                                    <img src={heroContent.poster_path} className="w-16 h-24 object-cover rounded-lg shadow-lg" alt="" />
                                    <div className="flex-1">
                                        <div className="font-bold text-lg mb-1">{heroContent.title}</div>
                                        <div className="text-xs text-gray-400 mb-3">{heroContent.overview.substring(0, 100)}...</div>
                                        <div className="text-[10px] text-gray-500 uppercase font-mono">ID: {heroContent.id}</div>
                                    </div>
                                    <button onClick={() => alert("Go to Content Library to change selection.")} className="text-xs text-blue-400 hover:text-white font-bold">Change</button>
                                </div>
                            ) : (
                                <div className="p-6 border border-dashed border-white/10 rounded-xl text-center text-gray-500">
                                    No content selected as Hero. Go to <span className="font-bold text-white">Content Library</span> to set one.
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="text-xs text-gray-500 uppercase font-bold block mb-2">Hero Video Quality</label>
                            <select
                                value={formData.heroVideoQuality || 'hd1080'}
                                onChange={(e) => handleChange({ heroVideoQuality: e.target.value as any })}
                                className="w-full bg-black/50 border border-white/10 rounded-lg p-3 outline-none focus:border-brand-red transition"
                            >
                                <option value="auto">Auto (Adaptive)</option>
                                <option value="hd720">HD 720p</option>
                                <option value="hd1080">Full HD 1080p</option>
                                <option value="highres">4K / High Res</option>
                            </select>
                            <p className="text-[10px] text-gray-500 mt-2">Forces a specific quality for the background video on desktop. Mobile always uses optimized quality.</p>
                        </div>
                    </div>
                )}

                {activeTab === 'system' && (
                    <div className="max-w-2xl space-y-8 animate-in slide-in-from-left-4 duration-300">
                        <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-xl">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="font-bold text-red-500 flex items-center gap-2 mb-1">
                                        <AlertTriangle size={18} /> Maintenance Mode
                                    </div>
                                    <div className="text-xs text-red-200/70">
                                        When active, only admins can access the site. Users will see a "Under Maintenance" page.
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" checked={formData.maintenanceMode} onChange={(e) => handleChange({ maintenanceMode: e.target.checked })} />
                                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-red-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                                </label>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs text-gray-500 uppercase font-bold block mb-4">Notification Settings (Global)</label>
                            <div className="space-y-3">
                                <label className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/5 cursor-pointer">
                                    <input type="checkbox" className="accent-brand-red w-4 h-4" defaultChecked />
                                    <div className="flex-1">
                                        <div className="text-sm font-bold">Email Notifications</div>
                                        <div className="text-[10px] text-gray-500">Send critical alerts to admin email</div>
                                    </div>
                                    <Mail size={16} className="text-gray-500" />
                                </label>
                                <label className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/5 cursor-pointer">
                                    <input type="checkbox" className="accent-brand-red w-4 h-4" defaultChecked />
                                    <div className="flex-1">
                                        <div className="text-sm font-bold">Push Notifications</div>
                                        <div className="text-[10px] text-gray-500">Enable browser push notifications for announcements</div>
                                    </div>
                                    <Bell size={16} className="text-gray-500" />
                                </label>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SettingsManager;
