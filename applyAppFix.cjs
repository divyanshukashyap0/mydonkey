const fs = require('fs');
let c = fs.readFileSync('AppNew.tsx', 'utf8');

// 1. Strengthen the deep link handler
const redirectTarget = "                        console.warn(`Watch deep link content not found: ${contentId}`);\n                        if (playingContent?.id === contentId) return;\n                        navigate('/home', { replace: true });";
const redirectFix = "                        console.warn(`Watch deep link content not found: ${contentId}`);\n                        // PROTECTION: Never redirect if we are already playing or have state\n                        if (playingContent?.id === contentId || stateItem) return;\n                        navigate('/home', { replace: true });";

if (c.includes(redirectTarget)) {
    c = c.replace(redirectTarget, redirectFix);
}

// 2. Add some more logging to see what's happening during the redirect
const logTarget = "            if (!isLoading && rawContent.length > 0) {";
const logFix = "            if (!isLoading && rawContent.length > 0) {\n                console.log(\"AppNew: Watch deep link check:\", { contentId, hasStateItem: !!stateItem, playingId: playingContent?.id });";

if (c.includes(logTarget)) {
    c = c.replace(logTarget, logFix);
}

fs.writeFileSync('AppNew.tsx', c);
console.log('Applied AppNew fixes');
