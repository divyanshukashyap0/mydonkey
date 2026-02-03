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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
            {/* Backdrop Backdrop Overlay */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal Container */}
            <div className="relative w-full max-w-5xl max-h-[90vh] bg-[#181818] rounded-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500 flex flex-col">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-50 bg-cinema-black/60 p-2 rounded-full hover:bg-white/10 transition"
                >
                    <X size={24} />
                </button>

                {/* Hero Section */}
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
                            {/* Play Movie Button */}
                            {(content.movieDriveId || content.movieYoutubeId) && (
                                <button
                                    onClick={() => { onPlay(content, 'movie'); onClose(); }}
                                    className="bg-white text-black px-8 py-3 rounded font-bold text-lg flex items-center gap-2 hover:bg-gray-200 transition-transform active:scale-95"
                                >
                                    <Play size={24} fill="black" /> Play Movie
                                </button>
                            )}

                            {/* Play Trailer Button */}
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
                            >
                                {isAdded ? <Check size={24} className="text-green-400" /> : <Plus size={24} />}
                            </button>

                            <button className="bg-gray-600/40 backdrop-blur-md p-3 rounded-full border border-white/20 hover:border-white transition">
                                <ThumbsUp size={24} />
                            </button>

                            <div className="ml-auto flex items-center gap-4">
                                <button className="bg-gray-600/40 backdrop-blur-md p-3 rounded-full border border-white/20 hover:border-white transition">
                                    <Volume2 size={24} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Info Section */}
                <div className="p-8 md:p-12 overflow-y-auto no-scrollbar flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-12">

                        <div className="space-y-6">
                            <div className="flex items-center gap-3 text-lg font-medium">
                                <span className="text-green-400 font-bold">{(content.vote_average * 10).toFixed(0)}% Match</span>
                                <span className="text-gray-400">{content.release_date ? content.release_date.split('-')[0] : '2024'}</span>
                                <span className="border border-gray-600 px-2 py-0.5 rounded text-xs">U/A 13+</span>
                                <span className="text-gray-400">2h 15m</span>
                                <span className="border border-white/30 px-1.5 rounded text-[10px] font-black tracking-tighter">4K</span>
                            </div>

                            <p className="text-xl leading-relaxed text-gray-200">
                                {content.overview}
                            </p>
                        </div>

                        <div className="space-y-4 text-sm">
                            <div>
                                <span className="text-gray-500">Cast: </span>
                                <span className="text-gray-300">
                                    {content.cast?.join(', ') || 'N/A'}
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-500">Genres: </span>
                                <span className="text-gray-300">
                                    {(content.genres || []).join(', ')}
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-500">This content is: </span>
                                <span className="text-gray-300">
                                    {content.tags?.join(', ') || 'Vivid, Exciting'}
                                </span>
                            </div>

                            <div className="pt-6 border-t border-white/10 flex flex-col gap-4">
                                <button
                                    onClick={() => {
                                        if (content.allowDownload && content.movieDriveId) {
                                            window.open(`https://drive.google.com/uc?id=${content.movieDriveId}&export=download`, '_blank');
                                        } else {
                                            alert("Download not available for this title.");
                                        }
                                    }}
                                    className={`flex items-center gap-3 transition ${content.allowDownload && content.movieDriveId ? 'text-gray-300 hover:text-white' : 'text-gray-600 cursor-not-allowed'}`}
                                >
                                    <Download size={20} /> <span className="text-base">Download</span>
                                </button>
                                <button
                                    onClick={() => {
                                        const shareData = {
                                            title: content.title,
                                            text: `Watch ${content.title} on My Donkey OTT`,
                                            url: window.location.href // Or specific deep link if available
                                        };
                                        if (navigator.share) {
                                            navigator.share(shareData).catch(console.error);
                                        } else {
                                            navigator.clipboard.writeText(window.location.href);
                                            alert("Link copied to clipboard!");
                                        }
                                    }}
                                    className="flex items-center gap-3 text-gray-300 hover:text-white transition"
                                >
                                    <Share2 size={20} /> <span className="text-base">Share</span>
                                </button>
                            </div>
                        </div>

                    </div>

                    {/* Suggestions / More Like This */}
                    {(() => {
                        const { content: allContent } = useStore();
                        const suggestions = allContent.filter(c =>
                            c.id !== content.id &&
                            (c.genres || []).some(g => (content.genres || []).includes(g))
                        ).slice(0, 6);

                        if (suggestions.length === 0) return null;

                        return (
                            <div className="mt-16 pb-10">
                                <h3 className="text-2xl font-bold mb-6">More Like This</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {suggestions.map(item => (
                                        <div key={item.id} className="bg-[#2f2f2f] rounded-lg overflow-hidden group cursor-pointer border border-transparent hover:border-white/20 transition" onClick={() => { onPlay(item, 'movie'); onClose(); }}>
                                            <div className="aspect-video relative">
                                                <img src={item.poster_path} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                                    <Play size={32} fill="white" />
                                                </div>
                                            </div>
                                            <div className="p-4">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="font-bold line-clamp-1">{item.title}</span>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); toggleWatchlist(item.id); }}
                                                        className="border border-white/40 p-1.5 rounded-full hover:border-white transition"
                                                    >
                                                        {currentProfile?.myList.includes(item.id) ? <Check size={16} /> : <Plus size={16} />}
                                                    </button>
                                                </div>
                                                <p className="text-xs text-gray-400 line-clamp-3">{item.overview}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })()}
                </div>

            </div>
        </div>
    );
};

export default ContentDetails;