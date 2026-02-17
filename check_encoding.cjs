const fs = require('fs');
try {
    const buf = fs.readFileSync('.env.local');
    console.log('Hex:', buf.toString('hex', 0, 40));
} catch (e) {
    console.error(e.message);
}
