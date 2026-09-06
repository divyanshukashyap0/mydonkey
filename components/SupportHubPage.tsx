import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Search,
    ShieldCheck,
    Volume2,
    Tv,
    Smartphone,
    Monitor,
    FileText,
    HelpCircle,
    Mail,
    MessageSquare,
    MessageCircle,
    ExternalLink,
    ChevronRight,
    CheckCircle2,
    Zap,
    Sparkles,
    LifeBuoy,
    Download,
    Radio,
    SlidersHorizontal,
    QrCode,
    Film,
    Globe,
    Check
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import HelpPageHeader from './HelpPageHeader';

interface SupportCard {
    id: string;
    title: string;
    tagline: string;
    description: string;
    icon: any;
    badge?: string;
    gradient: string;
    badgeBg: string;
    actionType: 'navigate' | 'external' | 'pdf' | 'mail' | 'modal';
    target: string;
    tags: string[];
}

interface FAQItem {
    question: string;
    answer: string;
    category: 'streaming' | 'audio' | 'ads' | 'devices' | 'account';
    actionText?: string;
    actionUrl?: string;
}

const SUPPORT_CARDS: SupportCard[] = [
    {
        id: 'sound-enhancements',
        title: 'Sound Enhancements & Booster',
        tagline: 'Up to 400% Web Audio & Iframe Extension Guide',
        description: 'Test our live 400% Web Audio studio, toggle Dialogue Clarity EQ (+3.5 dB @ 2.4 kHz), and learn how to amplify quiet movie dialogue across Windows, Mac, and Android.',
        icon: Volume2,
        badge: 'NEW • 400% BOOST',
        gradient: 'from-amber-500/20 via-orange-500/10 to-transparent border-amber-500/30 hover:border-amber-400/60',
        badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        actionType: 'navigate',
        target: '/sound-enhancements',
        tags: ['audio', 'sound', 'volume', 'loud', 'dialogue', 'speech', 'booster', 'whisper', 'quiet', 'speakers']
    },
    {
        id: 'adblocker',
        title: 'Suggested Adblockers & Mobile DNS',
        tagline: 'Eliminate popups, redirects & video ads',
        description: 'Recommended adblockers for PC browsers (uBlock Origin, AdGuard) and zero-install Private DNS configuration for Android and iPhones to stream smoothly.',
        icon: ShieldCheck,
        badge: 'RECOMMENDED',
        gradient: 'from-cyan-500/20 via-blue-500/10 to-transparent border-cyan-500/30 hover:border-cyan-400/60',
        badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        actionType: 'navigate',
        target: '/adblocker',
        tags: ['adblocker', 'ads', 'popups', 'redirects', 'dns', 'adguard', 'ublock', 'clean', 'privacy']
    },
    {
        id: 'user-manual',
        title: 'Official User Manual',
        tagline: 'Complete PDF documentation & platform guide',
        description: 'Download or view the official comprehensive My Donkey guide covering keyboard shortcuts, streaming features, video engine modes, and offline caching.',
        icon: FileText,
        badge: 'PDF MANUAL',
        gradient: 'from-purple-500/20 via-indigo-500/10 to-transparent border-purple-500/30 hover:border-purple-400/60',
        badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
        actionType: 'pdf',
        target: '/MyDonkey.pdf',
        tags: ['manual', 'pdf', 'guide', 'docs', 'documentation', 'keyboard', 'shortcuts', 'instructions']
    },
    {
        id: 'devices',
        title: 'Supported Devices & Smart TV',
        tagline: 'Samsung, LG, Android TV & FireStick sync',
        description: 'How to stream My Donkey on the big screen, link your smart TV with a 6-digit sync code or QR scanner, and optimize picture settings for 4K HDR playback.',
        icon: Tv,
        badge: 'TV & CASTING',
        gradient: 'from-emerald-500/20 via-teal-500/10 to-transparent border-emerald-500/30 hover:border-emerald-400/60',
        badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        actionType: 'navigate',
        target: '/devices',
        tags: ['tv', 'smart tv', 'samsung', 'lg', 'firestick', 'android tv', 'chromecast', 'scan', 'qr', 'sync', 'devices']
    },
    {
        id: 'account',
        title: 'Account, Profiles & Subscription',
        tagline: 'Password, active devices, and preference tuning',
        description: 'Manage linked accounts, create personalized family profiles, manage watchlists, tune taste recommendations, and view active streaming sessions.',
        icon: SlidersHorizontal,
        badge: 'ACCOUNT',
        gradient: 'from-rose-500/20 via-red-500/10 to-transparent border-rose-500/30 hover:border-rose-400/60',
        badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        actionType: 'navigate',
        target: '/account',
        tags: ['account', 'login', 'password', 'profile', 'subscription', 'devices', 'watchlist', 'manage']
    },
    {
        id: 'contact',
        title: 'Direct Support Desk & Inquiries',
        tagline: '24/7 dedicated assistance team',
        description: 'Experiencing an unresolved technical glitch, broken video stream, or partnership proposal? Open our direct support ticket desk for rapid response.',
        icon: MessageSquare,
        badge: '24/7 DESK',
        gradient: 'from-blue-500/20 via-sky-500/10 to-transparent border-blue-500/30 hover:border-blue-400/60',
        badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
        actionType: 'navigate',
        target: '/contact',
        tags: ['contact', 'ticket', 'support', 'help', 'bug', 'glitch', 'broken', 'issue', 'partner', 'business']
    },
    {
        id: 'community-chat',
        title: 'Community Help Chat & Q&A',
        tagline: 'Ask questions & get answers from users worldwide',
        description: 'Join our public open streaming discussion. Ask questions about playback, sound, and smart TV setups, or share your own solutions visible to all viewers.',
        icon: MessageCircle,
        badge: 'PUBLIC CHAT',
        gradient: 'from-indigo-500/20 via-purple-500/10 to-transparent border-indigo-500/30 hover:border-indigo-400/60',
        badgeBg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
        actionType: 'navigate',
        target: '/community-chat',
        tags: ['chat', 'help', 'community', 'questions', 'answers', 'forum', 'discussion', 'ask', 'users']
    }
];

const FAQ_LIST: FAQItem[] = [
    {
        question: 'How do I fix movies or series that are buffering or failing to load?',
        answer: 'First, ensure your adblocker is not accidentally blocking streaming CDNs. Set your device to use NextDNS or AdGuard DNS as explained in our Adblocker Guide. If a specific player embed fails, switch between the available stream servers in the video player or try refreshing the stream.',
        category: 'streaming',
        actionText: 'View Adblocker & DNS Guide',
        actionUrl: '/adblocker'
    },
    {
        question: 'Why is the movie sound so quiet or whispers hard to hear?',
        answer: 'Cinema blockbusters have high dynamic range (loud explosions, soft whispers). Use our Sound Enhancements page to activate Dialogue Clarity EQ (+3.5 dB @ 2.4 kHz) or install a Tab Volume Booster extension for external iframe embeds to amplify audio up to 600%.',
        category: 'audio',
        actionText: 'Open Sound Enhancements Studio',
        actionUrl: '/sound-enhancements'
    },
    {
        question: 'How do I stop popups and redirects from opening in new tabs?',
        answer: 'Some third-party video stream mirrors trigger ad scripts. Installing uBlock Origin (on PC/Mac) or setting your phone\'s Private DNS to AdGuard (dns.adguard.com) eliminates 100% of these popups permanently.',
        category: 'ads',
        actionText: 'Setup Private DNS on Phone',
        actionUrl: '/adblocker'
    },
    {
        question: 'Can I watch My Donkey on my Smart TV without cables?',
        answer: 'Yes! Open your Smart TV browser (Samsung, LG, or Android TV) and visit My Donkey. You can also link your TV with a 6-digit sync code or use our mobile QR scanner.',
        category: 'devices',
        actionText: 'View Smart TV & Devices Guide',
        actionUrl: '/devices'
    },
    {
        question: 'How do I install the My Donkey App on my mobile phone (PWA)?',
        answer: 'On Android Chrome: Tap the three dots (⋮) in the top right and select "Install App" or "Add to Home Screen". On iPhone Safari: Tap the Share button (square with arrow) and tap "Add to Home Screen". It will install with full native fullscreen app capabilities.',
        category: 'devices',
        actionText: 'Manage Account & App',
        actionUrl: '/account'
    }
];

const SupportHubPage: React.FC = () => {
    const navigate = useNavigate();
    const { settings, isAuthenticated } = useStore();
    const siteName = settings?.siteName || 'My Donkey';

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFaqCategory, setSelectedFaqCategory] = useState<string>('all');

    // Filter cards and FAQs based on search query
    const filteredCards = useMemo(() => {
        if (!searchQuery.trim()) return SUPPORT_CARDS;
        const q = searchQuery.toLowerCase().trim();
        return SUPPORT_CARDS.filter(c => 
            c.title.toLowerCase().includes(q) ||
            c.tagline.toLowerCase().includes(q) ||
            c.description.toLowerCase().includes(q) ||
            c.tags.some(t => t.toLowerCase().includes(q))
        );
    }, [searchQuery]);

    const filteredFaqs = useMemo(() => {
        return FAQ_LIST.filter(f => {
            const matchesCat = selectedFaqCategory === 'all' || f.category === selectedFaqCategory;
            if (!matchesCat) return false;
            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase().trim();
            return f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q);
        });
    }, [searchQuery, selectedFaqCategory]);

    const handleCardClick = (card: SupportCard) => {
        if (card.id === 'account') {
            if (!isAuthenticated) {
                navigate('/login', { state: { from: '/account' } });
            } else {
                navigate('/account');
            }
            return;
        }
        if (card.actionType === 'navigate') {
            navigate(card.target);
        } else if (card.actionType === 'pdf') {
            window.open(card.target, '_blank');
        } else if (card.actionType === 'mail') {
            navigate('/contact');
        }
    };

    return (
        <div className="min-h-screen bg-[#0d0d0d] text-white font-sans selection:bg-brand-red selection:text-white">
            <HelpPageHeader
                breadcrumbs={[{ label: 'Help & Support Hub', active: true }]}
                backTo="/"
                backLabel="Home"
                rightBadge={
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-red/15 border border-brand-red/30 text-red-400 text-xs font-semibold">
                        <LifeBuoy size={13} />
                        <span>Support Center</span>
                    </span>
                }
            />

            <div className="max-w-6xl mx-auto pt-6 sm:pt-8 pb-28 px-4 sm:px-6 lg:px-8">

                {/* Hero Header & Search */}
                <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-red-600/15 via-black to-[#121212] border border-white/10 p-6 sm:p-12 mb-12 shadow-2xl text-center flex flex-col items-center">
                    <div className="absolute top-0 right-1/2 translate-x-1/2 w-[500px] h-[500px] bg-brand-red/10 rounded-full blur-3xl pointer-events-none -mt-32" />
                    
                    <div className="relative z-10 max-w-3xl flex flex-col items-center">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-red/20 border border-brand-red/30 text-red-400 text-xs font-bold uppercase tracking-wider mb-4">
                            <LifeBuoy size={14} className="animate-spin-slow" />
                            <span>Official Support Center</span>
                        </div>

                        <h1 className="text-3xl sm:text-5xl font-black tracking-tight mb-4 text-white">
                            How Can We <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-red via-orange-400 to-amber-400">Help You?</span>
                        </h1>

                        <p className="text-gray-300 text-sm sm:text-base mb-8 max-w-xl leading-relaxed">
                            Search our setup guides, solve audio & streaming glitches, eliminate popups, or connect with our support team.
                        </p>

                        {/* Search Input Bar */}
                        <div className="w-full max-w-xl relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                                <Search size={20} />
                            </div>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search 'sound boost', 'adblocker', 'smart tv', 'buffering'..."
                                className="w-full pl-12 pr-10 py-3.5 sm:py-4 rounded-2xl bg-white/10 hover:bg-white/15 focus:bg-white/20 border border-white/15 focus:border-brand-red text-white placeholder-gray-400 text-sm sm:text-base outline-none transition shadow-2xl backdrop-blur-xl"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-white"
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        {/* Quick Status Pill */}
                        <div className="flex items-center gap-2 mt-5 text-[11px] font-bold text-gray-400">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span>All Streaming Nodes &amp; Catalogs Operational</span>
                        </div>
                    </div>
                </div>

                {/* Section 1: Core Hub Cards */}
                <div className="mb-14">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2.5">
                                <Zap size={20} className="text-brand-red fill-brand-red" />
                                <span>Support Guides &amp; Tools</span>
                            </h2>
                            <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
                                Instant access to official enhancement modules and device tutorials.
                            </p>
                        </div>
                        <span className="text-xs text-gray-500 font-bold hidden sm:inline">
                            {filteredCards.length} Available Solutions
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredCards.map((card) => {
                            const IconComponent = card.icon;
                            return (
                                <div
                                    key={card.id}
                                    onClick={() => handleCardClick(card)}
                                    className={`p-6 rounded-3xl bg-gradient-to-br ${card.gradient} border backdrop-blur-xl flex flex-col justify-between cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl group`}
                                >
                                    <div>
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform">
                                                <IconComponent size={22} className="group-hover:text-amber-300 transition-colors" />
                                            </div>
                                            {card.badge && (
                                                <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${card.badgeBg}`}>
                                                    {card.badge}
                                                </span>
                                            )}
                                        </div>

                                        <h3 className="text-lg font-bold text-white mb-1.5 group-hover:text-amber-300 transition-colors">
                                            {card.title}
                                        </h3>
                                        <p className="text-xs text-amber-400 font-semibold mb-2">
                                            {card.tagline}
                                        </p>
                                        <p className="text-xs text-gray-300 leading-relaxed line-clamp-3 mb-6">
                                            {card.description}
                                        </p>
                                    </div>

                                    <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                                        <span>Open Tool / Guide</span>
                                        <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {filteredCards.length === 0 && (
                        <div className="p-12 text-center rounded-3xl bg-white/[0.02] border border-white/5">
                            <HelpCircle size={32} className="mx-auto text-gray-500 mb-3" />
                            <p className="text-sm text-gray-400">No support guides match "{searchQuery}".</p>
                            <button
                                onClick={() => setSearchQuery('')}
                                className="mt-3 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white transition"
                            >
                                Clear Search Query
                            </button>
                        </div>
                    )}
                </div>

                {/* Section 2: Interactive FAQs */}
                <div className="mb-14">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div>
                            <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2.5">
                                <HelpCircle size={20} className="text-amber-400" />
                                <span>Frequently Asked Questions</span>
                            </h2>
                            <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
                                Quick solutions for common playback, audio, and device issues.
                            </p>
                        </div>

                        {/* Category filter pills */}
                        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                            {[
                                { id: 'all', label: 'All Topics' },
                                { id: 'streaming', label: 'Streaming' },
                                { id: 'audio', label: 'Sound' },
                                { id: 'ads', label: 'Adblocking' },
                                { id: 'devices', label: 'Devices' }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setSelectedFaqCategory(tab.id)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition border ${
                                        selectedFaqCategory === tab.id
                                            ? 'bg-brand-red text-white border-brand-red shadow-md shadow-brand-red/20'
                                            : 'bg-white/5 hover:bg-white/10 text-gray-400 border-white/5'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        {filteredFaqs.map((faq, idx) => (
                            <div
                                key={idx}
                                className="p-6 rounded-2xl bg-[#121212] border border-white/10 hover:border-white/20 transition"
                            >
                                <h3 className="text-sm sm:text-base font-bold text-white mb-2 flex items-start gap-2.5">
                                    <span className="w-5 h-5 rounded-full bg-brand-red/20 text-brand-red flex items-center justify-center text-xs shrink-0 mt-0.5 font-black">
                                        Q
                                    </span>
                                    <span>{faq.question}</span>
                                </h3>
                                <div className="text-xs sm:text-sm text-gray-300 leading-relaxed pl-7 space-y-3">
                                    <p>{faq.answer}</p>
                                    {faq.actionText && faq.actionUrl && (
                                        <div>
                                            <button
                                                onClick={() => navigate(faq.actionUrl!)}
                                                className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 transition"
                                            >
                                                <span>{faq.actionText}</span>
                                                <ChevronRight size={14} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Section 3: Contact & Direct Support Box */}
                <div className="rounded-3xl p-8 bg-gradient-to-r from-blue-900/20 via-black to-[#141414] border border-white/10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
                    <div className="flex items-center gap-4 text-left">
                        <div className="w-14 h-14 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/30 shadow-lg shadow-blue-500/20">
                            <MessageSquare size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">Still need assistance?</h3>
                            <p className="text-xs sm:text-sm text-gray-400 max-w-md mt-1 leading-snug">
                                Our engineering and support crew is on standby 24/7. Submit a ticket and our dispatch team will resolve your issue promptly.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                        <button
                            onClick={() => navigate('/contact')}
                            className="flex-1 md:flex-initial flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-brand-red hover:bg-red-700 text-white font-bold text-xs transition shadow-lg shadow-brand-red/20 active:scale-95"
                        >
                            <MessageSquare size={14} />
                            <span>Open Support Desk</span>
                        </button>
                        <button
                            onClick={() => navigate('/devices')}
                            className="flex-1 md:flex-initial flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold text-xs transition"
                        >
                            <Tv size={14} />
                            <span>Smart TV Setup</span>
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default SupportHubPage;
