const fs = require('fs');
let c = fs.readFileSync('AppNew.tsx', 'utf8');

const target = "                console.log(\"AppNew: Deep link check:\", { contentId, hasStateItem: !!stateItem, rawContentCount: rawContent.length });";

if (c.includes(target)) {
    c = c.replace(target, '');
    fs.writeFileSync('AppNew.tsx', c);
    console.log('Removed log from AppNew.tsx');
} else {
    console.log('Log not found in AppNew.tsx');
}
