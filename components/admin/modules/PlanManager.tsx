import React, { useState } from 'react';
import { Plus, Edit, Trash2, Check, X, ShieldCheck, CreditCard, Layers, Tv, Smartphone, Zap, ArrowRight, ArrowLeft } from 'lucide-react';
import { useStore } from '../../../context/StoreContext';
import { Plan } from '../../../types';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../firebase';

const STEPS = [
    { id: 1, title: "Basic Info", icon: Layers },
    { id: 2, title: "Pricing & Quality", icon: CreditCard },
    { id: 3, title: "Features & Limits", icon: Zap },
];

const PRESET_FEATURES = [
    "Ad-free entertainment",
    "Downloads for offline viewing",
    "Watch on any device",
    "Spatial Audio",
    "4K + HDR available",
    "Unlimited movies and TV shows",
    "Cancel anytime"
];

const PlanManager = () => {
    const { plans } = useStore();
    const [isEditing, setIsEditing] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState<Partial<Plan>>({});

    const resetForm = () => {
        setFormData({
            currency: 'INR',
            interval: 'monthly',
            features: [],
            active: true,
            quality: 'Good',
            resolution: '720p',
            ads: false,
            maxDevices: 1
        });
        setCurrentStep(1);
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
            resolution: formData.resolution || '720p',
            ads: formData.ads ?? false,
            maxDevices: Number(formData.maxDevices) || 1
        };

        try {
            await setDoc(doc(db, 'plans', id), finalData);
            alert("Plan saved successfully!");
            resetForm();
        } catch (e: any) {
            alert("Error: " + e.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Delete this plan? Users currently subscribed might lose access details.")) await deleteDoc(doc(db, 'plans', id));
    };

    const toggleFeature = (feat: string) => {
        const current = formData.features || [];
        if (current.includes(feat)) {
            setFormData({ ...formData, features: current.filter(f => f !== feat) });
        } else {
            setFormData({ ...formData, features: [...current, feat] });
        }
    };

    if (isEditing) {
        return (
            <div className="bg-[#141414] rounded-xl border border-white/5 animate-in fade-in max-w-4xl mx-auto flex flex-col md:flex-row overflow-hidden min-h-[500px]">
                {/* Sidebar / Stepper */}
                <div className="w-full md:w-64 bg-black/40 border-r border-white/5 p-6 flex flex-col">
                    <h2 className="text-xl font-bold mb-8 text-white">{formData.id ? 'Edit Plan' : 'Create Plan'}</h2>
                    <div className="space-y-6">
                        {STEPS.map((step) => (
                            <div key={step.id} className={`flex items-center gap-3 ${currentStep === step.id ? 'text-blue-400' : 'text-gray-500'} transition-colors`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${currentStep === step.id ? 'border-blue-400 bg-blue-400/10' : 'border-white/10 bg-white/5'}`}>
                                    <step.icon size={14} />
                                </div>
                                <span className="font-bold text-sm">{step.title}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 p-8 flex flex-col">
                    <div className="flex-1">
                        {currentStep === 1 && (
                            <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
                                <h3 className="text-xl font-bold mb-4">Basic Details</h3>
                                <div>
                                    <label className="text-xs text-gray-500 uppercase font-bold mb-1 block">Plan Name</label>
                                    <input className="w-full bg-black/50 border border-white/10 rounded p-3 outline-none focus:border-blue-500 text-lg font-bold"
                                        value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g. Premium 4K"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 uppercase font-bold mb-1 block">Razorpay Plan ID</label>
                                    <input className="w-full bg-black/50 border border-white/10 rounded p-3 outline-none focus:border-blue-500 font-mono text-sm"
                                        value={formData.razorpayPlanId || ''} onChange={e => setFormData({ ...formData, razorpayPlanId: e.target.value })}
                                        placeholder="plan_K9..."
                                    />
                                    <p className="text-[10px] text-gray-500 mt-1">Found in Razorpay Dashboard Settings</p>
                                </div>
                                <div>
                                    <label className="flex items-center gap-3 cursor-pointer p-4 rounded bg-white/5 hover:bg-white/10 transition border border-white/5">
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center ${formData.active ? 'bg-green-500 border-green-500' : 'border-gray-500'}`}>
                                            {formData.active && <Check size={12} className="text-black" />}
                                        </div>
                                        <input type="checkbox" className="hidden" checked={formData.active} onChange={e => setFormData({ ...formData, active: e.target.checked })} />
                                        <div>
                                            <div className="font-bold text-sm">Active Plan</div>
                                            <div className="text-xs text-gray-500">Visible to users for subscription</div>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        )}

                        {currentStep === 2 && (
                            <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
                                <h3 className="text-xl font-bold mb-4">Pricing & Video Quality</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs text-gray-500 uppercase font-bold mb-1 block">Price</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-3 text-gray-500 font-bold">₹</span>
                                            <input type="number" className="w-full bg-black/50 border border-white/10 rounded p-3 pl-8 outline-none focus:border-blue-500 font-bold"
                                                value={formData.price || ''} onChange={e => setFormData({ ...formData, price: Number(e.target.value) })} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 uppercase font-bold mb-1 block">Billing Interval</label>
                                        <select className="w-full bg-black/50 border border-white/10 rounded p-3 outline-none focus:border-blue-500"
                                            value={formData.interval} onChange={e => setFormData({ ...formData, interval: e.target.value as any })}>
                                            <option value="monthly">Monthly</option>
                                            <option value="yearly">Yearly</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs text-gray-500 uppercase font-bold mb-1 block">Video Quality</label>
                                        <select className="w-full bg-black/50 border border-white/10 rounded p-3 outline-none focus:border-blue-500"
                                            value={formData.quality} onChange={e => setFormData({ ...formData, quality: e.target.value as any })}>
                                            <option value="Good">Good</option>
                                            <option value="Better">Better</option>
                                            <option value="Best">Best</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 uppercase font-bold mb-1 block">Resolution</label>
                                        <select className="w-full bg-black/50 border border-white/10 rounded p-3 outline-none focus:border-blue-500"
                                            value={formData.resolution} onChange={e => setFormData({ ...formData, resolution: e.target.value as any })}>
                                            <option value="720p">720p</option>
                                            <option value="1080p">1080p</option>
                                            <option value="4K +HDR">4K +HDR</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {currentStep === 3 && (
                            <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
                                <h3 className="text-xl font-bold mb-4">Features & Limitations</h3>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-white/5 rounded border border-white/10">
                                        <label className="text-xs text-gray-500 uppercase font-bold mb-2 block flex items-center gap-2"><Tv size={14} /> Max Devices</label>
                                        <input type="number" min="1" max="10" className="w-full bg-black/50 border border-white/10 rounded p-2 outline-none focus:border-blue-500"
                                            value={formData.maxDevices || 1} onChange={e => setFormData({ ...formData, maxDevices: Number(e.target.value) })} />
                                    </div>
                                    <div className="p-4 bg-white/5 rounded border border-white/10 flex items-center justify-between">
                                        <label className="text-xs text-gray-500 uppercase font-bold flex items-center gap-2"><ShieldCheck size={14} /> Ad-Free</label>
                                        <input type="checkbox" className="accent-blue-500 w-5 h-5" checked={!formData.ads} onChange={e => setFormData({ ...formData, ads: !e.target.checked })} />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Feature List</label>
                                    <div className="grid grid-cols-1 gap-2">
                                        {PRESET_FEATURES.map(feat => (
                                            <button key={feat}
                                                onClick={() => toggleFeature(feat)}
                                                className={`flex items-center gap-3 p-3 rounded text-left transition ${formData.features?.includes(feat) ? 'bg-blue-600/20 border border-blue-600 text-white' : 'bg-white/5 border border-transparent text-gray-400 hover:bg-white/10'}`}
                                            >
                                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${formData.features?.includes(feat) ? 'bg-blue-500 border-blue-500' : 'border-gray-500'}`}>
                                                    {formData.features?.includes(feat) && <Check size={10} className="text-white" />}
                                                </div>
                                                <span className="text-sm font-medium">{feat}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <div className="mt-4">
                                        <input
                                            className="w-full bg-black/50 border border-white/10 rounded p-2 text-sm outline-none focus:border-blue-500"
                                            placeholder="Add custom feature..."
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    toggleFeature((e.target as HTMLInputElement).value);
                                                    (e.target as HTMLInputElement).value = '';
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer Nav */}
                    <div className="flex justify-between items-center pt-6 border-t border-white/5 mt-4">
                        <button
                            onClick={() => currentStep === 1 ? setIsEditing(false) : setCurrentStep(s => s - 1)}
                            className="text-gray-400 hover:text-white font-bold text-sm flex items-center gap-2"
                        >
                            {currentStep === 1 ? 'Cancel' : <><ArrowLeft size={16} /> Back</>}
                        </button>

                        <button
                            onClick={() => currentStep === 3 ? handleSave() : setCurrentStep(s => s + 1)}
                            className="bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700 transition flex items-center gap-2 shadow-lg shadow-blue-600/20"
                        >
                            {currentStep === 3 ? 'Save Plan' : <>Next <ArrowRight size={16} /></>}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold">Subscription Plans</h2>
                    <p className="text-gray-400 mt-1">Manage pricing tiers and feature capability.</p>
                </div>
                <button onClick={() => { resetForm(); setIsEditing(true); }} className="bg-blue-600 px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700 transition shadow-lg shadow-blue-600/20">
                    <Plus size={20} /> Create Plan
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plans.map(plan => (
                    <div key={plan.id} className={`bg-[#141414] rounded-2xl border ${plan.name.toLowerCase().includes('premium') ? 'border-yellow-500/30' : 'border-white/5'} p-8 relative group overflow-hidden hover:border-white/20 transition-all hover:shadow-2xl hover:shadow-black/50`}>
                        {plan.name.toLowerCase().includes('premium') && (
                            <div className="absolute top-0 right-0 bg-yellow-500 text-black text-[10px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-widest">
                                Popular
                            </div>
                        )}

                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-2xl font-black text-white">{plan.name}</h3>
                                {plan.resolution === '4K +HDR' && <span className="text-[10px] bg-white/10 text-gray-300 px-2 py-0.5 rounded border border-white/5 uppercase font-bold mt-2 inline-block">4K + HDR</span>}
                            </div>
                        </div>

                        <div className="mb-8">
                            <div className="flex items-baseline gap-1">
                                <span className="text-4xl font-black text-white">₹{plan.price}</span>
                                <span className="text-gray-500 font-medium">/{plan.interval === 'monthly' ? 'mo' : 'yr'}</span>
                            </div>
                            <div className="text-xs font-mono text-gray-600 mt-1">{plan.razorpayPlanId}</div>
                        </div>

                        <div className="space-y-4 mb-8">
                            <div className="flex items-center gap-3 text-sm text-gray-300">
                                <Tv size={16} className="text-gray-500" />
                                <span>Watch on {plan.maxDevices || 1} Device(s)</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-gray-300">
                                <Smartphone size={16} className="text-gray-500" />
                                <span>Mobile & Tablet Support</span>
                            </div>
                            {!plan.ads && (
                                <div className="flex items-center gap-3 text-sm text-gray-300">
                                    <ShieldCheck size={16} className="text-gray-500" />
                                    <span>Ad-Free Experience</span>
                                </div>
                            )}
                        </div>

                        <div className="border-t border-white/5 pt-6 space-y-3">
                            {plan.features.slice(0, 4).map((f, i) => (
                                <div key={i} className="flex items-center gap-3 text-sm text-gray-400">
                                    <Check size={14} className="text-blue-500" />
                                    <span>{f}</span>
                                </div>
                            ))}
                        </div>

                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setFormData(plan); setIsEditing(true); }} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-blue-400 backdrop-blur-sm"><Edit size={16} /></button>
                            <button onClick={() => handleDelete(plan.id)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-red-500 backdrop-blur-sm"><Trash2 size={16} /></button>
                        </div>

                        {!plan.active && <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-[2px] z-10">
                            <span className="bg-red-600 text-white font-bold px-4 py-2 rounded rotate-[-12deg] shadow-xl border border-white/20">CURRENTLY INACTIVE</span>
                        </div>}
                    </div>
                ))}

                {/* New Plan Card */}
                <button
                    onClick={() => { resetForm(); setIsEditing(true); }}
                    className="group border border-dashed border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center gap-4 text-gray-500 hover:text-white hover:border-blue-500/50 hover:bg-blue-500/5 transition-all min-h-[400px]"
                >
                    <div className="w-16 h-16 rounded-full bg-white/5 group-hover:bg-blue-500/20 flex items-center justify-center transition-colors">
                        <Plus size={32} className="group-hover:text-blue-500 transition-colors" />
                    </div>
                    <span className="font-bold text-lg">Create New Plan</span>
                </button>
            </div>
        </div>
    );
};

export default PlanManager;
