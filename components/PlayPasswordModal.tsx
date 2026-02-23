import React, { useState, useEffect, useRef } from 'react';
import { Lock, Eye, EyeOff, X } from 'lucide-react';

interface PlayPasswordModalProps {
    contentTitle: string;
    onConfirm: () => void;
    onCancel: () => void;
    correctPassword: string; // This is the profile name
}

const PlayPasswordModal: React.FC<PlayPasswordModalProps> = ({ contentTitle, onConfirm, onCancel, correctPassword }) => {
    const [input, setInput] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [shake, setShake] = useState(false);
    const [error, setError] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setTimeout(() => inputRef.current?.focus(), 100);
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim().toLowerCase() === correctPassword.trim().toLowerCase()) {
            onConfirm();
        } else {
            setError('Incorrect password. Enter your profile name.');
            setShake(true);
            setInput('');
            setTimeout(() => setShake(false), 600);
        }
    };

    return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className={`relative bg-[#181818] border border-white/10 rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-6 ${shake ? 'animate-shake' : ''}`}>
                {/* Close */}
                <button
                    onClick={onCancel}
                    className="absolute top-4 right-4 text-gray-500 hover:text-white transition"
                >
                    <X size={20} />
                </button>

                {/* Icon */}
                <div className="w-16 h-16 rounded-full bg-brand-red/10 border border-brand-red/30 flex items-center justify-center">
                    <Lock size={28} className="text-brand-red" />
                </div>

                {/* Text */}
                <div className="text-center">
                    <h2 className="text-xl font-bold text-white">Enter Password to Watch</h2>
                    <p className="text-gray-400 text-sm mt-2 line-clamp-1">
                        <span className="text-white font-semibold">{contentTitle}</span>
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="w-full space-y-4">
                    <div className="relative">
                        <input
                            ref={inputRef}
                            type={showPassword ? 'text' : 'password'}
                            value={input}
                            onChange={(e) => { setInput(e.target.value); setError(''); }}
                            placeholder="Enter profile name..."
                            className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 outline-none focus:border-brand-red/50 transition pr-12 text-center text-lg tracking-widest"
                            autoComplete="off"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>

                    {error && (
                        <p className="text-red-400 text-xs text-center animate-in fade-in">{error}</p>
                    )}

                    <button
                        type="submit"
                        disabled={!input.trim()}
                        className="w-full py-3 bg-brand-red hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all active:scale-95"
                    >
                        Watch Now
                    </button>
                </form>
            </div>
        </div>
    );
};

export default PlayPasswordModal;
