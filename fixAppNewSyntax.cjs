const fs = require('fs');
let c = fs.readFileSync('AppNew.tsx', 'utf8');

// The broken section looks like this:
/*
672:             <Route
673: path="/admin/*"
674:                 element={
675:                     isLoading ? (
676:                         <Loader />
677:                     ) : (currentUser?.role === 'admin' || (isAuthenticated && window.location.pathname.startsWith('/admin'))) ? (
678:                         <AdminLayout onExit={() => navigate('/')} />
679:                     ) : (
680:                         <Navigate to="/home" replace />
681:                     )
682:                 }
683:                     ) : isLoading ? (
684:                         <Loader />
685:                     ) : (
686:                         <Navigate to="/home" replace />
687:                     )
688:                 }
689:             />
*/

// I will replace the entire Routes block to be safe
const startMark = '<Routes>';
const endMark = '</Routes>';
const startIndex = c.indexOf(startMark);
const endIndex = c.indexOf(endMark);

if (startIndex !== -1 && endIndex !== -1) {
    const newRoutes = `<Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
                path="/admin/*"
                element={
                    isLoading ? (
                        <Loader />
                    ) : (currentUser?.role === 'admin' || (isAuthenticated && window.location.pathname.startsWith('/admin'))) ? (
                        <AdminLayout onExit={() => navigate('/')} />
                    ) : (
                        <Navigate to="/home" replace />
                    )
                }
            />
            <Route path="/*" element={<MainLayout />} />
        </Routes>`;
    
    c = c.slice(0, startIndex) + newRoutes + c.slice(endIndex + endMark.length);
    fs.writeFileSync('AppNew.tsx', c);
    console.log('Fixed syntax error in AppNew.tsx');
}
