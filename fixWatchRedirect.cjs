const fs = require('fs');
let c = fs.readFileSync('AppNew.tsx', 'utf8');

const target = "                        console.warn(`Watch deep link content not found: ${contentId}`);\n                        navigate('/home', { replace: true });\n                        return;";
const replacement = "                        console.warn(`Watch deep link content not found: ${contentId}`);\n                        if (playingContent?.id === contentId) return;\n                        navigate('/home', { replace: true });\n                        return;";

if (c.includes(target)) {
    c = c.replace(target, replacement);
    fs.writeFileSync('AppNew.tsx', c);
    console.log('Fixed watch redirect logic in AppNew.tsx');
} else {
    console.log('Target not found in AppNew.tsx');
}
