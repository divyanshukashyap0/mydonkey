const fs = require('fs');

// 1. Fix VideoPlayer logic
let vp = fs.readFileSync('components/VideoPlayer.tsx', 'utf8');
// Force overlays to be clickable or hidden when playing
vp = vp.replace(/className="absolute inset-0 z-20 bg-black\/85/, 'className="absolute inset-0 z-[60] bg-black/85');
// Ensure the loading blur doesn't block clicks if it hangs
vp = vp.replace(/z-\[50\] flex flex-col/, 'z-[40] flex flex-col');
fs.writeFileSync('components/VideoPlayer.tsx', vp);

// 2. Fix AppNew redirect logic
let app = fs.readFileSync('AppNew.tsx', 'utf8');
// Add a guard to the deep link handler
const redirectTarget = "if (playingContent?.id === contentId || stateItem || (location.state as any)?.item) {\n                            return;\n                        }";
const redirectFix = "if (playingContent?.id === contentId || !!playingContent || stateItem || (location.state as any)?.item) {\n                            return;\n                        }";

if (app.includes(redirectTarget)) {
    app = app.replace(redirectTarget, redirectFix);
    fs.writeFileSync('AppNew.tsx', app);
    console.log('Hardened AppNew redirect logic');
}
