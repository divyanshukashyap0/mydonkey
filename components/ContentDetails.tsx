import React from 'react';
import { Play, Plus, X, ThumbsUp, Volume2, Check, Download, Share2 } from 'lucide-react';
import { Content } from '../types';
import { useStore } from '../context/StoreContext';

interface ContentDetailsProps {
    content: Content;
    onClose: () => void;
    onPlay: (item: Content, mode?: 'trailer' | 'movie') => void;
}

const ContentDetails: React.FC<ContentDetailsProps> = ({ content, onClose, onPlay }) => {
    const { currentProfile, toggleWatchlist } = useStore();
    const isAdded = currentProfile?.myList.includes(content.id);

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center md:p-8 animate-in fade-in duration-300">
            {/* Backdrop Overlay (Desktop) */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm hidden md:block"
                onClick={onClose}
            />

            {/* Modal Container */}
            <div className="relative w-full h-full md:h-auto md:max-w-5xl md:max-h-[90vh] bg-[#181818] md:rounded-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500 flex flex-col md:block">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-[60] bg-black/40 backdrop-blur-md p-2 rounded-full hover:bg-white/10 transition text-white border border-white/10"
                >
                    <X size={20} />
                </button>

                {/* --- Mobile: Full Screen Layout (Single Frame) --- */}
                <div className="md:hidden relative h-full w-full flex flex-col">
                    {/* Full Height Background Image */}
                    <div className="absolute inset-0 z-0">
                        {/* Prefer Poster for mobile aspect ratio if available, else Backdrop */}
                        <img
                            src={content.poster_path}
                            className="w-full h-full object-cover"
                            alt={content.title}
                        />
                        {/* Stronger Gradient for readability */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
                        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black to-transparent" />
                    </div>

                    {/* Content Overlay - Anchored to Bottom */}
                    <div className="relative z-10 mt-auto p-5 pb-8 flex flex-col gap-4">
                        {/* Title & Metadata */}
                        <div>
                            <h2 className="text-3xl font-black mb-2 text-white leading-tight drop-shadow-xl">{content.title}</h2>
                            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-gray-300">
                                <span className="text-green-400 font-bold">{(content.vote_average * 10).toFixed(0)}% Match</span>
                                <span>•</span>
                                <span>{content.release_date?.split('-')[0] || '2024'}</span>
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
                            {(content.movieDriveId || content.movieYoutubeId) ? (
                                <button
                                    onClick={() => { onPlay(content, 'movie'); onClose(); }}
                                    className="bg-white text-black py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-200 active:scale-95 transition"
                                >
                                    <Play size={18} fill="black" /> Play
                                </button>
                            ) : (
                                <button className="bg-white/20 text-white/50 py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 cursor-not-allowed">
                                    Coming Soon
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
                                const shareUrl = `${window.location.origin}/watch/${content.id}`;
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
                            <div className="flex flex-col items-center gap-1 cursor-pointer active:scale-90 transition" onClick={() => {
                                if (content.allowDownload && content.movieDriveId) {
                                    window.open(`https://drive.google.com/uc?id=${content.movieDriveId}&export=download`, '_blank');
                                } else {
                                    alert('Download not available for this content');
                                }
                            }}>
                                <Download size={20} className={content.allowDownload ? "text-white" : "text-gray-600"} />
                                <span className="text-[10px] text-gray-400">Download</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- Desktop: Existing Layout --- */}
                <div className="hidden md:flex flex-col h-full bg-[#181818]">
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
                                {(content.movieDriveId || content.movieYoutubeId) && (
                                    <button
                                        onClick={() => { onPlay(content, 'movie'); onClose(); }}
                                        className="bg-white text-black px-8 py-3 rounded font-bold text-lg flex items-center gap-2 hover:bg-gray-200 transition-transform active:scale-95"
                                    >
                                        <Play size={24} fill="black" /> Play Movie
                                    </button>
                                )}

                                {content.youtubeId && (
                                    <button
                                        onClick={() => { onPlay(content, 'trailer'); onClose(); }}
                                        className={`px-8 py-3 rounded font-bold text-lg flex items-center gap-2 transition-transform active:scale-95 ${!(content.movieDriveId || content.movieYoutubeId) ? 'bg-white text-black hover:bg-gray-200' : 'bg-gray-600/60 hover:bg-gray-600 text-white'}`}
                                    >
                                        <Play size={24} fill={(content.movieDriveId || content.movieYoutubeId) ? "white" : "black"} /> {(content.movieDriveId || content.movieYoutubeId) ? 'Trailer' : 'Play'}
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
                                        const shareUrl = `${window.location.origin}/watch/${content.id}`;
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
                                    onClick={() => {
                                        if (content.allowDownload && content.movieDriveId) {
                                            window.open(`https://drive.google.com/uc?id=${content.movieDriveId}&export=download`, '_blank');
                                        } else {
                                            alert('Download not available for this content');
                                        }
                                    }}
                                    className={`backdrop-blur-md p-3 rounded-full border transition ${content.allowDownload ? 'bg-gray-600/40 border-white/20 hover:border-white' : 'bg-gray-800/40 border-gray-700 cursor-not-allowed'}`}
                                    title="Download"
                                >
                                    <Download size={24} className={content.allowDownload ? 'text-white' : 'text-gray-600'} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 md:p-12 overflow-y-auto no-scrollbar flex-1">
                        <div className="grid grid-cols-[1fr_300px] gap-12">
                            <div className="space-y-6">
                                <div className="flex flex-wrap items-center gap-3 text-lg font-medium">
                                    <span className="text-green-400 font-bold">{(content.vote_average * 10).toFixed(0)}% Match</span>
                                    <span className="text-gray-400">{content.release_date?.split('-')[0]}</span>
                                    <span className="border border-gray-600 px-2 py-0.5 rounded text-xs">{content.rating || 'U/A 13+'}</span>
                                    <span className="text-gray-400">{content.duration}</span>
                                    <span className="border border-white/30 px-1.5 rounded text-[10px] font-black tracking-tighter">{content.resolution || 'HD'}</span>
                                </div>
                                <p className="text-xl leading-relaxed text-gray-200">{content.overview}</p>
                            </div>
                            <div className="space-y-4 text-sm">
                                <div><span className="text-gray-500">Cast: </span><span className="text-gray-300">{content.cast?.join(', ')}</span></div>
                                <div><span className="text-gray-500">Genres: </span><span className="text-gray-300">{content.genres?.join(', ')}</span></div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ContentDetails;