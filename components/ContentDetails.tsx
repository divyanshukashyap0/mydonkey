import React, { useState, useEffect, useMemo } from 'react';
import { Play, Plus, X, ThumbsUp, Volume2, Check, Download, Share2 } from 'lucide-react';
import { Content, Season, Episode } from '../types';
import { useStore } from '../context/StoreContext';
import ContentRail from './ContentRail';

interface ContentDetailsProps {
    content: Content;
    onClose: () => void;
    onPlay: (item: Content, mode?: 'trailer' | 'movie') => void;
    onDetails?: (item: Content) => void;
}

const ContentDetails: React.FC<ContentDetailsProps> = ({ content, onClose, onPlay, onDetails }) => {
    const { currentProfile, toggleWatchlist, currentUser, content: allContent } = useStore();
    const isAdded = currentProfile?.myList.includes(content.id);

    // Filter Related Content
    const relatedContent = useMemo(() => {
        if (!allContent) return [];
        return allContent
            .filter(c => c.id !== content.id && c.genres?.some(g => content.genres?.includes(g)))
            .slice(0, 10);
    }, [content, allContent]);

    // State for Season Selection (TV Shows)
    const [selectedSeasonId, setSelectedSeasonId] = useState<string>("");

    // Initialize selected season
    useEffect(() => {
        if (content.type === 'tv' && content.seasons && content.seasons.length > 0) {
            setSelectedSeasonId(content.seasons[0].id);
        }
    }, [content]);

    const handlePlayEpisode = (season: Season, episode: Episode) => {
        // Construct a temporary Content object for the player
        // This ensures the player gets the correct title and ID for tracking
        const episodeContent: Content = {
            ...content,
            id: episode.id, // Use episode ID for tracking progress specific to this episode
            title: `${content.title} - ${season.title} | ${episode.title}`, // "Show Name - S1 | Ep1"
            movieDriveId: episode.driveId,
            movieYoutubeId: episode.youtubeId,
            videoUrl: episode.videoUrl, // Pass the direct video URL
            playMode: 'movie' as const,
            duration: episode.duration
        };
        onPlay(episodeContent, 'movie');
        onClose();
    };

    // Helper to determine if content is playable
    // Any type except 'tv' is considered a single video play mode (movie, sparks, sports, short)
    const isSingleVideoType = content.type !== 'tv';

    // Check for ANY valid video source
    const hasVideoSource = !!(content.movieDriveId || content.movieYoutubeId || content.videoUrl || content.youtubeId);

    // Check if TV show has any seasons with episodes
    const hasEpisodes = content.type === 'tv' && !!content.seasons && content.seasons.length > 0 && content.seasons.some(s => s.episodes.length > 0);

    const isPlayable = isSingleVideoType ? hasVideoSource : hasEpisodes;

    // Get current season object
    const currentSeason = content.seasons?.find(s => s.id === selectedSeasonId);


    // Download Options State
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

            {/* Backdrop Overlay (Desktop) */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm hidden md:block"
                onClick={onClose}
            />

            {/* Modal Container */}
            {/* Added max-w-full and h-full for mobile to ensure full intersection */}
            <div className="relative w-full h-full md:h-auto md:max-w-5xl md:max-h-[90vh] bg-[#181818] md:rounded-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500 flex flex-col">


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
                        <img
                            src={content.poster_path}
                            className="w-full h-full object-cover"
                            alt={content.title}
                        />
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
                                <span className="border border-white/30 px-1 rounded text-[10px]">{content.rating || 'U/A 13+'}</span>
                                <span>•</span>
                                <span>{content.genres?.[0]}</span>
                            </div>

                        </div>

                        {/* Description - Line Clamp to prevent scrolling, user can expand if absolutely needed but goal is compact */}
                        <p className="text-sm text-gray-300 line-clamp-3 leading-relaxed drop-shadow-md">
                            {content.overview}
                        </p>

                        {/* Action Buttons Row */}
                        <div className="grid grid-cols-2 gap-3 mt-1">
                            {isPlayable ? (
                                isSingleVideoType ? (
                                    <button
                                        onClick={() => { onPlay(content, 'movie'); onClose(); }}
                                        className="bg-white text-black py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-200 active:scale-95 transition"
                                    >
                                        <Play size={18} fill="black" /> Play
                                    </button>
                                ) : (
                                    // TV Show - Scroll to episodes
                                    <button
                                        onClick={() => {
                                            const mobileEpisodes = document.getElementById('episodes-mobile');
                                            if (mobileEpisodes) mobileEpisodes.scrollIntoView({ behavior: 'smooth' });
                                        }}
                                        className="bg-white/20 text-white py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-white/30 transition"
                                    >
                                        <Check size={18} /> Select Episode
                                    </button>
                                )
                            ) : (
                                <button className="bg-white/20 text-white/50 py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 cursor-not-allowed">
                                    {content.comingSoon ? 'Coming Soon' : 'Not Available'}
                                </button>
                            )}

                            {content.youtubeId && (
                                <button
                                    onClick={() => { onPlay(content, 'trailer'); onClose(); }}
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

                        {/* Season & Episodes (Mobile) */}
                        {content.type === 'tv' && content.seasons && content.seasons.length > 0 && (
                            <div id="episodes-mobile" className="mt-6 pb-20">
                                {/* Season Selector */}
                                {content.seasons.length > 1 && (
                                    <div className="mb-6 flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                                        {content.seasons.map(season => (
                                            <button
                                                key={season.id}
                                                onClick={() => setSelectedSeasonId(season.id)}
                                                className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all border ${selectedSeasonId === season.id
                                                    ? 'bg-white text-black border-white shadow-lg'
                                                    : 'bg-white/10 text-white border-transparent hover:bg-white/20'
                                                    }`}
                                            >
                                                {season.title}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Episodes List */}
                                <div className="space-y-3">
                                    {currentSeason?.episodes.map((ep, idx) => (
                                        <div
                                            key={ep.id}
                                            onClick={() => handlePlayEpisode(currentSeason, ep)}
                                            className="flex items-center gap-4 p-3 bg-white/5 rounded-lg active:bg-white/10 transition cursor-pointer"
                                        >
                                            <div className="w-24 aspect-video bg-black/40 rounded overflow-hidden flex-shrink-0 relative">
                                                {ep.stillUrl ? (
                                                    <img src={ep.stillUrl} className="w-full h-full object-cover" alt={ep.title} />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-600">
                                                        <Play size={20} fill="currentColor" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-center">
                                                    <div className="flex-1">
                                                        <div className="flex justify-between items-start">
                                                            <h4 className="font-bold text-sm text-gray-200 line-clamp-1">{idx + 1}. {ep.title}</h4>
                                                            <span className="text-[10px] text-gray-500">{ep.duration}</span>
                                                        </div>
                                                        <p className="text-[10px] text-gray-400 mt-1 line-clamp-2">{ep.overview || ""}</p>
                                                    </div>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDownload(ep); }}
                                                        className="ml-3 p-2 bg-white/10 rounded-full hover:bg-white/20 active:scale-95 transition"
                                                    >
                                                        <Download size={14} className="text-gray-300" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* --- Desktop: Existing Layout --- */}
                <div className="hidden md:flex flex-col h-full bg-[#181818] overflow-y-auto no-scrollbar">
                    <div className="relative h-[400px] md:h-[500px] flex-shrink-0">
                        <img
                            src={content.backdrop_path}
                            className="w-full h-full object-cover"
                            alt={content.title}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-[#181818]/20 to-transparent" />

                        <div className="absolute bottom-0 left-0 w-full p-8 md:p-12">
                            <h2 className="text-4xl md:text-6xl font-black mb-6 drop-shadow-lg">{content.title}</h2>

                            <div className="flex flex-wrap items-center gap-4">
                                {isPlayable ? (
                                    isSingleVideoType ? (
                                        <button
                                            onClick={() => { onPlay(content, 'movie'); onClose(); }}
                                            className="bg-white text-black px-8 py-3 rounded font-bold text-lg flex items-center gap-2 hover:bg-gray-200 transition-transform active:scale-95"
                                        >
                                            <Play size={24} fill="black" /> Play {content.type === 'movie' ? 'Movie' : 'Now'}
                                        </button>
                                    ) : (
                                        // TV Show - Show "Select Episode" to guide user
                                        <button
                                            onClick={() => {
                                                const episodesSection = document.getElementById('episodes-section');
                                                if (episodesSection) episodesSection.scrollIntoView({ behavior: 'smooth' });
                                            }}
                                            className="bg-white text-black px-8 py-3 rounded font-bold text-lg flex items-center gap-2 cursor-pointer hover:bg-gray-200 transition"
                                        >
                                            <Check size={24} /> Select Episode Below
                                        </button>
                                    )
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
                                        onClick={() => { onPlay(content, 'trailer'); onClose(); }}
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
                            </div>
                        </div>
                    </div>

                    <div className="p-8 md:p-12 flex-1">
                        <div className="grid grid-cols-[1fr_300px] gap-12">
                            <div className="space-y-6">
                                <div className="flex flex-wrap items-center gap-3 text-lg font-medium">
                                    <span className="text-green-400 font-bold">{(content.vote_average * 10).toFixed(0)}% Match</span>
                                    <span className="text-gray-400">{content.release_date?.split('-')[0]}</span>
                                    <span className="border border-gray-600 px-2 py-0.5 rounded text-xs">{content.rating || 'U/A 13+'}</span>
                                    {(content.type?.toLowerCase() === 'tv' || (content.seasons && content.seasons.length > 0)) ? (
                                        <span className="text-gray-400">{content.seasons?.length || 1} Season{(content.seasons?.length || 1) !== 1 ? 's' : ''}</span>
                                    ) : (
                                        <span className="text-gray-400">{content.duration || '0m'}</span>
                                    )}
                                    <span className="border border-white/30 px-1.5 rounded text-[10px] font-black tracking-tighter">{content.resolution || 'HD'}</span>
                                </div>
                                <p className="text-xl leading-relaxed text-gray-200">{content.overview}</p>

                                {/* Episodes Section (Desktop) */}
                                {content.type === 'tv' && content.seasons && content.seasons.length > 0 && (
                                    <div id="episodes-section" className="mt-8 pt-8 border-t border-white/10">
                                        <div className="flex items-center justify-between mb-6">
                                            <h3 className="text-2xl font-bold text-white">Episodes</h3>
                                            {content.seasons.length > 1 && (
                                                <div className="flex gap-2">
                                                    {content.seasons.map(season => (
                                                        <button
                                                            key={season.id}
                                                            onClick={() => setSelectedSeasonId(season.id)}
                                                            className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all border ${selectedSeasonId === season.id
                                                                ? 'bg-white text-black border-white shadow-md'
                                                                : 'bg-transparent text-gray-400 border-gray-600 hover:border-white hover:text-white'
                                                                }`}
                                                        >
                                                            {season.title}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 gap-4">
                                            {currentSeason?.episodes.map((ep, idx) => (
                                                <div
                                                    key={ep.id}
                                                    onClick={() => handlePlayEpisode(currentSeason, ep)}
                                                    className="group flex gap-6 p-4 rounded-xl hover:bg-white/5 transition border border-transparent hover:border-white/10 cursor-pointer"
                                                >
                                                    <div className="w-[160px] aspect-video bg-black/40 rounded-lg overflow-hidden relative flex-shrink-0 group-hover:scale-[1.02] transition-transform">
                                                        {ep.stillUrl ? (
                                                            <img src={ep.stillUrl} className="w-full h-full object-cover" alt={ep.title} />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-gray-600 bg-white/5">
                                                                <Play size={24} fill="currentColor" />
                                                            </div>
                                                        )}
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            <Play size={32} className="text-white fill-white" />
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 flex flex-col justify-center">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <h4 className="font-bold text-lg text-white group-hover:text-brand-red transition-colors">{idx + 1}. {ep.title}</h4>
                                                            <div className="flex items-center gap-4">
                                                                <span className="text-sm text-gray-400 font-mono">{ep.duration}</span>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleDownload(ep); }}
                                                                    className="p-2 hover:bg-white/20 rounded-full transition relative z-20"
                                                                    title="Download Episode"
                                                                >
                                                                    <Download size={18} className="text-gray-400 hover:text-white" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <p className="text-gray-400 text-sm line-clamp-2">{ep.overview || `Episode ${idx + 1} of ${currentSeason.title}`}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                            </div>
                            <div className="space-y-4 text-sm">
                                {content.director && (
                                    <div><span className="text-gray-500">Director: </span><span className="text-white">{content.director}</span></div>
                                )}
                                {content.creators && content.creators.length > 0 && (
                                    <div><span className="text-gray-500">Creators: </span><span className="text-white">{content.creators.join(', ')}</span></div>
                                )}
                                <div><span className="text-gray-500">Cast: </span><span className="text-gray-300">{content.cast?.join(', ')}</span></div>
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