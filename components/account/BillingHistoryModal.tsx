import React, { useState, useEffect } from 'react';
import { X, FileText, Download } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Invoice } from '../../types';

interface BillingHistoryModalProps {
    onClose: () => void;
}

const BillingHistoryModal: React.FC<BillingHistoryModalProps> = ({ onClose }) => {
    const { getBillingHistory } = useStore();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getBillingHistory().then(data => {
            setInvoices(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            setLoading(false);
        });
    }, [getBillingHistory]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-[#181818] w-full max-w-3xl rounded-xl overflow-hidden shadow-2xl border border-white/10 flex flex-col max-h-[90vh]">

                <div className="p-6 border-b border-white/10 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-white">Billing Details</h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
                        <X className="text-white" />
                    </button>
                </div>

                <div className="p-6 flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : invoices.length === 0 ? (
                        <div className="text-center py-10 text-gray-500">
                            <FileText size={48} className="mx-auto mb-4 opacity-50" />
                            <p>No billing history found.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-gray-300">
                                <thead className="text-gray-500 font-bold uppercase border-b border-white/10">
                                    <tr>
                                        <th className="py-3 px-4">Date</th>
                                        <th className="py-3 px-4">Description</th>
                                        <th className="py-3 px-4">Service Period</th>
                                        <th className="py-3 px-4 text-right">Amount</th>
                                        <th className="py-3 px-4 text-center">Receipt</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoices.map(inv => (
                                        <tr key={inv.id} className="border-b border-white/5 hover:bg-white/5 transition">
                                            <td className="py-4 px-4 font-medium text-white">
                                                {new Date(inv.date).toLocaleDateString()}
                                            </td>
                                            <td className="py-4 px-4">
                                                {inv.planName} Plan <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded ml-2 ${inv.status === 'paid' ? 'bg-green-900 text-green-400' : 'bg-yellow-900 text-yellow-400'}`}>
                                                    {inv.status}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 text-gray-500 text-xs">
                                                {new Date(inv.periodStart).toLocaleDateString()} - {new Date(inv.periodEnd).toLocaleDateString()}
                                            </td>
                                            <td className="py-4 px-4 text-right font-bold text-white">
                                                {inv.currency === 'INR' ? '₹' : '$'}{inv.amount}
                                            </td>
                                            <td className="py-4 px-4 text-center">
                                                <button className="text-blue-400 hover:text-white transition p-1">
                                                    <Download size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BillingHistoryModal;
