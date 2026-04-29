const fs = require('fs');
let c = fs.readFileSync('AppNew.tsx', 'utf8');

const target = "            if (rawContent.length > 0 || stateItem) {";
const replacement = "            if (rawContent.length > 0 || stateItem) {\n                console.log(\"AppNew: Deep link check:\", { contentId, hasStateItem: !!stateItem, rawContentCount: rawContent.length });";

if (c.includes(target)) {
    c = c.replace(target, replacement);
    fs.writeFileSync('AppNew.tsx', c);
    console.log('Added log to AppNew.tsx!');
} else {
    console.log('Target not found in AppNew.tsx');
}
