import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Tv,
    Armchair,
    Users,
    BellRing,
    Maximize,
    Mouse,
    Sparkles,
    ChevronDown,
    ChevronUp,
    ChevronRight,
    Play,
    Zap,
    HelpCircle,
    Monitor,
    Smartphone,
    RefreshCw,
    Compass,
    CheckCircle2,
    SlidersHorizontal,
    ExternalLink
} from 'lucide-react';
import HelpPageHeader from './HelpPageHeader';

interface FAQItem {
    question: string;
    answer: string;
    category: 'controls' | 'content' | 'party' | 'troubleshooting';
}

const FAQS: FAQItem[] = [
    {
        category: 'controls',
        question: 'How do I move around and look around the 3D auditorium?',
        answer: 'On desktop/laptop: Use the W, A, S, D or Arrow keys on your keyboard to walk around the auditorium. Click and drag anywhere with your mouse to look around in full 360 degrees. On mobile/tablets: Use the virtual floating joystick on the left side of the screen to move, and drag the screen with your right thumb to look around.'
    },
    {
        category: 'controls',
        question: 'How do I sit down in a recliner or stand back up?',
        answer: 'Walk up to any cinema recliner and press the "E" key on your keyboard, or click directly on any seat with your mouse. You can also click the seat icon in the bottom bar to open the seating map and pick any specific seat in Row A or Row B. To stand back up, press "E" again or click the "Stand" button.'
    },
    {
        category: 'content',
        question: 'How do I select or change the movie or TV show playing on the big screen?',
        answer: 'When you first enter the 3D Virtual Cinema without a movie selected, the content catalog modal opens automatically. If you want to change what is playing, tap the film title on the bottom left playback bar or choose another title from the catalog. The 3D projector will immediately load and project your selection onto the massive auditorium screen.'
    },
    {
        category: 'content',
        question: 'How do I switch seasons and episodes for TV series?',
        answer: 'Use the quick episode stepper located right in the center of the bottom playback bar (Prev / S1:E1 / Next) to jump between episodes instantly. You can also click the center S1:E1 badge or the top bar episode pill to open the full Seasons & Episodes drawer, where you can browse all seasons, view episode titles, search episodes, and select any episode with one tap.'
    },
    {
        category: 'party',
        question: 'How do 3D Watch Parties work with friends?',
        answer: 'Click the "Watch Party" button in the top right corner. You can generate a 6-digit room code or copy a direct invite link to share with friends. When friends join, they will appear inside the 3D auditorium in real time! You will see their chosen player avatars sitting in the recliners, can chat live in the room, and everyone watches the synchronized big-screen stream together.'
    },
    {
        category: 'content',
        question: 'What should I do if the stream is buffering or showing an error?',
        answer: 'Next to the seat controls, click the Server button ("Try Next Server" or the Refresh icon) to instantly switch between high-speed streaming providers (Bingr, RapidStream, Astra, etc.). You can also use the player screen controls to adjust video quality, subtitles, and audio tracks.'
    },
    {
        category: 'troubleshooting',
        question: 'Why is the 3D cinema running slow or lagging on my computer?',
        answer: 'The 3D Virtual Cinema uses hardware-accelerated WebGL for realistic 3D lighting, reflections, and spatial geometry. Ensure "Hardware Acceleration" is enabled in your browser settings (Chrome / Edge / Brave: Settings > System > Use graphics acceleration when available). Updating your graphics drivers will also ensure 60fps+ smooth cinema playback.'
    },
    {
        category: 'troubleshooting',
        question: 'How do I get the best experience on mobile phones?',
        answer: 'Rotate your phone into widescreen Landscape mode! The 3D cinema auditorium is optimized for 16:9 and 21:9 ultra-wide perspectives. Tap the "Enter Landscape Cinema" prompt when entering on mobile for true edge-to-edge borderless cinema immersion.'
    }
];

export default function TheatreHelpPage() {
    const navigate = useNavigate();
    const [activeCategory, setActiveCategory] = useState<'all' | 'controls' | 'content' | 'party' | 'troubleshooting'>('all');
    const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

    const filteredFaqs = activeCategory === 'all'
        ? FAQS
        : FAQS.filter(f => f.category === activeCategory);

    return (
        <div className="min-h-screen bg-[#0d0f10] text-[#ece7de] font-sans antialiased selection:bg-[#d6bb90] selection:text-black">
            <HelpPageHeader
                breadcrumbs={[
                    { label: 'Support', path: '/support' },
                    { label: '3D Virtual Cinema Help', active: true }
                ]}
                backTo="/support"
                backLabel="Support Hub"
                rightBadge={
                    <button
                        onClick={() => navigate('/theatre')}
                        className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 to-red-500/20 hover:from-amber-500/30 hover:to-red-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold tracking-wide flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-lg shadow-amber-500/10"
                    >
                        <Sparkles size={13} />
                        <span>Launch 3D Cinema</span>
                    </button>
                }
            />

            <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
                {/* Hero Showcase */}
                <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#181c1c] via-[#121516] to-[#0d0f10] border border-[#d6bb90]/25 p-8 sm:p-12 shadow-2xl shadow-black/80">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
                    <div className="absolute bottom-0 left-0 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

                    <div className="relative z-10 max-w-3xl space-y-5">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold uppercase tracking-wider">
                            <Sparkles size={13} />
                            <span>Interactive 3D Auditorium</span>
                        </div>

                        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#f4eee6] leading-[1.15]">
                            3D Virtual Cinema <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500">Help &amp; Guide</span>
                        </h1>

                        <p className="text-base sm:text-lg text-gray-300 leading-relaxed">
                            Step inside your private luxury 3D cinema. Wander the auditorium, pick any plush recliner, enjoy shared screenings with friends in real-time Watch Parties, call personal concession waiters, and project thousands of titles onto the big screen.
                        </p>

                        <div className="flex flex-wrap items-center gap-4 pt-2">
                            <button
                                onClick={() => navigate('/theatre')}
                                className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-sm tracking-wide flex items-center gap-2 shadow-xl shadow-amber-500/20 transition-transform active:scale-95 cursor-pointer"
                            >
                                <Play size={16} fill="currentColor" />
                                <span>Enter 3D Cinema</span>
                            </button>

                            <a
                                href="#controls-cheatsheet"
                                className="px-5 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer"
                            >
                                <Compass size={15} />
                                <span>Controls Cheatsheet</span>
                            </a>
                        </div>
                    </div>
                </section>

                {/* Core Feature Pillars */}
                <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="rounded-2xl bg-[#141718] border border-white/10 p-6 space-y-4 hover:border-amber-500/40 transition-colors shadow-lg">
                        <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-300">
                            <Armchair size={22} />
                        </div>
                        <h2 className="text-lg font-bold text-white tracking-tight">3D Seating &amp; Navigation</h2>
                        <p className="text-sm text-gray-300 leading-relaxed">
                            Full 360° free-look navigation. Walk anywhere with WASD or mobile joystick. Choose Row A front-row immersion or Row B raised-platform perfection. Press E to sit or stand anytime.
                        </p>
                    </div>

                    <div className="rounded-2xl bg-[#141718] border border-white/10 p-6 space-y-4 hover:border-amber-500/40 transition-colors shadow-lg">
                        <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-300">
                            <Users size={22} />
                        </div>
                        <h2 className="text-lg font-bold text-white tracking-tight">Real-Time Watch Party</h2>
                        <p className="text-sm text-gray-300 leading-relaxed">
                            Watch together across any distance. Share a simple 6-digit code or link. Up to 10 friends can sit in the auditorium together, see each other’s custom avatars, and chat live.
                        </p>
                    </div>

                    <div className="rounded-2xl bg-[#141718] border border-white/10 p-6 space-y-4 hover:border-amber-500/40 transition-colors shadow-lg">
                        <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-300">
                            <BellRing size={22} />
                        </div>
                        <h2 className="text-lg font-bold text-white tracking-tight">In-Seat Waiter Concessions</h2>
                        <p className="text-sm text-gray-300 leading-relaxed">
                            While seated in your recliner, toggle the Waiters switch to ring your armrest bell. In-theatre servers walk over with fresh popcorn, beverages, and movie meals right to your seat.
                        </p>
                    </div>
                </section>

                {/* Controls Cheatsheet */}
                <section id="controls-cheatsheet" className="rounded-3xl bg-[#131617] border border-white/10 p-6 sm:p-10 space-y-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
                        <div>
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-400 mb-1">
                                <Zap size={14} />
                                <span>Master Reference</span>
                            </div>
                            <h2 className="text-2xl font-black text-white">Keyboard &amp; Touch Controls</h2>
                        </div>
                        <span className="text-xs text-gray-400">Works seamlessly on PC, Mac, Android, and iOS</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Desktop Controls */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300 flex items-center gap-2">
                                <Monitor size={16} className="text-amber-400" />
                                <span>Desktop / Laptop Keyboard &amp; Mouse</span>
                            </h3>

                            <div className="space-y-2.5">
                                <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5">
                                    <span className="text-sm text-gray-300">Walk around the room</span>
                                    <div className="flex gap-1">
                                        <kbd className="px-2 py-1 bg-black/60 border border-white/20 rounded text-xs font-mono text-amber-300">W</kbd>
                                        <kbd className="px-2 py-1 bg-black/60 border border-white/20 rounded text-xs font-mono text-amber-300">A</kbd>
                                        <kbd className="px-2 py-1 bg-black/60 border border-white/20 rounded text-xs font-mono text-amber-300">S</kbd>
                                        <kbd className="px-2 py-1 bg-black/60 border border-white/20 rounded text-xs font-mono text-amber-300">D</kbd>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5">
                                    <span className="text-sm text-gray-300">Look around 360°</span>
                                    <span className="text-xs font-semibold text-gray-300 bg-white/10 px-2.5 py-1 rounded">Click + Drag Mouse</span>
                                </div>

                                <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5">
                                    <span className="text-sm text-gray-300">Take a seat / Stand up</span>
                                    <kbd className="px-2.5 py-1 bg-black/60 border border-white/20 rounded text-xs font-mono text-amber-300">E</kbd>
                                </div>

                                <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5">
                                    <span className="text-sm text-gray-300">Toggle Fullscreen mode</span>
                                    <kbd className="px-2.5 py-1 bg-black/60 border border-white/20 rounded text-xs font-mono text-amber-300">F</kbd>
                                </div>

                                <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5">
                                    <span className="text-sm text-gray-300">Reset camera to entrance</span>
                                    <kbd className="px-2.5 py-1 bg-black/60 border border-white/20 rounded text-xs font-mono text-amber-300">R</kbd>
                                </div>
                            </div>
                        </div>

                        {/* Mobile Touch Controls */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300 flex items-center gap-2">
                                <Smartphone size={16} className="text-amber-400" />
                                <span>Mobile &amp; Tablet Touch Controls</span>
                            </h3>

                            <div className="space-y-2.5">
                                <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5">
                                    <span className="text-sm text-gray-300">Walk &amp; navigate</span>
                                    <span className="text-xs font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded">Virtual Thumbstick (Left)</span>
                                </div>

                                <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5">
                                    <span className="text-sm text-gray-300">Pan &amp; rotate camera</span>
                                    <span className="text-xs font-semibold text-gray-300 bg-white/10 px-2.5 py-1 rounded">Drag Room (Right Thumb)</span>
                                </div>

                                <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5">
                                    <span className="text-sm text-gray-300">Select any seat</span>
                                    <span className="text-xs font-semibold text-gray-300 bg-white/10 px-2.5 py-1 rounded">Tap Seat directly or Map</span>
                                </div>

                                <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5">
                                    <span className="text-sm text-gray-300">Next / Prev Episode</span>
                                    <span className="text-xs font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded">Bottom Center Stepper</span>
                                </div>

                                <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5">
                                    <span className="text-sm text-gray-300">Switch Streaming Server</span>
                                    <span className="text-xs font-semibold text-gray-300 bg-white/10 px-2.5 py-1 rounded">Tap Refresh icon next to seat</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* FAQ Accordion Section */}
                <section className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-400 mb-1">
                                <HelpCircle size={14} />
                                <span>Got Questions?</span>
                            </div>
                            <h2 className="text-2xl sm:text-3xl font-black text-white">Frequently Asked Questions</h2>
                        </div>

                        {/* Category Filter Pills */}
                        <div className="flex flex-wrap gap-2">
                            {(['all', 'controls', 'content', 'party', 'troubleshooting'] as const).map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setActiveCategory(cat)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-all cursor-pointer ${activeCategory === cat
                                            ? 'bg-amber-400 text-black font-bold shadow-md shadow-amber-400/20'
                                            : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                                        }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3">
                        {filteredFaqs.map((faq, idx) => {
                            const isOpen = openFaqIndex === idx;
                            return (
                                <div
                                    key={idx}
                                    className="rounded-2xl bg-[#141718] border border-white/10 overflow-hidden transition-colors"
                                >
                                    <button
                                        type="button"
                                        onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                                        className="w-full flex items-center justify-between p-5 sm:p-6 text-left hover:bg-white/[0.02] cursor-pointer gap-4"
                                    >
                                        <span className="text-base sm:text-lg font-bold text-gray-100">{faq.question}</span>
                                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0 text-gray-400">
                                            {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                        </div>
                                    </button>

                                    {isOpen && (
                                        <div className="px-5 sm:px-6 pb-6 text-sm sm:text-base text-gray-300 leading-relaxed border-t border-white/5 pt-4">
                                            {faq.answer}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* Bottom Callout CTA */}
                <section className="rounded-3xl bg-gradient-to-r from-amber-500/20 via-orange-500/10 to-transparent border border-amber-500/30 p-8 sm:p-12 flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="space-y-2 text-center sm:text-left">
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Ready to take your seat?</h2>
                        <p className="text-sm sm:text-base text-gray-300">Experience your favorite movies and web series on the massive 3D cinema screen now.</p>
                    </div>

                    <button
                        onClick={() => navigate('/theatre')}
                        className="px-8 py-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-extrabold text-sm tracking-wider uppercase shadow-xl shadow-amber-500/25 transition-transform active:scale-95 cursor-pointer whitespace-nowrap"
                    >
                        🎬 Launch 3D Cinema
                    </button>
                </section>
            </main>
        </div>
    );
}
