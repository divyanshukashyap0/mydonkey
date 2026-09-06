const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

// Look for service account key in common locations
const KEY_PATHS = [
    path.resolve(__dirname, '../service-account.json'),
    path.resolve(__dirname, '../google-service-account.json'),
    path.resolve(__dirname, './service-account.json'),
    path.resolve(__dirname, './google-key.json')
];

const SITEMAP_PATH = path.resolve(__dirname, '../public/sitemap.xml');
const MAX_DAILY_QUOTA = 200; // Google Indexing API daily quota per project

function base64UrlEncode(str) {
    return Buffer.from(str)
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}

function postRequest(urlStr, headers, postData) {
    return new Promise((resolve, reject) => {
        const url = new URL(urlStr);
        const options = {
            hostname: url.hostname,
            port: 443,
            path: url.pathname + url.search,
            method: 'POST',
            headers: {
                ...headers,
                'Content-Length': Buffer.byteLength(postData)
            },
            timeout: 15000
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => { body += chunk; });
            res.on('end', () => {
                try {
                    const parsed = body ? JSON.parse(body) : {};
                    resolve({ statusCode: res.statusCode, data: parsed, raw: body });
                } catch (e) {
                    resolve({ statusCode: res.statusCode, raw: body });
                }
            });
        });

        req.on('error', (err) => reject(err));
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timed out'));
        });

        req.write(postData);
        req.end();
    });
}

async function getGoogleAccessToken(serviceAccount) {
    const now = Math.floor(Date.now() / 1000);
    const header = base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const payload = base64UrlEncode(JSON.stringify({
        iss: serviceAccount.client_email,
        scope: 'https://www.googleapis.com/auth/indexing',
        aud: 'https://oauth2.googleapis.com/token',
        exp: now + 3600,
        iat: now
    }));

    const signer = crypto.createSign('RSA-SHA256');
    signer.update(`${header}.${payload}`);
    const signature = signer.sign(serviceAccount.private_key, 'base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

    const jwt = `${header}.${payload}.${signature}`;

    const postData = new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt
    }).toString();

    const res = await postRequest('https://oauth2.googleapis.com/token', {
        'Content-Type': 'application/x-www-form-urlencoded'
    }, postData);

    if (res.statusCode !== 200 || !res.data?.access_token) {
        throw new Error(`Failed to obtain Google access token: ${res.raw}`);
    }

    return res.data.access_token;
}

async function submitUrlToGoogle(url, accessToken) {
    const endpoint = 'https://indexing.googleapis.com/v1/urlNotifications:publish';
    const payload = JSON.stringify({
        url: url,
        type: 'URL_UPDATED'
    });

    const res = await postRequest(endpoint, {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
    }, payload);

    return res;
}

async function runGoogleBulkIndex() {
    console.log('🚀 Starting Google Indexing API Bulk Submission...\n');

    // 1. Locate Service Account Key
    let keyFile = null;
    for (const p of KEY_PATHS) {
        if (fs.existsSync(p)) {
            keyFile = p;
            break;
        }
    }

    if (!keyFile) {
        console.log('⚠️ Google Service Account key file not found!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('To push up to 200 URLs directly into Google\'s Priority Index Queue:');
        console.log('');
        console.log('1. Go to Google Cloud Console: https://console.cloud.google.com/');
        console.log('2. Enable "Web Search Indexing API" (APIs & Services → Enable APIs).');
        console.log('3. Create a Service Account (IAM & Admin → Service Accounts).');
        console.log('4. Create and download a JSON key, and save it as:');
        console.log('   c:\\Users\\divya\\Downloads\\mydonkey\\service-account.json');
        console.log('5. Open Google Search Console → Settings → Users and permissions:');
        console.log('   Add your service account email as an "Owner".');
        console.log('6. Run: npm run google-index');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        return;
    }

    const serviceAccount = JSON.parse(fs.readFileSync(keyFile, 'utf8'));
    console.log(`✅ Loaded Service Account: ${serviceAccount.client_email}`);

    // 2. Obtain OAuth2 Token
    console.log('🔐 Authenticating with Google OAuth2...');
    let accessToken;
    try {
        accessToken = await getGoogleAccessToken(serviceAccount);
        console.log('✅ Authentication successful!\n');
    } catch (err) {
        console.error('❌ Authentication failed:', err.message);
        return;
    }

    // 3. Parse Sitemap
    if (!fs.existsSync(SITEMAP_PATH)) {
        console.error(`❌ Sitemap not found at: ${SITEMAP_PATH}`);
        return;
    }

    const sitemapContent = fs.readFileSync(SITEMAP_PATH, 'utf8');
    const locRegex = /<loc>(https?:\/\/[^<]+)<\/loc>/g;
    const urls = [];
    let match;

    while ((match = locRegex.exec(sitemapContent)) !== null) {
        urls.push(match[1].trim());
    }

    const uniqueUrls = Array.from(new Set(urls));
    console.log(`📋 Found ${uniqueUrls.length} total URLs in sitemap.`);

    // Prioritize: Homepage, Search, and popular movie content first
    uniqueUrls.sort((a, b) => {
        if (a === 'https://www.mydonkey.in/') return -1;
        if (b === 'https://www.mydonkey.in/') return 1;
        if (a.includes('/search?')) return -1;
        if (b.includes('/search?')) return 1;
        return 0;
    });

    const targetUrls = uniqueUrls.slice(0, MAX_DAILY_QUOTA);
    console.log(`🎯 Submitting top ${targetUrls.length} URLs (Google Daily Quota Limit: 200)...\n`);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < targetUrls.length; i++) {
        const url = targetUrls[i];
        try {
            const res = await submitUrlToGoogle(url, accessToken);
            if (res.statusCode === 200) {
                successCount++;
                console.log(`[${i + 1}/${targetUrls.length}] ✅ Submitted: ${url}`);
            } else {
                failCount++;
                console.log(`[${i + 1}/${targetUrls.length}] ⚠️ Status ${res.statusCode}: ${res.raw || res.statusCode}`);
            }
        } catch (err) {
            failCount++;
            console.log(`[${i + 1}/${targetUrls.length}] ❌ Error: ${err.message}`);
        }

        // Slight 80ms throttle between API requests to respect rate limits
        await new Promise(r => setTimeout(r, 80));
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🎉 Google Bulk Indexing Complete!`);
    console.log(`   Success: ${successCount} URLs`);
    console.log(`   Failed:  ${failCount} URLs`);
    if (uniqueUrls.length > MAX_DAILY_QUOTA) {
        console.log(`   Remaining URLs: ${uniqueUrls.length - MAX_DAILY_QUOTA} (run again tomorrow for the next batch)`);
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

runGoogleBulkIndex();
