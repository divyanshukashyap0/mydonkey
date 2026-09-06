import React, { useState } from 'react';
import { Plus, Edit, Trash2, Calendar, Youtube, Play, HardDrive, X, AlertCircle } from 'lucide-react';
import { useStore } from '../../../context/StoreContext';
import { Content } from '../../../types';
import { doc, setDoc, deleteDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '../../../firebase';

const ComingSoonManager = () => {
    const { content } = useStore();
    // STRICTLY show only content with a future release date
    // This removes any "Coming Soon" items that have already passed their release date
    const comingSoonContent = content
        .filter(c => new Date(c.release_date) > new Date())
        .sort((a, b) => new Date(a.release_date).getTime() - new Date(b.release_date).getTime());

    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<Partial<Content>>({});

    const extractYoutubeId = (url: string) => {
        if (!url) return '';
        const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
        return match ? match[1] : (url.length === 11 ? url : '');
    };

    const resetForm = () => {
        setFormData({
            type: 'movie',
            genres: [],
            isPublished: true,
            comingSoon: true,
            allowPlayback: true,
            allowDownload: false,
        });
        setIsEditing(false);
    };

    const handleSave = async () => {
        if (!formData.title || !formData.release_date) {
            alert('Please provide at least a title and release date.');
            return;
        }
        const cleanYtId = extractYoutubeId(formData.youtubeId || '');
        const data: any = {
            ...formData,
            youtubeId: cleanYtId,
            comingSoon: true,
            isPublished: true,
            updatedAt: new Date().toISOString(),
        };
        try {
            if (formData.id) {
                await setDoc(doc(db, 'content', formData.id), data, { merge: true });
            } else {
                data.createdAt = new Date().toISOString();
                await addDoc(collection(db, 'content'), data);
            }
            resetForm();
        } catch (err) {
            console.error('Error saving coming soon title:', err);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Delete this upcoming title?')) return;
        try {
            await deleteDoc(doc(db, 'content', id));
        } catch (err) {
            console.error('Error deleting title:', err);
        }
    };

    if (isEditing) {
        return (
            <div className="bg-[#141414] p-6 rounded-xl border border-white/5 animate-in fade-in max-w-2xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">{formData.id ? 'Edit Entry' : 'Add Upcoming Title'}</h2>
                    <button onClick={resetForm} className="p-2 hover:bg-white/10 rounded"><X /></button>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="text-xs text-gray-500 uppercase font-bold">Title</label>
                        <input className="w-full bg-black/50 border border-white/10 rounded p-3 outline-none focus:border-blue-500 text-lg font-bold"
                            value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })}
                            placeholder="e.g. Inception 2"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-gray-500 uppercase font-bold">Release Date</label>
                            <input type="date" className="w-full bg-black/50 border border-white/10 rounded p-2 outline-none focus:border-blue-500"
                                value={formData.release_date || ''} onChange={e => setFormData({ ...formData, release_date: e.target.value })} />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 uppercase font-bold">Genres (comma sep)</label>
                            <input className="w-full bg-black/50 border border-white/10 rounded p-2 outline-none"
                                value={formData.genres?.join(', ') || ''}
                                onChange={e => setFormData({ ...formData, genres: e.target.value.split(',').map(s => s.trim()) })}
                                placeholder="Action, Sci-Fi"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs text-gray-500 uppercase font-bold">Overview</label>
                        <textarea className="w-full bg-black/50 border border-white/10 rounded p-2 outline-none h-24 focus:border-blue-500"
                            value={formData.overview || ''} onChange={e => setFormData({ ...formData, overview: e.target.value })}
                            placeholder="Brief description..."
                        />
                    </div>

                    {/* Smart Source Input */}
                    <div>
                        <label className="text-xs text-gray-500 uppercase font-bold flex items-center gap-2">Trailer Source</label>
                        <div className="relative">
                            <input className="w-full bg-black/50 border border-white/10 rounded p-2 pl-8 outline-none focus:border-blue-500"
                                value={formData.youtubeId || ''}
                                onChange={e => setFormData({ ...formData, youtubeId: e.target.value })}
                                placeholder="Paste YouTube Link or ID"
                            />
                            <Youtube className="absolute left-2.5 top-2.5 text-gray-500" size={16} />
                        </div>
                    </div>

                    {/* Preview Player */}
                    {extractYoutubeId(formData.youtubeId || '').length === 11 && (
                        <div className="aspect-video bg-black rounded-lg overflow-hidden border border-white/10">
                            <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${extractYoutubeId(formData.youtubeId || '')}`} title="Preview" allowFullScreen />
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-xs text-gray-500 uppercase font-bold flex items-center gap-2">
                            Poster Image
                        </label>
                        <div className="flex gap-4">
                            <input
                                className="flex-1 bg-black/50 border border-white/10 rounded p-2 outline-none focus:border-blue-500"
                                placeholder="Image URL"
                                value={formData.poster_path || ''}
                                onChange={e => setFormData({ ...formData, poster_path: e.target.value, backdrop_path: e.target.value })}
                            />
                            {formData.poster_path && (
                                <img src={formData.poster_path} className="w-12 h-16 object-cover rounded border border-white/10 bg-gray-800" alt="" />
                            )}
                        </div>
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-white/10">
                        <div className="text-xs text-gray-500">
                            * Notification will be sent if release is within 7 days.
                        </div>
                        <div className="flex gap-3">
                            <button onClick={resetForm} className="px-6 py-2 rounded text-gray-400 font-bold hover:text-white transition">Cancel</button>
                            <button onClick={handleSave} className="px-6 py-2 rounded bg-blue-600 text-white font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-600/20">Save Release</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold">Upcoming Releases</h2>
                    <p className="text-gray-400 mt-1">Manage coming soon content and notify users.</p>
                </div>
                <button onClick={() => { resetForm(); setIsEditing(true); }} className="bg-blue-600 px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700 transition shadow-lg shadow-blue-600/20">
                    <Plus size={20} /> Add Upcoming
                </button>
            </div>

            <div className="bg-[#141414] rounded-xl border border-white/5 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-white/5 text-gray-400 font-bold uppercase text-xs">
                        <tr>
                            <th className="p-4">Content</th>
                            <th className="p-4">Release Date</th>
                            <th className="p-4">Trailer</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {comingSoonContent.map(item => (
                            <tr key={item.id} className="group hover:bg-white/5 transition">
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="relative w-10 h-14 rounded overflow-hidden">
                                            <img 
                                                src={item.poster_path || '/logo.png'} 
                                                className={`w-full h-full ${item.poster_path ? 'object-cover' : 'object-contain p-1'}`} 
                                                alt="" 
                                                onError={(e) => {
                                                    const t = e.currentTarget;
                                                    if (!t.src.endsWith('/logo.png')) {
                                                        t.src = '/logo.png';
                                                        t.className = "w-full h-full object-contain p-1";
                                                    }
                                                }}
                                            />
                                            <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-white text-base">{item.title}</div>
                                            <div className="text-xs text-gray-500">{item.genres?.slice(0, 2).join(', ')}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2 text-yellow-500 font-mono font-bold">
                                        <Calendar size={14} />
                                        {new Date(item.release_date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </div>
                                    <div className="text-[10px] text-gray-500 mt-1">
                                        {Math.ceil((new Date(item.release_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days to go
                                    </div>
                                </td>
                                <td className="p-4">
                                    {item.youtubeId ? (
                                        <a href={`https://youtu.be/${item.youtubeId}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-gray-400 hover:text-red-500 transition">
                                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                                                <Play size={12} fill="currentColor" />
                                            </div>
                                            <span className="text-xs underline decoration-dotted">Watch</span>
                                        </a>
                                    ) : (
                                        <span className="text-red-500 text-xs flex items-center gap-1"><AlertCircle size={12} /> Missing</span>
                                    )}
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => { setFormData(item); setIsEditing(true); }} className="p-2 hover:bg-white/10 rounded text-gray-400 hover:text-white transition"><Edit size={16} /></button>
                                        <button onClick={() => handleDelete(item.id)} className="p-2 hover:bg-red-500/10 rounded text-gray-400 hover:text-red-500 transition"><Trash2 size={16} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {comingSoonContent.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-12 text-center text-gray-500">
                                    <div className="inline-block p-4 rounded-full bg-white/5 mb-3">
                                        <Calendar size={32} className="opacity-50" />
                                    </div>
                                    <div className="font-bold">No upcoming releases</div>
                                    <div className="text-xs mt-1">Add content here to build hype before release.</div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ComingSoonManager;
