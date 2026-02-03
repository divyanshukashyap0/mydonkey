import React, { useState } from 'react';
import { Monitor, Smartphone, CheckCircle, Loader, Laptop } from 'lucide-react';

interface ActivateDeviceProps {
    onBack: () => void;
}

const ActivateDevice: React.FC<ActivateDeviceProps> = ({ onBack }) => {
    const [code, setCode] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Allow only alphanumeric, uppercase
        const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (val.length <= 8) {
            setCode(val);
        }
    };

    const handleActivate = () => {
        if (code.length !== 8) return;
        setStatus('loading');
        
        // Mock API call to verify code
        setTimeout(() => {
            setStatus('success');
        }, 2000);
    };

    return (
        <div className="min-h-screen pt-32 px-4 flex flex-col items-center max-w-2xl mx-auto text-center animate-in fade-in slide-in-from-bottom-4">
            <h1 className="text-3xl md:text-5xl font-black mb-6">Connect a Device</h1>
            <p className="text-gray-400 text-lg mb-12 max-w-lg">
                Enter the 8-digit code displayed on your TV or streaming device screen to log in instantly.
            </p>

            {status === 'success' ? (
                <div className="bg-green-900/20 border border-green-500/30 rounded-2xl p-8 w-full animate-in zoom-in duration-300">
                    <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle size={40} className="text-green-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Device Connected!</h2>
                    <p className="text-gray-300 mb-8">Your TV is now ready to stream. You can close this page and start watching.</p>
                    <button 
                        onClick={onBack} 
                        className="bg-white text-black px-8 py-3 rounded-lg font-bold hover:bg-gray-200 transition"
                    >
                        Back to Home
                    </button>
                </div>
            ) : (
                <div className="w-full space-y-8 bg-[#141414] p-8 md:p-12 rounded-2xl border border-white/5 shadow-2xl">
                     <div className="relative">
                         <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Activation Code</label>
                         <input 
                            type="text" 
                            value={code}
                            onChange={handleChange}
                            className="w-full bg-black border-2 border-white/10 focus:border-brand-red rounded-xl p-4 md:p-6 text-center text-4xl md:text-5xl font-mono tracking-[0.2em] md:tracking-[0.5em] outline-none transition-all uppercase placeholder-white/5 text-white"
                            placeholder="________"
                         />
                     </div>

                     <button 
                        onClick={handleActivate}
                        disabled={code.length !== 8 || status === 'loading'}
                        className={`w-full py-4 rounded-xl font-bold text-xl transition-all flex items-center justify-center gap-3 ${
                            code.length === 8 
                            ? 'bg-brand-red text-white hover:bg-red-700 shadow-lg shadow-brand-red/20 scale-100' 
                            : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                        }`}
                     >
                         {status === 'loading' ? (
                             <>
                                <Loader className="animate-spin" /> Connecting...
                             </>
                         ) : 'Activate Device'}
                     </button>
                     
                     {status === 'error' && (
                         <p className="text-red-500 text-sm">Invalid code. Please try again.</p>
                     )}
                </div>
            )}
            
            <div className="mt-12 grid grid-cols-3 gap-8 text-gray-500">
                <div className="flex flex-col items-center gap-3">
                     <Monitor size={24} />
                     <span className="text-xs font-bold uppercase tracking-wider">Smart TV</span>
                </div>
                <div className="flex flex-col items-center gap-3">
                     <Laptop size={24} />
                     <span className="text-xs font-bold uppercase tracking-wider">Laptop</span>
                </div>
                <div className="flex flex-col items-center gap-3">
                     <Smartphone size={24} />
                     <span className="text-xs font-bold uppercase tracking-wider">Console</span>
                </div>
            </div>
        </div>
    )
}

export default ActivateDevice;