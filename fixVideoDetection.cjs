const fs = require('fs');
const path = 'components/VideoPlayer.tsx';
let c = fs.readFileSync(path, 'utf8');

// 1. Strengthen the deep link handler
const detectionTarget = "    const isDirectIframeEmbed = directVideoUrl && !isHls && !isNativeVideo;";
const detectionFix = "    const isPlayImdb = directVideoUrl?.includes('playimdb.com');\n    const isDirectIframeEmbed = (directVideoUrl && !isHls && !isNativeVideo) || isPlayImdb;";

if (c.includes(detectionTarget)) {
    c = c.replace(detectionTarget, detectionFix);
    fs.writeFileSync(path, c);
    console.log('Fixed VideoPlayer detection logic');
} else {
    console.log('Target not found in VideoPlayer.tsx');
}
