const admin = require('firebase-admin');

// Helper to initialize Admin SDK
function getAdminApp() {
    if (admin.apps.length > 0) return admin.app();

    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT is missing in .env.local');
    }
    
    let serviceAccount;
    try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (e) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT is not valid JSON');
    }

    return admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

module.exports = async function handler(req, res) {
    console.log('--- QR Approval API Hit ---', req.method);
    
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.statusCode = 200;
        res.end();
        return;
    }

    try {
        // Parse body manually if needed
        let body = req.body;
        if (!body) {
            const chunks = [];
            for await (const chunk of req) {
                chunks.push(chunk);
            }
            const rawBody = Buffer.concat(chunks).toString();
            if (rawBody) body = JSON.parse(rawBody);
        }

        const { sessionId, userId, deviceName } = body || {};

        if (!sessionId || !userId) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Missing sessionId or userId' }));
            return;
        }

        const app = getAdminApp();
        const db = app.firestore();
        const auth = app.auth();

        const sessionRef = db.collection('qr_sessions').doc(sessionId);
        const doc = await sessionRef.get();

        if (!doc.exists) {
            res.statusCode = 404;
            res.end(JSON.stringify({ error: 'Session not found. Refresh QR code.' }));
            return;
        }

        const data = doc.data();
        
        // Expiration check
        const expiresAt = data.expiresAt.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt);
        if (expiresAt < new Date()) {
            await sessionRef.update({ status: 'expired' });
            res.statusCode = 410;
            res.end(JSON.stringify({ error: 'Session expired' }));
            return;
        }

        // Generate Token
        const customToken = await auth.createCustomToken(userId);

        // Update Firestore
        await sessionRef.update({
            status: 'approved',
            userId: userId,
            customToken: customToken,
            deviceName: deviceName || 'Unknown Device',
            approvedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Add to user sessions
        await db.collection('user_sessions').add({
            userId,
            sessionId,
            deviceName: deviceName || 'Web Browser',
            lastActiveAt: admin.firestore.FieldValue.serverTimestamp(),
            type: 'web'
        });

        res.statusCode = 200;
        res.end(JSON.stringify({ success: true }));
        console.log('✅ Approved:', sessionId);

    } catch (error) {
        console.error('API Error:', error);
        res.statusCode = 500;
        res.end(JSON.stringify({ 
            error: error.message || 'Internal Server Error'
        }));
    }
};
