const fs = require('fs');
const path = require('path');

const loadEnv = (filePath) => {
    if (!fs.existsSync(filePath)) return;
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        content.split(/\r?\n/).forEach(line => {
            line = line.trim();
            if (!line || line.startsWith('#')) return;
            const idx = line.indexOf('=');
            if (idx === -1) return;
            const key = line.substring(0, idx).trim();
            let value = line.substring(idx + 1).trim();
            value = value.replace(/^["']|["']$/g, '');
            if (key && !process.env[key]) {
                process.env[key] = value;
            }
        });
    } catch (e) {}
};

loadEnv(path.resolve(__dirname, '../.env.local'));
loadEnv(path.resolve(__dirname, '../.env'));

const PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
const API_KEY = process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY;

async function dump() {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/content?key=${API_KEY}&pageSize=50`;
    const response = await fetch(url);
    const data = await response.json();
    const tvShows = data.documents.filter(doc => doc.fields.type?.stringValue === 'tv');
    if (tvShows.length > 0) {
        // Just print the seasons object of the first tv show
        const show = tvShows[0];
        console.log("TV Show:", show.fields.title?.stringValue);
        console.log(JSON.stringify(show.fields.seasons, null, 2));
    } else {
        console.log("No TV shows found.");
    }
}
dump();
