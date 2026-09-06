import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Mail,
    Send,
    CheckCircle2,
    Clock,
    ShieldCheck,
    MessageSquare,
    AlertCircle,
    Zap,
    ExternalLink,
    HelpCircle,
    Copy,
    Check,
    Sparkles,
    Film,
    Volume2,
    SlidersHorizontal,
    Tv,
    MessageCircle
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import HelpPageHeader from './HelpPageHeader';

interface TicketForm {
    name: string;
    email: string;
    category: string;
    titleName: string;
    priority: 'normal' | 'high' | 'urgent';
    message: string;
}

const ContactDeskPage: React.FC = () => {
    const navigate = useNavigate();
    const { currentUser, settings } = useStore();
    const siteName = settings?.siteName || 'My Donkey';

    const [form, setForm] = useState<TicketForm>({
        name: currentUser?.name || '',
        email: currentUser?.email || '',
        category: 'broken-stream',
        titleName: '',
        priority: 'normal',
        message: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submittedTicketId, setSubmittedTicketId] = useState<string | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.email.trim() || !form.message.trim()) return;

        setIsSubmitting(true);

        // Simulate secure ticket creation
        setTimeout(() => {
            const randomId = `MD-${Math.floor(100000 + Math.random() * 900000)}`;
            setIsSubmitting(false);
            setSubmittedTicketId(randomId);
        }, 1200);
    };

    return (
        <div className="min-h-screen bg-[#0d0d0d] text-white font-sans selection:bg-brand-red selection:text-white">
            <HelpPageHeader
                breadcrumbs={[
                    { label: 'Support', path: '/support' },
                    { label: 'Direct Support Desk', active: true }
                ]}
                backTo="/support"
                backLabel="Back to Support"
                rightBadge={
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-semibold">
                        <Mail size={13} />
                        <span>24/7 Support Desk</span>
                    </span>
                }
            />

            <div className="max-w-6xl mx-auto pt-6 sm:pt-8 pb-28 px-4 sm:px-6 lg:px-8">

                {/* Hero Header */}
                <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-blue-600/20 via-black to-[#121212] border border-white/10 p-6 sm:p-12 mb-12 shadow-2xl">
                    <div className="max-w-3xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-300 text-xs font-bold mb-5 tracking-wide">
                            <Mail size={14} />
                            <span>24/7 DEDICATED STREAMING SUPPORT TEAM</span>
                        </div>

                        <h1 className="text-3xl sm:text-5xl font-black tracking-tight mb-4 leading-tight">
                            Direct Support Desk &amp; <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-cyan-400">Inquiries</span>
                        </h1>

                        <p className="text-gray-300 text-sm sm:text-base leading-relaxed mb-6">
                            Experiencing an unresolved technical glitch, broken video stream, audio sync delay, or partnership proposal? Submit a direct support ticket through our dispatch desk for rapid resolution.
                        </p>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400">
                            <div className="flex items-center gap-2">
                                <Clock size={15} className="text-emerald-400" />
                                <span>Average Response Time: <strong className="text-white">&lt; 45 minutes</strong></span>
                            </div>
                            <span className="hidden sm:inline text-gray-600">•</span>
                            <div className="flex items-center gap-2">
                                <ShieldCheck size={15} className="text-blue-400" />
                                <span>24/7/365 Global Coverage</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-14">

                    {/* Left Column: Interactive Support Ticket Form (7 Cols) */}
                    <div className="lg:col-span-7">
                        <div className="p-6 sm:p-10 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl shadow-xl">
                            {submittedTicketId ? (
                                <div className="text-center py-8 animate-in zoom-in duration-300">
                                    <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-emerald-500/20">
                                        <CheckCircle2 size={36} />
                                    </div>

                                    <h3 className="text-2xl font-bold text-white mb-2">Ticket Successfully Created!</h3>
                                    <p className="text-sm text-gray-300 mb-6 max-w-md mx-auto">
                                        Our engineering team has received your report. You will receive an automated confirmation and direct response at <strong className="text-white">{form.email}</strong>.
                                    </p>

                                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 max-w-sm mx-auto mb-8 font-mono">
                                        <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Ticket Reference ID</div>
                                        <div className="text-xl font-black text-amber-400 tracking-widest">{submittedTicketId}</div>
                                    </div>

                                    <div className="flex items-center justify-center gap-3">
                                        <button
                                            onClick={() => {
                                                setSubmittedTicketId(null);
                                                setForm({
                                                    name: currentUser?.name || '',
                                                    email: currentUser?.email || '',
                                                    category: 'broken-stream',
                                                    titleName: '',
                                                    priority: 'normal',
                                                    message: ''
                                                });
                                            }}
                                            className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white transition"
                                        >
                                            Submit Another Inquiry
                                        </button>
                                        <button
                                            onClick={() => navigate('/')}
                                            className="px-5 py-2.5 rounded-xl bg-brand-red hover:bg-red-700 text-xs font-bold text-white transition shadow-lg shadow-brand-red/20"
                                        >
                                            Return to Catalog
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
                                        <div>
                                            <h3 className="text-lg font-bold text-white">Create Support Ticket</h3>
                                            <p className="text-xs text-gray-400">Direct transmission to on-call engineers.</p>
                                        </div>
                                        <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-full">
                                            Online &amp; Receiving
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                                Your Name
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                value={form.name}
                                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                                placeholder="e.g. Rahul Sharma"
                                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-blue-400 text-sm text-white placeholder-gray-500 outline-none transition"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                                Email Address <span className="text-brand-red">*</span>
                                            </label>
                                            <input
                                                type="email"
                                                required
                                                value={form.email}
                                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                                placeholder="name@example.com"
                                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-blue-400 text-sm text-white placeholder-gray-500 outline-none transition"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                                Issue Category
                                            </label>
                                            <select
                                                value={form.category}
                                                onChange={(e) => setForm({ ...form, category: e.target.value })}
                                                className="w-full px-4 py-3 rounded-xl bg-[#181818] border border-white/10 focus:border-blue-400 text-sm text-white outline-none transition cursor-pointer"
                                            >
                                                <option value="broken-stream">🎬 Broken Video Stream / Player Glitch</option>
                                                <option value="audio-sound">🔊 Audio, Dialogue Clarity or Volume</option>
                                                <option value="buffering">⚡ Buffering, Slow CDN or Video Stutter</option>
                                                <option value="account-login">👤 Account, Password or Profiles</option>
                                                <option value="smart-tv">📺 Smart TV, Chromecast or AirPlay</option>
                                                <option value="content-request">💡 Movie / Series Request</option>
                                                <option value="partnership">🤝 Business, Licensing &amp; Press</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                                Content Title <span className="text-gray-500 text-[10px] lowercase">(optional)</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={form.titleName}
                                                onChange={(e) => setForm({ ...form, titleName: e.target.value })}
                                                placeholder="e.g. Avengers / Mirzapur S2"
                                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-blue-400 text-sm text-white placeholder-gray-500 outline-none transition"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                            Priority Level
                                        </label>
                                        <div className="grid grid-cols-3 gap-3">
                                            {[
                                                { id: 'normal', label: 'Standard', desc: '< 2 hours' },
                                                { id: 'high', label: 'High Priority', desc: '< 45 mins' },
                                                { id: 'urgent', label: 'Urgent Glitch', desc: 'Immediate' }
                                            ].map((p) => (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    onClick={() => setForm({ ...form, priority: p.id as any })}
                                                    className={`p-3 rounded-xl border text-center transition ${
                                                        form.priority === p.id
                                                            ? 'bg-blue-500/20 border-blue-500 text-white font-bold'
                                                            : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                                                    }`}
                                                >
                                                    <div className="text-xs font-bold">{p.label}</div>
                                                    <div className="text-[10px] text-gray-500">{p.desc}</div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                            Detailed Explanation <span className="text-brand-red">*</span>
                                        </label>
                                        <textarea
                                            required
                                            rows={5}
                                            value={form.message}
                                            onChange={(e) => setForm({ ...form, message: e.target.value })}
                                            placeholder="Please describe what happened, what device or browser you are using, and any error message displayed on your screen..."
                                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-blue-400 text-sm text-white placeholder-gray-500 outline-none transition resize-none leading-relaxed"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isSubmitting || !form.email || !form.message}
                                        className="w-full py-3.5 rounded-xl bg-brand-red hover:bg-red-700 disabled:opacity-40 disabled:hover:bg-brand-red text-white font-bold text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-brand-red/20 active:scale-[0.99] cursor-pointer"
                                    >
                                        {isSubmitting ? (
                                            <span>Transmitting Ticket...</span>
                                        ) : (
                                            <>
                                                <Send size={16} />
                                                <span>Dispatch Support Ticket</span>
                                            </>
                                        )}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Direct Inboxes, War Room, Status (5 Cols) */}
                    <div className="lg:col-span-5 space-y-6">

                        {/* Official Support Channels */}
                        <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl">
                            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                                <MessageSquare size={18} className="text-blue-400" />
                                <span>Support &amp; Inquiry Channels</span>
                            </h3>

                            <div className="space-y-3">
                                {[
                                    {
                                        badge: '24/7 PRIORITY',
                                        title: 'Technical & Streaming Glitches',
                                        desc: 'Submit a ticket for playback errors, audio sync, or TV pairing issues.'
                                    },
                                    {
                                        badge: 'ACQUISITIONS',
                                        title: 'Content & Studio Licensing',
                                        desc: 'Producer submissions, regional cinema distribution & partnership proposals.'
                                    },
                                    {
                                        badge: 'EDITORIAL',
                                        title: 'Press & Media Communications',
                                        desc: 'Official platform announcements, interviews, and brand asset requests.'
                                    }
                                ].map((item) => (
                                    <div key={item.title} className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs font-bold text-white">{item.title}</span>
                                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
                                                {item.badge}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-gray-400 leading-relaxed">{item.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Live Cluster Diagnostics */}
                        <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-base font-bold text-white flex items-center gap-2">
                                    <Zap size={18} className="text-amber-400" />
                                    <span>System Operations Status</span>
                                </h3>
                                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                                    All Systems Normal
                                </span>
                            </div>

                            <div className="space-y-2.5 text-xs">
                                {[
                                    { name: 'Global CDN & Media Caching', status: 'Optimal', ping: '18ms' },
                                    { name: 'Multi-Source Embed Resolvers', status: 'Online', ping: '34ms' },
                                    { name: 'Cloud Firestore & Profiles', status: 'Healthy', ping: '12ms' },
                                    { name: '4K HLS Transcoding Pipeline', status: 'Active', ping: '24ms' }
                                ].map((node) => (
                                    <div key={node.name} className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                            <span className="text-gray-300 font-medium text-[11px]">{node.name}</span>
                                        </div>
                                        <span className="text-[10px] font-mono text-gray-500">{node.ping}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Instant Guides Shortcut */}
                        <div className="p-6 rounded-3xl bg-gradient-to-br from-amber-500/10 via-black to-white/[0.02] border border-amber-500/20">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2 flex items-center gap-1.5">
                                <Sparkles size={14} />
                                <span>Quick Self-Service Tools</span>
                            </h4>
                            <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                                Most audio and popup issues can be solved immediately without waiting for a ticket response:
                            </p>

                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => navigate('/sound-enhancements')}
                                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left text-xs font-bold text-white transition flex items-center gap-2"
                                >
                                    <Volume2 size={14} className="text-amber-400" />
                                    <span>Sound Booster</span>
                                </button>
                                <button
                                    onClick={() => navigate('/adblocker')}
                                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left text-xs font-bold text-white transition flex items-center gap-2"
                                >
                                    <ShieldCheck size={14} className="text-cyan-400" />
                                    <span>Adblocker Guide</span>
                                </button>
                                <button
                                    onClick={() => navigate('/devices')}
                                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left text-xs font-bold text-white transition flex items-center gap-2"
                                >
                                    <Tv size={14} className="text-emerald-400" />
                                    <span>TV Setup</span>
                                </button>
                                <button
                                    onClick={() => window.open('/MyDonkey.pdf', '_blank')}
                                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left text-xs font-bold text-white transition flex items-center gap-2"
                                >
                                    <ExternalLink size={14} className="text-purple-400" />
                                    <span>PDF Manual</span>
                                </button>
                            </div>

                            <button
                                onClick={() => navigate('/community-chat')}
                                className="w-full mt-3 p-3 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-left text-xs font-bold text-white transition flex items-center justify-between"
                            >
                                <div className="flex items-center gap-2">
                                    <MessageCircle size={15} className="text-indigo-400" />
                                    <span>Browse Community Help Chat</span>
                                </div>
                                <span className="text-[10px] text-indigo-300 font-normal">Live Q&amp;A &rarr;</span>
                            </button>
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
};

export default ContactDeskPage;
