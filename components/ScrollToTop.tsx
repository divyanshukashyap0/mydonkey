import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop = () => {
    const { pathname } = useLocation();
    const prevPathnameRef = useRef(pathname);

    useEffect(() => {
        const prev = prevPathnameRef.current;
        prevPathnameRef.current = pathname;

        // Don't scroll when entering browse or watch modal
        if (pathname.startsWith('/browse/') || pathname.startsWith('/watch/')) {
            return;
        }
        // Don't scroll when closing browse or watch modal and returning to the same screen
        if (prev.startsWith('/browse/') || prev.startsWith('/watch/')) {
            return;
        }

        window.scrollTo(0, 0);
    }, [pathname]);

    return null;
};

export default ScrollToTop;

