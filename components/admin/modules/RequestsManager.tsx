import React, { useState } from 'react';
import { useStore } from '../../../context/StoreContext';
import { Search, Filter, MessageSquare, CheckCircle, Clock, XCircle, ExternalLink, Calendar as CalendarIcon, User as UserIcon, Flag, ThumbsUp, Trash2 } from 'lucide-react';
import { ContentRequest } from '../../../types';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../../firebase';

export default function RequestsManager() {
    const { contentRequests, updateContentRequest } = useStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'processing' | 'fulfilled' | 'rejected'>('all');

    // Sort: High Priority first, then Newest first
    const sortedRequests = [...contentRequests].sort((a, b) => {
        if (a.priority === 'high' && b.priority !== 'high') return -1;
        if (a.priority !== 'high' && b.priority === 'high') return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const filteredRequests = sortedRequests.filter(req => {
        const matchesSearch = req.contentTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
            req.userEmail.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = statusFilter === 'all' || req.status === statusFilter;
        return matchesSearch && matchesFilter;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
            case 'approved': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
            case 'processing': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            case 'fulfilled': return 'bg-green-500/10 text-green-500 border-green-500/20';
            case 'rejected': return 'bg-red-500/10 text-red-500 border-red-500/20';
            default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
        }
    };

    const handleStatusUpdate = async (id: string, newStatus: ContentRequest['status']) => {
        try {
            await updateContentRequest(id, { status: newStatus });
        } catch (error: any) {
            alert('Error updating status: ' + error.message);
        }
    };

    const togglePriority = async (req: ContentRequest) => {
        const newPriority = req.priority === 'high' ? 'normal' : 'high';
        try {
            await updateContentRequest(req.id, { priority: newPriority });
        } catch (error: any) {
            alert('Error updating priority: ' + error.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Permanently delete this request?")) {
            await deleteDoc(doc(db, 'requests', id));
        }
    }

    const handleUpdateNote = async (id: string, currentNote: string = '') => {
        const note = prompt('Enter admin note:', currentNote);
        if (note !== null) {
            try {
                await updateContentRequest(id, { adminNote: note });
            } catch (error: any) {
                alert('Error updating note: ' + error.message);
            }
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black">Content Requests</h1>
                    <p className="text-gray-400 text-sm">Track and manage user content wishes</p>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                    { label: 'Pending', count: contentRequests.filter(r => r.status === 'pending').length, color: 'text-yellow-500' },
                    { label: 'Priority', count: contentRequests.filter(r => r.priority === 'high' && r.status !== 'fulfilled').length, color: 'text-red-500' },
                    { label: 'In Progress', count: contentRequests.filter(r => ['approved', 'processing'].includes(r.status)).length, color: 'text-blue-500' },
                    { label: 'Fulfilled', count: contentRequests.filter(r => r.status === 'fulfilled').length, color: 'text-green-500' },
                    { label: 'Win Rate', count: contentRequests.length ? `${Math.round((contentRequests.filter(r => r.status === 'fulfilled').length / contentRequests.length) * 100)}%` : '0%', color: 'text-cyan-500' },
                ].map((stat, idx) => (
                    <div key={idx} className="bg-[#141414] border border-white/5 rounded-xl p-4">
                        <div className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">{stat.label}</div>
                        <div className={`text-2xl font-black ${stat.color}`}>{stat.count}</div>
                    </div>
                ))}
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row gap-4 bg-[#141414] p-4 rounded-xl border border-white/5">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input
                        type="text"
                        placeholder="Search by title or user email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-red-600 transition-colors"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="text-gray-500" size={18} />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-red-600 transition-colors cursor-pointer"
                    >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="processing">Processing</option>
                        <option value="fulfilled">Fulfilled</option>
                        <option value="rejected">Rejected</option>
                    </select>
                </div>
            </div>

            {/* Requests List */}
            <div className="space-y-4">
                {filteredRequests.map(req => (
                    <div key={req.id} className={`bg-[#141414] border rounded-xl overflow-hidden transition-all group ${req.priority === 'high' ? 'border-red-500/30' : 'border-white/5 hover:border-white/20'}`}>
                        <div className="p-5 flex flex-col md:flex-row gap-6 relative">
                            {/* Left: Content Info */}
                            <div className="flex-1 space-y-3">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">{req.contentTitle}</h3>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border ${getStatusColor(req.status)}`}>
                                        {req.status}
                                    </span>
                                    {req.priority === 'high' && (
                                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-red-600 text-white flex items-center gap-1">
                                            <Flag size={8} fill="currentColor" /> High Priority
                                        </span>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-gray-400">
                                    <div className="flex items-center gap-2">
                                        <UserIcon size={14} className="text-gray-600" />
                                        <span>{req.userName}</span>
                                        <span className="text-gray-600">•</span>
                                        <span>{req.userEmail}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CalendarIcon size={14} className="text-gray-600" />
                                        <span>{new Date(req.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                                    </div>
                                </div>

                                {req.adminNote && (
                                    <div className="mt-2 text-sm bg-yellow-500/10 border-l-2 border-yellow-500 pl-3 py-1 text-yellow-200/80 italic">
                                        "{req.adminNote}"
                                    </div>
                                )}
                            </div>

                            {/* Right: Actions */}
                            <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
                                {/* Workflow Actions */}
                                {req.status === 'pending' && (
                                    <button
                                        onClick={() => handleStatusUpdate(req.id, 'approved')}
                                        className="flex items-center gap-2 px-3 py-1.5 rounded bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white transition text-xs font-bold border border-blue-600/30"
                                    >
                                        <ThumbsUp size={14} /> Approve
                                    </button>
                                )}

                                <div className="flex items-center bg-black/40 rounded-lg border border-white/5 p-1 gap-1">
                                    <button
                                        onClick={() => handleStatusUpdate(req.id, 'processing')}
                                        title="Mark as Processing" // Looking for source
                                        className={`p-2 rounded transition-colors ${req.status === 'processing' ? 'bg-blue-500 text-white' : 'hover:bg-blue-500/20 text-blue-500'}`}
                                    >
                                        <Clock size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleStatusUpdate(req.id, 'fulfilled')}
                                        title="Mark as Fulfilled"
                                        className={`p-2 rounded transition-colors ${req.status === 'fulfilled' ? 'bg-green-500 text-white' : 'hover:bg-green-500/20 text-green-500'}`}
                                    >
                                        <CheckCircle size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleStatusUpdate(req.id, 'rejected')}
                                        title="Reject Request"
                                        className={`p-2 rounded transition-colors ${req.status === 'rejected' ? 'bg-red-500 text-white' : 'hover:bg-red-500/20 text-red-500'}`}
                                    >
                                        <XCircle size={16} />
                                    </button>
                                </div>

                                <div className="w-px h-6 bg-white/10 mx-1" />

                                <button
                                    onClick={() => togglePriority(req)}
                                    title="Toggle Priority"
                                    className={`p-2 rounded transition-colors ${req.priority === 'high' ? 'text-red-500 bg-red-500/10' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                                >
                                    <Flag size={16} fill={req.priority === 'high' ? "currentColor" : "none"} />
                                </button>

                                <button
                                    onClick={() => handleUpdateNote(req.id, req.adminNote)}
                                    title="Edit Admin Note"
                                    className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded transition"
                                >
                                    <MessageSquare size={16} />
                                </button>

                                <button
                                    onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(req.contentTitle + ' movie series watch online')}`, '_blank')}
                                    title="Search Web"
                                    className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded transition"
                                >
                                    <ExternalLink size={16} />
                                </button>

                                <button
                                    onClick={() => handleDelete(req.id)}
                                    title="Delete"
                                    className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded transition"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Status Progress Bar (Visual Flair) */}
                        <div className="h-0.5 w-full bg-white/5">
                            <div
                                className={`h-full transition-all duration-500 ${req.status === 'fulfilled' ? 'w-full bg-green-500' :
                                    req.status === 'processing' ? 'w-2/3 bg-blue-500' :
                                        req.status === 'approved' ? 'w-1/3 bg-purple-500' :
                                            req.status === 'rejected' ? 'w-full bg-red-900' : 'w-0'
                                    }`}
                            />
                        </div>
                    </div>
                ))}

                {filteredRequests.length === 0 && (
                    <div className="py-20 text-center flex flex-col items-center justify-center gap-4 bg-[#141414] border border-dashed border-white/10 rounded-2xl">
                        <div className="bg-white/5 p-4 rounded-full">
                            <MessageSquare size={32} className="text-gray-500" />
                        </div>
                        <div className="text-gray-400 font-medium">No content requests found</div>
                    </div>
                )}
            </div>
        </div>
    );
}
