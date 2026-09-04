import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop = () => {
    const { pathname, search } = useLocation();

    useEffect(() => {
        // Ensure every page transition (including movie cards /browse/ and /watch/) starts smoothly from top
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: 'smooth'
        });
        document.documentElement.scrollTo({
            top: 0,
            left: 0,
            behavior: 'smooth'
        });
        document.body.scrollTo({
            top: 0,
            left: 0,
            behavior: 'smooth'
        });
    }, [pathname, search]);

    return null;
};

export default ScrollToTop;

