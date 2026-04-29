import React, { useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useStore } from '../context/StoreContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';

const MobileScannerPage = () => {
    const { currentUser, isAuthenticated } = useStore();
    const navigate = useNavigate();
    const location = useLocation();
    const [scannedSession, setScannedSession] = useState<string | null>(null);
    const [status, setStatus] = useState<'scanning' | 'confirming' | 'success' | 'error'>('scanning');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        console.log("Scanner Page Info:", {
            isAuthenticated,
            hasUser: !!currentUser,
            uid: currentUser?.uid,
            search: location.search
        });
        
        const params = new URLSearchParams(location.search);
        const urlSessionId = params.get('sessionId');
        
        if (urlSessionId && isAuthenticated && currentUser) {
            console.log("🎯 Session ID detected in URL, switching to confirmation:", urlSessionId);
            setScannedSession(urlSessionId);
            setStatus('confirming');
        }
    }, [currentUser, isAuthenticated, location]);

    // If not authenticated, require login first
    if (!isAuthenticated || !currentUser) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white text-center">
                <h2 className="text-2xl font-bold mb-4">Login Required</h2>
                <p className="mb-6 text-gray-400">You must be logged in on this device to approve a QR login.</p>
                <button 
                    onClick={() => navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`)} 
                    className="bg-white text-black px-6 py-3 rounded-xl font-bold transition-transform active:scale-95"
                >
                    Go to Login
                </button>
            </div>
        );
    }

    const handleScan = async (text: string) => {
        console.log("Scanned text:", text);
        if (!text || status !== 'scanning') return;
        
        try {
            // Handle both URL and raw JSON
            let sessionId = '';
            if (text.includes('?sessionId=')) {
                const url = new URL(text);
                sessionId = url.searchParams.get('sessionId') || '';
            } else {
                try {
                    const data = JSON.parse(text);
                    sessionId = data.sessionId;
                } catch (e) {
                    sessionId = text;
                }
            }

            if (sessionId && sessionId.length > 20) { // UUID length check
                console.log("Session ID found:", sessionId);
                setScannedSession(sessionId);
                setStatus('confirming');
            } else {
                console.warn("Invalid session ID format:", text);
                setStatus('error');
                setErrorMessage('Invalid QR Code. Please scan a valid My Donkey login code.');
            }
        } catch (err) {
            console.error("Scan error:", err);
            setStatus('error');
            setErrorMessage('Invalid QR format.');
        }
    };

    const approveLogin = async () => {
        if (!scannedSession) return;
        
        try {
            const sessionRef = doc(db, 'qr_sessions', scannedSession);
            const sessionSnap = await getDoc(sessionRef);
            
            if (!sessionSnap.exists()) {
                throw new Error("Session not found.");
            }
            
            const sessionData = sessionSnap.data();
            if (sessionData.status !== 'pending') {
                throw new Error(`Session is already ${sessionData.status}.`);
            }
            
            // Check expiration
            if (sessionData.expiresAt.toMillis() < Date.now()) {
                throw new Error("Session expired. Please refresh the QR code on the TV/Web.");
            }

            // Update to approved
            await updateDoc(sessionRef, {
                status: 'approved',
                userId: currentUser.uid,
                deviceName: navigator.userAgent.includes('Mobile') ? 'Mobile App' : 'Web Browser',
            });
            
            setStatus('success');
        } catch (err: any) {
            console.error("Error approving login:", err);
            setStatus('error');
            setErrorMessage(err.message || 'Failed to approve login. Please try again.');
        }
    };

    const resetScanner = () => {
        setScannedSession(null);
        setStatus('scanning');
        setErrorMessage('');
    };

    return (
        <div className="min-h-screen bg-black text-white flex flex-col">
            <div className="p-4 flex items-center border-b border-white/10 bg-black/50 sticky top-0 z-10">
                <button onClick={() => navigate('/')} className="p-2 -ml-2 text-gray-400 hover:text-white">
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-xl font-bold ml-2">Scan to Login</h1>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-6">
                {status === 'scanning' && (
                    <div className="w-full max-w-md flex flex-col items-center">
                        <div className="w-full aspect-square rounded-2xl overflow-hidden bg-gray-900 border-4 border-white/10 shadow-2xl relative">
                            <Scanner 
                                onResult={(result) => {
                                    console.log("Scanner result received:", result);
                                    if (result && result.length > 0) {
                                        const text = result[0].rawValue;
                                        handleScan(text);
                                    }
                                }}
                                onError={(error) => {
                                    console.error("Scanner Error (Direct):", error);
                                }}
                            />
                            {/* Overlay for aesthetic scanning effect */}
                            <div className="absolute inset-0 border-2 border-brand-red opacity-50 z-10 pointer-events-none rounded-xl m-8"></div>
                            <div className="absolute top-0 left-0 right-0 h-1 bg-brand-red opacity-80 animate-scan z-10"></div>
                        </div>
                        <p className="mt-8 text-center text-gray-400">Point your camera at the QR code displayed on the web or TV to log in automatically.</p>
                        
                        {/* Manual Fallback */}
                        <div className="mt-12 w-full pt-8 border-t border-white/10">
                            <p className="text-sm text-gray-500 mb-4 text-center">Camera not working? Enter the ID manually:</p>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    placeholder="Enter Session ID" 
                                    className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-sm"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleScan((e.target as HTMLInputElement).value);
                                        }
                                    }}
                                />
                                <button 
                                    onClick={(e) => {
                                        const input = e.currentTarget.previousSibling as HTMLInputElement;
                                        handleScan(input.value);
                                    }}
                                    className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm font-bold"
                                >
                                    Sync
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {status === 'confirming' && (
                    <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-2xl p-8 flex flex-col items-center text-center animate-in fade-in zoom-in">
                        <div className="w-16 h-16 bg-blue-500/20 text-blue-500 rounded-full flex items-center justify-center mb-6">
                            <CheckCircle2 size={32} />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Confirm Login</h2>
                        <p className="text-gray-400 mb-8">Do you want to sign in as <strong>{currentUser?.email}</strong> on the new device?</p>
                        
                        <div className="flex flex-col gap-3 w-full">
                            <button 
                                onClick={approveLogin} 
                                className="w-full bg-brand-red text-white py-4 rounded-xl font-bold text-lg hover:bg-brand-red/90 transition-colors shadow-lg shadow-brand-red/20"
                            >
                                Approve Login
                            </button>
                            <button 
                                onClick={resetScanner} 
                                className="w-full bg-transparent border border-white/20 text-white py-4 rounded-xl font-bold text-lg hover:bg-white/5 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {status === 'success' && (
                    <div className="w-full max-w-md bg-white/5 border border-green-500/30 rounded-2xl p-8 flex flex-col items-center text-center animate-in fade-in zoom-in">
                        <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                            <CheckCircle2 size={40} />
                        </div>
                        <h2 className="text-2xl font-bold mb-2 text-white">Login Approved!</h2>
                        <p className="text-gray-400 mb-8">The other device should now be logged in. You can close this screen.</p>
                        
                        <button 
                            onClick={() => navigate('/')} 
                            className="w-full bg-white text-black py-4 rounded-xl font-bold text-lg hover:bg-gray-200 transition-colors shadow-xl"
                        >
                            Return to Home
                        </button>
                    </div>
                )}

                {status === 'error' && (
                    <div className="w-full max-w-md bg-white/5 border border-red-500/30 rounded-2xl p-8 flex flex-col items-center text-center animate-in fade-in zoom-in">
                        <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-6">
                            <XCircle size={32} />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Scan Failed</h2>
                        <p className="text-gray-400 mb-8">{errorMessage}</p>
                        
                        <button 
                            onClick={resetScanner} 
                            className="w-full bg-white/10 text-white py-4 rounded-xl font-bold text-lg hover:bg-white/20 transition-colors border border-white/10"
                        >
                            Try Again
                        </button>
                    </div>
                )}
            </div>
            
            {/* Add custom CSS for the scan animation inline for simplicity */}
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes scan {
                    0%, 100% { top: 10%; }
                    50% { top: 90%; }
                }
                .animate-scan {
                    animation: scan 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
                }
            `}} />
        </div>
    );
};

export default MobileScannerPage;
