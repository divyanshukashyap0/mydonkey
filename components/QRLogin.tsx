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
    const [timeLeft, setTimeLeft] = useState(60);

    const generateQR = async () => {
        const newSessionId = uuidv4();
        setSessionId(newSessionId);
        setTimeLeft(60);

        try {
            await setDoc(doc(db, 'qr_sessions', newSessionId), {
                sessionId: newSessionId,
                status: 'pending',
                createdAt: serverTimestamp(),
                // Firestore doesn't support Date natively without timestamp conversion in some contexts, but let's just use server timestamp and we can handle expiration in functions or frontend.
                // Using a JS Date is converted to Timestamp by Firestore SDK.
                expiresAt: new Date(Date.now() + 60 * 1000)
            });
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
            <div className="bg-white p-4 rounded-2xl mb-6 shadow-2xl shadow-brand-red/20 border-4 border-white/10 transition-transform hover:scale-105">
                {sessionId ? (
                    <QRCodeSVG value={JSON.stringify({ sessionId })} size={200} level="H" includeMargin={true} />
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
        </div>
    );
};

export default QRLogin;
