import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Shield,
    ShieldCheck,
    Smartphone,
    Monitor,
    Copy,
    Check,
    ExternalLink,
    Sparkles,
    Zap,
    Lock,
    Wifi,
    CheckCircle2,
    HelpCircle,
    Download,
    ChevronRight,
    Flame
} from 'lucide-react';

interface AdblockerTool {
    name: string;
    tagline: string;
    description: string;
    rating: string;
    badge?: string;
    iconColor: string;
    features: string[];
    platforms: ('pc' | 'android' | 'ios')[];
    links: {
        label: string;
        url: string;
        icon?: string;
    }[];
}

interface DNSProvider {
    name: string;
    hostname: string;
    badge: string;
    tagline: string;
    description: string;
    features: string[];
    popular: boolean;
    setupGuideUrl?: string;
}

const PC_ADBLOCKERS: AdblockerTool[] = [
    {
        name: 'uBlock Origin',
        tagline: 'The undisputed gold standard of adblockers',
        description: 'An ultra-efficient, open-source content blocker. It blocks video ads, banner ads, tracking scripts, and malicious pop-up redirects while consuming virtually zero CPU and memory.',
        rating: '4.9/5 (10M+ users)',
        badge: 'Top Recommended',
        iconColor: 'from-red-600 to-rose-700',
        features: [
            'Completely eliminates video stream popups & redirects',
            'Zero noticeable impact on streaming performance',
            '100% Free & Open Source, zero commercial tracking',
            'Blocks malware domains and coin-miners'
        ],
        platforms: ['pc'],
        links: [
            { label: 'Chrome Web Store', url: 'https://chromewebstore.google.com/detail/ublock-origin/cjpalhdlnbpafiamejdnhcphjbkeiagm' },
            { label: 'Firefox Add-ons', url: 'https://addons.mozilla.org/en-US/firefox/addon/ublock-origin/' },
            { label: 'Edge Add-ons', url: 'https://microsoftedge.microsoft.com/addons/detail/ublock-origin/odfafepnkmbhccpbejgmiehpchacaeak' },
            { label: 'Opera Addons', url: 'https://addons.opera.com/en/extensions/details/ublock-origin/' }
        ]
    },
    {
        name: 'Brave Browser',
        tagline: 'Best browser with native ad & tracker shield built-in',
        description: 'If you want zero setup, Brave is a privacy-first browser that automatically blocks all ads, popups, and trackers out of the box without requiring any extensions.',
        rating: '4.8/5',
        badge: 'Zero Setup Required',
        iconColor: 'from-orange-500 to-amber-600',
        features: [
            'Built-in Brave Shields blocks all intrusive video ads',
            'Chromium-based: fast, smooth, compatible with all extensions',
            'Available across PC, Mac, Linux, Android, and iOS',
            'Saves mobile data and speeds up streaming load times'
        ],
        platforms: ['pc', 'android', 'ios'],
        links: [
            { label: 'Download for Windows / Mac', url: 'https://brave.com/download/' },
            { label: 'Google Play Store', url: 'https://play.google.com/store/apps/details?id=com.brave.browser' },
            { label: 'Apple App Store', url: 'https://apps.apple.com/app/brave-private-web-browser/id1052879175' }
        ]
    },
    {
        name: 'AdGuard AdBlocker',
        tagline: 'Comprehensive ad filtering & tracking protection',
        description: 'Available as a lightweight browser extension or standalone system-wide desktop application. Excellent cosmetic filtering to remove leftover empty ad banners and video popups.',
        rating: '4.7/5 (15M+ users)',
        iconColor: 'from-emerald-600 to-teal-700',
        features: [
            'Advanced popup blocker prevents unwanted new tab redirects',
            'Cosmetic filters hide blank spaces left behind by ads',
            'Built-in phishing and malicious website protection',
            'Regularly updated community filter lists'
        ],
        platforms: ['pc'],
        links: [
            { label: 'Chrome Extension', url: 'https://chromewebstore.google.com/detail/adguard-adblocker/bgnkhhnnamicmpeenaelnjfhikgbkllg' },
            { label: 'Firefox Add-on', url: 'https://addons.mozilla.org/en-US/firefox/addon/adguard-adblocker/' },
            { label: 'Official Website', url: 'https://adguard.com/' }
        ]
    }
];

const DNS_PROVIDERS: DNSProvider[] = [
    {
        name: 'AdGuard DNS',
        hostname: 'dns.adguard-dns.com',
        badge: 'Most Popular',
        tagline: 'Zero-app system-wide adblocking for Android & iOS',
        description: 'The world\'s most popular privacy-focused DNS. Blocks ads, popups, and trackers across your whole smartphone—in Chrome, Samsung Internet, and third-party apps—without installing any apps or draining battery.',
        popular: true,
        features: [
            'Blocks in-app ads, mobile browser popups, and tracking',
            'No apps or software needed: configured in phone settings',
            'Zero battery consumption & zero RAM overhead',
            'Supports TLS (DoT) and HTTPS (DoH) encryption'
        ],
        setupGuideUrl: 'https://adguard-dns.io/en/public-dns.html'
    },
    {
        name: 'Control D',
        hostname: 'p2.freedns.controld.com',
        badge: 'High Performance',
        tagline: 'Lightning-fast DNS with built-in ad & malware blocking',
        description: 'A modern, high-speed resolver by the creators of Windscribe. The "p2" configuration automatically filters ads, trackers, and malicious phishing domains worldwide.',
        popular: false,
        features: [
            'Ultra-low latency with global Anycast network',
            'Filters ads, banners, video popups, and telemetries',
            'Zero logging policy for maximum privacy',
            'Direct support for Android Private DNS'
        ],
        setupGuideUrl: 'https://controld.com/free-dns'
    },
    {
        name: 'NextDNS',
        hostname: 'dns.nextdns.io',
        badge: 'Advanced & Custom',
        tagline: 'Your personal cloud-based firewall & ad shield',
        description: 'NextDNS protects you from all kinds of security threats, blocks ads and trackers on websites and in apps, and gives you an optional web dashboard to inspect blocked queries.',
        popular: false,
        features: [
            'Customize which blocklists to use (EasyList, AdGuard, etc.)',
            'Block trackers, native device telemetry, and malware',
            'Detailed analytics dashboard (optional)',
            'Profiles for iOS (1-tap mobileconfig) and Android'
        ],
        setupGuideUrl: 'https://nextdns.io/'
    },
    {
        name: 'Mullvad DNS (AdBlock)',
        hostname: 'adblock.doh.mullvad.net',
        badge: 'Strict Privacy',
        tagline: 'Swedish privacy champions with zero logging',
        description: 'Provided by Mullvad VPN, famous for uncompromising digital privacy. This DNS resolver silently filters known ad networks and tracking servers before they load.',
        popular: false,
        features: [
            'Zero logs, zero personal data retention',
            'Blocks advertisements, spyware, and tracking cookies',
            'High-bandwidth server locations worldwide',
            'Supports DNS-over-TLS (DoT) and DNS-over-HTTPS (DoH)'
        ],
        setupGuideUrl: 'https://mullvad.net/en/help/dns-over-https-and-dns-over-tls'
    }
];

const MOBILE_BROWSERS = [
    {
        name: 'Brave Mobile Browser',
        os: 'Android & iOS',
        description: 'The easiest way to stream without ads on your phone. Comes with built-in ad and pop-up blocking that automatically stops streaming player redirect popups.',
        playUrl: 'https://play.google.com/store/apps/details?id=com.brave.browser',
        appStoreUrl: 'https://apps.apple.com/app/brave-private-web-browser/id1052879175',
        badge: 'Recommended for Everyone'
    },
    {
        name: 'Firefox for Android + uBlock Origin',
        os: 'Android Only',
        description: 'Firefox on Android supports desktop browser extensions! Install Firefox, go to Add-ons, and enable uBlock Origin for full desktop-grade adblocking on mobile.',
        playUrl: 'https://play.google.com/store/apps/details?id=org.mozilla.firefox',
        badge: 'Ultimate Power Users'
    },
    {
        name: 'AdGuard for Safari',
        os: 'iOS / iPhone Only',
        description: 'Apple\'s Safari browser supports native Content Blockers. Install the free AdGuard app from the App Store and turn on Safari content filtering in iOS Settings.',
        appStoreUrl: 'https://apps.apple.com/app/adguard-adblocker-privacy/id1047223162',
        badge: 'Best for iPhone Safari'
    }
];

const AdblockerGuidePage: React.FC = () => {
    const navigate = useNavigate();
    const [selectedTab, setSelectedTab] = useState<'all' | 'pc' | 'android' | 'ios'>('all');
    const [copiedHost, setCopiedHost] = useState<string | null>(null);
    const [activeDnsTab, setActiveDnsTab] = useState<'android' | 'ios'>('android');

    const handleCopy = (hostname: string) => {
        navigator.clipboard.writeText(hostname);
        setCopiedHost(hostname);
        setTimeout(() => {
            setCopiedHost(null);
        }, 2200);
    };

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white font-sans selection:bg-cyan-500 selection:text-black">
            {/* Ambient Background Glows */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-b from-cyan-600/15 via-blue-600/10 to-transparent blur-3xl" />
                <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-3xl" />
                <div className="absolute bottom-20 -left-40 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-3xl" />
            </div>

            {/* Sticky Navigation Header */}
            <header className="sticky top-0 z-50 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/10 px-4 md:px-8 py-4">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-gray-300 hover:text-white px-3.5 py-1.5 rounded-xl hover:bg-white/5 transition-all text-sm font-semibold group cursor-pointer"
                    >
                        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                        <span>Back</span>
                    </button>

                    <div className="flex items-center gap-2 bg-white/5 px-3.5 py-1.5 rounded-full border border-white/10">
                        <ShieldCheck size={16} className="text-cyan-400" />
                        <span className="text-xs font-bold text-gray-200">Ad-Free Streaming Setup</span>
                    </div>

                    <button
                        onClick={() => navigate('/')}
                        className="text-xs font-bold text-gray-400 hover:text-white transition-colors"
                    >
                        Home
                    </button>
                </div>
            </header>

            <main className="relative z-10 max-w-6xl mx-auto px-4 md:px-8 pt-10 pb-24">
                {/* Hero Header */}
                <div className="text-center max-w-3xl mx-auto mb-12">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-extrabold uppercase tracking-wider mb-4 shadow-lg shadow-cyan-500/10">
                        <Sparkles size={14} className="text-cyan-400 animate-pulse" />
                        Pure, Uninterrupted Cinema
                    </div>

                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight mb-4">
                        Block Ads & Popups <br className="hidden sm:block" />
                        <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-300 bg-clip-text text-transparent">
                            Across All Your Devices
                        </span>
                    </h1>

                    <p className="text-sm md:text-base text-gray-300 leading-relaxed max-w-2xl mx-auto mb-8">
                        Stream smoothly without annoying redirects, banner overlays, or video ad popups.
                        Here are our tested, <strong>100% free and open</strong> recommendations for PC browsers and smartphone Private DNS.
                    </p>

                    {/* Quick Feature Pills */}
                    <div className="flex flex-wrap justify-center items-center gap-3 text-xs text-gray-300">
                        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                            <Zap size={14} className="text-amber-400" /> Faster Stream Loading
                        </span>
                        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                            <Lock size={14} className="text-emerald-400" /> Blocks Malicious Redirects
                        </span>
                        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                            <Flame size={14} className="text-cyan-400" /> Zero Root / No Jailbreak
                        </span>
                    </div>
                </div>

                {/* Device Platform Tabs */}
                <div className="flex justify-center mb-12">
                    <div className="inline-flex p-1.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-2xl">
                        {[
                            { id: 'all', label: 'All Recommendations', icon: Sparkles },
                            { id: 'pc', label: 'PC & Mac (Desktop)', icon: Monitor },
                            { id: 'android', label: 'Android Phone', icon: Smartphone },
                            { id: 'ios', label: 'iPhone (iOS)', icon: Smartphone }
                        ].map((tab) => {
                            const Icon = tab.icon;
                            const isActive = selectedTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setSelectedTab(tab.id as any)}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all cursor-pointer ${
                                        isActive
                                            ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25 scale-100'
                                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    <Icon size={16} />
                                    <span>{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* SECTION 1: SMARTPHONE PRIVATE DNS (Highlighted First for Mobile) */}
                {(selectedTab === 'all' || selectedTab === 'android' || selectedTab === 'ios') && (
                    <section className="mb-16">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 border-b border-white/10 pb-4">
                            <div>
                                <div className="inline-flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-1">
                                    <Wifi size={14} /> System-Wide Protection
                                </div>
                                <h2 className="text-2xl md:text-3xl font-black text-white">
                                    Suggested DNS for Smartphones
                                </h2>
                                <p className="text-sm text-gray-400 mt-1">
                                    Blocks ads inside mobile browsers and streaming players without installing heavy apps.
                                </p>
                            </div>

                            <span className="text-xs px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-bold w-fit">
                                0 Battery Drain • 0 Apps Required
                            </span>
                        </div>

                        {/* DNS Cards Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                            {DNS_PROVIDERS.map((dns) => (
                                <div
                                    key={dns.name}
                                    className={`relative rounded-2xl p-6 transition-all duration-300 border ${
                                        dns.popular
                                            ? 'bg-gradient-to-br from-[#131b2e] via-[#0f172a] to-[#121324] border-cyan-500/40 shadow-xl shadow-cyan-950/40'
                                            : 'bg-white/[0.03] hover:bg-white/[0.05] border-white/10'
                                    }`}
                                >
                                    {dns.popular && (
                                        <span className="absolute top-4 right-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow">
                                            {dns.badge}
                                        </span>
                                    )}

                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-black">
                                            <Wifi size={20} />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                                {dns.name}
                                                {!dns.popular && (
                                                    <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-white/10 text-gray-300">
                                                        {dns.badge}
                                                    </span>
                                                )}
                                            </h3>
                                            <p className="text-xs text-gray-400">{dns.tagline}</p>
                                        </div>
                                    </div>

                                    <p className="text-xs text-gray-300 mb-4 leading-relaxed">
                                        {dns.description}
                                    </p>

                                    {/* 1-Click Copy Box */}
                                    <div className="bg-black/50 border border-white/15 rounded-xl p-3 mb-4 flex items-center justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                Private DNS Hostname
                                            </div>
                                            <code className="text-xs md:text-sm font-mono font-bold text-cyan-300 select-all block truncate mt-0.5">
                                                {dns.hostname}
                                            </code>
                                        </div>

                                        <button
                                            onClick={() => handleCopy(dns.hostname)}
                                            className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer flex-shrink-0 ${
                                                copiedHost === dns.hostname
                                                    ? 'bg-emerald-500 text-black font-extrabold shadow-lg shadow-emerald-500/30 scale-105'
                                                    : 'bg-white/10 hover:bg-white/20 text-white active:scale-95'
                                            }`}
                                            title="Copy hostname"
                                        >
                                            {copiedHost === dns.hostname ? (
                                                <>
                                                    <Check size={14} />
                                                    <span>Copied!</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Copy size={14} />
                                                    <span>Copy</span>
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    {/* Bullet Features */}
                                    <ul className="space-y-1.5 mb-4 text-xs text-gray-300">
                                        {dns.features.map((feat, idx) => (
                                            <li key={idx} className="flex items-start gap-2">
                                                <CheckCircle2 size={13} className="text-cyan-400 flex-shrink-0 mt-0.5" />
                                                <span>{feat}</span>
                                            </li>
                                        ))}
                                    </ul>

                                    {dns.setupGuideUrl && (
                                        <a
                                            href={dns.setupGuideUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
                                        >
                                            Official setup guide <ExternalLink size={12} />
                                        </a>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Interactive Step-by-Step Setup Guide */}
                        <div className="bg-gradient-to-br from-[#111726] to-[#0c0f17] border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/10">
                                <div>
                                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                        <Smartphone size={20} className="text-cyan-400" />
                                        How to Setup Private DNS on Your Phone
                                    </h3>
                                    <p className="text-xs text-gray-400 mt-1">Takes less than 30 seconds. No apps or restart required.</p>
                                </div>

                                <div className="inline-flex p-1 rounded-xl bg-black/40 border border-white/10 self-start sm:self-auto">
                                    <button
                                        onClick={() => setActiveDnsTab('android')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                            activeDnsTab === 'android'
                                                ? 'bg-cyan-500 text-black shadow'
                                                : 'text-gray-400 hover:text-white'
                                        }`}
                                    >
                                        Android Guide
                                    </button>
                                    <button
                                        onClick={() => setActiveDnsTab('ios')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                            activeDnsTab === 'ios'
                                                ? 'bg-cyan-500 text-black shadow'
                                                : 'text-gray-400 hover:text-white'
                                        }`}
                                    >
                                        iPhone (iOS) Guide
                                    </button>
                                </div>
                            </div>

                            {activeDnsTab === 'android' ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {[
                                        {
                                            step: '1',
                                            title: 'Open Settings',
                                            desc: 'Open the Settings app on your Android phone and go to Network & Internet (or Connections).'
                                        },
                                        {
                                            step: '2',
                                            title: 'Find Private DNS',
                                            desc: 'Tap More Connection Settings (or scroll down) and tap Private DNS (usually set to Automatic by default).'
                                        },
                                        {
                                            step: '3',
                                            title: 'Select Hostname',
                                            desc: 'Select "Private DNS provider hostname" (or designated Private DNS mode).'
                                        },
                                        {
                                            step: '4',
                                            title: 'Paste & Save',
                                            desc: 'Type or paste dns.adguard-dns.com and tap Save. You are now 100% ad-free!'
                                        }
                                    ].map((item) => (
                                        <div key={item.step} className="bg-black/30 border border-white/10 rounded-xl p-4 relative">
                                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 text-black font-black text-xs flex items-center justify-center mb-3 shadow-md shadow-cyan-500/20">
                                                {item.step}
                                            </div>
                                            <h4 className="font-bold text-sm text-white mb-1.5">{item.title}</h4>
                                            <p className="text-xs text-gray-300 leading-relaxed">{item.desc}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-black/30 border border-white/10 rounded-xl p-5">
                                            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block mb-1">
                                                Method 1 (Recommended - 1 Click)
                                            </span>
                                            <h4 className="font-bold text-base text-white mb-2">iOS DNS Configuration Profile</h4>
                                            <p className="text-xs text-gray-300 leading-relaxed mb-4">
                                                Apple iOS supports native encrypted DNS profiles. Download the official signed profile in Safari, then tap <strong>Settings &gt; Profile Downloaded &gt; Install</strong>.
                                            </p>
                                            <a
                                                href="https://adguard-dns.io/en/public-dns.html"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all"
                                            >
                                                <Download size={14} />
                                                <span>Download iOS DNS Profile</span>
                                                <ExternalLink size={12} />
                                            </a>
                                        </div>

                                        <div className="bg-black/30 border border-white/10 rounded-xl p-5">
                                            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block mb-1">
                                                Method 2 (Safari Content Blocker)
                                            </span>
                                            <h4 className="font-bold text-base text-white mb-2">AdGuard App for Safari</h4>
                                            <p className="text-xs text-gray-300 leading-relaxed mb-4">
                                                Install the free AdGuard app from the App Store. Open <strong>iOS Settings &gt; Safari &gt; Extensions</strong> and enable AdGuard content blockers to kill popups in Safari.
                                            </p>
                                            <a
                                                href="https://apps.apple.com/app/adguard-adblocker-privacy/id1047223162"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl text-xs font-bold transition-all shadow"
                                            >
                                                <span>Open on App Store</span>
                                                <ExternalLink size={12} />
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                )}

                {/* SECTION 2: PC & DESKTOP ADBLOCKERS */}
                {(selectedTab === 'all' || selectedTab === 'pc') && (
                    <section className="mb-16">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 border-b border-white/10 pb-4">
                            <div>
                                <div className="inline-flex items-center gap-2 text-blue-400 text-xs font-bold uppercase tracking-wider mb-1">
                                    <Monitor size={14} /> Desktop Browsers
                                </div>
                                <h2 className="text-2xl md:text-3xl font-black text-white">
                                    Suggested Adblockers for PC & Mac
                                </h2>
                                <p className="text-sm text-gray-400 mt-1">
                                    Install in your preferred browser with one click to block streaming player ads.
                                </p>
                            </div>

                            <span className="text-xs px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 font-bold w-fit">
                                Direct Web Store Links
                            </span>
                        </div>

                        {/* PC Adblockers List */}
                        <div className="space-y-6">
                            {PC_ADBLOCKERS.map((tool) => (
                                <div
                                    key={tool.name}
                                    className="bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 rounded-2xl p-6 md:p-8 transition-all relative overflow-hidden"
                                >
                                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                                        <div className="flex items-start gap-4 max-w-2xl">
                                            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${tool.iconColor} flex items-center justify-center flex-shrink-0 shadow-lg shadow-red-500/20 border border-white/20`}>
                                                <ShieldCheck size={28} className="text-white" />
                                            </div>

                                            <div>
                                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                                    <h3 className="text-xl font-bold text-white">{tool.name}</h3>
                                                    {tool.badge && (
                                                        <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                                                            {tool.badge}
                                                        </span>
                                                    )}
                                                    <span className="text-xs text-gray-400 font-medium">★ {tool.rating}</span>
                                                </div>

                                                <p className="text-xs font-semibold text-cyan-300 mb-2">
                                                    {tool.tagline}
                                                </p>
                                                <p className="text-xs text-gray-300 leading-relaxed mb-4">
                                                    {tool.description}
                                                </p>

                                                {/* Features Grid */}
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-300">
                                                    {tool.features.map((feat, idx) => (
                                                        <div key={idx} className="flex items-center gap-2">
                                                            <Check size={14} className="text-cyan-400 flex-shrink-0" />
                                                            <span>{feat}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Download / Install Buttons */}
                                        <div className="w-full lg:w-auto flex flex-col gap-2.5 flex-shrink-0 pt-4 lg:pt-0 border-t lg:border-t-0 border-white/10">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider hidden lg:block">
                                                Install for Browser:
                                            </span>
                                            <div className="flex flex-wrap lg:flex-col gap-2">
                                                {tool.links.map((link, lIdx) => (
                                                    <a
                                                        key={lIdx}
                                                        href={link.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold text-xs flex items-center justify-between gap-3 transition-all border border-white/10 shadow-sm"
                                                    >
                                                        <span>{link.label}</span>
                                                        <ExternalLink size={13} className="text-gray-400" />
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* SECTION 3: RECOMMENDED MOBILE BROWSERS */}
                {(selectedTab === 'all' || selectedTab === 'android' || selectedTab === 'ios') && (
                    <section className="mb-16">
                        <div className="mb-6 border-b border-white/10 pb-4">
                            <div className="inline-flex items-center gap-2 text-purple-400 text-xs font-bold uppercase tracking-wider mb-1">
                                <Smartphone size={14} /> Ready-to-go Browsers
                            </div>
                            <h2 className="text-2xl md:text-3xl font-black text-white">
                                Ad-Free Browsers for Mobile
                            </h2>
                            <p className="text-sm text-gray-400 mt-1">
                                Don't want to change DNS settings? These browsers have adblocking built right in.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            {MOBILE_BROWSERS.map((browser) => (
                                <div
                                    key={browser.name}
                                    className="bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 rounded-2xl p-6 flex flex-col justify-between transition-all"
                                >
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                                {browser.os}
                                            </span>
                                            <span className="text-xs text-gray-400 font-medium">
                                                {browser.badge}
                                            </span>
                                        </div>

                                        <h3 className="text-lg font-bold text-white mb-2">{browser.name}</h3>
                                        <p className="text-xs text-gray-300 leading-relaxed mb-6">
                                            {browser.description}
                                        </p>
                                    </div>

                                    <div className="flex flex-col gap-2 pt-4 border-t border-white/10">
                                        {browser.playUrl && (
                                            <a
                                                href={browser.playUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center justify-between transition-colors"
                                            >
                                                <span>Google Play Store</span>
                                                <ExternalLink size={12} className="text-gray-400" />
                                            </a>
                                        )}
                                        {browser.appStoreUrl && (
                                            <a
                                                href={browser.appStoreUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center justify-between transition-colors"
                                            >
                                                <span>Apple App Store</span>
                                                <ExternalLink size={12} className="text-gray-400" />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* SECTION 4: FAQ & HELPFUL TIPS */}
                <section className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 md:p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                            <HelpCircle size={22} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">Frequently Asked Questions</h3>
                            <p className="text-xs text-gray-400">Common questions about adblocking and streaming</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-gray-300">
                        <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                            <h4 className="font-bold text-sm text-white mb-1.5 flex items-center gap-1.5">
                                <CheckCircle2 size={14} className="text-cyan-400" />
                                Do I have to pay for any of these?
                            </h4>
                            <p className="leading-relaxed">
                                No! Everything recommended on this page—uBlock Origin, Brave, and AdGuard Private DNS—is <strong>100% free</strong> and requires no subscriptions.
                            </p>
                        </div>

                        <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                            <h4 className="font-bold text-sm text-white mb-1.5 flex items-center gap-1.5">
                                <CheckCircle2 size={14} className="text-cyan-400" />
                                Will Private DNS slow down my streaming?
                            </h4>
                            <p className="leading-relaxed">
                                Quite the opposite! Because your device won't have to download megabytes of heavy advertising scripts and tracking pixels, video playback usually starts <strong>significantly faster</strong>.
                            </p>
                        </div>

                        <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                            <h4 className="font-bold text-sm text-white mb-1.5 flex items-center gap-1.5">
                                <CheckCircle2 size={14} className="text-cyan-400" />
                                How does Private DNS stop popups on mobile?
                            </h4>
                            <p className="leading-relaxed">
                                When a video stream attempts to trigger a popup or redirect to an ad network, your phone asks the DNS for the destination's IP. The DNS refuses the ad domain, killing the redirect instantly.
                            </p>
                        </div>

                        <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                            <h4 className="font-bold text-sm text-white mb-1.5 flex items-center gap-1.5">
                                <CheckCircle2 size={14} className="text-cyan-400" />
                                How do I turn it off if I ever need to?
                            </h4>
                            <p className="leading-relaxed">
                                Simply go back into your phone's <strong>Settings &gt; Private DNS</strong> and select <strong>Automatic</strong> or <strong>Off</strong>. It takes 5 seconds to revert anytime.
                            </p>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
};

export default AdblockerGuidePage;
