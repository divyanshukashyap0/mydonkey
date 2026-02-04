import React, { useState } from 'react';
import { Edit, Trash2, Check, X, CreditCard, Lock, Ban } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { User, Invoice } from '../../types';
import { doc, updateDoc, collection, getDocs, orderBy, query, where, limit } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { sendPasswordResetEmail } from 'firebase/auth';

const UsersModule = () => {
    const { users, plans } = useStore();
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [userInvoices, setUserInvoices] = useState<Invoice[]>([]);
    const [userActivity, setUserActivity] = useState<any[]>([]);
    const [loadingInvoices, setLoadingInvoices] = useState(false);
    const [activeTab, setActiveTab] = useState<'details' | 'activity'>('details');

    const handleEditClick = async (user: User) => {
        setEditingUser(user);
        setLoadingInvoices(true);
        setActiveTab('details');

        // Fetch invoices
        try {
            const q = query(collection(db, 'users', user.uid, 'billing'), orderBy('date', 'desc'));
            const snap = await getDocs(q);
            setUserInvoices(snap.docs.map(d => d.data() as Invoice));
        } catch (e) {
            console.error("Failed to fetch invoices", e);
            setUserInvoices([]);
        }

        // Fetch Activity Logs
        try {
            const qActivity = query(collection(db, 'activity_logs'), where('userId', '==', user.uid), orderBy('timestamp', 'desc'), limit(50));
            const snapActivity = await getDocs(qActivity);
            setUserActivity(snapActivity.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) {
            console.error("Failed to fetch activity", e);
            setUserActivity([]);
        }

        setLoadingInvoices(false);
    };

    const handleUpdate = async (updates: Partial<User>) => {
        if (!editingUser) return;
        try {
            await updateDoc(doc(db, 'users', editingUser.uid), updates);
            setEditingUser({ ...editingUser, ...updates });
            alert("User updated successfully");
        } catch (e) {
            alert("Failed to update user");
        }
    };

    const handleSendPasswordReset = async () => {
        if (!editingUser) return;
        if (confirm(`Send password reset email to ${editingUser.email}?`)) {
            try {
                await sendPasswordResetEmail(auth, editingUser.email);
                alert("Email sent!");
            } catch (e: any) {
                alert("Error: " + e.message);
            }
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <h2 className="text-3xl font-bold">User Management</h2>

            <div className="bg-[#141414] rounded-xl border border-white/5 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-white/5 text-gray-400 font-bold uppercase text-xs">
                        <tr>
                            <th className="p-4">User</th>
                            <th className="p-4">Plan</th>
                            <th className="p-4">Role</th>
                            <th className="p-4">Last Active</th>
                            <th className="p-4 text-right">Status</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {users.map(user => (
                            <tr key={user.uid} className="hover:bg-white/5 transition">
                                <td className="p-4">
                                    <div className="font-bold text-white">{user.email}</div>
                                    <div className="text-[10px] text-gray-500 font-mono">{user.uid}</div>
                                </td>
                                <td className="p-4"><span className="px-2 py-0.5 rounded bg-brand-red/10 text-brand-red border border-brand-red/20 text-xs font-bold">{user.plan}</span></td>
                                <td className="p-4 text-gray-400 uppercase font-bold text-xs">{user.role}</td>
                                <td className="p-4 text-gray-500 italic">{user.lastActiveAt ? new Date(user.lastActiveAt).toLocaleDateString() : 'Never'}</td>
                                <td className="p-4 text-right">
                                    <span className={`font-bold text-xs ${user.status === 'active' ? 'text-green-400' : 'text-red-500'}`}>
                                        {(user.status || 'active').toUpperCase()}
                                    </span>
                                </td>
                                <td className="p-4 text-right">
                                    <button onClick={() => handleEditClick(user)} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-sm font-bold transition">
                                        Manage
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Edit User Modal */}
            {editingUser && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-[#181818] w-full max-w-2xl rounded-xl overflow-hidden shadow-2xl border border-white/10 flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center">
                            <h2 className="text-2xl font-bold text-white">Edit User: {editingUser.email}</h2>
                            <button onClick={() => setEditingUser(null)} className="p-2 hover:bg-white/10 rounded-full transition"><X /></button>
                        </div>

                        <div className="flex border-b border-white/10">
                            <button onClick={() => setActiveTab('details')} className={`flex-1 py-3 text-sm font-bold border-b-2 transition ${activeTab === 'details' ? 'border-brand-red text-white' : 'border-transparent text-gray-400 hover:text-white'}`}>Details</button>
                            <button onClick={() => setActiveTab('activity')} className={`flex-1 py-3 text-sm font-bold border-b-2 transition ${activeTab === 'activity' ? 'border-brand-red text-white' : 'border-transparent text-gray-400 hover:text-white'}`}>Activity History</button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-8 max-h-[60vh]">
                            {activeTab === 'details' ? (
                                <>
                                    {/* Plan & Status */}
                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-400 mb-2">Subscription Plan</label>
                                            <select
                                                value={editingUser.plan}
                                                onChange={(e) => handleUpdate({ plan: e.target.value })}
                                                className="w-full bg-[#111] border border-white/10 rounded p-2 text-white outline-none focus:border-brand-red"
                                            >
                                                {plans.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-400 mb-2">Account Status</label>
                                            <button
                                                onClick={() => handleUpdate({ status: editingUser.status === 'active' ? 'blocked' : 'active' })}
                                                className={`w-full py-2 rounded font-bold border ${editingUser.status === 'active' ? 'border-green-600 text-green-500 hover:bg-green-600/10' : 'border-red-600 text-red-500 hover:bg-red-600/10'}`}
                                            >
                                                {editingUser.status === 'active' ? 'Active' : 'Blocked'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="space-y-3">
                                        <h3 className="font-bold border-b border-white/10 pb-2">Quick Actions</h3>
                                        <div className="flex gap-4">
                                            <button onClick={handleSendPasswordReset} className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 text-blue-400 border border-blue-600/50 rounded hover:bg-blue-600/30 transition">
                                                <Lock size={16} /> Send Password Reset
                                            </button>
                                        </div>
                                    </div>

                                    {/* Billing History */}
                                    <div className="space-y-3">
                                        <h3 className="font-bold border-b border-white/10 pb-2">Billing History</h3>
                                        {loadingInvoices ? (
                                            <div className="text-gray-500 italic">Loading invoices...</div>
                                        ) : userInvoices.length === 0 ? (
                                            <div className="text-gray-500 italic">No invoices found.</div>
                                        ) : (
                                            <div className="space-y-2">
                                                {userInvoices.map(inv => (
                                                    <div key={inv.id} className="flex justify-between items-center bg-[#111] p-3 rounded border border-white/5">
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-bold">{inv.planName}</span>
                                                            <span className="text-xs text-gray-500">{new Date(inv.date).toLocaleDateString()}</span>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="font-mono font-bold">{inv.currency === 'INR' ? '₹' : '$'}{inv.amount}</div>
                                                            <span className={`text-[10px] uppercase font-bold ${inv.status === 'paid' ? 'text-green-500' : 'text-yellow-500'}`}>{inv.status}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                // Activity Tab
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-bold text-lg">Recent Activity</h3>
                                        <span className="text-xs text-gray-500 bg-white/10 px-2 py-1 rounded">Last 50 Actions</span>
                                    </div>

                                    <div className="space-y-2">
                                        {userActivity.map(log => (
                                            <div key={log.id} className="bg-[#111] p-3 rounded border border-white/5 flex items-start gap-3">
                                                <div className={`mt-1 w-2 h-2 rounded-full ${log.action.includes('play') ? 'bg-brand-red' : 'bg-gray-600'}`} />
                                                <div className="flex-1">
                                                    <div className="flex justify-between">
                                                        <span className="font-bold text-sm text-white uppercase tracking-wider">{log.action.replace('_', ' ')}</span>
                                                        <span className="text-xs text-gray-500 font-mono">{log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString() : 'Just now'}</span>
                                                    </div>
                                                    {log.details && Object.keys(log.details).length > 0 && (
                                                        <div className="mt-1 text-xs text-gray-400 bg-black/30 p-2 rounded font-mono">
                                                            {JSON.stringify(log.details).slice(0, 100)}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        {userActivity.length === 0 && <div className="text-gray-500 italic p-4 text-center">No recent activity recorded.</div>}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UsersModule;
