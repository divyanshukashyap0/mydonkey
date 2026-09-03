import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { useNavigate } from 'react-router-dom';
import { Send, Film, Tv, MessageSquare, CheckCircle, AlertCircle, Play } from 'lucide-react';
import { Content } from '../types';

const RequestContent = () => {
    const { submitContentRequest, isAuthenticated, content } = useStore();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        title: '',
        type: 'movie',
        language: '',
        message: ''
    });
    const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [matches, setMatches] = useState<Content[]>([]);

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setFormData({ ...formData, title: val });

        if (val.length > 2 && content) {
            const found = content.filter(c => c.title.toLowerCase().includes(val.toLowerCase()));
            setMatches(found.slice(0, 3));
        } else {
            setMatches([]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isAuthenticated) {
            navigate('/auth'); // Redirect to login if not authenticated
            return;
        }

        if (!formData.title.trim()) {
            setStatus('error');
            setErrorMessage('Content title is required');
            return;
        }

        setStatus('submitting');
        setErrorMessage('');

        try {
            // Combine fields into a detailed request string strictly for human reading in admin
            // ideally we would save these strictly but the store method just takes title.
            // Let's format the title to include details for now until we expand the store method,
            // or just rely on the 'title' field being flexible.
            // Actually, looking at store, it takes just title.
            // Let's append details to title for now to be safe without changing store signature heavily yet.
            const fullTitle = `${formData.title} (${formData.type} - ${formData.language || 'Any'}) ${formData.message ? ` - Note: ${formData.message}` : ''}`;

            await submitContentRequest(fullTitle);
            setStatus('success');
            setFormData({ title: '', type: 'movie', language: '', message: '' });
        } catch (error: any) {
            console.error(error);
            setStatus('error');
            setErrorMessage('Failed to submit request. Please try again.');
        }
    };

    if (status === 'success') {
        return (
            <div className="min-h-screen pt-24 px-4 flex items-center justify-center bg-[#141414]">
                <div className="max-w-md w-full bg-[#181818] p-8 rounded-2xl border border-green-500/20 text-center animate-in zoom-in-95">
                    <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle size={32} className="text-green-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Request Received!</h2>
                    <p className="text-gray-400 mb-8">
                        Thank you for your suggestion. We'll review it and try to add it to our library soon.
                    </p>
                    <button
                        onClick={() => setStatus('idle')}
                        className="px-6 py-2 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition"
                    >
                        Submit Another
                    </button>
                    <button
                        onClick={() => navigate('/')}
                        className="block w-full mt-4 text-sm text-gray-500 hover:text-white"
                    >
                        Return Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-24 pb-12 px-4 flex flex-col items-center justify-center relative z-10">
            <div className="max-w-xl w-full">
                <div className="text-center mb-10">
                    <h1 className="text-3xl md:text-5xl font-black text-white mb-4">Request Content</h1>
                    <p className="text-gray-400 text-lg">
                        Can't find what you're looking for? Let us know!
                    </p>
                </div>

                <div className="bg-[#181818] border border-white/10 rounded-2xl p-6 md:p-10 shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-6">

                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                                Movie or Show Title <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={handleTitleChange}
                                placeholder="e.g. Inception, Breaking Bad"
                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-red-600 focus:outline-none transition-colors placeholder-gray-600"
                            />
                            {matches.length > 0 && (
                                <div className="mt-2 space-y-2 animate-in slide-in-from-top-2">
                                    <p className="text-xs font-bold text-green-400 uppercase tracking-widest flex items-center gap-2">
                                        <CheckCircle size={12} /> Desired content is already available:
                                    </p>
                                    {matches.map(match => (
                                        <div key={match.id} className="flex items-center gap-3 bg-white/5 p-2 rounded-lg border border-green-500/30 hover:bg-white/10 transition">
                                            <img src={match.poster_path} className="w-10 h-14 object-cover rounded bg-gray-800" alt={match.title} />
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-sm text-white line-clamp-1">{match.title}</h4>
                                                <div className="flex items-center gap-2 text-[10px] text-gray-400">
                                                    <span>{match.release_date?.split('-')[0] || 'N/A'}</span>
                                                    <span className="border border-white/20 px-1 rounded">{match.type === 'movie' ? 'Movie' : 'TV'}</span>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => navigate(`/browse/${match.id}`, { state: { item: match } })} // Fixed route to match AppNew.tsx
                                                className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-green-500 flex items-center gap-1"
                                            >
                                                <Play size={12} fill="currentColor" /> Play
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                                    Type
                                </label>
                                <div className="flex bg-black/50 rounded-xl p-1 border border-white/10">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, type: 'movie' })}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${formData.type === 'movie' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                                    >
                                        <Film size={14} /> Movie
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, type: 'series' })}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${formData.type === 'series' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                                    >
                                        <Tv size={14} /> Series
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                                    Language (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={formData.language}
                                    onChange={e => setFormData({ ...formData, language: e.target.value })}
                                    placeholder="e.g. English, Hindi"
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-red-600 focus:outline-none transition-colors placeholder-gray-600"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                                Additional Message (Optional)
                            </label>
                            <textarea
                                value={formData.message}
                                onChange={e => setFormData({ ...formData, message: e.target.value })}
                                placeholder="Any specific details, year, or season?"
                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-red-600 focus:outline-none transition-colors placeholder-gray-600 min-h-[100px]"
                            />
                        </div>

                        {status === 'error' && (
                            <div className="flex items-center gap-2 text-red-500 text-sm bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                                <AlertCircle size={16} />
                                {errorMessage}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={status === 'submitting'}
                            className="w-full py-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {status === 'submitting' ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Send size={18} /> Submit Request
                                </>
                            )}
                        </button>

                    </form>
                </div>
            </div>
        </div>
    );
};

export default RequestContent;
