const fs = require('fs');
let c = fs.readFileSync('AppNew.tsx', 'utf8');

// 1. Add alert to browse redirect
const browseTarget = "                    console.warn(`Deep link content not found: ${contentId}`);\n                    navigate('/home', { replace: true });";
const browseFix = "                    alert(`Redirect: Content ${contentId} not found in browse`);\n                    navigate('/home', { replace: true });";

if (c.includes(browseTarget)) {
    c = c.replace(browseTarget, browseFix);
}

// 2. Add alert to watch redirect and strengthen bypass
const watchTarget = "                        console.warn(`Watch deep link content not found: ${contentId}`);\n                        if (playingContent?.id === contentId || stateItem) return;\n                        navigate('/home', { replace: true });";
const watchFix = "                        if (playingContent?.id === contentId || stateItem || (location.state as any)?.item) {\n                            console.log('AppNew: Bypass redirect - state or playingContent found');\n                            return;\n                        }\n                        alert(`Redirect: Watch content ${contentId} not found`);\n                        navigate('/home', { replace: true });";

if (c.includes(watchTarget)) {
    c = c.replace(watchTarget, watchFix);
}

fs.writeFileSync('AppNew.tsx', c);
console.log('Applied AppNew alert fixes');
