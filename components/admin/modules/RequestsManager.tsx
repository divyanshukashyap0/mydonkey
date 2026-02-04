import React, { useState } from 'react';
import { useStore } from '../../../context/StoreContext';
import { Search, Filter, MessageSquare, CheckCircle, Clock, XCircle, ExternalLink, Calendar as CalendarIcon, User as UserIcon } from 'lucide-react';
import { ContentRequest } from '../../../types';

export default function RequestsManager() {
    const { contentRequests, updateContentRequest } = useStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'processing' | 'fulfilled' | 'rejected'>('all');

    const filteredRequests = contentRequests.filter(req => {
        const matchesSearch = req.contentTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
            req.userEmail.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = statusFilter === 'all' || req.status === statusFilter;
        return matchesSearch && matchesFilter;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
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
                    <p className="text-gray-400 text-sm">Manage shows and movies requested by users</p>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Requests', count: contentRequests.length, color: 'text-white' },
                    { label: 'Pending', count: contentRequests.filter(r => r.status === 'pending').length, color: 'text-yellow-500' },
                    { label: 'Fulfilled', count: contentRequests.filter(r => r.status === 'fulfilled').length, color: 'text-green-500' },
                    { label: 'Fulfilment Rate', count: contentRequests.length ? `${Math.round((contentRequests.filter(r => r.status === 'fulfilled').length / contentRequests.length) * 100)}%` : '0%', color: 'text-cyan-500' },
                ].map((stat, idx) => (
                    <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-4">
                        <div className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">{stat.label}</div>
                        <div className={`text-2xl font-black ${stat.color}`}>{stat.count}</div>
                    </div>
                ))}
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input
                        type="text"
                        placeholder="Search by title or user email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="text-gray-500" size={18} />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors cursor-pointer"
                    >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="fulfilled">Fulfilled</option>
                        <option value="rejected">Rejected</option>
                    </select>
                </div>
            </div>

            {/* Requests List */}
            <div className="space-y-4">
                {filteredRequests.map(req => (
                    <div key={req.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-all group">
                        <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors">{req.contentTitle}</h3>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border ${getStatusColor(req.status)}`}>
                                        {req.status}
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-gray-500">
                                    <div className="flex items-center gap-2">
                                        <UserIcon size={14} />
                                        <span>{req.userName} ({req.userEmail})</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CalendarIcon size={14} />
                                        <span>Request: {new Date(req.createdAt).toLocaleString()}</span>
                                    </div>
                                    {req.adminNote && (
                                        <div className="flex items-center gap-2 text-cyan-400">
                                            <MessageSquare size={14} />
                                            <span className="italic font-medium">{req.adminNote}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="flex bg-white/5 rounded-lg border border-white/10 p-1">
                                    <button
                                        onClick={() => handleStatusUpdate(req.id, 'fulfilled')}
                                        title="Mark as Fulfilled"
                                        className={`p-2 rounded transition-colors ${req.status === 'fulfilled' ? 'bg-green-500 text-white' : 'hover:bg-green-500/20 text-green-500'}`}
                                    >
                                        <CheckCircle size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleStatusUpdate(req.id, 'processing')}
                                        title="Mark as Processing"
                                        className={`p-2 rounded transition-colors ${req.status === 'processing' ? 'bg-blue-500 text-white' : 'hover:bg-blue-500/20 text-blue-500'}`}
                                    >
                                        <Clock size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleStatusUpdate(req.id, 'rejected')}
                                        title="Mark as Rejected"
                                        className={`p-2 rounded transition-colors ${req.status === 'rejected' ? 'bg-red-500 text-white' : 'hover:bg-red-500/20 text-red-500'}`}
                                    >
                                        <XCircle size={18} />
                                    </button>
                                </div>
                                <button
                                    onClick={() => handleUpdateNote(req.id, req.adminNote)}
                                    title="Edit Note"
                                    className="p-3 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition text-gray-400 hover:text-white"
                                >
                                    <MessageSquare size={18} />
                                </button>
                                <button
                                    onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(req.contentTitle + ' movie series watch online')}`, '_blank')}
                                    title="Search on Web"
                                    className="p-3 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition text-gray-400 hover:text-white"
                                >
                                    <ExternalLink size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {filteredRequests.length === 0 && (
                    <div className="p-20 text-center flex flex-col items-center justify-center gap-4 bg-white/5 border border-dashed border-white/10 rounded-2xl">
                        <MessageSquare size={48} className="text-gray-700" />
                        <div className="text-gray-500 font-medium text-lg">No content requests found</div>
                        <p className="text-gray-600 text-sm max-w-xs">Users can request shows from their Account Settings page.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
