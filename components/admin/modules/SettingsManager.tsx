import React, { useState, useEffect } from 'react';
import { useStore } from '../../../context/StoreContext';
import { Save, AlertTriangle, Globe, Shield, ShieldCheck, Monitor, CheckCircle, Smartphone, Film, Tv, Link2, RefreshCw, Mail, Star, Trash2, Server, Zap, ExternalLink, Check } from 'lucide-react';
import { SiteSettings, Content, StreamServerKey } from '../../../types';
import { doc, writeBatch } from 'firebase/firestore';
import { db } from '../../../firebase';
import { buildEmbedUrl, parseEmbedContentType, buildServerEmbedUrl, STREAM_SERVERS, getBaseContentServer } from '../../../utils/embedUrl';

const SettingsManager = () => {
    const { settings, updateSettings, content } = useStore();
    const [activeTab, setActiveTab] = useState<'general' | 'media' | 'streaming' | 'system'>('general');

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

    const [isUpdatingBatch, setIsUpdatingBatch] = useState(false);
    const [batchProgress, setBatchProgress] = useState('');

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

    const handleUpdateAllContentUrls = async () => {
        const activeServerKey = formData.baseContentServer || 'bingr';
        const serverObj = STREAM_SERVERS.find(s => s.key === activeServerKey);
        const serverLabel = serverObj ? `${serverObj.name} (${serverObj.tag})` : activeServerKey;

        const itemsToUpdate = content.filter(c => c.imdbId || (c.videoUrl && (c.videoUrl.includes('/embed/') || c.videoUrl.includes('proxy.garageband.rocks') || c.videoUrl.includes('bingr') || c.videoUrl.includes('vidstuck') || c.videoUrl.includes('vidlink'))));
        
        if (itemsToUpdate.length === 0) {
            alert("No content items found with IMDb ID or embed stream URLs to update.");
            return;
        }

        if (!confirm(`Update stream URLs for all ${itemsToUpdate.length} content items to use the base content server "${serverLabel}"?\n\nThis will reformat video URLs to stream via the selected base provider.`)) {
            return;
        }

        setIsUpdatingBatch(true);
        setBatchProgress(`Updating 0 / ${itemsToUpdate.length}...`);

        try {
            let updatedCount = 0;
            // Process in batches of 50
            for (let i = 0; i < itemsToUpdate.length; i += 50) {
                const chunk = itemsToUpdate.slice(i, i + 50);
                const batch = writeBatch(db);

                for (const item of chunk) {
                    const imdbId = item.imdbId || (item.videoUrl ? item.videoUrl.match(/(tt\d+)/)?.[1] : null);
                    const targetId = item.tmdbId || imdbId || item.id;
                    if (targetId) {
                        const existingType = item.videoUrl ? parseEmbedContentType(item.videoUrl) : null;
                        const effectiveType = existingType || (item.type === 'tv' ? (formData.embedTvType || 'tv') : (formData.embedMovieType || 'movie'));
                        
                        let newUrl: string;
                        if (activeServerKey === 'default') {
                            newUrl = buildEmbedUrl(imdbId || targetId, effectiveType, formData);
                        } else {
                            newUrl = buildServerEmbedUrl(targetId, effectiveType, activeServerKey, { settings: formData });
                        }
                        
                        batch.update(doc(db, 'content', item.id), {
                            videoUrl: newUrl,
                            updatedAt: new Date().toISOString()
                        });
                        updatedCount++;
                    }
                }

                await batch.commit();
                setBatchProgress(`Updated ${Math.min(i + 50, itemsToUpdate.length)} / ${itemsToUpdate.length}...`);
            }

            // Also save the settings and bump contentVersion
            await updateSettings({
                ...formData,
                contentVersion: (settings.contentVersion || 0) + 1
            });

            alert(`Success! Updated stream URLs for ${updatedCount} content items to use ${serverLabel}.`);
        } catch (e: any) {
            console.error("Batch update failed:", e);
            alert("Failed to update all items: " + e.message);
        } finally {
            setIsUpdatingBatch(false);
            setBatchProgress('');
        }
    };

    const selectedHeroIds = formData.heroContentIds && formData.heroContentIds.length > 0
        ? formData.heroContentIds
        : (formData.heroContentId ? [formData.heroContentId] : []);

    const selectedHeroItems = selectedHeroIds
        .map(id => content.find(c => c.id === id || String(c.tmdbId) === String(id)))
        .filter(Boolean) as Content[];

    const handleRemoveHeroItem = (id: string) => {
        const next = selectedHeroIds.filter(item => item !== id);
        handleChange({
            heroContentIds: next,
            heroContentId: next[0] || ''
        });
    };

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
            <div className="flex border-b border-white/10 overflow-x-auto">
                <button onClick={() => setActiveTab('general')} className={`px-6 py-3 text-sm font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'general' ? 'border-brand-red text-white' : 'border-transparent text-gray-500 hover:text-white'}`}>
                    <Globe size={16} /> General & Branding
                </button>
                <button onClick={() => setActiveTab('media')} className={`px-6 py-3 text-sm font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'media' ? 'border-brand-red text-white' : 'border-transparent text-gray-500 hover:text-white'}`}>
                    <Monitor size={16} /> Media & Hero
                </button>
                <button onClick={() => setActiveTab('streaming')} className={`px-6 py-3 text-sm font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'streaming' ? 'border-brand-red text-white' : 'border-transparent text-gray-500 hover:text-white'}`}>
                    <Server size={16} /> Content Provider & Streaming
                </button>
                <button onClick={() => setActiveTab('system')} className={`px-6 py-3 text-sm font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'system' ? 'border-brand-red text-white' : 'border-transparent text-gray-500 hover:text-white'}`}>
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
                            <label className="text-xs text-gray-500 uppercase font-bold block mb-2">Public Website URL (Domain)</label>
                            <div className="relative">
                                <Globe className="absolute left-3 top-3.5 text-gray-500" size={16} />
                                <input
                                    type="url"
                                    value={formData.siteUrl || ''}
                                    onChange={(e) => handleChange({ siteUrl: e.target.value })}
                                    placeholder="https://www.mydonkey.in"
                                    className="w-full bg-black/50 border border-white/10 rounded-lg p-3 pl-10 outline-none focus:border-brand-red transition font-mono text-sm"
                                />
                            </div>
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

                        <div className="pt-6 border-t border-white/10">
                            <label className="text-xs text-gray-500 uppercase font-bold block mb-4">Social Media Links</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Facebook URL</label>
                                    <input
                                        type="url"
                                        value={formData.facebookUrl || ''}
                                        onChange={(e) => handleChange({ facebookUrl: e.target.value })}
                                        className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-sm outline-none focus:border-brand-red transition"
                                        placeholder="https://facebook.com/yourpage"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Instagram URL</label>
                                    <input
                                        type="url"
                                        value={formData.instagramUrl || ''}
                                        onChange={(e) => handleChange({ instagramUrl: e.target.value })}
                                        className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-sm outline-none focus:border-brand-red transition"
                                        placeholder="https://instagram.com/yourprofile"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Twitter (X) URL</label>
                                    <input
                                        type="url"
                                        value={formData.twitterUrl || ''}
                                        onChange={(e) => handleChange({ twitterUrl: e.target.value })}
                                        className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-sm outline-none focus:border-brand-red transition"
                                        placeholder="https://twitter.com/yourhandle"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">YouTube URL</label>
                                    <input
                                        type="url"
                                        value={formData.youtubeUrl || ''}
                                        onChange={(e) => handleChange({ youtubeUrl: e.target.value })}
                                        className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-sm outline-none focus:border-brand-red transition"
                                        placeholder="https://youtube.com/@yourchannel"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'media' && (
                    <div className="max-w-2xl space-y-8 animate-in slide-in-from-left-4 duration-300">
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <label className="text-xs text-gray-500 uppercase font-bold flex items-center gap-2">
                                    <Star size={14} className="text-amber-400" fill="currentColor" />
                                    Homepage Hero Carousel ({selectedHeroItems.length} Selected)
                                </label>
                                {selectedHeroItems.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => handleChange({ heroContentIds: [], heroContentId: '' })}
                                        className="text-xs text-gray-500 hover:text-red-400 font-semibold transition flex items-center gap-1"
                                    >
                                        <Trash2 size={12} /> Clear All
                                    </button>
                                )}
                            </div>

                            {selectedHeroItems.length > 0 ? (
                                <div className="space-y-3">
                                    {selectedHeroItems.map((item, index) => (
                                        <div key={item.id} className="flex items-center gap-4 bg-white/5 p-3 rounded-xl border border-white/10 hover:border-white/20 transition">
                                            <span className="text-xs font-mono font-bold text-amber-400 w-6 text-center">
                                                #{index + 1}
                                            </span>
                                            <img 
                                                src={item.poster_path || item.backdrop_path || '/logo.png'} 
                                                className={`w-12 h-16 ${item.poster_path ? 'object-cover' : 'object-contain p-2 bg-white/10'} rounded-lg shadow-lg flex-shrink-0`} 
                                                alt="" 
                                                onError={(e) => {
                                                    const t = e.currentTarget;
                                                    if (!t.src.endsWith('/logo.png')) {
                                                        t.src = '/logo.png';
                                                        t.className = "w-12 h-16 object-contain p-2 bg-white/10 rounded-lg shadow-lg flex-shrink-0";
                                                    }
                                                }}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-sm text-white truncate">{item.title}</div>
                                                <div className="text-xs text-gray-400 mt-0.5">{item.year || item.release_date?.split('-')[0]} • {item.type?.toUpperCase()}</div>
                                                <div className="text-[10px] text-gray-500 font-mono mt-0.5">ID: {item.id}</div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveHeroItem(item.id)}
                                                className="p-2 rounded hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition"
                                                title="Remove from Hero"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    ))}
                                    <p className="text-[11px] text-gray-500 mt-2">
                                        💡 Tip: You can also toggle the ⭐ Star icon on any movie or show in the <span className="text-white font-semibold">Content Library</span> or customize from <span className="text-white font-semibold">Account Settings</span>.
                                    </p>
                                </div>
                            ) : (
                                <div className="p-6 border border-dashed border-white/10 rounded-xl text-center text-gray-500 space-y-2">
                                    <div className="font-bold text-white text-sm">Automatic Top-Rated Dynamic Mode</div>
                                    <div className="text-xs">No specific titles selected. Homepage will automatically display top-rated blockbusters with verified trailers.</div>
                                    <div className="text-xs text-gray-400">
                                        Go to <span className="font-bold text-white">Content Library</span> and click the ⭐ Star on any title, or use <span className="font-bold text-white">Account Settings</span> to feature custom titles.
                                    </div>
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

                        <div className="pt-6 border-t border-white/10">
                            <label className="text-xs text-gray-500 uppercase font-bold block mb-4">Content Loader Overlay</label>
                            <div className="space-y-6">
                                <label className="flex items-center gap-4 cursor-pointer">
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={formData.contentLoaderEnabled || false}
                                            onChange={(e) => handleChange({ contentLoaderEnabled: e.target.checked })}
                                        />
                                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-red rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-red"></div>
                                    </div>
                                    <div>
                                        <div className="font-bold">Enable Premium Loader</div>
                                        <div className="text-xs text-gray-400">Shows a high-class animated loading screen before playing movies or TV shows.</div>
                                    </div>
                                </label>

                                {formData.contentLoaderEnabled && (
                                    <div>
                                        <label className="text-xs text-gray-300 font-bold block mb-2">Loader Duration (Seconds)</label>
                                        <input
                                            type="number"
                                            step="0.5"
                                            min="1"
                                            max="10"
                                            value={formData.contentLoaderDuration || 2.5}
                                            onChange={(e) => handleChange({ contentLoaderDuration: parseFloat(e.target.value) })}
                                            className="w-full bg-black/50 border border-white/10 rounded-lg p-3 outline-none focus:border-brand-red transition"
                                        />
                                        <p className="text-[10px] text-gray-500 mt-2">Recommended: 2.5 seconds. Allows users to read the dynamic connection phrases.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="pt-6 border-t border-white/10">
                            <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 rounded-lg bg-brand-red/10 text-brand-red">
                                        <Server size={20} />
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-white">Content Provider & Streaming Settings</div>
                                        <div className="text-[11px] text-gray-400">
                                            Currently streaming via <span className="text-brand-red font-semibold">{STREAM_SERVERS.find(s => s.key === (formData.baseContentServer || 'bingr'))?.name || 'Bingr'}</span>. Configure base server, custom domains, and live previews in the dedicated tab.
                                        </div>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('streaming')}
                                    className="px-3.5 py-2 rounded-lg bg-brand-red/20 hover:bg-brand-red/30 text-xs font-bold text-red-200 hover:text-white transition whitespace-nowrap self-start sm:self-auto flex items-center gap-1.5"
                                >
                                    <span>Manage Providers</span> →
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'streaming' && (
                    <div className="max-w-4xl space-y-8 animate-in slide-in-from-left-4 duration-300">
                        {/* Section Header */}
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Server className="text-brand-red" size={20} />
                                <h3 className="text-lg font-bold text-white">Base Content Provider Server</h3>
                            </div>
                            <p className="text-xs text-gray-400">
                                Choose the primary content provider engine used to stream movies and TV series across My Donkey OTT. All users and media players will default to this content provider.
                            </p>
                        </div>

                        {/* Current Active Banner */}
                        {(() => {
                            const activeKey = formData.baseContentServer || 'bingr';
                            const activeServerObj = STREAM_SERVERS.find(s => s.key === activeKey);
                            return (
                                <div className="p-4 rounded-xl bg-brand-red/10 border border-brand-red/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-brand-red/20 flex items-center justify-center text-brand-red font-bold shrink-0">
                                            <Zap size={20} />
                                        </div>
                                        <div>
                                            <div className="text-xs text-brand-red uppercase font-bold tracking-wider">Active Base Provider</div>
                                            <div className="text-base font-bold text-white flex items-center gap-2">
                                                <span>{activeServerObj?.name || activeKey}</span>
                                                <span className="text-xs px-2 py-0.5 rounded bg-brand-red/30 text-red-200 font-semibold">{activeServerObj?.tag}</span>
                                            </div>
                                            <div className="text-xs text-gray-400 mt-0.5">{activeServerObj?.description}</div>
                                        </div>
                                    </div>
                                    <div className="text-left sm:text-right shrink-0">
                                        <span className="text-[11px] text-gray-400 block font-medium">Automatic Failover:</span>
                                        <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1 sm:justify-end">
                                            <CheckCircle size={13} /> Multi-Server Fallback Enabled
                                        </span>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Server Selection Cards */}
                        <div className="space-y-3">
                            <label className="text-xs text-gray-400 uppercase font-bold block">
                                Select Primary Streaming Server
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {STREAM_SERVERS.map((server) => {
                                    const isSelected = (formData.baseContentServer || 'bingr') === server.key;
                                    return (
                                        <div
                                            key={server.key}
                                            onClick={() => handleChange({ baseContentServer: server.key })}
                                            className={`p-4 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                                                isSelected
                                                    ? 'border-brand-red bg-brand-red/10 ring-1 ring-brand-red shadow-lg shadow-red-950/30'
                                                    : 'border-white/10 bg-black/40 hover:border-white/25 hover:bg-white/5'
                                            }`}
                                        >
                                            <div>
                                                <div className="flex items-start justify-between gap-2 mb-2">
                                                    <div>
                                                        <div className="font-bold text-sm text-white flex items-center gap-1.5">
                                                            <span>{server.name}</span>
                                                            {isSelected && (
                                                                <span className="w-2 h-2 rounded-full bg-brand-red animate-pulse" />
                                                            )}
                                                        </div>
                                                        <span className="inline-block mt-0.5 text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-white/10 text-gray-300">
                                                            {server.tag}
                                                        </span>
                                                    </div>
                                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                                                        isSelected ? 'bg-brand-red text-white' : 'border border-white/20 text-transparent'
                                                    }`}>
                                                        <Check size={12} strokeWidth={3} />
                                                    </div>
                                                </div>
                                                <p className="text-xs text-gray-400 leading-relaxed mb-3">
                                                    {server.description}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-1.5 pt-2 border-t border-white/5 text-[10px] text-gray-500">
                                                {server.supports4K && <span className="text-amber-400 font-bold">4K UHD</span>}
                                                {server.hasSubtitles && <span>• Subtitles</span>}
                                                {server.isAnime && <span className="text-purple-400 font-bold">Anime Dub/Sub</span>}
                                                {!server.supports4K && !server.isAnime && <span>Ultra-Fast CDN</span>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Base Server Domain / URL Configuration */}
                        <div className="bg-black/40 p-6 rounded-xl border border-white/5 space-y-4">
                            <div className="flex items-center gap-2 mb-1">
                                <Link2 size={16} className="text-blue-400" />
                                <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                                    Base Provider Server URL & Mirror Settings
                                </h4>
                            </div>
                            <p className="text-xs text-gray-400">
                                Specify a custom domain or mirror proxy for the active base server (leave blank to use the official high-speed default endpoint).
                            </p>

                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs text-gray-300 uppercase font-bold block mb-1">
                                        Custom Base Server URL / Mirror (Optional)
                                    </label>
                                    <input
                                        type="url"
                                        value={formData.baseContentServerUrl || ''}
                                        onChange={(e) => handleChange({ baseContentServerUrl: e.target.value })}
                                        placeholder={
                                            formData.baseContentServer === 'vidstuck' ? 'https://vidstuck.xyz' :
                                            formData.baseContentServer === 'nxsha' ? 'https://nxsha.space' :
                                            formData.baseContentServer === 'zxc' ? 'https://zxcstream.xyz' :
                                            formData.baseContentServer === 'vidlink' ? 'https://vidlink.pro' :
                                            formData.baseContentServer === 'vidnest' ? 'https://vidnest.fun' :
                                            formData.baseContentServer === 'default' ? 'https://proxy.garageband.rocks' :
                                            'https://bingr.one'
                                        }
                                        className="w-full bg-black/60 border border-white/10 rounded-lg p-3 text-sm font-mono text-white outline-none focus:border-brand-red transition"
                                    />
                                    <p className="text-[10px] text-gray-500 mt-1">
                                        Leave empty to use standard high-availability cloud endpoints for {STREAM_SERVERS.find(s => s.key === (formData.baseContentServer || 'bingr'))?.name}.
                                    </p>
                                </div>

                                {formData.baseContentServer === 'default' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                        <div className="bg-white/5 p-3.5 rounded-lg border border-white/5">
                                            <div className="flex items-center gap-2 mb-2 text-white font-bold text-xs">
                                                <Film size={14} className="text-blue-400" /> Movie Path Segment
                                            </div>
                                            <input
                                                type="text"
                                                value={formData.embedMovieType ?? 'movie'}
                                                onChange={(e) => handleChange({ embedMovieType: e.target.value })}
                                                className="w-full bg-black/60 border border-white/10 rounded p-2 text-sm font-mono text-white outline-none focus:border-blue-500 transition mb-1"
                                                placeholder="movie"
                                            />
                                        </div>
                                        <div className="bg-white/5 p-3.5 rounded-lg border border-white/5">
                                            <div className="flex items-center gap-2 mb-2 text-white font-bold text-xs">
                                                <Tv size={14} className="text-purple-400" /> TV Series Path Segment
                                            </div>
                                            <input
                                                type="text"
                                                value={formData.embedTvType ?? 'tv'}
                                                onChange={(e) => handleChange({ embedTvType: e.target.value })}
                                                className="w-full bg-black/60 border border-white/10 rounded p-2 text-sm font-mono text-white outline-none focus:border-purple-500 transition mb-1"
                                                placeholder="tv"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Live URL Previews & Testing */}
                        <div className="bg-black/40 p-6 rounded-xl border border-white/5 space-y-4">
                            <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                <Monitor size={16} className="text-amber-400" />
                                <span>Live Generated Stream Previews</span>
                            </h4>

                            {(() => {
                                const activeKey = formData.baseContentServer || 'bingr';
                                const moviePreviewUrl = buildServerEmbedUrl(27205, 'movie', activeKey, { settings: formData });
                                const tvPreviewUrl = buildServerEmbedUrl(1396, 'tv', activeKey, { season: 1, episode: 1, settings: formData });

                                return (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                                                    <Film size={14} /> Movie Stream URL Preview
                                                </span>
                                                <a
                                                    href={moviePreviewUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-[11px] text-gray-400 hover:text-white flex items-center gap-1 underline"
                                                >
                                                    Test <ExternalLink size={12} />
                                                </a>
                                            </div>
                                            <div className="text-[11px] text-gray-300 font-mono break-all bg-black/60 p-2.5 rounded-lg border border-white/5">
                                                {moviePreviewUrl}
                                            </div>
                                            <div className="text-[10px] text-gray-500">Sample: Inception (TMDB 27205)</div>
                                        </div>

                                        <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                                                    <Tv size={14} /> TV Show Stream URL Preview
                                                </span>
                                                <a
                                                    href={tvPreviewUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-[11px] text-gray-400 hover:text-white flex items-center gap-1 underline"
                                                >
                                                    Test <ExternalLink size={12} />
                                                </a>
                                            </div>
                                            <div className="text-[11px] text-gray-300 font-mono break-all bg-black/60 p-2.5 rounded-lg border border-white/5">
                                                {tvPreviewUrl}
                                            </div>
                                            <div className="text-[10px] text-gray-500">Sample: Breaking Bad S1:E1 (TMDB 1396)</div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Embed Ad Shield Configuration */}
                        <div className="p-5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <ShieldCheck size={20} className="text-emerald-400 shrink-0" />
                                    <div>
                                        <div className="text-xs font-bold text-white">Embed Ad Shield (Anti-Popup & Anti-Redirect)</div>
                                        <div className="text-[10px] text-gray-400">
                                            Restricts external video player embeds via HTML5 sandbox to completely block popup windows, new tabs, and site hijacking redirects.
                                        </div>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
                                    <input
                                        type="checkbox"
                                        checked={formData.enableAdShield !== false}
                                        onChange={(e) => handleChange({ enableAdShield: e.target.checked })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                                </label>
                            </div>
                            {formData.enableAdShield !== false && (
                                <div className="flex items-center justify-between pt-2 border-t border-emerald-500/10 text-xs">
                                    <span className="text-gray-300 font-medium text-[11px]">Default Protection Level:</span>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleChange({ adShieldMode: 'strict' })}
                                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${formData.adShieldMode !== 'standard' ? 'bg-emerald-500 text-black shadow-sm' : 'bg-white/5 text-gray-400 hover:text-white'}`}
                                        >
                                            Strict (Zero Popups)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleChange({ adShieldMode: 'standard' })}
                                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${formData.adShieldMode === 'standard' ? 'bg-emerald-500 text-black shadow-sm' : 'bg-white/5 text-gray-400 hover:text-white'}`}
                                        >
                                            Standard
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Batch Update Button */}
                        <div className="bg-black/40 p-5 rounded-xl border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                                    <RefreshCw size={14} className="text-brand-red" />
                                    <span>Sync All Existing Content in Database</span>
                                </div>
                                <div className="text-[10px] text-gray-400 mt-0.5">
                                    Batch updates all movies and TV shows in Firestore to use the selected base provider server URL format.
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleUpdateAllContentUrls}
                                disabled={isUpdatingBatch}
                                className="px-4 py-2.5 bg-brand-red hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition disabled:opacity-50 whitespace-nowrap shadow-lg shadow-red-950/20"
                            >
                                <RefreshCw size={14} className={isUpdatingBatch ? 'animate-spin' : ''} />
                                {isUpdatingBatch ? (batchProgress || 'Updating...') : 'Apply Base Server to All Content'}
                            </button>
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
                            <label className="text-xs text-gray-500 uppercase font-bold block mb-2">Global Exclusive Code</label>
                            <div className="relative">
                                <Shield className="absolute left-3 top-3.5 text-gray-500" size={16} />
                                <input
                                    type="text"
                                    value={formData.globalExclusiveCode || ''}
                                    onChange={(e) => handleChange({ globalExclusiveCode: e.target.value })}
                                    className="w-full bg-black/50 border border-white/10 rounded-lg p-3 pl-10 outline-none focus:border-brand-red transition font-mono tracking-widest"
                                    placeholder="e.g. SECRET123"
                                />
                            </div>
                            <p className="text-[10px] text-gray-400 mt-2">
                                Single universal code required for users to unlock all content marked as <span className="text-brand-red font-bold">Exclusive</span>.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SettingsManager;
