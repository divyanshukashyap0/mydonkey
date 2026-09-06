const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SITEMAP_PATH = path.resolve(__dirname, '../public/sitemap.xml');
const HISTORY_PATH = path.resolve(__dirname, '.indexed-urls.json');
const KEY_PATHS = [
    path.resolve(__dirname, '../service_account.json'),
    path.resolve(__dirname, '../google-key.json')
];

function findKeyFile() {
    for (const p of KEY_PATHS) {
        if (fs.existsSync(p)) return p;
    }
    // Also scan for any google-key*.json in project root
    const rootDir = path.resolve(__dirname, '..');
    const files = fs.readdirSync(rootDir);
    const match = files.find(f => f.startsWith('google-key') && f.endsWith('.json'));
    if (match) return path.resolve(rootDir, match);
    return null;
}

// Generate Google OAuth2 Access Token via native Node.js RSA-SHA256 JWT
async function getAccessToken(serviceAccount) {
    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
        iss: serviceAccount.client_email,
        scope: 'https://www.googleapis.com/auth/indexing',
        aud: 'https://oauth2.googleapis.com/token',
        exp: now + 3600,
        iat: now
    })).toString('base64url');

    const sign = crypto.createSign('RSA-SHA256');
    sign.update(`${header}.${payload}`);
    const signature = sign.sign(serviceAccount.private_key, 'base64url');
    const jwt = `${header}.${payload}.${signature}`;

    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: jwt
        })
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to obtain Google access token: ${res.status} ${text}`);
    }

    const data = await res.json();
    return data.access_token;
}

// Extract URLs from public/sitemap.xml
function extractUrlsFromSitemap() {
    if (!fs.existsSync(SITEMAP_PATH)) {
        throw new Error(`Sitemap not found at ${SITEMAP_PATH}. Please run "npm run sitemap" first.`);
    }
    const content = fs.readFileSync(SITEMAP_PATH, 'utf8');
    const matches = content.match(/<loc>(.*?)<\/loc>/g) || [];
    const urls = matches.map(m => m.replace(/<\/?loc>/g, '').trim()).filter(Boolean);

    // Prioritize Movie and TV URLs first, followed by Search and Categories
    return urls.sort((a, b) => {
        const aScore = a.includes('/browse/') ? 3 : (a.includes('/search') ? 2 : 1);
        const bScore = b.includes('/browse/') ? 3 : (b.includes('/search') ? 2 : 1);
        return bScore - aScore;
    });
}

function loadHistory() {
    if (fs.existsSync(HISTORY_PATH)) {
        try {
            return JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8'));
        } catch (_) {}
    }
    return {};
}

function saveHistory(history) {
    fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2), 'utf8');
}

async function run() {
    console.log('🚀 Google Bulk Indexing Utility for My Donkey');
    console.log('==============================================\n');

    const keyPath = findKeyFile();
    if (!keyPath) {
        console.error('❌ Service Account key not found!');
        console.log('\n📋 Follow these 3 simple steps to get your key:');
        console.log('1. Go to Google Cloud Console: https://console.cloud.google.com/apis/library/indexing.googleapis.com');
        console.log('   - Enable the "Web Search Indexing API".');
        console.log('2. Go to "IAM & Admin" > "Service Accounts": https://console.cloud.google.com/iam-admin/serviceaccounts');
        console.log('   - Click "Create Service Account" (e.g. name: "google-indexer").');
        console.log('   - Click on the created service account > "Keys" tab > "Add Key" > "Create new key" (JSON).');
        console.log('   - Save the downloaded file as "service_account.json" in this project root:');
        console.log(`     ${path.resolve(__dirname, '..')}`);
        console.log('3. Add Service Account to Google Search Console:');
        console.log('   - Copy the service account email (e.g. google-indexer@...iam.gserviceaccount.com).');
        console.log('   - Open Google Search Console > Settings > Users and permissions.');
        console.log('   - Click "Add user" and paste the email. Set Permission to "Owner".');
        console.log('\nThen re-run this command: npm run google-index\n');
        process.exit(1);
    }

    const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    console.log(`🔑 Using Service Account: ${serviceAccount.client_email}`);

    // Parse limit from command line args: e.g. node scripts/google-bulk-index.cjs --limit=200
    let limit = 200;
    const limitArg = process.argv.find(a => a.startsWith('--limit='));
    if (limitArg) {
        limit = parseInt(limitArg.split('=')[1], 10) || 200;
    }

    console.log('🔍 Reading sitemap.xml...');
    const allUrls = extractUrlsFromSitemap();
    console.log(`📄 Total URLs found in sitemap: ${allUrls.length}`);

    const history = loadHistory();
    const pendingUrls = allUrls.filter(u => !history[u]);
    console.log(`⏳ Unindexed / Pending URLs remaining: ${pendingUrls.length}`);

    if (pendingUrls.length === 0) {
        console.log('🎉 All URLs in sitemap have already been submitted! Nothing to do.');
        return;
    }

    const targetBatch = pendingUrls.slice(0, limit);
    console.log(`🎯 Submitting batch of ${targetBatch.length} URLs (Google daily quota limit: ${limit})...\n`);

    console.log('🔐 Generating Google OAuth2 token...');
    const token = await getAccessToken(serviceAccount);
    console.log('✅ Authenticated successfully with Google Indexing API.\n');

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < targetBatch.length; i++) {
        const url = targetBatch[i];
        const progress = `[${i + 1}/${targetBatch.length}]`;

        try {
            const res = await fetch('https://indexing.googleapis.com/v1/urlNotifications:publish', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    url: url,
                    type: 'URL_UPDATED'
                })
            });

            if (res.ok) {
                console.log(`${progress} ✅ 200 OK: ${url}`);
                history[url] = {
                    submittedAt: new Date().toISOString(),
                    status: 'OK'
                };
                successCount++;
            } else {
                const errJson = await res.json().catch(() => ({}));
                const errMsg = errJson.error?.message || res.statusText;
                console.warn(`${progress} ⚠️ [${res.status}] ${errMsg} for ${url}`);
                if (res.status === 429) {
                    console.error('\n🛑 Google Daily Quota reached for today! Stopping here.');
                    break;
                }
                failCount++;
            }
        } catch (err) {
            console.error(`${progress} ❌ Network Error: ${err.message}`);
            failCount++;
        }

        // Small 100ms throttle to prevent bursting
        await new Promise(r => setTimeout(r, 100));

        // Save progress every 20 URLs
        if (i % 20 === 0) {
            saveHistory(history);
        }
    }

    saveHistory(history);

    console.log('\n==============================================');
    console.log(`✨ Batch Summary:`);
    console.log(`   - Successfully pushed: ${successCount} URLs`);
    if (failCount > 0) console.log(`   - Failed / throttled: ${failCount} URLs`);
    console.log(`   - Remaining in catalog: ${allUrls.length - Object.keys(history).length} URLs`);
    console.log('\n💡 Googlebot will crawl these prioritized URLs within 24-48 hours.');
    console.log('💡 Run this command again tomorrow to push the next 200 URLs!');
    console.log('==============================================\n');
}

run().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
