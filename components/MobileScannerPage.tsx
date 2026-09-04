import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useStore } from '../context/StoreContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, XCircle, Loader2, Sparkles, Scan } from 'lucide-react';

const MobileScannerPage = () => {
    const { currentUser, isAuthenticated, isLoading } = useStore();
    const navigate = useNavigate();
    const location = useLocation();
    const manualInputRef = useRef<HTMLInputElement>(null);
    const [scannedSession, setScannedSession] = useState<string | null>(null);
    const [status, setStatus] = useState<'scanning' | 'captured' | 'confirming' | 'success' | 'error'>('scanning');
    const [errorMessage, setErrorMessage] = useState('');
    const [loading, setLoading] = useState(false);

    // Audio chirp synthesizer for camera shutter / scanner lock-on
    const playCaptureChirp = () => {
        try {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioCtx) {
                const ctx = new AudioCtx();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(880, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.12);
                gain.gain.setValueAtTime(0.12, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + 0.15);
            }
        } catch (_) {}
    };

    // Detect if accessed from a desktop PC without touch or direct session link
    const isPC = useMemo(() => {
        if (typeof window === 'undefined') return false;
        // Never treat as blocked PC if direct sessionId is provided in URL (e.g. from camera scan)
        const params = new URLSearchParams(window.location.search);
        if (params.get('sessionId')) return false;

        const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(navigator.userAgent);
        return !isMobileUA && !isTouch;
    }, []);

    // If opened on PC without camera intent, automatically navigate back to previous page
    useEffect(() => {
        if (isPC) {
            const hasHistory = (window.history.state && typeof window.history.state.idx === 'number' && window.history.state.idx > 0) || (window.history.length > 1 && !!document.referrer);
            if (hasHistory) {
                navigate(-1);
            } else {
                navigate('/', { replace: true });
            }

            const fallbackTimer = setTimeout(() => {
                if (window.location.pathname === '/scan') {
                    navigate('/', { replace: true });
                }
            }, 300);

            return () => clearTimeout(fallbackTimer);
        }
    }, [isPC, navigate]);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const urlSessionId = params.get('sessionId');
        
        if (urlSessionId && isAuthenticated && currentUser) {
            setScannedSession(urlSessionId);
            setStatus('confirming');
        } else if (params.get('mode') === 'manual') {
            setTimeout(() => {
                manualInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                manualInputRef.current?.focus();
            }, 300);
        }
    }, [currentUser, isAuthenticated, location]);

    // Don't render scanner on pure PC without touch/sessionId
    if (isPC) {
        return null;
    }

    // Wait for auth initialization
    if (isLoading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-brand-red animate-spin" />
            </div>
        );
    }

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
        const cleanedText = text.trim();
        if (!cleanedText || status !== 'scanning') return;
        
        try {
            let sessionId = '';

            // 1. Direct query parameter regex match (handles full URLs, partial URLs, with or without protocol)
            const paramMatch = cleanedText.match(/sessionId=([0-9]{6})/i);
            if (paramMatch) {
                sessionId = paramMatch[1];
            } else if (/^\d{6}$/.test(cleanedText)) {
                // 2. Direct 6-digit numeric ID
                sessionId = cleanedText;
            } else if (cleanedText.startsWith('{')) {
                // 3. JSON payload
                try {
                    const data = JSON.parse(cleanedText);
                    sessionId = String(data.sessionId || '').trim();
                } catch (e) {
                    sessionId = cleanedText;
                }
            } else {
                // 4. URL fallback
                try {
                    const urlStr = cleanedText.startsWith('http') ? cleanedText : `https://${cleanedText}`;
                    const url = new URL(urlStr);
                    sessionId = url.searchParams.get('sessionId') || '';
                } catch (_) {
                    sessionId = cleanedText;
                }
            }

            sessionId = sessionId.trim();

            if (sessionId && /^\d{6}$/.test(sessionId)) {
                setScannedSession(sessionId);
                setStatus('captured');
                playCaptureChirp();

                // Haptic feedback on supported mobile devices
                if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                    try {
                        navigator.vibrate([40, 60, 40]);
                    } catch (_) {}
                }

                // Smooth display of capture animation before showing confirmation
                setTimeout(() => {
                    setStatus('confirming');
                }, 850);
            } else {
                setStatus('error');
                setErrorMessage('Invalid QR Code. Please ensure the QR code is clearly visible, or enter the 6-digit ID below.');
            }
        } catch (err) {
            console.error("Scan error:", err);
            setStatus('error');
            setErrorMessage('Something went wrong. Please try again.');
        }
    };

    const approveLogin = async () => {
        if (!scannedSession || !currentUser) return;
        
        setLoading(true);
        try {
            const response = await fetch('/api/approve-qr', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sessionId: scannedSession,
                    userId: currentUser.uid,
                    deviceName: navigator.userAgent.includes('Mobile') ? 'Mobile App' : 'Web Browser'
                })
            });

            let errData: any = {};
            if (!response.ok) {
                const text = await response.text();
                try {
                    errData = JSON.parse(text);
                } catch (e) {
                    errData = { error: text || 'Unknown server error' };
                }
                throw new Error(errData.error || 'Failed to approve login');
            }

            setStatus('success');
            setTimeout(() => navigate('/'), 2000);
        } catch (err: any) {
            console.error("Approval error:", err);
            setStatus('error');
            setErrorMessage(err.message || 'Failed to approve login. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const resetScanner = () => {
        setScannedSession(null);
        setStatus('scanning');
        setErrorMessage('');
    };

    return (
        <div className="min-h-screen bg-black text-white flex flex-col">
            <div className="p-4 flex items-center border-b border-white/10 bg-black/50 sticky top-0 z-10 backdrop-blur-md">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors" aria-label="Go back">
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-xl font-bold ml-2">Scan to Login</h1>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-6">
                {(status === 'scanning' || status === 'captured') && (
                    <div className="w-full max-w-md flex flex-col items-center">
                        <div className="w-full aspect-square max-w-[360px] rounded-3xl overflow-hidden bg-gray-950 border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative flex items-center justify-center">
                            <Scanner 
                                onScan={(detectedCodes) => {
                                    if (detectedCodes && detectedCodes.length > 0) {
                                        const text = detectedCodes[0]?.rawValue;
                                        if (text) {
                                            handleScan(text);
                                        }
                                    }
                                }}
                                onError={(error) => {
                                    console.error("Scanner Error (Direct):", error);
                                }}
                                components={{
                                    finder: false,
                                }}
                                styles={{
                                    container: { width: '100%', height: '100%' },
                                    video: { objectFit: 'cover', width: '100%', height: '100%' }
                                }}
                            />

                            {/* Vignette mask around central target */}
                            <div className="absolute inset-0 pointer-events-none z-10 bg-[radial-gradient(ellipse_at_center,_transparent_45%,_rgba(0,0,0,0.7)_85%)]" />

                            {/* Viewfinder Target HUD Box */}
                            <div className="absolute w-[240px] h-[240px] sm:w-[270px] sm:h-[270px] pointer-events-none z-20 flex items-center justify-center">
                                {/* 4 Precision HUD Corners with dynamic glow & snap on capture */}
                                <div className={`absolute top-0 left-0 w-8 h-8 sm:w-10 sm:h-10 border-t-[3.5px] border-l-[3.5px] rounded-tl-xl transition-all duration-300 ${status === 'captured' ? 'border-emerald-400 scale-95 shadow-[0_0_25px_#10b981]' : 'border-brand-red shadow-[0_0_15px_rgba(229,9,20,0.8)]'}`} />
                                <div className={`absolute top-0 right-0 w-8 h-8 sm:w-10 sm:h-10 border-t-[3.5px] border-r-[3.5px] rounded-tr-xl transition-all duration-300 ${status === 'captured' ? 'border-emerald-400 scale-95 shadow-[0_0_25px_#10b981]' : 'border-brand-red shadow-[0_0_15px_rgba(229,9,20,0.8)]'}`} />
                                <div className={`absolute bottom-0 left-0 w-8 h-8 sm:w-10 sm:h-10 border-b-[3.5px] border-l-[3.5px] rounded-bl-xl transition-all duration-300 ${status === 'captured' ? 'border-emerald-400 scale-95 shadow-[0_0_25px_#10b981]' : 'border-brand-red shadow-[0_0_15px_rgba(229,9,20,0.8)]'}`} />
                                <div className={`absolute bottom-0 right-0 w-8 h-8 sm:w-10 sm:h-10 border-b-[3.5px] border-r-[3.5px] rounded-br-xl transition-all duration-300 ${status === 'captured' ? 'border-emerald-400 scale-95 shadow-[0_0_25px_#10b981]' : 'border-brand-red shadow-[0_0_15px_rgba(229,9,20,0.8)]'}`} />

                                {/* Center crosshair alignment marks */}
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-[2px] bg-white/40" />
                                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-[2px] bg-white/40" />
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[2px] bg-white/40" />
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 h-4 w-[2px] bg-white/40" />

                                {/* Scanning Laser Beam with Light Curtain (Active when searching) */}
                                {status === 'scanning' && (
                                    <div className="absolute left-1 right-1 pointer-events-none animate-laser-sweep z-20">
                                        {/* Upper trailing light curtain */}
                                        <div className="h-16 -mt-16 bg-gradient-to-t from-red-500/25 via-red-500/5 to-transparent w-full" />
                                        {/* Luminous laser line */}
                                        <div className="h-[3px] w-full bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_14px_#ff0033,0_0_28px_#e50914] relative">
                                            <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-red-400 shadow-[0_0_8px_#ff0033]" />
                                            <div className="absolute right-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-red-400 shadow-[0_0_8px_#ff0033]" />
                                        </div>
                                        {/* Lower subtle glow */}
                                        <div className="h-8 bg-gradient-to-b from-red-500/15 to-transparent w-full" />
                                    </div>
                                )}

                                {/* Capturing / Locked-On Animation (Active when captured) */}
                                {status === 'captured' && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center z-30 rounded-2xl bg-emerald-500/15 border-2 border-emerald-400 shadow-[0_0_40px_rgba(16,185,129,0.7),inset_0_0_30px_rgba(16,185,129,0.3)] animate-capture-pulse">
                                        {/* Sonic radar wave expanding */}
                                        <div className="absolute w-36 h-36 sm:w-48 sm:h-48 rounded-full border-2 border-emerald-400 animate-ping opacity-75" />
                                        <div className="absolute w-28 h-28 rounded-full border border-emerald-300/50 animate-pulse" />

                                        {/* Target Acquired Icon Badge */}
                                        <div className="relative flex flex-col items-center scale-up-spring">
                                            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 backdrop-blur-md border border-emerald-400/80 flex items-center justify-center text-emerald-400 shadow-[0_0_35px_rgba(16,185,129,0.85)]">
                                                <CheckCircle2 size={38} className="text-emerald-400 stroke-[2.5]" />
                                            </div>
                                            <div className="mt-3 px-3.5 py-1 bg-black/85 backdrop-blur-md border border-emerald-400/50 rounded-full text-[11px] font-bold tracking-widest text-emerald-300 uppercase shadow-lg flex items-center gap-1.5">
                                                <Sparkles size={12} className="text-emerald-400 animate-spin-slow" />
                                                <span>Code Captured</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Top Floating Status Indicator */}
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                                {status === 'scanning' ? (
                                    <div className="bg-black/75 backdrop-blur-md px-3.5 py-1 rounded-full border border-white/15 text-xs text-gray-200 flex items-center gap-2 shadow-lg">
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-red"></span>
                                        </span>
                                        <span className="font-medium tracking-wide">Scanning for QR Code</span>
                                    </div>
                                ) : (
                                    <div className="bg-emerald-950/85 backdrop-blur-md px-3.5 py-1 rounded-full border border-emerald-400/50 text-xs text-emerald-300 flex items-center gap-2 shadow-lg animate-in fade-in">
                                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                                        <span className="font-semibold tracking-wide">Target Acquired</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <p className="mt-8 text-center text-gray-400 text-sm max-w-xs">
                            {status === 'captured' ? (
                                <span className="text-emerald-400 font-semibold animate-pulse">Processing secure session approval...</span>
                            ) : (
                                "Point your camera at the QR code displayed on the web or TV to log in automatically."
                            )}
                        </p>
                        
                        {/* Manual Fallback */}
                        <div className="mt-10 w-full pt-8 border-t border-white/10">
                            <p className="text-sm text-gray-500 mb-4 text-center">Camera not working? Enter the ID manually:</p>
                            <div className="flex gap-2">
                                <input 
                                    ref={manualInputRef}
                                    type="text" 
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    placeholder="Enter 6-digit ID" 
                                    className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-lg font-mono tracking-[0.2em] text-center focus:border-cyan-400 focus:outline-none transition-colors"
                                    maxLength={6}
                                    onChange={(e) => {
                                        if (e.target.value.length === 6) {
                                            handleScan(e.target.value);
                                        }
                                    }}
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
                                    className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm font-bold transition-colors"
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
                                disabled={loading}
                                className="w-full bg-brand-red text-white py-4 rounded-xl font-bold text-lg hover:bg-brand-red/90 transition-colors shadow-lg shadow-brand-red/20 disabled:opacity-50"
                            >
                                {loading ? 'Approving...' : 'Approve Login'}
                            </button>
                            <button 
                                onClick={resetScanner} 
                                disabled={loading}
                                className="w-full bg-transparent border border-white/20 text-white py-4 rounded-xl font-bold text-lg hover:bg-white/5 transition-colors disabled:opacity-50"
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
            
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes laserSweep {
                    0% {
                        top: 2%;
                        opacity: 0.85;
                    }
                    48% {
                        opacity: 1;
                    }
                    50% {
                        top: calc(98% - 3px);
                        opacity: 0.85;
                    }
                    98% {
                        opacity: 1;
                    }
                    100% {
                        top: 2%;
                        opacity: 0.85;
                    }
                }
                @keyframes capturePulse {
                    0% {
                        transform: scale(0.96);
                        opacity: 0.5;
                    }
                    50% {
                        transform: scale(1.02);
                        opacity: 1;
                    }
                    100% {
                        transform: scale(1);
                        opacity: 1;
                    }
                }
                @keyframes scaleUpSpring {
                    0% {
                        transform: scale(0.65);
                        opacity: 0;
                    }
                    70% {
                        transform: scale(1.08);
                        opacity: 1;
                    }
                    100% {
                        transform: scale(1);
                        opacity: 1;
                    }
                }
                .animate-laser-sweep {
                    animation: laserSweep 2.2s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
                }
                .animate-capture-pulse {
                    animation: capturePulse 0.4s ease-out forwards;
                }
                .scale-up-spring {
                    animation: scaleUpSpring 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                }
                .animate-spin-slow {
                    animation: spin 6s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}} />
        </div>
    );
};

export default MobileScannerPage;
