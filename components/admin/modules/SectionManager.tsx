import React, { useState, useMemo } from 'react';
import { Plus, Edit, Trash2, Eye, EyeOff, MoveUp, MoveDown, Check, X, Search, GripVertical, AlertCircle } from 'lucide-react';
import { useStore } from '../../../context/StoreContext';
import { Section, Content } from '../../../types';
import { doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../firebase';

const SCOPES = [
    { id: 'home', label: 'Home Page', icon: '🏠' },
    { id: 'movie', label: 'Movies', icon: '🎬' },
    { id: 'tv', label: 'TV Shows', icon: '📺' },
    { id: 'new', label: 'New & Popular', icon: '🔥' }
];

const TYPES = [
    { id: 'trending', label: 'Trending / Popular', desc: 'Auto-populated based on views' },
    { id: 'genre', label: 'Genre Based', desc: 'Auto-populated from specific genre' },
    { id: 'curated', label: 'Curated Collection', desc: 'Manually select specific titles' },
    { id: 'originals', label: 'Originals', desc: 'Shows content marked as Original' }
];

const MOVIE_GENRES = ["Action", "Adventure", "Comedy", "Drama", "Horror", "Sci-Fi", "Thriller", "Romance", "Documentary", "Animation"];
const TV_GENRES = ["Drama", "Comedy", "Reality", "Action", "Sci-Fi", "Documentary", "Kids", "Mystery"];
const ALL_GENRES = Array.from(new Set([...MOVIE_GENRES, ...TV_GENRES]));

const SectionManager = () => {
    const { sections, content, updateSections, toggleSectionVisibility } = useStore();
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<Partial<Section>>({});

    // Content Picker State
    const [showContentPicker, setShowContentPicker] = useState(false);
    const [pickerSearch, setPickerSearch] = useState('');

    const resetForm = () => {
        setFormData({
            type: 'genre',
            scopes: ['home'],
            enabled: true,
            order: sections.length,
            contentIds: []
        });
        setIsEditing(false);
        setShowContentPicker(false);
    };

    const handleSave = async () => {
        if (!formData.title) return alert("Title required");

        // Validation
        if (formData.type === 'genre' && !formData.genreFilter) return alert("Please select a genre");
        if (formData.type === 'curated' && (!formData.contentIds || formData.contentIds.length === 0)) return alert("Please select at least one title for curated section");

        const id = formData.id || `section_${Date.now()}`;
        const finalData: Section = {
            id,
            title: formData.title,
            order: formData.order || 0,
            type: formData.type as any,
            genreFilter: formData.genreFilter || null,
            contentIds: formData.contentIds || [],
            enabled: formData.enabled ?? true,
            scopes: formData.scopes as any || []
        };

        try {
            await setDoc(doc(db, 'sections', id), finalData);
            alert("Section saved successfully!");
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
            updateSections(sorted);
        }
    };

    // --- Content Picker Logic ---
    const availableContent = useMemo(() => {
        return content.filter(c =>
            c.title.toLowerCase().includes(pickerSearch.toLowerCase()) &&
            !formData.contentIds?.includes(c.id)
        );
    }, [content, pickerSearch, formData.contentIds]);

    const toggleContentSelection = (contentId: string) => {
        const currentIds = formData.contentIds || [];
        setFormData({ ...formData, contentIds: [...currentIds, contentId] });
    };

    const removeContentSelection = (contentId: string) => {
        setFormData({ ...formData, contentIds: formData.contentIds?.filter(id => id !== contentId) });
    };

    // --- Preview Logic ---
    const previewContent = useMemo(() => {
        if (!formData.type) return [];

        let filtered: Content[] = [];
        switch (formData.type) {
            case 'trending':
                filtered = [...content].sort((a, b) => b.vote_average - a.vote_average).slice(0, 10);
                break;
            case 'genre':
                filtered = content.filter(c => c.genres.includes(formData.genreFilter || '')).slice(0, 10);
                break;
            case 'curated':
                filtered = (formData.contentIds || []).map(id => content.find(c => c.id === id)).filter(Boolean) as Content[];
                break;
            case 'originals':
                filtered = content.filter(c => c.isOriginal).slice(0, 10);
                break;
        }
        return filtered;
    }, [formData, content]);

    if (isEditing) {
        return (
            <div className="bg-[#141414] rounded-xl border border-white/5 animate-in fade-in h-[calc(100vh-100px)] flex flex-col">
                <div className="flex justify-between items-center p-6 border-b border-white/5">
                    <h2 className="text-2xl font-bold">{formData.id ? 'Edit Section' : 'Add New Section'}</h2>
                    <button onClick={resetForm} className="p-2 hover:bg-white/10 rounded"><X /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8">
                    {/* Settings Form */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <div>
                                <label className="text-xs text-gray-500 uppercase font-bold mb-1 block">Title</label>
                                <input className="w-full bg-black/50 border border-white/10 rounded p-3 outline-none focus:border-red-600 font-bold text-lg"
                                    value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="e.g. Action Movies"
                                />
                            </div>

                            <div>
                                <label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Population Method</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {TYPES.map(t => (
                                        <button key={t.id}
                                            onClick={() => setFormData({ ...formData, type: t.id as any })}
                                            className={`p-3 rounded-lg border text-left transition ${formData.type === t.id ? 'bg-white/10 border-red-500 ring-1 ring-red-500' : 'bg-black/40 border-white/10 hover:bg-white/5'
                                                }`}
                                        >
                                            <div className="font-bold text-sm">{t.label}</div>
                                            <div className="text-[10px] text-gray-500">{t.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {formData.type === 'genre' && (
                                <div>
                                    <label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Select Genre</label>
                                    <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 bg-black/20 rounded-lg border border-white/5">
                                        {ALL_GENRES.map(g => (
                                            <button key={g}
                                                onClick={() => setFormData({ ...formData, genreFilter: g })}
                                                className={`px-3 py-1 rounded-full text-xs font-bold border transition ${formData.genreFilter === g ? 'bg-white text-black border-white' : 'border-gray-700 text-gray-400 hover:border-gray-500'
                                                    }`}
                                            >
                                                {g}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {formData.type === 'curated' && (
                                <div>
                                    <label className="text-xs text-gray-500 uppercase font-bold mb-2 block">
                                        Selected Content ({formData.contentIds?.length || 0})
                                    </label>
                                    <div className="space-y-2 mb-4">
                                        {formData.contentIds?.map(id => {
                                            const item = content.find(c => c.id === id);
                                            if (!item) return null;
                                            return (
                                                <div key={id} className="flex items-center gap-3 bg-white/5 p-2 rounded border border-white/5">
                                                    <img src={item.poster_path} className="w-8 h-12 object-cover rounded" alt="" />
                                                    <span className="flex-1 text-sm font-medium">{item.title}</span>
                                                    <button onClick={() => removeContentSelection(id)} className="p-1 hover:bg-white/10 rounded text-gray-500 hover:text-red-500">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                        {(!formData.contentIds || formData.contentIds.length === 0) && (
                                            <div className="text-center py-4 bg-white/5 rounded border border-dashed border-white/10 text-xs text-gray-500">
                                                No content selected
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => setShowContentPicker(true)}
                                        className="w-full py-2 bg-blue-600/20 text-blue-400 border border-blue-600 rounded font-bold hover:bg-blue-600 hover:text-white transition flex items-center justify-center gap-2"
                                    >
                                        <Plus size={16} /> Select Content
                                    </button>
                                </div>
                            )}

                            <div>
                                <label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Appears On</label>
                                <div className="flex flex-wrap gap-2">
                                    {SCOPES.map(scope => (
                                        <button key={scope.id}
                                            onClick={() => {
                                                const current = formData.scopes || [];
                                                const newScopes = current.includes(scope.id as any) ? current.filter(x => x !== scope.id) : [...current, scope.id];
                                                setFormData({ ...formData, scopes: newScopes as any });
                                            }}
                                            className={`px-3 py-2 rounded-lg text-xs font-bold border flex items-center gap-2 transition ${formData.scopes?.includes(scope.id as any)
                                                    ? 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-900/50'
                                                    : 'bg-black/40 border-gray-700 text-gray-400 hover:bg-white/5'
                                                }`}
                                        >
                                            <span>{scope.icon}</span>
                                            {scope.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Live Preview */}
                        <div className="bg-black/30 rounded-xl overflow-hidden border border-white/10 flex flex-col">
                            <div className="bg-white/5 px-4 py-2 border-b border-white/5 flex items-center gap-2">
                                <Eye size={14} className="text-green-400" />
                                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Live Preview</span>
                            </div>
                            <div className="p-4 flex-1 overflow-y-auto">
                                <h3 className="text-lg font-bold text-white mb-4">{formData.title || 'Section Title'}</h3>
                                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                                    {previewContent.length > 0 ? previewContent.map(item => (
                                        <div key={item.id} className="min-w-[120px] w-[120px] aspect-[2/3] bg-gray-800 rounded-lg overflow-hidden relative group">
                                            <img src={item.poster_path} className="w-full h-full object-cover" alt="" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                                                <span className="text-[10px] font-bold text-white leading-tight">{item.title}</span>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="w-full py-10 flex flex-col items-center justify-center text-gray-600 gap-2">
                                            <AlertCircle size={32} />
                                            <span className="text-xs">No matching content found</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-4 p-6 border-t border-white/5 bg-[#141414]">
                    <button onClick={resetForm} className="px-6 py-2 rounded text-gray-400 font-bold hover:text-white">Cancel</button>
                    <button onClick={handleSave} className="px-6 py-2 rounded bg-red-600 text-white font-bold hover:bg-red-700 shadow-lg shadow-red-600/20">Save Section</button>
                </div>

                {/* Content Picker Modal */}
                {showContentPicker && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                        <div className="bg-[#181818] border border-white/10 rounded-xl w-full max-w-lg h-[80vh] flex flex-col shadow-2xl animate-in zoom-in-95">
                            <div className="p-4 border-b border-white/10 flex justify-between items-center">
                                <h3 className="font-bold text-lg">Select Content</h3>
                                <button onClick={() => setShowContentPicker(false)}><X size={20} /></button>
                            </div>
                            <div className="p-4 border-b border-white/10">
                                <div className="relative">
                                    <Search className="absolute left-3 top-2.5 text-gray-500" size={16} />
                                    <input
                                        className="w-full bg-black/50 border border-white/10 rounded pl-10 pr-4 py-2 outline-none focus:border-blue-500"
                                        placeholder="Search library..."
                                        value={pickerSearch}
                                        onChange={e => setPickerSearch(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2">
                                <div className="space-y-1">
                                    {availableContent.map(item => (
                                        <button
                                            key={item.id}
                                            onClick={() => {
                                                toggleContentSelection(item.id);
                                                setPickerSearch(''); // Clear search for next pick
                                            }}
                                            className="w-full flex items-center gap-3 p-2 hover:bg-white/10 rounded transition text-left group"
                                        >
                                            <img src={item.poster_path} className="w-10 h-14 object-cover rounded bg-gray-800" alt="" />
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-sm truncate text-gray-200 group-hover:text-white">{item.title}</div>
                                                <div className="text-[10px] text-gray-500">{item.release_date.split('-')[0]} • {item.type}</div>
                                            </div>
                                            <Plus size={16} className="text-gray-500 group-hover:text-green-500" />
                                        </button>
                                    ))}
                                    {availableContent.length === 0 && (
                                        <div className="text-center py-8 text-gray-500 text-sm">No content found</div>
                                    )}
                                </div>
                            </div>
                            <div className="p-3 border-t border-white/10 text-center">
                                <button onClick={() => setShowContentPicker(false)} className="text-sm font-bold text-blue-500 hover:text-blue-400">
                                    Done
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl pb-20">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold">Sections & Layout</h2>
                    <p className="text-gray-400 mt-1">Manage what your users see on the home page.</p>
                </div>
                <button onClick={() => { resetForm(); setIsEditing(true); }} className="bg-red-600 px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:bg-red-700 transition shadow-lg shadow-red-600/20">
                    <Plus size={20} /> Add Section
                </button>
            </div>

            <div className="grid gap-4">
                {sections.map((section, index) => (
                    <div key={section.id} className="bg-[#141414] p-4 rounded-xl border border-white/5 flex items-center gap-4 group hover:border-white/20 transition hover:shadow-lg">
                        <div className="flex flex-col gap-1 text-gray-500">
                            <button onClick={() => moveSection(index, 'up')} disabled={index === 0} className="p-1 hover:bg-white/10 rounded disabled:opacity-20 hover:text-white"><MoveUp size={16} /></button>
                            <button onClick={() => moveSection(index, 'down')} disabled={index === sections.length - 1} className="p-1 hover:bg-white/10 rounded disabled:opacity-20 hover:text-white"><MoveDown size={16} /></button>
                        </div>

                        <div className="p-2 bg-black/40 rounded-lg text-gray-500">
                            <GripVertical size={20} />
                        </div>

                        <div className="flex-1 cursor-pointer" onClick={() => { setFormData(section); setIsEditing(true); }}>
                            <div className="font-bold text-lg flex items-center gap-2 group-hover:text-blue-400 transition-colors">
                                {section.title}
                            </div>
                            <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                                <span className="capitalize bg-white/5 px-2 py-0.5 rounded border border-white/5">{TYPES.find(t => t.id === section.type)?.label || section.type}</span>
                                {section.type === 'genre' && <span className="bg-white/5 px-2 py-0.5 rounded border border-white/5">{section.genreFilter}</span>}
                                {section.type === 'curated' && <span className="bg-white/5 px-2 py-0.5 rounded border border-white/5">{section.contentIds?.length || 0} items</span>}
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="hidden md:flex gap-1">
                                {section.scopes.map(scope => (
                                    <span key={scope} title={scope} className="text-xs bg-white/5 w-8 h-8 flex items-center justify-center rounded-full border border-white/5">
                                        {SCOPES.find(s => s.id === scope)?.icon}
                                    </span>
                                ))}
                            </div>

                            <div className="w-px h-8 bg-white/10 mx-2" />

                            <button onClick={() => toggleSectionVisibility(section.id)} className={`p-2 rounded-lg transition ${section.enabled ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`} title={section.enabled ? "Hide Section" : "Show Section"}>
                                {section.enabled ? <Eye size={20} /> : <EyeOff size={20} />}
                            </button>
                            <button onClick={() => handleDelete(section.id)} className="p-2 hover:bg-red-500/10 rounded-lg text-gray-500 hover:text-red-500 transition"><Trash2 size={20} /></button>
                        </div>
                    </div>
                ))}

                {sections.length === 0 && (
                    <div className="text-center py-20 bg-[#141414] rounded-xl border border-dashed border-white/10">
                        <div className="text-gray-500 mb-4">No sections configured</div>
                        <button onClick={() => { resetForm(); setIsEditing(true); }} className="text-blue-500 font-bold hover:underline">Create your first section</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SectionManager;
