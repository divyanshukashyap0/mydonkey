const fs = require('fs');
let c = fs.readFileSync('AppNew.tsx', 'utf8');

// 1. Update AppRoutes to be more stable
const routerTarget = "                    ) : currentUser?.role === 'admin' ? (\n                        <AdminLayout onExit={() => navigate('/')} />\n                    ) : (\n                        <Navigate to=\"/home\" replace />\n                    )";

const routerFix = "                    ) : (currentUser?.role === 'admin' || (isLoading === false && currentUser === null && !isAuthenticated)) ? (\n                        // If we are definitely not an admin and not loading, then redirect\n                        (currentUser?.role === 'admin') ? <AdminLayout onExit={() => navigate('/')} /> : <Navigate to=\"/home\" replace />\n                    ) : (\n                        // Default to loader while we are unsure to prevent jumpy redirects\n                        <Loader />\n                    )";

// Actually, let's simplify the logic to be more robust
const simpleRouterFix = "                    ) : currentUser?.role === 'admin' ? (\n                        <AdminLayout onExit={() => navigate('/')} />\n                    ) : isLoading ? (\n                        <Loader />\n                    ) : (\n                        // Only redirect to home if we are DEFINITELY not an admin\n                        <Navigate to=\"/home\" replace />\n                    )";

if (c.includes(routerTarget)) {
    c = c.replace(routerTarget, simpleRouterFix);
    fs.writeFileSync('AppNew.tsx', c);
    console.log('Stabilized Admin Route in AppNew.tsx');
} else {
    console.log('Target not found in AppNew.tsx');
}
