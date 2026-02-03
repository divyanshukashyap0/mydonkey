import React, { useState } from 'react';
import { Plus, Edit, Trash2, Youtube, HardDrive, Star, Check, X, Bell, ChevronDown, ChevronRight, Play, Lock } from 'lucide-react';
import { useStore } from '../../../context/StoreContext';
import { Content, Season, Episode } from '../../../types';
import { doc, setDoc, deleteDoc, updateDoc, collection, addDoc, deleteField } from 'firebase/firestore';
import { db } from '../../../firebase';

const MOVIE_GENRES = ["Action", "Adventure", "Comedy", "Drama", "Horror", "Sci-Fi", "Thriller", "Romance", "Documentary", "Animation"];
const TV_GENRES = ["Drama", "Comedy", "Reality", "Action", "Sci-Fi", "Documentary", "Kids", "Mystery"];

const ContentManager = () => {
    const { content, settings, updateSettings } = useStore();
    const [isEditing, setIsEditing] = useState(false);
    const [filter, setFilter] = useState<'ALL' | 'movie' | 'tv'>('ALL');
    const [formData, setFormData] = useState<Partial<Content>>({});

    // Manage expanded season in UI
    const [expandedSeasonId, setExpandedSeasonId] = useState<string | null>(null);

    // Reset Form
    const resetForm = () => {
        setFormData({
            type: 'movie',
            genres: [],
            isPublished: false,
            allowDownload: true,
            allowPlayback: true,
            comingSoon: false,
            vote_average: 0,
            seasons: []
        });
        setIsEditing(false);
        setExpandedSeasonId(null);
    };

    // ID Extractors
    const extractYoutubeId = (url: string) => {
        if (!url) return '';
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : url;
    };

    const extractDriveId = (url: string) => {
        if (!url) return '';
        const regExp = /[-\w]{25,}/;
        const match = url.match(regExp);
        return match ? match[0] : url;
    };

    // --- Season & Episode Handlers ---
    const addSeason = () => {
        const newSeason: Season = {
            id: `season_${Date.now()}`,
            seasonNumber: (formData.seasons?.length || 0) + 1,
            title: `Season ${(formData.seasons?.length || 0) + 1}`,
            episodes: []
        };
        setFormData(prev => ({ ...prev, seasons: [...(prev.seasons || []), newSeason] }));
    };

    const deleteSeason = (seasonId: string) => {
        if (confirm("Delete this season?")) {
            setFormData(prev => ({ ...prev, seasons: prev.seasons?.filter(s => s.id !== seasonId) }));
        }
    };

    const updateSeason = (seasonId: string, updates: Partial<Season>) => {
        setFormData(prev => ({
            ...prev,
            seasons: prev.seasons?.map(s => s.id === seasonId ? { ...s, ...updates } : s)
        }));
    };

    const addEpisode = (seasonId: string) => {
        const season = formData.seasons?.find(s => s.id === seasonId);
        if (!season) return;

        const newEpisode: Episode = {
            id: `ep_${Date.now()}`,
            episodeNumber: (season.episodes.length || 0) + 1,
            title: `Episode ${(season.episodes.length || 0) + 1}`,
            driveId: '',
            duration: '45m'
        };

        const updatedSeason = { ...season, episodes: [...season.episodes, newEpisode] };
        updateSeason(seasonId, { episodes: updatedSeason.episodes });
    };

    const updateEpisode = (seasonId: string, episodeId: string, updates: Partial<Episode>) => {
        setFormData(prev => ({
            ...prev,
            seasons: prev.seasons?.map(s => {
                if (s.id !== seasonId) return s;
                return {
                    ...s,
                    episodes: s.episodes.map(e => e.id === episodeId ? { ...e, ...updates } : e)
                };
            })
        }));
    };

    const deleteEpisode = (seasonId: string, episodeId: string) => {
        setFormData(prev => ({
            ...prev,
            seasons: prev.seasons?.map(s => {
                if (s.id !== seasonId) return s;
                return { ...s, episodes: s.episodes.filter(e => e.id !== episodeId) };
            })
        }));
    };


    const handleSave = async () => {
        if (!formData.title || !formData.poster_path) {
            alert("Title and Poster are required");
            return;
        }

        try {
            const id = formData.id || `content_${Date.now()}`;
            const now = new Date().toISOString();

            // Clean Data
            const finalData: Content = {
                id,
                title: formData.title,
                overview: formData.overview || '',
                poster_path: formData.poster_path,
                backdrop_path: formData.backdrop_path || formData.poster_path,
                youtubeId: extractYoutubeId(formData.youtubeId || ''),
                movieDriveId: formData.type === 'movie' ? extractDriveId(formData.movieDriveId || '') : undefined,
                movieYoutubeId: formData.type === 'movie' ? extractYoutubeId(formData.movieYoutubeId || '') : undefined,
                type: formData.type || 'movie',
                genres: formData.genres || [],
                release_date: formData.release_date || now.split('T')[0],
                vote_average: Number(formData.vote_average) || 0,
                isPublished: formData.isPublished || false,
                allowDownload: formData.allowDownload ?? true,
                allowPlayback: formData.allowPlayback ?? true,
                cast: typeof formData.cast === 'string' ? (formData.cast as string).split(',').map(s => s.trim()) : (formData.cast || []),
                tags: typeof formData.tags === 'string' ? (formData.tags as string).split(',').map(s => s.trim()) : (formData.tags || []),
                comingSoon: formData.comingSoon || false,
                createdAt: formData.createdAt || now,
                featured: formData.featured || false,
                accessCode: formData.accessCode || undefined,
                // Sanitize Seasons/Episodes
                seasons: formData.type === 'tv' ? (formData.seasons || []).map(s => ({
                    ...s,
                    trailerYoutubeId: extractYoutubeId(s.trailerYoutubeId || ''),
                    episodes: s.episodes.map(e => ({
                        ...e,
                        driveId: extractDriveId(e.driveId || '')
                    }))
                })) : []
            };

            // Sanitize data (remove undefined fields which Firestore hates)
            const dataToSave = JSON.parse(JSON.stringify(finalData));
            await setDoc(doc(db, 'content', id), dataToSave);

            // Notification for new content
            if (!formData.id && finalData.isPublished) {
                await addDoc(collection(db, 'notifications'), {
                    title: `New Arrival: ${finalData.title}`,
                    message: `Watch ${finalData.title} now on My Donkey!`,
                    image: finalData.poster_path,
                    type: 'content',
                    link: `/browse/${id}`,
                    createdAt: now,
                    read: false
                });
            }

            alert("Content saved successfully!");
            resetForm();
        } catch (e: any) {
            console.error(e);
            alert("Error saving content: " + e.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this content?")) {
            await deleteDoc(doc(db, 'content', id));
        }
    };

    const toggleHero = async (id: string) => {
        if (settings.heroContentId === id) {
            await updateSettings({ heroContentId: deleteField() as any });
        } else {
            await updateSettings({ heroContentId: id });
        }
    };

    const filteredContent = filter === 'ALL' ? content : content.filter(c => c.type === filter);

    if (isEditing) {
        return (
            <div className="bg-[#141414] p-6 rounded-xl border border-white/5 animate-in fade-in max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">{formData.id ? 'Edit Content' : 'Add New Content'}</h2>
                    <button onClick={resetForm} className="p-2 hover:bg-white/10 rounded"><X /></button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs text-gray-500 uppercase font-bold">Title</label>
                            <input className="w-full bg-black/50 border border-white/10 rounded p-2 outline-none focus:border-red-600"
                                value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 uppercase font-bold">Overview</label>
                            <textarea className="w-full bg-black/50 border border-white/10 rounded p-2 outline-none focus:border-red-600 h-24"
                                value={formData.overview || ''} onChange={e => setFormData({ ...formData, overview: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-gray-500 uppercase font-bold">Type</label>
                                <select className="w-full bg-black/50 border border-white/10 rounded p-2 outline-none"
                                    value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value as 'movie' | 'tv' })}>
                                    <option value="movie">Movie</option>
                                    <option value="tv">TV Series</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 uppercase font-bold">Release Date</label>
                                <input type="date" className="w-full bg-black/50 border border-white/10 rounded p-2 outline-none"
                                    value={formData.release_date || ''} onChange={e => setFormData({ ...formData, release_date: e.target.value })} />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 uppercase font-bold">Cast (comma separated)</label>
                            <input className="w-full bg-black/50 border border-white/10 rounded p-2 outline-none"
                                value={Array.isArray(formData.cast) ? formData.cast.join(', ') : formData.cast || ''}
                                onChange={e => setFormData({ ...formData, cast: e.target.value as any })} />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 uppercase font-bold">Tags (comma separated)</label>
                            <input className="w-full bg-black/50 border border-white/10 rounded p-2 outline-none"
                                value={Array.isArray(formData.tags) ? formData.tags.join(', ') : formData.tags || ''}
                                onChange={e => setFormData({ ...formData, tags: e.target.value as any })} />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-gray-500 uppercase font-bold">Poster URL</label>
                                <input className="w-full bg-black/50 border border-white/10 rounded p-2 outline-none"
                                    value={formData.poster_path || ''} onChange={e => setFormData({ ...formData, poster_path: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 uppercase font-bold">Backdrop URL</label>
                                <input className="w-full bg-black/50 border border-white/10 rounded p-2 outline-none"
                                    value={formData.backdrop_path || ''} onChange={e => setFormData({ ...formData, backdrop_path: e.target.value })} />
                            </div>
                        </div>

                        {/* Common Youtube (Trailer for Movie, Main Trailer for TV) */}
                        <div>
                            <label className="text-xs text-gray-500 uppercase font-bold flex items-center gap-2"><Youtube size={14} /> {formData.type === 'movie' ? 'Trailer YouTube ID' : 'Series Trailer ID'}</label>
                            <input className="w-full bg-black/50 border border-white/10 rounded p-2 outline-none"
                                value={formData.youtubeId || ''} onChange={e => setFormData({ ...formData, youtubeId: e.target.value })}
                                placeholder="Link or ID" />
                        </div>

                        {/* Movie Specific - Smart Source Input */}
                        {formData.type === 'movie' && (
                            <div>
                                <label className="text-xs text-gray-500 uppercase font-bold flex items-center gap-2">Movie Source (Drive or YouTube)</label>
                                <input className="w-full bg-black/50 border border-white/10 rounded p-2 outline-none"
                                    value={formData.movieDriveId || formData.movieYoutubeId || ''}
                                    onChange={e => {
                                        const val = e.target.value;
                                        if (extractYoutubeId(val).length === 11) {
                                            setFormData({ ...formData, movieYoutubeId: val, movieDriveId: '' });
                                        } else {
                                            setFormData({ ...formData, movieDriveId: val, movieYoutubeId: '' });
                                        }
                                    }}
                                    placeholder="Paste Drive Link or YouTube Link" />
                            </div>
                        )}

                        {/* Video Preview */}
                        {(extractYoutubeId(formData.youtubeId || '').length === 11 || (formData.movieYoutubeId && extractYoutubeId(formData.movieYoutubeId).length === 11) || (formData.movieDriveId && extractDriveId(formData.movieDriveId))) && (
                            <div className="mt-4 bg-black/50 rounded-lg p-2 border border-white/10 h-40 overflow-hidden relative">
                                <div className="absolute top-2 left-2 bg-black/60 px-2 py-1 rounded text-xs text-white z-10">
                                    {formData.movieDriveId ? 'Drive Source' : formData.movieYoutubeId ? 'YouTube Movie' : 'Trailer'}
                                </div>
                                {formData.movieDriveId ? (
                                    <iframe className="w-full h-full rounded" src={`https://drive.google.com/file/d/${extractDriveId(formData.movieDriveId)}/preview`} title="Preview" allowFullScreen />
                                ) : (
                                    <iframe className="w-full h-full rounded" src={`https://www.youtube.com/embed/${extractYoutubeId(formData.movieYoutubeId || formData.youtubeId || '')}`} title="Preview" allowFullScreen />
                                )}
                            </div>
                        )}

                        <div>
                            <label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Genres</label>
                            <div className="flex flex-wrap gap-2">
                                {(formData.type === 'movie' ? MOVIE_GENRES : TV_GENRES).map(g => (
                                    <button key={g}
                                        onClick={() => {
                                            const current = formData.genres || [];
                                            const newGenres = current.includes(g) ? current.filter(x => x !== g) : [...current, g];
                                            setFormData({ ...formData, genres: newGenres });
                                        }}
                                        className={`px-3 py-1 rounded-full text-xs font-bold border ${formData.genres?.includes(g) ? 'bg-white text-black border-white' : 'border-gray-700 text-gray-400'}`}>
                                        {g}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="text-xs text-gray-500 uppercase font-bold flex items-center gap-2 mb-1">
                                <Lock size={14} /> Restricted Access Code
                            </label>
                            <input
                                className="w-full bg-black/50 border border-white/10 rounded p-2 outline-none focus:border-red-600 placeholder:text-gray-700 font-mono"
                                value={formData.accessCode || ''}
                                onChange={e => setFormData({ ...formData, accessCode: e.target.value })}
                                placeholder="Leave empty for public content"
                            />
                            <p className="text-[10px] text-gray-500 mt-1">If set, this content will be hidden until the code is entered.</p>
                        </div>

                        <div className="flex gap-4 pt-2">
                            <button onClick={() => setFormData({ ...formData, isPublished: !formData.isPublished })}
                                className={`flex-1 py-2 rounded font-bold border ${formData.isPublished ? 'bg-green-600/20 text-green-400 border-green-600' : 'bg-gray-800 text-gray-400 border-gray-600'}`}>
                                {formData.isPublished ? 'Published' : 'Draft'}
                            </button>
                            <button onClick={() => setFormData({ ...formData, comingSoon: !formData.comingSoon })}
                                className={`flex-1 py-2 rounded font-bold border ${formData.comingSoon ? 'bg-blue-600/20 text-blue-400 border-blue-600' : 'bg-gray-800 text-gray-400 border-gray-600'}`}>
                                {formData.comingSoon ? 'Coming Soon' : 'Released'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Seasons & Episodes Manager */}
                {formData.type === 'tv' && (
                    <div className="mt-8 border-t border-white/10 pt-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold">Seasons & Episodes</h3>
                            <button onClick={addSeason} className="text-xs flex items-center gap-1 bg-white/10 hover:bg-white/20 px-3 py-1 rounded">
                                <Plus size={14} /> Add Season
                            </button>
                        </div>

                        <div className="space-y-4">
                            {formData.seasons?.map((season, seasonIdx) => (
                                <div key={season.id} className="bg-black/40 border border-white/5 rounded-lg overflow-hidden">
                                    <div
                                        className="flex items-center justify-between p-4 bg-white/5 cursor-pointer hover:bg-white/10"
                                        onClick={() => setExpandedSeasonId(expandedSeasonId === season.id ? null : season.id)}
                                    >
                                        <div className="flex items-center gap-4">
                                            {expandedSeasonId === season.id ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                            <span className="font-bold">{season.title}</span>
                                            <span className="text-xs text-gray-500">{season.episodes.length} Episodes</span>
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); deleteSeason(season.id); }} className="text-red-500 hover:text-red-400 p-1">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    {expandedSeasonId === season.id && (
                                        <div className="p-4 space-y-4 animate-in slide-in-from-top-2">
                                            {/* Season Details */}
                                            <div className="grid grid-cols-2 gap-4 mb-4">
                                                <input value={season.title} onChange={e => updateSeason(season.id, { title: e.target.value })}
                                                    className="bg-black/50 border border-white/10 rounded p-2 text-sm" placeholder="Season Title" />
                                                <input value={season.trailerYoutubeId || ''} onChange={e => updateSeason(season.id, { trailerYoutubeId: e.target.value })}
                                                    className="bg-black/50 border border-white/10 rounded p-2 text-sm" placeholder="Season Trailer (YouTube ID)" />
                                            </div>

                                            {/* Episodes List */}
                                            <div className="space-y-2 pl-4 border-l-2 border-white/10">
                                                {season.episodes.map((ep, epIdx) => (
                                                    <div key={ep.id} className="grid grid-cols-1 md:grid-cols-[auto_1fr_1fr_1fr_auto] gap-2 items-center bg-black/20 p-2 rounded">
                                                        <span className="text-xs font-mono text-gray-500 px-2">{epIdx + 1}</span>
                                                        <input value={ep.title} onChange={e => updateEpisode(season.id, ep.id, { title: e.target.value })}
                                                            className="bg-black/50 border border-white/10 rounded p-1.5 text-sm" placeholder="Ep Title" />

                                                        {/* Smart Episode Source Input */}
                                                        <input
                                                            value={ep.driveId || ep.youtubeId || ''}
                                                            onChange={e => {
                                                                const val = e.target.value;
                                                                if (extractYoutubeId(val).length === 11) {
                                                                    updateEpisode(season.id, ep.id, { youtubeId: val, driveId: '' });
                                                                } else {
                                                                    updateEpisode(season.id, ep.id, { driveId: val, youtubeId: '' });
                                                                }
                                                            }}
                                                            className="bg-black/50 border border-white/10 rounded p-1.5 text-sm font-mono placeholder:text-gray-600"
                                                            placeholder="Source (Drive/YT)"
                                                        />

                                                        <input value={ep.duration} onChange={e => updateEpisode(season.id, ep.id, { duration: e.target.value })}
                                                            className="bg-black/50 border border-white/10 rounded p-1.5 text-sm w-20" placeholder="Dur (45m)" />
                                                        <button onClick={() => deleteEpisode(season.id, ep.id)} className="text-red-500 p-1 hover:bg-white/5 rounded">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                ))}
                                                <button onClick={() => addEpisode(season.id)} className="w-full py-2 border border-dashed border-white/20 text-gray-500 hover:text-white hover:border-white/40 rounded text-sm flex items-center justify-center gap-2">
                                                    <Plus size={14} /> Add Episode
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex justify-end gap-4 mt-8 border-t border-white/10 pt-4">
                    <button onClick={resetForm} className="px-6 py-2 rounded text-gray-400 font-bold hover:text-white">Cancel</button>
                    <button onClick={handleSave} className="px-6 py-2 rounded bg-red-600 text-white font-bold hover:bg-red-700">Save Content</button>
                </div>
            </div>
        );
    }

    // ... Render list (unchanged from previous) ...
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold">Content Manager</h2>
                <button onClick={() => { resetForm(); setIsEditing(true); }} className="bg-red-600 px-4 py-2 rounded font-bold flex items-center gap-2 hover:bg-red-700 transition">
                    <Plus size={20} /> Add Content
                </button>
            </div>

            <div className="flex gap-2">
                {['ALL', 'movie', 'tv'].map(type => (
                    <button key={type} onClick={() => setFilter(type as any)}
                        className={`px-4 py-1.5 rounded-full text-sm font-bold border transition ${filter === type ? 'bg-white text-black border-white' : 'border-gray-700 text-gray-400 hover:border-gray-500'}`}>
                        {type.toUpperCase()}
                    </button>
                ))}
            </div>

            <div className="bg-[#141414] rounded-xl border border-white/5 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-white/5 text-gray-400 font-bold uppercase text-xs">
                        <tr>
                            <th className="p-4">Title</th>
                            <th className="p-4">Type</th>
                            <th className="p-4 text-center">Hero</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {filteredContent.map(item => (
                            <tr key={item.id} className="hover:bg-white/5 transition">
                                <td className="p-4 flex items-center gap-3">
                                    <img src={item.poster_path} className="w-10 h-14 object-cover rounded" />
                                    <div>
                                        <div className="font-bold text-white">{item.title}</div>
                                        <div className="text-[10px] text-gray-500">{item.release_date}</div>
                                    </div>
                                </td>
                                <td className="p-4"><span className="px-2 py-0.5 rounded bg-white/10 text-xs font-bold uppercase">{item.type}</span></td>
                                <td className="p-4 text-center">
                                    <button onClick={() => toggleHero(item.id)} className={`transition ${settings.heroContentId === item.id ? 'text-yellow-400' : 'text-gray-600 hover:text-gray-400'}`}>
                                        <Star size={20} fill={settings.heroContentId === item.id ? "currentColor" : "none"} />
                                    </button>
                                </td>
                                <td className="p-4">
                                    <span className={`font-bold text-xs ${item.isPublished ? 'text-green-400' : 'text-gray-500'}`}>
                                        {item.isPublished ? 'PUBLISHED' : 'DRAFT'}
                                    </span>
                                </td>
                                <td className="p-4 text-right space-x-2">
                                    <button onClick={() => { setFormData(item); setIsEditing(true); }} className="p-2 hover:bg-white/10 rounded text-blue-400"><Edit size={16} /></button>
                                    <button onClick={() => handleDelete(item.id)} className="p-2 hover:bg-white/10 rounded text-red-500"><Trash2 size={16} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ContentManager;
