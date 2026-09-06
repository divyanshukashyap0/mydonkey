import React, { useState, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import {
    Globe,
    Film,
    Tv,
    Shield,
    AlertTriangle,
    CheckCircle,
    Save,
    X,
    RefreshCw,
    Link2,
    Sparkles,
    Mail,
    SlidersHorizontal,
    Monitor,
    Share2,
    Lock,
    Eye
} from 'lucide-react';
import { SiteSettings } from '../../types';
import { doc, writeBatch } from 'firebase/firestore';
import { db } from '../../firebase';
import { buildEmbedUrl, parseEmbedContentType } from '../../utils/embedUrl';

interface GlobalSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const GlobalSettingsModal: React.FC<GlobalSettingsModalProps> = ({ isOpen, onClose }) => {
    const { settings, updateSettings, content } = useStore();
    const [activeTab, setActiveTab] = useState<'general' | 'streaming' | 'media' | 'system'>('general');

    const [formData, setFormData] = useState<SiteSettings>(settings);
    const [isDirty, setIsDirty] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

    const [isUpdatingBatch, setIsUpdatingBatch] = useState(false);
    const [batchProgress, setBatchProgress] = useState('');

    useEffect(() => {
        if (isOpen) {
            setFormData(settings);
            setIsDirty(false);
            setSaveStatus('idle');
        }
    }, [isOpen, settings]);

    if (!isOpen) return null;

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
            setTimeout(() => {
                setSaveStatus('idle');
            }, 2000);
        } catch (e) {
            console.error("Failed to save global settings:", e);
            alert("Failed to save global settings. Please try again.");
            setSaveStatus('idle');
        }
    };

    const handleUpdateAllContentUrls = async () => {
        const newBase = (formData.embedProxyBaseUrl || 'https://proxy.garageband.rocks').trim().replace(/\/+$/, '');
        const itemsToUpdate = (content || []).filter(c => c.imdbId || (c.videoUrl && (c.videoUrl.includes('/embed/') || c.videoUrl.includes('proxy.garageband.rocks'))));

        if (itemsToUpdate.length === 0) {
            alert("No content items found with IMDb ID or embed stream URLs to update.");
            return;
        }

        const confirmed = window.confirm(
            `Update stream URLs for all ${itemsToUpdate.length} content items to use the global proxy "${newBase}"?\n\nMovies: /embed/${formData.embedMovieType || 'movie'}/\nTV Series: /embed/${formData.embedTvType || 'tv'}/`
        );

        if (!confirmed) return;

        setIsUpdatingBatch(true);
        setBatchProgress(`Updating 0 / ${itemsToUpdate.length}...`);

        try {
            let updatedCount = 0;
            for (let i = 0; i < itemsToUpdate.length; i += 50) {
                const chunk = itemsToUpdate.slice(i, i + 50);
                const batch = writeBatch(db);

                for (const item of chunk) {
                    const imdbId = item.imdbId || (item.videoUrl ? item.videoUrl.match(/(tt\d+)/)?.[1] : null);
                    if (imdbId) {
                        const existingType = item.videoUrl ? parseEmbedContentType(item.videoUrl) : null;
                        const effectiveType = existingType || (item.type === 'tv' ? (formData.embedTvType || 'tv') : (formData.embedMovieType || 'movie'));
                        const newUrl = buildEmbedUrl(imdbId, effectiveType, formData);

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

            // Save settings and bump contentVersion
            await updateSettings({
                ...formData,
                contentVersion: (settings.contentVersion || 0) + 1
            });

            alert(`Success! Updated stream URLs for ${updatedCount} items to use ${newBase}.`);
        } catch (e: any) {
            console.error("Batch update failed:", e);
            alert("Failed to update all items: " + e.message);
        } finally {
            setIsUpdatingBatch(false);
            setBatchProgress('');
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 animate-in fade-in duration-200">
            <div className="w-full max-w-4xl bg-[#111111] border border-white/10 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-red to-orange-600 flex items-center justify-center text-white shadow-lg shadow-brand-red/20">
                            <SlidersHorizontal size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">Global Website Settings</h2>
                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-brand-red/20 text-brand-red border border-brand-red/30">
                                    ADMIN
                                </span>
                            </div>
                            <p className="text-xs text-gray-400">Configure site-wide parameters, streaming engine, and platform security</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition"
                        aria-label="Close"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Tab Navigation */}
                <div className="flex border-b border-white/10 bg-black/40 overflow-x-auto flex-shrink-0 px-4">
                    <button
                        type="button"
                        onClick={() => setActiveTab('general')}
                        className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
                            activeTab === 'general' ? 'border-brand-red text-white bg-white/5' : 'border-transparent text-gray-400 hover:text-white'
                        }`}
                    >
                        <Globe size={16} />
                        <span>General & Brand</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('streaming')}
                        className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
                            activeTab === 'streaming' ? 'border-brand-red text-white bg-white/5' : 'border-transparent text-gray-400 hover:text-white'
                        }`}
                    >
                        <Link2 size={16} />
                        <span>Streaming & Proxy</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('media')}
                        className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
                            activeTab === 'media' ? 'border-brand-red text-white bg-white/5' : 'border-transparent text-gray-400 hover:text-white'
                        }`}
                    >
                        <Monitor size={16} />
                        <span>Media & Hero</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('system')}
                        className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
                            activeTab === 'system' ? 'border-brand-red text-white bg-white/5' : 'border-transparent text-gray-400 hover:text-white'
                        }`}
                    >
                        <Shield size={16} />
                        <span>Security & Access</span>
                    </button>
                </div>

                {/* Tab Content Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[#111111]">

                    {/* TAB 1: General & Brand */}
                    {activeTab === 'general' && (
                        <div className="space-y-6 animate-in fade-in duration-150">
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">
                                    Website Brand Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.siteName || ''}
                                    onChange={(e) => handleChange({ siteName: e.target.value })}
                                    className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-white font-bold outline-none focus:border-brand-red transition"
                                    placeholder="e.g. MY DONKEY"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">
                                        Public Website Domain URL
                                    </label>
                                    <div className="relative">
                                        <Globe className="absolute left-3.5 top-3.5 text-gray-500" size={16} />
                                        <input
                                            type="url"
                                            value={formData.siteUrl || ''}
                                            onChange={(e) => handleChange({ siteUrl: e.target.value })}
                                            className="w-full bg-black/60 border border-white/10 rounded-xl p-3 pl-10 text-white font-mono text-sm outline-none focus:border-brand-red transition"
                                            placeholder="https://www.mydonkey.in"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">
                                        Support & Contact Email
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-3.5 top-3.5 text-gray-500" size={16} />
                                        <input
                                            type="email"
                                            value={formData.contactEmail || ''}
                                            onChange={(e) => handleChange({ contactEmail: e.target.value })}
                                            className="w-full bg-black/60 border border-white/10 rounded-xl p-3 pl-10 text-white text-sm outline-none focus:border-brand-red transition"
                                            placeholder="support@mydonkey.in"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Global Announcement Banner */}
                            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                                <label className="text-xs font-bold text-white flex items-center gap-2 mb-1.5">
                                    <Sparkles size={14} className="text-amber-400" />
                                    <span>Global Announcement Banner (Top of Site)</span>
                                </label>
                                <p className="text-[11px] text-gray-400 mb-2">
                                    Displays a prominent announcement bar across the top of all pages. Leave empty to hide.
                                </p>
                                <input
                                    type="text"
                                    value={formData.announcementBanner || ''}
                                    onChange={(e) => handleChange({ announcementBanner: e.target.value })}
                                    className="w-full bg-black/60 border border-white/10 rounded-lg p-2.5 text-sm text-white outline-none focus:border-brand-red transition"
                                    placeholder="e.g. 🎉 New 4K Blockbusters and Web Series added every Friday!"
                                />
                            </div>

                            {/* Social Media Links */}
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-3 flex items-center gap-2">
                                    <Share2 size={14} /> Social Media Links
                                </label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Facebook URL</label>
                                        <input
                                            type="url"
                                            value={formData.facebookUrl || ''}
                                            onChange={(e) => handleChange({ facebookUrl: e.target.value })}
                                            className="w-full bg-black/60 border border-white/10 rounded-lg p-2.5 text-xs text-white outline-none focus:border-brand-red transition"
                                            placeholder="https://facebook.com/yourpage"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Instagram URL</label>
                                        <input
                                            type="url"
                                            value={formData.instagramUrl || ''}
                                            onChange={(e) => handleChange({ instagramUrl: e.target.value })}
                                            className="w-full bg-black/60 border border-white/10 rounded-lg p-2.5 text-xs text-white outline-none focus:border-brand-red transition"
                                            placeholder="https://instagram.com/yourprofile"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Twitter / X URL</label>
                                        <input
                                            type="url"
                                            value={formData.twitterUrl || ''}
                                            onChange={(e) => handleChange({ twitterUrl: e.target.value })}
                                            className="w-full bg-black/60 border border-white/10 rounded-lg p-2.5 text-xs text-white outline-none focus:border-brand-red transition"
                                            placeholder="https://twitter.com/yourhandle"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">YouTube URL</label>
                                        <input
                                            type="url"
                                            value={formData.youtubeUrl || ''}
                                            onChange={(e) => handleChange({ youtubeUrl: e.target.value })}
                                            className="w-full bg-black/60 border border-white/10 rounded-lg p-2.5 text-xs text-white outline-none focus:border-brand-red transition"
                                            placeholder="https://youtube.com/@yourchannel"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: Streaming & Proxy */}
                    {activeTab === 'streaming' && (
                        <div className="space-y-6 animate-in fade-in duration-150">
                            <div>
                                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-1.5 flex items-center justify-between">
                                    <span>Global Content Streaming Website URL</span>
                                    <span className="text-[10px] text-brand-red font-semibold lowercase">Controls all video embed URLs</span>
                                </label>
                                <input
                                    type="url"
                                    value={formData.embedProxyBaseUrl ?? 'https://proxy.garageband.rocks'}
                                    onChange={(e) => handleChange({ embedProxyBaseUrl: e.target.value })}
                                    className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-sm font-mono text-white outline-none focus:border-brand-red transition"
                                    placeholder="https://proxy.garageband.rocks"
                                />
                                <p className="text-[10px] text-gray-500 mt-1">Default: https://proxy.garageband.rocks — Changing this updates the stream website for all content.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                    <div className="flex items-center gap-2 mb-2 text-white font-bold text-xs">
                                        <Film size={14} className="text-blue-400" />
                                        <span>Movie Content Type Path</span>
                                    </div>
                                    <input
                                        type="text"
                                        value={formData.embedMovieType ?? 'movie'}
                                        onChange={(e) => handleChange({ embedMovieType: e.target.value })}
                                        className="w-full bg-black/60 border border-white/10 rounded-lg p-2.5 text-sm font-mono text-white outline-none focus:border-blue-500 transition mb-2"
                                        placeholder="movie"
                                    />
                                    <div className="text-[11px] text-gray-400 font-mono break-all bg-black/40 p-2 rounded border border-white/5">
                                        <span className="text-gray-500">Preview: </span>
                                        {(formData.embedProxyBaseUrl || 'https://proxy.garageband.rocks').replace(/\/+$/, '')}/embed/<span className="text-blue-400 font-bold">{formData.embedMovieType || 'movie'}</span>/tt1375666
                                    </div>
                                </div>

                                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                    <div className="flex items-center gap-2 mb-2 text-white font-bold text-xs">
                                        <Tv size={14} className="text-purple-400" />
                                        <span>TV Series Content Type Path</span>
                                    </div>
                                    <input
                                        type="text"
                                        value={formData.embedTvType ?? 'tv'}
                                        onChange={(e) => handleChange({ embedTvType: e.target.value })}
                                        className="w-full bg-black/60 border border-white/10 rounded-lg p-2.5 text-sm font-mono text-white outline-none focus:border-purple-500 transition mb-2"
                                        placeholder="tv"
                                    />
                                    <div className="text-[11px] text-gray-400 font-mono break-all bg-black/40 p-2 rounded border border-white/5">
                                        <span className="text-gray-500">Preview: </span>
                                        {(formData.embedProxyBaseUrl || 'https://proxy.garageband.rocks').replace(/\/+$/, '')}/embed/<span className="text-purple-400 font-bold">{formData.embedTvType || 'tv'}</span>/tt0903747
                                    </div>
                                </div>
                            </div>

                            {/* Batch Sync Database Card */}
                            <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-white/10 rounded-xl p-5">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                            <RefreshCw size={16} className="text-cyan-400" />
                                            <span>Sync All Existing Content in Database</span>
                                        </h4>
                                        <p className="text-xs text-gray-400 mt-1 max-w-xl">
                                            Rewrites all existing movies and TV show stream URLs in the database to use the configured global streaming website URL and path parameters.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleUpdateAllContentUrls}
                                        disabled={isUpdatingBatch}
                                        className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition disabled:opacity-50 whitespace-nowrap cursor-pointer"
                                    >
                                        <RefreshCw size={14} className={isUpdatingBatch ? 'animate-spin' : ''} />
                                        <span>{isUpdatingBatch ? (batchProgress || 'Updating...') : 'Apply to All Content'}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 3: Media & Hero */}
                    {activeTab === 'media' && (
                        <div className="space-y-6 animate-in fade-in duration-150">
                            {/* Content Loader Overlay */}
                            <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="font-bold text-white text-sm">Minimal Movie Stream Loader</div>
                                        <div className="text-xs text-gray-400 mt-0.5">
                                            Displays an animated loading spinner over the video player while the movie stream connects.
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={formData.contentLoaderEnabled || false}
                                            onChange={(e) => handleChange({ contentLoaderEnabled: e.target.checked })}
                                        />
                                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-red"></div>
                                    </label>
                                </div>

                                {formData.contentLoaderEnabled && (
                                    <div className="pt-3 border-t border-white/10">
                                        <label className="text-xs text-gray-300 font-bold block mb-2">
                                            Failsafe Max Timeout (Seconds): <span className="text-brand-red font-mono">{formData.contentLoaderDuration || 2.5}s</span>
                                        </label>
                                        <input
                                            type="range"
                                            step="0.5"
                                            min="1"
                                            max="8"
                                            value={formData.contentLoaderDuration || 2.5}
                                            onChange={(e) => handleChange({ contentLoaderDuration: parseFloat(e.target.value) })}
                                            className="w-full accent-brand-red cursor-pointer"
                                        />
                                        <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                                            <span>1.0s (Fast)</span>
                                            <span>2.5s (Recommended)</span>
                                            <span>8.0s (Extended)</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Hero Video Quality */}
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">
                                    Hero Background Video Quality
                                </label>
                                <select
                                    value={formData.heroVideoQuality || 'hd1080'}
                                    onChange={(e) => handleChange({ heroVideoQuality: e.target.value as any })}
                                    className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-brand-red transition cursor-pointer"
                                >
                                    <option value="auto">Auto (Adaptive Streaming)</option>
                                    <option value="hd720">HD 720p</option>
                                    <option value="hd1080">Full HD 1080p (Recommended)</option>
                                    <option value="highres">4K / Ultra High-Res</option>
                                </select>
                                <p className="text-[10px] text-gray-500 mt-1.5">Applies to background trailer previews on desktop and large screens.</p>
                            </div>

                            {/* Theme Choice */}
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-3">
                                    Platform Visual Theme
                                </label>
                                <div className="grid grid-cols-2 gap-4">
                                    <div
                                        onClick={() => handleChange({ theme: 'default' })}
                                        className={`cursor-pointer p-4 rounded-xl border-2 transition ${
                                            formData.theme === 'default'
                                                ? 'border-brand-red bg-brand-red/10 text-white'
                                                : 'border-white/10 bg-black/50 hover:bg-white/5 text-gray-300'
                                        }`}
                                    >
                                        <div className="font-bold mb-1 text-sm">Netflix Dark</div>
                                        <div className="text-xs text-gray-400">Deep black canvas with crimson red accents and high-contrast typography.</div>
                                    </div>

                                    <div
                                        onClick={() => handleChange({ theme: 'luxury' })}
                                        className={`cursor-pointer p-4 rounded-xl border-2 transition ${
                                            formData.theme === 'luxury'
                                                ? 'border-brand-red bg-brand-red/10 text-white'
                                                : 'border-white/10 bg-black/50 hover:bg-white/5 text-gray-300'
                                        }`}
                                    >
                                        <div className="font-bold mb-1 text-sm">Cinema Luxury</div>
                                        <div className="text-xs text-gray-400">Atmospheric violet and gold palette tailored for premium cinema vibes.</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 4: Security & Access */}
                    {activeTab === 'system' && (
                        <div className="space-y-6 animate-in fade-in duration-150">
                            {/* Maintenance Mode */}
                            <div className="bg-red-500/10 border border-red-500/20 p-5 rounded-xl">
                                <div className="flex items-center justify-between">
                                    <div className="pr-4">
                                        <div className="font-bold text-red-500 flex items-center gap-2 mb-1">
                                            <AlertTriangle size={18} />
                                            <span>Maintenance Mode Killswitch</span>
                                        </div>
                                        <div className="text-xs text-red-200/80 leading-relaxed">
                                            When enabled, only administrators can access the website. Regular visitors will be shown an &ldquo;Under Maintenance&rdquo; screen.
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={formData.maintenanceMode || false}
                                            onChange={(e) => handleChange({ maintenanceMode: e.target.checked })}
                                        />
                                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                                    </label>
                                </div>
                            </div>

                            {/* Guest Access Control */}
                            <div className="bg-white/5 border border-white/10 p-5 rounded-xl flex items-center justify-between">
                                <div className="pr-4">
                                    <div className="font-bold text-white text-sm flex items-center gap-2">
                                        <Eye size={16} className="text-cyan-400" />
                                        <span>Guest Browsing Access</span>
                                    </div>
                                    <div className="text-xs text-gray-400 mt-1">
                                        Allow users to browse trailers and explore catalogs without creating an account or logging in first.
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={formData.guestAccessEnabled !== false}
                                        onChange={(e) => handleChange({ guestAccessEnabled: e.target.checked })}
                                    />
                                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                                </label>
                            </div>

                            {/* Universal Unlock Passcode */}
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2 flex items-center gap-2">
                                    <Lock size={14} className="text-brand-red" />
                                    <span>Universal Exclusive Unlock Passcode</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.globalExclusiveCode || ''}
                                    onChange={(e) => handleChange({ globalExclusiveCode: e.target.value })}
                                    className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-white font-mono tracking-widest outline-none focus:border-brand-red transition"
                                    placeholder="e.g. VIP2026"
                                />
                                <p className="text-[10px] text-gray-500 mt-1.5">
                                    Universal passcode used by users to unlock content marked as <strong className="text-brand-red">Exclusive</strong>.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-black/40 flex-shrink-0">
                    <div>
                        {isDirty && (
                            <span className="text-xs text-amber-400 font-medium animate-pulse">
                                Unsaved changes pending
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={!isDirty || saveStatus === 'saving'}
                            className={`px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-lg ${
                                saveStatus === 'saved'
                                    ? 'bg-emerald-600 text-white shadow-emerald-900/30'
                                    : isDirty
                                    ? 'bg-brand-red hover:bg-red-700 text-white shadow-brand-red/30'
                                    : 'bg-white/10 text-gray-500 cursor-not-allowed'
                            }`}
                        >
                            {saveStatus === 'saving' ? (
                                <>
                                    <RefreshCw size={14} className="animate-spin" />
                                    <span>Saving...</span>
                                </>
                            ) : saveStatus === 'saved' ? (
                                <>
                                    <CheckCircle size={14} />
                                    <span>Changes Saved</span>
                                </>
                            ) : (
                                <>
                                    <Save size={14} />
                                    <span>Save Changes</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default GlobalSettingsModal;
