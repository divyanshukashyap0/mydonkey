import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    MessageSquare,
    Send,
    ThumbsUp,
    CheckCircle2,
    Search,
    Filter,
    Plus,
    X,
    Sparkles,
    ShieldCheck,
    Volume2,
    Tv,
    HelpCircle,
    User,
    Flame,
    Share2,
    AlertCircle,
    BadgeCheck,
    Clock,
    ChevronDown,
    ChevronUp,
    MessageCircle
} from 'lucide-react';
import { db } from '../firebase';
import {
    collection,
    onSnapshot,
    addDoc,
    updateDoc,
    doc,
    serverTimestamp,
    query,
    orderBy
} from 'firebase/firestore';
import { useStore, PERMANENT_ADMINS } from '../context/StoreContext';
import HelpPageHeader from './HelpPageHeader';

export interface HelpAnswer {
    id: string;
    content: string;
    authorName: string;
    authorRole?: 'admin' | 'moderator' | 'member';
    createdAt: string;
    upvotes: number;
    upvotedBy: string[];
    isSolution?: boolean;
}

export interface HelpTopic {
    id: string;
    title: string;
    content: string;
    category: 'playback' | 'sound' | 'tv' | 'ads' | 'general';
    authorName: string;
    authorRole?: 'admin' | 'moderator' | 'member';
    deviceTag?: string;
    createdAt: string;
    upvotes: number;
    upvotedBy: string[];
    isResolved?: boolean;
    answers: HelpAnswer[];
}

const INITIAL_FALLBACK_TOPICS: HelpTopic[] = [
    {
        id: 'topic-1',
        title: 'How do I amplify quiet dialogue on external player embeds?',
        content: 'When watching certain movies, the sound effects and background music are super loud but the voices are almost whispered. What is the best way to get 200%–400% dialogue clarity without clipping?',
        category: 'sound',
        authorName: 'AlexCinephile',
        authorRole: 'member',
        deviceTag: 'Chrome / Windows',
        createdAt: '2 hours ago',
        upvotes: 14,
        upvotedBy: [],
        isResolved: true,
        answers: [
            {
                id: 'ans-1',
                content: 'Check out the new Sound Enhancements page (/sound-enhancements) on My Donkey! Enable Dialogue Clarity EQ (+3.5 dB @ 2.4 kHz) and set the booster to 150%–200%. If you are watching an iframe embed, install the "Sound Booster that Works" Chrome extension or turn on Windows Loudness Equalization in Sound Control Panel.',
                authorName: 'AudioMaster',
                authorRole: 'moderator',
                createdAt: '1 hour ago',
                upvotes: 9,
                upvotedBy: [],
                isSolution: true
            }
        ]
    },
    {
        id: 'topic-2',
        title: 'How to block redirect popups completely on Android phones?',
        content: 'Whenever I click play on some streaming links on mobile Chrome, it tries to open an external ad tab. Is there a way to stop this without installing heavy third-party apps?',
        category: 'ads',
        authorName: 'Rohan_M',
        authorRole: 'member',
        deviceTag: 'Android 14',
        createdAt: '4 hours ago',
        upvotes: 19,
        upvotedBy: [],
        isResolved: true,
        answers: [
            {
                id: 'ans-2',
                content: 'Use Private DNS in your Android settings! Go to Settings > Network & Internet > Private DNS > set Private DNS provider hostname to: dns.adguard.com. It filters out 100% of popup domains at the system level. You can read the step-by-step setup on the /adblocker guide.',
                authorName: 'TechSam',
                authorRole: 'admin',
                createdAt: '3 hours ago',
                upvotes: 16,
                upvotedBy: [],
                isSolution: true
            }
        ]
    },
    {
        id: 'topic-3',
        title: 'Can I stream My Donkey on LG webOS Smart TV in 4K?',
        content: 'Just tried opening mydonkey.in on my LG OLED TV Web Browser. It works great in fullscreen, but is there a shortcut to keep it permanently pinned on my TV home screen?',
        category: 'tv',
        authorName: 'Priya_K',
        authorRole: 'member',
        deviceTag: 'LG webOS OLED',
        createdAt: 'Yesterday',
        upvotes: 8,
        upvotedBy: [],
        isResolved: true,
        answers: [
            {
                id: 'ans-3',
                content: 'Yes! In the LG Web Browser, click the Star icon in the top right address bar to bookmark it. Then hold the "1" or "2" button on your LG Magic Remote to bind My Donkey to a Quick Access number key. Also check /devices on the site for Filmmaker Mode recommendations!',
                authorName: 'CineBuff99',
                authorRole: 'member',
                createdAt: 'Yesterday',
                upvotes: 6,
                upvotedBy: [],
                isSolution: true
            }
        ]
    },
    {
        id: 'topic-4',
        title: 'Video player gives "Stream not responding" on Server 2 — what to do?',
        content: 'Was watching an episode and server 2 paused with a loading spinner. Does switching servers keep my playback position?',
        category: 'playback',
        authorName: 'DevUser',
        authorRole: 'member',
        deviceTag: 'Edge / macOS',
        createdAt: '1 day ago',
        upvotes: 5,
        upvotedBy: [],
        isResolved: false,
        answers: [
            {
                id: 'ans-4',
                content: 'Yes! Click the Server Selector dropdown in the top corner of the player and pick Server 1 or Server 3. Your watch progress is automatically saved to your profile history.',
                authorName: 'StreamPilot',
                authorRole: 'moderator',
                createdAt: '1 day ago',
                upvotes: 4,
                upvotedBy: [],
                isSolution: false
            }
        ]
    }
];

const CATEGORIES = [
    { id: 'all', label: 'All Topics', icon: MessageSquare },
    { id: 'playback', label: 'Playback & Streams', icon: Flame },
    { id: 'sound', label: 'Sound & Volume', icon: Volume2 },
    { id: 'tv', label: 'Smart TV & Casting', icon: Tv },
    { id: 'ads', label: 'Adblockers & DNS', icon: ShieldCheck },
    { id: 'general', label: 'General Advice', icon: HelpCircle }
];

const CommunityHelpChatPage: React.FC = () => {
    const navigate = useNavigate();
    const { currentUser, currentProfile, isAuthenticated } = useStore();

    const [topics, setTopics] = useState<HelpTopic[]>(() => {
        try {
            const cached = localStorage.getItem('my_donkey_community_help_cache');
            if (cached) {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch { }
        return INITIAL_FALLBACK_TOPICS;
    });

    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'resolved' | 'unresolved'>('all');
    const [expandedTopicId, setExpandedTopicId] = useState<string | null>(null);

    // Ask Question Modal State
    const [showAskModal, setShowAskModal] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newContent, setNewContent] = useState('');
    const [newCategory, setNewCategory] = useState<HelpTopic['category']>('playback');
    const [authorDisplayName, setAuthorDisplayName] = useState(
        currentUser?.name || currentProfile?.name || ''
    );
    const [isPosting, setIsPosting] = useState(false);

    // Inline Reply State
    const [replyingToTopicId, setReplyingToTopicId] = useState<string | null>(null);
    const [replyText, setReplyText] = useState('');
    const [replyAuthorName, setReplyAuthorName] = useState(
        currentUser?.name || currentProfile?.name || ''
    );
    const [isSubmittingReply, setIsSubmittingReply] = useState(false);

    // User Vote Cache (tracks which items user clicked thumbs up on)
    const [userVotes, setUserVotes] = useState<Set<string>>(() => {
        try {
            const raw = localStorage.getItem('my_donkey_help_votes');
            return raw ? new Set(JSON.parse(raw)) : new Set();
        } catch {
            return new Set();
        }
    });

    const isAdmin = Boolean(currentUser?.role === 'admin' || (currentUser?.email && PERMANENT_ADMINS.includes(currentUser.email)));

    // Real-Time Firebase Listener
    useEffect(() => {
        let unsub = () => {};
        try {
            const q = query(collection(db, 'community_help_chats'), orderBy('createdAt', 'desc'));
            unsub = onSnapshot(q, (snapshot) => {
                if (!snapshot.empty) {
                    const loaded: HelpTopic[] = snapshot.docs.map(docSnap => {
                        const d = docSnap.data();
                        return {
                            id: docSnap.id,
                            title: d.title || 'Untitled Discussion',
                            content: d.content || '',
                            category: d.category || 'general',
                            authorName: d.authorName || 'Anonymous',
                            authorRole: d.authorRole || 'member',
                            deviceTag: d.deviceTag || 'Web Browser',
                            createdAt: d.createdAt?.toDate ? d.createdAt.toDate().toLocaleDateString() : (d.createdAt || 'Recent'),
                            upvotes: d.upvotes || 0,
                            upvotedBy: d.upvotedBy || [],
                            isResolved: Boolean(d.isResolved),
                            answers: Array.isArray(d.answers) ? d.answers : []
                        };
                    });

                    // Merge loaded with initial fallbacks so conversation stays rich
                    const merged = [...loaded];
                    INITIAL_FALLBACK_TOPICS.forEach(fallback => {
                        if (!merged.some(m => m.id === fallback.id || m.title === fallback.title)) {
                            merged.push(fallback);
                        }
                    });

                    setTopics(merged);
                    try {
                        localStorage.setItem('my_donkey_community_help_cache', JSON.stringify(merged));
                    } catch { }
                }
            }, (error) => {
                console.warn('Firestore community_help_chats listener fallback:', error);
            });
        } catch (e) {
            console.warn('Could not attach Firestore listener:', e);
        }

        return () => unsub();
    }, []);

    // Filtered topics
    const filteredTopics = useMemo(() => {
        return topics.filter(topic => {
            // Category filter
            if (selectedCategory !== 'all' && topic.category !== selectedCategory) return false;

            // Status filter
            if (statusFilter === 'resolved' && !topic.isResolved) return false;
            if (statusFilter === 'unresolved' && topic.isResolved) return false;

            // Search query filter
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchesTitle = topic.title.toLowerCase().includes(q);
                const matchesContent = topic.content.toLowerCase().includes(q);
                const matchesAuthor = topic.authorName.toLowerCase().includes(q);
                const matchesAnswers = topic.answers.some(a => a.content.toLowerCase().includes(q) || a.authorName.toLowerCase().includes(q));
                if (!matchesTitle && !matchesContent && !matchesAuthor && !matchesAnswers) return false;
            }

            return true;
        });
    }, [topics, selectedCategory, statusFilter, searchQuery]);

    // Vote Handler (Toggle Upvote on Question or Answer)
    const handleToggleVote = async (topicId: string, answerId?: string) => {
        const voteKey = answerId ? `ans-${answerId}` : `top-${topicId}`;
        const hasVoted = userVotes.has(voteKey);

        const nextVotes = new Set(userVotes);
        if (hasVoted) {
            nextVotes.delete(voteKey);
        } else {
            nextVotes.add(voteKey);
        }
        setUserVotes(nextVotes);
        try {
            localStorage.setItem('my_donkey_help_votes', JSON.stringify(Array.from(nextVotes)));
        } catch { }

        // Update local state immediately
        setTopics(prev => prev.map(t => {
            if (t.id !== topicId) return t;

            if (answerId) {
                return {
                    ...t,
                    answers: t.answers.map(a => {
                        if (a.id !== answerId) return a;
                        return {
                            ...a,
                            upvotes: Math.max(0, a.upvotes + (hasVoted ? -1 : 1))
                        };
                    })
                };
            }

            return {
                ...t,
                upvotes: Math.max(0, t.upvotes + (hasVoted ? -1 : 1))
            };
        }));

        // Push update to Firestore if document exists
        try {
            const targetTopic = topics.find(t => t.id === topicId);
            if (targetTopic && !topicId.startsWith('topic-')) {
                const topicRef = doc(db, 'community_help_chats', topicId);
                if (answerId) {
                    const updatedAnswers = targetTopic.answers.map(a => {
                        if (a.id !== answerId) return a;
                        return {
                            ...a,
                            upvotes: Math.max(0, a.upvotes + (hasVoted ? -1 : 1))
                        };
                    });
                    await updateDoc(topicRef, { answers: updatedAnswers });
                } else {
                    await updateDoc(topicRef, {
                        upvotes: Math.max(0, targetTopic.upvotes + (hasVoted ? -1 : 1))
                    });
                }
            }
        } catch (err) {
            console.warn('Firestore vote update skipped:', err);
        }
    };

    // Ask Question Handler
    const handlePostQuestion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle.trim() || !newContent.trim()) return;

        setIsPosting(true);
        const resolvedAuthor = authorDisplayName.trim() || (currentUser?.name || currentProfile?.name || 'Fellow Streamer');
        const role: HelpTopic['authorRole'] = isAdmin ? 'admin' : (isAuthenticated ? 'member' : 'member');

        const newTopicData: Omit<HelpTopic, 'id'> = {
            title: newTitle.trim(),
            content: newContent.trim(),
            category: newCategory,
            authorName: resolvedAuthor,
            authorRole: role,
            deviceTag: navigator.userAgent.includes('Mobile') ? 'Mobile Device' : 'Desktop Browser',
            createdAt: 'Just now',
            upvotes: 1,
            upvotedBy: [],
            isResolved: false,
            answers: []
        };

        try {
            // Attempt Firestore insertion
            const docRef = await addDoc(collection(db, 'community_help_chats'), {
                ...newTopicData,
                createdAt: serverTimestamp()
            });

            const createdTopic: HelpTopic = {
                ...newTopicData,
                id: docRef.id
            };

            setTopics(prev => [createdTopic, ...prev]);
        } catch (err) {
            console.warn('Firestore post fallback to local state:', err);
            // Local fallback
            const localId = `topic-${Date.now()}`;
            const createdTopic: HelpTopic = {
                ...newTopicData,
                id: localId
            };
            setTopics(prev => [createdTopic, ...prev]);
        }

        setIsPosting(false);
        setShowAskModal(false);
        setNewTitle('');
        setNewContent('');
    };

    // Submit Reply / Answer Handler
    const handlePostReply = async (topicId: string) => {
        if (!replyText.trim()) return;

        setIsSubmittingReply(true);
        const resolvedAuthor = replyAuthorName.trim() || (currentUser?.name || currentProfile?.name || 'Community Member');
        const role: HelpAnswer['authorRole'] = isAdmin ? 'admin' : 'member';

        const newAnswer: HelpAnswer = {
            id: `ans-${Date.now()}`,
            content: replyText.trim(),
            authorName: resolvedAuthor,
            authorRole: role,
            createdAt: 'Just now',
            upvotes: 1,
            upvotedBy: [],
            isSolution: false
        };

        setTopics(prev => prev.map(t => {
            if (t.id !== topicId) return t;
            return {
                ...t,
                answers: [...t.answers, newAnswer],
                isResolved: true
            };
        }));

        // Push to Firestore if remote document
        try {
            if (!topicId.startsWith('topic-')) {
                const topicRef = doc(db, 'community_help_chats', topicId);
                const currentTopic = topics.find(t => t.id === topicId);
                if (currentTopic) {
                    await updateDoc(topicRef, {
                        answers: [...currentTopic.answers, newAnswer],
                        isResolved: true
                    });
                }
            }
        } catch (err) {
            console.warn('Firestore reply update fallback:', err);
        }

        setIsSubmittingReply(false);
        setReplyText('');
        setReplyingToTopicId(null);
        setExpandedTopicId(topicId);
    };

    return (
        <div className="min-h-screen bg-[#0d0d0d] text-white font-sans selection:bg-brand-red selection:text-white">
            <HelpPageHeader
                breadcrumbs={[
                    { label: 'Support', path: '/support' },
                    { label: 'Community Help Chat', active: true }
                ]}
                backTo="/support"
                backLabel="Back to Support"
                rightBadge={
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 text-xs font-semibold">
                        <MessageCircle size={13} />
                        <span>Live Q&amp;A Chat</span>
                    </span>
                }
            />

            <div className="max-w-6xl mx-auto pt-6 sm:pt-8 pb-28 px-4 sm:px-6 lg:px-8">

                {/* Hero Header */}
                <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-indigo-900/20 via-black to-[#111111] border border-white/10 p-6 sm:p-10 mb-10 shadow-2xl">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="max-w-2xl">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-bold mb-4 tracking-wide">
                                <MessageCircle size={14} />
                                <span>PUBLIC COMMUNITY Q&amp;A &amp; LIVE RESOLUTIONS</span>
                            </div>

                            <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-3">
                                Community <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400">Help Chat</span>
                            </h1>

                            <p className="text-gray-300 text-xs sm:text-sm leading-relaxed">
                                Ask any streaming question, exchange quick TV casting tips, get advice on sound boosting, and help fellow streamers. All discussions and answers are publicly visible to all viewers in real-time.
                            </p>
                        </div>

                        <button
                            onClick={() => setShowAskModal(true)}
                            className="px-6 py-3.5 rounded-2xl bg-brand-red hover:bg-red-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-brand-red/20 active:scale-95 shrink-0"
                        >
                            <Plus size={18} />
                            <span>Ask A Question</span>
                        </button>
                    </div>

                    {/* Stats Ribbon */}
                    <div className="flex flex-wrap items-center gap-6 mt-6 pt-6 border-t border-white/10 text-xs text-gray-400 font-medium">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span>Live Community Active</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <strong className="text-white font-bold">{topics.length}</strong>
                            <span>Questions Posted</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <strong className="text-white font-bold">
                                {topics.reduce((acc, curr) => acc + curr.answers.length, 0)}
                            </strong>
                            <span>Community Answers</span>
                        </div>
                    </div>
                </div>

                {/* Search & Category Filter Bar */}
                <div className="space-y-4 mb-8">
                    {/* Search Bar */}
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                            <Search size={18} />
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search community questions, sound tips, error codes, TV models..."
                            className="w-full pl-11 pr-10 py-3 rounded-2xl bg-white/5 hover:bg-white/[0.08] focus:bg-white/10 border border-white/10 focus:border-indigo-400 text-white placeholder-gray-400 text-xs sm:text-sm outline-none transition backdrop-blur-xl"
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

                    {/* Category Selector Tabs */}
                    <div className="flex items-center justify-between gap-4 overflow-x-auto pb-1 scrollbar-none">
                        <div className="flex items-center gap-2 shrink-0">
                            {CATEGORIES.map(cat => {
                                const IconComp = cat.icon;
                                const isSelected = selectedCategory === cat.id;
                                return (
                                    <button
                                        key={cat.id}
                                        onClick={() => setSelectedCategory(cat.id)}
                                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
                                            isSelected
                                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                                                : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5'
                                        }`}
                                    >
                                        <IconComp size={14} />
                                        <span>{cat.label}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Status Filter Toggles */}
                        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/5 border border-white/5 shrink-0 text-xs">
                            <button
                                onClick={() => setStatusFilter('all')}
                                className={`px-2.5 py-1 rounded-lg font-bold transition ${statusFilter === 'all' ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-white'}`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setStatusFilter('resolved')}
                                className={`px-2.5 py-1 rounded-lg font-bold transition ${statusFilter === 'resolved' ? 'bg-emerald-500/20 text-emerald-300' : 'text-gray-400 hover:text-white'}`}
                            >
                                Solved
                            </button>
                            <button
                                onClick={() => setStatusFilter('unresolved')}
                                className={`px-2.5 py-1 rounded-lg font-bold transition ${statusFilter === 'unresolved' ? 'bg-amber-500/20 text-amber-300' : 'text-gray-400 hover:text-white'}`}
                            >
                                Needs Answer
                            </button>
                        </div>
                    </div>
                </div>

                {/* Questions Feed */}
                <div className="space-y-4">
                    {filteredTopics.map((topic) => {
                        const isExpanded = expandedTopicId === topic.id;
                        const isReplying = replyingToTopicId === topic.id;
                        const hasVotedTopic = userVotes.has(`top-${topic.id}`);

                        return (
                            <div
                                key={topic.id}
                                className="p-5 sm:p-6 rounded-3xl bg-white/[0.03] hover:bg-white/[0.04] border border-white/10 transition backdrop-blur-xl shadow-md"
                            >
                                {/* Topic Top Meta */}
                                <div className="flex flex-wrap items-center justify-between gap-3 mb-3 text-xs">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-xs shadow-sm">
                                            {topic.authorName.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="font-bold text-white">{topic.authorName}</span>

                                        {topic.authorRole === 'admin' && (
                                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-red-500/20 text-brand-red border border-red-500/30">
                                                ADMIN
                                            </span>
                                        )}
                                        {topic.authorRole === 'moderator' && (
                                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                                MOD
                                            </span>
                                        )}

                                        <span className="text-gray-500">•</span>
                                        <span className="text-gray-400">{topic.createdAt}</span>

                                        {topic.deviceTag && (
                                            <span className="hidden sm:inline px-2 py-0.5 rounded-md bg-white/5 text-[10px] text-gray-400 font-mono">
                                                {topic.deviceTag}
                                            </span>
                                        )}
                                    </div>

                                    {topic.isResolved ? (
                                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold">
                                            <BadgeCheck size={13} />
                                            <span>Answered</span>
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-bold">
                                            <Clock size={13} />
                                            <span>Open Question</span>
                                        </span>
                                    )}
                                </div>

                                {/* Question Title & Description */}
                                <h3 className="text-base sm:text-lg font-bold text-white mb-2 leading-snug">
                                    {topic.title}
                                </h3>
                                <p className="text-xs sm:text-sm text-gray-300 leading-relaxed mb-4">
                                    {topic.content}
                                </p>

                                {/* Action Buttons & Counters */}
                                <div className="flex items-center justify-between pt-3 border-t border-white/10 text-xs">
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => handleToggleVote(topic.id)}
                                            className={`px-3 py-1.5 rounded-xl border transition flex items-center gap-1.5 font-bold ${
                                                hasVotedTopic
                                                    ? 'bg-indigo-600 border-indigo-500 text-white'
                                                    : 'bg-white/5 hover:bg-white/10 border-white/5 text-gray-400 hover:text-white'
                                            }`}
                                        >
                                            <ThumbsUp size={13} className={hasVotedTopic ? 'fill-white' : ''} />
                                            <span>{topic.upvotes}</span>
                                        </button>

                                        <button
                                            onClick={() => setExpandedTopicId(isExpanded ? null : topic.id)}
                                            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-gray-300 hover:text-white font-bold transition flex items-center gap-1.5"
                                        >
                                            <MessageSquare size={13} />
                                            <span>{topic.answers.length} {topic.answers.length === 1 ? 'Answer' : 'Answers'}</span>
                                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                        </button>
                                    </div>

                                    <button
                                        onClick={() => {
                                            setReplyingToTopicId(isReplying ? null : topic.id);
                                            setExpandedTopicId(topic.id);
                                        }}
                                        className="px-3.5 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 border border-indigo-500/40 hover:border-indigo-500 text-indigo-300 hover:text-white font-bold transition flex items-center gap-1.5 active:scale-95"
                                    >
                                        <Send size={12} />
                                        <span>Answer</span>
                                    </button>
                                </div>

                                {/* Inline Reply Input Box */}
                                {isReplying && (
                                    <div className="mt-4 pt-4 border-t border-white/10 animate-in fade-in duration-200">
                                        <div className="text-xs font-bold text-indigo-300 mb-2 flex items-center gap-1.5">
                                            <Sparkles size={13} />
                                            <span>Post Public Answer (Visible to All)</span>
                                        </div>

                                        <div className="space-y-3">
                                            <input
                                                type="text"
                                                value={replyAuthorName}
                                                onChange={(e) => setReplyAuthorName(e.target.value)}
                                                placeholder="Your display name (e.g. CinemaGuru)"
                                                className="w-full sm:w-64 px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-xs text-white placeholder-gray-500 outline-none focus:border-indigo-400 transition"
                                            />
                                            <textarea
                                                rows={3}
                                                value={replyText}
                                                onChange={(e) => setReplyText(e.target.value)}
                                                placeholder="Write your answer or troubleshooting solution here..."
                                                className="w-full p-3 rounded-xl bg-black/60 border border-white/10 text-xs sm:text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-400 transition resize-none leading-relaxed"
                                            />
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => setReplyingToTopicId(null)}
                                                    className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={() => handlePostReply(topic.id)}
                                                    disabled={isSubmittingReply || !replyText.trim()}
                                                    className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-xs font-bold text-white transition active:scale-95 shadow-md shadow-indigo-600/30"
                                                >
                                                    {isSubmittingReply ? 'Posting...' : 'Post Answer'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Expanded Answers Thread */}
                                {isExpanded && (
                                    <div className="mt-4 pt-4 border-t border-white/10 space-y-3 animate-in fade-in duration-200">
                                        <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                                            {topic.answers.length} Community {topic.answers.length === 1 ? 'Solution' : 'Solutions'}
                                        </div>

                                        {topic.answers.length === 0 ? (
                                            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-center text-xs text-gray-400">
                                                No answers yet. Be the first to share a solution!
                                            </div>
                                        ) : (
                                            topic.answers.map((answer) => {
                                                const hasVotedAns = userVotes.has(`ans-${answer.id}`);
                                                return (
                                                    <div
                                                        key={answer.id}
                                                        className={`p-4 rounded-2xl border ${
                                                            answer.isSolution
                                                                ? 'bg-emerald-500/5 border-emerald-500/20'
                                                                : 'bg-black/40 border-white/5'
                                                        }`}
                                                    >
                                                        <div className="flex items-center justify-between gap-2 mb-2 text-xs">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 font-bold text-[11px] flex items-center justify-center">
                                                                    {answer.authorName.charAt(0).toUpperCase()}
                                                                </div>
                                                                <span className="font-bold text-white">{answer.authorName}</span>

                                                                {answer.authorRole === 'admin' && (
                                                                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-red-500/20 text-brand-red border border-red-500/30">
                                                                        ADMIN
                                                                    </span>
                                                                )}
                                                                {answer.authorRole === 'moderator' && (
                                                                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                                                        MOD
                                                                    </span>
                                                                )}

                                                                <span className="text-gray-500">•</span>
                                                                <span className="text-gray-400 text-[11px]">{answer.createdAt}</span>
                                                            </div>

                                                            {answer.isSolution && (
                                                                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/30">
                                                                    <CheckCircle2 size={11} />
                                                                    <span>Verified Solution</span>
                                                                </span>
                                                            )}
                                                        </div>

                                                        <p className="text-xs sm:text-sm text-gray-200 leading-relaxed mb-3">
                                                            {answer.content}
                                                        </p>

                                                        <div className="flex items-center justify-end">
                                                            <button
                                                                onClick={() => handleToggleVote(topic.id, answer.id)}
                                                                className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 transition ${
                                                                    hasVotedAns
                                                                        ? 'bg-emerald-600 border-emerald-500 text-white'
                                                                        : 'bg-white/5 hover:bg-white/10 border-white/5 text-gray-400 hover:text-white'
                                                                }`}
                                                            >
                                                                <ThumbsUp size={11} className={hasVotedAns ? 'fill-white' : ''} />
                                                                <span>Helpful ({answer.upvotes})</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {filteredTopics.length === 0 && (
                        <div className="p-12 text-center rounded-3xl bg-white/[0.02] border border-white/5">
                            <HelpCircle size={36} className="mx-auto text-gray-500 mb-3" />
                            <h4 className="text-base font-bold text-white mb-1">No community questions found</h4>
                            <p className="text-xs text-gray-400 max-w-sm mx-auto mb-4">
                                No questions matched your search or category filter. Be the first to ask!
                            </p>
                            <button
                                onClick={() => setShowAskModal(true)}
                                className="px-5 py-2.5 rounded-xl bg-brand-red text-white text-xs font-bold transition shadow-lg shadow-brand-red/20"
                            >
                                Ask A Question Now
                            </button>
                        </div>
                    )}
                </div>

                {/* Ask Question Modal */}
                {showAskModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
                        <div className="w-full max-w-lg rounded-3xl bg-[#141414] border border-white/15 p-6 sm:p-8 shadow-2xl relative">
                            <button
                                onClick={() => setShowAskModal(false)}
                                className="absolute top-5 right-5 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition"
                            >
                                <X size={18} />
                            </button>

                            <div className="flex items-center gap-2 mb-2">
                                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                                    <MessageSquare size={18} />
                                </div>
                                <h3 className="text-lg font-black text-white">Ask The Community</h3>
                            </div>
                            <p className="text-xs text-gray-400 mb-5 leading-relaxed">
                                Your question will be posted publicly for other streamers and moderators to answer.
                            </p>

                            <form onSubmit={handlePostQuestion} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                                        Your Display Name
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={authorDisplayName}
                                        onChange={(e) => setAuthorDisplayName(e.target.value)}
                                        placeholder="e.g. CinemaLover"
                                        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-indigo-400 text-xs sm:text-sm text-white placeholder-gray-500 outline-none transition"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                                        Category
                                    </label>
                                    <select
                                        value={newCategory}
                                        onChange={(e) => setNewCategory(e.target.value as any)}
                                        className="w-full px-4 py-2.5 rounded-xl bg-[#1c1c1c] border border-white/10 focus:border-indigo-400 text-xs sm:text-sm text-white outline-none transition cursor-pointer"
                                    >
                                        <option value="playback">🎬 Playback &amp; Streams</option>
                                        <option value="sound">🔊 Sound &amp; Volume Booster</option>
                                        <option value="tv">📺 Smart TV, Chromecast &amp; AirPlay</option>
                                        <option value="ads">🛡️ Adblockers &amp; Mobile DNS</option>
                                        <option value="general">💬 General Advice &amp; Recommendations</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                                        Question Title <span className="text-brand-red">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={newTitle}
                                        onChange={(e) => setNewTitle(e.target.value)}
                                        placeholder="e.g. How to get 400% sound working on Samsung TV?"
                                        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-indigo-400 text-xs sm:text-sm text-white placeholder-gray-500 outline-none transition"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                                        Detailed Description <span className="text-brand-red">*</span>
                                    </label>
                                    <textarea
                                        required
                                        rows={4}
                                        value={newContent}
                                        onChange={(e) => setNewContent(e.target.value)}
                                        placeholder="Describe what you're trying to do, your device or browser model, and what happens..."
                                        className="w-full p-3 rounded-xl bg-white/5 border border-white/10 focus:border-indigo-400 text-xs sm:text-sm text-white placeholder-gray-500 outline-none transition resize-none leading-relaxed"
                                    />
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowAskModal(false)}
                                        className="px-4 py-2 rounded-xl text-xs font-bold text-gray-400 hover:text-white transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isPosting || !newTitle.trim() || !newContent.trim()}
                                        className="px-6 py-2.5 rounded-xl bg-brand-red hover:bg-red-700 disabled:opacity-40 text-xs font-bold text-white transition shadow-lg shadow-brand-red/20 active:scale-95"
                                    >
                                        {isPosting ? 'Publishing...' : 'Post Question'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default CommunityHelpChatPage;
