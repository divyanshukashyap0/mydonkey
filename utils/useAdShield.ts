import { useState, useEffect, useCallback, useMemo } from 'react';

export type AdShieldMode = 'strict' | 'standard';

interface UseAdShieldOptions {
    defaultEnabled?: boolean;
    defaultMode?: AdShieldMode;
    isActive?: boolean;
}

export function useAdShield(options: UseAdShieldOptions = {}) {
    const { defaultEnabled = true, defaultMode = 'strict', isActive = true } = options;

    const [isEnabled, setIsEnabled] = useState<boolean>(() => {
        try {
            const saved = localStorage.getItem('mydonkey_adshield_enabled');
            return saved !== null ? saved === 'true' : defaultEnabled;
        } catch {
            return defaultEnabled;
        }
    });

    const [mode, setMode] = useState<AdShieldMode>(() => {
        try {
            const saved = localStorage.getItem('mydonkey_adshield_mode');
            return (saved === 'strict' || saved === 'standard') ? saved : defaultMode;
        } catch {
            return defaultMode;
        }
    });

    const [blockedCount, setBlockedCount] = useState<number>(0);

    // Save preferences
    const toggleAdShield = useCallback(() => {
        setIsEnabled(prev => {
            const next = !prev;
            try {
                localStorage.setItem('mydonkey_adshield_enabled', String(next));
            } catch {}
            return next;
        });
    }, []);

    const changeMode = useCallback((newMode: AdShieldMode) => {
        setMode(newMode);
        try {
            localStorage.setItem('mydonkey_adshield_mode', newMode);
        } catch {}
    }, []);

    // Generate strict HTML5 sandbox attributes
    // By strictly omitting allow-popups and allow-top-navigation, modern browsers silently block all new tabs and top window redirects.
    const sandboxAttributes = useMemo(() => {
        if (mode === 'strict' || !isEnabled) {
            // Maximum Protection: Only scripts, same-origin, forms and presentation
            // STRICTLY OMIT: allow-popups, allow-popups-to-escape-sandbox, allow-top-navigation, allow-top-navigation-by-user-activation
            return 'allow-forms allow-scripts allow-same-origin allow-presentation';
        }

        // Standard Protection: allow-pointer-lock included
        return 'allow-forms allow-scripts allow-same-origin allow-presentation allow-pointer-lock';
    }, [isEnabled, mode]);

    // Parent window popup suppression and navigation interception while player is active
    useEffect(() => {
        if (!isActive || typeof window === 'undefined') return;

        (window as any).__isPlayerActive = true;

        // 1. Override window.open to trap rogue ad popup calls escaping to the parent frame
        const originalOpen = window.open;
        const dummyWindow = new Proxy({
            closed: false,
            name: '',
            status: '',
            opener: null,
            parent: null,
            top: null,
            close: () => {},
            focus: () => {},
            blur: () => {},
            postMessage: () => {},
            print: () => {},
            stop: () => {},
            document: {
                open: () => {},
                close: () => {},
                write: () => {},
                writeln: () => {},
                createElement: () => ({}),
                body: { appendChild: () => {} },
            },
            location: {
                set href(_val: string) { console.info('[AdShield] Blocked popup location assignment'); },
                get href() { return ''; },
                assign: () => {},
                replace: () => {},
                reload: () => {},
            },
        }, {
            get(target: any, prop: string) {
                if (prop in target) return target[prop];
                return () => {};
            },
            set(target: any, prop: string, value: any) {
                target[prop] = value;
                return true;
            }
        });

        try {
            window.open = function (...args: any[]) {
                const targetUrl = args[0] || '';
                const isSafe = (window as any).isSafeDestination;
                // Only allow explicitly safe destinations (e.g. auth callbacks, Razorpay payment).
                // Strictly block blank / about:blank or any untrusted ad redirect during active playback/theatre!
                if (targetUrl && targetUrl !== 'about:blank' && typeof isSafe === 'function' && isSafe(targetUrl)) {
                    if (typeof originalOpen === 'function') {
                        return originalOpen.apply(window, args as any);
                    }
                }
                console.info('[AdShield] Blocked popup / new tab attempt:', targetUrl || 'blank');
                setBlockedCount(prev => prev + 1);
                return dummyWindow as any;
            };
        } catch (e) {}

        // 2. Intercept modern browser Navigation API to cancel any external top-level redirects
        let cleanupNav: (() => void) | null = null;
        if ('navigation' in window && (window as any).navigation) {
            const nav = (window as any).navigation;
            const handleNavigate = (event: any) => {
                try {
                    const destUrl = event?.destination?.url;
                    if (destUrl && typeof destUrl === 'string') {
                        const isInternal =
                            destUrl.startsWith(window.location.origin) ||
                            destUrl.startsWith('blob:') ||
                            destUrl.startsWith('about:') ||
                            destUrl.startsWith('javascript:');
                        if (!isInternal) {
                            console.warn('[AdShield] Blocked top-level redirect via Navigation API to:', destUrl);
                            if (event.cancelable) {
                                event.preventDefault();
                            }
                            setBlockedCount(prev => prev + 1);
                        }
                    }
                } catch (err) {
                    console.error('[AdShield] Navigation intercept error:', err);
                }
            };
            nav.addEventListener('navigate', handleNavigate);
            cleanupNav = () => {
                try {
                    nav.removeEventListener('navigate', handleNavigate);
                } catch {}
            };
        }

        // 3. Fallback beforeunload guard to block silent top redirects in all browsers
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = '';
            return '';
        };
        window.addEventListener('beforeunload', handleBeforeUnload);

        // 4. Intercept top-navigation attempt traps from postMessages
        const handleWindowMessage = (event: MessageEvent) => {
            if (!event || !event.data) return;
            if (
                typeof event.data === 'string' &&
                (event.data.includes('ad') ||
                    event.data.includes('popup') ||
                    event.data.includes('redirect') ||
                    event.data.includes('navigate'))
            ) {
                console.info('[AdShield] Blocked potential ad frame postMessage:', event.data);
                setBlockedCount(prev => prev + 1);
            }
        };

        // 5. Focus recovery: If an embed causes parent window to blur (popup trigger attempt), reclaim focus
        const handleWindowBlur = () => {
            setTimeout(() => {
                try {
                    window.focus();
                } catch {}
            }, 50);
        };

        // 6. Intercept external link clicks, touches, or programmatic navigation escaping to parent
        const handleExternalRedirectEvent = (e: Event) => {
            const target = (e.target as HTMLElement)?.closest('a');
            if (!target) return;
            const href = target.getAttribute('href');
            if (href && (href.startsWith('http://') || href.startsWith('https://')) && !href.startsWith(window.location.origin)) {
                e.preventDefault();
                e.stopPropagation();
                console.info('[AdShield] Blocked external link redirect attempt on click/touch:', href);
                setBlockedCount(prev => prev + 1);
            }
        };

        window.addEventListener('message', handleWindowMessage);
        window.addEventListener('blur', handleWindowBlur);
        document.addEventListener('click', handleExternalRedirectEvent, true);
        document.addEventListener('auxclick', handleExternalRedirectEvent, true);
        document.addEventListener('touchend', handleExternalRedirectEvent, true);

        return () => {
            (window as any).__isPlayerActive = false;
            try {
                window.open = originalOpen;
            } catch {}
            if (cleanupNav) cleanupNav();
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.removeEventListener('message', handleWindowMessage);
            window.removeEventListener('blur', handleWindowBlur);
            document.removeEventListener('click', handleExternalRedirectEvent, true);
            document.removeEventListener('auxclick', handleExternalRedirectEvent, true);
            document.removeEventListener('touchend', handleExternalRedirectEvent, true);
        };
    }, [isActive, isEnabled]);

    return {
        isEnabled,
        mode,
        blockedCount,
        sandboxAttributes,
        toggleAdShield,
        changeMode,
    };
}
