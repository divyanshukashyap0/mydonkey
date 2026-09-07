const https = require('https');

https.get('https://proxy.garageband.rocks/embed/movie/tt1375666', { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log(data);
    });
}).on('error', err => console.error(err));
