const fs = require('fs');
const path = 'AppNew.tsx';
let c = fs.readFileSync(path, 'utf8');

// 1. Fix activeTab logic
c = c.replace(/if\s*\(activeTab\.startsWith\('browse\/'\)\)\s*{\s*activeTab\s*=\s*'home';\s*}/, 
              "if (activeTab.startsWith('browse/') || activeTab.startsWith('watch/')) {\n        activeTab = 'home';\n    }");

// 2. Remove alerts
c = c.replace(/alert\(`Redirect: Content \${contentId} not found in browse`\);/, "console.warn(`Deep link content not found: ${contentId}`);");
c = c.replace(/alert\(`Redirect: Watch content \${contentId} not found`\);/, "console.warn(`Watch deep link content not found: ${contentId}`);");
c = c.replace(/console\.log\('AppNew: Bypass redirect - state or playingContent found'\);/, "");

fs.writeFileSync(path, c);
console.log('Fixed AppNew routing with Regex');
