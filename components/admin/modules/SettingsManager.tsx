import React from 'react';
import { useStore } from '../../../context/StoreContext';
import { Save, AlertTriangle } from 'lucide-react';

const SettingsManager = () => {
    const { settings, updateSettings, content } = useStore();
    const heroContent = content.find(c => c.id === settings.heroContentId);

    return (
        <div className="space-y-8 animate-in fade-in max-w-4xl">
            <h2 className="text-3xl font-bold">System Settings</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* General Settings */}
                <div className="bg-[#141414] p-6 rounded-xl border border-white/5 space-y-6">
                    <h3 className="font-bold text-xl border-b border-white/5 pb-4">Global Config</h3>

                    <div>
                        <label className="text-xs text-gray-500 uppercase font-bold block mb-2">Site Name</label>
                        <input
                            type="text"
                            value={settings.siteName}
                            onChange={(e) => updateSettings({ siteName: e.target.value })}
                            className="w-full bg-black/50 border border-white/10 rounded px-3 py-2 outline-none focus:border-brand-red transition"
                        />
                    </div>

                    <div>
                        <label className="text-xs text-gray-500 uppercase font-bold block mb-2">Contact Email</label>
                        <input
                            type="email"
                            value={settings.contactEmail || ''}
                            onChange={(e) => updateSettings({ contactEmail: e.target.value })}
                            className="w-full bg-black/50 border border-white/10 rounded px-3 py-2 outline-none focus:border-brand-red transition"
                            placeholder="support@mydonkey.in"
                        />
                    </div>

                    <div className="bg-white/5 p-4 rounded-lg flex items-center justify-between">
                        <div>
                            <div className="font-bold text-sm">Maintenance Mode</div>
                            <div className="text-xs text-gray-400">Lock frontend for all users</div>
                        </div>
                        <button
                            onClick={() => updateSettings({ maintenanceMode: !settings.maintenanceMode })}
                            className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${settings.maintenanceMode ? 'bg-red-600' : 'bg-gray-700'}`}
                        >
                            <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ${settings.maintenanceMode ? 'translate-x-6' : 'translate-x-0'}`} />
                        </button>
                    </div>
                </div>

                {/* Hero Configuration */}
                <div className="bg-[#141414] p-6 rounded-xl border border-white/5 space-y-6">
                    <h3 className="font-bold text-xl border-b border-white/5 pb-4">Homepage Hero</h3>

                    <div>
                        <label className="text-xs text-gray-500 uppercase font-bold block mb-2">Current Hero Content</label>
                        {heroContent ? (
                            <div className="flex items-center gap-3 bg-white/5 p-3 rounded border border-white/10">
                                <img src={heroContent.poster_path} className="w-10 h-14 object-cover rounded" />
                                <div>
                                    <div className="font-bold">{heroContent.title}</div>
                                    <div className="text-xs text-gray-500">{heroContent.id}</div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-gray-500 italic text-sm">No hero content selected. Use the star icon in Content Manager.</div>
                        )}
                    </div>

                    <div>
                        <label className="text-xs text-gray-500 uppercase font-bold block mb-2">Website Theme</label>
                        <select
                            value={settings.theme || 'default'}
                            onChange={(e) => updateSettings({ theme: e.target.value as any })}
                            className="w-full bg-black/50 border border-white/10 rounded px-3 py-2 outline-none focus:border-brand-red transition mb-4"
                        >
                            <option value="default">Default Dark (Netflix Style)</option>
                            <option value="luxury">Luxury Gold (Premium)</option>
                        </select>
                        <p className="text-[10px] text-gray-500 mb-6">Select the global visual theme for the website.</p>
                    </div>

                    <div>
                        <label className="text-xs text-gray-500 uppercase font-bold block mb-2">Video playback Quality</label>
                        <select
                            value={settings.heroVideoQuality || 'hd1080'}
                            onChange={(e) => updateSettings({ heroVideoQuality: e.target.value as any })}
                            className="w-full bg-black/50 border border-white/10 rounded px-3 py-2 outline-none focus:border-brand-red transition"
                        >
                            <option value="auto">Auto</option>
                            <option value="hd720">HD 720p</option>
                            <option value="hd1080">Full HD 1080p</option>
                            <option value="highres">4K / High Res</option>
                        </select>
                        <p className="text-[10px] text-gray-500 mt-1">Controls the quality of the YouTube background video.</p>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2 text-yellow-500 bg-yellow-500/10 p-4 rounded border border-yellow-500/20">
                <AlertTriangle size={20} />
                <span className="text-sm">Changes here apply globally and immediately to all users.</span>
            </div>
        </div>
    );
};

export default SettingsManager;
