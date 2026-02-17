import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
import * as fs from 'fs';

const firebaseConfig = {
    apiKey: "AIzaSyDGTb4QwS_6tos6LWSEzosgC3rGqQ13PIQ",
    authDomain: "my-donkey-ott.firebaseapp.com",
    projectId: "my-donkey-ott",
    storageBucket: "my-donkey-ott.firebasestorage.app",
    messagingSenderId: "234783764397",
    appId: "1:234783764397:web:8963301e44c1724da37b24",
    measurementId: "G-C2Q4KX93Q3"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkTv10() {
    console.log('Fetching tv_10...');
    try {
        const docRef = doc(db, "content", "tv_10");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            console.log("Document data:", docSnap.data());
            fs.writeFileSync('tv_10_data.json', JSON.stringify({ id: docSnap.id, ...docSnap.data() }, null, 2));
            console.log('Wrote to tv_10_data.json');
        } else {
            console.log("No such document!");
            fs.writeFileSync('tv_10_data.json', 'NOT FOUND');
        }
    } catch (e) {
        console.error("Error fetching document:", e);
    }
    process.exit(0);
}

checkTv10();
