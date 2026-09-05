import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

// Check if a path is a modal overlay route (browse modal or video player overlay)
const isModalPath = (path: string) => {
    return path.startsWith('/browse/') || path.startsWith('/watch/');
};

// Global cache of scroll positions
// Keyed by both react-router history key and pathname + search
const scrollPositions = new Map<string, { x: number; y: number }>();

const STORAGE_KEY = 'mydonkey_scroll_positions_v1';

// Initialize cache from sessionStorage if available
try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
        const parsed = JSON.parse(raw);
        Object.entries(parsed).forEach(([k, v]: [string, any]) => {
            if (v && typeof v.y === 'number') {
                scrollPositions.set(k, { x: v.x || 0, y: v.y || 0 });
            }
        });
    }
} catch (_) {}

const persistPositions = () => {
    try {
        const obj: Record<string, { x: number; y: number }> = {};
        const entries = Array.from(scrollPositions.entries()).slice(-60);
        entries.forEach(([k, v]) => { obj[k] = v; });
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    } catch (_) {}
};

/**
 * ScrollToTop & Scroll Restoration Manager
 *
 * Rules:
 * 1. When a new page is opening (PUSH navigation), it starts from the start (top: 0, left: 0).
 * 2. When the user goes previous / back (POP navigation), it restores the exact previous position.
 * 3. When opening or closing modal routes (/browse/ or /watch/), the underlying page's scroll position is preserved.
 */
const ScrollToTop = () => {
    const location = useLocation();
    const navigationType = useNavigationType(); // 'PUSH' | 'POP' | 'REPLACE'

    const prevLocationRef = useRef(location);
    const cancelRestorationRef = useRef<(() => void) | null>(null);
    const isScrollingProgrammaticallyRef = useRef(false);

    // Disable browser's automatic conflicting scroll restoration
    useEffect(() => {
        if ('scrollRestoration' in window.history) {
            window.history.scrollRestoration = 'manual';
        }
    }, []);

    // Continuously save scroll positions for non-modal pages
    useEffect(() => {
        let ticking = false;

        const handleScroll = () => {
            if (isScrollingProgrammaticallyRef.current) return;
            if (isModalPath(location.pathname)) return;

            if (!ticking) {
                window.requestAnimationFrame(() => {
                    const currentPos = {
                        x: window.scrollX || window.pageXOffset || 0,
                        y: window.scrollY || window.pageYOffset || 0
                    };

                    if (location.key) {
                        scrollPositions.set(location.key, currentPos);
                    }
                    const urlKey = location.pathname + location.search;
                    scrollPositions.set(urlKey, currentPos);
                    persistPositions();

                    ticking = false;
                });
                ticking = true;
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, [location.key, location.pathname, location.search]);

    // Reliable scroll restoration function that accounts for asynchronous DOM rendering
    const restoreScroll = (targetX: number, targetY: number) => {
        if (cancelRestorationRef.current) {
            cancelRestorationRef.current();
            cancelRestorationRef.current = null;
        }

        let isCancelled = false;
        let frameCount = 0;
        const maxFrames = 60; // Retry for ~1 second while page content/rails load

        isScrollingProgrammaticallyRef.current = true;

        const step = () => {
            if (isCancelled) return;

            window.scrollTo({ top: targetY, left: targetX, behavior: 'instant' });
            document.documentElement.scrollTo({ top: targetY, left: targetX, behavior: 'instant' });
            document.body.scrollTo({ top: targetY, left: targetX, behavior: 'instant' });

            const currentY = window.scrollY || window.pageYOffset || 0;
            const currentMaxY = (document.documentElement.scrollHeight || document.body.scrollHeight) - window.innerHeight;

            // Stop if target is reached or close enough
            if (Math.abs(currentY - targetY) < 4 || (currentY >= targetY)) {
                isScrollingProgrammaticallyRef.current = false;
                return;
            }

            // If page hasn't grown tall enough to reach targetY yet, retry on next frame
            if (frameCount < maxFrames && currentMaxY < targetY) {
                frameCount++;
                requestAnimationFrame(step);
            } else {
                isScrollingProgrammaticallyRef.current = false;
            }
        };

        // Immediate scroll
        step();

        // Check again at staggered intervals in case async data resolves
        const t1 = setTimeout(step, 40);
        const t2 = setTimeout(step, 120);
        const t3 = setTimeout(step, 250);
        const t4 = setTimeout(step, 500);

        // Cancel if user touches or scrolls manually
        const handleUserInteraction = () => {
            isCancelled = true;
            isScrollingProgrammaticallyRef.current = false;
            cleanupInteraction();
        };

        const cleanupInteraction = () => {
            window.removeEventListener('wheel', handleUserInteraction);
            window.removeEventListener('touchstart', handleUserInteraction);
            window.removeEventListener('keydown', handleUserInteraction);
        };

        window.addEventListener('wheel', handleUserInteraction, { passive: true });
        window.addEventListener('touchstart', handleUserInteraction, { passive: true });
        window.addEventListener('keydown', handleUserInteraction, { passive: true });

        cancelRestorationRef.current = () => {
            isCancelled = true;
            isScrollingProgrammaticallyRef.current = false;
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
            clearTimeout(t4);
            cleanupInteraction();
        };
    };

    // React to navigation changes
    useEffect(() => {
        const prev = prevLocationRef.current;
        prevLocationRef.current = location;

        const isCurrentlyModal = isModalPath(location.pathname);
        const wasPreviouslyModal = isModalPath(prev.pathname);

        // Case 1: Navigating INTO a modal overlay (e.g. /browse/:id or /watch/:id)
        if (isCurrentlyModal) {
            // Save the scroll position of the underlying page
            if (!wasPreviouslyModal) {
                const currentPos = {
                    x: window.scrollX || window.pageXOffset || 0,
                    y: window.scrollY || window.pageYOffset || 0
                };
                if (prev.key) {
                    scrollPositions.set(prev.key, currentPos);
                }
                scrollPositions.set(prev.pathname + prev.search, currentPos);
                persistPositions();
            }
            // Do NOT scroll window to top for modal; the modal card itself handles its view
            return;
        }

        // Case 2: Returning FROM a modal overlay back to the underlying page
        if (wasPreviouslyModal) {
            const saved = scrollPositions.get(location.key) ||
                          scrollPositions.get(location.pathname + location.search);
            if (saved && (saved.x > 0 || saved.y > 0)) {
                restoreScroll(saved.x, saved.y);
            }
            return;
        }

        // Case 3: User goes PREVIOUS / BACK in browser history (POP)
        if (navigationType === 'POP') {
            const saved = scrollPositions.get(location.key) ||
                          scrollPositions.get(location.pathname + location.search);
            if (saved && (saved.x > 0 || saved.y > 0)) {
                restoreScroll(saved.x, saved.y);
            } else {
                // If no saved position, start from top
                window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                document.documentElement.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                document.body.scrollTo({ top: 0, left: 0, behavior: 'instant' });
            }
            return;
        }

        // Case 4: Opening a NEW page (PUSH navigation)
        if (navigationType === 'PUSH') {
            // Must start from start (top: 0, left: 0)
            window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
            document.documentElement.scrollTo({ top: 0, left: 0, behavior: 'instant' });
            document.body.scrollTo({ top: 0, left: 0, behavior: 'instant' });
            return;
        }

        // Case 5: REPLACE navigation
        if (navigationType === 'REPLACE') {
            const saved = scrollPositions.get(location.key) ||
                          scrollPositions.get(location.pathname + location.search);
            if (saved && (saved.x > 0 || saved.y > 0)) {
                restoreScroll(saved.x, saved.y);
            }
        }
    }, [location, navigationType]);

    return null;
};

export default ScrollToTop;
