import React, { useState, useEffect, useMemo } from 'react';
import { Play, Plus, X, ThumbsUp, Check, Download, Share2, Search, Music2, Trash2 } from 'lucide-react';
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

const ContentDetails: React.FC<ContentDetailsProps> = ({ content, onClose, onPlay, onDetails }) => {
    const { currentProfile, toggleWatchlist, currentUser, content: allContent, deleteContent, settings } = useStore();
    const isAdmin = currentUser?.role === 'admin';
    const isAdded = currentProfile?.myList.includes(content.id);
    const [isOverviewExpanded, setIsOverviewExpanded] = useState(false);

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
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
            window.open(`https://drive.google.com/uc?id=${legacyId}&export=download`, '_blank');
        } else if (videoUrl) {
            // Fallback: Download the streaming URL directly
            window.open(videoUrl, '_blank');
        } else {
            alert('Download not available for this content');
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center md:p-8 animate-in fade-in duration-300">
            {/* Download Options Modal */}
            {downloadOptions && (
                <div className="absolute inset-0 z-[210] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
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
                                    target="_blank"
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

            {/* Backdrop Overlay (Universal) */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Container */}
            {/* Added max-w-full and h-full for mobile to ensure full intersection */}
            <div className="relative w-[95%] md:w-full h-[90vh] md:h-auto md:max-w-5xl md:max-h-[90vh] bg-[#181818] rounded-2xl md:rounded-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500 flex flex-col">


                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-[60] bg-black/40 backdrop-blur-md p-2 rounded-full hover:bg-white/10 transition text-white border border-white/10"
                >
                    <X size={20} />
                </button>

                {/* --- Mobile: Full Screen Layout (Single Frame) --- */}
                <div className="md:hidden relative h-full w-full flex flex-col overflow-y-auto no-scrollbar">
                    {/* Full Height Background Image */}
                    <div className="absolute inset-0 z-0 h-[50vh]">
                        {/* Prefer Poster for mobile aspect ratio if available, else Backdrop */}
                        {(content.poster_path || content.backdrop_path) ? (
                            <img
                                src={content.poster_path || content.backdrop_path}
                                className="w-full h-full object-cover"
                                alt={content.title}
                            />
                        ) : null}
                        {/* Stronger Gradient for readability */}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-[#181818]/80 to-transparent" />
                    </div>

                    {/* Content Overlay - Anchored to Bottom */}
                    <div className="relative z-10 mt-[35vh] p-5 pb-8 flex flex-col gap-4 bg-gradient-to-t from-[#181818] via-[#181818] to-[#181818]">
                        {/* Title & Metadata */}
                        <div>
                            <h2 className="text-3xl font-black mb-2 text-white leading-tight drop-shadow-xl">{content.title}</h2>
                            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-gray-300">
                                <span className="text-green-400 font-bold">{(content.vote_average * 10).toFixed(0)}% Match</span>
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
                            <div className="flex flex-col items-center gap-1 cursor-pointer active:scale-90 transition" onClick={() => {
                                alert(`Thanks for rating ${content.title}! ⭐`);
                            }}>
                                <ThumbsUp size={20} className="text-white" />
                                <span className="text-[10px] text-gray-400">Rate</span>
                            </div>
                            <div className="flex flex-col items-center gap-1 cursor-pointer active:scale-90 transition" onClick={async () => {
                                const shareUrl = `${window.location.origin}/browse/${content.id}`;
                                const shareData = {
                                    title: content.title,
                                    text: `🎬 Watch "${content.title}" on My Donkey! ${content.overview?.slice(0, 100)}...`,
                                    url: shareUrl
                                };
                                try {
                                    if (navigator.share) {
                                        await navigator.share(shareData);
                                    } else {
                                        await navigator.clipboard.writeText(shareUrl);
                                        alert('Link copied! Share it with your friends.');
                                    }
                                } catch (err) {
                                    // Share cancelled
                                }
                            }}>
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
                                                onClose();
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

                {/* --- Desktop: Existing Layout --- */}
                <div className="hidden md:flex flex-col h-full bg-[#181818] overflow-y-auto no-scrollbar">
                    <div className="relative h-[400px] md:h-[500px] flex-shrink-0">
                        {(content.backdrop_path || content.poster_path) ? (
                            <img
                                src={content.backdrop_path || content.poster_path}
                                className="w-full h-full object-cover"
                                alt={content.title}
                            />
                        ) : null}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-[#181818]/20 to-transparent" />

                        <div className="absolute bottom-0 left-0 w-full p-8 md:p-12">
                            <h2 className="text-4xl md:text-6xl font-black mb-6 drop-shadow-lg">{content.title}</h2>

                            <div className="flex flex-wrap items-center gap-4">
                                {isPlayable ? (
                                    <button
                                        onClick={() => { onPlay(content, 'movie'); }}
                                        className="bg-white text-black px-8 py-3 rounded font-bold text-lg flex items-center gap-2 hover:bg-gray-200 transition-transform active:scale-95"
                                    >
                                        <Play size={24} fill="black" /> Play {content.type === 'tv' ? 'Series' : 'Now'}
                                    </button>
                                ) : (
                                    // Only show Coming Soon if truly coming soon, otherwise Not Available
                                    <button
                                        className="bg-white/20 text-white/50 px-8 py-3 rounded font-bold text-lg flex items-center gap-2 cursor-not-allowed"
                                    >
                                        {content.comingSoon ? 'Coming Soon' : 'Not Available'}
                                    </button>
                                )}

                                {content.youtubeId && (
                                    <button
                                        onClick={() => { onPlay(content, 'trailer'); }}
                                        className={`px-8 py-3 rounded font-bold text-lg flex items-center gap-2 transition-transform active:scale-95 ${!(isPlayable && isSingleVideoType) ? 'bg-white text-black hover:bg-gray-200' : 'bg-gray-600/60 hover:bg-gray-600 text-white'}`}
                                    >
                                        <Play size={24} fill={(isPlayable && isSingleVideoType) ? "white" : "black"} /> {(isPlayable && isSingleVideoType) ? 'Trailer' : 'Play Trailer'}
                                    </button>
                                )}

                                <button
                                    onClick={() => toggleWatchlist(content.id)}
                                    className="bg-gray-600/40 backdrop-blur-md p-3 rounded-full border border-white/20 hover:border-white transition group"
                                    title="My List"
                                >
                                    {isAdded ? <Check size={24} className="text-green-400" /> : <Plus size={24} />}
                                </button>
                                <button
                                    onClick={() => alert(`Thanks for rating ${content.title}! ⭐`)}
                                    className="bg-gray-600/40 backdrop-blur-md p-3 rounded-full border border-white/20 hover:border-white transition"
                                    title="Rate"
                                >
                                    <ThumbsUp size={24} />
                                </button>
                                <button
                                    onClick={async () => {
                                        const shareUrl = `${window.location.origin}/browse/${content.id}`;
                                        const shareData = {
                                            title: content.title,
                                            text: `🎬 Watch "${content.title}" on My Donkey! ${content.overview?.slice(0, 100)}...`,
                                            url: shareUrl
                                        };
                                        try {
                                            if (navigator.share) {
                                                await navigator.share(shareData);
                                            } else {
                                                await navigator.clipboard.writeText(shareUrl);
                                                alert('Link copied! Share it with your friends.');
                                            }
                                        } catch (err) {
                                            // Share cancelled or clipboard write failed
                                        }
                                    }}
                                    className="bg-gray-600/40 backdrop-blur-md p-3 rounded-full border border-white/20 hover:border-white transition"
                                    title="Share"
                                >
                                    <Share2 size={24} />
                                </button>
                                <button
                                    onClick={() => handleDownload(content)}
                                    className={`backdrop-blur-md p-3 rounded-full border transition ${content.allowDownload ? 'bg-gray-600/40 border-white/20 hover:border-white' : 'bg-gray-800/40 border-gray-700 cursor-not-allowed'}`}
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
                                                    onClose();
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

                    <div className="p-8 md:p-12 flex-1">
                        <div className="grid grid-cols-[1fr_300px] gap-12">
                            <div className="space-y-6">
                                <div className="flex flex-wrap items-center gap-3 text-lg font-medium">
                                    <span className="text-green-400 font-bold">{(content.vote_average * 10).toFixed(0)}% Match</span>
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
                                        // Scroll to top if we stay in same modal, but here we likely switch item props
                                        // The parent viewingItem changes, so this component re-renders with new content.
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