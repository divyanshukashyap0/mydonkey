import React, { useState } from 'react';
import { Send, CheckCircle } from 'lucide-react';
import { useStore } from '../context/StoreContext';

interface ContentRequestInlineProps {
    className?: string;
    variant?: 'compact' | 'full';
}

const ContentRequestInline: React.FC<ContentRequestInlineProps> = ({ className = '', variant = 'full' }) => {
    const { submitContentRequest, isAuthenticated } = useStore();
    const [requestTitle, setRequestTitle] = useState('');
    const [isRequesting, setIsRequesting] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success'>('idle');

    const handleRequestSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!requestTitle.trim() || isRequesting) return;

        if (!isAuthenticated) {
            alert("Please sign in to make a request.");
            return;
        }

        setIsRequesting(true);
        try {
            await submitContentRequest(requestTitle.trim());
            setStatus('success');
            setRequestTitle('');

            // Reset status after 3 seconds
            setTimeout(() => setStatus('idle'), 3000);
        } catch (error: any) {
            alert("Failed to submit request: " + error.message);
        } finally {
            setIsRequesting(false);
        }
    };

    return (
        <div className={`rounded-xl overflow-hidden border border-white/10 shadow-2xl relative ${className}`}>
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e] to-[#16213e] z-0" />

            {/* Content */}
            <div className="relative z-10 p-5 md:p-6">
                <div className="flex items-center gap-3 mb-2">
                    <span className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.2em] bg-cyan-500/10 px-2 py-1 rounded">Request Content</span>
                </div>

                <h3 className="text-xl font-bold text-white mb-1">Didn't find what you wanted?</h3>
                <p className="text-sm text-gray-400 mb-6 max-w-lg">
                    Tell us the show or movie title. Our team ensures that in <span className="text-cyan-400 font-bold">48 hours</span> content will be there!
                </p>

                <form onSubmit={handleRequestSubmit} className="flex gap-2 max-w-xl">
                    <input
                        type="text"
                        value={requestTitle}
                        onChange={(e) => setRequestTitle(e.target.value)}
                        placeholder="Enter show or movie name..."
                        className="flex-1 bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors text-white placeholder-gray-500"
                        required
                    />
                    <button
                        type="submit"
                        disabled={isRequesting || status === 'success'}
                        className={`px-5 py-3 rounded-lg flex items-center gap-2 transition font-bold text-sm uppercase tracking-wider shadow-lg ${status === 'success'
                                ? 'bg-green-500 text-white cursor-default'
                                : 'bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 text-white shadow-cyan-600/20'
                            }`}
                    >
                        {isRequesting ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : status === 'success' ? (
                            <>
                                <CheckCircle size={18} />
                                <span className="hidden sm:inline">Sent</span>
                            </>
                        ) : (
                            <>
                                <Send size={18} />
                                <span className="hidden sm:inline">Submit</span>
                            </>
                        )}
                    </button>
                </form>
                <p className="mt-4 text-[10px] text-gray-500 italic">"Our team will try hard to get requested content for you."</p>
            </div>
        </div>
    );
};

export default ContentRequestInline;
