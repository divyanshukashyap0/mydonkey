import React, { useState } from 'react';
import { useStore } from '../../../context/StoreContext';
import { Page } from '../../../types';
import { footerContent } from '../../../footerContent';
import { Plus, Trash2, Edit2, ChevronDown, ChevronUp, Save, X, Layout, Database } from 'lucide-react';

const PagesManager = () => {
    const { pages, addPage, updatePage, deletePage } = useStore();
    const [editingPage, setEditingPage] = useState<Page | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    // Form State
    const [formData, setFormData] = useState<Partial<Page>>({});

    const handleEdit = (page: Page) => {
        setEditingPage(page);
        setFormData(page);
        setIsCreating(false);
    };

    const handleCreate = () => {
        setEditingPage(null);
        setFormData({
            id: '',
            title: '',
            category: 'Company',
            description: '',
            sections: []
        });
        setIsCreating(true);
    };

    const handleSeed = async () => {
        if (!confirm("This will overwrite/add default pages. Continue?")) return;

        const categories: Record<string, string[]> = {
            'Company': ['About Us', 'Careers', 'Press', 'Blog', 'Investors'],
            'Support': ['Help Center', 'Supported Devices', 'Contact Us', 'Activate Device'],
            'Legal': ['Terms of Use', 'Privacy Policy', 'Cookie Preferences', 'Corporate Information'],
            'Connect': ['Ways to Watch', 'Speed Test', 'Request a Movie']
        };

        try {
            for (const [cat, titles] of Object.entries(categories)) {
                for (const title of titles) {
                    const data = footerContent[title];
                    if (data) {
                        const id = title.toLowerCase().replace(/\s+/g, '-');

                        // Check if exists to avoid overwriting if not desired, 
                        // but here we just upsert via addPage (which uses setDoc so it overwrites).
                        await addPage({
                            id,
                            title: title, // Use the Link Label as the Page Title for consistency
                            category: cat as any,
                            description: data.description,
                            sections: data.sections,
                            lastUpdated: new Date().toDateString()
                        });
                    }
                }
            }
            alert("Pages seeded successfully!");
        } catch (e) {
            alert("Error seeding pages: " + e);
        }
    };

    const handleSave = async () => {
        if (!formData.id || !formData.title) return alert("ID and Title are required");

        try {
            if (isCreating) {
                // Ensure ID is URL safe
                const slug = formData.id.toLowerCase().replace(/\s+/g, '-');
                await addPage({
                    ...formData,
                    id: slug,
                    lastUpdated: new Date().toDateString()
                } as Page);
            } else {
                await updatePage(formData.id!, {
                    ...formData,
                    lastUpdated: new Date().toDateString()
                });
            }
            setEditingPage(null);
            setIsCreating(false);
        } catch (e) {
            alert("Error saving page: " + e);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this page?")) {
            await deletePage(id);
        }
    };

    const addSection = () => {
        const newSections = [...(formData.sections || []), { heading: 'New Section', content: '' }];
        setFormData({ ...formData, sections: newSections });
    };

    const updateSection = (idx: number, field: string, value: any) => {
        const newSections = [...(formData.sections || [])];
        newSections[idx] = { ...newSections[idx], [field]: value };
        setFormData({ ...formData, sections: newSections });
    };

    const removeSection = (idx: number) => {
        const newSections = [...(formData.sections || [])];
        newSections.splice(idx, 1);
        setFormData({ ...formData, sections: newSections });
    };

    // Group pages by category
    const categories = ['Company', 'Support', 'Legal', 'Connect'] as const;

    if (isCreating || editingPage) {
        return (
            <div className="max-w-4xl mx-auto animate-in fade-in">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-bold">{isCreating ? 'Create New Page' : 'Edit Page'}</h2>
                    <div className="flex gap-4">
                        <button onClick={() => { setIsCreating(false); setEditingPage(null); }} className="px-4 py-2 bg-white/10 rounded hover:bg-white/20">Cancel</button>
                        <button onClick={handleSave} className="px-6 py-2 bg-brand-red rounded font-bold hover:bg-red-700 flex items-center gap-2">
                            <Save size={18} /> Save Page
                        </button>
                    </div>
                </div>

                <div className="space-y-6 bg-[#141414] p-8 rounded-xl border border-white/5">
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs uppercase text-gray-500 font-bold mb-2">Page Title</label>
                            <input
                                type="text"
                                value={formData.title || ''}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                className="w-full bg-black border border-white/10 rounded p-3 focus:border-brand-red outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs uppercase text-gray-500 font-bold mb-2">URL Slug (ID)</label>
                            <input
                                type="text"
                                value={formData.id || ''}
                                onChange={e => setFormData({ ...formData, id: e.target.value })}
                                disabled={!isCreating}
                                className="w-full bg-black border border-white/10 rounded p-3 focus:border-brand-red outline-none disabled:opacity-50"
                                placeholder="e.g. about-us"
                            />
                        </div>
                        <div>
                            <label className="block text-xs uppercase text-gray-500 font-bold mb-2">Category</label>
                            <select
                                value={formData.category || 'Company'}
                                onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                                className="w-full bg-black border border-white/10 rounded p-3 focus:border-brand-red outline-none"
                            >
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs uppercase text-gray-500 font-bold mb-2">Description / Subtitle</label>
                            <input
                                type="text"
                                value={formData.description || ''}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                className="w-full bg-black border border-white/10 rounded p-3 focus:border-brand-red outline-none"
                            />
                        </div>
                    </div>

                    <div className="border-t border-white/10 pt-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg">Content Sections</h3>
                            <button onClick={addSection} className="text-sm bg-white/10 px-3 py-1 rounded hover:bg-white/20">+ Add Section</button>
                        </div>

                        <div className="space-y-4">
                            {formData.sections?.map((section, idx) => (
                                <div key={idx} className="bg-black/50 p-4 rounded border border-white/10 relative">
                                    <button onClick={() => removeSection(idx)} className="absolute top-2 right-2 text-red-500 hover:text-red-400"><X size={16} /></button>

                                    <div className="mb-3">
                                        <input
                                            type="text"
                                            value={section.heading}
                                            onChange={e => updateSection(idx, 'heading', e.target.value)}
                                            className="w-full bg-transparent border-b border-white/10 focus:border-brand-red outline-none font-bold placeholder-gray-600"
                                            placeholder="Section Heading"
                                        />
                                    </div>
                                    <textarea
                                        value={section.content || ''}
                                        onChange={e => updateSection(idx, 'content', e.target.value)}
                                        className="w-full bg-transparent border border-white/10 rounded p-2 focus:border-brand-red outline-none text-sm min-h-[80px]"
                                        placeholder="Section Content (Paragraph)"
                                    />
                                    <div className="mt-2">
                                        <label className="text-xs text-gray-500 block mb-1">List Items (comma separated)</label>
                                        <input
                                            type="text"
                                            value={section.listItems?.join(', ') || ''}
                                            onChange={e => updateSection(idx, 'listItems', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                                            className="w-full bg-transparent border border-white/10 rounded p-2 text-sm"
                                            placeholder="Item 1, Item 2, Item 3"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto animate-in fade-in pb-20">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-3xl font-bold">Pages & Footer</h2>
                    <p className="text-gray-400 mt-1">Manage static pages and footer validation.</p>
                </div>
                <div className="flex gap-4">
                    <button onClick={handleSeed} className="px-4 py-2 bg-white/10 text-white font-bold rounded hover:bg-white/20 flex items-center gap-2">
                        <Database size={20} /> Seed Defaults
                    </button>
                    <button onClick={handleCreate} className="px-6 py-2 bg-white text-black font-bold rounded hover:bg-gray-200 flex items-center gap-2">
                        <Plus size={20} /> Add Page
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {categories.map(category => (
                    <div key={category} className="space-y-4">
                        <h3 className="text-lg font-bold text-gray-400 uppercase tracking-widest border-b border-white/10 pb-2 flex items-center gap-2">
                            {category}
                        </h3>
                        <div className="space-y-2">
                            {pages.filter(p => p.category === category).map(page => (
                                <div key={page.id} className="bg-[#141414] p-4 rounded-lg border border-white/5 hover:border-white/20 transition group">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-bold mb-1">{page.title}</div>
                                            <div className="text-xs text-gray-500">/{page.id}</div>
                                        </div>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                                            <button onClick={() => handleEdit(page)} className="text-blue-400 hover:text-white"><Edit2 size={14} /></button>
                                            <button onClick={() => handleDelete(page.id)} className="text-red-500 hover:text-red-400"><Trash2 size={14} /></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {pages.filter(p => p.category === category).length === 0 && (
                                <div className="text-sm text-gray-600 italic">No pages</div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PagesManager;
