import React, { useState, useEffect } from 'react';
import { useStore } from '../../../context/StoreContext';
import { Save, CheckCircle, Megaphone, Eye, Search, X, ToggleLeft, ToggleRight } from 'lucide-react';
import { PopupConfig } from '../../../types';

const DEFAULT_POPUP: PopupConfig = {
    enabled: false,
    mode: 'latest',
    contentId: undefined,
    title: '',
    subtitle: '',
    showOnce: true,
};

const PopupManager = () => {
    const { settings, updateSettings, content, contentRequests } = useStore();
    const [config, setConfig] = useState<PopupConfig>(settings.popup ?? DEFAULT_POPUP);
    const [isDirty, setIsDirty] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [search, setSearch] = useState('');
    const [showPreview, setShowPreview] = useState(false);

    useEffect(() => {
        setConfig(settings.popup ?? DEFAULT_POPUP);
    }, [settings.popup]);

    const handleChange = (updates: Partial<PopupConfig>) => {
        setConfig(prev => ({ ...prev, ...updates }));
        setIsDirty(true);
        setSaveStatus('idle');
    };

    const handleSave = async () => {
        setSaveStatus('saving');
        try {
            await updateSettings({ popup: config });
            setSaveStatus('saved');
            setIsDirty(false);
            setTimeout(() => setSaveStatus('idle'), 2500);
        } catch {
            alert('Failed to save popup settings');
            setSaveStatus('idle');
        }
    };

    // Resolve the preview content item based on mode
    const resolvedContent = (() => {
        if (!content || content.length === 0) return null;
        if (config.mode === 'latest') {
            return [...content].sort((a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )[0] ?? null;
        }
        if (config.mode === 'demanded') {
            // Count requests per title
            const counts: Record<string, number> = {};
            for (const req of contentRequests) {
                const key = req.contentTitle.toLowerCase().trim();
                counts[key] = (counts[key] || 0) + 1;
            }
            // Find best match in content library
            const sortedKeys = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(e => e[0]);
            for (const key of sortedKeys) {
                const match = content.find(c =>
                    c.title.toLowerCase().includes(key) || key.includes(c.title.toLowerCase())
                );
                if (match) return match;
            }
            return content[0]; // fallback
        }
        if (config.mode === 'imdb_top') {
            return [...content].sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0))[0] ?? null;
        }
        if (config.mode === 'most_watched') {
            return [...content].sort((a, b) => (b.views || 0) - (a.views || 0))[0] ?? null;
        }
        if (config.mode === 'most_liked') {
            return [...content].sort((a, b) => (b.likes || 0) - (a.likes || 0))[0] ?? null;
        }
        if (config.mode === 'custom' && config.contentId) {
            return content.find(c => c.id === config.contentId) ?? null;
        }
        if (config.mode === 'rotating') {
            // For preview, just show latest
            return [...content].sort((a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )[0] ?? null;
        }
        return null;
    })();

    const filteredContent = content.filter(c =>
        c.title.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in pb-20 max-w-5xl">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold flex items-center gap-3">
                        <Megaphone className="text-brand-red" size={28} />
                        Popup / Promotions
                    </h2>
                    <p className="text-gray-400 mt-1 text-sm">
                        Show a content promotion popup to users on the homepage.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowPreview(p => !p)}
                        className="px-4 py-2 rounded flex items-center gap-2 bg-white/5 hover:bg-white/10 transition text-sm font-medium border border-white/10"
                    >
                        <Eye size={16} /> {showPreview ? 'Hide Preview' : 'Show Preview'}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!isDirty || saveStatus === 'saving'}
                        className={`px-6 py-2 rounded font-bold flex items-center gap-2 transition shadow-lg ${saveStatus === 'saved'
                            ? 'bg-green-600 text-white'
                            : isDirty
                                ? 'bg-brand-red hover:bg-red-700 text-white'
                                : 'bg-white/10 text-gray-500 cursor-not-allowed'
                            }`}
                    >
                        {saveStatus === 'saving'
                            ? <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                            : saveStatus === 'saved'
                                ? <CheckCircle size={18} />
                                : <Save size={18} />}
                        {saveStatus === 'saved' ? 'Saved!' : 'Save Changes'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Config panel */}
                <div className="space-y-5">
                    {/* Enable toggle */}
                    <div className="bg-[#141414] border border-white/5 rounded-xl p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="font-bold text-lg">Enable Popup</div>
                                <div className="text-xs text-gray-400 mt-1">When ON, users will see this popup on the homepage.</div>
                            </div>
                            <button
                                onClick={() => handleChange({ enabled: !config.enabled })}
                                className={`transition-colors ${config.enabled ? 'text-brand-red' : 'text-gray-600 hover:text-gray-400'}`}
                            >
                                {config.enabled
                                    ? <ToggleRight size={44} />
                                    : <ToggleLeft size={44} />}
                            </button>
                        </div>
                    </div>

                    {/* Mode selector */}
                    <div className="bg-[#141414] border border-white/5 rounded-xl p-6">
                        <label className="text-xs text-gray-500 uppercase font-bold block mb-4">Content Source</label>
                        <div className="space-y-3">
                            {([
                                { value: 'latest', label: 'Latest Added', desc: 'Automatically shows the most recently added content.' },
                                { value: 'imdb_top', label: 'Top IMDb Rated', desc: 'Shows content with the highest user ratings.' },
                                { value: 'most_watched', label: 'Most Watched', desc: 'Promotes content with the highest view counts.' },
                                { value: 'most_liked', label: 'Most Liked', desc: 'Highlights content with the most likes.' },
                                { value: 'demanded', label: 'Most Demanded', desc: 'Shows the most-requested content from user requests.' },
                                { value: 'rotating', label: 'Rotating Promotion', desc: 'Cycles through all above modes on every refresh.' },
                                { value: 'custom', label: 'Custom Pick', desc: 'You manually choose which content to feature.' },
                            ] as const).map(opt => (
                                <div
                                    key={opt.value}
                                    onClick={() => handleChange({ mode: opt.value })}
                                    className={`cursor-pointer p-4 rounded-lg border-2 transition ${config.mode === opt.value
                                        ? 'border-brand-red bg-brand-red/5'
                                        : 'border-white/5 bg-black/30 hover:bg-white/5'
                                        }`}
                                >
                                    <div className="font-bold text-sm">{opt.label}</div>
                                    <div className="text-xs text-gray-400 mt-0.5">{opt.desc}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Custom content picker */}
                    {config.mode === 'custom' && (
                        <div className="bg-[#141414] border border-white/5 rounded-xl p-6">
                            <label className="text-xs text-gray-500 uppercase font-bold block mb-3">Choose Content</label>
                            <div className="relative mb-3">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search titles..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="w-full bg-black/50 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-brand-red transition"
                                />
                            </div>
                            <div className="max-h-60 overflow-y-auto space-y-1 no-scrollbar">
                                {filteredContent.slice(0, 30).map(item => (
                                    <div
                                        key={item.id}
                                        onClick={() => handleChange({ contentId: item.id })}
                                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition ${config.contentId === item.id
                                            ? 'bg-brand-red/20 border border-brand-red/40'
                                            : 'hover:bg-white/5 border border-transparent'
                                            }`}
                                    >
                                        <img
                                            src={item.poster_path_mobile || item.poster_path}
                                            className="w-9 h-12 object-cover rounded"
                                            alt={item.title}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium truncate">{item.title}</div>
                                            <div className="text-[10px] text-gray-500 uppercase">{item.type} · {item.year || item.release_date?.substring(0, 4)}</div>
                                        </div>
                                        {config.contentId === item.id && (
                                            <CheckCircle size={16} className="text-brand-red flex-shrink-0" />
                                        )}
                                    </div>
                                ))}
                                {filteredContent.length === 0 && (
                                    <div className="text-gray-500 text-sm text-center py-6">No content found.</div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Custom text overrides */}
                    <div className="bg-[#141414] border border-white/5 rounded-xl p-6 space-y-4">
                        <label className="text-xs text-gray-500 uppercase font-bold block">Custom Text (Optional)</label>
                        <div>
                            <label className="text-xs text-gray-500 block mb-1">Popup Title Override</label>
                            <input
                                type="text"
                                placeholder="e.g. Now Available!"
                                value={config.title || ''}
                                onChange={e => handleChange({ title: e.target.value })}
                                className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:border-brand-red transition"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 block mb-1">Subtitle / Call-to-Action</label>
                            <input
                                type="text"
                                placeholder="e.g. Watch before it's gone!"
                                value={config.subtitle || ''}
                                onChange={e => handleChange({ subtitle: e.target.value })}
                                className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:border-brand-red transition"
                            />
                        </div>
                    </div>

                    {/* Show once */}
                    <div className="bg-[#141414] border border-white/5 rounded-xl p-5">
                        <label className="flex items-center gap-4 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={config.showOnce ?? true}
                                onChange={e => handleChange({ showOnce: e.target.checked })}
                                className="accent-brand-red w-5 h-5"
                            />
                            <div>
                                <div className="font-medium text-sm">Show Once Per Session</div>
                                <div className="text-xs text-gray-400 mt-0.5">
                                    If enabled, the popup won't reappear after the user closes it — until they close the browser tab.
                                </div>
                            </div>
                        </label>
                    </div>
                </div>

                {/* Preview Panel */}
                <div className="lg:sticky lg:top-4 h-fit">
                    {showPreview ? (
                        <div className="bg-[#141414] border border-white/5 rounded-xl p-6">
                            <div className="text-xs text-gray-500 uppercase font-bold mb-4">Live Preview</div>
                            {resolvedContent ? (
                                <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-[#1a1a1a]">
                                    {/* Backdrop */}
                                    <div className="relative h-40 overflow-hidden">
                                        <img
                                            src={resolvedContent.backdrop_path || resolvedContent.poster_path}
                                            className="w-full h-full object-cover"
                                            alt=""
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-[#1a1a1a]" />
                                    </div>

                                    {/* Content info */}
                                    <div className="p-5 flex gap-4 -mt-14 relative">
                                        <img
                                            src={resolvedContent.poster_path_mobile || resolvedContent.poster_path}
                                            className="w-20 h-28 rounded-lg object-cover shadow-xl flex-shrink-0 border border-white/10"
                                            alt={resolvedContent.title}
                                        />
                                        <div className="flex-1 min-w-0 pt-10">
                                            {/* Mode badge */}
                                            <div className="text-[10px] font-black uppercase tracking-widest text-brand-red mb-1">
                                                {config.mode === 'latest' ? '🔥 Just Added'
                                                    : config.mode === 'imdb_top' ? '⭐ IMDb Top Rated'
                                                        : config.mode === 'most_watched' ? '👀 Most Watched'
                                                            : config.mode === 'most_liked' ? '❤️ Most Liked'
                                                                : config.mode === 'demanded' ? '🌟 Most Demanded'
                                                                    : config.mode === 'rotating' ? '🔄 Rotating (Varies)'
                                                                        : '⭐ Featured'}
                                            </div>
                                            <h3 className="font-bold text-lg leading-tight">
                                                {config.title || resolvedContent.title}
                                            </h3>
                                            {config.subtitle && (
                                                <p className="text-sm text-gray-400 mt-1">{config.subtitle}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="px-5 pb-5 flex gap-3">
                                        <button className="flex-1 bg-brand-red hover:bg-red-700 text-white font-bold py-2.5 rounded-lg text-sm transition">
                                            Watch Now
                                        </button>
                                        <button className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-sm font-medium transition">
                                            More Info
                                        </button>
                                        <button className="px-3 py-2 rounded-lg bg-white/5 text-gray-400 text-sm hover:bg-white/10 transition">
                                            <X size={16} />
                                        </button>
                                    </div>

                                    {!config.enabled && (
                                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                                            <div className="text-center">
                                                <div className="text-2xl mb-2">🚫</div>
                                                <div className="font-bold text-sm">Popup Disabled</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="border border-dashed border-white/10 rounded-xl p-10 text-center text-gray-500 text-sm">
                                    {config.mode === 'custom' && !config.contentId
                                        ? 'Pick a content item to preview.'
                                        : 'No content available to preview.'}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-[#141414] border border-dashed border-white/10 rounded-xl p-10 text-center text-gray-500">
                            <Eye size={32} className="mx-auto mb-3 opacity-30" />
                            <div className="text-sm">Click <strong className="text-white">Show Preview</strong> to see how the popup will look to users.</div>
                        </div>
                    )}

                    {/* Status chip */}
                    <div className={`mt-4 flex items-center gap-2 justify-center text-sm font-medium px-4 py-2 rounded-full border ${config.enabled
                        ? 'bg-green-500/10 border-green-500/20 text-green-400'
                        : 'bg-white/5 border-white/10 text-gray-500'
                        }`}>
                        <div className={`w-2 h-2 rounded-full ${config.enabled ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
                        {config.enabled ? 'Popup is ACTIVE for users' : 'Popup is disabled'}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PopupManager;
