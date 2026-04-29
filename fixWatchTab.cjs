const fs = require('fs');
let c = fs.readFileSync('AppNew.tsx', 'utf8');

const tabTarget = "    if (activeTab.startsWith('browse/')) {\n        activeTab = 'home';\n    }";
const tabFix = "    if (activeTab.startsWith('browse/') || activeTab.startsWith('watch/')) {\n        activeTab = 'home';\n    }";

if (c.includes(tabTarget)) {
    c = c.replace(tabTarget, tabFix);
    fs.writeFileSync('AppNew.tsx', c);
    console.log('Fixed activeTab routing logic in AppNew.tsx');
} else {
    console.log('Target not found in AppNew.tsx');
}
