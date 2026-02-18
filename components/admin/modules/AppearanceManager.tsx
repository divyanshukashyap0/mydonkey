import React, { useState, useEffect } from 'react';
import { Type, Check, RefreshCw } from 'lucide-react';
import { useStore } from '../../../context/StoreContext';

const GOOGLE_FONTS_WEB = [
    "Inter", "Roboto", "Open Sans", "Lato", "Poppins", "Montserrat", "Nunito", "Raleway", "Ubuntu", "Merriweather", "Playfair Display", "Lora", "Rubik", "Kanit", "Work Sans", "Quicksand"
];

const GOOGLE_FONTS_RANK = [
    "Anton", "Impact", "Bebas Neue", "Oswald", "Fjalla One", "Archivo Black", "Russo One", "Passion One", "Righteous", "Alfa Slab One", "Carter One", "Luckiest Guy"
];

const AppearanceManager = () => {
    const { settings, updateSettings } = useStore();
    const [webFont, setWebFont] = useState(settings.websiteFont || 'Inter');
    const [rankFont, setRankFont] = useState(settings.rankFont || 'Anton');
    const [heroFont, setHeroFont] = useState(settings.heroFont || settings.websiteFont || 'Inter');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setWebFont(settings.websiteFont || 'Inter');
        setRankFont(settings.rankFont || 'Anton');
        setHeroFont(settings.heroFont || settings.websiteFont || 'Inter');
    }, [settings]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateSettings({
                websiteFont: webFont,
                rankFont: rankFont,
                heroFont: heroFont
            });
            alert('Appearance settings updated successfully!');
        } catch (error) {
            console.error('Failed to update settings:', error);
            alert('Failed to save settings. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-8 max-w-4xl pb-20">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-black text-white">Appearance & Theme</h2>
                    <p className="text-gray-400 mt-1">Customize fonts and visual style of your platform.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-brand-red px-6 py-3 rounded-lg font-bold flex items-center gap-2 hover:bg-red-700 transition shadow-lg shadow-red-900/20 disabled:opacity-50"
                >
                    {saving ? <RefreshCw className="animate-spin" size={20} /> : <Check size={20} />}
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Website Font Selection */}
                <div className="bg-[#141414] p-6 rounded-xl border border-white/5 space-y-4">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="bg-blue-500/20 p-2 rounded-lg text-blue-400">
                            <Type size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-white">Website Font</h3>
                    </div>
                    <p className="text-sm text-gray-400">
                        Choose the primary font for headlines, body text, and interface elements.
                    </p>

                    <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto custom-scrollbar p-1">
                        {GOOGLE_FONTS_WEB.map(font => (
                            <button
                                key={font}
                                onClick={() => setWebFont(font)}
                                className={`px-4 py-3 rounded-lg text-left transition border ${webFont === font
                                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/40'
                                    : 'bg-black/40 border-white/10 text-gray-400 hover:border-white/30 hover:text-white'
                                    }`}
                            >
                                <span className="text-lg" style={{ fontFamily: font }}>Aa</span>
                                <div className="text-xs mt-1 font-mono opacity-70">{font}</div>
                            </button>
                        ))}
                    </div>

                    <div className="mt-4 p-4 bg-black/40 rounded-lg border border-white/5">
                        <div className="text-xs text-gray-500 uppercase font-bold mb-2">Preview</div>
                        <div style={{ fontFamily: webFont, transition: 'font-family 0.3s' }}>
                            <h4 className="text-lg font-bold text-white mb-1">Make Your OTT Platform Unique</h4>
                            <p className="text-sm text-gray-400">
                                This is how your body text will look. Good typography enhances readability and user experience.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Rank Number Font Selection */}
                <div className="bg-[#141414] p-6 rounded-xl border border-white/5 space-y-4">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="bg-purple-500/20 p-2 rounded-lg text-purple-400">
                            <span className="text-xl font-black font-mono">#1</span>
                        </div>
                        <h3 className="text-xl font-bold text-white">Rank Number Font</h3>
                    </div>
                    <p className="text-sm text-gray-400">
                        Select a bold, impactful font for the "Top 10" ranking numbers.
                    </p>

                    <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto custom-scrollbar p-1">
                        {GOOGLE_FONTS_RANK.map(font => (
                            <button
                                key={font}
                                onClick={() => setRankFont(font)}
                                className={`px-4 py-3 rounded-lg text-left transition border ${rankFont === font
                                    ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-900/40'
                                    : 'bg-black/40 border-white/10 text-gray-400 hover:border-white/30 hover:text-white'
                                    }`}
                            >
                                <span className="text-2xl leading-none" style={{ fontFamily: font }}>10</span>
                                <div className="text-xs mt-1 font-mono opacity-70">{font}</div>
                            </button>
                        ))}
                    </div>

                    <div className="mt-4 p-4 bg-black/40 rounded-lg border border-white/5 flex items-end justify-center h-32 overflow-hidden relative">
                        <div className="text-xs text-gray-500 uppercase font-bold absolute top-2 left-2">Preview</div>
                        <span
                            className="text-[100px] leading-none font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-600 drop-shadow-2xl"
                            style={{ fontFamily: rankFont, transition: 'font-family 0.3s' }}
                        >
                            1
                        </span>
                        <span
                            className="text-[100px] leading-none font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-600 drop-shadow-2xl -ml-4"
                            style={{ fontFamily: rankFont, transition: 'font-family 0.3s' }}
                        >
                            0
                        </span>
                    </div>
                </div>

                {/* Hero Font Selection */}
                <div className="bg-[#141414] p-6 rounded-xl border border-white/5 space-y-4 md:col-span-2">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="bg-red-500/20 p-2 rounded-lg text-red-400">
                            <span className="text-xl font-black font-serif">H1</span>
                        </div>
                        <h3 className="text-xl font-bold text-white">Hero Section Font</h3>
                    </div>
                    <p className="text-sm text-gray-400">
                        Select a powerful font for the main Hero Banner titles on the home page.
                    </p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-h-40 overflow-y-auto custom-scrollbar p-1">
                        {GOOGLE_FONTS_RANK.map(font => (
                            <button
                                key={font}
                                onClick={() => setHeroFont(font)}
                                className={`px-3 py-2 rounded-lg text-left transition border ${heroFont === font
                                    ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-900/40'
                                    : 'bg-black/40 border-white/10 text-gray-400 hover:border-white/30 hover:text-white'
                                    }`}
                            >
                                <span className="text-base font-bold truncate block" style={{ fontFamily: font }}>{font}</span>
                            </button>
                        ))}
                    </div>

                    {/* Live Preview of Hero Banner */}
                    <div className="mt-6 relative h-64 rounded-xl overflow-hidden group">
                        <img
                            src="https://image.tmdb.org/t/p/original/r2JignnASJrPoZg9MVh0tjiog72.jpg"
                            className="absolute inset-0 w-full h-full object-cover opacity-60"
                            alt="Preview"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-black/40 to-transparent" />

                        <div className="absolute bottom-0 left-0 p-6 md:p-10 w-full">
                            <h1
                                className="text-4xl md:text-5xl font-black text-white leading-none drop-shadow-2xl mb-4 transition-all duration-300"
                                style={{ fontFamily: heroFont }}
                            >
                                AVATAR: THE WAY OF WATER
                            </h1>
                            <div className="flex gap-3">
                                <button className="bg-white text-black px-6 py-2 rounded font-bold flex items-center gap-2">
                                    Play
                                </button>
                                <button className="bg-gray-600/60 text-white px-6 py-2 rounded font-bold backdrop-blur-md">
                                    More Info
                                </button>
                            </div>
                        </div>

                        <div className="absolute top-4 right-4 bg-black/60 backdrop-blur text-xs font-bold px-2 py-1 rounded border border-white/10 text-white">
                            LIVE PREVIEW
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AppearanceManager;
