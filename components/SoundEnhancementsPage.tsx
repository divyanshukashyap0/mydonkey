import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Volume2,
    VolumeX,
    Zap,
    Sparkles,
    ShieldCheck,
    Smartphone,
    Monitor,
    Tv,
    Headphones,
    ExternalLink,
    Check,
    Copy,
    AlertCircle,
    Sliders,
    Play,
    Square,
    Info,
    ChevronDown,
    Flame,
    Radio
} from 'lucide-react';
import { soundBooster } from '../player/SoundBooster';

interface BoosterTool {
    name: string;
    tagline: string;
    description: string;
    rating: string;
    badge?: string;
    iconColor: string;
    features: string[];
    platform: 'pc' | 'android';
    links: {
        label: string;
        url: string;
        primary?: boolean;
    }[];
}

const PC_TOOLS: BoosterTool[] = [
    {
        name: 'Sound Booster That Works',
        tagline: 'Tab-wide audio amplification up to 600%',
        description: 'Operates with browser-level tab capture privileges to amplify all audio playing inside any tab, including external iframes, embedded players, and quiet video streams without audio distortion.',
        rating: '4.8/5 (500K+ users)',
        badge: 'Recommended for Iframe Embeds',
        iconColor: 'from-amber-500 to-orange-600',
        features: [
            'Boosts audio up to 600% (6x) with a simple browser pop-up slider',
            'Bypasses iframe sandbox restrictions via chrome.tabCapture',
            'Independent volume control for each browser tab',
            'Lightweight, zero lag or video desynchronization'
        ],
        platform: 'pc',
        links: [
            { label: 'Chrome Web Store', url: 'https://chromewebstore.google.com/detail/sound-booster-that-works/gnidjfdekbljleajoeamecfijnhbgndl', primary: true },
            { label: 'Edge Add-ons', url: 'https://microsoftedge.microsoft.com/addons/search/sound%20booster' }
        ]
    },
    {
        name: 'Volume Booster by Vlad',
        tagline: 'Clean, simple 600% volume multiplier',
        description: 'A popular and minimal extension designed specifically for quiet web videos. Allows granular control from 100% to 600% with preset quick-buttons for 150%, 200%, 300%, and 600%.',
        rating: '4.7/5 (1M+ users)',
        badge: 'Popular',
        iconColor: 'from-red-600 to-rose-700',
        features: [
            'Quick one-click presets for instant amplification',
            'Bass boost equalizer for laptop speakers',
            'Clean dark-mode interface with zero annoying ads'
        ],
        platform: 'pc',
        links: [
            { label: 'Chrome Web Store', url: 'https://chromewebstore.google.com/detail/volume-booster/ejakngjcjmhkblbhaegllbedocdnapch', primary: true }
        ]
    },
    {
        name: 'FxSound (Windows App)',
        tagline: 'Universal OS-level sound enhancer & equalizer',
        description: 'A 100% free and open-source desktop software for Windows. Enhances audio system-wide with dynamic volume boost, clarity EQ, bass boost, and surround sound for all browsers and media players.',
        rating: '4.9/5 (Free & Open Source)',
        badge: 'System-Wide',
        iconColor: 'from-blue-500 to-indigo-600',
        features: [
            'Boosts all audio across your entire PC (browsers, apps, games)',
            'Special "Movie" preset tuned for explosive action & crisp dialogue',
            'Completely free with no subscriptions or ads'
        ],
        platform: 'pc',
        links: [
            { label: 'Download FxSound Free', url: 'https://www.fxsound.com/', primary: true }
        ]
    }
];

const ANDROID_TOOLS: BoosterTool[] = [
    {
        name: 'Volume Booster Goodev',
        tagline: 'The #1 Android speaker & headphone amplifier',
        description: 'A lightweight and reliable Android utility that hooks into the native Android LoudnessEnhancer audio framework to boost movie volume up to 200%–300% on phone speakers and Bluetooth headphones.',
        rating: '4.6/5 (50M+ Downloads)',
        badge: 'Top Pick for Android',
        iconColor: 'from-emerald-500 to-teal-600',
        features: [
            'Floating mini-slider stays on screen while movies play',
            'Amplifies audio in Chrome, PWA, YouTube, and all video players',
            'Works seamlessly with phone speakers, earbuds, and Bluetooth',
            'Extremely lightweight (less than 3 MB app size)'
        ],
        platform: 'android',
        links: [
            { label: 'Get on Google Play', url: 'https://play.google.com/store/apps/details?id=com.goodev.volume.booster', primary: true }
        ]
    },
    {
        name: 'Speaker Boost: Volume Booster',
        tagline: 'Rich EQ & notification-shade quick control',
        description: 'Enhances speaker volume with an active notification toggle so you can boost movie sound without leaving your fullscreen video playback.',
        rating: '4.5/5 (10M+ Downloads)',
        badge: 'Highly Rated',
        iconColor: 'from-purple-500 to-pink-600',
        features: [
            'Quick notification shade controller',
            'Built-in speech enhancement & bass boost',
            'Safety warning limiter to protect phone hardware'
        ],
        platform: 'android',
        links: [
            { label: 'Get on Google Play', url: 'https://play.google.com/store/apps/details?id=mobi.god.speakerboost', primary: true }
        ]
    }
];

const SoundEnhancementsPage: React.FC = () => {
    const navigate = useNavigate();

    // Studio interactive test state
    const [boostLevel, setBoostLevel] = useState<number>(() => {
        try {
            const saved = localStorage.getItem('mydonkey_sound_boost_level');
            return saved ? parseFloat(saved) : 2.0; // Default to 200% (2x) for demo
        } catch {
            return 2.0;
        }
    });
    const [dialogueClarity, setDialogueClarity] = useState<boolean>(true);
    const [limiterEnabled, setLimiterEnabled] = useState<boolean>(true);
    const [isPlayingSample, setIsPlayingSample] = useState<boolean>(false);
    const [activeTab, setActiveTab] = useState<'studio' | 'pc' | 'android' | 'tv' | 'faq'>('studio');
    const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

    // Sync sound booster settings
    useEffect(() => {
        soundBooster.setBoost(boostLevel);
    }, [boostLevel]);

    useEffect(() => {
        soundBooster.setDialogueClarity(dialogueClarity);
    }, [dialogueClarity]);

    useEffect(() => {
        soundBooster.setLimiter(limiterEnabled);
    }, [limiterEnabled]);

    // Cleanup sample on unmount
    useEffect(() => {
        return () => {
            soundBooster.stopTestSound();
        };
    }, []);

    const toggleSamplePlayback = () => {
        soundBooster.toggleTestSound((playing) => {
            setIsPlayingSample(playing);
        });
    };

    const copyText = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedSnippet(id);
        setTimeout(() => setCopiedSnippet(null), 2000);
    };

    return (
        <div className="min-h-screen bg-[#0d0d0d] text-white pt-20 pb-24 px-4 sm:px-6 lg:px-8 font-sans selection:bg-brand-red selection:text-white">
            <div className="max-w-5xl mx-auto">

                {/* Back Button & Breadcrumbs */}
                <div className="flex items-center gap-3 mb-8 text-sm">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition flex items-center gap-1.5 border border-white/5"
                    >
                        <ArrowLeft size={16} />
                        <span className="font-medium text-xs">Back</span>
                    </button>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="cursor-pointer hover:text-gray-300" onClick={() => navigate('/')}>Home</span>
                        <span>/</span>
                        <span>Support</span>
                        <span>/</span>
                        <span className="text-amber-400 font-semibold">Sound Enhancements</span>
                    </div>
                </div>

                {/* Hero Header */}
                <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-amber-500/10 via-red-500/5 to-black border border-white/10 p-6 sm:p-10 mb-10 shadow-2xl">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider mb-4">
                            <Zap size={13} className="fill-amber-400 text-amber-400 animate-pulse" />
                            Audio Optimization Center
                        </div>
                        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-4 text-white">
                            Sound Enhancements & <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-brand-red">Volume Booster</span>
                        </h1>
                        <p className="text-gray-300 text-sm sm:text-base max-w-2xl leading-relaxed">
                            Never struggle with quiet movie dialogue or low laptop speakers again. 
                            Experience cinema-grade sound with up to <strong className="text-white">400% Web Audio amplification</strong>, 
                            vocal clarity enhancements, and recommended tools for all your devices.
                        </p>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 mb-8 border-b border-white/10">
                    {[
                        { id: 'studio', label: '🎛️ Live Booster Lab', badge: 'Interactive' },
                        { id: 'pc', label: '💻 Windows & Mac', badge: 'Up to 600%' },
                        { id: 'android', label: '📱 Android & Phones', badge: 'Apps & EQ' },
                        { id: 'tv', label: '📺 Smart TVs & Audio', badge: 'Night Mode' },
                        { id: 'faq', label: '❓ How It Works', badge: 'Tech Guide' }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all border ${
                                activeTab === tab.id
                                    ? 'bg-amber-500 text-black border-amber-400 shadow-lg shadow-amber-500/20 font-extrabold scale-[1.02]'
                                    : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border-white/5'
                            }`}
                        >
                            <span>{tab.label}</span>
                            {tab.badge && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                    activeTab === tab.id ? 'bg-black/20 text-black font-bold' : 'bg-white/10 text-gray-400'
                                }`}>
                                    {tab.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* SECTION 1: LIVE BOOSTER LAB (STUDIO) */}
                {activeTab === 'studio' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-200">
                        <div className="bg-[#121212] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <Sparkles size={18} className="text-amber-400" />
                                        <h2 className="text-xl sm:text-2xl font-bold">Interactive Sound Booster Studio</h2>
                                    </div>
                                    <p className="text-xs sm:text-sm text-gray-400 mt-1">
                                        Test our 400% Web Audio engine with real audio playing through your speakers or headphones.
                                    </p>
                                </div>
                                <button
                                    onClick={toggleSamplePlayback}
                                    className={`flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl font-extrabold text-sm transition-all shadow-lg active:scale-95 ${
                                        isPlayingSample
                                            ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/30 animate-pulse'
                                            : 'bg-amber-400 hover:bg-amber-300 text-black shadow-amber-400/20'
                                    }`}
                                >
                                    {isPlayingSample ? <Square size={16} className="fill-current" /> : <Play size={16} className="fill-current" />}
                                    <span>{isPlayingSample ? 'Stop Demo Audio' : '🎧 Play Demo Audio Sample'}</span>
                                </button>
                            </div>

                            {/* Booster Controls Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-6">

                                {/* Volume Slider & Presets */}
                                <div className="lg:col-span-2 space-y-6 bg-white/[0.02] p-5 rounded-2xl border border-white/5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Volume2 size={20} className="text-amber-400" />
                                            <span className="font-bold text-sm tracking-wide">Audio Amplification Gain</span>
                                        </div>
                                        <span className={`text-xs sm:text-sm font-black px-3 py-1 rounded-full border ${
                                            boostLevel > 1.0
                                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                                                : 'bg-white/5 text-gray-400 border-white/10'
                                        }`}>
                                            {Math.round(boostLevel * 100)}% ({boostLevel}x Volume)
                                        </span>
                                    </div>

                                    {/* Slider */}
                                    <div className="space-y-2">
                                        <input
                                            type="range"
                                            min="1.0"
                                            max="4.0"
                                            step="0.1"
                                            value={boostLevel}
                                            onChange={(e) => setBoostLevel(parseFloat(e.target.value))}
                                            className="w-full h-3 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                                        />
                                        <div className="flex justify-between text-[11px] font-bold text-gray-400">
                                            <span>100% (Standard)</span>
                                            <span>200% (2x Loud)</span>
                                            <span>300% (3x Cinema)</span>
                                            <span className="text-amber-400">400% (4x MAXIMUM)</span>
                                        </div>
                                    </div>

                                    {/* Quick Preset Buttons */}
                                    <div className="flex items-center gap-2 pt-2">
                                        <span className="text-xs font-semibold text-gray-500 mr-1 hidden sm:inline">Presets:</span>
                                        {[1.0, 1.5, 2.0, 3.0, 4.0].map((preset) => (
                                            <button
                                                key={preset}
                                                onClick={() => setBoostLevel(preset)}
                                                className={`flex-1 py-2 rounded-xl text-xs font-bold transition border ${
                                                    Math.abs(boostLevel - preset) < 0.05
                                                        ? 'bg-amber-400 text-black border-amber-300 shadow-md shadow-amber-400/20'
                                                        : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/5'
                                                }`}
                                            >
                                                {Math.round(preset * 100)}%
                                            </button>
                                        ))}
                                    </div>

                                    {/* Visualizer Waveform */}
                                    <div className="p-4 rounded-xl bg-black/60 border border-white/5 flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-xs text-gray-300">
                                            <div className={`w-2 h-2 rounded-full ${isPlayingSample ? 'bg-amber-400 animate-ping' : 'bg-gray-600'}`} />
                                            <span>{isPlayingSample ? 'Signal Active: Web Audio Processing' : 'Signal Idle (Click Play Demo above)'}</span>
                                        </div>
                                        <div className="flex items-end gap-1 h-6">
                                            {[...Array(12)].map((_, i) => (
                                                <div
                                                    key={i}
                                                    className={`w-1 rounded-full transition-all duration-150 ${
                                                        isPlayingSample ? 'bg-amber-400' : 'bg-gray-700'
                                                    }`}
                                                    style={{
                                                        height: isPlayingSample
                                                            ? `${Math.min(100, (Math.sin(i * 0.8 + Date.now() / 200) * 0.5 + 0.5) * (boostLevel * 25))}%`
                                                            : '20%'
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Enhancement Toggles */}
                                <div className="space-y-4 bg-white/[0.02] p-5 rounded-2xl border border-white/5 flex flex-col justify-between">
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Acoustic Processors</h3>

                                        {/* Dialogue Clarity */}
                                        <button
                                            onClick={() => setDialogueClarity(!dialogueClarity)}
                                            className="w-full flex items-start justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-left transition"
                                        >
                                            <div className="flex gap-3">
                                                <Sparkles size={16} className={dialogueClarity ? 'text-amber-400 mt-0.5' : 'text-gray-500 mt-0.5'} />
                                                <div>
                                                    <div className="text-xs font-bold text-white">Dialogue Clarity EQ</div>
                                                    <div className="text-[11px] text-gray-400 mt-0.5 leading-snug">
                                                        Boosts +3.5 dB around 2.4 kHz vocal speech band to make quiet whispers clear over background explosions.
                                                    </div>
                                                </div>
                                            </div>
                                            <div className={`w-8 h-4 rounded-full transition-colors relative flex items-center px-0.5 ml-2 mt-1 shrink-0 ${
                                                dialogueClarity ? 'bg-amber-400' : 'bg-white/10'
                                            }`}>
                                                <div className={`w-3 h-3 rounded-full bg-black transition-transform ${
                                                    dialogueClarity ? 'translate-x-4' : 'translate-x-0'
                                                }`} />
                                            </div>
                                        </button>

                                        {/* Anti-Clipping Limiter */}
                                        <button
                                            onClick={() => setLimiterEnabled(!limiterEnabled)}
                                            className="w-full flex items-start justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-left transition"
                                        >
                                            <div className="flex gap-3">
                                                <ShieldCheck size={16} className={limiterEnabled ? 'text-emerald-400 mt-0.5' : 'text-gray-500 mt-0.5'} />
                                                <div>
                                                    <div className="text-xs font-bold text-white">Anti-Distortion Limiter</div>
                                                    <div className="text-[11px] text-gray-400 mt-0.5 leading-snug">
                                                        Dynamic fast-attack compressor clamps harsh peaks so max volume never crackles or damages speakers.
                                                    </div>
                                                </div>
                                            </div>
                                            <div className={`w-8 h-4 rounded-full transition-colors relative flex items-center px-0.5 ml-2 mt-1 shrink-0 ${
                                                limiterEnabled ? 'bg-emerald-500' : 'bg-white/10'
                                            }`}>
                                                <div className={`w-3 h-3 rounded-full bg-black transition-transform ${
                                                    limiterEnabled ? 'translate-x-4' : 'translate-x-0'
                                                }`} />
                                            </div>
                                        </button>
                                    </div>

                                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200/90 leading-snug">
                                        💡 <strong>Tip:</strong> Direct video files (`.mp4`, `.m3u8`, `.mkv`) in My Donkey run this exact 400% engine right inside your player.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* SECTION 2: PC & MAC BOOSTING */}
                {activeTab === 'pc' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-200">

                        {/* Top Banner explaining Extensions vs Iframe */}
                        <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent border border-amber-500/30 flex items-start gap-4">
                            <Info size={22} className="text-amber-400 shrink-0 mt-0.5" />
                            <div className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                                <strong className="text-white">Why use a Browser Extension on PC?</strong>
                                <br />
                                When a movie streams through an external player embed (`proxy.garageband.rocks`), 
                                browser security isolates the iframe from the webpage. 
                                <strong> Browser extensions have elevated tab-level capture privileges (`chrome.tabCapture`)</strong>, 
                                allowing them to amplify external iframe sound up to <strong className="text-amber-400">600%</strong> with zero limits.
                            </div>
                        </div>

                        {/* PC Extensions Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {PC_TOOLS.map((tool) => (
                                <div key={tool.name} className="bg-[#121212] border border-white/10 rounded-2xl p-5 flex flex-col justify-between hover:border-amber-500/40 transition group">
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-[10px] uppercase font-bold text-amber-300 px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/30">
                                                {tool.badge}
                                            </span>
                                            <span className="text-xs text-gray-400 font-medium">{tool.rating}</span>
                                        </div>
                                        <h3 className="text-lg font-bold text-white group-hover:text-amber-300 transition">
                                            {tool.name}
                                        </h3>
                                        <p className="text-xs text-amber-400/90 font-medium mb-3">{tool.tagline}</p>
                                        <p className="text-xs text-gray-400 leading-relaxed mb-4">{tool.description}</p>
                                        <ul className="space-y-1.5 mb-6">
                                            {tool.features.map((feat, idx) => (
                                                <li key={idx} className="flex items-start gap-2 text-xs text-gray-300">
                                                    <Check size={13} className="text-amber-400 shrink-0 mt-0.5" />
                                                    <span>{feat}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div className="space-y-2 pt-3 border-t border-white/5">
                                        {tool.links.map((link) => (
                                            <a
                                                key={link.label}
                                                href={link.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs transition ${
                                                    link.primary
                                                        ? 'bg-amber-400 hover:bg-amber-300 text-black shadow-md shadow-amber-400/20'
                                                        : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
                                                }`}
                                            >
                                                <span>{link.label}</span>
                                                <ExternalLink size={13} />
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Windows Built-in Guide */}
                        <div className="bg-[#121212] border border-white/10 rounded-3xl p-6 sm:p-8">
                            <div className="flex items-center gap-2.5 mb-4">
                                <Monitor size={20} className="text-blue-400" />
                                <h3 className="text-xl font-bold">Windows Built-In Loudness Equalization (Zero Software)</h3>
                            </div>
                            <p className="text-xs sm:text-sm text-gray-300 mb-6 max-w-3xl leading-relaxed">
                                Windows has a powerful built-in audio dynamic compressor that automatically doubles quiet speech volume and levels loud explosions. It is completely free and works on all browsers without installing any app:
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                                {[
                                    { step: '1', title: 'Open Run Dialog', desc: 'Press Win + R on your keyboard, type mmsys.cpl and press Enter.' },
                                    { step: '2', title: 'Select Device', desc: 'In the Playback tab, right-click your active Speakers or Headphones and click Properties.' },
                                    { step: '3', title: 'Enable Equalization', desc: 'Go to the Enhancements tab, check the box for "Loudness Equalization".' },
                                    { step: '4', title: 'Click Apply & OK', desc: 'Click Apply and OK. All quiet browser audio will immediately sound 2x–3x louder!' }
                                ].map((s) => (
                                    <div key={s.step} className="p-4 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col justify-between">
                                        <div>
                                            <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 font-black flex items-center justify-center mb-2">
                                                {s.step}
                                            </div>
                                            <div className="font-bold text-white mb-1">{s.title}</div>
                                            <div className="text-gray-400 leading-relaxed">{s.desc}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* SECTION 3: ANDROID & MOBILE BOOSTING */}
                {activeTab === 'android' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-200">

                        {/* Android Info Banner */}
                        <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-transparent border border-emerald-500/30 flex items-start gap-4">
                            <Smartphone size={22} className="text-emerald-400 shrink-0 mt-0.5" />
                            <div className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                                <strong className="text-white">Boosting Volume on Android Phones & Tablets</strong>
                                <br />
                                Android has a built-in OS-level sound amplifier API (<code className="text-emerald-300">LoudnessEnhancer</code>). 
                                Free Play Store apps hook directly into this system framework, boosting the sound of Chrome, PWA, and external players by up to <strong className="text-emerald-400">300%</strong>.
                            </div>
                        </div>

                        {/* Android Apps Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {ANDROID_TOOLS.map((tool) => (
                                <div key={tool.name} className="bg-[#121212] border border-white/10 rounded-2xl p-6 flex flex-col justify-between hover:border-emerald-500/40 transition group">
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-[10px] uppercase font-bold text-emerald-300 px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30">
                                                {tool.badge}
                                            </span>
                                            <span className="text-xs text-gray-400 font-medium">{tool.rating}</span>
                                        </div>
                                        <h3 className="text-lg font-bold text-white group-hover:text-emerald-300 transition">
                                            {tool.name}
                                        </h3>
                                        <p className="text-xs text-emerald-400 font-medium mb-3">{tool.tagline}</p>
                                        <p className="text-xs text-gray-400 leading-relaxed mb-4">{tool.description}</p>
                                        <ul className="space-y-2 mb-6">
                                            {tool.features.map((feat, idx) => (
                                                <li key={idx} className="flex items-start gap-2 text-xs text-gray-300">
                                                    <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                                                    <span>{feat}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div className="space-y-2 pt-3 border-t border-white/5">
                                        {tool.links.map((link) => (
                                            <a
                                                key={link.label}
                                                href={link.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-black transition shadow-md shadow-emerald-500/20"
                                            >
                                                <span>{link.label}</span>
                                                <ExternalLink size={14} />
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Phone Manufacturer Audio Settings */}
                        <div className="bg-[#121212] border border-white/10 rounded-3xl p-6 sm:p-8">
                            <div className="flex items-center gap-2.5 mb-4">
                                <Headphones size={20} className="text-purple-400" />
                                <h3 className="text-xl font-bold">Built-In Phone Settings (Samsung, Xiaomi, OnePlus)</h3>
                            </div>
                            <p className="text-xs sm:text-sm text-gray-300 mb-6 leading-relaxed">
                                Most modern smartphones include built-in movie dialogue boosters that are switched off by default:
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                                    <div className="font-bold text-white mb-2 text-sm">Samsung Galaxy</div>
                                    <ol className="list-decimal list-inside space-y-1 text-gray-300">
                                        <li>Open <strong>Settings</strong> &gt; <strong>Sounds and vibration</strong></li>
                                        <li>Tap <strong>Sound quality and effects</strong></li>
                                        <li>Turn ON <strong>Dolby Atmos</strong> and set to <strong>Movie</strong></li>
                                        <li>Enable <strong>Adapt Sound</strong> for vocal clarity</li>
                                    </ol>
                                </div>
                                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                                    <div className="font-bold text-white mb-2 text-sm">Xiaomi / Redmi / Poco</div>
                                    <ol className="list-decimal list-inside space-y-1 text-gray-300">
                                        <li>Open <strong>Settings</strong> &gt; <strong>Sound &amp; vibration</strong></li>
                                        <li>Tap <strong>Sound effects / Dolby</strong></li>
                                        <li>Select <strong>Voice Enhancement</strong> or <strong>Cinema</strong></li>
                                        <li>Adjust Graphic Equalizer (raise 2kHz - 4kHz)</li>
                                    </ol>
                                </div>
                                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                                    <div className="font-bold text-white mb-2 text-sm">OnePlus / Realme / Motorola</div>
                                    <ol className="list-decimal list-inside space-y-1 text-gray-300">
                                        <li>Open <strong>Settings</strong> &gt; <strong>Sound &amp; vibration</strong></li>
                                        <li>Tap <strong>Dolby Atmos / Dirac Audio</strong></li>
                                        <li>Select profile: <strong>Dialogue</strong> or <strong>Movie</strong></li>
                                        <li>Notice immediate 2x volume boost in whispers</li>
                                    </ol>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* SECTION 4: SMART TVS & SOUNDBARS */}
                {activeTab === 'tv' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-200">
                        <div className="bg-[#121212] border border-white/10 rounded-3xl p-6 sm:p-8">
                            <div className="flex items-center gap-2.5 mb-4">
                                <Tv size={22} className="text-amber-400" />
                                <h3 className="text-xl font-bold">Optimizing Audio for Smart TVs & Soundbars</h3>
                            </div>
                            <p className="text-xs sm:text-sm text-gray-300 mb-6 leading-relaxed">
                                When streaming on a Smart TV or connected home theater, action scenes can be deafeningly loud while actors’ voices are too quiet to hear. Here is how to fix it on major TV platforms:
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                                    <div className="font-bold text-white text-sm">LG webOS Smart TVs</div>
                                    <p className="text-gray-400">
                                        Go to <strong>Settings &gt; Sound &gt; Sound Mode</strong> and select <strong>Clear Voice Pro</strong>. 
                                        This activates LG's AI sound processor to isolate speech frequencies from background music.
                                    </p>
                                </div>
                                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                                    <div className="font-bold text-white text-sm">Samsung Tizen Smart TVs</div>
                                    <p className="text-gray-400">
                                        Go to <strong>Settings &gt; Sound &gt; Expert Settings</strong> and enable <strong>Voice Amplifier</strong> (AVA) and <strong>Auto Volume</strong>. 
                                        This equalizes volume spikes across movies.
                                    </p>
                                </div>
                                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                                    <div className="font-bold text-white text-sm">Android TV / Google TV / Fire TV</div>
                                    <p className="text-gray-400">
                                        Go to <strong>Device Preferences &gt; Sound &gt; Advanced Audio</strong>. 
                                        Enable <strong>Night Mode</strong> or <strong>Dialogue Enhancement</strong>. 
                                        This suppresses excessive dynamic range so whispers stay audible without loud explosions.
                                    </p>
                                </div>
                                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                                    <div className="font-bold text-white text-sm">Soundbars & AV Receivers</div>
                                    <p className="text-gray-400">
                                        Turn up the <strong>Center Channel (+2 to +4 dB)</strong> on your receiver or soundbar. 
                                        In 5.1 / 7.1 movie audio mixes, almost 90% of all spoken dialogue is routed through the center speaker.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* SECTION 5: FAQ & TECH GUIDE */}
                {activeTab === 'faq' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-200">
                        {[
                            {
                                q: 'Why do some movies sound much quieter than YouTube or music?',
                                a: 'Hollywood movies and cinema blockbusters are mixed with a high Dynamic Range (intended for theater sound systems with dedicated center speakers and subwoofers). On typical laptop, phone, or TV stereo speakers, the dialogue can sound faint while explosions sound loud. Audio boosters and Dialogue Clarity EQ compress this dynamic range to bring dialogue to front-and-center.'
                            },
                            {
                                q: 'Why does the in-player booster require an extension for some titles?',
                                a: 'Titles loaded through third-party embed servers (proxy.garageband.rocks) run inside a sandboxed iframe. Browser security (Same-Origin Policy) forbids websites from intercepting or boosting cross-origin iframe audio. Browser extensions operate at the tab level, bypassing this sandbox to boost the entire tab up to 600%.'
                            },
                            {
                                q: 'Which titles support the built-in 400% Web Audio booster natively?',
                                a: 'All direct video files (.mp4, .m3u8, .mkv, Cloudflare R2 streams) rendered by our MoviEngine player support the built-in 400% booster, Dialogue Clarity EQ, and Anti-Clipping Limiter with zero extensions required.'
                            },
                            {
                                q: 'Will boosting audio damage my speakers or headphones?',
                                a: 'Setting the boost to 150%–200% is safe for all modern devices. If you push the boost to 300%–400%, our Anti-Distortion Limiter automatically clamps peak signals to prevent speaker clipping. However, we recommend keeping volume at a comfortable listening level to protect your hearing.'
                            }
                        ].map((faq, idx) => (
                            <div key={idx} className="p-6 rounded-2xl bg-[#121212] border border-white/10">
                                <h4 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                                    <Zap size={15} className="text-amber-400" />
                                    {faq.q}
                                </h4>
                                <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                                    {faq.a}
                                </p>
                            </div>
                        ))}
                    </div>
                )}

            </div>
        </div>
    );
};

export default SoundEnhancementsPage;
