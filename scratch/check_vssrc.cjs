const https = require('https');

https.get('https://proxy.garageband.rocks/vs_src.php?type=movie&id=tt1375666', {
    headers: {
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://proxy.garageband.rocks/embed/movie/tt1375666'
    }
}, res => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('vs_src response:', data);
    });
}).on('error', err => console.error(err));
