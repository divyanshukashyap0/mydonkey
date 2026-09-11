import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Play, Plus, X, ThumbsUp, Check, Download, Share2, Search, Music2, Trash2, ArrowLeft, Maximize, Minimize } from 'lucide-react';
import { Content, Season, Episode } from '../types';
import { useStore } from '../context/StoreContext';
import ContentRail from './ContentRail';
import SongsSection from './SongsSection';

import { buildEmbedUrl } from '../utils/embedUrl';

interface ContentDetailsProps {
    content: Content;
    onClose: () => void;
    onPlay: (item: Content, mode?: 'trailer' | 'movie') => void;
    onDetails?: (item: Content) => void;
}

const ContentDetails: React.FC<ContentDetailsProps> = ({ content: initialContent, onClose, onPlay, onDetails }) => {
    const { currentProfile, toggleWatchlist, likedContent, toggleLike, currentUser, content: allContent, deleteContent, settings, fetchContentById } = useStore();
    const [content, setContent] = useState<Content>(initialContent);

    useEffect(() => {
        setContent(initialContent);
        if (initialContent.id && !initialContent.id.startsWith('tmdb_') && !initialContent.id.startsWith('imdb_') && fetchContentById) {
            const needsFullDoc = initialContent.type === 'tv' && (!initialContent.seasons || initialContent.seasons.length === 0);
            if (needsFullDoc) {
                fetchContentById(initialContent.id).then(full => {
                    if (full) setContent(full);
                }).catch(() => {});
            }
        }
    }, [initialContent, fetchContentById]);

    const isAdmin = currentUser?.role === 'admin';
    const isAdded = currentProfile?.myList?.includes(content.id) ?? false;
    const isLiked = likedContent?.includes(content.id) ?? false;
    const [isOverviewExpanded, setIsOverviewExpanded] = useState(false);

    const mobileScrollRef = useRef<HTMLDivElement>(null);
    const desktopScrollRef = useRef<HTMLDivElement>(null);

    // Fullscreen state management
    const [isBrowserFullscreen, setIsBrowserFullscreen] = useState(false);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsBrowserFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const toggleFullscreen = async () => {
        try {
            if (!document.fullscreenElement) {
                if (document.documentElement.requestFullscreen) {
                    await document.documentElement.requestFullscreen();
                } else if ((document.documentElement as any).webkitRequestFullscreen) {
                    await (document.documentElement as any).webkitRequestFullscreen();
                }
            } else {
                if (document.exitFullscreen) {
                    await document.exitFullscreen();
                } else if ((document as any).webkitExitFullscreen) {
                    await (document as any).webkitExitFullscreen();
                }
            }
        } catch (err) {
            console.warn('Fullscreen toggle failed', err);
        }
    };

    const handleClose = () => {
        if (document.fullscreenElement) {
            try {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                }
            } catch {}
        }
        onClose();
    };

    // Dynamically update document title to content name when viewing content page
    useEffect(() => {
        const prevTitle = document.title;
        if (content?.title) {
            document.title = `${content.title} | My Donkey`;
        }
        return () => {
            document.title = prevTitle;
        };
    }, [content?.title]);

    // Prevent background scrolling while full-screen content page is open
    useEffect(() => {
        const prevOverflow = document.body.style.overflow;
        const prevDocOverflow = document.documentElement.style.overflow;
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prevOverflow;
            document.documentElement.style.overflow = prevDocOverflow;
        };
    }, []);

    // Ensure movie card details always start from top smoothly
    useEffect(() => {
        setIsOverviewExpanded(false);
        if (mobileScrollRef.current) {
            mobileScrollRef.current.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
        }
        if (desktopScrollRef.current) {
            desktopScrollRef.current.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
        }
    }, [content.id]);

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                handleClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // Filter Related Content
    const relatedContent = useMemo(() => {
        if (!allContent) return [];
        return allContent
            .filter(c => c.id !== content.id && c.genres?.some(g => content.genres?.includes(g)))
            .slice(0, 10);
    }, [content, allContent]);

    // Helper to determine if content is playable
    // Any type except 'tv' is considered a single video play mode (movie, sparks, sports, short)
    const isSingleVideoType = content.type !== 'tv';

    // Content from TMDB or IMDb is always playable
    const isTmdbOrImdb = !!content.tmdbId || (typeof content.id === 'string' && (content.id.startsWith('tmdb_') || content.id.startsWith('imdb_'))) || !!content.imdbId;

    // Check for ANY valid video source
    const hasVideoSource = !!(content.movieDriveId || content.movieYoutubeId || content.videoUrl || content.youtubeId || isTmdbOrImdb);

    // Check if TV show has any seasons with episodes
    const hasEpisodes = content.type === 'tv' && !!content.seasons && content.seasons.length > 0 && content.seasons.some(s => s.episodes.length > 0);

    const isPlayable = hasVideoSource || hasEpisodes;

    // Ensure videoUrl is ready for playback if from TMDB/IMDb and missing
    if (isTmdbOrImdb && !content.videoUrl) {
        const streamId = content.imdbId || (content.tmdbId ? String(content.tmdbId) : (typeof content.id === 'string' ? content.id.replace(/^(tmdb_|imdb_)/, '') : ''));
        if (streamId) {
            content.videoUrl = buildEmbedUrl(streamId, content.type || 'movie', settings);
        }
    }

    const [downloadOptions, setDownloadOptions] = useState<Content | Episode | null>(null);

    const handleDownload = (item: Content | Episode) => {
        if (currentUser?.isGuest) {
            alert('Guest mode download is not allowed. Please log in with your credentials to download this content.');
            return;
        }

        const links = item.downloadLinks || [];
        // Check legacy drive ID if no links
        const legacyId = 'movieDriveId' in item ? item.movieDriveId : (item as Episode).driveId;
        // Check for direct video URL as last resort
        const videoUrl = 'videoUrl' in item ? item.videoUrl : (item as Episode).videoUrl;

        if (links.length > 0) {
            setDownloadOptions(item);
        } else if (legacyId) {
            window.location.href = `https://drive.google.com/uc?id=${legacyId}&export=download`;
        } else if (videoUrl && !videoUrl.includes('/embed/')) {
            // Fallback: Trigger direct file download without navigating the window
            const a = document.createElement('a');
            a.href = videoUrl;
            a.setAttribute('download', `${item.title || 'video'}.mp4`);
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } else {
            alert('Direct download is not available for this stream. You can watch it directly in the player.');
        }
    };

    const handleShareContent = async () => {
        const shareUrl = `${window.location.origin}/browse/${content.id}`;
        const titleText = content.title || 'Movie';
        const year = content.release_date?.split('-')[0] || '';
        const descText = content.overview ? `${content.overview.slice(0, 110)}...` : 'Watch in HD for free on My Donkey';
        // Message without URL for Web Share API (which appends the url parameter automatically)
        const shareMessage = `🎬 Watch "${titleText}${year ? ` (${year})` : ''}" on My Donkey!\n${descText}\n\n🍿 Stream Free:`;
        // Full text including URL for direct clipboard copying
        const fullShareText = `${shareMessage} ${shareUrl}`;

        // Attempt rich file share with image if device supports Web Share API with files
        const thumbnailToShare = content.backdrop_path || content.poster_path;
        let shareFiles: File[] | undefined;

        if (thumbnailToShare && typeof navigator !== 'undefined' && (navigator as any).canShare) {
            try {
                const res = await fetch(thumbnailToShare, { mode: 'cors' });
                if (res.ok) {
                    const blob = await res.blob();
                    const cleanName = titleText.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
                    const ext = blob.type.includes('png') ? 'png' : 'jpg';
                    const file = new File([blob], `${cleanName}_thumbnail.${ext}`, { type: blob.type || 'image/jpeg' });
                    if ((navigator as any).canShare({ files: [file] })) {
                        shareFiles = [file];
                    }
                }
            } catch {
                // Fallback to text & URL share
            }
        }

        const sharePayload: ShareData = {
            title: `${titleText} | My Donkey`,
            text: shareMessage,
            url: shareUrl,
            ...(shareFiles ? { files: shareFiles } : {})
        };

        try {
            if (navigator.share) {
                await navigator.share(sharePayload);
            } else {
                await navigator.clipboard.writeText(fullShareText);
                alert('🎬 Link copied to clipboard! Paste it into your chat to share.');
            }
        } catch (err: any) {
            if (err.name !== 'AbortError') {
                try {
                    if (navigator.share) {
                        await navigator.share({
                            title: `${titleText} | My Donkey`,
                            text: shareMessage,
                            url: shareUrl
                        });
                        return;
                    }
                } catch { }
                try {
                    await navigator.clipboard.writeText(fullShareText);
                    alert('🎬 Link copied to clipboard! Paste it into your chat to share.');
                } catch { }
            }
        }
    };

    return (
        <div className="fixed inset-0 z-[200] w-full h-full bg-[#121212] flex flex-col overflow-hidden animate-in fade-in duration-300">
            {/* Download Options Modal */}
            {downloadOptions && (
                <div className="absolute inset-0 z-[220] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-[#181818] border border-white/10 p-6 rounded-xl w-full max-w-sm shadow-2xl relative">
                        <button
                            onClick={() => setDownloadOptions(null)}
                            className="absolute top-2 right-2 text-gray-400 hover:text-white"
                        >
                            <X size={20} />
                        </button>
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <Download size={20} /> Select Quality
                        </h3>
                        <div className="space-y-2">
                            {downloadOptions.downloadLinks?.map((link, idx) => (
                                <a
                                    key={idx}
                                    href={link.url}
                                    target="_self"
                                    rel="noreferrer"
                                    className="block p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-center font-bold text-white transition flex justify-between items-center group"
                                    onClick={() => setDownloadOptions(null)}
                                >
                                    <span>{link.label}</span>
                                    <Download size={16} className="text-gray-400 group-hover:text-white" />
                                </a>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Top Navigation Bar: Back, Fullscreen Toggle, & Close */}
            <div className="absolute top-4 left-4 right-4 md:top-6 md:left-8 md:right-8 z-[70] flex items-center justify-between pointer-events-none">
                <button
                    onClick={handleClose}
                    className="pointer-events-auto flex items-center gap-2 bg-black/60 hover:bg-black/85 backdrop-blur-md px-4 py-2.5 rounded-full text-white font-semibold text-sm transition-all border border-white/15 hover:border-white/35 shadow-2xl active:scale-95 group"
                    title="Go Back"
                >
                    <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
                    <span>Back</span>
                </button>

                <div className="pointer-events-auto flex items-center gap-2.5">
                    <button
                        onClick={toggleFullscreen}
                        className="bg-black/60 hover:bg-black/85 backdrop-blur-md p-2.5 rounded-full text-white border border-white/15 hover:border-white/35 shadow-2xl transition active:scale-95"
                        title={isBrowserFullscreen ? "Exit Fullscreen (F11)" : "Fullscreen (F11)"}
                    >
                        {isBrowserFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                    </button>
                    <button
                        onClick={handleClose}
                        className="bg-black/60 hover:bg-black/85 backdrop-blur-md p-2.5 rounded-full text-white border border-white/15 hover:border-white/35 shadow-2xl transition active:scale-95"
                        title="Close"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Full Screen Page Content Container */}
            <div className="relative w-full h-full bg-[#121212] overflow-hidden flex flex-col">

                {/* --- Mobile: Full Screen Layout (Single Frame) --- */}
                <div ref={mobileScrollRef} className="md:hidden relative h-full w-full flex flex-col overflow-y-auto no-scrollbar scroll-smooth bg-[#121212]">
                    {/* Full Height Background Image */}
                    <div className="absolute top-0 left-0 right-0 z-0 h-[52vh]">
                        <img
                            src={content.poster_path || content.backdrop_path || '/logo.png'}
                            className={`w-full h-full ${(content.poster_path || content.backdrop_path) ? 'object-cover' : 'object-contain p-12 bg-black/80'}`}
                            alt={content.title}
                            onError={(e) => {
                                const t = e.currentTarget;
                                if (!t.src.endsWith('/logo.png')) {
                                    t.src = '/logo.png';
                                    t.className = "w-full h-full object-contain p-12 bg-black/80";
                                }
                            }}
                        />
                        {/* Stronger Gradient for readability */}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-[#121212]/80 to-transparent" />
                    </div>

                    {/* Content Overlay - Anchored to Bottom */}
                    <div className="relative z-10 mt-[36vh] p-5 pb-12 flex flex-col gap-4 bg-gradient-to-t from-[#121212] via-[#121212] to-[#121212]">
                        {/* Title & Metadata */}
                        <div>
                            <h2 className="text-3xl font-black mb-2 text-white leading-tight drop-shadow-xl">{content.title}</h2>
                            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-gray-300">
                                {content.vote_average ? (
                                    <span className="text-amber-400 font-bold flex items-center gap-1">★ {content.vote_average.toFixed(1)}</span>
                                ) : null}
                                <span>•</span>
                                <span>{content.release_date?.split('-')[0] || '2026'}</span>
                                <span>•</span>
                                {content.rating && <span className="border border-white/30 px-1 rounded text-[10px]">{content.rating}</span>}
                                <span>•</span>
                                <span>{content.genres?.[0]}</span>
                            </div>

                        </div>

                        {/* Description - Line Clamp to prevent scrolling, user can expand if absolutely needed but goal is compact */}
                        <div>
                            <p className={`text-sm text-gray-300 leading-relaxed drop-shadow-md ${!isOverviewExpanded ? 'line-clamp-3' : ''}`}>
                                {content.overview}
                            </p>
                            {content.overview && content.overview.length > 150 && (
                                <button 
                                    onClick={() => setIsOverviewExpanded(!isOverviewExpanded)}
                                    className="text-brand-red text-xs font-bold mt-1 hover:underline"
                                >
                                    {isOverviewExpanded ? 'Show Less' : 'Read More'}
                                </button>
                            )}
                        </div>

                        {/* Action Buttons Row */}
                        <div className="grid grid-cols-2 gap-3 mt-1">
                            {isPlayable ? (
                                <button
                                    onClick={() => { onPlay(content, 'movie'); }}
                                    className="bg-white text-black py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-200 active:scale-95 transition"
                                >
                                    <Play size={18} fill="black" /> Play {content.type === 'tv' ? 'Series' : ''}
                                </button>
                            ) : (
                                <button className="bg-white/20 text-white/50 py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 cursor-not-allowed">
                                    {content.comingSoon ? 'Coming Soon' : 'Not Available'}
                                </button>
                            )}

                            {content.youtubeId && (
                                <button
                                    onClick={() => { onPlay(content, 'trailer'); }}
                                    className="bg-white/10 backdrop-blur-md text-white border border-white/20 py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition"
                                >
                                    <Play size={18} /> Trailer
                                </button>
                            )}
                        </div>

                        {/* Secondary Actions */}
                        <div className="flex items-center justify-between gap-4 mt-1 px-2">
                            <div className="flex flex-col items-center gap-1 cursor-pointer active:scale-90 transition" onClick={() => toggleWatchlist(content.id)}>
                                {isAdded ? <Check size={20} className="text-green-400" /> : <Plus size={20} className="text-white" />}
                                <span className="text-[10px] text-gray-400">My List</span>
                            </div>
                            <div className="flex flex-col items-center gap-1 cursor-pointer active:scale-90 transition" onClick={() => toggleLike(content.id)}>
                                <ThumbsUp size={20} className={isLiked ? "text-red-500 fill-red-500" : "text-white"} />
                                <span className="text-[10px] text-gray-400">{isLiked ? "Liked" : "Rate"}</span>
                            </div>
                            <div className="flex flex-col items-center gap-1 cursor-pointer active:scale-90 transition" onClick={handleShareContent}>
                                <Share2 size={20} className="text-white" />
                                <span className="text-[10px] text-gray-400">Share</span>
                            </div>
                            <div className="flex flex-col items-center gap-1 cursor-pointer active:scale-90 transition" onClick={() => handleDownload(content)}>
                                <Download size={20} className={content.allowDownload ? "text-white" : "text-gray-600"} />
                                <span className="text-[10px] text-gray-400">Download</span>
                            </div>
                        </div>

                        {/* Admin Action Bar (Mobile) */}
                        {isAdmin && (
                            <div className="mt-4 p-3 bg-red-950/40 border border-red-500/30 rounded-xl flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                                        <span>Admin Control</span>
                                        {content.addedBy && (
                                            <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[9px] px-1.5 py-0.2 rounded font-medium">
                                                User Added
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-[10px] text-gray-400 truncate">
                                        {content.addedBy?.email ? `Added by: ${content.addedBy.name || content.addedBy.email}` : 'Remove content & explicit images'}
                                    </div>
                                </div>
                                <button
                                    onClick={async () => {
                                        if (window.confirm(`Admin: Remove "${content.title}" from the platform?\n\nThis will immediately remove this content and its images from Recently Added by Users and the catalog.`)) {
                                            try {
                                                await deleteContent(content.id);
                                                handleClose();
                                            } catch (err: any) {
                                                alert(`Delete failed: ${err.message || err}`);
                                            }
                                        }
                                    }}
                                    className="flex-shrink-0 flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition active:scale-95 shadow"
                                >
                                    <Trash2 size={13} /> Remove
                                </button>
                            </div>
                        )}

                        {/* Songs Tab (Mobile) */}
                        <div className="mt-4 pb-8">
                            <SongsSection movieName={content.title} contentType={content.type} />
                        </div>


                    </div>
                </div>

                {/* --- Desktop: Full Screen Cinematic Layout --- */}
                <div ref={desktopScrollRef} className="hidden md:flex flex-col h-full w-full bg-[#121212] overflow-y-auto no-scrollbar scroll-smooth">
                    <div className="relative h-[65vh] min-h-[500px] max-h-[750px] w-full flex-shrink-0">
                        <img
                            src={content.backdrop_path || content.poster_path || '/logo.png'}
                            className={`w-full h-full ${(content.backdrop_path || content.poster_path) ? 'object-cover' : 'object-contain p-16 bg-black/80'}`}
                            alt={content.title}
                            onError={(e) => {
                                const t = e.currentTarget;
                                if (!t.src.endsWith('/logo.png')) {
                                    t.src = '/logo.png';
                                    t.className = "w-full h-full object-contain p-16 bg-black/80";
                                }
                            }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-[#121212]/30 to-transparent" />

                        <div className="absolute bottom-0 left-0 w-full p-8 md:p-14 bg-gradient-to-t from-[#121212] via-[#121212]/80 to-transparent">
                            <div className="max-w-7xl mx-auto w-full">
                                <h2 className="text-4xl md:text-6xl font-black mb-6 drop-shadow-2xl">{content.title}</h2>

                                <div className="flex flex-wrap items-center gap-4">
                                    {isPlayable ? (
                                        <button
                                            onClick={() => { onPlay(content, 'movie'); }}
                                            className="bg-white text-black px-8 py-3.5 rounded-xl font-bold text-lg flex items-center gap-2 hover:bg-gray-200 transition-all hover:scale-105 active:scale-95 shadow-2xl"
                                        >
                                            <Play size={24} fill="black" /> Play {content.type === 'tv' ? 'Series' : 'Now'}
                                        </button>
                                    ) : (
                                        // Only show Coming Soon if truly coming soon, otherwise Not Available
                                        <button
                                            className="bg-white/20 text-white/50 px-8 py-3.5 rounded-xl font-bold text-lg flex items-center gap-2 cursor-not-allowed"
                                        >
                                            {content.comingSoon ? 'Coming Soon' : 'Not Available'}
                                        </button>
                                    )}

                                    {content.youtubeId && (
                                        <button
                                            onClick={() => { onPlay(content, 'trailer'); }}
                                            className={`px-8 py-3.5 rounded-xl font-bold text-lg flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-xl ${!(isPlayable && isSingleVideoType) ? 'bg-white text-black hover:bg-gray-200' : 'bg-gray-600/60 hover:bg-gray-600 text-white backdrop-blur-md'}`}
                                        >
                                            <Play size={24} fill={(isPlayable && isSingleVideoType) ? "white" : "black"} /> {(isPlayable && isSingleVideoType) ? 'Trailer' : 'Play Trailer'}
                                        </button>
                                    )}

                                    <button
                                        onClick={() => toggleWatchlist(content.id)}
                                        className="bg-gray-600/40 backdrop-blur-md p-3.5 rounded-full border border-white/20 hover:border-white transition hover:scale-105 active:scale-95 group"
                                        title="My List"
                                    >
                                        {isAdded ? <Check size={24} className="text-green-400" /> : <Plus size={24} />}
                                    </button>
                                    <button
                                        onClick={() => toggleLike(content.id)}
                                        className={`p-3.5 rounded-full border transition hover:scale-105 active:scale-95 ${isLiked ? 'bg-white/20 border-white text-white' : 'bg-gray-600/40 backdrop-blur-md border-white/20 hover:border-white text-white'}`}
                                        title={isLiked ? "Liked" : "Rate"}
                                    >
                                        <ThumbsUp size={24} className={isLiked ? "fill-white text-white" : "text-white"} />
                                    </button>
                                    <button
                                        onClick={handleShareContent}
                                        className="bg-gray-600/40 backdrop-blur-md p-3.5 rounded-full border border-white/20 hover:border-white transition hover:scale-105 active:scale-95"
                                        title="Share"
                                    >
                                        <Share2 size={24} />
                                    </button>
                                    <button
                                        onClick={() => handleDownload(content)}
                                        className={`backdrop-blur-md p-3.5 rounded-full border transition hover:scale-105 active:scale-95 ${content.allowDownload ? 'bg-gray-600/40 border-white/20 hover:border-white' : 'bg-gray-800/40 border-gray-700 cursor-not-allowed'}`}
                                        title="Download"
                                    >
                                        <Download size={24} className={content.allowDownload ? 'text-white' : 'text-gray-600'} />
                                    </button>

                                    {isAdmin && (
                                        <button
                                            onClick={async () => {
                                                if (window.confirm(`Admin: Remove "${content.title}" from platform?\n\nThis will immediately remove this content and its images from Recently Added by Users and the catalog.`)) {
                                                    try {
                                                        await deleteContent(content.id);
                                                        handleClose();
                                                    } catch (err: any) {
                                                        alert(`Delete failed: ${err.message || err}`);
                                                    }
                                                }
                                            }}
                                            className="bg-red-600/20 hover:bg-red-600 border border-red-500/40 hover:border-red-500 text-red-400 hover:text-white px-5 py-3 rounded-full font-bold text-sm flex items-center gap-2 transition ml-auto active:scale-95 shadow-lg"
                                            title="Admin: Remove content from platform"
                                        >
                                            <Trash2 size={20} /> Remove (Admin)
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 md:p-14 flex-1 w-full max-w-7xl mx-auto">
                        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-14">
                            <div className="space-y-6">
                                <div className="flex flex-wrap items-center gap-3 text-lg font-medium">
                                    {content.vote_average ? (
                                        <span className="text-amber-400 font-bold flex items-center gap-1">★ {content.vote_average.toFixed(1)}</span>
                                    ) : null}
                                    <span className="text-gray-400">{content.release_date?.split('-')[0]}</span>
                                    {content.rating && <span className="border border-gray-600 px-2 py-0.5 rounded text-xs">{content.rating}</span>}
                                    {(content.type?.toLowerCase() === 'tv' || (content.seasons && content.seasons.length > 0)) ? (
                                        <span className="text-gray-400">{content.seasons?.length || 1} Season{(content.seasons?.length || 1) !== 1 ? 's' : ''}</span>
                                    ) : (
                                        content.duration && content.duration !== '0m' && <span className="text-gray-400">{content.duration}</span>
                                    )}
                                    <span className="border border-white/30 px-1.5 rounded text-[10px] font-black tracking-tighter">{content.resolution || 'HD'}</span>
                                </div>
                                <div className="space-y-2">
                                    <p className={`text-xl leading-relaxed text-gray-200 ${!isOverviewExpanded ? 'line-clamp-3' : ''}`}>
                                        {content.overview}
                                    </p>
                                    {content.overview && content.overview.length > 250 && (
                                        <button 
                                            onClick={() => setIsOverviewExpanded(!isOverviewExpanded)}
                                            className="text-brand-red font-bold hover:underline"
                                        >
                                            {isOverviewExpanded ? 'Show Less' : 'Read More'}
                                        </button>
                                    )}
                                </div>

                                {/* Songs Tab (Desktop) */}
                                <div className="mt-8 pt-8 border-t border-white/10">
                                    <SongsSection movieName={content.title} contentType={content.type} />
                                </div>



                            </div>
                            <div className="space-y-4 text-sm">
                                {content.director && (
                                    <div><span className="text-gray-500">Director: </span><span className="text-white">{content.director}</span></div>
                                )}
                                {content.creators && content.creators.length > 0 && (
                                    <div><span className="text-gray-500">Creators: </span><span className="text-white">{content.creators.join(', ')}</span></div>
                                )}
                                {content.cast && content.cast.length > 0 && (
                                    <div><span className="text-gray-500">Cast: </span><span className="text-gray-300">{content.cast.join(', ')}</span></div>
                                )}
                                <div><span className="text-gray-500">Genres: </span><span className="text-gray-300">{content.genres?.join(', ')}</span></div>
                            </div>
                        </div>

                        {/* Related Content */}
                        {relatedContent.length > 0 && (
                            <div className="mt-12 pt-8 border-t border-white/10">
                                <ContentRail
                                    title="More Like This"
                                    items={relatedContent}
                                    onDetails={(item) => {
                                        if (onDetails) onDetails(item);
                                        mobileScrollRef.current?.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
                                        desktopScrollRef.current?.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
                                    }}
                                />
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ContentDetails;