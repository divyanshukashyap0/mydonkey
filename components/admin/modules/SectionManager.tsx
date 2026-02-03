import React, { useState } from 'react';
import { Plus, Edit, Trash2, Eye, EyeOff, MoveUp, MoveDown, Check, X } from 'lucide-react';
import { useStore } from '../../../context/StoreContext';
import { Section } from '../../../types';
import { doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../firebase';

const SCOPES = ['home', 'tv', 'movie', 'new'];
const TYPES = ['trending', 'genre', 'curated', 'originals'];

const SectionManager = () => {
    const { sections, updateSections, toggleSectionVisibility } = useStore();
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<Partial<Section>>({});

    const resetForm = () => {
        setFormData({
            type: 'genre',
            scopes: ['home'],
            enabled: true,
            order: sections.length
        });
        setIsEditing(false);
    };

    const handleSave = async () => {
        if (!formData.title) return alert("Title required");

        const id = formData.id || `section_${Date.now()}`;
        const finalData: Section = {
            id,
            title: formData.title,
            order: formData.order || 0,
            type: formData.type as any,
            genreFilter: formData.genreFilter || null,
            contentIds: formData.contentIds || [],
            enabled: formData.enabled || false,
            scopes: formData.scopes as any || []
        };

        try {
            await setDoc(doc(db, 'sections', id), finalData);
            alert("Section saved!");
            resetForm();
        } catch (e: any) {
            alert("Error: " + e.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Delete section?")) await deleteDoc(doc(db, 'sections', id));
    };

    const moveSection = (index: number, direction: 'up' | 'down') => {
        const sorted = [...sections].sort((a, b) => a.order - b.order);
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex >= 0 && targetIndex < sorted.length) {
            [sorted[index], sorted[targetIndex]] = [sorted[targetIndex], sorted[index]];
            sorted.forEach((s, idx) => s.order = idx);
            // Bulk update not ideal here but works for small lists. 
            // In a larger app, we'd batch write. For now, calling updateSections from context is cleaner if it supports it, 
            // but context version might loop. Let's doing batch write logic here manually or use the context helper.
            updateSections(sorted);
        }
    };

    if (isEditing) {
        return (
            <div className="bg-[#141414] p-6 rounded-xl border border-white/5 animate-in fade-in max-w-2xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">{formData.id ? 'Edit Section' : 'Add New Section'}</h2>
                    <button onClick={resetForm} className="p-2 hover:bg-white/10 rounded"><X /></button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-xs text-gray-500 uppercase font-bold">Section Title</label>
                        <input className="w-full bg-black/50 border border-white/10 rounded p-2 outline-none focus:border-red-600"
                            value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-gray-500 uppercase font-bold">Type</label>
                            <select className="w-full bg-black/50 border border-white/10 rounded p-2 outline-none"
                                value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value as any })}>
                                {TYPES.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 uppercase font-bold">Genre Filter (if Genre type)</label>
                            <input className="w-full bg-black/50 border border-white/10 rounded p-2 outline-none"
                                value={formData.genreFilter || ''} onChange={e => setFormData({ ...formData, genreFilter: e.target.value })}
                                disabled={formData.type !== 'genre'} placeholder="e.g. Action" />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Appears On (Scopes)</label>
                        <div className="flex gap-2">
                            {SCOPES.map(scope => (
                                <button key={scope}
                                    onClick={() => {
                                        const current = formData.scopes || [];
                                        const newScopes = current.includes(scope as any) ? current.filter(x => x !== scope) : [...current, scope];
                                        setFormData({ ...formData, scopes: newScopes as any });
                                    }}
                                    className={`px-3 py-1 rounded text-xs font-bold border capitalize ${formData.scopes?.includes(scope as any) ? 'bg-red-600 border-red-600 text-white' : 'border-gray-700 text-gray-400'}`}>
                                    {scope}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-4 mt-8 border-t border-white/10 pt-4">
                        <button onClick={resetForm} className="px-6 py-2 rounded text-gray-400 font-bold hover:text-white">Cancel</button>
                        <button onClick={handleSave} className="px-6 py-2 rounded bg-red-600 text-white font-bold hover:bg-red-700">Save Section</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold">Sections & Layout</h2>
                <button onClick={() => { resetForm(); setIsEditing(true); }} className="bg-red-600 px-4 py-2 rounded font-bold flex items-center gap-2 hover:bg-red-700 transition">
                    <Plus size={20} /> Add Section
                </button>
            </div>

            <p className="text-gray-400">Reorder sections to change how they appear on the homepage and category pages.</p>

            <div className="space-y-3">
                {sections.map((section, index) => (
                    <div key={section.id} className="bg-[#141414] p-4 rounded-lg border border-white/5 flex items-center gap-4 group hover:border-white/20 transition">
                        <div className="flex flex-col gap-1">
                            <button onClick={() => moveSection(index, 'up')} disabled={index === 0} className="p-1 hover:bg-white/10 rounded disabled:opacity-30"><MoveUp size={16} /></button>
                            <button onClick={() => moveSection(index, 'down')} disabled={index === sections.length - 1} className="p-1 hover:bg-white/10 rounded disabled:opacity-30"><MoveDown size={16} /></button>
                        </div>

                        <div className="flex-1 cursor-pointer" onClick={() => { setFormData(section); setIsEditing(true); }}>
                            <div className="font-bold text-lg flex items-center gap-2">
                                {section.title}
                                <span className="text-[10px] bg-white/10 text-gray-400 px-1.5 py-0.5 rounded uppercase font-bold">{section.type}</span>
                            </div>
                            <div className="flex gap-2 mt-1">
                                {section.scopes.map(scope => (
                                    <span key={scope} className="text-[10px] bg-brand-red/20 text-brand-red px-1.5 py-0.5 rounded border border-brand-red/30 uppercase font-black">{scope}</span>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 mr-4">
                                <span className={`text-xs font-bold px-2 py-0.5 rounded ${section.enabled ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                                    {section.enabled ? 'LIVE' : 'HIDDEN'}
                                </span>
                            </div>
                            <button onClick={() => toggleSectionVisibility(section.id)} className="p-2 hover:bg-white/10 rounded">
                                {section.enabled ? <Eye size={20} className="text-blue-400" /> : <EyeOff size={20} className="text-gray-500" />}
                            </button>
                            <button onClick={() => handleDelete(section.id)} className="p-2 hover:bg-white/10 rounded text-red-500"><Trash2 size={20} /></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SectionManager;
