const admin = require('firebase-admin');

// Initialize Firebase Admin (Singleton pattern for Vercel)
if (!admin.apps.length) {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
        });
    } catch (error) {
        console.error('Firebase admin initialization error:', error);
    }
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { sessionId, userId, deviceName } = req.body;

    if (!sessionId || !userId) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const sessionRef = db.collection('qr_sessions').doc(sessionId);
        const doc = await sessionRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'Session not found' });
        }

        const data = doc.data();
        
        // Verify expiration
        const expiresAt = data.expiresAt.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt);
        if (expiresAt < new Date()) {
            await sessionRef.update({ status: 'expired' });
            return res.status(410).json({ error: 'Session expired' });
        }

        // Generate Custom Token for the user
        const customToken = await auth.createCustomToken(userId);

        // Update session in Firestore
        await sessionRef.update({
            status: 'approved',
            userId: userId,
            customToken: customToken,
            deviceName: deviceName || 'Unknown Device',
            approvedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Log session for device management
        await db.collection('user_sessions').add({
            userId,
            sessionId,
            deviceName: deviceName || 'Web Browser',
            lastActiveAt: admin.firestore.FieldValue.serverTimestamp(),
            ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
            type: 'web'
        });

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('QR Approval Error:', error);
        return res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
};
