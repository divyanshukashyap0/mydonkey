import React, { useState } from 'react';
import { ArrowRight, Apple } from 'lucide-react';
import { useStore } from '../context/StoreContext';

const LoginPage = () => {
    const { login, signup, loginWithGoogle, loginWithApple } = useStore();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [step, setStep] = useState<'email' | 'password'>('email');
    const [isSignUp, setIsSignUp] = useState(false);
    const [error, setError] = useState('');

    const handleContinue = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (step === 'email' && email) {
            setStep('password');
        } else if (step === 'password' && password) {
            try {
                if (isSignUp) {
                    await signup(email, password);
                } else {
                    await login(email, password);
                }
            } catch (err: any) {
                console.error(err);
                setError(err.message || 'Authentication failed. Check your credentials.');
            }
        }
    };

    return (
        <div className="min-h-screen w-full relative flex items-center justify-center overflow-hidden bg-black font-sans text-white">

            {/* Background Image with Heavy Blur (Apple TV Style) */}
            <div className="absolute inset-0 z-0">
                <img
                    src="/login_bg.png"
                    className="w-full h-full object-cover scale-110 blur-2xl opacity-60"
                    alt="background"
                />
                <div className="absolute inset-0 bg-black/40" />
            </div>

            {/* Login Card */}
            <div className="relative z-10 w-full max-w-md p-8 md:p-12 animate-in fade-in zoom-in-95 duration-500">

                <div className="flex flex-col items-center mb-10">
                    <div className="mb-6 flex items-center justify-center">
                        <img src="https://res.cloudinary.com/dpba1gvra/image/upload/v1770155013/logo_mgcysp.png" className="h-20 w-auto object-contain drop-shadow-2xl" alt="MY DONKEY Logo" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2 text-center">
                        {isSignUp ? 'Create ID' : 'Sign In'}
                    </h1>
                    <p className="text-gray-300 text-sm text-center">Your gateway to the next generation of streaming.</p>
                </div>

                <form onSubmit={handleContinue} className="space-y-4">
                    <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden shadow-lg transition-all focus-within:ring-2 focus-within:ring-white/50">
                        <div className="p-4 border-b border-white/10">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Email</label>
                            <input
                                type="email"
                                autoFocus
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={step === 'password'}
                                className="w-full bg-transparent outline-none text-xl font-medium placeholder-gray-500"
                                placeholder="name@example.com"
                            />
                        </div>

                        {step === 'password' && (
                            <div className="p-4 animate-in slide-in-from-top-2">
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Password</label>
                                <input
                                    type="password"
                                    autoFocus
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-transparent outline-none text-xl font-medium placeholder-gray-500"
                                    placeholder="••••••••"
                                />
                            </div>
                        )}
                    </div>

                    {error && <div className="text-red-500 text-xs text-center">{error}</div>}

                    <button
                        type="submit"
                        className="w-full bg-white text-black py-4 rounded-xl font-bold text-lg hover:bg-gray-200 transition-transform active:scale-95 shadow-xl flex items-center justify-center gap-2"
                    >
                        {step === 'email' ? 'Continue' : (isSignUp ? 'Create Account' : 'Sign In')} <ArrowRight size={20} />
                    </button>
                </form>

                <div className="mt-8 flex flex-col gap-4">
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/20"></div></div>
                        <div className="relative flex justify-center text-xs uppercase"><span className="bg-transparent px-2 text-gray-400 backdrop-blur-sm">Or sign in with</span></div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={async () => {
                                try {
                                    await loginWithApple();
                                } catch (err: any) {
                                    setError(err.message);
                                }
                            }}
                            className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/15 border border-white/10 rounded-lg py-3 transition text-sm font-medium"
                        >
                            <Apple size={18} /> Apple
                        </button>
                        <button
                            onClick={async () => {
                                try {
                                    await loginWithGoogle();
                                } catch (err: any) {
                                    setError(err.message);
                                }
                            }}
                            className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/15 border border-white/10 rounded-lg py-3 transition text-sm font-medium"
                        >
                            <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center text-black font-bold text-[10px]">G</div> Google
                        </button>
                    </div>

                    <div className="text-center mt-4">
                        {step === 'password' ? (
                            <button onClick={() => { setStep('email'); setEmail(''); setPassword(''); }} className="text-sm text-gray-400 hover:text-white transition">
                                Use a different email
                            </button>
                        ) : (
                            <button onClick={() => setIsSignUp(!isSignUp)} className="text-sm text-gray-400 hover:text-white transition">
                                {isSignUp ? 'Already have an account? Sign In' : 'Create new My Donkey ID'}
                            </button>
                        )}
                        <span className="mx-2 text-gray-600">|</span>
                        <a href="#" className="text-sm text-gray-400 hover:text-white transition">Forgot Password?</a>
                    </div>
                </div>
            </div>

            <div className="absolute bottom-6 text-xs text-gray-500">
                &copy; 2024 My Donkey Inc. All rights reserved.
            </div>
        </div>
    );
};

export default LoginPage;