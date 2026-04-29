const fs = require('fs');
const path = 'components/VideoPlayer.tsx';
let c = fs.readFileSync(path, 'utf8');

const transformTarget = "return url.replace('/title/', '/embed/');";
const transformFix = "return url.replace('/title/', '/embed/') + '?autoplay=1';";

if (c.includes(transformTarget)) {
    c = c.replace(transformTarget, transformFix);
    fs.writeFileSync(path, c);
    console.log('Added autoplay to PlayIMDB links');
}
