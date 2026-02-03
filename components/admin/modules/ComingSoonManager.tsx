import React, { useState } from 'react';
import { Plus, Edit, Trash2, Calendar, Youtube } from 'lucide-react';
import { useStore } from '../../../context/StoreContext';
import { Content } from '../../../types';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../firebase';

const ComingSoonManager = () => {
    const { content } = useStore();
    const comingSoonContent = content.filter(c => c.comingSoon).sort((a, b) => new Date(a.release_date).getTime() - new Date(b.release_date).getTime());

    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<Partial<Content>>({});

    const resetForm = () => {
        setFormData({
            type: 'movie',
            comingSoon: true,
            isPublished: true, // Usually published so users can see it in "Coming Soon" list
            genres: []
        });
        setIsEditing(false);
    };

    const handleSave = async () => {
        if (!formData.title || !formData.release_date) {
            alert("Title and Release Date are required");
            return;
        }

        const id = formData.id || `cs_${Date.now()}`;
        const finalData: Content = {
            ...formData as Content,
            id,
            comingSoon: true,
            createdAt: new Date().toISOString()
        };

        try {
            await setDoc(doc(db, 'content', id), finalData);
            alert("Coming Soon item saved!");
            resetForm();
        } catch (e: any) {
            alert("Error: " + e.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Remove from Coming Soon?")) await deleteDoc(doc(db, 'content', id));
    };

    if (isEditing) {
        return (
            <div className="bg-[#141414] p-6 rounded-xl border border-white/5 animate-in fade-in max-w-2xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">{formData.id ? 'Edit Entry' : 'Add Upcoming Title'}</h2>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-xs text-gray-500 uppercase font-bold">Title</label>
                        <input className="w-full bg-black/50 border border-white/10 rounded p-2 outline-none"
                            value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 uppercase font-bold">Overview</label>
                        <textarea className="w-full bg-black/50 border border-white/10 rounded p-2 outline-none h-20"
                            value={formData.overview || ''} onChange={e => setFormData({ ...formData, overview: e.target.value })} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-gray-500 uppercase font-bold">Release Date</label>
                            <input type="date" className="w-full bg-black/50 border border-white/10 rounded p-2 outline-none"
                                value={formData.release_date || ''} onChange={e => setFormData({ ...formData, release_date: e.target.value })} />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 uppercase font-bold">Trailer (YouTube ID)</label>
                            <input className="w-full bg-black/50 border border-white/10 rounded p-2 outline-none"
                                value={formData.youtubeId || ''} onChange={e => setFormData({ ...formData, youtubeId: e.target.value })} />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs text-gray-500 uppercase font-bold">Poster URL</label>
                        <input className="w-full bg-black/50 border border-white/10 rounded p-2 outline-none"
                            value={formData.poster_path || ''} onChange={e => setFormData({ ...formData, poster_path: e.target.value })} />
                    </div>

                    <div className="flex justify-end gap-4 mt-8 border-t border-white/10 pt-4">
                        <button onClick={resetForm} className="px-6 py-2 rounded text-gray-400 font-bold hover:text-white">Cancel</button>
                        <button onClick={handleSave} className="px-6 py-2 rounded bg-red-600 text-white font-bold hover:bg-red-700">Save</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold">Upcoming Releases</h2>
                <button onClick={() => { resetForm(); setIsEditing(true); }} className="bg-white/10 px-4 py-2 rounded font-bold flex items-center gap-2 hover:bg-white/20 transition text-blue-400">
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
                            <tr key={item.id} className="hover:bg-white/5 transition">
                                <td className="p-4 flex items-center gap-3">
                                    <img src={item.poster_path} className="w-10 h-14 object-cover rounded" />
                                    <span className="font-bold text-white">{item.title}</span>
                                </td>
                                <td className="p-4 font-mono text-yellow-500"><Calendar size={14} className="inline mr-2" />{item.release_date}</td>
                                <td className="p-4">
                                    {item.youtubeId ? <span className="text-green-500 flex items-center gap-1"><Youtube size={14} /> Ready</span> : <span className="text-red-500 text-xs">Missing</span>}
                                </td>
                                <td className="p-4 text-right space-x-2">
                                    <button onClick={() => { setFormData(item); setIsEditing(true); }} className="p-2 hover:bg-white/10 rounded text-blue-400"><Edit size={16} /></button>
                                    <button onClick={() => handleDelete(item.id)} className="p-2 hover:bg-white/10 rounded text-red-500"><Trash2 size={16} /></button>
                                </td>
                            </tr>
                        ))}
                        {comingSoonContent.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-gray-500">No upcoming titles found.</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ComingSoonManager;
