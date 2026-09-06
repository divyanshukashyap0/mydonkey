const fs = require('fs');
const path = require('path');
const https = require('https');

const HOST = 'www.mydonkey.in';
const KEY = '9f8b1c4e7a2d5f0e3b6a9c2d1e4f8a0b';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const SITEMAP_PATH = path.resolve(__dirname, '../public/sitemap.xml');

// Helper to send HTTPS POST request
function postJson(urlStr, data) {
    return new Promise((resolve, reject) => {
        const url = new URL(urlStr);
        const postData = JSON.stringify(data);

        const options = {
            hostname: url.hostname,
            port: 443,
            path: url.pathname + url.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Content-Length': Buffer.byteLength(postData),
                'User-Agent': 'MyDonkey-IndexNow/1.0'
            },
            timeout: 15000
        };

        const req = https.request(options, (res) => {
            let responseBody = '';
            res.on('data', (chunk) => { responseBody += chunk; });
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    statusMessage: res.statusMessage,
                    body: responseBody
                });
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

async function runIndexNow() {
    console.log('🚀 Starting IndexNow Bulk URL Submission...');
    console.log(`🌐 Host: ${HOST}`);
    console.log(`🔑 Key: ${KEY}`);
    console.log(`📄 Key Location: ${KEY_LOCATION}\n`);

    if (!fs.existsSync(SITEMAP_PATH)) {
        console.error(`❌ Sitemap not found at: ${SITEMAP_PATH}`);
        process.exit(1);
    }

    // Extract all <loc> entries from sitemap.xml
    const sitemapContent = fs.readFileSync(SITEMAP_PATH, 'utf8');
    const locRegex = /<loc>(https?:\/\/[^<]+)<\/loc>/g;
    const urls = [];
    let match;

    while ((match = locRegex.exec(sitemapContent)) !== null) {
        urls.push(match[1].trim());
    }

    // Deduplicate
    const uniqueUrls = Array.from(new Set(urls));
    console.log(`📋 Discovered ${uniqueUrls.length} unique URLs from sitemap.xml.\n`);

    if (uniqueUrls.length === 0) {
        console.error('❌ No URLs found in sitemap.');
        process.exit(1);
    }

    // IndexNow allows up to 10,000 URLs per request. We submit in batches of 500.
    const BATCH_SIZE = 500;
    const batches = [];
    for (let i = 0; i < uniqueUrls.length; i += BATCH_SIZE) {
        batches.push(uniqueUrls.slice(i, i + BATCH_SIZE));
    }

    console.log(`📦 Split into ${batches.length} batch(es) for submission.\n`);

    const ENDPOINTS = [
        'https://api.indexnow.org/indexnow',
        'https://www.bing.com/indexnow'
    ];

    for (let bIndex = 0; bIndex < batches.length; bIndex++) {
        const batch = batches[bIndex];
        console.log(`⏳ Submitting Batch ${bIndex + 1}/${batches.length} (${batch.length} URLs)...`);

        const payload = {
            host: HOST,
            key: KEY,
            keyLocation: KEY_LOCATION,
            urlList: batch
        };

        for (const endpoint of ENDPOINTS) {
            try {
                const epName = new URL(endpoint).hostname;
                const result = await postJson(endpoint, payload);

                if (result.statusCode === 200) {
                    console.log(`   ✅ [${epName}] 200 OK — URLs submitted & processed successfully.`);
                } else if (result.statusCode === 202) {
                    console.log(`   ✅ [${epName}] 202 Accepted — URLs queued in search engine index pipeline.`);
                } else {
                    console.log(`   ⚠️ [${epName}] Status ${result.statusCode}: ${result.body || result.statusMessage}`);
                }
            } catch (err) {
                console.error(`   ❌ Failed to submit to ${endpoint}:`, err.message);
            }
        }
        console.log('');
    }

    console.log('🎉 Bulk IndexNow submission completed!');
    console.log('Participating search engines (Bing, Yahoo, DuckDuckGo, Yandex, Naver, Seznam) are now notified of all URLs.');
}

runIndexNow();
