const fs = require('fs');
const path = 'AppNew.tsx';
let c = fs.readFileSync(path, 'utf8');

const regex = /:\s*currentUser\?\.role\s*===\s*'admin'\s*\?\s*\(\s*<AdminLayout\s*onExit={[^}]+}\s*\/>\s*\)\s*:\s*\(\s*<Navigate\s*to="\/home"\s*replace\s*\/>\s*\)/;
const replacement = ": currentUser?.role === 'admin' ? (\n                        <AdminLayout onExit={() => navigate('/')} />\n                    ) : isLoading ? (\n                        <Loader />\n                    ) : (\n                        <Navigate to=\"/home\" replace />\n                    )";

if (regex.test(c)) {
    c = c.replace(regex, replacement);
    fs.writeFileSync(path, c);
    console.log('Fixed AppNew Admin Route');
} else {
    console.log('Regex did not match');
}
