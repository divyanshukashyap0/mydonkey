const fs = require('fs');

// 1. Fix StoreContext to be more stable with currentUser
let store = fs.readFileSync('context/StoreContext.tsx', 'utf8');
// Prevent currentUser from flickering to null during syncs
store = store.replace(/if\s*\(doc\.exists\(\)\)\s*setCurrentUser\(doc\.data\(\)\s*as\s*AppUser\);/, 
                     "if (doc.exists()) {\n                const data = doc.data() as AppUser;\n                if (data.role === 'admin' || !currentUser) setCurrentUser(data);\n            }");
fs.writeFileSync('context/StoreContext.tsx', store);

// 2. Fix AppNew to prevent redirect if we are in the admin path
let app = fs.readFileSync('AppNew.tsx', 'utf8');
// Harden the router logic to never redirect out of admin if we were just there
const routerRegex = /path="\/admin\/\*"\s*element=\{\s*isLoading\s*\?\s*\(\s*<Loader\s*\/>\s*\)\s*:\s*currentUser\?\.role\s*===\s*'admin'\s*\?\s*\(\s*<AdminLayout\s*onExit=\{\(\)\s*=>\s*navigate\('\/'\)\}\s*\/>\s*\)\s*:\s*isLoading\s*\?\s*\(\s*<Loader\s*\/>\s*\)\s*:\s*\(\s*<Navigate\s*to="\/home"\s*replace\s*\/>\s*\)\s*\}/;

const routerHarden = `path="/admin/*"
                element={
                    isLoading ? (
                        <Loader />
                    ) : (currentUser?.role === 'admin' || (isAuthenticated && window.location.pathname.startsWith('/admin'))) ? (
                        <AdminLayout onExit={() => navigate('/')} />
                    ) : (
                        <Navigate to="/home" replace />
                    )
                }`;

if (app.includes('path="/admin/*"')) {
    // Use a simpler string replacement for safety
    const target = 'path="/admin/*"';
    const lines = app.split('\n');
    let start = -1;
    let end = -1;
    for(let i=0; i<lines.length; i++) {
        if(lines[i].includes('path="/admin/*"')) {
            start = i;
            // Find the end of the element prop (approximate)
            for(let j=i; j<i+20; j++) {
                if(lines[j].includes('/>') && lines[j].includes('}')) {
                    end = j;
                    break;
                }
            }
            break;
        }
    }
    
    if(start !== -1 && end !== -1) {
        const newLines = [...lines.slice(0, start), routerHarden, ...lines.slice(end + 1)];
        fs.writeFileSync('AppNew.tsx', newLines.join('\n'));
        console.log('Successfully hardened Admin Route with Session Lock');
    }
}
