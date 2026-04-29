const fs = require('fs');
const path = 'components/VideoPlayer.tsx';
let c = fs.readFileSync(path, 'utf8');

// 1. Fix the pointer-events issue that prevents clicking
c = c.replace(/pointer-events-none \${(!directVideoUrl && !isDriveVideo) \? 'block' : 'hidden'}/, 
              "pointer-events-auto ${(!directVideoUrl && !isDriveVideo) ? 'block' : 'hidden'}");

// 2. Fix the direct video container to allow interactions
c = c.replace(/className="absolute inset-0 w-full h-full pointer-events-auto z-10"/,
              'className="absolute inset-0 w-full h-full pointer-events-auto z-[20]"');

// 3. Ensure the PlayIMDB iframe is at the top of the stack
c = c.replace(/<iframe\s+className="w-full h-full"/, 
              '<iframe className="w-full h-full relative z-[30]"');

fs.writeFileSync(path, c);
console.log('Fixed VideoPlayer interaction and layering');
