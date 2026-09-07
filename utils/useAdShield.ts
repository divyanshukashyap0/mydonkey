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
    // By omitting allow-popups and allow-top-navigation, modern browsers silently block all new tabs and top window redirects.
    const sandboxAttributes = useMemo(() => {
        if (!isEnabled) {
            return undefined;
        }

        if (mode === 'strict') {
            // Maximum Protection: Only scripts, same-origin, forms and presentation
            // STRICTLY OMIT: allow-popups, allow-popups-to-escape-sandbox, allow-top-navigation, allow-top-navigation-by-user-activation
            return 'allow-forms allow-scripts allow-same-origin allow-presentation';
        }

        // Standard Protection: allow-pointer-lock included
        return 'allow-forms allow-scripts allow-same-origin allow-presentation allow-pointer-lock';
    }, [isEnabled, mode]);

    // Parent window popup suppression while player is active
    useEffect(() => {
        if (!isActive || !isEnabled || typeof window === 'undefined') return;

        // Override window.open to trap any popup calls escaping to the parent frame
        try {
            window.open = function (...args: any[]) {
                const targetUrl = args[0] || 'blank';
                console.info('[AdShield] Blocked popup attempt:', targetUrl);
                setBlockedCount(prev => prev + 1);
                return null;
            };
        } catch (e) {
            // Some environments restrict overriding window.open
        }

        // Intercept top-navigation attempt traps
        const handleWindowMessage = (event: MessageEvent) => {
            if (!event || !event.data) return;
            // Catch potential ad frame postMessages attempting navigation
            if (typeof event.data === 'string' && (event.data.includes('ad') || event.data.includes('popup'))) {
                console.info('[AdShield] Blocked potential ad frame postMessage:', event.data);
                setBlockedCount(prev => prev + 1);
            }
        };

        // Focus recovery: If an embed causes parent window to blur (popup trigger attempt), reclaim focus
        const handleWindowBlur = () => {
            setTimeout(() => {
                try {
                    window.focus();
                } catch {}
            }, 50);
        };

        window.addEventListener('message', handleWindowMessage);
        window.addEventListener('blur', handleWindowBlur);

        return () => {
            window.removeEventListener('message', handleWindowMessage);
            window.removeEventListener('blur', handleWindowBlur);
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
