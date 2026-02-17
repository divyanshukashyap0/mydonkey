const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

// Load env vars manually
try {
    const envPath = path.resolve(__dirname, '../.env.local');
    if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf8');
        envConfig.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) {
                process.env[key.trim()] = value.trim().replace(/"/g, ''); // Simple cleanup
            }
        });
        console.log('Loaded .env.local');
    }
} catch (e) {
    console.error('Failed to load .env.local', e);
}

// Service Account Configuration
const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
};

if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
    console.error('Missing env vars');
    process.exit(1);
}

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function listContent() {
    console.log('Fetching content...');
    const snap = await db.collection('content').get();
    console.log(`Found ${snap.size} items.`);

    snap.forEach(doc => {
        const data = doc.data();
        console.log(`ID: "${doc.id}", Title: "${data.title}", Type: "${data.type}"`);
    });
}

listContent().catch(console.error);
