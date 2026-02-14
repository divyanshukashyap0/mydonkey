import React, { useState } from 'react';
import { Edit, Trash2, Check, X, CreditCard, Lock, Ban, Search, Filter, Eye, Clock, Calendar, Mail, User as UserIcon, Play } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { User, Invoice } from '../../types';
import { doc, updateDoc, collection, getDocs, orderBy, query, where, limit } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { sendPasswordResetEmail } from 'firebase/auth';

const UsersModule = () => {
    const { users, plans, content } = useStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked'>('all');

    // Edit Mode State
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [userInvoices, setUserInvoices] = useState<Invoice[]>([]);
    const [userActivity, setUserActivity] = useState<any[]>([]);
    const [loadingInvoices, setLoadingInvoices] = useState(false);
    const [activeTab, setActiveTab] = useState<'details' | 'activity' | 'history'>('details');

    // Filter Logic
    const filteredUsers = users.filter(user => {
        const email = user.email || '';
        const uid = user.uid || '';
        const matchesSearch = email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            uid.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = statusFilter === 'all' || (user.status || 'active') === statusFilter;
        return matchesSearch && matchesFilter;
    });

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
        <div className="space-y-6 animate-in fade-in pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold">User Management</h2>
                    <p className="text-gray-400 mt-1">View user details, watch history, and manage access.</p>
                </div>
                <div className="flex gap-2 text-sm">
                    <div className="bg-[#141414] border border-white/10 px-4 py-2 rounded-lg text-center min-w-[100px]">
                        <div className="text-xs text-gray-500 uppercase font-bold text-left">Total Users</div>
                        <div className="text-2xl font-black text-white text-left">{users.length}</div>
                    </div>
                    <div className="bg-[#141414] border border-white/10 px-4 py-2 rounded-lg text-center min-w-[100px]">
                        <div className="text-xs text-gray-500 uppercase font-bold text-left">Active</div>
                        <div className="text-2xl font-black text-green-500 text-left">{users.filter(u => u.status !== 'blocked').length}</div>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row gap-4 bg-[#141414] p-4 rounded-xl border border-white/5">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input
                        type="text"
                        placeholder="Search by email or UID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-white/20 transition-colors placeholder:text-gray-600"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="text-gray-500" size={18} />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-white/20 transition-colors cursor-pointer text-gray-300"
                    >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="blocked">Blocked</option>
                    </select>
                </div>
            </div>

            <div className="bg-[#141414] rounded-xl border border-white/5 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-white/5 text-gray-400 font-bold uppercase text-xs">
                        <tr>
                            <th className="p-4">User</th>
                            <th className="p-4">Joined</th>
                            <th className="p-4">Plan</th>
                            <th className="p-4">Last Active</th>
                            <th className="p-4 text-center">Status</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {filteredUsers.map(user => (
                            <tr key={user.uid} className="hover:bg-white/5 transition group">
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-xs font-bold text-gray-400 border border-white/10">
                                            {(user.email || '??').substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="font-bold text-white group-hover:text-blue-400 transition-colors">{user.email}</div>
                                            <div className="text-[10px] text-gray-600 font-mono flex items-center gap-1"><CreditCard size={10} /> {(user.uid || 'unknown').substring(0, 8)}...</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4 text-gray-500 text-xs">
                                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : <span className="text-gray-700">-</span>}
                                </td>
                                <td className="p-4">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${user.plan === 'Premium' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' : 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>
                                        {user.plan}
                                    </span>
                                </td>
                                <td className="p-4 text-gray-500 text-xs font-mono">
                                    {user.lastActiveAt ? new Date(user.lastActiveAt).toLocaleString() : 'Never'}
                                </td>
                                <td className="p-4 text-center">
                                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${user.status === 'blocked' ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${user.status === 'blocked' ? 'bg-red-500' : 'bg-green-500'} animate-pulse`} />
                                        {(user.status || 'active').toUpperCase()}
                                    </span>
                                </td>
                                <td className="p-4 text-right">
                                    <button onClick={() => handleEditClick(user)} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded text-xs font-bold text-gray-300 hover:text-white transition flex items-center gap-2 ml-auto">
                                        <Edit size={12} /> Manage
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {filteredUsers.length === 0 && (
                            <tr>
                                <td colSpan={6} className="p-12 text-center text-gray-500">
                                    <div className="inline-block p-4 rounded-full bg-white/5 mb-3">
                                        <UserIcon size={32} className="opacity-50" />
                                    </div>
                                    <div className="font-bold">No users found</div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Edit User Modal */}
            {editingUser && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in zoom-in-95 duration-200">
                    <div className="bg-[#181818] w-full max-w-4xl rounded-xl overflow-hidden shadow-2xl border border-white/10 flex flex-col h-[85vh]">

                        {/* Modal Header */}
                        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#141414]">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-lg font-bold text-white shadow-lg">
                                    {(editingUser.email || '??').substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white">{editingUser.email}</h2>
                                    <div className="flex items-center gap-2 text-xs text-gray-400">
                                        <span className="font-mono bg-white/10 px-1.5 py-0.5 rounded">{editingUser.uid}</span>
                                        <span>•</span>
                                        <span>Joined {editingUser.createdAt ? new Date(editingUser.createdAt).toLocaleDateString() : 'Unknown'}</span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setEditingUser(null)} className="p-2 hover:bg-white/10 rounded-full transition text-gray-400 hover:text-white"><X size={20} /></button>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-white/10 bg-[#141414]">
                            <button onClick={() => setActiveTab('details')} className={`flex-1 py-4 text-sm font-bold border-b-2 transition flex items-center justify-center gap-2 ${activeTab === 'details' ? 'border-blue-500 text-white bg-white/5' : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}>
                                <UserIcon size={16} /> Account Details
                            </button>
                            <button onClick={() => setActiveTab('history')} className={`flex-1 py-4 text-sm font-bold border-b-2 transition flex items-center justify-center gap-2 ${activeTab === 'history' ? 'border-blue-500 text-white bg-white/5' : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}>
                                <Eye size={16} /> Watch History
                            </button>
                            <button onClick={() => setActiveTab('activity')} className={`flex-1 py-4 text-sm font-bold border-b-2 transition flex items-center justify-center gap-2 ${activeTab === 'activity' ? 'border-blue-500 text-white bg-white/5' : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}>
                                <Clock size={16} /> System Logs
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="flex-1 overflow-y-auto p-8 bg-[#181818]">
                            {activeTab === 'details' && (
                                <div className="space-y-8 max-w-2xl mx-auto">
                                    {/* Status Card */}
                                    <div className="bg-[#111] p-6 rounded-xl border border-white/5 space-y-6">
                                        <h3 className="font-bold text-gray-400 uppercase text-xs tracking-wider">Subscription & Access</h3>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-sm font-bold text-gray-400 mb-2">Current Plan</label>
                                                <select
                                                    value={editingUser.plan}
                                                    onChange={(e) => handleUpdate({ plan: e.target.value })}
                                                    className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-blue-500 appearance-none font-medium"
                                                >
                                                    {plans.map(p => <option key={p.id} value={p.name}>{p.name} - ₹{p.price}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-gray-400 mb-2">Account Status</label>
                                                <button
                                                    onClick={() => handleUpdate({ status: editingUser.status === 'active' ? 'blocked' : 'active' })}
                                                    className={`w-full py-3 rounded-lg font-bold border flex items-center justify-center gap-2 transition ${editingUser.status === 'active' ? 'border-green-500/50 text-green-500 hover:bg-green-500/10' : 'border-red-500/50 text-red-500 hover:bg-red-500/10'}`}
                                                >
                                                    {editingUser.status === 'active' ? <Check size={16} /> : <Ban size={16} />}
                                                    {editingUser.status === 'active' ? 'Active Account' : 'Account Blocked'}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="pt-6 border-t border-white/5">
                                            <h4 className="font-bold text-sm text-gray-400 mb-3">Security Actions</h4>
                                            <button onClick={handleSendPasswordReset} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white/5 text-gray-300 border border-white/10 rounded-lg hover:bg-white/10 hover:text-white transition font-medium">
                                                <Lock size={16} /> Send Password Reset Email
                                            </button>
                                        </div>
                                    </div>

                                    {/* Billing History */}
                                    <div>
                                        <h3 className="font-bold text-gray-400 uppercase text-xs tracking-wider mb-4">Billing History</h3>
                                        {loadingInvoices ? (
                                            <div className="flex justify-center p-8"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
                                        ) : userInvoices.length === 0 ? (
                                            <div className="text-gray-500 italic text-sm p-4 border border-dashed border-white/10 rounded-lg text-center">No invoices found.</div>
                                        ) : (
                                            <div className="space-y-2">
                                                {userInvoices.map(inv => (
                                                    <div key={inv.id} className="flex justify-between items-center bg-[#111] p-4 rounded-lg border border-white/5 hover:border-white/20 transition">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`p-2 rounded-full ${inv.status === 'paid' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                                                                <CreditCard size={16} />
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-bold text-white">{inv.planName}</span>
                                                                <span className="text-xs text-gray-500">{new Date(inv.date).toLocaleDateString()}</span>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="font-mono font-bold text-white">{inv.currency === 'INR' ? '₹' : '$'}{inv.amount}</div>
                                                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${inv.status === 'paid' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>{inv.status}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'history' && (
                                <div className="space-y-6 max-w-3xl mx-auto">
                                    <div className="flex items-center gap-4 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                                        <Eye className="text-blue-400" size={24} />
                                        <div>
                                            <div className="font-bold text-blue-400">Continue Watching</div>
                                            <div className="text-xs text-blue-300/70">Content the user has started but not finished.</div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3">
                                        {editingUser.continueWatching && editingUser.continueWatching.length > 0 ? (
                                            editingUser.continueWatching.map((item, index) => {
                                                const movie = content.find(c => c.id === item.movieId);
                                                if (!movie) return null;
                                                const percent = Math.min(100, Math.round((item.progress / item.duration) * 100)) || 0;

                                                return (
                                                    <div key={index} className="bg-[#111] p-2 rounded-lg border border-white/5 flex gap-4 hover:border-white/20 transition group">
                                                        <div className="w-32 h-20 bg-gray-800 rounded-md overflow-hidden flex-shrink-0 relative">
                                                            <img
                                                                src={movie.backdrop_path}
                                                                alt={movie.title}
                                                                className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition"
                                                            />
                                                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700">
                                                                <div className="h-full bg-blue-500" style={{ width: `${percent}%` }} />
                                                            </div>
                                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                                                                <div className="bg-black/50 p-1 rounded-full text-white"><Play size={16} fill="white" /></div>
                                                            </div>
                                                        </div>
                                                        <div className="flex-1 flex flex-col justify-center py-2">
                                                            <h4 className="font-bold text-base text-white">{movie.title}</h4>
                                                            <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                                                                <span className="text-blue-400 font-bold">{percent}% Completed</span>
                                                                <span>•</span>
                                                                <span>Last watched: {new Date(item.lastWatchedAt).toLocaleDateString()}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="bg-[#111] rounded-xl border border-dashed border-white/10 p-12 text-center text-gray-500">
                                                No watch history available.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'activity' && (
                                <div className="space-y-6 max-w-3xl mx-auto">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-bold text-gray-400 uppercase text-xs tracking-wider">Recent System Logs</h3>
                                    </div>
                                    <div className="space-y-3 relative before:absolute before:left-4 before:top-0 before:bottom-0 before:w-px before:bg-white/10">
                                        {userActivity.map((log, idx) => (
                                            <div key={log.id} className="relative pl-10">
                                                <div className={`absolute left-[13px] top-3 w-2 h-2 rounded-full border border-[#181818] ${log.action.includes('play') ? 'bg-green-500' : 'bg-gray-500'}`} />
                                                <div className="bg-[#111] p-4 rounded-lg border border-white/5 hover:border-white/10 transition">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className="font-bold text-sm text-white uppercase tracking-wider">{log.action.replace(/_/g, ' ')}</span>
                                                        <span className="text-xs text-gray-500 font-mono flex items-center gap-1">
                                                            <Clock size={10} />
                                                            {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString() : 'Just now'}
                                                        </span>
                                                    </div>
                                                    {log.details && Object.keys(log.details).length > 0 && (
                                                        <div className="mt-2 text-xs text-gray-400 bg-black/30 p-2 rounded font-mono border border-white/5 overflow-x-auto whitespace-pre-wrap">
                                                            {JSON.stringify(log.details, null, 2)}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        {userActivity.length === 0 && <div className="text-gray-500 italic p-8 text-center bg-[#111] rounded-lg border border-dashed border-white/10">No recent activity recorded.</div>}
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
