import React from 'react';
import { Check, X } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

interface PlanSelectionModalProps {
    onClose: () => void;
}

const PlanSelectionModal: React.FC<PlanSelectionModalProps> = ({ onClose }) => {
    const { plans, currentUser, updateSubscriptionPlan } = useStore();

    const handleSelectPlan = async (planId: string) => {
        const plan = plans.find(p => p.id === planId);
        if (!plan) return;

        // Verify Razorpay Key
        const key = import.meta.env.VITE_RAZORPAY_KEY_ID;
        if (!key) {
            alert("Razorpay Key ID is missing in environment variables.");
            return;
        }

        const options = {
            key: key,
            amount: plan.price * 100, // Amount in paise
            currency: plan.currency || "INR",
            name: "My Donkey OTT",
            description: `Subscription for ${plan.name}`,
            image: "/logo.png",
            handler: async function (response: any) {
                // Payment Success
                console.log("Payment Successful", response);
                try {
                    await updateSubscriptionPlan(planId, response);
                    alert(`Plan updated to ${plan.name} successfully!`);
                    onClose();
                } catch (error) {
                    console.error(error);
                    alert("Failed to update subscription after payment.");
                }
            },
            prefill: {
                name: currentUser?.email || "User",
                email: currentUser?.email,
                contact: ""
            },
            theme: {
                color: "#E50914"
            }
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (response: any) {
            alert("Payment Failed: " + response.error.description);
        });
        rzp.open();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-[#181818] w-full max-w-4xl rounded-xl overflow-hidden shadow-2xl border border-white/10 flex flex-col max-h-[90vh]">

                <div className="p-6 border-b border-white/10 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-white">Choose the plan that's right for you</h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
                        <X className="text-white" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 grid md:grid-cols-3 gap-4">
                    {plans.map(plan => {
                        const isCurrent = currentUser?.plan === plan.name;
                        return (
                            <div
                                key={plan.id}
                                className={`relative p-6 rounded-xl border-2 flex flex-col gap-4 transition-all ${isCurrent ? 'border-red-600 bg-red-600/10' : 'border-white/20 hover:border-white/40 bg-[#222]'}`}
                            >
                                {isCurrent && (
                                    <div className="absolute top-0 right-0 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                                        CURRENT PLAN
                                    </div>
                                )}
                                <div>
                                    <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                                    <div className="text-lg text-gray-400 font-medium">{plan.quality}</div>
                                </div>

                                <div className="text-3xl font-black text-white">
                                    {plan.currency === 'INR' ? '₹' : '$'}{plan.price}
                                    <span className="text-sm font-normal text-gray-400">/{plan.interval}</span>
                                </div>

                                <ul className="space-y-2 mt-2 mb-4 flex-1">
                                    {plan.features.map((feat, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                                            <Check size={16} className="text-green-400 mt-0.5 shrink-0" />
                                            {feat}
                                        </li>
                                    ))}
                                    <li className="flex items-start gap-2 text-sm text-gray-300">
                                        <Check size={16} className="text-green-400 mt-0.5 shrink-0" />
                                        Resolution: {plan.resolution}
                                    </li>
                                </ul>

                                <button
                                    onClick={() => !isCurrent && handleSelectPlan(plan.id)}
                                    disabled={isCurrent}
                                    className={`w-full py-3 rounded font-bold transition ${isCurrent ? 'bg-gray-600 text-gray-300 cursor-default' : 'bg-red-600 text-white hover:bg-red-700'}`}
                                >
                                    {isCurrent ? 'Current Plan' : 'Select Plan'}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default PlanSelectionModal;
