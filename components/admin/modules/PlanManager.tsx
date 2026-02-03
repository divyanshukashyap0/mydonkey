import React, { useState } from 'react';
import { Plus, Edit, Trash2, Check, X, ShieldCheck } from 'lucide-react';
import { useStore } from '../../../context/StoreContext';
import { Plan } from '../../../types';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../firebase';

const PlanManager = () => {
    const { plans } = useStore();
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<Partial<Plan>>({});

    const resetForm = () => {
        setFormData({
            currency: 'INR',
            interval: 'monthly',
            features: [],
            active: true,
            quality: 'Good',
            resolution: '720p'
        });
        setIsEditing(false);
    };

    const handleSave = async () => {
        if (!formData.name || !formData.price || !formData.razorpayPlanId) {
            alert("Name, Price, and Razorpay Plan ID are required");
            return;
        }

        const id = formData.id || `plan_${Date.now()}`;
        const finalData: Plan = {
            id,
            name: formData.name,
            price: Number(formData.price),
            currency: formData.currency || 'INR',
            interval: formData.interval || 'monthly',
            razorpayPlanId: formData.razorpayPlanId,
            features: Array.isArray(formData.features) ? formData.features : [],
            active: formData.active ?? true,
            quality: formData.quality || 'Good',
            resolution: formData.resolution || '720p'
        };

        try {
            await setDoc(doc(db, 'plans', id), finalData);
            alert("Plan saved!");
            resetForm();
        } catch (e: any) {
            alert("Error: " + e.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Delete plan? Users on this plan might be affected.")) await deleteDoc(doc(db, 'plans', id));
    };

    // Helper to manage features list
    const addFeature = () => {
        const feat = prompt("Enter feature:");
        if (feat) {
            setFormData({ ...formData, features: [...(formData.features || []), feat] });
        }
    };

    const removeFeature = (idx: number) => {
        const newFeats = [...(formData.features || [])];
        newFeats.splice(idx, 1);
        setFormData({ ...formData, features: newFeats });
    };

    if (isEditing) {
        return (
            <div className="bg-[#141414] p-6 rounded-xl border border-white/5 animate-in fade-in max-w-2xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">{formData.id ? 'Edit Plan' : 'Add New Plan'}</h2>
                    <button onClick={resetForm} className="p-2 hover:bg-white/10 rounded"><X /></button>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-gray-500 uppercase font-bold">Plan Name</label>
                            <input className="w-full bg-black/50 border border-white/10 rounded p-2 outline-none focus:border-red-600"
                                value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Premium" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 uppercase font-bold">Razorpay Plan ID</label>
                            <input className="w-full bg-black/50 border border-white/10 rounded p-2 outline-none focus:border-red-600 font-mono text-sm"
                                value={formData.razorpayPlanId || ''} onChange={e => setFormData({ ...formData, razorpayPlanId: e.target.value })} placeholder="plan_..." />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="text-xs text-gray-500 uppercase font-bold">Price (INR)</label>
                            <input type="number" className="w-full bg-black/50 border border-white/10 rounded p-2 outline-none"
                                value={formData.price || ''} onChange={e => setFormData({ ...formData, price: Number(e.target.value) })} />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 uppercase font-bold">Quality</label>
                            <select className="w-full bg-black/50 border border-white/10 rounded p-2 outline-none"
                                value={formData.quality} onChange={e => setFormData({ ...formData, quality: e.target.value as any })}>
                                <option value="Good">Good</option>
                                <option value="Better">Better</option>
                                <option value="Best">Best</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 uppercase font-bold">Resolution</label>
                            <select className="w-full bg-black/50 border border-white/10 rounded p-2 outline-none"
                                value={formData.resolution} onChange={e => setFormData({ ...formData, resolution: e.target.value as any })}>
                                <option value="720p">720p</option>
                                <option value="1080p">1080p</option>
                                <option value="4K +HDR">4K +HDR</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs text-gray-500 uppercase font-bold mb-2 flex justify-between items-center">
                            Features <button onClick={addFeature} className="text-red-500 text-xs hover:underline">+ Add</button>
                        </label>
                        <div className="space-y-2">
                            {formData.features?.map((f, i) => (
                                <div key={i} className="flex justify-between items-center bg-white/5 p-2 rounded">
                                    <span className="text-sm">{f}</span>
                                    <button onClick={() => removeFeature(i)} className="text-gray-500 hover:text-red-500"><X size={14} /></button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="flex items-center gap-2 cursor-pointer mt-2">
                            <input type="checkbox" checked={formData.active} onChange={e => setFormData({ ...formData, active: e.target.checked })} />
                            <span className="font-bold">Plan Active</span>
                        </label>
                    </div>

                    <div className="flex justify-end gap-4 mt-8 border-t border-white/10 pt-4">
                        <button onClick={resetForm} className="px-6 py-2 rounded text-gray-400 font-bold hover:text-white">Cancel</button>
                        <button onClick={handleSave} className="px-6 py-2 rounded bg-red-600 text-white font-bold hover:bg-red-700">Save Plan</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold">Subscription Plans</h2>
                <button onClick={() => { resetForm(); setIsEditing(true); }} className="bg-red-600 px-4 py-2 rounded font-bold flex items-center gap-2 hover:bg-red-700 transition">
                    <Plus size={20} /> Create Plan
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plans.map(plan => (
                    <div key={plan.id} className={`bg-[#141414] rounded-xl border border-white/5 p-6 relative group ${!plan.active && 'opacity-60'}`}>
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                            <button onClick={() => { setFormData(plan); setIsEditing(true); }} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-blue-400"><Edit size={16} /></button>
                            <button onClick={() => handleDelete(plan.id)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-red-500"><Trash2 size={16} /></button>
                        </div>

                        <div className="mb-4">
                            <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                            <div className="text-2xl font-black mt-1">₹{plan.price}<span className="text-sm text-gray-500 font-normal">/{plan.interval}</span></div>
                        </div>

                        <div className="space-y-2 mb-6 text-sm text-gray-400">
                            <div className="flex justify-between border-b border-white/5 pb-1"><span>Quality</span> <span className="text-white">{plan.quality}</span></div>
                            <div className="flex justify-between border-b border-white/5 pb-1"><span>Resolution</span> <span className="text-white">{plan.resolution}</span></div>
                            <div className="flex justify-between border-b border-white/5 pb-1"><span>ID</span> <span className="font-mono text-xs">{plan.razorpayPlanId}</span></div>
                        </div>

                        <ul className="space-y-1 mb-4">
                            {plan.features.slice(0, 3).map((f, i) => (
                                <li key={i} className="text-xs text-gray-500 flex items-center gap-2"><Check size={12} className="text-green-500" /> {f}</li>
                            ))}
                            {plan.features.length > 3 && <li className="text-xs text-gray-600 italic">+{plan.features.length - 3} more...</li>}
                        </ul>

                        {!plan.active && <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl pointer-events-none">
                            <span className="bg-red-600 text-white font-bold px-3 py-1 rounded rotate-[-15deg]">INACTIVE</span>
                        </div>}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PlanManager;
