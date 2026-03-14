import React, { useState } from 'react';
import { X, Lock, Check } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useNavigate } from 'react-router-dom';

interface UnlockContentModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const UnlockContentModal: React.FC<UnlockContentModalProps> = ({ isOpen, onClose }) => {
    const { unlockContent } = useStore();
    const navigate = useNavigate();
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            const result = await unlockContent(code);
            if (result.success) {
                setSuccess(result.message);
                setTimeout(() => {
                    onClose();
                    // Content is globally unlocked in context; UI will auto-refresh
                    window.location.reload(); // Optional: force refresh to ensure images load
                }, 1500);
            } else {
                setError(result.message);
            }
        } catch (err: any) {
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[300] bg-black/80 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-[#141414] border border-white/10 p-8 rounded-2xl max-w-md w-full relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                    <X size={24} />
                </button>

                <div className="text-center mb-8">
                    <div className="bg-brand-red/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock size={32} className="text-brand-red" />
                    </div>
                    <h2 className="text-2xl font-bold">Unlock Exclusive Content</h2>
                    <p className="text-gray-400 mt-2 text-sm">Enter your access code to reveal hidden movies and shows.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <input
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            placeholder="Enter Access Code"
                            className="w-full bg-black border border-white/20 rounded-lg px-4 py-3 text-center text-lg font-mono tracking-widest uppercase placeholder:normal-case placeholder:tracking-normal focus:border-brand-red outline-none transition"
                            autoFocus
                        />
                    </div>

                    {error && (
                        <div className="text-red-500 text-sm text-center bg-red-500/10 p-2 rounded">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="text-green-500 text-sm text-center bg-green-500/10 p-2 rounded flex items-center justify-center gap-2">
                            <Check size={16} /> {success}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !code}
                        className="w-full bg-white text-black font-bold py-3 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Verifying...' : 'Unlock Content'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default UnlockContentModal;
