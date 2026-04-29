const fs = require('fs');
let c = fs.readFileSync('AppNew.tsx', 'utf8');

// The corrupted block starts around handlePlay
const startMarker = "const handlePlay = (item: Content, mode: 'movie' | 'trailer' = 'movie') => {";
const endMarker = "const handleNavigate = (page: string) => {";

const startIndex = c.indexOf(startMarker);
const endIndex = c.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
    const fixedHandlers = `const handlePlay = (item: Content, mode: 'movie' | 'trailer' = 'movie') => {
        if (mode === 'trailer') {
            navigate(\`/watch/\${item.id}?mode=trailer\`, { state: { item } });
        } else {
            if (isAuthenticated && currentUser) {
                navigate(\`/watch/\${item.id}?mode=movie\`, { state: { item } });
            } else {
                navigate('/login');
            }
        }
    };

    const handleDetails = (item: Content) => {
        setViewingContent(item);
        navigate(\`/browse/\${item.id}\`, { state: { item } });
    };

    const handleTabChange = (tabId: string) => {
        if (tabId === 'my-list' && !isAuthenticated) {
            navigate('/login');
            return;
        }
        // Navigate to the new URL
        navigate(\`/\${tabId}\`);
        window.scrollTo(0, 0);
    };

    `;
    
    c = c.substring(0, startIndex) + fixedHandlers + c.substring(endIndex);
    fs.writeFileSync('AppNew.tsx', c);
    console.log('Fixed corrupted handlers in AppNew.tsx');
} else {
    console.log('Markers not found!');
}
