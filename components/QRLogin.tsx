import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { v4 as uuidv4 } from 'uuid';
import { doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { signInWithCustomToken } from 'firebase/auth';

interface QRLoginProps {
    onLoginSuccess: () => void;
    onError: (error: string) => void;
}

const QRLogin: React.FC<QRLoginProps> = ({ onLoginSuccess, onError }) => {
    const [sessionId, setSessionId] = useState('');
    const [qrValue, setQrValue] = useState('');
    const [timeLeft, setTimeLeft] = useState(120);

    const generateQR = async () => {
        // Generate a 6-digit numeric ID
        const newSessionId = Math.floor(100000 + Math.random() * 900000).toString();
        setSessionId(newSessionId);
        setTimeLeft(120);

        try {
            await setDoc(doc(db, 'qr_sessions', newSessionId), {
                sessionId: newSessionId,
                status: 'pending',
                createdAt: serverTimestamp(),
                expiresAt: new Date(Date.now() + 120 * 1000)
            });
            
            // Generate a full URL for the QR code
            const loginUrl = `${window.location.origin}/scan?sessionId=${newSessionId}`;
            setQrValue(loginUrl);
        } catch (error) {
            console.error("Error creating QR session:", error);
            onError("Failed to generate QR code");
        }
    };

    useEffect(() => {
        generateQR();
    }, []);

    useEffect(() => {
        if (!sessionId) return;

        const unsubscribe = onSnapshot(doc(db, 'qr_sessions', sessionId), async (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.status === 'approved' && data.customToken) {
                    try {
                        await signInWithCustomToken(auth, data.customToken);
                        onLoginSuccess();
                    } catch (error) {
                        onError("Failed to sign in with QR code");
                    }
                } else if (data.status === 'expired') {
                     // Optionally handle explicit expiration
                     generateQR();
                }
            }
        });

        return () => unsubscribe();
    }, [sessionId]);

    useEffect(() => {
        if (!sessionId) return;
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    generateQR(); // Refresh QR code
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [sessionId]);

    return (
        <div className="flex flex-col items-center justify-center py-6 animate-in fade-in duration-500">
            <h3 className="text-xl font-bold mb-2">Log in with QR Code</h3>
            <p className="text-sm text-gray-400 mb-6 text-center max-w-xs">Scan this code using the My Donkey app on your mobile device to log in instantly.</p>
            <div className="bg-white p-5 rounded-2xl mb-6 shadow-2xl shadow-brand-red/20 border-4 border-white/15 transition-transform hover:scale-105 relative group">
                {/* Precision HUD Corner Reticles */}
                <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-brand-red pointer-events-none" />
                <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-brand-red pointer-events-none" />
                <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-brand-red pointer-events-none" />
                <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-brand-red pointer-events-none" />

                {qrValue ? (
                    <div className="flex flex-col items-center relative">
                        <div className="relative overflow-hidden rounded-lg">
                            <QRCodeSVG value={qrValue} size={200} level="H" includeMargin={true} />
                            {/* Subtle ambient scan line */}
                            <div className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-brand-red/60 to-transparent pointer-events-none animate-qr-ambient" />
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-100 w-full text-center">
                            <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Session ID</p>
                            <p className="text-xs font-mono font-bold text-black select-all">{sessionId}</p>
                        </div>
                    </div>
                ) : (
                    <div className="w-[200px] h-[200px] bg-gray-800 rounded-xl animate-pulse flex items-center justify-center">
                        <div className="w-12 h-12 border-4 border-brand-red border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
                <div className="w-2 h-2 rounded-full bg-brand-red animate-pulse"></div>
                Auto-refreshing in <span className="font-bold text-white">{timeLeft}s</span>
            </div>

            <style dangerouslySetInnerHTML={{__html: `
                @keyframes qrAmbient {
                    0% { top: 2%; opacity: 0; }
                    15% { opacity: 0.8; }
                    85% { opacity: 0.8; }
                    100% { top: 96%; opacity: 0; }
                }
                .animate-qr-ambient {
                    animation: qrAmbient 3s ease-in-out infinite;
                }
            `}} />
        </div>
    );
};

export default QRLogin;
