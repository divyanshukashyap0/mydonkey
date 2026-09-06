import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Tv,
    Smartphone,
    Monitor,
    Laptop,
    Cast,
    QrCode,
    CheckCircle2,
    SlidersHorizontal,
    Sparkles,
    Zap,
    ExternalLink,
    ChevronRight,
    Search,
    Wifi,
    Check,
    HelpCircle,
    Info,
    Flame
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import HelpPageHeader from './HelpPageHeader';

interface DevicePlatform {
    id: string;
    title: string;
    badge: string;
    icon: any;
    accentColor: string;
    accentBg: string;
    setupType: 'pwa' | 'browser' | 'cast' | 'native';
    description: string;
    steps: string[];
    proTips: string[];
}

const DEVICE_PLATFORMS: DevicePlatform[] = [
    {
        id: 'samsung-tizen',
        title: 'Samsung Smart TV',
        badge: 'Tizen OS (2018+)',
        icon: Tv,
        accentColor: 'text-blue-400',
        accentBg: 'bg-blue-500/10 border-blue-500/30',
        setupType: 'browser',
        description: 'Optimized for Samsung Smart Hub web browser and Smart View 4K screen mirroring.',
        steps: [
            'Press the Home button on your Samsung Smart Remote and open the "Internet" browser app.',
            'Enter "mydonkey.in" in the address bar and press Enter.',
            'Click the Settings (three dots / gear icon) in the top-right of the TV browser and select "Add to Home Screen".',
            'Log into your account or sync via 6-digit TV code from this guide.',
            'Press the Fullscreen icon on any video player for true borderless 4K HDR playback.'
        ],
        proTips: [
            'Turn OFF "Auto Motion Plus" in Picture > Expert Settings to eliminate the soap-opera effect.',
            'Samsung Galaxy phone users can tap "Smart View" in quick toggles to mirror streams in zero-latency 60fps.'
        ]
    },
    {
        id: 'lg-webos',
        title: 'LG Smart TV',
        badge: 'webOS 4.0 - 24',
        icon: Tv,
        accentColor: 'text-rose-400',
        accentBg: 'bg-rose-500/10 border-rose-500/30',
        setupType: 'browser',
        description: 'Crystal-clear OLED & NanoCell playback using LG Web Browser or Apple AirPlay 2.',
        steps: [
            'Press the Home button on your LG Magic Remote and select "Web Browser".',
            'Navigate to "mydonkey.in" and sign in.',
            'Click the Star/Bookmark icon to pin My Donkey directly to your LG Quick Access ribbon on the home screen.',
            'For iPhone/iPad users: Tap the AirPlay icon on your mobile player and select your LG TV instantly without typing credentials.',
            'Use the LG Magic Remote pointer to navigate episodes and audio tracks seamlessly.'
        ],
        proTips: [
            'Switch Picture Mode to "Filmmaker Mode" or "Cinema" for director-intended colors.',
            'Set Sound Out to "eARC / Optical" and enable "Clear Voice Pro" for boosted dialogue.'
        ]
    },
    {
        id: 'android-tv',
        title: 'Android TV & Google TV',
        badge: 'Sony, TCL, Mi & Chromecast',
        icon: Cast,
        accentColor: 'text-emerald-400',
        accentBg: 'bg-emerald-500/10 border-emerald-500/30',
        setupType: 'cast',
        description: 'Built-in Google Cast and native browser experience across all Android TV & Google TV units.',
        steps: [
            'Ensure your TV and phone/laptop are connected to the same Wi-Fi network.',
            'Open My Donkey on your phone or Chrome/Edge browser.',
            'Click the Google Cast icon in the player or right-click > "Cast..." in Chrome.',
            'Select your Android TV / Chromecast device to beam the video directly in up to 4K resolution.',
            'Alternatively, install "Puffin TV Browser" or "JioPages TV" from Google Play Store on your TV and open mydonkey.in directly.'
        ],
        proTips: [
            'Google TV supports direct voice search when synced with your Google Assistant account.',
            'Enable "Match Content Frame Rate" in Google TV Display settings for judder-free 24Hz cinema playback.'
        ]
    },
    {
        id: 'fire-tv',
        title: 'Amazon Fire TV & FireStick',
        badge: 'Fire OS 6, 7 & 8',
        icon: Flame,
        accentColor: 'text-amber-400',
        accentBg: 'bg-amber-500/10 border-amber-500/30',
        setupType: 'browser',
        description: 'Flawless full-screen video acceleration with Amazon Silk Browser on all Fire TV sticks and cubes.',
        steps: [
            'On your Fire TV home screen, search for "Amazon Silk" and install the free official web browser.',
            'Open Silk, type "mydonkey.in" into the search bar, and bookmark the URL.',
            'Press the Menu button (three horizontal lines on Fire remote) and select "Full Screen".',
            'Use the Alexa Voice Remote to pause, play, and scrub effortlessly.',
            'For fast sync, enter your 6-digit sync code or scan the QR code using your phone.'
        ],
        proTips: [
            'Hold the Home button on your Fire remote and select "Mirroring" to mirror mobile screens instantly.',
            'In Fire TV Settings > Display & Sounds > Audio > Surround Sound, select "Best Available".'
        ]
    },
    {
        id: 'apple-ecosystem',
        title: 'Apple TV, Mac & iPad',
        badge: 'AirPlay 2 & PWA',
        icon: Monitor,
        accentColor: 'text-purple-400',
        accentBg: 'bg-purple-500/10 border-purple-500/30',
        setupType: 'cast',
        description: 'Lossless AirPlay 2 streaming, Dolby Atmos surround, and Safari Progressive Web App support.',
        steps: [
            'On Mac/iPad/iPhone Safari, visit "mydonkey.in".',
            'Tap the Share button in Safari toolbar and choose "Add to Dock" (macOS Sonoma+) or "Add to Home Screen" (iOS/iPadOS).',
            'My Donkey now launches as a dedicated fullscreen borderless application.',
            'To stream to Apple TV: Start any video, tap the AirPlay symbol, and choose your Apple TV.',
            'Audio automatically syncs with HomePods or AirPods with Spatial Audio enabled.'
        ],
        proTips: [
            'Enable "Reduce Loud Sounds" in Apple TV Settings > Video and Audio to normalize cinema explosions.',
            'Use Spatial Audio on AirPods Pro / Max for personal theater-grade 3D surround sound.'
        ]
    },
    {
        id: 'desktop-pwa',
        title: 'PC & Laptop (Windows / macOS / Linux)',
        badge: 'Chrome, Edge & Brave',
        icon: Laptop,
        accentColor: 'text-cyan-400',
        accentBg: 'bg-cyan-500/10 border-cyan-500/30',
        setupType: 'pwa',
        description: 'Native desktop application mode with keyboard shortcuts, hardware decoding, and offline caching.',
        steps: [
            'Open Google Chrome, Microsoft Edge, or Brave on your computer.',
            'Navigate to mydonkey.in.',
            'Look at the right side of the address bar for the "Install App" or "App Available" icon (computer monitor with downward arrow).',
            'Click "Install" to create a desktop shortcut and launch My Donkey in its own standalone window.',
            'Enjoy full keyboard shortcuts: Space (Play/Pause), F (Fullscreen), M (Mute), Arrow Keys (5s Seek).'
        ],
        proTips: [
            'Pair with our Sound Enhancements page (/sound-enhancements) to boost quiet dialogue up to 400%.',
            'Enable Hardware Acceleration in browser settings for smooth 60fps 4K playback.'
        ]
    }
];

const DevicesGuidePage: React.FC = () => {
    const navigate = useNavigate();
    const { isInstallable, installPwa } = useStore();
    const [activePlatform, setActivePlatform] = useState<string>('samsung-tizen');
    const [syncCode, setSyncCode] = useState('');
    const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [userDeviceType, setUserDeviceType] = useState<string>('Detecting device...');

    // Auto-detect user environment
    useEffect(() => {
        const ua = navigator.userAgent;
        if (/smart-tv|tizen|webos|bravia|netcast|viera/i.test(ua)) {
            setUserDeviceType('Smart TV Browser');
        } else if (/ipad|tablet/i.test(ua)) {
            setUserDeviceType('Tablet / iPad');
        } else if (/android/i.test(ua)) {
            setUserDeviceType('Android Mobile');
        } else if (/iphone/i.test(ua)) {
            setUserDeviceType('Apple iPhone');
        } else if (/macintosh|mac os x/i.test(ua)) {
            setUserDeviceType('Apple Mac (macOS)');
        } else if (/windows/i.test(ua)) {
            setUserDeviceType('Windows PC / Laptop');
        } else {
            setUserDeviceType('Desktop Web Browser');
        }
    }, []);

    const selectedPlatformData = useMemo(() => {
        return DEVICE_PLATFORMS.find(p => p.id === activePlatform) || DEVICE_PLATFORMS[0];
    }, [activePlatform]);

    const handleSyncSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const cleaned = syncCode.replace(/[^0-9A-Za-z]/g, '').toUpperCase();
        if (cleaned.length < 6) return;

        setSyncStatus('loading');
        setTimeout(() => {
            setSyncStatus('success');
        }, 1500);
    };

    return (
        <div className="min-h-screen bg-[#0c0c0c] text-white font-sans selection:bg-brand-red selection:text-white">
            <HelpPageHeader
                breadcrumbs={[
                    { label: 'Support', path: '/support' },
                    { label: 'Supported Devices & Smart TV', active: true }
                ]}
                backTo="/support"
                backLabel="Back to Support"
                rightBadge={
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                        <Tv size={13} />
                        <span>TV &amp; Casting</span>
                    </span>
                }
            />

            <div className="max-w-6xl mx-auto pt-6 sm:pt-8 pb-28 px-4 sm:px-6 lg:px-8">

                {/* Hero Header */}
                <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-emerald-600/20 via-black to-[#111111] border border-white/10 p-6 sm:p-12 mb-12 shadow-2xl">
                    <div className="max-w-3xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold mb-5 tracking-wide">
                            <Tv size={14} />
                            <span>BIG SCREEN &amp; TV STREAMING ECOSYSTEM</span>
                        </div>

                        <h1 className="text-3xl sm:text-5xl font-black tracking-tight mb-4 leading-tight">
                            Stream On Every <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">Screen You Own</span>
                        </h1>

                        <p className="text-gray-300 text-sm sm:text-base leading-relaxed mb-8">
                            Whether you're watching on a 75" 4K OLED TV, beaming via Chromecast, or relaxing on your laptop, My Donkey adapts smoothly. Link smart TVs with a 6-digit sync code, scan with your phone, or cast in seconds.
                        </p>

                        <div className="flex flex-wrap items-center gap-3">
                            <button
                                onClick={() => navigate('/scan')}
                                className="px-5 py-3 rounded-2xl bg-brand-red hover:bg-red-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 transition shadow-lg shadow-brand-red/20 active:scale-95"
                            >
                                <QrCode size={16} />
                                <span>Launch Mobile QR Scanner</span>
                            </button>

                            {isInstallable && (
                                <button
                                    onClick={installPwa}
                                    className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs sm:text-sm border border-white/15 flex items-center gap-2 transition active:scale-95"
                                >
                                    <Monitor size={16} />
                                    <span>Install Desktop App</span>
                                </button>
                            )}

                            <div className="px-3.5 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-xs text-gray-400 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                <span>Current Client: <strong className="text-white">{userDeviceType}</strong></span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Instant TV Sync Code Widget */}
                <div className="mb-14 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-white/[0.04] to-white/[0.01] border border-white/10 backdrop-blur-xl shadow-xl">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                                <QrCode size={28} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white mb-1">
                                    Link TV With 6 or 8-Digit Sync Code
                                </h3>
                                <p className="text-xs sm:text-sm text-gray-400 max-w-lg">
                                    Displaying a sync code on your TV screen? Enter the alphanumeric code below to authenticate your big screen instantly.
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleSyncSubmit} className="w-full md:w-auto flex items-center gap-3">
                            <input
                                type="text"
                                maxLength={8}
                                value={syncCode}
                                onChange={(e) => setSyncCode(e.target.value.toUpperCase())}
                                placeholder="ENTER CODE"
                                className="w-40 sm:w-48 px-4 py-3 rounded-xl bg-black/80 border border-white/20 focus:border-emerald-400 text-center font-mono text-base tracking-[0.2em] uppercase font-black text-white outline-none transition"
                            />
                            <button
                                type="submit"
                                disabled={syncCode.trim().length < 6 || syncStatus === 'loading'}
                                className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:hover:bg-emerald-500 text-black font-extrabold text-xs transition active:scale-95 shadow-lg shadow-emerald-500/20"
                            >
                                {syncStatus === 'loading' ? 'Syncing...' : syncStatus === 'success' ? 'Connected!' : 'Sync TV'}
                            </button>
                        </form>
                    </div>

                    {syncStatus === 'success' && (
                        <div className="mt-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                            <CheckCircle2 size={16} />
                            <span>Authorization handshake received! Your TV session is now connected and refreshed.</span>
                        </div>
                    )}
                </div>

                {/* Section 2: Platform Selection & Setup Guides */}
                <div className="mb-14">
                    <div className="mb-6">
                        <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2.5">
                            <Zap size={20} className="text-brand-red fill-brand-red" />
                            <span>Step-by-Step Setup By TV &amp; Device Brand</span>
                        </h2>
                        <p className="text-xs sm:text-sm text-gray-400 mt-1">
                            Select your TV manufacturer or streaming device for tailored picture, browser, and casting instructions.
                        </p>
                    </div>

                    {/* Platform Selector Tabs */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
                        {DEVICE_PLATFORMS.map((platform) => {
                            const IconComponent = platform.icon;
                            const isSelected = activePlatform === platform.id;
                            return (
                                <button
                                    key={platform.id}
                                    onClick={() => setActivePlatform(platform.id)}
                                    className={`p-4 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between ${
                                        isSelected
                                            ? `${platform.accentBg} text-white shadow-xl scale-[1.02]`
                                            : 'bg-white/[0.02] hover:bg-white/[0.05] border-white/5 text-gray-400 hover:text-white'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <IconComponent size={20} className={isSelected ? platform.accentColor : 'text-gray-500'} />
                                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-white leading-tight mb-1">{platform.title}</div>
                                        <div className="text-[10px] text-gray-400 truncate">{platform.badge}</div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Active Platform Guide Card */}
                    <div className="p-6 sm:p-10 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 mb-8 border-b border-white/10">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <h3 className="text-2xl font-black text-white">{selectedPlatformData.title}</h3>
                                    <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${selectedPlatformData.accentBg} ${selectedPlatformData.accentColor}`}>
                                        {selectedPlatformData.badge}
                                    </span>
                                </div>
                                <p className="text-xs sm:text-sm text-gray-300">
                                    {selectedPlatformData.description}
                                </p>
                            </div>

                            <button
                                onClick={() => navigate('/scan')}
                                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white border border-white/10 flex items-center gap-2 self-start md:self-auto transition"
                            >
                                <QrCode size={14} />
                                <span>Pair With QR Code</span>
                            </button>
                        </div>

                        {/* Step-by-Step Instructions */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                            <div>
                                <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-400 mb-4 flex items-center gap-2">
                                    <span>Setup Walkthrough</span>
                                </h4>
                                <ol className="space-y-3">
                                    {selectedPlatformData.steps.map((step, idx) => (
                                        <li key={idx} className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/[0.02] border border-white/5">
                                            <span className="w-6 h-6 rounded-full bg-brand-red/20 text-brand-red font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                                                {idx + 1}
                                            </span>
                                            <span className="text-xs sm:text-sm text-gray-200 leading-relaxed">
                                                {step}
                                            </span>
                                        </li>
                                    ))}
                                </ol>
                            </div>

                            {/* Cinema Calibration & Pro Tips */}
                            <div>
                                <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-400 mb-4 flex items-center gap-2">
                                    <span>Cinema Calibration &amp; Pro Tips</span>
                                </h4>
                                <div className="space-y-3">
                                    {selectedPlatformData.proTips.map((tip, idx) => (
                                        <div key={idx} className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex items-start gap-3">
                                            <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                                            <span className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                                                {tip}
                                            </span>
                                        </div>
                                    ))}

                                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                                        <div className="text-xs font-bold text-white mb-1 flex items-center gap-1.5">
                                            <Sparkles size={13} className="text-amber-400" />
                                            <span>4K HDR Bitrate Buffer Tuning</span>
                                        </div>
                                        <p className="text-xs text-gray-400 leading-relaxed">
                                            For seamless buffer-free 4K playback, ensure your TV is connected via 5GHz Wi-Fi or wired Ethernet. If you experience buffering, switch stream servers from the video player settings.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section 3: Recommended Picture & Audio Settings for TVs */}
                <div className="p-6 sm:p-10 rounded-3xl bg-gradient-to-br from-purple-900/10 via-black to-[#121212] border border-purple-500/20 mb-14">
                    <h3 className="text-lg sm:text-xl font-bold text-white mb-2 flex items-center gap-2.5">
                        <SlidersHorizontal size={20} className="text-purple-400" />
                        <span>Universal Smart TV Calibration Guide (4K HDR)</span>
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-400 mb-6">
                        Most modern televisions are shipped in "Vivid" or "Store Demo" mode with harsh sharpening and motion smoothing that ruins cinema framerates. Apply these 3 quick tweaks:
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                            <div className="text-xs font-black uppercase tracking-wider text-purple-300 mb-1.5">1. Picture Mode</div>
                            <div className="text-sm font-bold text-white mb-1">Select "Filmmaker Mode" or "Cinema"</div>
                            <p className="text-xs text-gray-400 leading-relaxed">
                                Disables unnatural oversaturation and preserves director-intended color temperature (Warm 50 / Warm 2).
                            </p>
                        </div>

                        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                            <div className="text-xs font-black uppercase tracking-wider text-purple-300 mb-1.5">2. Motion Smoothing</div>
                            <div className="text-sm font-bold text-white mb-1">Turn Motion Smoothing OFF</div>
                            <p className="text-xs text-gray-400 leading-relaxed">
                                Set TruMotion, Auto Motion Plus, or Motionflow to "Off" to eliminate soap opera effect and keep authentic 24fps film motion.
                            </p>
                        </div>

                        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                            <div className="text-xs font-black uppercase tracking-wider text-purple-300 mb-1.5">3. Audio Clarity</div>
                            <div className="text-sm font-bold text-white mb-1">Clear Voice &amp; Dynamic Range</div>
                            <p className="text-xs text-gray-400 leading-relaxed">
                                Enable Clear Voice / Dialogue Enhancement in TV sound settings, or use our dedicated <span className="text-amber-400 font-bold cursor-pointer underline" onClick={() => navigate('/sound-enhancements')}>Sound Booster</span>.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Section 4: Quick Help & Cross Navigation */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 rounded-3xl bg-white/[0.02] border border-white/5">
                    <div>
                        <h4 className="text-sm font-bold text-white mb-1">Need direct assistance connecting your TV?</h4>
                        <p className="text-xs text-gray-400">Our 24/7 support desk is standing by to troubleshoot network and casting issues.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/support')}
                            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white transition"
                        >
                            All Support Topics
                        </button>
                        <button
                            onClick={() => navigate('/contact')}
                            className="px-4 py-2.5 rounded-xl bg-brand-red hover:bg-red-700 text-xs font-bold text-white transition shadow-lg shadow-brand-red/20"
                        >
                            Open Support Desk
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default DevicesGuidePage;
