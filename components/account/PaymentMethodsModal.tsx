import React, { useState, useEffect } from 'react';
import { X, CreditCard, Trash2, Plus, Lock } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { PaymentMethod } from '../../types';

interface PaymentMethodsModalProps {
    onClose: () => void;
}

const PaymentMethodsModal: React.FC<PaymentMethodsModalProps> = ({ onClose }) => {
    const { currentUser, addPaymentMethod, deletePaymentMethod } = useStore();
    const [methods, setMethods] = useState<PaymentMethod[]>([]);
    const [isAdding, setIsAdding] = useState(false);

    // New card state
    const [cardNumber, setCardNumber] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvc, setCvc] = useState('');

    useEffect(() => {
        if (!currentUser) return;
        const q = query(collection(db, 'users', currentUser.uid, 'paymentMethods'));
        const unsubscribe = onSnapshot(q, (snap) => {
            setMethods(snap.docs.map(d => d.data() as PaymentMethod));
        });
        return () => unsubscribe();
    }, [currentUser?.uid]);

    const handleAddCard = async (e: React.FormEvent) => {
        e.preventDefault();
        if (cardNumber.length < 16 || expiry.length < 5 || cvc.length < 3) return;

        // Simulate card validation and masking
        const brand = parseInt(cardNumber[0]) === 4 ? 'Visa' : 'MasterCard';
        const last4 = cardNumber.slice(-4);

        await addPaymentMethod({
            type: 'card',
            brand,
            last4,
            expiryDate: expiry,
            isDefault: methods.length === 0
        });

        setIsAdding(false);
        setCardNumber('');
        setExpiry('');
        setCvc('');
    };

    const handleDelete = async (id: string) => {
        if (confirm("Remove this payment method?")) {
            await deletePaymentMethod(id);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-[#181818] w-full max-w-2xl rounded-xl overflow-hidden shadow-2xl border border-white/10 flex flex-col max-h-[90vh]">

                <div className="p-6 border-b border-white/10 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-white">Manage Payment Info</h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
                        <X className="text-white" />
                    </button>
                </div>

                <div className="p-6 flex-1 overflow-y-auto">
                    {/* Existing Methods */}
                    <div className="space-y-4 mb-8">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Your Payment Methods</h3>
                        {methods.length === 0 ? (
                            <p className="text-gray-500 italic">No payment methods saved.</p>
                        ) : (
                            methods.map(method => (
                                <div key={method.id} className="flex items-center justify-between bg-[#222] p-4 rounded-lg border border-white/5">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-white p-1 rounded">
                                            <CreditCard className="text-gray-800" size={24} />
                                        </div>
                                        <div>
                                            <div className="text-white font-bold flex items-center gap-2">
                                                <span>•••• •••• •••• {method.last4}</span>
                                                {method.isDefault && <span className="bg-gray-600 text-xs px-2 py-0.5 rounded">Default</span>}
                                            </div>
                                            <div className="text-sm text-gray-400">{method.brand} • Expires {method.expiryDate}</div>
                                        </div>
                                    </div>
                                    <button onClick={() => handleDelete(method.id)} className="text-red-500 hover:text-red-400 p-2">
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Add New Method */}
                    {isAdding ? (
                        <form onSubmit={handleAddCard} className="bg-[#222] p-6 rounded-lg border border-white/10 animate-in slide-in-from-bottom-2">
                            <h3 className="text-lg font-bold text-white mb-4">Add a New Card</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1">CARD NUMBER</label>
                                    <div className="relative">
                                        <CreditCard className="absolute left-3 top-3 text-gray-500" size={20} />
                                        <input
                                            type="text"
                                            value={cardNumber}
                                            onChange={e => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 16))}
                                            placeholder="0000 0000 0000 0000"
                                            className="w-full bg-[#333] border border-white/10 rounded p-2.5 pl-10 text-white focus:outline-none focus:border-red-600 font-mono"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 mb-1">EXPIRY DATE</label>
                                        <input
                                            type="text"
                                            value={expiry}
                                            onChange={e => setExpiry(e.target.value)}
                                            placeholder="MM/YY"
                                            maxLength={5}
                                            className="w-full bg-[#333] border border-white/10 rounded p-2.5 text-white focus:outline-none focus:border-red-600 font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 mb-1">CVC</label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-3 text-gray-500" size={16} />
                                            <input
                                                type="password"
                                                value={cvc}
                                                onChange={e => setCvc(e.target.value.slice(0, 4))}
                                                placeholder="123"
                                                className="w-full bg-[#333] border border-white/10 rounded p-2.5 pl-10 text-white focus:outline-none focus:border-red-600 font-mono"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 mt-6">
                                <button type="submit" className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded transition">Save Card</button>
                                <button type="button" onClick={() => setIsAdding(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 rounded transition">Cancel</button>
                            </div>
                            <p className="text-xs text-gray-500 mt-4 text-center flex items-center justify-center gap-1">
                                <Lock size={12} /> Secure encrypted connection
                            </p>
                        </form>
                    ) : (
                        <button
                            onClick={() => setIsAdding(true)}
                            className="flex items-center gap-2 text-blue-400 hover:text-blue-300 font-bold transition"
                        >
                            <Plus size={20} /> Add Payment Method
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PaymentMethodsModal;
