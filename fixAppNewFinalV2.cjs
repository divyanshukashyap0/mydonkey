const fs = require('fs');
let c = fs.readFileSync('AppNew.tsx', 'utf8');

// 1. Fix the incorrect Navigate returns in useEffect (they should be navigate calls)
// Pattern 1: browse block
c = c.replace(
    /console\.warn\(`Deep link content not found: \${contentId}`\);\r?\n\s*return <Navigate to="\/home" replace \/>;/,
    "console.warn(`Deep link content not found: ${contentId}`);\n                        navigate('/home', { replace: true });\n                        return;"
);
// Pattern 2: watch block
c = c.replace(
    /console\.warn\(`Watch deep link content not found: \${contentId}`\);\r?\n\s*return <Navigate to="\/home" replace \/>;/,
    "console.warn(`Watch deep link content not found: ${contentId}`);\n                        navigate('/home', { replace: true });\n                        return;"
);

// 2. Re-apply the stateItem fix in the browse block
const browseStart = c.indexOf("if (location.pathname.startsWith('/browse/')) {");
if (browseStart !== -1) {
    const browseEnd = c.indexOf("} else {", browseStart);
    let browseBlock = c.substring(browseStart, browseEnd);
    
    // Add stateItem declaration
    if (!browseBlock.includes("const stateItem")) {
        browseBlock = browseBlock.replace(
            "const contentId = location.pathname.split('/')[2];",
            "const contentId = location.pathname.split('/')[2];\n            const stateItem = (location.state as any)?.item;"
        );
    }
    
    // Update rawContent check
    browseBlock = browseBlock.replace(
        "if (rawContent.length > 0) {",
        "if (rawContent.length > 0 || stateItem) {"
    );
    
    // Update item lookup
    browseBlock = browseBlock.replace(
        "const item = rawContent.find(c => c.id === contentId);",
        "const item = stateItem || rawContent.find(c => c.id === contentId);"
    );
    
    c = c.substring(0, browseStart) + browseBlock + c.substring(browseEnd);
    console.log('Re-applied stateItem fix in browse block.');
}

fs.writeFileSync('AppNew.tsx', c);
console.log('AppNew.tsx fixed successfully.');
